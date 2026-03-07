import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const meruHsClassifications = pgTable("meru_hs_classifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  description: text("description").notNull(),
  query: text("query"),
  inputJson: jsonb("input_json"),
  resultJson: jsonb("result_json").notNull(),
  suggestionsJson: jsonb("suggestions_json"),
  griContextJson: jsonb("gri_context_json"),
  questionsJson: jsonb("questions_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_hs_created_at").on(table.createdAt),
  index("idx_hs_user_id").on(table.userId),
]);

export type HsClassification = typeof meruHsClassifications.$inferSelect;
export type NewHsClassification = typeof meruHsClassifications.$inferInsert;
