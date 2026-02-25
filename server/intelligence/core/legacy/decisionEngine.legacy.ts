import { getIncotermContext, type AnalysisScope } from "./config/incotermRules";
import { getLaneProfile, buildLaneProfileOutput, normalizePortCode, type LaneProfileOutput } from "./config/laneProfiles";

export type ClientType = "importer_exporter" | "freight_forwarder" | "project_cargo";

export type ClientContext = {
  client_type: ClientType;
  audience: string;
  decision_focus: string;
  primary_risks: string[];
  recommended_controls: string[];
};

// Decision goal types - what problem is the client solving?
export type DecisionGoal = "avoid_overpaying" | "avoid_delays" | "validate_strategy" | "reduce_risk" | "project_planning";

// Cargo nature types - physical characteristics declared by client
export type CargoNature = "general" | "dense" | "high_value" | "dangerous_goods" | "oversized" | "heavy";

export type MeruIntake = {
  origin_region: string;
  destination_region: string;
  mode: string;
  shipment_type: string;
  incoterm?: string;
  shipment_frequency?: string;
  avg_monthly_spend_range?: string;
  pain_point?: string;
  constraints?: string;
  notes?: string;
  priority?: string;
  units_count?: number;
  unit_weight?: number;
  unit_weight_uom?: string;
  unit_length?: number;
  unit_width?: number;
  unit_height?: number;
  unit_dim_uom?: string;
  reference_type?: string;
  reference_number?: string;

  pol?: string;
  pod?: string;

  single_forwarder?: boolean;
  single_port?: boolean;
  single_supplier?: boolean;
  service_type?: string;
  client_type?: ClientType;

  // Decision context fields
  decision_goal?: DecisionGoal;  // What problem is the client solving?
  cargo_nature?: CargoNature;    // Physical cargo characteristics declared by client

  // Cargo engineering fields
  dg_flag?: boolean;           // Dangerous goods indicator
  imo_class?: string;          // IMO class (e.g. "3", "8", "9")
  declared_value_usd?: number; // Declared cargo value
  cargo_class?: CargoClass;    // User-selected cargo class override
  max_piece_weight_kg?: number; // Maximum single piece weight
};

// Container capacities (planning - practical usable volume)
const CONTAINER_CAPACITY = {
  "20GP": { cbm: 33.2, maxPayloadKg: 21700, recommendCbm: 28 },
  "40GP": { cbm: 67.7, maxPayloadKg: 26500, recommendCbm: 58 },
  "45HC": { cbm: 76.4, maxPayloadKg: 26000, recommendCbm: 68 }
};

// Container INTERNAL dimensions (for OOG/engineering feasibility)
const CONTAINER_INTERNAL = {
  "20GP": { lengthM: 5.90, widthM: 2.35, heightM: 2.39, payloadKg: 21500 },
  "40GP": { lengthM: 12.03, widthM: 2.35, heightM: 2.39, payloadKg: 26500 },
  "40HC": { lengthM: 12.03, widthM: 2.35, heightM: 2.69, payloadKg: 26500 },
  "45HC": { lengthM: 13.55, widthM: 2.35, heightM: 2.69, payloadKg: 26000 }
};

// Heavy lift thresholds
const HEAVY_THRESHOLDS = {
  PIECE_WEIGHT_HEAVY_KG: 5000,     // Single piece > 5t is "heavy"
  PIECE_WEIGHT_SUPERHEAVY_KG: 20000, // Single piece > 20t needs specialized handling
  PIECE_WEIGHT_CHARTER_KG: 35000,  // > 35t typically needs breakbulk/charter
  HIGH_VALUE_USD: 100000           // Cargo value threshold for HIGH_VALUE class
};

// ============ CARGO CLASSIFICATION ============
export type CargoClass = "GENERAL" | "HEAVY" | "OOG" | "IMO" | "HIGH_VALUE";
export type TransportMethod = "LINER_CONTAINER" | "LINER_BREAKBULK" | "CHARTER_PART" | "CHARTER_FULL" | "AIR" | "LAND";

export type CargoClassification = {
  cargo_class: CargoClass;
  cargo_class_reason: string;
  is_user_selected: boolean;
};

export type EquipmentOption = {
  equipment_type: string;
  suitability: "RECOMMENDED" | "POSSIBLE" | "NOT_FEASIBLE";
  reason: string;
};

export type EquipmentDecision = {
  recommended_transport_method: TransportMethod;
  recommended_equipment: EquipmentOption[];
  feasibility_warnings: string[];
  engineering_assumptions: string[];
  charter_consideration: boolean;
  charter_rationale: string | null;
};

export type DocsChecklist = {
  required: string[];
  recommended: string[];
  compliance_notes: string[];
};

// ============ CLIENT CONTEXT BUILDER ============
function buildClientContext(clientType: ClientType, cargoClass: CargoClass, isOOG: boolean, isHeavy: boolean): ClientContext {
  switch (clientType) {
    case "freight_forwarder":
      return {
        client_type: "freight_forwarder",
        audience: "Freight Forwarder / NVOCC",
        decision_focus: "Margin protection, service design, and execution risk management. Focus on routing strategy, consolidation efficiency, carrier selection, and operational SLAs to deliver a defensible plan.",
        primary_risks: [
          "Carrier rate volatility and space allocation",
          "Consolidation timing and co-loader dependencies",
          "Documentation accuracy and customs delays",
          "Exception handling and claims exposure"
        ],
        recommended_controls: [
          "Establish carrier backup agreements",
          "Define milestone checkpoints and escalation triggers",
          "Pre-clear documentation with customs broker",
          "Maintain exception playbook for common failure modes"
        ]
      };
    case "project_cargo":
      return {
        client_type: "project_cargo",
        audience: "Project Cargo / EPC / Heavy Lift",
        decision_focus: "Engineering feasibility, lifting and handling requirements, port capability assessment, and charter vs liner evaluation. Focus on method statements, surveys, lashing plans, and contingency scenarios.",
        primary_risks: [
          isOOG ? "Out-of-gauge dimensions require specialized equipment" : "Dimensional constraints for standard equipment",
          isHeavy ? "Heavy lift requirements and crane capacity" : "Weight distribution and payload limits",
          "Port infrastructure and handling capability",
          "Stowage, lashing, and securing requirements"
        ],
        recommended_controls: [
          "Commission independent dimension and weight survey",
          "Obtain certified lashing and securing plan",
          "Confirm port crane capacity and berth availability",
          "Evaluate charter options for schedule certainty"
        ]
      };
    case "importer_exporter":
    default:
      return {
        client_type: "importer_exporter",
        audience: "Importer / Exporter",
        decision_focus: "Buyer exposure management, cost transparency, and service quality verification. Focus on understanding Incoterm responsibilities, hidden cost drivers, and how to demand fair-value service from logistics providers.",
        primary_risks: [
          "Overcharges and non-transparent pricing",
          "Documentation gaps creating customs delays",
          "Forwarder dependency and service quality variance",
          "Insurance coverage gaps and liability exposure"
        ],
        recommended_controls: [
          "Request itemized freight cost breakdown",
          "Verify insurance coverage matches cargo value",
          "Establish backup forwarder relationship",
          "Define performance benchmarks and review quarterly"
        ]
      };
  }
}

// ============ CLIENT-SPECIFIC NARRATIVE BUILDERS ============
function buildClientSpecificActions(clientType: ClientType, baseActions: string[], scope: string, incoterm: string, isOOG: boolean, isHeavy: boolean, hasCharter: boolean): string[] {
  switch (clientType) {
    case "freight_forwarder":
      return [
        "Set milestone checkpoints: booking confirmation, SI cut-off, vessel departure, transshipment, arrival notice.",
        "Pre-alert destination broker with HS codes and documentation package 5 days before ETA.",
        "Book primary carrier and confirm backup allocation with secondary carrier.",
        "Prepare Shipping Instructions (SI) and verify against LC/documentary requirements.",
        scope === "operational" ? `Negotiate rate validity period and space guarantee under ${incoterm} terms.` : "Confirm freight payment terms and obtain cost breakdown from shipper.",
        isOOG || isHeavy ? "Coordinate with carrier OOG desk for slot confirmation and stow plan." : "Confirm container release and empty pickup arrangements.",
        "Document exception handling procedures for rollover, delay, or damage scenarios."
      ];
    case "project_cargo":
      return [
        "Commission certified dimension and weight survey before cargo ready date.",
        "Obtain approved lashing and securing plan from marine surveyor.",
        "Confirm port of loading crane capacity and heavy-lift equipment availability.",
        "Request method statement from stevedore for loading/discharge operations.",
        isOOG ? "Verify vessel OOG capacity and obtain carrier slot confirmation." : "Confirm container suitability for cargo profile.",
        hasCharter ? "Evaluate partial charter vs full charter options; obtain indicative rates." : "Confirm liner booking acceptance for specialized cargo.",
        "Prepare contingency plan for weather delays and equipment unavailability.",
        "Arrange marine cargo insurance with agreed value clause."
      ];
    case "importer_exporter":
    default:
      return [
        `Request itemized freight cost breakdown from your forwarder within 7 days.`,
        "Confirm insurance coverage matches declared cargo value and transit risks.",
        "Ask forwarder for transit time commitment and delay escalation procedure.",
        scope === "operational" ? `Verify ${incoterm} responsibilities are clearly documented in shipping instructions.` : `Review ${incoterm} cost allocation and confirm seller's freight arrangement.`,
        "Identify one backup forwarder and obtain comparative rate quote.",
        "Define performance triggers (cost variance, delay threshold) for forwarder review.",
        "Schedule quarterly freight spend analysis and market rate benchmarking."
      ];
  }
}

function buildClientSpecificTakeaways(clientType: ClientType, baseTakeaways: string[], score: number, incoterm: string, containerRec: string, totalCBM: number, isOOG: boolean, isHeavy: boolean, cargoClass: CargoClass): string[] {
  const riskLevel = score >= 40 ? "elevated" : "moderate";
  
  switch (clientType) {
    case "freight_forwarder":
      return [
        `Operational execution under ${incoterm} requires milestone tracking and exception management.`,
        `Risk score ${score}/100 indicates ${riskLevel} exposure; build contingency capacity.`,
        `Container allocation: ${containerRec} for ${totalCBM.toFixed(2)} CBM total volume.`,
        isOOG || isHeavy ? `Specialized cargo requires carrier OOG desk coordination and early booking.` : "Standard cargo; focus on rate optimization and space guarantee.",
        "Margin protection depends on accurate cost forecasting and carrier commitment.",
        "Document all service exceptions to support claims and rate negotiations."
      ];
    case "project_cargo":
      return [
        `Cargo class: ${cargoClass}. Engineering review mandatory before booking.`,
        isOOG ? "Out-of-gauge dimensions require flat rack, open top, or breakbulk solution." : "Cargo fits standard equipment profile.",
        isHeavy ? "Heavy lift requirements: confirm crane capacity and rigging plan." : "Weight within standard handling limits.",
        `Risk score ${score}/100 reflects operational complexity and handling requirements.`,
        "Survey, method statement, and lashing plan are gate requirements before shipment.",
        "Charter evaluation recommended for schedule certainty and handling control."
      ];
    case "importer_exporter":
    default:
      return [
        `Under ${incoterm}, verify your cost exposure and forwarder responsibilities.`,
        `Risk score ${score}/100 indicates ${riskLevel} concentration risk; build backup options.`,
        `Planned allocation: ${containerRec} for ${totalCBM.toFixed(2)} CBM.`,
        "Request freight cost breakdown to identify hidden charges and validate reasonableness.",
        "Confirm insurance covers full cargo value and transit mode risks.",
        "Establish performance benchmarks now to support future forwarder negotiations."
      ];
  }
}

function classifyCargo(
  maxPieceLengthM: number,
  maxPieceWidthM: number,
  maxPieceHeightM: number,
  maxPieceWeightKg: number,
  dgFlag?: boolean,
  imoClass?: string,
  declaredValueUSD?: number,
  userSelectedClass?: CargoClass,
  cargoNature?: CargoNature
): CargoClassification {
  // If user explicitly selected cargo_class, use it
  if (userSelectedClass) {
    return {
      cargo_class: userSelectedClass,
      cargo_class_reason: `User-selected classification: ${userSelectedClass}`,
      is_user_selected: true
    };
  }

  // Dangerous goods - from either dg_flag OR cargo_nature selection
  if (dgFlag || (imoClass && imoClass.trim() !== "") || cargoNature === "dangerous_goods") {
    return {
      cargo_class: "IMO",
      cargo_class_reason: `Dangerous goods indicated${imoClass ? ` (IMO Class ${imoClass})` : ""}. Requires DG-approved carrier and specialized handling.`,
      is_user_selected: false
    };
  }

  // OOG - from dimensions OR cargo_nature selection
  const exceedsHeight = maxPieceHeightM > CONTAINER_INTERNAL["40HC"].heightM;
  const exceedsWidth = maxPieceWidthM > CONTAINER_INTERNAL["40HC"].widthM;
  const exceedsLength = maxPieceLengthM > CONTAINER_INTERNAL["45HC"].lengthM;

  if (exceedsHeight || exceedsWidth || exceedsLength || cargoNature === "oversized") {
    const dims: string[] = [];
    if (exceedsHeight) dims.push(`height ${maxPieceHeightM.toFixed(2)}m > 2.69m`);
    if (exceedsWidth) dims.push(`width ${maxPieceWidthM.toFixed(2)}m > 2.35m`);
    if (exceedsLength) dims.push(`length ${maxPieceLengthM.toFixed(2)}m > 13.55m`);
    const reasonDetails = dims.length > 0 ? dims.join(", ") : "client-declared oversized cargo";
    return {
      cargo_class: "OOG",
      cargo_class_reason: `Out of gauge: ${reasonDetails}. Standard containers not feasible; requires specialized equipment (flat rack, open top, or breakbulk).`,
      is_user_selected: false
    };
  }

  // HEAVY - from weight OR cargo_nature selection
  if (maxPieceWeightKg >= HEAVY_THRESHOLDS.PIECE_WEIGHT_HEAVY_KG || cargoNature === "heavy") {
    const severity = maxPieceWeightKg >= HEAVY_THRESHOLDS.PIECE_WEIGHT_CHARTER_KG 
      ? "extreme" 
      : maxPieceWeightKg >= HEAVY_THRESHOLDS.PIECE_WEIGHT_SUPERHEAVY_KG 
        ? "super-heavy" 
        : "heavy";
    return {
      cargo_class: "HEAVY",
      cargo_class_reason: `${severity.charAt(0).toUpperCase() + severity.slice(1)} cargo: single piece weight ${(maxPieceWeightKg / 1000).toFixed(1)}t ${severity === "extreme" ? "requires specialized heavy-lift handling and potential breakbulk/charter" : "requires weight distribution planning and possible equipment upgrade"}.`,
      is_user_selected: false
    };
  }

  // HIGH_VALUE - from declared value OR cargo_nature selection
  if ((declaredValueUSD && declaredValueUSD >= HEAVY_THRESHOLDS.HIGH_VALUE_USD) || cargoNature === "high_value") {
    const valueNote = declaredValueUSD ? `(declared value USD ${declaredValueUSD.toLocaleString()})` : "(client-declared high-value)";
    return {
      cargo_class: "HIGH_VALUE",
      cargo_class_reason: `High-value cargo ${valueNote}. Requires enhanced security, insurance coverage, and minimized handling.`,
      is_user_selected: false
    };
  }

  // GENERAL - default (includes "general" and "dense" cargo_nature - dense is handled separately in LBIA)
  return {
    cargo_class: "GENERAL",
    cargo_class_reason: "Standard general cargo within container dimension and weight limits.",
    is_user_selected: false
  };
}

function computeEquipmentDecision(
  mode: string,
  cargoClass: CargoClass,
  maxPieceLengthM: number,
  maxPieceWidthM: number,
  maxPieceHeightM: number,
  maxPieceWeightKg: number,
  totalCBM: number,
  totalWeightKg: number,
  priority: string
): EquipmentDecision {
  const warnings: string[] = [];
  const assumptions: string[] = [];
  const equipment: EquipmentOption[] = [];
  let method: TransportMethod = "LINER_CONTAINER";
  let charterConsideration = false;
  let charterRationale: string | null = null;

  const modeUpper = mode.toUpperCase();

  if (modeUpper === "AIR") {
    method = "AIR";
    equipment.push({
      equipment_type: "Air Freight (ULD/Loose)",
      suitability: "RECOMMENDED",
      reason: "Air cargo for time-critical shipments."
    });
    if (maxPieceWeightKg > 2000) {
      warnings.push(`Piece weight ${(maxPieceWeightKg / 1000).toFixed(1)}t may require freighter aircraft; confirm carrier capacity.`);
    }
    assumptions.push("Cargo dimensions fit standard aircraft door openings.");
    return { recommended_transport_method: method, recommended_equipment: equipment, feasibility_warnings: warnings, engineering_assumptions: assumptions, charter_consideration: charterConsideration, charter_rationale: charterRationale };
  }

  if (modeUpper === "LAND") {
    method = "LAND";
    equipment.push({
      equipment_type: "Truck/Trailer",
      suitability: "RECOMMENDED",
      reason: "Ground transport for regional delivery."
    });
    if (maxPieceWeightKg > 25000) {
      warnings.push("Piece weight exceeds standard truck payload; confirm axle limits and permits.");
    }
    assumptions.push("Road infrastructure supports cargo weight and dimensions.");
    return { recommended_transport_method: method, recommended_equipment: equipment, feasibility_warnings: warnings, engineering_assumptions: assumptions, charter_consideration: charterConsideration, charter_rationale: charterRationale };
  }

  // SEA mode - detailed equipment decision
  const fitsIn20GP = maxPieceLengthM <= CONTAINER_INTERNAL["20GP"].lengthM && 
                     maxPieceWidthM <= CONTAINER_INTERNAL["20GP"].widthM && 
                     maxPieceHeightM <= CONTAINER_INTERNAL["20GP"].heightM &&
                     maxPieceWeightKg <= CONTAINER_INTERNAL["20GP"].payloadKg;
  
  const fitsIn40GP = maxPieceLengthM <= CONTAINER_INTERNAL["40GP"].lengthM && 
                     maxPieceWidthM <= CONTAINER_INTERNAL["40GP"].widthM && 
                     maxPieceHeightM <= CONTAINER_INTERNAL["40GP"].heightM &&
                     maxPieceWeightKg <= CONTAINER_INTERNAL["40GP"].payloadKg;

  const fitsIn40HC = maxPieceLengthM <= CONTAINER_INTERNAL["40HC"].lengthM && 
                     maxPieceWidthM <= CONTAINER_INTERNAL["40HC"].widthM && 
                     maxPieceHeightM <= CONTAINER_INTERNAL["40HC"].heightM &&
                     maxPieceWeightKg <= CONTAINER_INTERNAL["40HC"].payloadKg;

  const fitsIn45HC = maxPieceLengthM <= CONTAINER_INTERNAL["45HC"].lengthM && 
                     maxPieceWidthM <= CONTAINER_INTERNAL["45HC"].widthM && 
                     maxPieceHeightM <= CONTAINER_INTERNAL["45HC"].heightM &&
                     maxPieceWeightKg <= CONTAINER_INTERNAL["45HC"].payloadKg;

  // OOG cargo handling
  if (cargoClass === "OOG") {
    const exceedsHeight = maxPieceHeightM > CONTAINER_INTERNAL["40HC"].heightM;
    const exceedsWidth = maxPieceWidthM > CONTAINER_INTERNAL["40HC"].widthM;
    const extremeDimensions = maxPieceLengthM > 15 || maxPieceWidthM > 4 || maxPieceHeightM > 4;

    if (extremeDimensions || maxPieceWeightKg >= HEAVY_THRESHOLDS.PIECE_WEIGHT_CHARTER_KG) {
      method = "LINER_BREAKBULK";
      equipment.push({
        equipment_type: "Breakbulk / Heavy-Lift Vessel",
        suitability: "RECOMMENDED",
        reason: "Extreme dimensions or weight require conventional breakbulk handling with ship's gear or shore cranes."
      });
      charterConsideration = true;
      charterRationale = `Cargo dimensions (${maxPieceLengthM.toFixed(1)}m x ${maxPieceWidthM.toFixed(1)}m x ${maxPieceHeightM.toFixed(1)}m) and/or weight (${(maxPieceWeightKg / 1000).toFixed(1)}t) exceed liner container capacity. Evaluate partial or full charter options for schedule certainty and handling control.`;
      warnings.push("Breakbulk requires port with heavy-lift capability; confirm destination port crane capacity.");
      warnings.push("Lashing and securing plan required; engage surveyor for load distribution.");
    } else if (exceedsHeight && !exceedsWidth) {
      equipment.push({
        equipment_type: "Open Top Container (OT)",
        suitability: "RECOMMENDED",
        reason: `Cargo height ${maxPieceHeightM.toFixed(2)}m exceeds standard container but fits Open Top with tarpaulin cover.`
      });
      equipment.push({
        equipment_type: "Flat Rack (FR)",
        suitability: "POSSIBLE",
        reason: "Alternative if Open Top unavailable or cargo needs side loading."
      });
      warnings.push("Open Top containers have limited availability on some routes; book early.");
      warnings.push("Over-height cargo may incur OOG surcharges and require special stow planning.");
    } else if (exceedsWidth || (exceedsHeight && exceedsWidth)) {
      equipment.push({
        equipment_type: "Flat Rack (FR)",
        suitability: "RECOMMENDED",
        reason: `Cargo width ${maxPieceWidthM.toFixed(2)}m and/or height ${maxPieceHeightM.toFixed(2)}m exceed enclosed container limits.`
      });
      equipment.push({
        equipment_type: "Platform Container (PL)",
        suitability: "POSSIBLE",
        reason: "For extremely wide or heavy cargo that cannot be secured on flat rack."
      });
      warnings.push("Flat rack cargo requires lashing plan and may need weather protection.");
      charterConsideration = totalCBM > 100 || maxPieceWeightKg > HEAVY_THRESHOLDS.PIECE_WEIGHT_SUPERHEAVY_KG;
      if (charterConsideration) {
        charterRationale = "Multiple OOG pieces or heavy lift requirements may justify partial charter for guaranteed space and handling control.";
      }
    }
    assumptions.push("Port of loading and discharge have adequate OOG handling equipment.");
    assumptions.push("Carrier accepts OOG booking on intended vessel/voyage.");
  }
  // HEAVY cargo handling
  else if (cargoClass === "HEAVY") {
    if (maxPieceWeightKg >= HEAVY_THRESHOLDS.PIECE_WEIGHT_CHARTER_KG) {
      method = "LINER_BREAKBULK";
      equipment.push({
        equipment_type: "Breakbulk / Heavy-Lift",
        suitability: "RECOMMENDED",
        reason: `Single piece weight ${(maxPieceWeightKg / 1000).toFixed(1)}t exceeds container payload limits. Heavy-lift vessel or project cargo service required.`
      });
      charterConsideration = true;
      charterRationale = `Piece weight ${(maxPieceWeightKg / 1000).toFixed(1)}t requires heavy-lift vessel capability. Evaluate charter options for dedicated crane capacity, schedule control, and reduced handling.`;
      warnings.push("Confirm port crane capacity at both origin and destination (minimum lift capacity required).");
      warnings.push("Weight certificate and rigging plan required for cargo handling.");
    } else if (maxPieceWeightKg >= HEAVY_THRESHOLDS.PIECE_WEIGHT_SUPERHEAVY_KG) {
      equipment.push({
        equipment_type: "Flat Rack (FR) / Platform",
        suitability: "RECOMMENDED",
        reason: `Heavy cargo ${(maxPieceWeightKg / 1000).toFixed(1)}t benefits from flat rack for weight distribution and ease of handling.`
      });
      equipment.push({
        equipment_type: "40GP/40HC (if fits)",
        suitability: "POSSIBLE",
        reason: "Standard container possible if weight can be distributed across container floor and piece dimensions fit."
      });
      warnings.push("Overweight container requires carrier approval and may incur surcharges.");
      warnings.push("Check road weight limits for drayage; may need multiple trucks or special permits.");
    } else {
      // Heavy but within container limits
      if (fitsIn40GP) {
        equipment.push({
          equipment_type: "40GP",
          suitability: "RECOMMENDED",
          reason: "Standard container feasible with weight distribution planning."
        });
      }
      if (fitsIn20GP) {
        equipment.push({
          equipment_type: "20GP",
          suitability: "POSSIBLE",
          reason: "Shorter container may provide better weight distribution for heavy cargo."
        });
      }
      warnings.push("Confirm load distribution plan to prevent floor damage and ensure safe handling.");
    }
    assumptions.push("Weight provided is accurate; verify with scale weight certificate before shipment.");
  }
  // IMO (Dangerous Goods) handling
  else if (cargoClass === "IMO") {
    method = "LINER_CONTAINER";
    equipment.push({
      equipment_type: "DG-Approved Standard Container",
      suitability: "RECOMMENDED",
      reason: "Dangerous goods require DG-certified container and carrier acceptance."
    });
    warnings.push("DG cargo requires carrier DG acceptance before booking confirmation.");
    warnings.push("Ensure MSDS/SDS documentation, DG declaration, and proper placarding.");
    warnings.push("Some IMO classes have restricted stowage positions (on-deck, away from heat sources, etc.).");
    if (!fitsIn40HC && !fitsIn45HC) {
      warnings.push("Oversized DG cargo is extremely restricted; confirm carrier capability for DG breakbulk.");
      method = "LINER_BREAKBULK";
    }
    assumptions.push("Cargo is properly classified and packaged per IMDG Code requirements.");
    assumptions.push("Shipper's Declaration for Dangerous Goods will be provided.");
  }
  // HIGH_VALUE handling
  else if (cargoClass === "HIGH_VALUE") {
    method = "LINER_CONTAINER";
    equipment.push({
      equipment_type: "Sealed FCL (40GP/40HC)",
      suitability: "RECOMMENDED",
      reason: "Dedicated sealed container minimizes handling and provides chain-of-custody control."
    });
    warnings.push("High-value cargo requires adequate marine insurance; verify coverage limits.");
    warnings.push("Minimize transshipments to reduce handling exposure; prefer direct routing.");
    warnings.push("Consider tamper-evident seals and GPS tracking for high-value shipments.");
    if (priority === "time") {
      warnings.push("Time priority noted: balance speed with security controls; avoid unnecessary rush handling that increases loss risk.");
    }
    assumptions.push("Declared value is insured to full replacement cost.");
    assumptions.push("Destination has secure receiving facilities.");
  }
  // GENERAL cargo
  else {
    method = "LINER_CONTAINER";
    if (fitsIn20GP && totalCBM <= CONTAINER_CAPACITY["20GP"].recommendCbm) {
      equipment.push({
        equipment_type: "20GP",
        suitability: "RECOMMENDED",
        reason: "Standard 20-foot container adequate for cargo volume and dimensions."
      });
    }
    if (fitsIn40GP) {
      equipment.push({
        equipment_type: "40GP",
        suitability: totalCBM > 28 ? "RECOMMENDED" : "POSSIBLE",
        reason: "Standard 40-foot container provides efficient space utilization."
      });
    }
    if (fitsIn40HC) {
      equipment.push({
        equipment_type: "40HC",
        suitability: maxPieceHeightM > 2.3 ? "RECOMMENDED" : "POSSIBLE",
        reason: "High-cube container for taller cargo or better stacking."
      });
    }
    if (fitsIn45HC) {
      equipment.push({
        equipment_type: "45HC",
        suitability: totalCBM > 60 ? "RECOMMENDED" : "POSSIBLE",
        reason: "Extended high-cube for maximum volume utilization."
      });
    }
    assumptions.push("Cargo is properly packaged for container transport.");
  }

  // Enterprise-scale charter consideration
  if (totalCBM >= THRESHOLDS.ENTERPRISE_CBM || totalWeightKg >= 200000) {
    charterConsideration = true;
    charterRationale = charterRationale || `Enterprise-scale volume (${totalCBM.toFixed(0)} CBM / ${(totalWeightKg / 1000).toFixed(0)}t) warrants contract rate evaluation and potential space charter for guaranteed allocation and schedule control.`;
    warnings.push("Large volume movement: evaluate contract rates vs. spot booking; consider space charter for peak season protection.");
  }

  return {
    recommended_transport_method: method,
    recommended_equipment: equipment.length > 0 ? equipment : [{
      equipment_type: "40GP",
      suitability: "RECOMMENDED",
      reason: "Standard container suitable for general cargo."
    }],
    feasibility_warnings: warnings,
    engineering_assumptions: assumptions,
    charter_consideration: charterConsideration,
    charter_rationale: charterRationale
  };
}

function buildDocsChecklist(cargoClass: CargoClass, incoterm: string): DocsChecklist {
  const required: string[] = ["Commercial Invoice", "Packing List", "Bill of Lading / Airway Bill"];
  const recommended: string[] = [];
  const compliance: string[] = [];

  // Base documents by incoterm
  if (["CIF", "CIP"].includes(incoterm)) {
    required.push("Insurance Certificate (seller-arranged)");
  }
  if (["DDP"].includes(incoterm)) {
    required.push("Import customs declaration", "Duty payment documentation");
  }

  // Cargo class specific
  switch (cargoClass) {
    case "HEAVY":
      required.push("Weight Certificate (certified scale weight)");
      required.push("Lifting/Rigging Plan");
      recommended.push("Load distribution diagram");
      recommended.push("Handling instructions");
      compliance.push("Verify road weight limits for drayage; special permits may be required.");
      compliance.push("Confirm port crane capacity at both origin and destination.");
      break;

    case "OOG":
      required.push("Dimension Survey / Drawing");
      required.push("Lashing and Securing Plan");
      required.push("Method Statement");
      recommended.push("Pre-shipment survey report");
      recommended.push("Weather protection specification (if required)");
      compliance.push("Carrier OOG booking approval required before cargo ready date.");
      compliance.push("Confirm slot/stow position on vessel for OOG cargo.");
      break;

    case "IMO":
      required.push("Material Safety Data Sheet (MSDS/SDS)");
      required.push("Dangerous Goods Declaration (IMO format)");
      required.push("UN Number / IMO Class / Packing Group");
      required.push("Emergency contact information (24-hour)");
      recommended.push("IMDG Code reference for stowage category");
      compliance.push("Carrier DG acceptance confirmation required before booking.");
      compliance.push("Proper DG placarding and labeling per IMDG Code.");
      compliance.push("Some ports/terminals have DG storage restrictions; confirm acceptance.");
      break;

    case "HIGH_VALUE":
      required.push("Marine Insurance Certificate (full value coverage)");
      required.push("Detailed inventory with serial numbers (if applicable)");
      recommended.push("Chain-of-custody documentation");
      recommended.push("Tamper-evident seal numbers and photos");
      compliance.push("Verify insurance coverage matches declared cargo value.");
      compliance.push("Minimize transshipments and handling to reduce exposure.");
      break;

    case "GENERAL":
    default:
      recommended.push("Certificate of Origin (if required by destination)");
      recommended.push("Shipping Instructions (SI)");
      compliance.push("Confirm HS code classification for customs clearance.");
      break;
  }

  return { required, recommended, compliance_notes: compliance };
}

// Shipment type thresholds
const THRESHOLDS = {
  LCL_MAX_CBM: 33.2,        // LCL not feasible above this
  LCL_MAX_WEIGHT_KG: 8000,  // LCL not feasible above this weight
  FCL_TRIGGER_CBM: 12,      // Strongly consider FCL at this volume
  FCL_TRIGGER_WEIGHT: 2000, // Strongly consider FCL at this weight
  RECOMMEND_40GP_CBM: 28,
  RECOMMEND_45HC_CBM: 58,
  MULTI_FCL_CBM: 76.4,
  ENTERPRISE_CBM: 200,      // Enterprise-scale movement
  ENTERPRISE_WEIGHT: 20000
};

export type ShipmentTypeRecommended = "LCL" | "FCL_20GP" | "FCL_40GP" | "FCL_45HC" | "MULTI_FCL" | "AIR" | "ENTERPRISE";

export type ContainerPlan = {
  recommended_container_type: string;
  baseline_container_count: number;
  utilization_20gp: number;
  utilization_40gp: number;
  utilization_45hc: number;
  weight_per_container_kg: number;
  weight_feasibility_note: string | null;
  planning_note: string;
};

export type FeasibilityResult = {
  user_selected_type: string;
  shipment_type_recommended: ShipmentTypeRecommended;
  shipment_type_feasible: boolean;
  feasibility_warnings: string[];
  container_plan: ContainerPlan;
  analysis_uses_recommended: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeCBM(l: number, w: number, h: number, uom: string): number {
  let lm = l, wm = w, hm = h;
  if (uom === "in") { lm = l * 2.54; wm = w * 2.54; hm = h * 2.54; }
  return (lm / 100) * (wm / 100) * (hm / 100);
}

function computeFeasibility(
  mode: string,
  userSelectedType: string,
  totalCBM: number,
  totalWeightKg: number
): FeasibilityResult {
  const warnings: string[] = [];
  const modeUpper = mode.toUpperCase();
  const typeUpper = userSelectedType.toUpperCase();

  // Default to user selection
  let recommended: ShipmentTypeRecommended = typeUpper === "LCL" ? "LCL" : "FCL_40GP";
  let feasible = true;
  let analysisUsesRecommended = false;

  // AIR mode - different logic
  if (modeUpper === "AIR") {
    recommended = "AIR";
    const containerPlan: ContainerPlan = {
      recommended_container_type: "Air Freight",
      baseline_container_count: 0,
      utilization_20gp: 0,
      utilization_40gp: 0,
      utilization_45hc: 0,
      weight_per_container_kg: totalWeightKg,
      weight_feasibility_note: totalWeightKg > 1000 ? "Large air shipment; consider charter or multi-flight allocation." : null,
      planning_note: "Air freight pricing is weight/volume based (chargeable weight). Confirm ULD allocation with carrier."
    };
    return {
      user_selected_type: userSelectedType,
      shipment_type_recommended: recommended,
      shipment_type_feasible: true,
      feasibility_warnings: warnings,
      container_plan: containerPlan,
      analysis_uses_recommended: false
    };
  }

  // SEA mode - apply LCL/FCL logic
  if (modeUpper === "SEA") {
    // Check if LCL is NOT feasible
    const lclNotFeasibleCBM = totalCBM >= THRESHOLDS.LCL_MAX_CBM;
    const lclNotFeasibleWeight = totalWeightKg >= THRESHOLDS.LCL_MAX_WEIGHT_KG;

    // Enterprise scale check
    const isEnterprise = totalCBM >= THRESHOLDS.ENTERPRISE_CBM || totalWeightKg >= THRESHOLDS.ENTERPRISE_WEIGHT;

    // Handle empty shipment_type - Meru decides based on cargo volume
    const userDidNotSelectType = typeUpper === "" || typeUpper === "GENERAL";

    if (isEnterprise) {
      recommended = "ENTERPRISE";
      if (typeUpper === "LCL") {
        feasible = false;
        analysisUsesRecommended = true;
        warnings.push(`Selected LCL is not feasible for ${totalCBM.toFixed(1)} CBM / ${totalWeightKg.toFixed(0)} kg cargo. Analysis assumes multi-container FCL strategy.`);
        warnings.push("Enterprise-scale movement: Recommend contract rates, dedicated vessel booking, and multi-port strategy.");
      }
    } else if (lclNotFeasibleCBM || lclNotFeasibleWeight) {
      // LCL not feasible - determine FCL type
      if (totalCBM >= THRESHOLDS.MULTI_FCL_CBM) {
        recommended = "MULTI_FCL";
      } else if (totalCBM >= THRESHOLDS.RECOMMEND_45HC_CBM) {
        recommended = "FCL_45HC";
      } else if (totalCBM >= THRESHOLDS.RECOMMEND_40GP_CBM) {
        recommended = "FCL_40GP";
      } else {
        recommended = "FCL_20GP";
      }

      if (typeUpper === "LCL") {
        feasible = false;
        analysisUsesRecommended = true;
        warnings.push(`Selected LCL is not feasible given ${totalCBM.toFixed(1)} CBM / ${totalWeightKg.toFixed(0)} kg; analysis assumes ${recommended.replace("_", " ")} strategy.`);
      }
    } else if (typeUpper === "LCL" || (userDidNotSelectType && totalCBM < THRESHOLDS.LCL_MAX_CBM && totalWeightKg < THRESHOLDS.LCL_MAX_WEIGHT_KG)) {
      // LCL is feasible - either user selected or Meru recommends for small cargo
      recommended = "LCL";
      if (typeUpper === "LCL" && (totalCBM >= THRESHOLDS.FCL_TRIGGER_CBM || totalWeightKg >= THRESHOLDS.FCL_TRIGGER_WEIGHT)) {
        warnings.push(`LCL is feasible but cargo volume (${totalCBM.toFixed(1)} CBM) may benefit from FCL cost comparison.`);
      }
      if (userDidNotSelectType) {
        analysisUsesRecommended = true;
      }
    } else {
      // User selected FCL or Meru decides FCL for larger cargo - determine optimal type
      if (totalCBM >= THRESHOLDS.MULTI_FCL_CBM) {
        recommended = "MULTI_FCL";
      } else if (totalCBM >= THRESHOLDS.RECOMMEND_45HC_CBM) {
        recommended = "FCL_45HC";
      } else if (totalCBM >= THRESHOLDS.RECOMMEND_40GP_CBM) {
        recommended = "FCL_40GP";
      } else if (totalCBM >= THRESHOLDS.FCL_TRIGGER_CBM) {
        recommended = "FCL_20GP";
      } else {
        recommended = "FCL_20GP"; // User chose FCL, respect it
        if (!userDidNotSelectType) {
          warnings.push(`Cargo volume (${totalCBM.toFixed(1)} CBM) is low for FCL. Consider LCL for potential cost savings.`);
        }
      }
      if (userDidNotSelectType) {
        analysisUsesRecommended = true;
      }
    }
  }

  // Build container plan
  const containerPlan = buildContainerPlan(recommended, totalCBM, totalWeightKg);

  return {
    user_selected_type: userSelectedType,
    shipment_type_recommended: recommended,
    shipment_type_feasible: feasible,
    feasibility_warnings: warnings,
    container_plan: containerPlan,
    analysis_uses_recommended: analysisUsesRecommended
  };
}

function buildContainerPlan(recommended: ShipmentTypeRecommended, totalCBM: number, totalWeightKg: number): ContainerPlan {
  const util20gp = (totalCBM / CONTAINER_CAPACITY["20GP"].cbm) * 100;
  const util40gp = (totalCBM / CONTAINER_CAPACITY["40GP"].cbm) * 100;
  const util45hc = (totalCBM / CONTAINER_CAPACITY["45HC"].cbm) * 100;

  let containerType = "40GP";
  let containerCount = 1;
  let weightPerContainer = totalWeightKg;

  if (recommended === "LCL" || recommended === "AIR") {
    containerType = recommended === "LCL" ? "LCL Consolidation" : "Air Freight";
    containerCount = 0;
  } else if (recommended === "FCL_20GP") {
    containerType = "20GP";
    containerCount = Math.ceil(totalCBM / CONTAINER_CAPACITY["20GP"].recommendCbm);
    weightPerContainer = totalWeightKg / Math.max(containerCount, 1);
  } else if (recommended === "FCL_40GP") {
    containerType = "40GP";
    containerCount = Math.ceil(totalCBM / CONTAINER_CAPACITY["40GP"].recommendCbm);
    weightPerContainer = totalWeightKg / Math.max(containerCount, 1);
  } else if (recommended === "FCL_45HC") {
    containerType = "45HC";
    containerCount = Math.ceil(totalCBM / CONTAINER_CAPACITY["45HC"].recommendCbm);
    weightPerContainer = totalWeightKg / Math.max(containerCount, 1);
  } else if (recommended === "MULTI_FCL" || recommended === "ENTERPRISE") {
    // For multi-FCL, calculate optimal container mix
    const num40gp = Math.ceil(totalCBM / CONTAINER_CAPACITY["40GP"].recommendCbm);
    containerType = `${num40gp}x 40GP`;
    containerCount = num40gp;
    weightPerContainer = totalWeightKg / Math.max(containerCount, 1);
  }

  // Weight feasibility check
  let weightNote: string | null = null;
  if (containerCount > 0 && weightPerContainer > 26500) {
    weightNote = `Weight per container (${weightPerContainer.toFixed(0)} kg) exceeds typical 40GP payload limit (~26,500 kg). Confirm weight distribution with carrier.`;
  } else if (containerCount > 0 && weightPerContainer > 21700 && containerType === "20GP") {
    weightNote = `Weight per container (${weightPerContainer.toFixed(0)} kg) exceeds 20GP payload limit (~21,700 kg). Consider 40GP for weight distribution.`;
  }

  return {
    recommended_container_type: containerType,
    baseline_container_count: containerCount,
    utilization_20gp: Math.round(util20gp * 10) / 10,
    utilization_40gp: Math.round(util40gp * 10) / 10,
    utilization_45hc: Math.round(util45hc * 10) / 10,
    weight_per_container_kg: Math.round(weightPerContainer),
    weight_feasibility_note: weightNote,
    planning_note: "Planning estimate based on declared dimensions. Weight limits and packaging shape may affect final container allocation."
  };
}

export function runDecisionEngine(intake: MeruIntake) {
  const incotermContext = getIncotermContext(intake.incoterm || "FOB");
  const enabledModules = new Set(incotermContext.enabled_modules);
  let score = 0;
  const drivers: string[] = [];

  if (enabledModules.has("forwarder") && intake.single_forwarder) {
    score += 15; drivers.push("Single forwarder dependency");
  }
  if (enabledModules.has("port") && intake.single_port) {
    score += 15; drivers.push("Single port/route dependency");
  }
  if (intake.single_supplier) { 
    score += 10; drivers.push("Single supplier concentration"); 
  }

  const modeStr = String(intake.mode || "").toUpperCase();
  const typeStr = String(intake.shipment_type || "").toUpperCase();

  // Calculate cargo metrics first for feasibility check
  const qty = intake.units_count || 1;
  const dimL = intake.unit_length || 0;
  const dimW = intake.unit_width || 0;
  const dimH = intake.unit_height || 0;
  const dimUom = intake.unit_dim_uom || "cm";
  const totalCBM = computeCBM(dimL, dimW, dimH, dimUom) * qty;
  const unitWeight = intake.unit_weight || 0;
  const weightUom = intake.unit_weight_uom || "kg";
  let totalWeightKg = unitWeight * qty;
  if (weightUom === "lb") totalWeightKg *= 0.453592;

  // Calculate max piece dimensions in meters for OOG/HEAVY classification
  let maxPieceLengthM = dimL;
  let maxPieceWidthM = dimW;
  let maxPieceHeightM = dimH;
  if (dimUom === "cm") {
    maxPieceLengthM = dimL / 100;
    maxPieceWidthM = dimW / 100;
    maxPieceHeightM = dimH / 100;
  } else if (dimUom === "in") {
    maxPieceLengthM = dimL * 0.0254;
    maxPieceWidthM = dimW * 0.0254;
    maxPieceHeightM = dimH * 0.0254;
  }
  // Max piece weight - use provided value or infer from unit weight
  const maxPieceWeightKg = intake.max_piece_weight_kg || (unitWeight * (weightUom === "lb" ? 0.453592 : 1));

  // ============ CARGO CLASSIFICATION ============
  const cargoClassification = classifyCargo(
    maxPieceLengthM,
    maxPieceWidthM,
    maxPieceHeightM,
    maxPieceWeightKg,
    intake.dg_flag,
    intake.imo_class,
    intake.declared_value_usd,
    intake.cargo_class,
    intake.cargo_nature
  );

  // ============ EQUIPMENT DECISION ============
  const equipmentDecision = computeEquipmentDecision(
    modeStr,
    cargoClassification.cargo_class,
    maxPieceLengthM,
    maxPieceWidthM,
    maxPieceHeightM,
    maxPieceWeightKg,
    totalCBM,
    totalWeightKg,
    intake.priority || "balanced"
  );

  // ============ DOCUMENTATION CHECKLIST ============
  const docsChecklist = buildDocsChecklist(cargoClassification.cargo_class, intake.incoterm || "FOB");

  // ============ FEASIBILITY CHECK & SANITY LAYER ============
  const feasibility = computeFeasibility(modeStr, typeStr, totalCBM, totalWeightKg);
  const containerPlan = feasibility.container_plan;
  const containerRec = containerPlan.recommended_container_type;

  // Use recommended type for analysis if user selection is not feasible
  const effectiveType = feasibility.analysis_uses_recommended 
    ? feasibility.shipment_type_recommended.replace("FCL_", "").replace("MULTI_", "") 
    : typeStr;
  
  const isSeaLCL = modeStr === "SEA" && effectiveType === "LCL";
  const isSeaFCL = modeStr === "SEA" && (effectiveType === "FCL" || effectiveType.includes("GP") || effectiveType.includes("HC") || feasibility.shipment_type_recommended.startsWith("FCL") || feasibility.shipment_type_recommended === "MULTI_FCL" || feasibility.shipment_type_recommended === "ENTERPRISE");
  const isAir = modeStr === "AIR";

  if (enabledModules.has("consolidation") && isSeaLCL) {
    score += 10; drivers.push("LCL consolidation exposure");
  }

  // Add feasibility warning as risk driver if applicable
  if (!feasibility.shipment_type_feasible) {
    score += 10; drivers.push("User selection override required due to cargo scale");
  }

  if (intake.pain_point === "disruptions") { score += 15; drivers.push("Disruption sensitivity"); }
  if (intake.pain_point === "delays") { score += 10; drivers.push("Delay sensitivity"); }
  if (intake.pain_point === "cost_overruns") { score += 10; drivers.push("Cost overrun exposure"); }

  score = clamp(score, 0, 100);
  const scope = incotermContext.analysis_scope;
  const incoterm = incotermContext.incoterm;
  const origin = intake.origin_region || "Origin";
  const destination = intake.destination_region || "Destination";
  const priority = intake.priority || "balanced";

  // Reference info
  const hasReference = intake.reference_type && intake.reference_number;
  const refNote = hasReference ? `Reference ${intake.reference_type} ${intake.reference_number} is on file for tracking purposes.` : "";

  // ============ CLIENT CONTEXT ============
  const clientType: ClientType = (intake.client_type as ClientType) || "importer_exporter";
  const isOOG = cargoClassification.cargo_class === "OOG";
  const isHeavy = cargoClassification.cargo_class === "HEAVY" || maxPieceWeightKg >= HEAVY_THRESHOLDS.PIECE_WEIGHT_HEAVY_KG;
  const clientContext = buildClientContext(clientType, cargoClassification.cargo_class, isOOG, isHeavy);

  // ============ BUILD ANALYST NARRATIVE BY SCOPE ============
  let operational_context = "";
  let risk_assessment_summary = "";
  let business_impact = "";
  let recommendation_rationale = "";
  let route_port_options = "";
  let carrier_strategy = "";
  const next_actions: string[] = [];
  const key_takeaways: string[] = [];
  const assumptions: string[] = [];
  const limitations: string[] = [];

  // Feasibility override note
  const feasibilityNote = feasibility.analysis_uses_recommended 
    ? `Note: User selected ${typeStr} but cargo volume (${totalCBM.toFixed(1)} CBM / ${totalWeightKg.toFixed(0)} kg) requires ${feasibility.shipment_type_recommended.replace("_", " ")} strategy. Analysis proceeds accordingly.`
    : "";

  // Mode-specific context - adjusted for recommended type
  const modeContext = isSeaLCL 
    ? "As an LCL shipment, cargo will be consolidated with other shippers at origin, introducing dependencies on co-loaders and CFS (Container Freight Station) schedules."
    : isSeaFCL 
    ? `As an FCL shipment (${containerRec}), the container is dedicated to this cargo, providing better control over timing and reducing consolidation delays.`
    : isAir 
    ? "Air freight offers faster transit but at higher cost per kg. Space allocation and carrier reliability are critical factors during peak periods."
    : "Ground transportation provides flexibility for regional routes but is subject to border crossing delays and road conditions.";

  // Priority context with cost optimization details
  const priorityContext = priority === "cost" 
    ? "The stated priority is cost optimization, which suggests tolerance for longer transit times in exchange for lower freight rates. For FCL shipments, this opens opportunities for slower sailings and off-peak booking windows."
    : priority === "time" 
    ? "The stated priority is transit time, indicating urgency that may justify premium routing, direct sailings, or expedited services."
    : "A balanced priority suggests willingness to optimize both cost and time without extreme trade-offs.";

  // ============ LANE PROFILE LOOKUP ============
  const laneProfile = getLaneProfile({
    pol: intake.pol || "",
    pod: intake.pod || "",
    origin_region: intake.origin_region || "",
    destination_region: intake.destination_region || "",
    mode: modeStr,
    shipment_type: typeStr
  });

  const effectiveStrategy = (() => {
    const rec = feasibility.shipment_type_recommended;
    if (rec === "ENTERPRISE" || rec === "MULTI_FCL") return "ENTERPRISE_FCL" as const;
    if (isSeaFCL) return "FCL" as const;
    if (isSeaLCL) return "LCL" as const;
    return "FCL" as const;
  })();

  const laneProfileOutput: LaneProfileOutput | null = laneProfile
    ? buildLaneProfileOutput(laneProfile, effectiveStrategy, clientType)
    : null;

  // ============ BUILD ROUTE & PORT OPTIONS ============
  const buildRoutePortOptions = (): string => {
    if (laneProfileOutput && laneProfileOutput.id !== "global_generic") {
      const opts = laneProfileOutput.route_options.map((opt, i) => `(${i + 1}) ${opt}`).join(" ");
      return `Route options for this ${laneProfileOutput.name} lane: ${opts}`;
    }

    if (modeStr === "SEA") {
      return "Route options should be evaluated based on direct vs. transshipment services. Direct sailings offer schedule reliability but limited frequency; transshipment hubs (Singapore, Busan, Colombo) provide more departure options but add handling risk. Consider carrier alliance connections and cut-off timing when selecting the optimal route. Key cost drivers include origin THC, destination THC, documentation fees, and any transshipment charges.";
    }

    if (modeStr === "AIR") {
      return "Air routing options depend on carrier network and cargo type. Direct flights minimize handling but may have capacity constraints. Hub routing (Dubai, Hong Kong, Frankfurt, Singapore) offers more frequency options. Consider whether cargo qualifies for express/courier services vs. general cargo rates. Fuel surcharges (FSC) and security charges are significant cost components. Consolidation with other shippers may reduce per-kg rates for smaller volumes.";
    }

    return "Evaluate available routing options based on transit time requirements, cost structure, and reliability needs. Consider both primary and contingency routes to ensure supply chain resilience.";
  };

  // ============ BUILD CARRIER/FORWARDER STRATEGY ============
  const buildCarrierStrategy = (): string => {
    const isMultiContainer = feasibility.shipment_type_recommended === "MULTI_FCL" || feasibility.shipment_type_recommended === "ENTERPRISE";

    if (isSeaFCL) {
      if (isMultiContainer) {
        return "Multi-container booking strategy: For shipments of this scale, negotiate contract rates directly with ocean carriers or through a forwarder with volume commitments. Consider splitting containers across 2-3 carriers to reduce allocation risk during peak season. Volume contracts with Tier-1 carriers (Maersk, MSC, CMA CGM) provide rate stability and priority loading. NVOCC partners may offer competitive spot rates but carry higher rollover risk. Establish blanket booking agreements with minimum quantity commitments for rate protection. For enterprise-scale movements, dedicate a booking coordinator to manage cut-offs, documentation, and carrier performance tracking.";
      }
      return "FCL booking strategy: For dedicated container shipments, evaluate direct carrier booking vs. NVOCC (freight forwarder) options. Direct carrier contracts offer rate transparency and service guarantees but require volume commitments. NVOCCs provide flexibility and consolidated services but add margin layers. For recurring lanes, establish a primary carrier relationship with a secondary backup. Request contract rates that include demurrage/detention free time to avoid destination cost surprises. Monitor carrier on-time performance and adjust allocation accordingly.";
    }

    if (isSeaLCL) {
      return "LCL consolidation strategy: Work with consolidators who have regular departure schedules from origin. Express LCL or direct consolidation services reduce handling and transit time vs. traditional LCL routing through multiple CFS facilities. Verify CBM measurement practices to avoid destination re-measurement surprises. For recurring LCL volumes approaching FCL thresholds, evaluate whether consolidating into FCL provides better cost-per-cbm. Build relationships with 2-3 reliable consolidators to ensure space availability during peak periods.";
    }

    if (isAir) {
      return "Air freight booking strategy: For time-critical cargo, work with forwarders who have blocked space agreements on key lanes. Integrators (DHL, FedEx, UPS) offer door-to-door speed but at premium rates. Traditional air cargo via freight forwarders provides more routing flexibility. For temperature-sensitive or high-value cargo, confirm handling capabilities and insurance coverage. During peak season (Q4), book 7-10 days in advance to secure capacity. Consider split shipments across multiple carriers if single-carrier allocation is constrained.";
    }

    return "Carrier selection should balance rate competitiveness with service reliability. Establish primary and backup relationships to ensure continuity. Monitor performance metrics (on-time delivery, claims ratio) and adjust allocation based on results.";
  };

  route_port_options = buildRoutePortOptions();
  carrier_strategy = buildCarrierStrategy();

  if (scope === "operational") {
    // OPERATIONAL SCOPE (EXW, FCA, FAS, FOB) - Full control
    operational_context = `This ${incoterm} shipment from ${origin} to ${destination} places full logistics responsibility on the buyer from the point of origin. ${modeContext} ${priorityContext} The total cargo volume of ${totalCBM.toFixed(2)} CBM and ${totalWeightKg.toFixed(1)} kg suggests a ${containerRec} container allocation for planning purposes.`;

    const riskDriversList = drivers.length > 0 ? drivers.join(", ") : "general market conditions";
    risk_assessment_summary = `The current risk score of ${score}/100 reflects ${riskDriversList}. ${isSeaLCL ? "LCL shipments face inherent consolidation cut-off risks, where cargo readiness timing is critical to avoid rollover to the next vessel." : ""} Single-source dependencies increase exposure to service failures, rate spikes, and capacity constraints during peak season. Without backup options, any disruption at the primary provider could result in delayed shipments and expedited recovery costs.`;

    business_impact = score >= 40 
      ? `The concentration risks identified warrant immediate attention. A single point of failure in the logistics chain could result in 5-10 day delays and 15-25% cost increases for expedited recovery. For time-sensitive cargo or committed delivery schedules, this exposure may translate to customer penalties, stockout costs, or production line interruptions. Proactive diversification now will reduce reactive costs later.`
      : `While the current risk profile is moderate, the logistics setup lacks redundancy. In stable market conditions, this may be acceptable, but seasonal demand spikes or geopolitical events could quickly elevate risk. Building backup relationships now—before they are urgently needed—ensures competitive rates and service priority when disruptions occur.`;

    // Suppress Scenario B language for small/LCL cargo (<=12 CBM)
    recommendation_rationale = totalCBM <= 12
      ? `LCL consolidation is the appropriate approach for this cargo profile. Work with an established consolidator who provides reliable transit times and transparent pricing on this lane. Focus on accurate cargo documentation and timely delivery to the CFS to meet consolidation cut-off schedules.`
      : `The recommendation to implement flexibility measures is based on the identified concentration risks and the operational control available under ${incoterm}. By establishing a secondary forwarder relationship and identifying an alternate routing option, the operation gains resilience without significant cost increase. The 2-6% cost increment for diversification is typically offset by avoided disruption costs within 12-18 months of operation.`;

    next_actions.push("Identify and qualify one alternate freight forwarder within 7 days.");
    next_actions.push("Map one alternate port/route combination as a contingency option.");
    next_actions.push("Define specific triggers (rate threshold, delay duration) that would activate contingency routing.");
    next_actions.push("Segment SKUs by criticality and assign protection levels to high-priority items.");
    if (isSeaLCL) next_actions.push("Confirm consolidation cut-off schedules and build 2-3 days buffer into cargo readiness.");
    next_actions.push("Schedule quarterly review of forwarder performance and rate benchmarking.");

    key_takeaways.push(`Full operational control under ${incoterm} enables routing optimization and forwarder selection.`);
    key_takeaways.push(`Risk score of ${score}/100 indicates ${score >= 40 ? "elevated" : "moderate"} concentration risk requiring mitigation.`);
    if (drivers.length > 0) key_takeaways.push(`Primary risk drivers: ${drivers.slice(0, 3).join(", ")}.`);
    key_takeaways.push(`Recommended container: ${containerRec} based on ${totalCBM.toFixed(2)} CBM cargo volume.`);
    key_takeaways.push("Building backup options before peak season provides negotiating leverage and ensures capacity access.");

    assumptions.push("Cargo dimensions and weights provided are accurate and packaged for standard container loading.");
    assumptions.push("Current forwarder relationships and rates are representative of market conditions.");
    assumptions.push("No regulatory or documentation barriers exist for the identified lane.");
    if (hasReference) assumptions.push(refNote);

  } else if (scope === "financial") {
    // FINANCIAL SCOPE (CFR, CIF, CPT, CIP) - Limited control, cost focus
    operational_context = `Under ${incoterm} terms, the seller arranges and pays for main carriage from ${origin} to ${destination}. ${modeContext} The buyer's operational involvement is limited to destination handling and onward distribution. ${priorityContext} Total cargo volume is ${totalCBM.toFixed(2)} CBM (${totalWeightKg.toFixed(1)} kg).`;

    risk_assessment_summary = `With a risk score of ${score}/100, the primary exposure is financial rather than operational. The buyer has limited visibility into freight costs embedded in product pricing, creating audit complexity. ${isSeaLCL ? "LCL shipments add CBM re-measurement risk at destination, where actual measured volume may exceed declared volume, triggering additional charges." : ""} Insurance coverage under ${incoterm === "CIF" || incoterm === "CIP" ? "seller-arranged terms" : "buyer responsibility"} should be verified against cargo value.`;

    business_impact = `Cost predictability is the central concern under ${incoterm}. Without access to freight rate negotiations, the buyer cannot optimize logistics costs and must accept seller's arrangements. Destination handling charges (THC, documentation fees, demurrage) remain buyer responsibility and can vary significantly. For high-value cargo, inadequate insurance coverage could result in unrecovered losses. Periodic cost analysis against market rates helps identify if seller freight markups exceed industry norms.`;

    recommendation_rationale = `The recommendation focuses on financial visibility and risk transfer verification rather than operational optimization. Requesting freight cost breakdowns from the seller, even if not contractually required, can inform future negotiations. Ensuring insurance coverage matches declared cargo value protects against loss exposure. For recurring shipments, analyzing whether alternative Incoterms (e.g., FOB) would provide better cost control is a valid strategic consideration.`;

    next_actions.push("Request freight cost breakdown from seller for benchmark analysis.");
    next_actions.push("Verify insurance certificate coverage matches cargo declared value.");
    next_actions.push("Review destination handling charges and identify cost reduction opportunities.");
    next_actions.push("Establish tracking protocol with seller for shipment visibility.");
    next_actions.push("Evaluate whether FOB terms would provide better cost control for future orders.");

    key_takeaways.push(`Seller controls main carriage under ${incoterm}; buyer's optimization leverage is limited.`);
    key_takeaways.push("Focus on destination cost management and insurance verification.");
    key_takeaways.push("Request freight breakdowns to benchmark seller's logistics costs against market rates.");
    key_takeaways.push(`Risk score of ${score}/100 primarily reflects financial exposure, not operational control.`);

    assumptions.push("Seller will fulfill contracted freight and insurance obligations as stated.");
    assumptions.push("Destination handling infrastructure is adequate for cargo type and volume.");
    assumptions.push("Currency and payment terms do not introduce additional financial risk.");
    if (hasReference) assumptions.push(refNote);

    limitations.push("Operational route optimization is not available under this Incoterm structure.");
    limitations.push("Freight rate negotiation is seller's domain; buyer influence is indirect.");
    limitations.push("Carrier selection and performance management are outside buyer's control.");

  } else {
    // STRATEGIC SCOPE (DAP, DPU, DDP) - Minimal control, contract focus
    operational_context = `Under ${incoterm} terms, the seller manages the complete delivery chain from ${origin} to ${destination}${incoterm === "DDP" ? ", including import customs clearance and duty payment" : ""}. ${modeContext} The buyer's role is limited to receiving goods at the agreed destination. ${priorityContext} Cargo totals ${totalCBM.toFixed(2)} CBM and ${totalWeightKg.toFixed(1)} kg.`;

    risk_assessment_summary = `The risk score of ${score}/100 reflects contractual and visibility risks rather than operational control factors. ${incoterm === "DDP" ? "DDP places maximum responsibility on the seller, but also maximum dependency—any failure in seller's logistics chain directly impacts the buyer's receiving operations." : "DAP/DPU terms create dependency on seller's logistics performance up to the destination point."} Without shipment visibility, the buyer cannot proactively manage delays or coordinate receiving resources effectively.`;

    business_impact = `The primary business risk under ${incoterm} is delivery reliability and the buyer's limited ability to intervene when problems occur. Production schedules, inventory planning, and customer commitments that depend on timely delivery are exposed to seller's logistics performance. Late deliveries may result in stockouts, production delays, or penalty costs that cannot be easily recovered from the seller. The trade-off is operational simplicity in exchange for control and visibility.`;

    recommendation_rationale = `Given the limited operational control under ${incoterm}, recommendations focus on contractual protections and communication protocols. Clear delivery windows with penalty clauses incentivize seller performance. Regular tracking updates, even if informal, improve receiving planning. For critical shipments, negotiating visibility access or considering alternative Incoterms for future orders may be warranted. The seller's logistics reliability should be monitored and factored into supplier evaluations.`;

    next_actions.push("Establish clear delivery windows and penalty clauses in purchase agreements.");
    next_actions.push("Request regular shipment tracking updates from seller.");
    next_actions.push("Create receiving contingency plan for delayed deliveries.");
    next_actions.push("Document delivery performance for supplier evaluation purposes.");
    next_actions.push("Evaluate whether alternative Incoterms would provide better control for future orders.");
    if (incoterm === "DDP") next_actions.push("Verify seller's import compliance and duty classification accuracy.");

    key_takeaways.push(`Seller manages complete delivery under ${incoterm}; buyer control is minimal.`);
    key_takeaways.push("Focus on contractual terms, delivery windows, and penalty provisions.");
    key_takeaways.push("Establish tracking communication protocol with seller for visibility.");
    key_takeaways.push("Monitor seller delivery performance for future procurement decisions.");

    assumptions.push("Seller has adequate logistics capability and reliability for this lane.");
    assumptions.push("Contractual terms clearly define delivery timing and liability transfer.");
    assumptions.push("Receiving facilities are prepared to accept cargo upon seller notification.");
    if (hasReference) assumptions.push(refNote);

    limitations.push("Operational optimization is not possible under this Incoterm structure.");
    limitations.push("Route and carrier selection are entirely seller decisions.");
    limitations.push("Real-time visibility depends on seller cooperation, not buyer systems.");
  }

  // Add feasibility warnings to key takeaways
  if (feasibility.feasibility_warnings.length > 0) {
    key_takeaways.unshift(...feasibility.feasibility_warnings);
  }
  if (containerPlan.weight_feasibility_note) {
    key_takeaways.push(containerPlan.weight_feasibility_note);
  }

  const analyst_narrative = {
    operational_context: feasibilityNote ? `${feasibilityNote} ${operational_context}` : operational_context,
    risk_assessment_summary,
    business_impact,
    recommendation_rationale,
    route_port_options,
    carrier_strategy,
    next_actions
  };

  // Build risk summary
  const risk_summary =
    drivers.length
      ? `Primary risk drivers: ${drivers.join("; ")}.`
      : "No strong concentration risks detected from inputs; primary risk is market-driven and operational.";

  const scenarios = {
    A: {
      name: "Maintain current operations",
      cost_delta: "Baseline (0%)",
      time_delta: "Baseline",
      risk_delta: "Unchanged",
      notes: "No structural changes. Acceptable in stable conditions but offers no resilience improvement."
    },
    B: {
      name: "Introduce flexibility and redundancy",
      cost_delta: "+2% to +6%",
      time_delta: "More stable",
      risk_delta: "↓ 20–35%",
      notes: "Qualify backup forwarder and alternate route. Modest cost increase for significant risk reduction."
    },
    C: {
      name: "Active risk mitigation program",
      cost_delta: "+5% to +12%",
      time_delta: "More predictable",
      risk_delta: "↓ 35–55%",
      notes: "Implement buffer inventory, SKU segmentation, and automated contingency triggers."
    }
  };

  // Small/LCL cargo gating: suppress complex scenario language for small shipments
  const isSmallLclCargo = totalCBM <= 12;
  
  let recommendation = "";
  if (isSmallLclCargo) {
    // Simple recommendation for small/LCL cargo - no scenario language
    recommendation = "This shipment is well-suited for LCL consolidation. Work with a reliable consolidator who provides transparent pricing and regular transit schedules on this lane.";
  } else if (scope === "operational") {
    recommendation = score >= 60 
      ? "Implement flexibility measures immediately and prepare contingency criteria for critical lanes. The elevated risk profile warrants proactive investment in logistics resilience."
      : "Proceed with flexibility implementation over the next 60 days. Document contingency options as a playbook for activation during market disruptions.";
  } else if (scope === "financial") {
    recommendation = "Focus on cost visibility and insurance verification. Request freight breakdowns from seller and evaluate whether FOB terms would provide better control for future procurement.";
  } else {
    recommendation = "Strengthen contractual terms with clear delivery windows and performance clauses. Establish tracking communication protocol and monitor seller delivery reliability for procurement decisions.";
  }

  const actions = [
    { priority: "P1", action: next_actions[0] || "Review and confirm logistics strategy.", owner: "Importer", eta: "7 days" },
    { priority: "P1", action: next_actions[1] || "Document current arrangements.", owner: "Importer", eta: "10 days" },
    { priority: "P2", action: next_actions[2] || "Develop contingency options.", owner: "Importer", eta: "14 days" }
  ];

  let extra: any = {};
  if (intake.service_type === "lcl_asia_risk_assessment") {
    extra = {
      service_name: "LCL Asia Risk Assessment",
      key_risks: [
        "Consolidation delays at origin (Shanghai/Ningbo/Yantian)",
        "Rollover risk during peak season and space allocation failures",
        "CBM re-measurement charges at destination CFS",
        "Customs inspection probability for LCL consolidated lots"
      ],
      mitigations: [
        "Pre-book consolidation slots 14+ days before cargo ready date",
        "Use 'express LCL' or direct consolidation services for time-critical cargo",
        "Build 3-day buffer into cargo readiness to account for CFS cut-off timing",
        "Obtain detailed packing list and accurate dimensions to minimize re-measurement risk"
      ],
      sla_note: "Standard LCL transit from Asia ports is subject to +/- 5 business days variance due to consolidation and transshipment dependencies."
    };
  }

  // Build engineering narrative paragraph
  const engineeringNarrative = buildEngineeringNarrative(
    cargoClassification,
    equipmentDecision,
    feasibility,
    totalCBM,
    totalWeightKg,
    maxPieceLengthM,
    maxPieceWidthM,
    maxPieceHeightM,
    maxPieceWeightKg
  );

  // Build client-specific takeaways and actions
  const clientTakeaways = buildClientSpecificTakeaways(
    clientType, key_takeaways, score, incoterm, containerRec, totalCBM,
    isOOG, isHeavy, cargoClassification.cargo_class
  );
  const clientActions = buildClientSpecificActions(
    clientType, analyst_narrative.next_actions || [], scope, incoterm,
    isOOG, isHeavy, equipmentDecision.charter_consideration
  );

  // Update actions array with client-specific actions
  const clientActionItems = [
    { priority: "P1", action: clientActions[0] || "Review and confirm logistics strategy.", owner: clientContext.audience, eta: "7 days" },
    { priority: "P1", action: clientActions[1] || "Document current arrangements.", owner: clientContext.audience, eta: "10 days" },
    { priority: "P2", action: clientActions[2] || "Develop contingency options.", owner: clientContext.audience, eta: "14 days" }
  ];

  return {
    risk_score: score,
    risk_summary,
    scenarios,
    recommendation,
    actions: clientActionItems,
    incoterm_context: incotermContext,
    client_context: clientContext,
    analyst_narrative: {
      ...analyst_narrative,
      next_actions: clientActions,
      engineering_decision: engineeringNarrative.engineering_decision,
      charter_consideration: engineeringNarrative.charter_section
    },
    key_takeaways: clientTakeaways,
    assumptions: [...assumptions, ...equipmentDecision.engineering_assumptions],
    limitations,
    // Feasibility and container planning data
    feasibility: {
      user_selected_type: feasibility.user_selected_type,
      shipment_type_recommended: feasibility.shipment_type_recommended,
      shipment_type_feasible: feasibility.shipment_type_feasible,
      feasibility_warnings: [...feasibility.feasibility_warnings, ...equipmentDecision.feasibility_warnings],
      analysis_uses_recommended: feasibility.analysis_uses_recommended
    },
    container_plan: containerPlan,
    cargo_metrics: {
      total_cbm: Math.round(totalCBM * 100) / 100,
      total_weight_kg: Math.round(totalWeightKg * 10) / 10,
      units_count: qty,
      max_piece_dimensions_m: {
        length: Math.round(maxPieceLengthM * 100) / 100,
        width: Math.round(maxPieceWidthM * 100) / 100,
        height: Math.round(maxPieceHeightM * 100) / 100
      },
      max_piece_weight_kg: Math.round(maxPieceWeightKg)
    },
    // Cargo engineering data
    cargo_classification: cargoClassification,
    equipment_decision: equipmentDecision,
    docs_checklist: docsChecklist,
    lane_profile: laneProfileOutput,
    ...extra
  };
}

// Build engineering narrative for analyst report
function buildEngineeringNarrative(
  classification: CargoClassification,
  equipment: EquipmentDecision,
  feasibility: FeasibilityResult,
  totalCBM: number,
  totalWeightKg: number,
  maxPieceLengthM: number,
  maxPieceWidthM: number,
  maxPieceHeightM: number,
  maxPieceWeightKg: number
): { engineering_decision: string; charter_section: string | null } {
  const cargoClass = classification.cargo_class;
  const recommendedEquip = equipment.recommended_equipment.filter(e => e.suitability === "RECOMMENDED");
  const equipList = recommendedEquip.map(e => e.equipment_type).join(", ") || "Standard Container";

  let engineeringDecision = "";

  // Classification statement
  engineeringDecision += `Cargo Classification: ${cargoClass}. ${classification.cargo_class_reason} `;

  // Feasibility statement
  if (!feasibility.shipment_type_feasible) {
    engineeringDecision += `Selected ${feasibility.user_selected_type} is not feasible for this cargo profile; analysis assumes ${feasibility.shipment_type_recommended.replace("_", " ")} strategy. `;
  }

  // Equipment recommendation
  engineeringDecision += `Recommended Equipment: ${equipList}. `;
  if (recommendedEquip.length > 0) {
    engineeringDecision += recommendedEquip[0].reason + " ";
  }

  // Warnings summary
  if (equipment.feasibility_warnings.length > 0) {
    engineeringDecision += `Key Considerations: ${equipment.feasibility_warnings.slice(0, 2).join(" ")} `;
  }

  // Charter section
  let charterSection: string | null = null;
  if (equipment.charter_consideration && equipment.charter_rationale) {
    charterSection = `Charter Evaluation: ${equipment.charter_rationale} Factors to consider include schedule certainty, port handling capability, cost predictability versus spot market volatility, and cargo handling complexity. Partial charter may offer a balance between liner flexibility and dedicated capacity.`;
  }

  return {
    engineering_decision: engineeringDecision.trim(),
    charter_section: charterSection
  };
}
