/**
 * MERU LBIA QA Harness
 * 
 * Executes predefined test cases to validate:
 * - Strategy selection
 * - Language domain compliance
 * - Forbidden terms absence
 * - Section gating correctness
 */

import { runDecisionEngine } from './decisionEngine';
import { runLBIAAnalysis, type LBIAReport, type LogisticsStrategy, type CargoScale } from './lbiaAgent';
import { renderBriefHTML } from './briefTemplate';
import { 
  FORBIDDEN_TERMS, 
  STRATEGY_VOCABULARY, 
  ELJL_BANNED_PHRASES, 
  FORBIDDEN_SECTIONS_BY_SCALE,
  SYSTEM_LANGUAGE_BANNED,
  HEDGING_WORDS_BANNED,
  validateDecisionAuthorityMode
} from './vocabulary';

// ============ TEST CASE DEFINITIONS ============

type TestCase = {
  id: string;
  name: string;
  intake: any;
  expectedStrategy: LogisticsStrategy;
  expectedCargoScale: CargoScale;
  mustNotContain: string[];
  mustContain?: string[];
};

const TEST_CASES: TestCase[] = [
  // ============ SMALL CARGO TESTS ============
  {
    id: "TC01",
    name: "Small LCL - 0.3 CBM / 100 kg",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "EXW", priority: "balanced", client_type: "importer_exporter",
      units_count: 1, unit_length: 100, unit_width: 60, unit_height: 50, unit_dim_uom: "cm",
      unit_weight: 100, unit_weight_uom: "kg"  // ~333 kg/CBM - within 500 threshold
    },
    expectedStrategy: "LCL",
    expectedCargoScale: "SMALL_CONSOLIDATED",
    mustNotContain: ["enterprise", "charter", "backup carriers", "rollover", "container utilization", "multi-container"]
  },
  {
    id: "TC02",
    name: "Small LCL Dense - 1 CBM / 450 kg",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "EXW", priority: "balanced", client_type: "importer_exporter",
      units_count: 1, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 450, unit_weight_uom: "kg"  // 450 kg/CBM - just below 500 threshold
    },
    expectedStrategy: "LCL",
    expectedCargoScale: "SMALL_CONSOLIDATED",
    mustNotContain: ["enterprise", "charter", "FCL", "container utilization"],
    mustContain: ["dense cargo", "W/M"]
  },
  {
    id: "TC03",
    name: "Standard LCL - 8 CBM / 2000 kg",
    intake: {
      pol: "Shenzhen", pod: "Rotterdam", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "freight_forwarder",
      units_count: 8, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 250, unit_weight_uom: "kg"
    },
    expectedStrategy: "LCL",
    expectedCargoScale: "STANDARD_LCL",
    mustNotContain: ["enterprise", "charter", "backup carriers", "rollover", "container utilization"]
  },
  
  // ============ STANDARD FCL TESTS ============
  {
    id: "TC04",
    name: "Standard FCL - 20 CBM / 8t",
    intake: {
      pol: "Ningbo", pod: "Rotterdam", mode: "SEA", shipment_type: "FCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 20, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 400, unit_weight_uom: "kg"
    },
    expectedStrategy: "FCL",
    expectedCargoScale: "STANDARD_FCL",
    mustNotContain: ["enterprise", "charter", "heavy lift", "breakbulk", "consolidation window"]
  },
  {
    id: "TC05",
    name: "Standard FCL - 40 CBM / 15t",
    intake: {
      pol: "Shanghai", pod: "Hamburg", mode: "SEA", shipment_type: "FCL",
      incoterm: "CIF", priority: "cost", client_type: "importer_exporter",
      units_count: 40, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 375, unit_weight_uom: "kg"
    },
    expectedStrategy: "FCL",
    expectedCargoScale: "STANDARD_FCL",
    mustNotContain: ["enterprise coordination", "charter", "co-loader", "W/M"]
  },
  
  // ============ ENTERPRISE TESTS ============
  {
    id: "TC06",
    name: "Enterprise FCL - 80 CBM",
    intake: {
      pol: "Shanghai", pod: "Hamburg", mode: "SEA", shipment_type: "FCL",
      incoterm: "DDP", priority: "cost", client_type: "importer_exporter",
      units_count: 80, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 200, unit_weight_uom: "kg"
    },
    expectedStrategy: "ENTERPRISE_FCL",
    expectedCargoScale: "ENTERPRISE_CONTAINERIZED",
    mustNotContain: ["charter", "breakbulk", "heavy lift", "crane outreach", "W/M"]
  },
  {
    id: "TC07",
    name: "Enterprise FCL - 150 CBM / 3 containers",
    intake: {
      pol: "Ningbo", pod: "Long Beach", mode: "SEA", shipment_type: "FCL",
      incoterm: "FOB", priority: "balanced", client_type: "freight_forwarder",
      units_count: 150, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 250, unit_weight_uom: "kg"
    },
    expectedStrategy: "ENTERPRISE_FCL",
    expectedCargoScale: "ENTERPRISE_CONTAINERIZED",
    mustNotContain: ["charter", "breakbulk", "co-loader", "consolidation window"]
  },
  
  // ============ PROJECT / OOG / HEAVY TESTS ============
  {
    id: "TC08",
    name: "Project OOG - Overwidth 4m",
    intake: {
      pol: "Busan", pod: "Santos", mode: "SEA", shipment_type: "PROJECT",
      incoterm: "DAP", priority: "speed", client_type: "project_cargo",
      units_count: 1, unit_length: 600, unit_width: 400, unit_height: 250, unit_dim_uom: "cm",
      unit_weight: 12000, unit_weight_uom: "kg", max_piece_weight_kg: 12000
    },
    expectedStrategy: "BREAKBULK_HEAVY_LIFT",
    expectedCargoScale: "PROJECT_ENGINEERING",
    mustNotContain: ["container utilization", "consolidation window", "load factor"]
  },
  {
    id: "TC09",
    name: "Project Heavy - 45t single piece",
    intake: {
      pol: "Busan", pod: "Santos", mode: "SEA", shipment_type: "PROJECT",
      incoterm: "DAP", priority: "speed", client_type: "project_cargo",
      units_count: 1, unit_length: 800, unit_width: 400, unit_height: 350, unit_dim_uom: "cm",
      unit_weight: 45000, unit_weight_uom: "kg", max_piece_weight_kg: 45000
    },
    expectedStrategy: "CHARTER",
    expectedCargoScale: "PROJECT_ENGINEERING",
    mustNotContain: ["container utilization", "load factor", "co-loader", "W/M"]
  },
  
  // ============ DATA QUALITY GATE TESTS ============
  {
    id: "TC10",
    name: "Dense Cargo Valid - 11.2 CBM / 10.5t (should NOT HOLD)",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 35, unit_length: 80, unit_width: 80, unit_height: 50, unit_dim_uom: "cm",
      unit_weight: 300, unit_weight_uom: "kg"  // 11.2 CBM / 10500 kg = 937 kg/CBM - dense but valid
    },
    expectedStrategy: "LCL",
    expectedCargoScale: "STANDARD_LCL",
    mustNotContain: ["HOLD", "validation required"],
    mustContain: ["dense cargo", "W/M", "chargeable"]
  },
  
  // ============ HOLD VALIDATION TESTS ============
  {
    id: "TC10b",
    name: "Invalid Data - Zero weight (should HOLD)",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 10, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 0, unit_weight_uom: "kg"  // Zero weight - invalid
    },
    expectedStrategy: "HOLD_FOR_VALIDATION",
    expectedCargoScale: "SMALL_CONSOLIDATED",
    mustNotContain: ["scenario A", "scenario B", "action plan", "60-day", "risk score"]
  },
  {
    id: "TC10c",
    name: "Invalid Data - Missing dimensions (should HOLD)",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 10, unit_length: 0, unit_width: 0, unit_height: 0, unit_dim_uom: "cm",
      unit_weight: 50, unit_weight_uom: "kg"  // Valid weight but zero dimensions - invalid
    },
    expectedStrategy: "HOLD_FOR_VALIDATION",
    expectedCargoScale: "SMALL_CONSOLIDATED",
    mustNotContain: ["scenario A", "scenario B", "action plan", "60-day"]
  },
  
  // ============ OPTIONAL SHIPMENT_TYPE TESTS ============
  {
    id: "TC10d",
    name: "Missing shipment_type - Meru auto-selects LCL for small cargo",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 5, unit_length: 50, unit_width: 50, unit_height: 50, unit_dim_uom: "cm",
      unit_weight: 100, unit_weight_uom: "kg"  // ~0.625 CBM total - small cargo
    },
    expectedStrategy: "LCL",
    expectedCargoScale: "SMALL_CONSOLIDATED",
    mustNotContain: ["HOLD", "validation required"]
  },
  {
    id: "TC10e",
    name: "Missing shipment_type - Meru auto-selects FCL for large cargo",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 20, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 500, unit_weight_uom: "kg"  // 20 CBM total - large cargo
    },
    expectedStrategy: "FCL",
    expectedCargoScale: "STANDARD_FCL",
    mustNotContain: ["HOLD", "validation required"]
  },

  // ============ DENSE CARGO TESTS ============
  {
    id: "TC10f",
    name: "Small Dense LCL - 11 CBM / 6000 kg (545 kg/CBM)",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 11, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 545, unit_weight_uom: "kg",  // ~545 kg/CBM - above 500 threshold
      cargo_nature: "dense", decision_goal: "avoid_overpaying"
    },
    expectedStrategy: "LCL",
    expectedCargoScale: "STANDARD_LCL",
    mustNotContain: ["HOLD", "validation required", "enterprise", "charter"],
    mustContain: ["dense cargo", "W/M"]
  },

  // ============ EDGE CASES ============
  {
    id: "TC11",
    name: "LCL boundary - exactly 12 CBM",
    intake: {
      pol: "Shenzhen", pod: "Rotterdam", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 12, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 200, unit_weight_uom: "kg"
    },
    expectedStrategy: "LCL",
    expectedCargoScale: "STANDARD_LCL",
    mustNotContain: ["enterprise", "charter", "container utilization"]
  },
  {
    id: "TC12",
    name: "FCL boundary - exactly 67 CBM (Enterprise threshold)",
    intake: {
      pol: "Shanghai", pod: "Hamburg", mode: "SEA", shipment_type: "FCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 67, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 200, unit_weight_uom: "kg"
    },
    expectedStrategy: "ENTERPRISE_FCL",
    expectedCargoScale: "ENTERPRISE_CONTAINERIZED",
    mustNotContain: ["charter", "breakbulk", "co-loader"]
  },

  // ============ AUDIENCE-SPECIFIC TEST CASES ============
  {
    id: "AUD01",
    name: "Audience: Importer + SMALL_CONSOLIDATED (0.8 CBM / 400 kg)",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 4, unit_length: 60, unit_width: 50, unit_height: 45, unit_dim_uom: "cm",
      unit_weight: 100, unit_weight_uom: "kg",
      cargo_nature: "general", decision_goal: "avoid_overpaying"
    },
    expectedStrategy: "LCL",
    expectedCargoScale: "SMALL_CONSOLIDATED",
    mustNotContain: ["enterprise", "charter", "backup carriers", "rollover", "container utilization", "margin protection", "quote defensibility", "co-loader"],
    mustContain: ["all-in"]
  },
  {
    id: "AUD02",
    name: "Audience: Importer + STANDARD_LCL (8 CBM / 2000 kg)",
    intake: {
      pol: "Shanghai", pod: "Rotterdam", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 8, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 250, unit_weight_uom: "kg",
      cargo_nature: "general", decision_goal: "avoid_overpaying"
    },
    expectedStrategy: "LCL",
    expectedCargoScale: "STANDARD_LCL",
    mustNotContain: ["enterprise", "charter", "backup carriers", "rollover", "container utilization", "margin protection", "co-loader"]
  },
  {
    id: "AUD03",
    name: "Audience: Importer + STANDARD_FCL (18 CBM / 9000 kg)",
    intake: {
      pol: "Ningbo", pod: "Long Beach", mode: "SEA", shipment_type: "FCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 18, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 500, unit_weight_uom: "kg",
      cargo_nature: "general", decision_goal: "avoid_overpaying"
    },
    expectedStrategy: "FCL",
    expectedCargoScale: "STANDARD_FCL",
    mustNotContain: ["enterprise", "charter", "heavy lift", "breakbulk", "margin protection", "co-loader"]
  },
  {
    id: "AUD04",
    name: "Audience: Forwarder + Dense LCL (11.2 CBM / 10500 kg)",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "freight_forwarder",
      units_count: 35, unit_length: 80, unit_width: 80, unit_height: 50, unit_dim_uom: "cm",
      unit_weight: 300, unit_weight_uom: "kg",
      cargo_nature: "dense", decision_goal: "validate_strategy"
    },
    expectedStrategy: "LCL",
    expectedCargoScale: "STANDARD_LCL",
    mustNotContain: ["HOLD", "validation required", "enterprise", "charter", "avoid overpaying"],
    mustContain: ["dense cargo", "W/M"]
  },
  {
    id: "AUD05",
    name: "Audience: Project cargo OOG (2 pcs 35t 4x3.5x3.4m)",
    intake: {
      pol: "Busan", pod: "Santos", mode: "SEA", shipment_type: "PROJECT",
      incoterm: "DAP", priority: "speed", client_type: "project_cargo",
      units_count: 2, unit_length: 400, unit_width: 350, unit_height: 340, unit_dim_uom: "cm",
      unit_weight: 35000, unit_weight_uom: "kg", max_piece_weight_kg: 35000,
      cargo_nature: "oversized", decision_goal: "project_planning"
    },
    expectedStrategy: "CHARTER",
    expectedCargoScale: "PROJECT_ENGINEERING",
    mustNotContain: ["container utilization", "load factor", "consolidation", "co-loader", "W/M", "CFS"]
  },
  {
    id: "AUD06",
    name: "Audience: HOLD - Impossible data (zero weight)",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 10, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 0, unit_weight_uom: "kg",
      cargo_nature: "general", decision_goal: "avoid_overpaying"
    },
    expectedStrategy: "HOLD_FOR_VALIDATION",
    expectedCargoScale: "SMALL_CONSOLIDATED",
    mustNotContain: ["scenario A", "scenario B", "action plan", "60-day", "risk score"]
  }
];

// ============ TEST RESULT TYPES ============

type TestResult = {
  id: string;
  name: string;
  passed: boolean;
  failures: string[];
  strategy_actual: LogisticsStrategy;
  cargo_scale_actual: CargoScale;
};

type QAResult = {
  timestamp: string;
  total_tests: number;
  passed: number;
  failed: number;
  pass_rate: string;
  all_passed: boolean;
  results: TestResult[];
};

// ============ FORBIDDEN TERM CHECKER ============

function checkForbiddenTerms(report: LBIAReport, mustNotContain: string[]): string[] {
  const failures: string[] = [];
  const textToCheck = [
    report.business_impact,
    report.recommendation_rationale,
    report.selected_strategy.rationale,
    ...report.next_actions
  ].join(" ").toLowerCase();
  
  for (const term of mustNotContain) {
    if (textToCheck.includes(term.toLowerCase())) {
      failures.push(`FORBIDDEN TERM: "${term}" found in report`);
    }
  }
  
  // Also check cargo scale forbidden terms
  const scaleForbidden = FORBIDDEN_TERMS[report.analysis_context.cargo_scale] || [];
  for (const term of scaleForbidden) {
    if (textToCheck.includes(term.toLowerCase())) {
      failures.push(`CARGO SCALE VIOLATION: "${term}" forbidden for ${report.analysis_context.cargo_scale}`);
    }
  }
  
  return failures;
}

// ============ MUST CONTAIN CHECKER ============

function checkMustContain(report: LBIAReport, mustContain: string[] | undefined): string[] {
  if (!mustContain || mustContain.length === 0) return [];
  
  const failures: string[] = [];
  const textToCheck = [
    report.business_impact,
    report.recommendation_rationale,
    report.selected_strategy.rationale,
    report.dense_cargo_advisory?.advisory_message || ""
  ].join(" ").toLowerCase();
  
  for (const term of mustContain) {
    if (!textToCheck.includes(term.toLowerCase())) {
      failures.push(`MISSING TERM: "${term}" should be present in report`);
    }
  }
  
  return failures;
}

// ============ STRATEGY-LANGUAGE COUPLING CHECKER ============

function checkStrategyCoupling(report: LBIAReport): string[] {
  const failures: string[] = [];
  const strategy = report.selected_strategy.strategy;
  const textToCheck = [
    report.business_impact,
    report.recommendation_rationale,
    report.selected_strategy.rationale
  ].join(" ").toLowerCase();
  
  const strategyConfig = STRATEGY_VOCABULARY[strategy];
  if (strategyConfig) {
    for (const concept of strategyConfig.forbidden_concepts) {
      if (textToCheck.includes(concept.toLowerCase())) {
        failures.push(`STRATEGY COUPLING VIOLATION: "${concept}" forbidden for ${strategy} strategy`);
      }
    }
  }
  
  return failures;
}

// ============ DECISION AUTHORITY MODE CHECKER ============

function checkDecisionAuthorityCompliance(report: LBIAReport): string[] {
  const failures: string[] = [];
  
  // Collect all narrative text from the report
  const narrativeText = [
    report.business_impact,
    report.recommendation_rationale,
    report.selected_strategy.rationale,
    ...report.next_actions,
    report.eljl?.executive_context || "",
    report.eljl?.executive_judgment?.confidence_statement || "",
    report.eljl?.executive_judgment?.executive_rationale || "",
    report.eljl?.executive_judgment?.commercial_summary || "",
    report.eljl?.commercial_guidance?.cost_range_estimate || "",
    report.eljl?.commercial_guidance?.market_context || "",
    report.eljl?.commercial_guidance?.negotiation_advice || ""
  ].join(" ");
  
  const validation = validateDecisionAuthorityMode(narrativeText);
  
  // Report violations by category
  for (const v of validation.violations) {
    if (v.type === "system_language") {
      failures.push(`DECISION AUTHORITY VIOLATION (System Language): "${v.term}"`);
    } else if (v.type === "hedging_word") {
      failures.push(`DECISION AUTHORITY VIOLATION (Hedging): "${v.term}" - ${v.context}`);
    } else if (v.type === "banned_phrase") {
      failures.push(`DECISION AUTHORITY VIOLATION (AI Phrase): "${v.term}"`);
    }
  }
  
  return failures;
}

// ============ ELJL VALIDATION CHECKER (v3) ============

function checkELJLCompliance(report: LBIAReport): string[] {
  const failures: string[] = [];
  
  // Skip if no ELJL output (HOLD_FOR_VALIDATION reports)
  if (!report.eljl) {
    if (report.selected_strategy.strategy !== "HOLD_FOR_VALIDATION") {
      failures.push("ELJL MISSING: Report should have ELJL output but doesn't");
    }
    return failures;
  }
  
  const eljl = report.eljl;
  const cargoScale = report.analysis_context.cargo_scale;
  
  // Check ELJL banned phrases
  const eljlTextToCheck = [
    eljl.executive_context || "",
    eljl.executive_judgment?.confidence_statement || "",
    eljl.executive_judgment?.executive_rationale || "",
    eljl.executive_judgment?.commercial_summary || "",
    eljl.commercial_guidance?.cost_range_estimate || "",
    eljl.commercial_guidance?.market_context || ""
  ].join(" ").toLowerCase();
  
  for (const phrase of ELJL_BANNED_PHRASES) {
    if (eljlTextToCheck.includes(phrase.toLowerCase())) {
      failures.push(`ELJL BANNED PHRASE: "${phrase}" found in ELJL output`);
    }
  }
  
  // Check section depth proportionality
  const isSmallCargo = cargoScale === "SMALL_CONSOLIDATED" || cargoScale === "STANDARD_LCL";
  const isProjectCargo = cargoScale === "PROJECT_ENGINEERING";
  
  if (isSmallCargo && eljl.section_depth !== "minimal") {
    failures.push(`ELJL DEPTH ERROR: Small cargo should have "minimal" depth, got "${eljl.section_depth}"`);
  }
  
  if (isProjectCargo && eljl.section_depth !== "comprehensive") {
    failures.push(`ELJL DEPTH ERROR: Project cargo should have "comprehensive" depth, got "${eljl.section_depth}"`);
  }
  
  // Check forbidden sections are properly gated
  const forbiddenSections = FORBIDDEN_SECTIONS_BY_SCALE[cargoScale] || [];
  const allowedSections = eljl.allowed_sections || [];
  
  for (const section of forbiddenSections) {
    if (allowedSections.includes(section)) {
      failures.push(`ELJL SECTION ERROR: "${section}" should be forbidden for ${cargoScale} but is in allowed_sections`);
    }
  }
  
  // Check executive judgment presence
  if (!eljl.executive_judgment?.confidence_statement) {
    failures.push("ELJL MISSING: Executive confidence statement is required");
  }
  
  // Check commercial guidance presence
  if (!eljl.commercial_guidance?.cost_range_estimate) {
    failures.push("ELJL MISSING: Cost range estimate is required");
  }
  
  return failures;
}

// ============ DENSE CARGO ADVISORY CHECK ============

function checkDenseCargoAdvisory(report: LBIAReport): string[] {
  const failures: string[] = [];
  
  // If dense cargo, advisory should be present with proper fields
  if (report.dense_cargo_advisory?.is_dense) {
    if (!report.dense_cargo_advisory.advisory_message) {
      failures.push("DENSE CARGO ERROR: Dense cargo detected but advisory message is missing");
    }
    if (report.dense_cargo_advisory.density_kg_per_cbm <= 0) {
      failures.push("DENSE CARGO ERROR: Dense cargo detected but density is not calculated");
    }
    // Check for required terms in advisory
    const advisory = report.dense_cargo_advisory.advisory_message?.toLowerCase() || "";
    if (!advisory.includes("w/m") && !advisory.includes("chargeable")) {
      failures.push("DENSE CARGO ERROR: Advisory should mention W/M or chargeable weight");
    }
  }
  
  return failures;
}

// ============ HOLD GATING CHECK ============

function checkHoldGating(report: LBIAReport): string[] {
  const failures: string[] = [];
  
  // If strategy is HOLD_FOR_VALIDATION, check gating rules
  if (report.selected_strategy.strategy === "HOLD_FOR_VALIDATION") {
    // Should have risk_score = 0
    if (report.risk_score !== 0) {
      failures.push("HOLD GATING ERROR: Risk score should be 0 for HOLD reports");
    }
    // Should have no discarded alternatives
    if (report.discarded_alternatives.length > 0) {
      failures.push("HOLD GATING ERROR: Discarded alternatives should be empty for HOLD reports");
    }
    // Should have no engineering considerations
    if (report.engineering_considerations !== null) {
      failures.push("HOLD GATING ERROR: Engineering considerations should be null for HOLD reports");
    }
    // Should have no ELJL
    if (report.eljl !== null) {
      failures.push("HOLD GATING ERROR: ELJL should be null for HOLD reports");
    }
    // Should have no dense cargo advisory
    if (report.dense_cargo_advisory !== null) {
      failures.push("HOLD GATING ERROR: Dense cargo advisory should be null for HOLD reports");
    }
  }
  
  return failures;
}

// ============ RUN SINGLE TEST ============

function runSingleTest(testCase: TestCase): TestResult {
  const failures: string[] = [];
  
  // Run the analysis
  const engineOutput = runDecisionEngine(testCase.intake);
  const report = runLBIAAnalysis(engineOutput, testCase.intake);
  
  // Check strategy
  if (report.selected_strategy.strategy !== testCase.expectedStrategy) {
    failures.push(`STRATEGY MISMATCH: Expected ${testCase.expectedStrategy}, got ${report.selected_strategy.strategy}`);
  }
  
  // Check cargo scale
  if (report.analysis_context.cargo_scale !== testCase.expectedCargoScale) {
    failures.push(`CARGO SCALE MISMATCH: Expected ${testCase.expectedCargoScale}, got ${report.analysis_context.cargo_scale}`);
  }
  
  // Check forbidden terms
  failures.push(...checkForbiddenTerms(report, testCase.mustNotContain));
  
  // Check must contain
  failures.push(...checkMustContain(report, testCase.mustContain));
  
  // Check strategy-language coupling
  failures.push(...checkStrategyCoupling(report));
  
  // Check ELJL compliance (v3)
  failures.push(...checkELJLCompliance(report));
  
  // Check Decision Authority Mode compliance
  failures.push(...checkDecisionAuthorityCompliance(report));
  
  // Check Dense Cargo Advisory compliance
  failures.push(...checkDenseCargoAdvisory(report));
  
  // Check HOLD gating compliance
  failures.push(...checkHoldGating(report));
  
  // Check vocabulary compliance from report
  if (report.vocabulary_compliance.violations.length > 0) {
    for (const v of report.vocabulary_compliance.violations) {
      failures.push(`VOCABULARY VIOLATION: ${v.term} - ${v.reason}`);
    }
  }
  
  return {
    id: testCase.id,
    name: testCase.name,
    passed: failures.length === 0,
    failures,
    strategy_actual: report.selected_strategy.strategy,
    cargo_scale_actual: report.analysis_context.cargo_scale
  };
}

// ============ RUN ALL TESTS ============

// ============ HTML SECTION GATING TESTS ============

type HTMLGatingTestCase = {
  id: string;
  name: string;
  intake: any;
  expectedCargoScale: CargoScale;
  forbiddenInHTML: string[];
  allowedInHTML?: string[];
};

const HTML_GATING_TESTS: HTMLGatingTestCase[] = [
  {
    id: "HTML01",
    name: "STANDARD_LCL HTML - No Scenario A/B/C or Action Plan",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 8, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 250, unit_weight_uom: "kg"
    },
    expectedCargoScale: "STANDARD_LCL",
    forbiddenInHTML: ["Scenario A", "Scenario B", "Scenario C", "Action Plan", "/100</b>"],
    allowedInHTML: ["Execution Risk", "Low"]
  },
  {
    id: "HTML02",
    name: "SMALL_CONSOLIDATED HTML - No complex sections",
    intake: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 2, unit_length: 50, unit_width: 40, unit_height: 30, unit_dim_uom: "cm",
      unit_weight: 25, unit_weight_uom: "kg"
    },
    expectedCargoScale: "SMALL_CONSOLIDATED",
    forbiddenInHTML: ["Scenario A", "Scenario B", "Scenario C", "Action Plan", "/100</b>"],
    allowedInHTML: ["Execution Risk", "Low"]
  }
];

function runHTMLGatingTest(testCase: HTMLGatingTestCase): TestResult {
  const engineOutput = runDecisionEngine(testCase.intake);
  const lbia = runLBIAAnalysis(engineOutput, testCase.intake);
  const html = renderBriefHTML(testCase.intake, { ...engineOutput, lbia_report: lbia });
  
  const failures: string[] = [];
  
  // Check cargo scale
  const actualScale = lbia.analysis_context.cargo_scale;
  if (actualScale !== testCase.expectedCargoScale) {
    failures.push(`Expected cargo scale ${testCase.expectedCargoScale}, got ${actualScale}`);
  }
  
  // Check forbidden terms in HTML
  for (const forbidden of testCase.forbiddenInHTML) {
    if (html.includes(forbidden)) {
      failures.push(`HTML GATING FAILURE: "${forbidden}" should NOT appear in HTML for ${actualScale}`);
    }
  }
  
  // Check allowed terms in HTML
  if (testCase.allowedInHTML) {
    for (const allowed of testCase.allowedInHTML) {
      if (!html.includes(allowed)) {
        failures.push(`HTML GATING FAILURE: "${allowed}" SHOULD appear in HTML for ${actualScale}`);
      }
    }
  }
  
  return {
    id: testCase.id,
    name: testCase.name,
    passed: failures.length === 0,
    failures,
    strategy_actual: lbia.selected_strategy.strategy,
    cargo_scale_actual: actualScale
  };
}

export function runQATests(): QAResult {
  const results: TestResult[] = [];
  
  // Run regular tests
  for (const testCase of TEST_CASES) {
    results.push(runSingleTest(testCase));
  }
  
  // Run HTML gating tests
  for (const htmlTest of HTML_GATING_TESTS) {
    results.push(runHTMLGatingTest(htmlTest));
  }
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  return {
    timestamp: new Date().toISOString(),
    total_tests: results.length,
    passed,
    failed,
    pass_rate: `${((passed / results.length) * 100).toFixed(1)}%`,
    all_passed: failed === 0,
    results
  };
}

// ============ SAMPLE OUTPUT GENERATORS ============

export function generateSampleOutput(type: "small_lcl" | "standard_fcl" | "project_cargo"): LBIAReport {
  const samples: Record<typeof type, any> = {
    small_lcl: {
      pol: "Shanghai", pod: "Los Angeles", mode: "SEA", shipment_type: "LCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 2, unit_length: 50, unit_width: 40, unit_height: 30, unit_dim_uom: "cm",
      unit_weight: 25, unit_weight_uom: "kg"
    },
    standard_fcl: {
      pol: "Ningbo", pod: "Rotterdam", mode: "SEA", shipment_type: "FCL",
      incoterm: "FOB", priority: "balanced", client_type: "importer_exporter",
      units_count: 25, unit_length: 100, unit_width: 100, unit_height: 100, unit_dim_uom: "cm",
      unit_weight: 400, unit_weight_uom: "kg"
    },
    project_cargo: {
      pol: "Busan", pod: "Santos", mode: "SEA", shipment_type: "PROJECT",
      incoterm: "DAP", priority: "speed", client_type: "project_cargo",
      units_count: 1, unit_length: 700, unit_width: 350, unit_height: 300, unit_dim_uom: "cm",
      unit_weight: 25000, unit_weight_uom: "kg", max_piece_weight_kg: 25000
    }
  };
  
  const intake = samples[type];
  const engineOutput = runDecisionEngine(intake);
  return runLBIAAnalysis(engineOutput, intake);
}
