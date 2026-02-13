import { IntelligenceResult } from "./intelligence.types";
import { staticCountryIntelligence } from "./intelligence.sources";
import { loadTradeGovIntelligence } from "./intelligence.tradegov.db";

export async function runIntelligenceEngine(
  country: string
): Promise<IntelligenceResult> {

  if (!country) {
    throw new Error("Country is required for intelligence analysis");
  }

  const dbResult = await loadTradeGovIntelligence(country);
  if (dbResult) {
    return dbResult;
  }

  return staticCountryIntelligence(country);
}
