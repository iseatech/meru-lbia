import { IntelligenceResult } from "./intelligence.types";

export function staticCountryIntelligence(country: string): IntelligenceResult {
  const normalized = country.toLowerCase();

  if (normalized === "china") {
    return {
      country: "China",
      countryRisk: "MEDIUM",
      geopoliticalNotes: ["Section 301 tariffs may apply."],
      tradeBarriers: [{ type: "Tariff", description: "Additional duties on certain HS codes." }],
      source: "STATIC"
    };
  }

  if (normalized === "russia") {
    return {
      country: "Russia",
      countryRisk: "HIGH",
      geopoliticalNotes: ["Sanctions environment evolving."],
      tradeBarriers: [{ type: "Sanctions", description: "Export restrictions and financial limitations." }],
      source: "STATIC"
    };
  }

  return {
    country,
    countryRisk: "LOW",
    source: "STATIC"
  };
}
