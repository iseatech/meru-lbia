import { runHsEngineV1 } from "./intelligence/core/hs/hs-engine";
import { registerHtsRoutes } from "./intelligence/core/hs/hts-route";
import { randomUUID } from "node:crypto";
import type { Express } from "express";
import type { Server } from "http";

import {
  setupAuth,
  isAuthenticated as replitIsAuthenticated,
} from "./replit_integrations/auth";

import { createClient } from "@supabase/supabase-js";
import { db } from "./db";
import { users, meruDecisionBriefs, meruUserRoles, meruAdmin2fa } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

import { registerAdminRoutes } from "./admin";
import { runIntelligenceEngine } from "./intelligence/intelligence.engine";

import {
  lookupVerification,
  generateVerificationCode,
  computePdfSha256,
  storeVerificationRecord,
  getExistingVerification,
  updatePdfHash,
  generateBarcodePng,
  generateQrPng,
} from "./security/documentIntegrity";

import PDFDocument from "pdfkit";
import { renderIntelligencePdf } from "./meru/briefTemplate";
import {
  writeLearningLedgerDefaults,
  writeLearningLedgerEvent,
} from "./learning-ledger/services/ledger-writer";
import { eventBus } from "./ai-core-foundation/events/event-bus";
import type { AiCoreEvent } from "./ai-core-foundation/events/event-types";
import { createTraceContext } from "./ai-core-foundation/trace/trace-context";
import { registerAuditorBootstrapReaction } from "./ai-core-foundation/auditor/auditor-bootstrap";
import { registerLearningCaptureReaction } from "./ai-core-foundation/learning/learning-capture";

let aiCorePhase1WiringInitialized = false;

function ensureAiCorePhase1Wiring() {
  if (aiCorePhase1WiringInitialized) {
    return;
  }

  registerAuditorBootstrapReaction({
    actor: "ai-core",
    mode: "observe",
    version: "phase-1",
  });

  registerLearningCaptureReaction();
  aiCorePhase1WiringInitialized = true;
}

/**
 * Codespaces-friendly auth strategy:
 * - If REPLIT_* env vars exist => enable Replit OIDC auth (setupAuth + registerAuthRoutes)
 * - Else => use simple session-based auth via /api/auth/register and /api/auth/login
 */
function shouldUseReplitAuth() {
  return Boolean(process.env.REPLIT_CLIENT_ID && process.env.REPLIT_CLIENT_SECRET);
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_KEY are required."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getBearerToken(req: any): string | null {
  return req.headers.authorization?.split(" ")[1] || null;
}

async function upsertLocalUserFromSupabase(user: any): Promise<string> {
  const firstName = user?.user_metadata?.first_name ?? null;
  const lastName = user?.user_metadata?.last_name ?? null;
  const profileImageUrl = user?.user_metadata?.avatar_url ?? null;

  // Check if a local row already exists with this email (possibly from a
  // previous auth provider with a different id). If so, update it in place
  // to avoid a unique constraint violation on users.email, and return the
  // existing local id so FK chains (roles, 2FA, briefs) remain intact.
  if (user.email) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, user.email));

    if (existing) {
      await db
        .update(users)
        .set({ firstName, lastName, profileImageUrl, updatedAt: new Date() })
        .where(eq(users.email, user.email));
      return existing.id;
    }
  }

  // No conflict: insert with Supabase id
  await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email ?? null,
      firstName,
      lastName,
      profileImageUrl,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: user.email ?? null,
        firstName,
        lastName,
        profileImageUrl,
        updatedAt: new Date(),
      },
    });

  return user.id;
}

async function lookupRole(userId: string): Promise<string> {
  const [row] = await db.select().from(meruUserRoles).where(eq(meruUserRoles.userId, userId));
  return row?.role ?? "user";
}

async function localIsAuthenticated(req: any, res: any, next: any) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    req.user = {
      claims: {
        sub: data.user.id,
        email: data.user.email || null,
        first_name: data.user.user_metadata?.first_name || null,
        last_name: data.user.user_metadata?.last_name || null,
      },
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Authentication required." });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const useReplitAuth = shouldUseReplitAuth();

  if (useReplitAuth) {
    // Replit OIDC auth enabled only when env vars exist
    await setupAuth(app);
  } else {
    console.warn(
      "[auth] Replit auth disabled (missing REPLIT_CLIENT_ID/REPLIT_CLIENT_SECRET). Using local session auth."
    );
  }

  // Admin routes may depend on auth; keep them registered
  // (Admin gating should block unauthenticated/non-admin users anyway)
  registerAdminRoutes(app);

  // --- HTS / USITC official search ---
  registerHtsRoutes(app);

  ensureAiCorePhase1Wiring();

  const isAuthenticated = localIsAuthenticated;

  app.get("/api/auth/me", async (req: any, res) => {
    // Step 1: token validation — 401 only for auth failures
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Authentication required." });
    }

    let supabaseUser: any;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return res.status(401).json({ message: "Authentication required." });
      }
      supabaseUser = data.user;
    } catch {
      return res.status(401).json({ message: "Authentication required." });
    }

    // Step 2: DB operations — 500 for internal failures
    try {
      const localUserId = await upsertLocalUserFromSupabase(supabaseUser);

      const role = await lookupRole(localUserId);
      let twoFaEnabled = false;
      let twoFaVerified = false;
      if (role === "admin") {
        const [record] = await db.select().from(meruAdmin2fa).where(eq(meruAdmin2fa.userId, localUserId));
        twoFaEnabled = record?.isEnabled ?? false;
        twoFaVerified = !!(req.session as any)?.twoFaVerified;
      }

      return res.json({
        user: {
          id: localUserId,
          email: supabaseUser.email || null,
          firstName: supabaseUser.user_metadata?.first_name || null,
          lastName: supabaseUser.user_metadata?.last_name || null,
        },
        role,
        twoFaEnabled,
        twoFaVerified,
      });
    } catch (e) {
      console.error("[/api/auth/me] DB error:", e);
      return res.status(500).json({ message: "Internal server error." });
    }
  });

  // --- Business endpoints ---

  // TEMP: HS Engine v1 test endpoint (remove after verification)
  app.post("/api/hs/test", async (req: any, res) => {
    try {
      const payload = req.body || {};
      const hsResult = await runHsEngineV1(payload);
      return res.json({ ok: true, hs_result_v1: hsResult });
    } catch (e: any) {
      console.error("HS test endpoint error:", e);
      return res.status(400).json({ ok: false, message: e?.message || "Invalid HS intake" });
    }
  });
  app.post("/meru/decision-briefs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || null;
      const payload = req.body || {};
      const countryOfOrigin = payload.country_of_origin || null;
      const serviceType = payload.service_type || "logistics-decision-brief";
      const aiTaskName = "decision-brief.create";
      const aiPhaseName = "decision-brief.workflow";

      const aiTrace = createTraceContext({
        tags: {
          route: "/meru/decision-briefs",
          serviceType: String(serviceType),
        },
      });

      const emitAiCoreEvent = (event: Partial<AiCoreEvent> & { type: string }) => {
        void eventBus
          .publish({
            id: randomUUID(),
            phase: "trace",
            timestamp: new Date().toISOString(),
            severity: "info",
            correlationId: aiTrace.correlationId,
            ...event,
          } as AiCoreEvent)
          .catch((error) => {
            console.error("AI CORE lifecycle publish error:", error);
          });
      };

      emitAiCoreEvent({
        type: "task.start",
        taskName: aiTaskName,
        metadata: {
          userId,
          serviceType,
          countryOfOrigin,
        },
      });

      emitAiCoreEvent({
        type: "phase.open",
        taskName: aiTaskName,
        phaseName: aiPhaseName,
        metadata: {
          expectedSteps: 3,
        },
      });

      emitAiCoreEvent({
        type: "validation.executed",
        taskName: aiTaskName,
        validationName: "request.payload",
        passed: true,
      });

      // === HS / Customs Engine v1 ===
      if (String(serviceType) === "hs_customs_v1") {
        try {
          const hsResult = await runHsEngineV1(payload);
          payload.hs_result_v1 = hsResult;
          emitAiCoreEvent({
            type: "step.executed",
            taskName: aiTaskName,
            stepName: "hs_engine",
            status: "ok",
          });
        } catch (e: any) {
          emitAiCoreEvent({
            type: "validation.executed",
            taskName: aiTaskName,
            validationName: "hs_engine.input",
            passed: false,
            metadata: { message: e?.message || "Invalid HS intake" },
          });
          emitAiCoreEvent({
            type: "step.executed",
            taskName: aiTaskName,
            stepName: "hs_engine",
            status: "failed",
          });
          emitAiCoreEvent({
            type: "phase.close",
            taskName: aiTaskName,
            phaseName: aiPhaseName,
            metadata: { reason: "hs_validation_failed" },
          });
          emitAiCoreEvent({
            type: "task.end",
            taskName: aiTaskName,
            status: "failed",
            metadata: { reason: "hs_validation_failed" },
          });
          console.error("HS Engine v1 error:", e);
          return res.status(400).json({ message: e?.message || "Invalid HS intake" });
        }
      }

      let intelligence = null;
      if (countryOfOrigin) {
        try {
          intelligence = await runIntelligenceEngine(countryOfOrigin, {
            onPhaseOpen: (phaseName, metadata) => {
              emitAiCoreEvent({
                type: "phase.open",
                taskName: aiTaskName,
                phaseName,
                metadata,
              });
            },
            onValidation: (validationName, passed, metadata) => {
              emitAiCoreEvent({
                type: "validation.executed",
                taskName: aiTaskName,
                validationName,
                passed,
                metadata,
              });
            },
            onStep: (stepName, status, metadata) => {
              emitAiCoreEvent({
                type: "step.executed",
                taskName: aiTaskName,
                stepName,
                status,
                metadata,
              });
            },
            onPhaseClose: (phaseName, metadata) => {
              emitAiCoreEvent({
                type: "phase.close",
                taskName: aiTaskName,
                phaseName,
                metadata,
              });
            },
            onTaskEnd: (status, metadata) => {
              emitAiCoreEvent({
                type: "task.end",
                taskName: aiTaskName,
                status,
                metadata,
              });
            },
          });
          emitAiCoreEvent({
            type: "step.executed",
            taskName: aiTaskName,
            stepName: "intelligence_enrichment",
            status: "ok",
            metadata: { source: "decision_core" },
          });
        } catch (err) {
          emitAiCoreEvent({
            type: "step.executed",
            taskName: aiTaskName,
            stepName: "intelligence_enrichment",
            status: "failed",
            metadata: { source: "decision_core" },
          });
          console.error("Intelligence engine error:", err);
        }
      } else {
        emitAiCoreEvent({
          type: "step.executed",
          taskName: aiTaskName,
          stepName: "intelligence_enrichment",
          status: "ok",
          metadata: { skipped: true },
        });
      }

      let briefRecord: any;
      try {
        [briefRecord] = await db
          .insert(meruDecisionBriefs)
          .values({
            userId,
            serviceType,
            status: "completed",
            countryOfOrigin,
            payload,
            intelligenceResultJson: intelligence ? JSON.stringify(intelligence) : null,
          })
          .returning();
      } catch (dbErr: any) {
        if (dbErr.message?.includes("intelligence_result_json")) {
          [briefRecord] = await db
            .insert(meruDecisionBriefs)
            .values({
              userId,
              serviceType,
              status: "completed",
              countryOfOrigin,
              payload,
            })
            .returning();
        } else {
          emitAiCoreEvent({
            type: "step.executed",
            taskName: aiTaskName,
            stepName: "decision_brief_persisted",
            status: "failed",
          });
          throw dbErr;
        }
      }

      if (briefRecord) {
        emitAiCoreEvent({
          type: "step.executed",
          taskName: aiTaskName,
          stepName: "decision_brief_persisted",
          status: "ok",
        });
      }

      try {
        const correlationId =
          typeof payload?.correlation_id === "string" && payload.correlation_id.trim().length > 0
            ? payload.correlation_id.trim()
            : `learning-ledger:${String(briefRecord?.id || "")}`;

        await writeLearningLedgerEvent({
          correlationId,
          eventType: "decision_brief_generated",
          userId,
          serviceType: serviceType ? String(serviceType) : null,
          decisionBriefId: String(briefRecord?.id || ""),
          hsClassificationId:
            typeof payload?.hs_classification_id === "string"
              ? payload.hs_classification_id
              : null,
          payload,
          decisionSnapshot: {
            id: briefRecord?.id,
            service_type: serviceType,
            status: "completed",
            country_of_origin: countryOfOrigin,
          },
          complianceSnapshot:
            intelligence && typeof intelligence === "object"
              ? (intelligence as unknown as Record<string, unknown>)
              : null,
        });

        await writeLearningLedgerDefaults({
          correlationId,
          decisionBriefId: String(briefRecord?.id || ""),
        });

        emitAiCoreEvent({
          type: "step.executed",
          taskName: aiTaskName,
          stepName: "learning_ledger_written",
          status: "ok",
        });
      } catch (ledgerError) {
        emitAiCoreEvent({
          type: "step.executed",
          taskName: aiTaskName,
          stepName: "learning_ledger_written",
          status: "failed",
        });
        console.error("Learning ledger write error:", ledgerError);
      }

      emitAiCoreEvent({
        type: "phase.close",
        taskName: aiTaskName,
        phaseName: aiPhaseName,
      });
      emitAiCoreEvent({
        type: "task.end",
        taskName: aiTaskName,
        status: "ok",
      });

      return res.json({ message: "Decision brief created", id: briefRecord?.id });
    } catch (error) {
      console.error("Decision brief error:", error);
      return res.status(500).json({ message: "Failed to create decision brief." });
    }
  });

  app.get("/api/my-briefs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const briefs = await db
        .select({
          id: meruDecisionBriefs.id,
          serviceType: meruDecisionBriefs.serviceType,
          status: meruDecisionBriefs.status,
          countryOfOrigin: meruDecisionBriefs.countryOfOrigin,
          createdAt: meruDecisionBriefs.createdAt,
        })
        .from(meruDecisionBriefs)
        .where(eq(meruDecisionBriefs.userId, userId))
        .orderBy(desc(meruDecisionBriefs.createdAt))
        .limit(50);

      return res.json(briefs);
    } catch (error) {
      console.error("My briefs error:", error);
      return res.status(500).json({ message: "Failed to fetch briefs." });
    }
  });

  app.get("/meru/decision-briefs/:id/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const briefId = req.params.id;
      const userId = req.user?.claims?.sub || "unknown";

      const [brief] = await db
        .select()
        .from(meruDecisionBriefs)
        // briefId might be string; drizzle can handle but keep as-is
        .where(eq(meruDecisionBriefs.id, briefId as any));

      if (!brief) {
        return res.status(404).json({ message: "Decision brief not found." });
      }

      if (brief.userId && brief.userId !== userId) {
        return res.status(403).json({ message: "Access denied." });
      }

      let verificationCode: string;
      let issuedTimestamp: string;

      try {
        const existing = await getExistingVerification(briefId);
        if (existing) {
          verificationCode = existing.verificationCode;
          issuedTimestamp = existing.timestamp;
        } else {
          const generated = generateVerificationCode({
            briefId,
            userId,
            serviceType: brief.serviceType || "logistics-decision-brief",
          });
          verificationCode = generated.code;
          issuedTimestamp = generated.timestamp;

          await storeVerificationRecord({
            briefId,
            userId,
            serviceType: brief.serviceType || "logistics-decision-brief",
            verificationCode,
            pdfSha256: "pending",
          });
        }
      } catch (verErr) {
        console.error("Verification record error:", verErr);
        verificationCode = "UNAVAILABLE";
        issuedTimestamp = new Date().toISOString();
      }

      const verifyUrl = `https://meruexpress.com/verify/${verificationCode}`;
      const issuedUtcDisplay = new Date(issuedTimestamp).toUTCString();

      let barcodePng: Buffer | null = null;
      let qrPng: Buffer | null = null;
      try {
        [barcodePng, qrPng] = await Promise.all([
          generateBarcodePng(verificationCode),
          generateQrPng(verifyUrl),
        ]);
      } catch (imgErr) {
        console.error("Image generation error:", imgErr);
      }

      const payload = (brief.payload as Record<string, any>) || {};

      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        try {
          const doc = new PDFDocument({ size: "A4", margin: 50 });
          const chunks: Buffer[] = [];
          doc.on("data", (chunk: Buffer) => chunks.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(chunks)));
          doc.on("error", reject);

          const pageWidth = doc.page.width;
          const marginLeft = 50;
          const marginRight = 50;
          const contentWidth = pageWidth - marginLeft - marginRight;

          doc.fontSize(8).fillColor("#666666");
          doc.text(`Verification Code: ${verificationCode}`, marginLeft, 30, {
            width: contentWidth,
            align: "right",
          });
          doc.text(`Issued (UTC): ${issuedUtcDisplay}`, marginLeft, 42, {
            width: contentWidth,
            align: "right",
          });

          doc.moveDown(2);
          doc.y = 70;

          doc.fontSize(20).fillColor("#1a2b4a").text("MERU EXPRESS", marginLeft, doc.y, {
            align: "center",
            width: contentWidth,
          });
          doc.moveDown(0.3);
          doc.fontSize(14).fillColor("#333333").text("Decision Brief", marginLeft, doc.y, {
            align: "center",
            width: contentWidth,
          });
          doc.moveDown(1);

          doc.moveTo(marginLeft, doc.y).lineTo(pageWidth - marginRight, doc.y).strokeColor("#cccccc").stroke();
          doc.moveDown(0.5);

          doc.fontSize(10).fillColor("#333333");

          const addSection = (title: string, content: string) => {
            doc.fontSize(11).fillColor("#1a2b4a").text(title, marginLeft, doc.y, { width: contentWidth });
            doc.moveDown(0.3);
            doc.fontSize(10).fillColor("#444444").text(content, marginLeft, doc.y, { width: contentWidth });
            doc.moveDown(0.8);
          };

          addSection("Brief ID", String(briefId));

          if (brief.countryOfOrigin) addSection("Country of Origin", String(brief.countryOfOrigin));
          if (payload.product_description) addSection("Product Description", String(payload.product_description));
          if (payload.hs_code) addSection("HS Code", String(payload.hs_code));
          if (payload.destination_country) addSection("Destination Country", String(payload.destination_country));
          addSection("Generated At", issuedUtcDisplay);

          if (brief.intelligenceResultJson) {
            try {
              const intel = JSON.parse(String(brief.intelligenceResultJson));
              const serviceMode = String(payload.service_type || "COMBINED").toUpperCase();
              const mode =
                serviceMode === "LOGISTICS_ONLY" || serviceMode === "COMPLIANCE_ONLY" ? serviceMode : "COMBINED";
              renderIntelligencePdf(doc, intel, mode as any, marginLeft, contentWidth);
            } catch {
              // ignore malformed intel JSON
            }
          }

          const bottomY = doc.page.height - 130;
          doc.moveTo(marginLeft, bottomY).lineTo(pageWidth - marginRight, bottomY).strokeColor("#cccccc").stroke();

          const barcodeY = bottomY + 10;

          if (barcodePng) {
            try {
              doc.image(barcodePng, marginLeft, barcodeY, { width: 200, height: 40 });
            } catch {
              doc.fontSize(7).fillColor("#999999").text("Barcode unavailable", marginLeft, barcodeY);
            }
          }

          if (qrPng) {
            try {
              doc.image(qrPng, pageWidth - marginRight - 80, barcodeY, { width: 80, height: 80 });
            } catch {
              doc.fontSize(7).fillColor("#999999").text("QR unavailable", pageWidth - marginRight - 80, barcodeY);
            }
          }

          doc.fontSize(7).fillColor("#999999").text(`Verify: ${verifyUrl}`, marginLeft, barcodeY + 50, {
            width: contentWidth - 90,
          });

          doc.fontSize(7).fillColor("#aaaaaa").text("This document is digitally verified by Meru Express.", marginLeft, doc.page.height - 40, {
            width: contentWidth,
            align: "center",
          });

          doc.end();
        } catch (pdfErr) {
          reject(pdfErr);
        }
      });

      try {
        const pdfHash = computePdfSha256(pdfBuffer);
        await updatePdfHash(briefId, pdfHash);
      } catch {
        // best-effort
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="meru-brief-${briefId}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF generation error:", error);
      return res.status(500).json({ message: "Failed to generate PDF." });
    }
  });

  app.get("/verify/:code", async (req, res) => {
    try {
      const { code } = req.params;
      if (!code) return res.json({ valid: false });
      const result = await lookupVerification(code);
      return res.json(result || { valid: false });
    } catch (error) {
      console.error("Verification endpoint error:", error);
      return res.json({ valid: false });
    }
  });

  return httpServer;
}
