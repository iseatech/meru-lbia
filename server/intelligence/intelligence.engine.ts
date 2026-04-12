import { IntelligenceResult } from "./intelligence.types";
import { staticCountryIntelligence } from "./intelligence.sources";
import { loadTradeGovIntelligence } from "./intelligence.tradegov.db";

export interface IntelligenceEngineHooks {
  onPhaseOpen?: (phaseName: string, metadata?: Record<string, unknown>) => void;
  onValidation?: (
    validationName: string,
    passed: boolean,
    metadata?: Record<string, unknown>,
  ) => void;
  onStep?: (
    stepName: string,
    status: "ok" | "failed",
    metadata?: Record<string, unknown>,
  ) => void;
  onPhaseClose?: (phaseName: string, metadata?: Record<string, unknown>) => void;
  onTaskEnd?: (status: "ok" | "failed", metadata?: Record<string, unknown>) => void;
}

export async function runIntelligenceEngine(
  country: string,
  hooks?: IntelligenceEngineHooks,
): Promise<IntelligenceResult> {
  const phaseName = "decision_core.execute";

  hooks?.onPhaseOpen?.(phaseName, { engine: "decision-core" });

  if (!country) {
    hooks?.onValidation?.("decision_core.country_input", false, {
      reason: "missing_country",
    });
    hooks?.onPhaseClose?.(phaseName, { status: "failed" });
    hooks?.onTaskEnd?.("failed", { reason: "missing_country" });
    throw new Error("Country is required for intelligence analysis");
  }

  hooks?.onValidation?.("decision_core.country_input", true);

  try {
    const dbResult = await loadTradeGovIntelligence(country);
    hooks?.onStep?.("decision_core.tradegov_lookup", "ok", {
      found: Boolean(dbResult),
    });

    if (dbResult) {
      hooks?.onStep?.("decision_core.result_source", "ok", { source: "tradegov" });
      hooks?.onPhaseClose?.(phaseName, { status: "ok" });
      hooks?.onTaskEnd?.("ok", { source: "tradegov" });
      return dbResult;
    }

    const staticResult = staticCountryIntelligence(country);
    hooks?.onStep?.("decision_core.result_source", "ok", { source: "static" });
    hooks?.onPhaseClose?.(phaseName, { status: "ok" });
    hooks?.onTaskEnd?.("ok", { source: "static" });
    return staticResult;
  } catch (error) {
    hooks?.onStep?.("decision_core.execution", "failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    hooks?.onPhaseClose?.(phaseName, { status: "failed" });
    hooks?.onTaskEnd?.("failed", { reason: "engine_exception" });
    throw error;
  }
}
