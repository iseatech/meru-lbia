import { runHsEngineV1 } from "./intelligence/core/hs/hs-engine";
import { registerHtsRoutes } from "./intelligence/core/hs/hts-route";
import type { Express } from "express";
import type { Server } from "http";

import {
  setupAuth,
  registerAuthRoutes,
  isAuthenticated as replitIsAuthenticated,
} from "./replit_integrations/auth";

import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, meruDecisionBriefs } from "@shared/schema";
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
import { emitTaskStart } from "./ai-core-foundation";

/**
 * Codespaces-friendly auth strategy:
 * - If REPLIT_* env vars exist => enable Replit OIDC auth (setupAuth + registerAuthRoutes)
 * - Else => use simple session-based auth via /api/auth/register and /api/auth/login
 */
function shouldUseReplitAuth() {
  return Boolean(process.env.REPLIT_CLIENT_ID && process.env.REPLIT_CLIENT_SECRET);
}

function localIsAuthenticated(req: any, res: any, next: any) {
  // Session-based fallback (works in Codespaces if express-session is enabled in server/index.ts)
  const s = req?.session;
  if (s?.userId) {
    // Normalize "req.user" to match the existing code paths
    req.user = {
      claims: {
        sub: s.userId,
        email: s.email || null,
        first_name: s.firstName || null,
        last_name: s.lastName || null,
      },
    };
    return next();
  }
  return res.status(401).json({ message: "Authentication required." });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const useReplitAuth = shouldUseReplitAuth();

  if (useReplitAuth) {
    // Replit OIDC auth enabled only when env vars exist
    await setupAuth(app);
    registerAuthRoutes(app);
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

  const isAuthenticated = useReplitAuth ? replitIsAuthenticated : localIsAuthenticated;

  // --- Local email/password auth (session-based) ---
  app.post("/api/auth/register", async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password))
      ) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number or special character.",
        });
      }

      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const [user] = await db
        .insert(users)
        .values({
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          passwordHash,
        })
        .returning();

      // Session login (Codespaces/local)
      if (req.session) {
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.firstName = user.firstName;
        req.session.lastName = user.lastName;
      }

      return res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Registration failed." });
    }
  });

  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      // Session login (Codespaces/local)
      if (req.session) {
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.firstName = user.firstName;
        req.session.lastName = user.lastName;
      }

      return res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed." });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    try {
      if (req.session) {
        req.session.destroy(() => {});
      }
      return res.json({ ok: true });
    } catch {
      return res.json({ ok: true });
    }
  });

  app.get("/api/auth/me", (req: any, res) => {
    const s = req?.session;
    if (!s?.userId) return res.json({ user: null });

    return res.json({
      user: {
        id: s.userId,
        email: s.email || null,
        first_name: s.firstName || null,
        last_name: s.lastName || null,
      },
    });
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

      // === HS / Customs Engine v1 ===
      if (String(serviceType) === "hs_customs_v1") {
        try {
          const hsResult = await runHsEngineV1(payload);
          payload.hs_result_v1 = hsResult;
        } catch (e: any) {
          console.error("HS Engine v1 error:", e);
          return res.status(400).json({ message: e?.message || "Invalid HS intake" });
        }
      }

      let intelligence = null;
      if (countryOfOrigin) {
        try {
          intelligence = await runIntelligenceEngine(countryOfOrigin);
        } catch (err) {
          console.error("Intelligence engine error:", err);
        }
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
          throw dbErr;
        }
      }

      void emitTaskStart({
        taskId: String(briefRecord?.id ?? ""),
        correlationId: userId ? String(userId) : undefined,
        details: {
          serviceType,
          countryOfOrigin,
        },
      }).catch((eventErr) => {
        console.warn("AI CORE TaskStart hook error:", eventErr);
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
