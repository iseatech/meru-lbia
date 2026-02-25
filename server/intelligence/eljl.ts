import type { LogisticsStrategy, CargoScale } from "./lbiaAgent";
import type { ClientType } from "./decisionEngine";

export type CostDriver = {
  driver: string;
  impact: "high" | "medium" | "low";
  explanation: string;
};

export type CommercialGuidance = {
  cost_range_estimate: string;
  cost_drivers: CostDriver[];
  market_context: string;
  negotiation_advice: string | null;
  avoid_over_engineering: string | null;
};

export type ExecutiveJudgment = {
  confidence_statement: string;
  executive_rationale: string;
  commercial_summary: string;
};

export type ELJLOutput = {
  executive_context: string;
  executive_judgment: ExecutiveJudgment;
  commercial_guidance: CommercialGuidance;
  section_depth: "minimal" | "standard" | "detailed" | "comprehensive";
  allowed_sections: string[];
  forbidden_sections: string[];
};

const TRANSPACIFIC_MARKET_CONTEXT = {
  LCL: "Current Transpacific LCL rates remain competitive with consistent sailing frequency from major Asian origins.",
  FCL: "Transpacific container rates have stabilized following recent capacity adjustments by major carriers.",
  ENTERPRISE_FCL: "Volume commitments on Transpacific lanes enable significant rate leverage with tier-1 carriers.",
  BREAKBULK_HEAVY_LIFT: "Project cargo rates on Transpacific routes vary significantly based on port infrastructure and lifting requirements.",
  CHARTER: "Charter market rates reflect current vessel availability and port pair complexity.",
  HOLD_FOR_VALIDATION: "Market assessment pending data validation."
};

const COST_RANGE_ESTIMATES: Record<LogisticsStrategy, (cbm: number, weightKg: number) => string> = {
  LCL: (cbm, weightKg) => {
    if (cbm <= 3) return "Consolidation typically costs 35-50% less than dedicated container for this cargo size";
    return "LCL rates generally fall 20-35% below FCL equivalent for volumes under 12 CBM";
  },
  FCL: (cbm, weightKg) => {
    if (cbm <= 25) return "Single 20ft container pricing applies; expect standard market rates for this lane";
    if (cbm <= 55) return "40ft container required; rates approximately 40-60% higher than 20ft equivalent";
    return "40ft High Cube container pricing; marginal premium over standard 40ft";
  },
  ENTERPRISE_FCL: (cbm, weightKg) => {
    const containers = Math.ceil(cbm / 67);
    if (containers <= 3) return `${containers}-container volume enables 8-15% rate reduction through volume commitment`;
    if (containers <= 10) return `Multi-container shipment qualifies for 15-25% volume discount with contract carriers`;
    return "Volume qualifies for annual contract rates; expect 20-30% below spot market";
  },
  BREAKBULK_HEAVY_LIFT: (cbm, weightKg) => {
    return "Project cargo rates determined by piece weight, dimensions, and port handling requirements; expect 2-4x container equivalent";
  },
  CHARTER: (cbm, weightKg) => {
    return "Charter rates negotiated individually based on vessel type, voyage duration, and port pair; budget 3-5x breakbulk rates for full charter control";
  },
  HOLD_FOR_VALIDATION: () => "Cost assessment pending data validation"
};

const COST_DRIVERS_BY_STRATEGY: Record<LogisticsStrategy, (cbm: number, weightKg: number, maxPieceWeightKg: number) => CostDriver[]> = {
  LCL: (cbm, weightKg) => [
    { driver: "Consolidation charges", impact: "medium", explanation: "CFS handling and co-loading fees at origin and destination" },
    { driver: "Freight rate per CBM/ton", impact: "high", explanation: "LCL priced on whichever is greater: volume or weight" },
    { driver: "Sailing frequency", impact: "low", explanation: "Weekly sailings on major lanes minimize waiting time" }
  ],
  FCL: (cbm, weightKg) => [
    { driver: "Container freight rate", impact: "high", explanation: "All-in rate per container for port-to-port movement" },
    { driver: "Terminal handling", impact: "medium", explanation: "THC at origin and destination ports" },
    { driver: "Equipment type", impact: "medium", explanation: "20ft vs 40ft vs 40HC selection affects rate" }
  ],
  ENTERPRISE_FCL: (cbm, weightKg) => [
    { driver: "Volume commitment", impact: "high", explanation: "Container count determines discount tier eligibility" },
    { driver: "Contract vs spot", impact: "high", explanation: "Annual contracts provide rate stability and guaranteed space" },
    { driver: "Carrier allocation", impact: "medium", explanation: "Multi-carrier strategy balances rate and reliability" },
    { driver: "Terminal handling", impact: "medium", explanation: "Volume qualifies for preferential THC rate negotiations" }
  ],
  BREAKBULK_HEAVY_LIFT: (cbm, weightKg, maxPieceWeightKg) => [
    { driver: "Lifting and rigging", impact: "high", explanation: "Crane capacity and rigging complexity drive handling costs" },
    { driver: "Port selection", impact: "high", explanation: "Not all ports can accommodate heavy lift; infrastructure determines viability" },
    { driver: "Stowage engineering", impact: "medium", explanation: "Securing and lashing requirements for dimensional cargo" },
    { driver: "Risk premium", impact: "medium", explanation: "Heavy cargo insurance and liability considerations" }
  ],
  CHARTER: (cbm, weightKg, maxPieceWeightKg) => [
    { driver: "Vessel hire", impact: "high", explanation: "Charter rate based on vessel type, size, and voyage duration" },
    { driver: "Port costs", impact: "high", explanation: "Berth charges, pilotage, and port fees at each call" },
    { driver: "Bunker fuel", impact: "medium", explanation: "Fuel costs for voyage; owner or charterer account depends on charter type" },
    { driver: "Cargo handling", impact: "high", explanation: "Specialized lifting equipment and stevedoring for project cargo" },
    { driver: "Marine survey", impact: "medium", explanation: "Pre-shipment survey and stowage plan engineering" }
  ],
  HOLD_FOR_VALIDATION: () => []
};

const NEGOTIATION_ADVICE: Record<LogisticsStrategy, string | null> = {
  LCL: null,
  FCL: "Request all-in rates including THC to simplify cost comparison across carriers",
  ENTERPRISE_FCL: "Leverage volume across multiple carriers; avoid single-carrier dependency while maintaining rate competitiveness",
  BREAKBULK_HEAVY_LIFT: "Obtain lump-sum quotes covering cargo handling, lifting, and lashing to avoid cost escalation",
  CHARTER: "Negotiate fixture terms carefully; clarify demurrage, laytime, and cargo handling responsibilities",
  HOLD_FOR_VALIDATION: null
};

const AVOID_OVER_ENGINEERING: Record<CargoScale, string | null> = {
  SMALL_CONSOLIDATED: "This cargo does not warrant special handling arrangements or dedicated equipment. Standard LCL service provides adequate protection and transit time.",
  STANDARD_LCL: "Consolidation service is appropriate. Dedicated container would increase cost without operational benefit.",
  STANDARD_FCL: null,
  ENTERPRISE_CONTAINERIZED: null,
  PROJECT_ENGINEERING: null
};

const SECTION_DEPTH_BY_SCALE: Record<CargoScale, "minimal" | "standard" | "detailed" | "comprehensive"> = {
  SMALL_CONSOLIDATED: "minimal",
  STANDARD_LCL: "minimal",
  STANDARD_FCL: "standard",
  ENTERPRISE_CONTAINERIZED: "detailed",
  PROJECT_ENGINEERING: "comprehensive"
};

const ALLOWED_SECTIONS_BY_SCALE: Record<CargoScale, string[]> = {
  SMALL_CONSOLIDATED: [
    "executive_context",
    "feasibility_determination",
    "selected_strategy",
    "executive_judgment",
    "commercial_guidance",
    "discarded_alternatives",
    "next_actions"
  ],
  STANDARD_LCL: [
    "executive_context",
    "feasibility_determination",
    "selected_strategy",
    "executive_judgment",
    "commercial_guidance",
    "discarded_alternatives",
    "next_actions"
  ],
  STANDARD_FCL: [
    "executive_context",
    "feasibility_determination",
    "selected_strategy",
    "executive_judgment",
    "commercial_guidance",
    "container_utilization",
    "carrier_selection",
    "discarded_alternatives",
    "next_actions"
  ],
  ENTERPRISE_CONTAINERIZED: [
    "executive_context",
    "feasibility_determination",
    "selected_strategy",
    "executive_judgment",
    "commercial_guidance",
    "container_utilization",
    "carrier_allocation",
    "volume_leverage",
    "contract_vs_spot",
    "discarded_alternatives",
    "next_actions"
  ],
  PROJECT_ENGINEERING: [
    "executive_context",
    "feasibility_determination",
    "selected_strategy",
    "executive_judgment",
    "commercial_guidance",
    "engineering_considerations",
    "port_infrastructure",
    "lifting_requirements",
    "stowage_plan",
    "charter_rationale",
    "risk_mitigation",
    "discarded_alternatives",
    "next_actions"
  ]
};

const FORBIDDEN_SECTIONS_BY_SCALE: Record<CargoScale, string[]> = {
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

const EXECUTIVE_CONFIDENCE_STATEMENTS: Record<LogisticsStrategy, string> = {
  LCL: "If I were managing this shipment, consolidation via LCL is the option I would approve without hesitation.",
  FCL: "If I were managing this shipment, dedicating a container is the clear choice for this cargo profile.",
  ENTERPRISE_FCL: "If I were managing this shipment, I would secure volume commitments with preferred carriers immediately.",
  BREAKBULK_HEAVY_LIFT: "If I were managing this shipment, I would engage project cargo specialists and begin port assessment without delay.",
  CHARTER: "If I were managing this shipment, I would initiate charter inquiries and marine survey coordination as priority actions.",
  HOLD_FOR_VALIDATION: "This shipment requires data validation before I would approve any logistics strategy."
};

function generateExecutiveRationale(
  strategy: LogisticsStrategy,
  cargoScale: CargoScale,
  cbm: number,
  weightKg: number,
  clientType: ClientType
): string {
  const scaleRationales: Record<CargoScale, Record<LogisticsStrategy, string>> = {
    SMALL_CONSOLIDATED: {
      LCL: `At ${cbm.toFixed(1)} CBM and ${(weightKg / 1000).toFixed(1)} tonnes, this cargo fits comfortably within standard consolidation parameters. Cost efficiency and sailing frequency favor LCL over any dedicated equipment.`,
      FCL: "N/A",
      ENTERPRISE_FCL: "N/A",
      BREAKBULK_HEAVY_LIFT: "N/A",
      CHARTER: "N/A",
      HOLD_FOR_VALIDATION: "Data quality concerns require validation before strategy confirmation."
    },
    STANDARD_LCL: {
      LCL: `Volume of ${cbm.toFixed(1)} CBM remains below container threshold. LCL provides cost-effective movement without the overhead of dedicated equipment.`,
      FCL: "N/A",
      ENTERPRISE_FCL: "N/A",
      BREAKBULK_HEAVY_LIFT: "N/A",
      CHARTER: "N/A",
      HOLD_FOR_VALIDATION: "Data quality concerns require validation before strategy confirmation."
    },
    STANDARD_FCL: {
      LCL: "N/A",
      FCL: `At ${cbm.toFixed(1)} CBM, dedicated container provides better value than LCL per-CBM rates. Container integrity also reduces handling touchpoints.`,
      ENTERPRISE_FCL: "N/A",
      BREAKBULK_HEAVY_LIFT: "N/A",
      CHARTER: "N/A",
      HOLD_FOR_VALIDATION: "Data quality concerns require validation before strategy confirmation."
    },
    ENTERPRISE_CONTAINERIZED: {
      LCL: "N/A",
      FCL: "N/A",
      ENTERPRISE_FCL: `Volume of ${cbm.toFixed(0)} CBM across multiple containers justifies enterprise coordination. Rate leverage and carrier allocation become critical success factors.`,
      BREAKBULK_HEAVY_LIFT: "N/A",
      CHARTER: "N/A",
      HOLD_FOR_VALIDATION: "Data quality concerns require validation before strategy confirmation."
    },
    PROJECT_ENGINEERING: {
      LCL: "N/A",
      FCL: "N/A",
      ENTERPRISE_FCL: "N/A",
      BREAKBULK_HEAVY_LIFT: `Cargo dimensions and weight exceed standard container limits. Project cargo approach with specialized handling is the only viable path.`,
      CHARTER: `Cargo profile demands full vessel control. Charter provides schedule certainty, specialized gear access, and end-to-end handling accountability.`,
      HOLD_FOR_VALIDATION: "Data quality concerns require validation before strategy confirmation."
    }
  };

  return scaleRationales[cargoScale][strategy] || "Strategy rationale based on cargo profile analysis.";
}

function generateCommercialSummary(
  strategy: LogisticsStrategy,
  cargoScale: CargoScale,
  cbm: number,
  clientType: ClientType
): string {
  if (cargoScale === "SMALL_CONSOLIDATED" || cargoScale === "STANDARD_LCL") {
    return "Focus on sailing frequency and transit time rather than rate optimization. The cost differential at this volume does not justify extensive carrier negotiation.";
  }
  if (cargoScale === "STANDARD_FCL") {
    return "Request competitive quotes from 2-3 carriers. Prioritize service reliability over marginal rate differences for single container movements.";
  }
  if (cargoScale === "ENTERPRISE_CONTAINERIZED") {
    return "Volume justifies contract negotiation. Balance rate optimization against service commitment and allocation guarantees.";
  }
  if (cargoScale === "PROJECT_ENGINEERING") {
    return "Engineering feasibility drives cost more than market rates. Invest in pre-shipment planning to avoid costly field modifications.";
  }
  return "Commercial approach pending strategy confirmation.";
}

export function generateELJL(
  strategy: LogisticsStrategy,
  cargoScale: CargoScale,
  cbm: number,
  weightKg: number,
  maxPieceWeightKg: number,
  clientType: ClientType,
  origin: string,
  destination: string,
  incoterm: string
): ELJLOutput {
  const marketContext = TRANSPACIFIC_MARKET_CONTEXT[strategy] || TRANSPACIFIC_MARKET_CONTEXT.FCL;
  const costRangeEstimate = COST_RANGE_ESTIMATES[strategy](cbm, weightKg);
  const costDrivers = COST_DRIVERS_BY_STRATEGY[strategy](cbm, weightKg, maxPieceWeightKg);
  const negotiationAdvice = NEGOTIATION_ADVICE[strategy];
  const avoidOverEngineering = AVOID_OVER_ENGINEERING[cargoScale];
  
  const executiveContext = generateExecutiveContext(
    strategy,
    cargoScale,
    cbm,
    weightKg,
    origin,
    destination,
    incoterm,
    clientType
  );
  
  const executiveJudgment: ExecutiveJudgment = {
    confidence_statement: EXECUTIVE_CONFIDENCE_STATEMENTS[strategy],
    executive_rationale: generateExecutiveRationale(strategy, cargoScale, cbm, weightKg, clientType),
    commercial_summary: generateCommercialSummary(strategy, cargoScale, cbm, clientType)
  };
  
  const commercialGuidance: CommercialGuidance = {
    cost_range_estimate: costRangeEstimate,
    cost_drivers: costDrivers,
    market_context: marketContext,
    negotiation_advice: negotiationAdvice,
    avoid_over_engineering: avoidOverEngineering
  };
  
  return {
    executive_context: executiveContext,
    executive_judgment: executiveJudgment,
    commercial_guidance: commercialGuidance,
    section_depth: SECTION_DEPTH_BY_SCALE[cargoScale],
    allowed_sections: ALLOWED_SECTIONS_BY_SCALE[cargoScale],
    forbidden_sections: FORBIDDEN_SECTIONS_BY_SCALE[cargoScale]
  };
}

function generateExecutiveContext(
  strategy: LogisticsStrategy,
  cargoScale: CargoScale,
  cbm: number,
  weightKg: number,
  origin: string,
  destination: string,
  incoterm: string,
  clientType: ClientType
): string {
  const tonnes = (weightKg / 1000).toFixed(1);
  const lane = `${origin} → ${destination}`;
  
  const scaleDescriptions: Record<CargoScale, string> = {
    SMALL_CONSOLIDATED: `Small cargo shipment (${cbm.toFixed(1)} CBM / ${tonnes}t) on ${lane} under ${incoterm} terms.`,
    STANDARD_LCL: `Standard consolidation cargo (${cbm.toFixed(1)} CBM / ${tonnes}t) on ${lane} under ${incoterm} terms.`,
    STANDARD_FCL: `Container-scale shipment (${cbm.toFixed(1)} CBM / ${tonnes}t) on ${lane} under ${incoterm} terms.`,
    ENTERPRISE_CONTAINERIZED: `Multi-container program (${cbm.toFixed(0)} CBM / ${tonnes}t) on ${lane} under ${incoterm} terms.`,
    PROJECT_ENGINEERING: `Project cargo requiring engineering assessment (${cbm.toFixed(1)} CBM / ${tonnes}t) on ${lane} under ${incoterm} terms.`
  };
  
  return scaleDescriptions[cargoScale];
}

export function validateReportSections(
  cargoScale: CargoScale,
  presentSections: string[]
): { valid: boolean; violations: string[] } {
  const forbidden = FORBIDDEN_SECTIONS_BY_SCALE[cargoScale];
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
  "transformative solution"
];

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
  "per diem"
];
