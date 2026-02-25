/**
 * MERU LBIA Industry Vocabulary Canon
 * 
 * Controlled vocabulary layer for Senior Logistics Analyst-grade output.
 * All narrative generators MUST use this vocabulary enforcement.
 */

import type { LogisticsStrategy, CargoScale } from './lbiaAgent';

// ============ A) ALLOWED VOCABULARY BY DOMAIN ============

export const VOCABULARY_DOMAINS = {
  FREIGHT_OCEAN: [
    "consolidation", "deconsolidation", "CFS", "CY/CY", "CY/CFS",
    "sailing frequency", "cut-off", "cargo cut-off", "SI cut-off",
    "transit time", "transit time variability", "space allocation",
    "rate validity", "BAF", "THC", "CAF", "drayage", "port congestion",
    "equipment availability", "carrier allocation", "spot rate", "contract rate"
  ],
  
  CONTAINERIZATION: [
    "container utilization", "payload limitation", "axle weight",
    "road legal limits", "stowage constraints", "slot availability", "load factor"
  ],
  
  LCL_SPECIFIC: [
    "chargeable weight", "W/M", "density profile", "handling intensity",
    "consolidation window", "co-loader", "co-loader dependency"
  ],
  
  PROJECT_HEAVY_OOG: [
    "out of gauge", "OOG", "heavy lift", "flat rack", "open top",
    "breakbulk", "charter", "partial charter", "full charter",
    "lashing", "securing plan", "method statement", "surveyor",
    "lifting points", "crane outreach", "SWL", "port handling capability",
    "engineering review", "specialized handling"
  ],
  
  COMMERCIAL_RISK: [
    "cost exposure", "margin erosion", "cost predictability",
    "rate volatility", "service reliability", "operational dependency",
    "single-point-of-failure"
  ]
} as const;

// ============ FORBIDDEN TERMS BY CARGO SCALE ============

export const FORBIDDEN_TERMS: Record<CargoScale, string[]> = {
  SMALL_CONSOLIDATED: [
    "enterprise coordination", "enterprise-scale", "backup carriers",
    "charter", "partial charter", "full charter", "rollover risk",
    "scenario C", "scenario B", "multiple scenarios", "multi-container",
    "contract rates", "escalation playbook", "milestone tracking"
  ],
  STANDARD_LCL: [
    "enterprise coordination", "enterprise-scale", "backup carriers",
    "charter", "partial charter", "full charter", "rollover risk",
    "scenario C", "container utilization", "multi-container"
  ],
  STANDARD_FCL: [
    "enterprise coordination", "enterprise-scale", "charter", 
    "partial charter", "full charter", "heavy lift", "breakbulk",
    "crane outreach", "SWL", "method statement"
  ],
  ENTERPRISE_CONTAINERIZED: [
    "charter", "partial charter", "full charter", "breakbulk",
    "heavy lift", "crane outreach", "SWL", "method statement"
  ],
  PROJECT_ENGINEERING: [
    "container utilization", "load factor", "consolidation window"
  ]
};

// ============ STRATEGY-SPECIFIC VOCABULARY GATES ============

export const STRATEGY_VOCABULARY: Record<LogisticsStrategy, {
  allowed_domains: (keyof typeof VOCABULARY_DOMAINS)[];
  forbidden_concepts: string[];
}> = {
  LCL: {
    allowed_domains: ["FREIGHT_OCEAN", "LCL_SPECIFIC", "COMMERCIAL_RISK"],
    forbidden_concepts: [
      "container utilization", "container count", "20GP", "40GP", "45HC",
      "charter", "breakbulk", "heavy lift", "enterprise", "multi-container"
    ]
  },
  FCL: {
    allowed_domains: ["FREIGHT_OCEAN", "CONTAINERIZATION", "COMMERCIAL_RISK"],
    forbidden_concepts: [
      "consolidation window", "co-loader", "W/M", "chargeable weight",
      "charter", "breakbulk", "heavy lift", "enterprise coordination"
    ]
  },
  ENTERPRISE_FCL: {
    allowed_domains: ["FREIGHT_OCEAN", "CONTAINERIZATION", "COMMERCIAL_RISK"],
    forbidden_concepts: [
      "consolidation window", "co-loader", "W/M", "chargeable weight",
      "charter", "breakbulk", "heavy lift", "crane outreach"
    ]
  },
  BREAKBULK_HEAVY_LIFT: {
    allowed_domains: ["FREIGHT_OCEAN", "PROJECT_HEAVY_OOG", "COMMERCIAL_RISK"],
    forbidden_concepts: [
      "container utilization", "consolidation window", "W/M", "load factor"
    ]
  },
  CHARTER: {
    allowed_domains: ["FREIGHT_OCEAN", "PROJECT_HEAVY_OOG", "COMMERCIAL_RISK"],
    forbidden_concepts: [
      "container utilization", "consolidation window", "W/M", "load factor"
    ]
  },
  HOLD_FOR_VALIDATION: {
    allowed_domains: [],
    forbidden_concepts: []
  }
};

// ============ VOCABULARY VALIDATION FUNCTION ============

export type VocabularyViolation = {
  term: string;
  context: string;
  reason: string;
};

// Off-domain terms that should not appear when NOT in that domain
const OFF_DOMAIN_TERMS: Record<keyof typeof VOCABULARY_DOMAINS, string[]> = {
  FREIGHT_OCEAN: [], // Always allowed
  CONTAINERIZATION: ["container utilization", "load factor", "slot availability", "stowage constraints"],
  LCL_SPECIFIC: ["W/M", "chargeable weight", "co-loader", "consolidation window"],
  PROJECT_HEAVY_OOG: ["crane outreach", "SWL", "method statement", "lashing plan", "surveyor", "lifting points"],
  COMMERCIAL_RISK: [] // Always allowed
};

export function validateVocabulary(
  text: string,
  strategy: LogisticsStrategy,
  cargoScale: CargoScale
): VocabularyViolation[] {
  const violations: VocabularyViolation[] = [];
  const lowerText = text.toLowerCase();
  
  // Check forbidden terms for cargo scale
  const scaleForbidden = FORBIDDEN_TERMS[cargoScale] || [];
  for (const term of scaleForbidden) {
    if (lowerText.includes(term.toLowerCase())) {
      violations.push({
        term,
        context: `cargo scale ${cargoScale}`,
        reason: `Term "${term}" is forbidden for ${cargoScale} cargo`
      });
    }
  }
  
  // Check forbidden concepts for strategy
  const strategyConfig = STRATEGY_VOCABULARY[strategy];
  if (strategyConfig) {
    for (const concept of strategyConfig.forbidden_concepts) {
      if (lowerText.includes(concept.toLowerCase())) {
        violations.push({
          term: concept,
          context: `strategy ${strategy}`,
          reason: `Concept "${concept}" is forbidden for ${strategy} strategy`
        });
      }
    }
    
    // Check off-domain terms (terms from domains NOT allowed for this strategy)
    const allowedDomains = new Set(strategyConfig.allowed_domains);
    for (const [domain, terms] of Object.entries(OFF_DOMAIN_TERMS)) {
      if (!allowedDomains.has(domain as keyof typeof VOCABULARY_DOMAINS)) {
        for (const term of terms) {
          if (lowerText.includes(term.toLowerCase())) {
            violations.push({
              term,
              context: `domain ${domain}`,
              reason: `Term "${term}" from ${domain} domain not allowed for ${strategy} strategy`
            });
          }
        }
      }
    }
  }
  
  return violations;
}

// ============ PROFESSIONAL PHRASE TEMPLATES ============
// Decision Authority Mode: Use decisive language, not advisory language

export const PROFESSIONAL_PHRASES = {
  LCL: {
    opening: [
      "This shipment requires consolidation via LCL.",
      "The correct execution for this cargo is LCL consolidation.",
      "From an operational standpoint, this cargo must be executed as LCL."
    ],
    recommendation: [
      "Any containerized or charter alternative is commercially inefficient and unjustified for this cargo scale.",
      "LCL execution provides the only cost-rational path for this volume.",
      "Standard consolidation with established CFS networks is the correct approach."
    ],
    cost_focus: [
      "Chargeable weight (W/M) determines final cost; current density profile is favorable.",
      "Consolidation window aligns with standard weekly sailings.",
      "No handling intensity concerns; standard CFS operations apply."
    ]
  },
  
  FCL: {
    opening: [
      "This shipment requires dedicated container allocation.",
      "The correct execution is containerized transport via FCL.",
      "From an operational standpoint, dedicated equipment is the appropriate path."
    ],
    recommendation: [
      "LCL consolidation is not cost-rational at this volume; container dedication is the correct choice.",
      "Full container loading is mandatory for this cargo profile.",
      "Containerized routing provides the required handling control and transit reliability."
    ],
    container_focus: [
      "Container utilization is within acceptable parameters for cost efficiency.",
      "Rate validity window must be confirmed with carrier.",
      "Equipment availability at origin port is standard."
    ]
  },
  
  ENTERPRISE: {
    opening: [
      "This volume requires enterprise-scale coordination.",
      "The correct execution is multi-container allocation with contract rates.",
      "From an operational standpoint, carrier commitment and space guarantee are mandatory."
    ],
    recommendation: [
      "Contract rates and dedicated booking coordination are mandatory at this scale.",
      "Multi-carrier strategy with volume commitment is the correct approach.",
      "Enterprise-level throughput demands rate stability and guaranteed allocation."
    ]
  },
  
  PROJECT: {
    opening: [
      "This cargo requires specialized handling and engineering review.",
      "The correct execution is project cargo approach with dedicated equipment.",
      "From an operational standpoint, standard containerization is not viable."
    ],
    recommendation: [
      "Engineering review and method statement preparation are mandatory before booking.",
      "Port handling capability and crane outreach verification must occur at both ends.",
      "Charter or breakbulk execution is the only viable path for this cargo profile."
    ]
  }
};

// ============ DATA QUALITY THRESHOLDS ============

export const DATA_QUALITY_THRESHOLDS = {
  DENSE_CARGO_ADVISORY_THRESHOLD: 500,  // kg/CBM - triggers Dense Cargo Advisory (NOT a HOLD)
  CBM_DIMENSION_MISMATCH_TOLERANCE: 0.15,
  MIN_WEIGHT_PER_UNIT_KG: 0.01,
  MAX_SINGLE_PIECE_WEIGHT_KG: 500000
};

// HOLD criteria - only for truly impossible/invalid data
export const HOLD_VALIDATION_CRITERIA = {
  MIN_DIMENSION_CM: 0.1,    // Any dimension must be > 0.1 cm
  MIN_WEIGHT_KG: 0.001,     // Weight must be > 0
  MIN_UNITS_COUNT: 1        // At least 1 unit required
};

export type DataQualityIssue = {
  field: string;
  value: string;
  issue: string;
  severity: "ERROR" | "WARNING";
};

// Validate data for HOLD_FOR_VALIDATION - only truly impossible/invalid inputs
export function validateDataQuality(
  totalCBM: number,
  totalWeightKg: number,
  calculatedCBM: number,
  unitCount: number,
  maxPieceWeightKg: number,
  isHeavyCargo: boolean = false,
  dimensions?: { length: number; width: number; height: number }
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  
  // HOLD TRIGGER 1: Missing or zero dimensions when units exist
  if (dimensions && unitCount > 0) {
    if (dimensions.length <= 0 || dimensions.width <= 0 || dimensions.height <= 0) {
      issues.push({
        field: "dimensions",
        value: `${dimensions.length} x ${dimensions.width} x ${dimensions.height}`,
        issue: "Invalid dimensions: all dimensions must be greater than zero.",
        severity: "ERROR"
      });
    }
  }
  
  // HOLD TRIGGER 2: Zero or negative weight
  if (totalWeightKg <= 0) {
    issues.push({
      field: "weight",
      value: `${totalWeightKg} kg`,
      issue: "Invalid weight: total weight must be greater than zero.",
      severity: "ERROR"
    });
  }
  
  // HOLD TRIGGER 3: Zero or negative unit count
  if (unitCount <= 0) {
    issues.push({
      field: "units_count",
      value: `${unitCount}`,
      issue: "Invalid unit count: at least one unit is required.",
      severity: "ERROR"
    });
  }
  
  // HOLD TRIGGER 4: CBM mismatch (calculation error or data entry problem)
  if (calculatedCBM > 0 && totalCBM > 0) {
    const mismatch = Math.abs(calculatedCBM - totalCBM) / totalCBM;
    if (mismatch > DATA_QUALITY_THRESHOLDS.CBM_DIMENSION_MISMATCH_TOLERANCE) {
      issues.push({
        field: "cbm_dimensions",
        value: `calculated ${calculatedCBM.toFixed(2)} vs stated ${totalCBM.toFixed(2)} CBM`,
        issue: `CBM/dimensions mismatch exceeds ${(DATA_QUALITY_THRESHOLDS.CBM_DIMENSION_MISMATCH_TOLERANCE * 100).toFixed(0)}% tolerance.`,
        severity: "ERROR"
      });
    }
  }
  
  // WARNING only: Weight per unit implausibly low (not a HOLD trigger)
  if (unitCount > 0 && totalWeightKg > 0) {
    const weightPerUnit = totalWeightKg / unitCount;
    if (weightPerUnit < DATA_QUALITY_THRESHOLDS.MIN_WEIGHT_PER_UNIT_KG) {
      issues.push({
        field: "unit_weight",
        value: `${weightPerUnit.toFixed(4)} kg/unit`,
        issue: "Weight per unit is implausibly low. Verify unit count or total weight.",
        severity: "WARNING"
      });
    }
  }
  
  // WARNING only: Max piece weight exceeds practical limits
  if (maxPieceWeightKg > DATA_QUALITY_THRESHOLDS.MAX_SINGLE_PIECE_WEIGHT_KG) {
    issues.push({
      field: "max_piece_weight",
      value: `${(maxPieceWeightKg / 1000).toFixed(1)} tonnes`,
      issue: "Max piece weight exceeds practical handling limits. Verify input.",
      severity: "WARNING"
    });
  }
  
  // NOTE: Dense cargo (high kg/CBM ratio) is NOT a HOLD trigger - it's valid cargo
  // Dense cargo handling is done in lbiaAgent.ts with a Dense Cargo Advisory
  
  return issues;
}

// Check if cargo is dense (for advisory purposes, NOT for HOLD)
export function isDenseCargo(totalCBM: number, totalWeightKg: number): boolean {
  if (totalCBM <= 0) return false;
  const density = totalWeightKg / totalCBM;
  return density > DATA_QUALITY_THRESHOLDS.DENSE_CARGO_ADVISORY_THRESHOLD;
}

// Get dense cargo advisory message
export function getDenseCargoAdvisory(densityKgPerCBM: number): string {
  return `Dense Cargo Advisory (${densityKgPerCBM.toFixed(0)} kg/CBM): Chargeable weight applies at W/M basis. CFS handling constraints may apply for pieces exceeding 1500kg. Verify per-piece weight and palletization requirements. Axle weight limits may affect inland transport planning.`;
}

// ============ HOLD_FOR_VALIDATION MESSAGING ============

export const HOLD_FOR_VALIDATION_MESSAGES = {
  density_error: "Input data requires clarification. The stated weight-to-volume ratio exceeds industry norms. Please verify cargo weight and dimensions before proceeding with routing analysis.",
  dimension_mismatch: "Dimension data is inconsistent. Calculated volume does not align with stated CBM. Please confirm accurate measurements before strategy recommendation.",
  weight_implausible: "Weight data appears incomplete or inaccurate. Please verify unit weights before proceeding.",
  general: "Input data requires validation before logistics analysis can proceed. Please review and confirm the cargo specifications."
};

// ============ ELJL v3 BANNED PHRASES ============
// Generic AI phrasing and corporate buzzwords that must NEVER appear in reports

export const ELJL_BANNED_PHRASES = [
  "optimize holistically",
  "leverage synergies",
  "AI-driven insight",
  "strategic alignment",
  "holistic approach",
  "synergistic benefits",
  "paradigm shift",
  "best-in-class",
  "cutting-edge",
  "state-of-the-art",
  "seamlessly integrate",
  "drive value",
  "unlock potential",
  "actionable insights",
  "transformative solution",
  "game-changer",
  "disruptive innovation",
  "value proposition",
  "low-hanging fruit",
  "move the needle",
  "circle back",
  "deep dive",
  "synergy",
  "ecosystem"
];

// ============ DECISION AUTHORITY MODE BANNED PHRASES ============
// System language and hedging phrases per Decision Authority specification
// These phrases indicate advisor/explainer mode, NOT decision authority

export const SYSTEM_LANGUAGE_BANNED = [
  "given the cargo scale",
  "based on the analysis",
  "the system determined",
  "it is recommended",
  "based on our analysis",
  "the analysis suggests",
  "we recommend",
  "it would be advisable",
  "you might want to",
  "you should consider",
  "one option would be",
  "alternatively, you could"
];

// Hedging words that indicate uncertainty - forbidden in Decision Authority Mode
export const HEDGING_WORDS_BANNED = [
  "could",
  "may",
  "might",
  "consider",
  "perhaps",
  "possibly",
  "potentially",
  "arguably"
];

// Approved decision authority phrases
export const DECISION_AUTHORITY_PHRASES = [
  "the correct execution is",
  "this shipment requires",
  "from an operational standpoint",
  "this cargo must be executed as",
  "the only viable path is",
  "i would approve",
  "i would not accept",
  "any alternative would be",
  "commercially inefficient",
  "operationally unjustified"
];

// ============ ELJL v3 APPROVED VOCABULARY ============
// Real logistics vocabulary that reads like a senior analyst

export const ELJL_APPROVED_VOCABULARY = [
  "consolidation",
  "sailing frequency",
  "rate validity",
  "port pair",
  "handling charges",
  "dimensional efficiency",
  "space utilization",
  "carrier allocation",
  "engineering feasibility",
  "stowage plan",
  "lifting capacity",
  "berth availability",
  "charter party",
  "demurrage",
  "laytime",
  "THC",
  "CFS",
  "container yard",
  "free time",
  "detention",
  "per diem",
  "cargo cut-off",
  "port congestion",
  "slot availability",
  "transit time",
  "load factor"
];

// ============ ELJL SECTION VALIDATION ============
// Sections that must NOT appear for specific cargo scales

export const FORBIDDEN_SECTIONS_BY_SCALE: Record<CargoScale, string[]> = {
  SMALL_CONSOLIDATED: [
    "container_utilization",
    "carrier_allocation",
    "volume_leverage",
    "contract_vs_spot",
    "engineering_considerations",
    "port_infrastructure",
    "lifting_requirements",
    "stowage_plan",
    "charter_rationale",
    "risk_mitigation",
    "rollover_risk",
    "backup_carriers",
    "marine_survey"
  ],
  STANDARD_LCL: [
    "container_utilization",
    "carrier_allocation",
    "volume_leverage",
    "contract_vs_spot",
    "engineering_considerations",
    "port_infrastructure",
    "lifting_requirements",
    "stowage_plan",
    "charter_rationale",
    "risk_mitigation",
    "rollover_risk",
    "backup_carriers",
    "marine_survey"
  ],
  STANDARD_FCL: [
    "volume_leverage",
    "contract_vs_spot",
    "engineering_considerations",
    "port_infrastructure",
    "lifting_requirements",
    "stowage_plan",
    "charter_rationale",
    "risk_mitigation",
    "marine_survey"
  ],
  ENTERPRISE_CONTAINERIZED: [
    "engineering_considerations",
    "port_infrastructure",
    "lifting_requirements",
    "stowage_plan",
    "charter_rationale",
    "marine_survey"
  ],
  PROJECT_ENGINEERING: []
};

export function validateELJLPhrases(text: string): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const phrase of ELJL_BANNED_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      violations.push(`Banned phrase detected: "${phrase}"`);
    }
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

// ============ DECISION AUTHORITY MODE VALIDATION ============

export type DecisionAuthorityViolation = {
  type: "system_language" | "hedging_word" | "banned_phrase";
  term: string;
  context?: string;
};

export function validateDecisionAuthorityMode(text: string): {
  valid: boolean;
  violations: DecisionAuthorityViolation[];
  hedgingWordCount: number;
} {
  const violations: DecisionAuthorityViolation[] = [];
  const lowerText = text.toLowerCase();
  let hedgingWordCount = 0;
  
  // Check system language phrases
  for (const phrase of SYSTEM_LANGUAGE_BANNED) {
    if (lowerText.includes(phrase.toLowerCase())) {
      violations.push({
        type: "system_language",
        term: phrase,
        context: "System/advisor language detected - use decision authority voice"
      });
    }
  }
  
  // Check hedging words (with word boundary awareness)
  for (const word of HEDGING_WORDS_BANNED) {
    // Use word boundary check to avoid false positives (e.g., "may" in "mayor")
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = text.match(regex);
    if (matches) {
      hedgingWordCount += matches.length;
      violations.push({
        type: "hedging_word",
        term: word,
        context: `Found ${matches.length} instance(s) - Decision Authority Mode requires certainty`
      });
    }
  }
  
  // Check ELJL banned phrases
  for (const phrase of ELJL_BANNED_PHRASES) {
    if (lowerText.includes(phrase.toLowerCase())) {
      violations.push({
        type: "banned_phrase",
        term: phrase,
        context: "Corporate buzzword/AI phrasing detected"
      });
    }
  }
  
  return {
    valid: violations.length === 0,
    violations,
    hedgingWordCount
  };
}

// Check if text contains at least one decision authority phrase
export function hasDecisionAuthorityVoice(text: string): boolean {
  const lowerText = text.toLowerCase();
  return DECISION_AUTHORITY_PHRASES.some(phrase => lowerText.includes(phrase));
}

export function validateSectionsForScale(
  cargoScale: CargoScale,
  presentSections: string[]
): { valid: boolean; violations: string[] } {
  const forbidden = FORBIDDEN_SECTIONS_BY_SCALE[cargoScale] || [];
  const violations: string[] = [];
  
  for (const section of presentSections) {
    if (forbidden.includes(section)) {
      violations.push(`Section "${section}" is not allowed for ${cargoScale} cargo scale`);
    }
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}
