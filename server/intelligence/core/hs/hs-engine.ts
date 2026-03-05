import { getHtsRowByCode, searchHtsByDescription } from "./usitc-hts";
import {
  HsIntakeV1,
  HsResultV1,
  HsResultItemV1,
  validateHsIntakeV1,
} from "./types";
import { normalizeHsCode } from "./hs-normalizer";

/**
 * HS Engine v1
 * --------------------------------------------------
 * This engine:
 * 1) Validates intake
 * 2) Normalizes HS codes (if provided)
 * 3) Prepares expert-ready structure
 * 4) Leaves hooks for:
 *    - official sources
 *    - rule-based exclusions
 *    - risk scoring
 *
 * IMPORTANT:
 * - This is NOT final legal classification
 * - Output is decision-assist only
 */
export async function runHsEngineV1(
  intake: HsIntakeV1
): Promise<HsResultV1> {

  // === 1) Validate intake ===
  const validation = validateHsIntakeV1(intake);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const nowIso = new Date().toISOString();

  // === 2) Process each item ===
  const items: HsResultItemV1[] = intake.items.map((item, idx) => {
    const normalizedProvided =
      item.hs_mode === "validate" && item.provided_hs_code
        ? normalizeHsCode(item.provided_hs_code)
        : null;

    // === Placeholder suggestion (v1 baseline) ===
    // This WILL be replaced by:
    // - HTS tree logic
    // - Chapter / heading narrowing
    // - official sources cross-check
    const suggested = [
      {
        hs_code: normalizedProvided?.normalized || "0000.00.00",
        title: "Preliminary HS placeholder (engine v1)",
        confidence: "LOW" as const,
        risk_level: "HIGH" as const,
        risk_reasons: [
          "Preliminary classification",
          "Official HTS validation pending",
        ],
        duty_estimate: {
          disclaimer:
            "Duty rates are indicative only. Official HTSUS determination required.",
        },
        official_sources_used: [],
      },
    ];

    return {
      item_index: idx,
      mode: item.hs_mode,
      input_echo: {
        product_description: item.product_description,
        primary_use: item.primary_use,
        material_composition: item.material_composition,
        country_of_origin: item.country_of_origin,
        destination_country: intake.destination_country,
        provided_hs_code: item.provided_hs_code,
        unit_value_usd: item.unit_value_usd,
      },
      suggested,
      regulatory_agencies: [],
      notes: normalizedProvided?.warnings || [],
    };
  });

  // === 3) Final result ===
  return {
    version: "v1",
    generated_at_iso: nowIso,
    destination_country: intake.destination_country,
    items,
  };
}

// --- HS Engine public API (v1, minimal) ---
export type HsClassificationResult = {
  hsCode: string | null;
  title: string;
  confidence: number;
  source: "usitc-hts" | "unknown";
};


export function classifyHS(input: { description: string }): HsClassificationResult {
  const raw = String(input?.description || "").trim();
  if (!raw) {
    return { hsCode: null, title: "No description provided", confidence: 0, source: "unknown" };
  }

  // If user provides a code, validate/expand it
  const compact = raw.replace(/\s/g, "");
  const looksLikeCode = /^[0-9]{4,10}(\.[0-9]{2,4})?$/.test(compact);
  if (looksLikeCode) {
    const row = getHtsRowByCode(compact);
    if (row) {
      return { hsCode: row.htsno, title: row.description || "HTS match", confidence: 0.95, source: "usitc-hts" };
    }
    return { hsCode: null, title: "HTS code not found in dataset", confidence: 0.2, source: "usitc-hts" };
  }

  const hits = searchHtsByDescription(raw, { limit: 15 });

  // pick best non-special if available, else best overall
  const bestNonSpecial = hits.find((h) => !h.isSpecial);
  const best = bestNonSpecial || hits[0];

  if (best) {
    const conf = Math.max(0.1, Math.min(0.85, Number(best.score ?? 0)));
    return { hsCode: best.code, title: best.description || "HTS match", confidence: conf, source: "usitc-hts" };
  }

  return { hsCode: null, title: "Unclassified (no match in dataset)", confidence: 0.1, source: "usitc-hts" };
}