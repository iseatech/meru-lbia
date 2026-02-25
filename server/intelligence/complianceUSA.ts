/**
 * MERU LBIA — CUSTOMS / HS INTELLIGENCE ENGINE (USA)
 * NOTE:
 * - This engine reviews HS/HTSUS provided by the client (NO official classification).
 * - Thinks like a senior Customs specialist: validates, cross-checks, flags risks, estimates duty, suggests next actions.
 * - Designed to integrate official sources via REST (Phase 2): HTS (USITC) + CBP CROSS.
 */

export type AudienceType =
  | "importer"
  | "amazon_seller"
  | "freight_forwarder_broker"
  | "3pl"
  | "procurement_supply_chain";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export type HtsDutyRates = {
  general?: string;   // e.g. "1%"
  special?: string;   // e.g. "Free (A, AU...)"
  column2?: string;   // e.g. "35%"
};

export type HtsLookupResult = {
  hts?: string;                 // 8-10 digits from HTS
  article_description?: string;
  rates?: HtsDutyRates;
  notes?: string[];
  source_url?: string;
  raw?: any;
};

export type CrossRulingHit = {
  ruling_id?: string;
  title?: string;
  date?: string;
  url?: string;
  summary?: string;
  raw?: any;
};

export type RegulatoryFlag = {
  agency: "CBP" | "FDA" | "USDA" | "EPA" | "DOT" | "FCC" | "CPSC" | "OFAC" | "BIS" | "FTZ" | "OTHER";
  level: "INFO" | "WARNING" | "HIGH_RISK";
  reason: string;
  action: string;
  source_hint?: string; // where to verify (official)
};

export type CustomsIntake = {
  service_type?: string; // e.g. customs_upto_5, customs_6_20, bulk_250
  audience_type: AudienceType;

  hs_code?: string;             // client-provided, expected format ####.##.##
  product_description: string;  // plain language description
  country_of_origin: string;    // e.g. China
  destination_country?: string; // default USA
  estimated_value_usd?: number; // optional for duty estimate
  quantity?: number;            // optional

  // optional extras for better reasoning
  declared_use?: string;         // industrial, consumer, medical, etc
  material?: string;             // steel, plastic, etc
  power_source?: string;         // electric, battery, none
  dimensions_notes?: string;
};

export type DutyEstimate = {
  basis: "GENERAL" | "SPECIAL" | "COLUMN2" | "UNKNOWN";
  rate_percent?: number;
  estimated_duty_usd?: number;
  explanation: string;
};

export type CustomsDecision = {
  summary: string;

  confidence_level: ConfidenceLevel;
  decision_rationale: string; // human, strategic, not legal

  validated_inputs: {
    hs_code_format_ok: boolean;
    hs_code_normalized?: string;
    destination_country: string;
    ambiguity_flags: string[];
  };

  hts_lookup?: {
    matched: boolean;
    result?: HtsLookupResult;
    mismatch_risk: "LOW" | "MEDIUM" | "HIGH";
    mismatch_reason?: string;
  };

  cross_rulings?: {
    searched: boolean;
    hits: CrossRulingHit[];
    note: string;
  };

  duty_estimate?: DutyEstimate;

  regulatory_flags: RegulatoryFlag[];

  recommendation: {
    import_convenience: "PROCEED" | "PROCEED_WITH_CAUTION" | "RECONSIDER";
    why: string[];
    next_actions: string[];
  };

  api_layer: {
    enabled: boolean;
    hts_rest_base: string;
    hts_calls_planned: string[];
    cross_calls_planned: string[];
    status_note: string;
  };

  learning_memory: {
    enabled: boolean;
    memory_keys_written: string[];
    note: string;
  };
};

/* =========================
   PHASE 2 — OFFICIAL DATA APIs
   ========================= */

const HTS_REST_BASE = "https://hts.usitc.gov/reststop";
const CROSS_SEARCH_URL = "https://rulings.cbp.gov/search";

export type CustomsApiConfig = {
  enabled: boolean;
  timeout_ms?: number;
};

async function htsRestSearch(keyword: string, cfg: CustomsApiConfig): Promise<HtsLookupResult | null> {
  // Phase 2: official HTS REST
  // GET https://hts.usitc.gov/reststop/search?keyword=copper
  if (!cfg.enabled) return null;

  const url = `${HTS_REST_BASE}/search?keyword=${encodeURIComponent(keyword)}`;
  const resp = await fetchWithTimeout(url, cfg.timeout_ms || 12000);
  const json = await resp.json();

  // We keep it flexible because HTS payload can vary.
  return {
    source_url: url,
    raw: json
  };
}

async function htsRestExportRange(from: string, to: string, format: "JSON" | "CSV" | "XLSX", cfg: CustomsApiConfig): Promise<HtsLookupResult | null> {
  // Phase 2: official HTS REST exportList
  // GET https://hts.usitc.gov/reststop/exportList?from=0100&to=0200&format=JSON&styles=true
  if (!cfg.enabled) return null;

  const url = `${HTS_REST_BASE}/exportList?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=${format}&styles=true`;
  const resp = await fetchWithTimeout(url, cfg.timeout_ms || 12000);
  const json = await resp.json();

  return {
    source_url: url,
    raw: json
  };
}

async function crossSearch(query: string, cfg: CustomsApiConfig): Promise<CrossRulingHit[]> {
  // Phase 2: CROSS has no clean REST for free use in many cases.
  // We leave the integration layer ready: Meru can implement via approved methods (API gateway/scraper/partner).
  // For now: return empty if disabled.
  if (!cfg.enabled) return [];

  // Placeholder: in Phase 2, Meru will route this call through our own backend connector.
  // Example planned endpoint: GET /api/connectors/cross/search?q=...
  return [];
}

/* =========================
   ML HOOKS (LBIA v4+)
   ========================= */

type MlHooks = {
  enabled: boolean;

  // Confidence scoring based on completeness, match strength, ruling hits, ambiguity.
  scoreConfidence(input: CustomsIntake, signals: { ambiguity: string[]; htsMatched: boolean; mismatchRisk: "LOW"|"MEDIUM"|"HIGH" }): ConfidenceLevel;

  // Human rationale (strategic, not legal)
  buildRationale(input: CustomsIntake, decision: { mismatchRisk: string; regFlagsCount: number; dutyKnown: boolean }): string;

  // Memory write (future learning)
  writeMemory(keys: Record<string, string | number | boolean>): { written: string[] };
};

const DefaultMlHooks: MlHooks = {
  enabled: true,

  scoreConfidence(input, signals) {
    let points = 0;

    if (input.product_description && input.product_description.trim().length >= 8) points += 20;
    if (input.country_of_origin) points += 10;
    if ((input.destination_country || "USA").toUpperCase() === "USA") points += 5;
    if (input.hs_code) points += 10;
    if (input.estimated_value_usd && input.estimated_value_usd > 0) points += 10;

    if (signals.htsMatched) points += 20;
    if (signals.mismatchRisk === "LOW") points += 10;
    if (signals.mismatchRisk === "HIGH") points -= 20;
    if (signals.ambiguity.length >= 2) points -= 10;

    if (points >= 60) return "HIGH";
    if (points >= 35) return "MEDIUM";
    return "LOW";
  },

  buildRationale(input, decision) {
    const who = audienceLabel(input.audience_type);
    const origin = input.country_of_origin || "origin";
    const desc = (input.product_description || "").trim();

    const bullets: string[] = [];
    bullets.push(`This recommendation was selected to reduce classification risk and avoid avoidable customs delays for a ${who}.`);
    bullets.push(`The product description "${desc || "N/A"}" and origin "${origin}" drive the primary compliance checks (HTS rate + regulatory screening).`);

    if (decision.mismatchRisk === "HIGH") bullets.push("There is a high risk of HS/description mismatch, so the priority is to validate HTS applicability before committing to purchase or shipment.");
    if (decision.regFlagsCount > 0) bullets.push("Regulatory indicators were detected; verifying admissibility early reduces inspection/hold probability and unexpected rework costs.");
    if (!decision.dutyKnown) bullets.push("Duty rate could not be confirmed automatically; next actions focus on pulling official HTS details and CROSS rulings to confirm the rate and notes.");

    // Audience nuance
    if (input.audience_type === "amazon_seller") bullets.push("For Amazon sellers, the key is landed cost predictability and minimizing arrival disruptions that impact inventory availability.");
    if (input.audience_type === "3pl") bullets.push("For 3PL operations, the key is predictable clearance, documentation completeness, and avoiding storage/demurrage exposure.");

    return bullets.join(" ");
  },

  writeMemory(keys) {
    // Phase 2: persist into meru_learning_memory table (or vector store) via backend.
    const written = Object.keys(keys);
    return { written };
  }
};

/* =========================
   CORE ENGINE
   ========================= */

export async function runCustomsHsIntelligence(
  intake: CustomsIntake,
  cfg?: { api?: CustomsApiConfig; ml?: MlHooks }
): Promise<CustomsDecision> {

  const apiCfg: CustomsApiConfig = cfg?.api || { enabled: false, timeout_ms: 12000 };
  const ml = cfg?.ml || DefaultMlHooks;

  const destination = (intake.destination_country || "USA").trim() || "USA";

  // Step 1: HS format validation (8 digits recommended: ####.##.##)
  const hsNormalized = normalizeHs(intake.hs_code || "");
  const hsFormatOk = hsNormalized ? isHs8Format(hsNormalized) : false;

  // Step 2: Compare HS vs description (do NOT trust blindly)
  const ambiguity = detectAmbiguity(intake.product_description);

  // Step 3: HTS lookup plan (REST layer)
  // If HS provided, search by HS fragments + description keyword.
  // If not, search by description keyword.
  const keyword = pickSearchKeyword(intake.product_description, hsNormalized);
  let htsRaw: HtsLookupResult | null = null;

  if (keyword) {
    try { htsRaw = await htsRestSearch(keyword, apiCfg); } catch { /* keep null */ }
  }

  // Step 4: Determine mismatch risk (logic first; Phase 2 uses HTS parsing)
  const mismatchRisk = computeMismatchRisk({ hsFormatOk, ambiguity, htsFound: !!htsRaw });

  // Step 5: Regulatory screening (rule-based now; Phase 2 expands with official feeds)
  const regFlags = buildRegulatoryFlags(intake);

  // Step 6: Duty estimate (best-effort)
  const dutyEstimate = estimateDuty(intake, htsRaw);

  // Step 7: Audience-aware summary + recommendation
  const summary = buildAudienceSummary(intake, mismatchRisk, regFlags, dutyEstimate);

  const importConvenience = decideImportConvenience(mismatchRisk, regFlags, dutyEstimate);

  const why: string[] = [];
  if (mismatchRisk === "HIGH") why.push("High HS/description mismatch risk — validate HTS applicability before proceeding.");
  if (regFlags.some(f => f.level === "HIGH_RISK")) why.push("High-risk regulatory indicators detected — confirm admissibility requirements early.");
  if (dutyEstimate?.basis === "COLUMN2") why.push("Column 2 duty may apply — origin and sanctions/trade policy require careful verification.");
  if (dutyEstimate?.rate_percent != null) why.push(`Duty rate signal identified (~${dutyEstimate.rate_percent}% basis: ${dutyEstimate.basis}).`);

  const nextActions = buildNextActions(intake, mismatchRisk, regFlags, apiCfg.enabled);

  // Step 8: Confidence + rationale (ML hooks)
  const confidence = ml.scoreConfidence(intake, { ambiguity, htsMatched: !!htsRaw, mismatchRisk });
  const rationale = ml.buildRationale(intake, { mismatchRisk, regFlagsCount: regFlags.length, dutyKnown: !!dutyEstimate?.rate_percent });

  // Step 9: Learning memory (future)
  const memoryKeys: Record<string, string | number | boolean> = {
    engine: "customs_hs_intelligence",
    audience_type: intake.audience_type,
    hs_format_ok: hsFormatOk,
    mismatch_risk: mismatchRisk,
    origin: (intake.country_of_origin || "").trim().toUpperCase(),
    destination: destination.toUpperCase()
  };
  const mem = ml.enabled ? ml.writeMemory(memoryKeys) : { written: [] };

  return {
    summary,

    confidence_level: confidence,
    decision_rationale: rationale,

    validated_inputs: {
      hs_code_format_ok: hsFormatOk,
      hs_code_normalized: hsNormalized || undefined,
      destination_country: destination,
      ambiguity_flags: ambiguity
    },

    hts_lookup: {
      matched: !!htsRaw,
      result: htsRaw || undefined,
      mismatch_risk: mismatchRisk,
      mismatch_reason: mismatchRisk !== "LOW"
        ? "HS provided by client may not match product description; verify HTS rate/notes and CROSS rulings."
        : undefined
    },

    cross_rulings: {
      searched: apiCfg.enabled,
      hits: apiCfg.enabled ? await crossSearch(buildCrossQuery(intake, hsNormalized), apiCfg) : [],
      note: apiCfg.enabled
        ? "CROSS integration planned via Meru connector. Review relevant rulings for classification alignment."
        : "CROSS not queried (API layer disabled). Use https://rulings.cbp.gov/search for validation."
    },

    duty_estimate: dutyEstimate || undefined,

    regulatory_flags: regFlags,

    recommendation: {
      import_convenience: importConvenience,
      why,
      next_actions: nextActions
    },

    api_layer: {
      enabled: apiCfg.enabled,
      hts_rest_base: HTS_REST_BASE,
      hts_calls_planned: [
        "GET /reststop/search?keyword=<product or hts keyword>",
        "GET /reststop/exportList?from=<range>&to=<range>&format=JSON&styles=true (optional)"
      ],
      cross_calls_planned: [
        "CROSS search via Meru connector: /api/connectors/cross/search?q=<hs|keywords>"
      ],
      status_note: apiCfg.enabled
        ? "API layer enabled: HTS REST is callable; CROSS connector is staged."
        : "API layer disabled: engine runs rule-based; enable for official HTS extraction."
    },

    learning_memory: {
      enabled: ml.enabled,
      memory_keys_written: mem.written,
      note: ml.enabled
        ? "Memory keys prepared for Phase 2 persistence (learning)."
        : "Learning disabled."
    }
  };
}

/* =========================
   HELPERS (no external deps)
   ========================= */

function normalizeHs(hs: string): string | null {
  const s = (hs || "").trim();
  if (!s) return null;

  // keep digits and dots only
  const cleaned = s.replace(/[^\d.]/g, "");
  // If user typed 8 digits without dots: 12345678 -> 1234.56.78
  const digitsOnly = cleaned.replace(/\./g, "");
  if (/^\d{8}$/.test(digitsOnly)) {
    return `${digitsOnly.slice(0,4)}.${digitsOnly.slice(4,6)}.${digitsOnly.slice(6,8)}`;
  }
  return cleaned;
}

function isHs8Format(hs: string): boolean {
  return /^\d{4}\.\d{2}\.\d{2}$/.test(hs);
}

function detectAmbiguity(desc: string): string[] {
  const d = (desc || "").toLowerCase();
  const flags: string[] = [];
  if (!d || d.trim().length < 4) flags.push("Description too short");
  if (/\b(parts|component|components)\b/.test(d)) flags.push("Generic 'parts/components' description");
  if (/\bvalve|valves\b/.test(d) && d.trim() === "valves") flags.push("Too generic: 'valves' needs type/use/material");
  if (/\bkit|set\b/.test(d)) flags.push("Could be a set/kit (classification rules apply)");
  if (/\bother\b/.test(d)) flags.push("Uses 'other' wording (classification ambiguity)");
  return flags;
}

function pickSearchKeyword(desc: string, hsNorm: string | null): string | null {
  const d = (desc || "").trim();
  if (d.length >= 3) return d;
  if (hsNorm) return hsNorm.replace(/\./g, "");
  return null;
}

function computeMismatchRisk(args: { hsFormatOk: boolean; ambiguity: string[]; htsFound: boolean }): "LOW" | "MEDIUM" | "HIGH" {
  if (!args.hsFormatOk && args.ambiguity.length >= 2) return "HIGH";
  if (args.ambiguity.length >= 2) return "MEDIUM";
  if (!args.hsFormatOk) return "MEDIUM";
  if (!args.htsFound) return "MEDIUM";
  return "LOW";
}

function buildCrossQuery(intake: CustomsIntake, hsNorm: string | null): string {
  const parts: string[] = [];
  if (hsNorm) parts.push(hsNorm);
  if (intake.product_description) parts.push(intake.product_description);
  return parts.join(" ");
}

function parsePercent(s: string): number | null {
  const m = String(s || "").match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  return Number(m[1]);
}

function estimateDuty(intake: CustomsIntake, hts: HtsLookupResult | null): DutyEstimate | null {
  // Phase 2: parse actual HTS rates from HTS payload.
  // For now: if we can detect a percent somewhere, we estimate; otherwise we return UNKNOWN.
  const val = intake.estimated_value_usd && intake.estimated_value_usd > 0 ? intake.estimated_value_usd : null;

  if (!hts || !hts.raw) {
    return {
      basis: "UNKNOWN",
      explanation: "Duty rate not confirmed automatically. Enable HTS REST parsing or verify in https://hts.usitc.gov/ and CROSS."
    };
  }

  // Best-effort: look for percent in raw blob
  const blob = JSON.stringify(hts.raw);
  const pct = parsePercent(blob);

  if (pct == null) {
    return {
      basis: "UNKNOWN",
      explanation: "HTS data returned but duty rate could not be parsed reliably. Manual verification required."
    };
  }

  const est = val != null ? Math.round((val * (pct / 100)) * 100) / 100 : undefined;

  return {
    basis: "GENERAL",
    rate_percent: pct,
    estimated_duty_usd: est,
    explanation: val != null
      ? `Estimated duty = value ($${val}) x rate (${pct}%). This is an estimate; final duty depends on HTS notes and admissibility.`
      : `Duty rate signal detected (${pct}%). Provide product value to estimate duty in USD.`
  };
}

function buildRegulatoryFlags(intake: CustomsIntake): RegulatoryFlag[] {
  const desc = (intake.product_description || "").toLowerCase();
  const origin = (intake.country_of_origin || "").toLowerCase();
  const flags: RegulatoryFlag[] = [];

  // Baseline CBP warning if description is ambiguous
  const amb = detectAmbiguity(intake.product_description);
  if (amb.length) {
    flags.push({
      agency: "CBP",
      level: "WARNING",
      reason: `Product description ambiguity: ${amb.join("; ")}`,
      action: "Clarify product type, material, use-case, and technical specs before relying on HS/HTS rate.",
      source_hint: "https://hts.usitc.gov/ and https://rulings.cbp.gov/search"
    });
  }

  // Simple agency heuristics (expandable; keep vocabulary and grow)
  if (/\bfood|supplement|vitamin|beverage|candy|chocolate\b/.test(desc)) {
    flags.push({
      agency: "FDA",
      level: "HIGH_RISK",
      reason: "Food/supplement indicator detected.",
      action: "Check FDA import requirements and prior notice. Verify labeling and ingredient compliance.",
      source_hint: "FDA import guidance (official)"
    });
  }

  if (/\bmeat|poultry|egg|dairy|cheese|milk\b/.test(desc)) {
    flags.push({
      agency: "USDA",
      level: "HIGH_RISK",
      reason: "Animal-origin product indicator detected.",
      action: "Confirm USDA/FSIS admissibility and required permits/certificates.",
      source_hint: "USDA/FSIS import requirements (official)"
    });
  }

  if (/\bbattery|lithium|hazmat|dangerous goods|dg\b/.test(desc)) {
    flags.push({
      agency: "DOT",
      level: "HIGH_RISK",
      reason: "Hazmat / lithium battery indicator detected.",
      action: "Verify hazmat classification, packaging, labeling, and carrier acceptance for the chosen mode.",
      source_hint: "DOT / IATA / IMDG rules (official/standard)"
    });
  }

  if (/\bradio|wireless|bluetooth|wifi|transmitter|receiver|antenna\b/.test(desc)) {
    flags.push({
      agency: "FCC",
      level: "HIGH_RISK",
      reason: "Wireless/radio equipment indicator detected.",
      action: "Verify FCC equipment authorization and labeling requirements before import.",
      source_hint: "FCC equipment authorization (official)"
    });
  }

  if (/\btoy|children|kid|kids|infant\b/.test(desc)) {
    flags.push({
      agency: "CPSC",
      level: "HIGH_RISK",
      reason: "Children's product indicator detected.",
      action: "Check testing/certification and labeling requirements for children's products.",
      source_hint: "CPSC requirements (official)"
    });
  }

  if (/\bchemical|solvent|pesticide|fertilizer|paint|coating\b/.test(desc)) {
    flags.push({
      agency: "EPA",
      level: "HIGH_RISK",
      reason: "Chemical/pesticide indicator detected.",
      action: "Confirm EPA admissibility, labeling, and reporting requirements.",
      source_hint: "EPA import requirements (official)"
    });
  }

  // Origin-driven policy awareness (very light; expand later with official feeds)
  if (origin.includes("china")) {
    flags.push({
      agency: "OTHER",
      level: "WARNING",
      reason: "Origin = China may trigger additional trade remedies depending on HTS line (e.g., Section 301).",
      action: "Verify if Section 301 duties apply for this HTS line; confirm with official guidance and broker.",
      source_hint: "USTR/CBP notices + HTS notes (official)"
    });
  }

  return flags;
}

function audienceLabel(a: AudienceType): string {
  switch (a) {
    case "importer": return "importer";
    case "amazon_seller": return "Amazon seller";
    case "freight_forwarder_broker": return "freight forwarder / customs broker";
    case "3pl": return "3PL operator";
    case "procurement_supply_chain": return "procurement / supply chain team";
  }
}

function buildAudienceSummary(
  intake: CustomsIntake,
  mismatchRisk: "LOW"|"MEDIUM"|"HIGH",
  flags: RegulatoryFlag[],
  duty: DutyEstimate | null
): string {

  const who = audienceLabel(intake.audience_type);
  const origin = intake.country_of_origin || "origin";
  const hs = normalizeHs(intake.hs_code || "") || "N/A";
  const dutyText = duty?.rate_percent != null ? `Duty signal: ~${duty.rate_percent}%` : "Duty signal: not confirmed";

  const base = `HS Intelligence review for a ${who}: HS ${hs}, origin ${origin}. ${dutyText}.`;

  if (mismatchRisk === "HIGH") return `${base} High misclassification risk detected — validate HTS applicability and rulings before committing.`;
  if (flags.some(f => f.level === "HIGH_RISK")) return `${base} Regulatory indicators detected — admissibility checks should be completed before shipment.`;
  return `${base} Proceed with structured verification (HTS + rulings + regulatory screen) to confirm landed cost and clearance risk.`;
}

function decideImportConvenience(
  mismatchRisk: "LOW"|"MEDIUM"|"HIGH",
  flags: RegulatoryFlag[],
  duty: DutyEstimate | null
): "PROCEED" | "PROCEED_WITH_CAUTION" | "RECONSIDER" {

  if (mismatchRisk === "HIGH") return "PROCEED_WITH_CAUTION";
  if (flags.some(f => f.level === "HIGH_RISK") && (duty?.basis === "UNKNOWN")) return "PROCEED_WITH_CAUTION";
  if (flags.filter(f => f.level === "HIGH_RISK").length >= 2) return "PROCEED_WITH_CAUTION";
  return "PROCEED";
}

function buildNextActions(
  intake: CustomsIntake,
  mismatchRisk: "LOW"|"MEDIUM"|"HIGH",
  flags: RegulatoryFlag[],
  apiEnabled: boolean
): string[] {

  const actions: string[] = [];

  actions.push("Confirm the product’s full technical description (material, function, use-case) to reduce classification ambiguity.");
  actions.push("Verify HTS duty rate and notes using HTS (USITC).");
  actions.push("Validate classification alignment using CBP CROSS rulings.");

  if (!apiEnabled) {
    actions.push("Enable HTS REST integration in Meru to extract official HTS entries automatically (Phase 2).");
  } else {
    actions.push("Pull HTS REST search results and map to the closest tariff article; store the selected match in Decision Brief record.");
  }

  if (mismatchRisk !== "LOW") actions.push("Request broker confirmation or internal review before finalizing purchase order or shipment.");

  const high = flags.filter(f => f.level === "HIGH_RISK");
  if (high.length) actions.push("Complete admissibility checks for flagged agencies (permits, certificates, labeling) before booking.");

  if (intake.estimated_value_usd && intake.estimated_value_usd > 0) {
    actions.push("Calculate a landed-cost estimate (duty + taxes + fees) and compare suppliers/origin alternatives.");
  } else {
    actions.push("Add estimated product value (USD) to compute an estimated duty amount.");
  }

  return actions;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}