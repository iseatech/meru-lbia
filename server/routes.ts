import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, meruDecisionBriefs } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  registerAdminRoutes(app);

  app.post("/api/auth/register", async (req, res) => {
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
        return res.status(400).json({ message: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number or special character." });
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

      const sessionExpiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      (req as any).login(
        { claims: { sub: user.id, email: user.email, first_name: user.firstName, last_name: user.lastName }, expires_at: sessionExpiry },
        (err: any) => {
          if (err) return res.status(500).json({ message: "Session creation failed." });
          return res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
        }
      );
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
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

      const sessionExpiry = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      (req as any).login(
        { claims: { sub: user.id, email: user.email, first_name: user.firstName, last_name: user.lastName }, expires_at: sessionExpiry },
        (err: any) => {
          if (err) return res.status(500).json({ message: "Session creation failed." });
          return res.json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
        }
      );
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed." });
    }
  });

  app.post("/meru/decision-briefs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || null;
      const payload = req.body || {};
      const countryOfOrigin = payload.country_of_origin || null;
      const serviceType = payload.service_type || "logistics-decision-brief";

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
        [briefRecord] = await db.insert(meruDecisionBriefs).values({
          userId,
          serviceType,
          status: "completed",
          countryOfOrigin,
          payload,
          intelligenceResultJson: intelligence ? JSON.stringify(intelligence) : null,
        }).returning();
      } catch (dbErr: any) {
        if (dbErr.message?.includes("intelligence_result_json")) {
          [briefRecord] = await db.insert(meruDecisionBriefs).values({
            userId,
            serviceType,
            status: "completed",
            countryOfOrigin,
            payload,
          }).returning();
        } else {
          throw dbErr;
        }
      }

      return res.json({ message: "Decision brief created", id: briefRecord?.id });
    } catch (error) {
      console.error("Decision brief error:", error);
      res.status(500).json({ message: "Failed to create decision brief." });
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
      res.status(500).json({ message: "Failed to fetch briefs." });
    }
  });

  app.get("/meru/decision-briefs/:id/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const briefId = req.params.id;
      const userId = req.user?.claims?.sub || "unknown";

      const [brief] = await db
        .select()
        .from(meruDecisionBriefs)
        .where(eq(meruDecisionBriefs.id, briefId));

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
            serviceType: "logistics-decision-brief",
          });
          verificationCode = generated.code;
          issuedTimestamp = generated.timestamp;

          await storeVerificationRecord({
            briefId,
            userId,
            serviceType: "logistics-decision-brief",
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
          doc.fontSize(14).fillColor("#333333").text("Logistics Decision Brief", marginLeft, doc.y, {
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

          addSection("Brief ID", briefId);

          if (brief.countryOfOrigin) {
            addSection("Country of Origin", brief.countryOfOrigin);
          }

          if (payload.product_description) {
            addSection("Product Description", payload.product_description);
          }

          if (payload.hs_code) {
            addSection("HS Code", payload.hs_code);
          }

          if (payload.destination_country) {
            addSection("Destination Country", payload.destination_country);
          }

          addSection("Generated At", issuedUtcDisplay);

          if (brief.intelligenceResultJson) {
            try {
              const intel = JSON.parse(brief.intelligenceResultJson);
              const serviceMode = (payload.service_type || "COMBINED").toUpperCase();
              const mode = serviceMode === "LOGISTICS_ONLY" || serviceMode === "COMPLIANCE_ONLY" ? serviceMode : "COMBINED";
              renderIntelligencePdf(doc, intel, mode as any, marginLeft, contentWidth);
            } catch {
              // skip malformed intelligence
            }
          }

          const bottomY = doc.page.height - 130;
          doc.moveTo(marginLeft, bottomY).lineTo(pageWidth - marginRight, bottomY).strokeColor("#cccccc").stroke();

          const barcodeY = bottomY + 10;
          let currentX = marginLeft;

          if (barcodePng) {
            try {
              doc.image(barcodePng, currentX, barcodeY, { width: 200, height: 40 });
            } catch {
              doc.fontSize(7).fillColor("#999999").text("Barcode unavailable", currentX, barcodeY);
            }
          }

          if (qrPng) {
            try {
              doc.image(qrPng, pageWidth - marginRight - 80, barcodeY, { width: 80, height: 80 });
            } catch {
              doc.fontSize(7).fillColor("#999999").text("QR unavailable", pageWidth - marginRight - 80, barcodeY);
            }
          }

          doc.fontSize(7).fillColor("#999999")
            .text(`Verify: ${verifyUrl}`, marginLeft, barcodeY + 50, { width: contentWidth - 90 });

          doc.fontSize(7).fillColor("#aaaaaa")
            .text("This document is digitally verified by Meru Express.", marginLeft, doc.page.height - 40, {
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
        // best-effort; don't block response
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="meru-brief-${briefId}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ message: "Failed to generate PDF." });
    }
  });

  app.get("/verify/:code", async (req, res) => {
    try {
      const { code } = req.params;
      if (!code) {
        return res.json({ valid: false });
      }
      const result = await lookupVerification(code);
      return res.json(result || { valid: false });
    } catch (error) {
      console.error("Verification endpoint error:", error);
      return res.json({ valid: false });
    }
  });

  return httpServer;
}
