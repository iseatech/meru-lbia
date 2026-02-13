import { sql } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meruUserRoles = pgTable("meru_user_roles", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  role: varchar("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meruAdmin2fa = pgTable("meru_admin_2fa", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  totpSecretEncrypted: varchar("totp_secret_encrypted").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  recoveryCodesJson: jsonb("recovery_codes_json"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meruDecisionBriefs = pgTable("meru_decision_briefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  serviceType: varchar("service_type"),
  status: varchar("status").default("completed"),
  countryOfOrigin: varchar("country_of_origin"),
  payload: jsonb("payload"),
  intelligenceResultJson: text("intelligence_result_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const meruDocumentVerifications = pgTable("meru_document_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  briefId: varchar("brief_id").notNull(),
  userId: varchar("user_id").notNull(),
  serviceType: text("service_type").notNull(),
  verificationCode: text("verification_code").unique().notNull(),
  pdfSha256: text("pdf_sha256").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  status: text("status").default("valid"),
}, (table) => [index("idx_verification_code").on(table.verificationCode)]);

export const meruTradegovSources = pgTable("meru_tradegov_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  url: text("url").notNull(),
  publisher: text("publisher"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const meruTradegovEntries = pgTable("meru_tradegov_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryCode: text("country_code"),
  countryName: text("country_name"),
  topic: text("topic"),
  summary: text("summary"),
  tags: text("tags").array(),
  riskLevel: text("risk_level"),
  barriers: text("barriers").array(),
  regulatoryFlags: text("regulatory_flags").array(),
  sectorInsights: text("sector_insights").array(),
  sourceId: varchar("source_id").references(() => meruTradegovSources.id, { onDelete: "cascade" }),
  effectiveDate: timestamp("effective_date", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_tradegov_country_code").on(table.countryCode),
  index("idx_tradegov_topic").on(table.topic),
  index("idx_tradegov_source_id").on(table.sourceId),
]);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserRole = typeof meruUserRoles.$inferSelect;
export type Admin2fa = typeof meruAdmin2fa.$inferSelect;
export type DecisionBrief = typeof meruDecisionBriefs.$inferSelect;
export type DocumentVerification = typeof meruDocumentVerifications.$inferSelect;
export const meruAdminAuditLog = pgTable("meru_admin_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_audit_actor").on(table.actorUserId),
  index("idx_audit_action").on(table.action),
  index("idx_audit_created").on(table.createdAt),
]);

export const meruComplianceRulesets = pgTable("meru_compliance_rulesets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  version: text("version").default("1.0"),
  description: text("description"),
  rulesJson: jsonb("rules_json"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type TradegovSource = typeof meruTradegovSources.$inferSelect;
export type TradegovEntry = typeof meruTradegovEntries.$inferSelect;
export type AdminAuditLog = typeof meruAdminAuditLog.$inferSelect;
export type ComplianceRuleset = typeof meruComplianceRulesets.$inferSelect;
