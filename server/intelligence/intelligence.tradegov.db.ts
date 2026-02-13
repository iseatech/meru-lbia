import { db } from "../db";
import { meruTradegovEntries, meruTradegovSources } from "@shared/schema";
import { eq, or, sql, desc, and } from "drizzle-orm";
import { IntelligenceResult } from "./intelligence.types";

export async function loadTradeGovIntelligence(
  country: string
): Promise<IntelligenceResult | null> {
  try {
    const normalized = country.trim().toLowerCase();

    const entries = await db
      .select({
        entry: meruTradegovEntries,
        sourceTitle: meruTradegovSources.title,
        sourceUrl: meruTradegovSources.url,
      })
      .from(meruTradegovEntries)
      .leftJoin(meruTradegovSources, eq(meruTradegovEntries.sourceId, meruTradegovSources.id))
      .where(
        and(
          eq(meruTradegovEntries.isActive, true),
          or(
            eq(sql`lower(${meruTradegovEntries.countryCode})`, normalized),
            eq(sql`lower(${meruTradegovEntries.countryName})`, normalized)
          )
        )
      )
      .orderBy(sql`${meruTradegovEntries.effectiveDate} desc nulls last`, desc(meruTradegovEntries.createdAt))
      .limit(1);

    if (!entries.length) return null;

    const { entry, sourceTitle } = entries[0];

    const tradeBarriers = (entry.barriers || []).map((b) => {
      const parts = b.split(":", 2);
      return {
        type: parts.length > 1 ? parts[0].trim() : "General",
        description: parts.length > 1 ? parts[1].trim() : b,
      };
    });

    const regulatoryFlags = (entry.regulatoryFlags || []).map((f) => {
      const parts = f.split(":", 2);
      return {
        agency: parts.length > 1 ? parts[0].trim() : "Regulatory",
        note: parts.length > 1 ? parts[1].trim() : f,
      };
    });

    const sectorInsights = (entry.sectorInsights || []).map((s) => {
      const parts = s.split(":", 2);
      return {
        sector: parts.length > 1 ? parts[0].trim() : "General",
        comment: parts.length > 1 ? parts[1].trim() : s,
      };
    });

    const result: IntelligenceResult = {
      country: entry.countryName || country,
      countryRisk: (entry.riskLevel as any) || "LOW",
      tradeBarriers: tradeBarriers.length > 0 ? tradeBarriers : undefined,
      regulatoryFlags: regulatoryFlags.length > 0 ? regulatoryFlags : undefined,
      sectorInsights: sectorInsights.length > 0 ? sectorInsights : undefined,
      source: "DB",
    };

    if (entry.summary) {
      result.geopoliticalNotes = [entry.summary];
    }

    return result;
  } catch (err) {
    console.error("Trade.gov DB intelligence lookup failed (fail-safe):", err);
    return null;
  }
}
