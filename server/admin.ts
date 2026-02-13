import { db } from "./db";
import {
  meruUserRoles,
  meruAdmin2fa,
  users,
  meruTradegovSources,
  meruTradegovEntries,
  meruAdminAuditLog,
  meruComplianceRulesets,
  meruDocumentVerifications,
} from "@shared/schema";
import { eq, or, sql, desc, and, count } from "drizzle-orm";
import crypto from "crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import type { Express, RequestHandler } from "express";
import { isAuthenticated } from "./replit_integrations/auth/replitAuth";
import rateLimit from "express-rate-limit";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("TOTP_ENCRYPTION_KEY must be a 64-char hex string");
  return Buffer.from(hex, "hex");
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return iv.toString("hex") + ":" + tag + ":" + encrypted;
}

function decrypt(data: string): string {
  const key = getEncryptionKey();
  const parts = data.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const [row] = await db.select().from(meruUserRoles).where(eq(meruUserRoles.userId, userId));
  return row?.role === "admin";
}

async function get2faRecord(userId: string) {
  const [row] = await db.select().from(meruAdmin2fa).where(eq(meruAdmin2fa.userId, userId));
  return row || null;
}

function generateRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return codes;
}

function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase()).digest("hex");
}

export const requireAdmin: RequestHandler = async (req: any, res, next) => {
  const userId = req.user?.claims?.sub;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const admin = await isAdmin(userId);
  if (!admin) return res.status(403).json({ message: "Forbidden: admin access required" });
  next();
};

async function logAuditEvent(actorUserId: string, action: string, entityType: string, entityId?: string, metadata?: any) {
  try {
    await db.insert(meruAdminAuditLog).values({
      actorUserId,
      action,
      entityType,
      entityId: entityId || null,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerAdminRoutes(app: Express) {
  app.use("/admin/api", adminApiLimiter);

  app.post("/api/admin/bootstrap", async (req, res) => {
    const key = req.headers["x-admin-bootstrap-key"] as string;
    const expected = process.env.ADMIN_BOOTSTRAP_KEY;
    if (!expected || !key || key !== expected) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { email, user_id } = req.body;
    if (!email && !user_id) {
      return res.status(400).json({ message: "Provide email or user_id" });
    }

    try {
      let userId = user_id;
      if (!userId && email) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return res.status(404).json({ message: "User not found" });
        userId = user.id;
      }

      await db
        .insert(meruUserRoles)
        .values({ userId, role: "admin" })
        .onConflictDoUpdate({ target: meruUserRoles.userId, set: { role: "admin" } });

      return res.json({ message: "Admin role granted", userId });
    } catch (error) {
      console.error("Bootstrap error:", error);
      return res.status(500).json({ message: "Failed to bootstrap admin" });
    }
  });

  app.get("/api/admin/2fa/status", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const admin = await isAdmin(userId);
    const record = admin ? await get2faRecord(userId) : null;
    const twoFaVerified = !!(req.session as any)?.twoFaVerified;

    return res.json({
      isAdmin: admin,
      twoFaEnabled: record?.isEnabled ?? false,
      twoFaVerified,
    });
  });

  app.post("/api/admin/2fa/setup", isAuthenticated, requireAdmin, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const userEmail = req.user.claims.email || "admin@meruexpress.com";

    const existing = await get2faRecord(userId);
    if (existing?.isEnabled) {
      return res.status(400).json({ message: "2FA is already enabled. Disable it first." });
    }

    const totp = new OTPAuth.TOTP({
      issuer: "Meru Express",
      label: userEmail,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 }),
    });

    const secretBase32 = totp.secret.base32;
    const encryptedSecret = encrypt(secretBase32);
    const recoveryCodes = generateRecoveryCodes(8);
    const hashedCodes = recoveryCodes.map(hashRecoveryCode);

    await db
      .insert(meruAdmin2fa)
      .values({
        userId,
        totpSecretEncrypted: encryptedSecret,
        isEnabled: false,
        recoveryCodesJson: hashedCodes,
      })
      .onConflictDoUpdate({
        target: meruAdmin2fa.userId,
        set: {
          totpSecretEncrypted: encryptedSecret,
          isEnabled: false,
          recoveryCodesJson: hashedCodes,
          updatedAt: new Date(),
        },
      });

    const otpauthUri = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(otpauthUri);

    return res.json({
      qrDataUrl,
      otpauthUri,
      secret: secretBase32,
      recoveryCodes,
    });
  });

  app.post("/api/admin/2fa/confirm-setup", isAuthenticated, requireAdmin, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "Provide a 6-digit code" });
    }

    const record = await get2faRecord(userId);
    if (!record) return res.status(400).json({ message: "No 2FA setup found. Run setup first." });
    if (record.isEnabled) return res.status(400).json({ message: "2FA is already enabled." });

    let secretBase32: string;
    try {
      secretBase32 = decrypt(record.totpSecretEncrypted);
    } catch {
      return res.status(500).json({ message: "Failed to read 2FA secret. Please re-run setup." });
    }

    const totp = new OTPAuth.TOTP({
      issuer: "Meru Express",
      label: "admin",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return res.status(400).json({ message: "Invalid code. Please try again." });
    }

    await db
      .update(meruAdmin2fa)
      .set({ isEnabled: true, updatedAt: new Date() })
      .where(eq(meruAdmin2fa.userId, userId));

    (req.session as any).twoFaVerified = true;
    return res.json({ message: "2FA enabled successfully" });
  });

  app.post("/api/admin/2fa/verify", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const { code, recoveryCode } = req.body;

    const admin = await isAdmin(userId);
    if (!admin) return res.status(403).json({ message: "Not an admin" });

    const record = await get2faRecord(userId);
    if (!record || !record.isEnabled) {
      return res.status(400).json({ message: "2FA is not enabled" });
    }

    if (recoveryCode && typeof recoveryCode === "string") {
      const hashed = hashRecoveryCode(recoveryCode);
      const storedCodes = (record.recoveryCodesJson as string[]) || [];
      const idx = storedCodes.indexOf(hashed);
      if (idx === -1) {
        return res.status(400).json({ message: "Invalid recovery code" });
      }
      const remaining = [...storedCodes];
      remaining.splice(idx, 1);
      await db
        .update(meruAdmin2fa)
        .set({ recoveryCodesJson: remaining, updatedAt: new Date() })
        .where(eq(meruAdmin2fa.userId, userId));

      (req.session as any).twoFaVerified = true;
      return res.json({ message: "2FA verified via recovery code", remainingCodes: remaining.length });
    }

    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "Provide a 6-digit code or recovery code" });
    }

    let secretBase32: string;
    try {
      secretBase32 = decrypt(record.totpSecretEncrypted);
    } catch {
      return res.status(500).json({ message: "Failed to read 2FA secret. Contact support." });
    }

    const totp = new OTPAuth.TOTP({
      issuer: "Meru Express",
      label: "admin",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return res.status(400).json({ message: "Invalid code. Please try again." });
    }

    (req.session as any).twoFaVerified = true;
    return res.json({ message: "2FA verified" });
  });

  app.get("/admin/intelligence/tradegov/list", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const country = (req.query.country as string || "").trim().toLowerCase();
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

      const conditions = [];
      if (country) {
        conditions.push(
          or(
            eq(sql`lower(${meruTradegovEntries.countryCode})`, country),
            eq(sql`lower(${meruTradegovEntries.countryName})`, country)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ value: count() })
        .from(meruTradegovEntries)
        .where(whereClause);

      const items = await db
        .select({
          id: meruTradegovEntries.id,
          sourceId: meruTradegovEntries.sourceId,
          title: meruTradegovSources.title,
          publisher: meruTradegovSources.publisher,
          url: meruTradegovSources.url,
          countryCode: meruTradegovEntries.countryCode,
          countryName: meruTradegovEntries.countryName,
          riskLevel: meruTradegovEntries.riskLevel,
          effectiveDate: meruTradegovEntries.effectiveDate,
          tags: meruTradegovEntries.tags,
          createdAt: meruTradegovEntries.createdAt,
          isActive: meruTradegovEntries.isActive,
        })
        .from(meruTradegovEntries)
        .leftJoin(meruTradegovSources, eq(meruTradegovEntries.sourceId, meruTradegovSources.id))
        .where(whereClause)
        .orderBy(
          sql`${meruTradegovEntries.effectiveDate} desc nulls last`,
          desc(meruTradegovEntries.createdAt)
        )
        .limit(limit)
        .offset(offset);

      const mapped = items.map((i) => ({
        id: i.id,
        source_id: i.sourceId,
        title: i.title,
        publisher: i.publisher,
        url: i.url,
        country_code: i.countryCode,
        country_name: i.countryName,
        risk_level: i.riskLevel,
        effective_date: i.effectiveDate,
        tags: i.tags,
        created_at: i.createdAt,
        is_active: i.isActive,
      }));

      return res.json({ ok: true, items: mapped, total: Number(totalResult.value) });
    } catch (error) {
      console.error("Trade.gov list error:", error);
      return res.status(500).json({ ok: false, message: "Failed to list entries." });
    }
  });

  app.get("/admin/intelligence/tradegov/entry/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const entryId = req.params.id;

      const rows = await db
        .select({
          entry: meruTradegovEntries,
          sourceTitle: meruTradegovSources.title,
          sourceUrl: meruTradegovSources.url,
          sourcePublisher: meruTradegovSources.publisher,
          sourceUpdatedAt: meruTradegovSources.updatedAt,
        })
        .from(meruTradegovEntries)
        .leftJoin(meruTradegovSources, eq(meruTradegovEntries.sourceId, meruTradegovSources.id))
        .where(eq(meruTradegovEntries.id, entryId))
        .limit(1);

      if (!rows.length) {
        return res.status(404).json({ ok: false, message: "not_found" });
      }

      const { entry, sourceTitle, sourceUrl, sourcePublisher, sourceUpdatedAt } = rows[0];

      return res.json({
        ok: true,
        entry: {
          id: entry.id,
          country_code: entry.countryCode,
          country_name: entry.countryName,
          topic: entry.topic,
          summary: entry.summary,
          risk_level: entry.riskLevel,
          tags: entry.tags,
          barriers: entry.barriers,
          regulatory_flags: entry.regulatoryFlags,
          sector_insights: entry.sectorInsights,
          effective_date: entry.effectiveDate,
          is_active: entry.isActive,
          created_at: entry.createdAt,
          source: {
            id: entry.sourceId,
            title: sourceTitle,
            url: sourceUrl,
            publisher: sourcePublisher,
            last_updated: sourceUpdatedAt,
          },
        },
      });
    } catch (error) {
      console.error("Trade.gov entry detail error:", error);
      return res.status(500).json({ ok: false, message: "Failed to fetch entry." });
    }
  });

  app.post("/admin/intelligence/tradegov/deactivate/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const entryId = req.params.id;
      const actorId = req.user.claims.sub;

      const [existing] = await db
        .select({ id: meruTradegovEntries.id })
        .from(meruTradegovEntries)
        .where(eq(meruTradegovEntries.id, entryId))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ ok: false, message: "not_found" });
      }

      await db
        .update(meruTradegovEntries)
        .set({ isActive: false })
        .where(eq(meruTradegovEntries.id, entryId));

      await logAuditEvent(actorId, "deactivate", "tradegov_entry", entryId);

      return res.json({ ok: true, id: entryId });
    } catch (error) {
      console.error("Trade.gov deactivate error:", error);
      return res.status(500).json({ ok: false, message: "Failed to deactivate entry." });
    }
  });

  app.post("/admin/intelligence/tradegov/ingest", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const {
        country_code,
        country_name,
        topic,
        summary,
        tags,
        risk_level,
        barriers,
        regulatory_flags,
        sector_insights,
        source,
      } = req.body;

      if (!source?.title || !source?.url) {
        return res.status(400).json({ message: "source.title and source.url are required." });
      }

      const [sourceRecord] = await db.insert(meruTradegovSources).values({
        title: source.title,
        url: source.url,
        publisher: source.publisher || null,
        updatedAt: source.updated_at ? new Date(source.updated_at) : null,
      }).returning();

      const [entryRecord] = await db.insert(meruTradegovEntries).values({
        countryCode: country_code || null,
        countryName: country_name || null,
        topic: topic || null,
        summary: summary || null,
        tags: tags || null,
        riskLevel: risk_level || null,
        barriers: barriers || null,
        regulatoryFlags: regulatory_flags || null,
        sectorInsights: sector_insights || null,
        sourceId: sourceRecord.id,
        effectiveDate: new Date(),
      }).returning();

      await logAuditEvent(actorId, "ingest", "tradegov_entry", entryRecord.id, { country_code, topic });

      return res.json({ ok: true, id: entryRecord.id });
    } catch (error) {
      console.error("Trade.gov ingest error:", error);
      return res.status(500).json({ message: "Ingest failed." });
    }
  });

  app.get("/admin/api/users", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

      const [totalResult] = await db.select({ value: count() }).from(users);

      const userList = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      const roleRows = await db.select().from(meruUserRoles);
      const roleMap: Record<string, string> = {};
      for (const r of roleRows) {
        roleMap[r.userId] = r.role;
      }

      const mapped = userList.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
        role: roleMap[u.id] || "user",
        created_at: u.createdAt,
        last_sign_in: u.updatedAt,
      }));

      return res.json({ ok: true, items: mapped, total: Number(totalResult.value) });
    } catch (error) {
      console.error("Admin users list error:", error);
      return res.status(500).json({ ok: false, message: "Failed to list users." });
    }
  });

  app.post("/admin/api/users/:id/role", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const targetUserId = req.params.id;
      const actorId = req.user.claims.sub;
      const { role } = req.body;

      if (!role || typeof role !== "string") {
        return res.status(400).json({ message: "role is required." });
      }

      const validRoles = ["user", "admin", "analyst", "support"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
      }

      const [targetUser] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found." });
      }

      await db
        .insert(meruUserRoles)
        .values({ userId: targetUserId, role })
        .onConflictDoUpdate({ target: meruUserRoles.userId, set: { role } });

      await logAuditEvent(actorId, "set_role", "user", targetUserId, { role });

      return res.json({ ok: true, userId: targetUserId, role });
    } catch (error) {
      console.error("Admin set role error:", error);
      return res.status(500).json({ ok: false, message: "Failed to set role." });
    }
  });

  app.get("/admin/api/compliance/rulesets", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

      const [totalResult] = await db.select({ value: count() }).from(meruComplianceRulesets);

      const items = await db
        .select()
        .from(meruComplianceRulesets)
        .orderBy(desc(meruComplianceRulesets.createdAt))
        .limit(limit)
        .offset(offset);

      const mapped = items.map((r) => ({
        id: r.id,
        name: r.name,
        version: r.version,
        description: r.description,
        is_active: r.isActive,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }));

      return res.json({ ok: true, items: mapped, total: Number(totalResult.value) });
    } catch (error) {
      console.error("Compliance rulesets list error:", error);
      return res.status(500).json({ ok: false, message: "Failed to list rulesets." });
    }
  });

  app.post("/admin/api/compliance/rulesets", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const { name, version, description, rules_json } = req.body;

      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "name is required." });
      }

      const [record] = await db.insert(meruComplianceRulesets).values({
        name,
        version: version || "1.0",
        description: description || null,
        rulesJson: rules_json || null,
      }).returning();

      await logAuditEvent(actorId, "create", "compliance_ruleset", record.id, { name });

      return res.json({ ok: true, id: record.id });
    } catch (error) {
      console.error("Compliance ruleset create error:", error);
      return res.status(500).json({ ok: false, message: "Failed to create ruleset." });
    }
  });

  app.post("/admin/api/compliance/rulesets/:id/deactivate", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const rulesetId = req.params.id;
      const actorId = req.user.claims.sub;

      const [existing] = await db
        .select({ id: meruComplianceRulesets.id })
        .from(meruComplianceRulesets)
        .where(eq(meruComplianceRulesets.id, rulesetId))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ ok: false, message: "Ruleset not found." });
      }

      await db
        .update(meruComplianceRulesets)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(meruComplianceRulesets.id, rulesetId));

      await logAuditEvent(actorId, "deactivate", "compliance_ruleset", rulesetId);

      return res.json({ ok: true, id: rulesetId });
    } catch (error) {
      console.error("Compliance ruleset deactivate error:", error);
      return res.status(500).json({ ok: false, message: "Failed to deactivate ruleset." });
    }
  });

  app.get("/admin/api/verifications", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

      const [totalResult] = await db.select({ value: count() }).from(meruDocumentVerifications);

      const items = await db
        .select({
          id: meruDocumentVerifications.id,
          verificationCode: meruDocumentVerifications.verificationCode,
          serviceType: meruDocumentVerifications.serviceType,
          status: meruDocumentVerifications.status,
          createdAt: meruDocumentVerifications.createdAt,
        })
        .from(meruDocumentVerifications)
        .orderBy(desc(meruDocumentVerifications.createdAt))
        .limit(limit)
        .offset(offset);

      const mapped = items.map((v) => ({
        id: v.id,
        verification_code: v.verificationCode,
        service_type: v.serviceType,
        status: v.status,
        issued_at: v.createdAt,
      }));

      return res.json({ ok: true, items: mapped, total: Number(totalResult.value) });
    } catch (error) {
      console.error("Verifications list error:", error);
      return res.status(500).json({ ok: false, message: "Failed to list verifications." });
    }
  });

  app.post("/admin/api/verifications/:code/revoke", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const code = req.params.code;
      const actorId = req.user.claims.sub;

      const [existing] = await db
        .select({ id: meruDocumentVerifications.id, status: meruDocumentVerifications.status })
        .from(meruDocumentVerifications)
        .where(eq(meruDocumentVerifications.verificationCode, code))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ ok: false, message: "Verification record not found." });
      }

      if (existing.status === "revoked") {
        return res.status(400).json({ ok: false, message: "Already revoked." });
      }

      await db
        .update(meruDocumentVerifications)
        .set({ status: "revoked" })
        .where(eq(meruDocumentVerifications.verificationCode, code));

      await logAuditEvent(actorId, "revoke", "verification", existing.id, { code });

      return res.json({ ok: true, code });
    } catch (error) {
      console.error("Verification revoke error:", error);
      return res.status(500).json({ ok: false, message: "Failed to revoke verification." });
    }
  });

  app.get("/admin/api/system/health", isAuthenticated, requireAdmin, async (_req: any, res) => {
    try {
      const dbStart = Date.now();
      await db.execute(sql`SELECT 1`);
      const dbLatencyMs = Date.now() - dbStart;

      const [userCount] = await db.select({ value: count() }).from(users);
      const [briefCount] = await db.select({ value: count() }).from(meruDocumentVerifications);
      const [entryCount] = await db.select({ value: count() }).from(meruTradegovEntries);
      const [rulesetCount] = await db.select({ value: count() }).from(meruComplianceRulesets);

      return res.json({
        ok: true,
        status: "healthy",
        uptime_seconds: Math.floor(process.uptime()),
        db: {
          connected: true,
          latency_ms: dbLatencyMs,
        },
        counts: {
          users: Number(userCount.value),
          verifications: Number(briefCount.value),
          tradegov_entries: Number(entryCount.value),
          compliance_rulesets: Number(rulesetCount.value),
        },
        memory: {
          rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        },
        node_version: process.version,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("System health error:", error);
      return res.json({
        ok: false,
        status: "unhealthy",
        db: { connected: false },
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get("/admin/api/stats", isAuthenticated, requireAdmin, async (_req: any, res) => {
    try {
      const [userCount] = await db.select({ value: count() }).from(users);
      const [verificationCount] = await db.select({ value: count() }).from(meruDocumentVerifications);
      const [entryCount] = await db.select({ value: count() }).from(meruTradegovEntries);
      const [rulesetCount] = await db.select({ value: count() }).from(meruComplianceRulesets);
      const [briefCount] = await db.select({ value: count() }).from(
        (await import("@shared/schema")).meruDecisionBriefs
      );
      const [auditCount] = await db.select({ value: count() }).from(meruAdminAuditLog);

      return res.json({
        ok: true,
        users: Number(userCount.value),
        verifications: Number(verificationCount.value),
        tradegov_entries: Number(entryCount.value),
        compliance_rulesets: Number(rulesetCount.value),
        decision_briefs: Number(briefCount.value),
        audit_events: Number(auditCount.value),
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      return res.status(500).json({ ok: false, message: "Failed to fetch stats." });
    }
  });
}
