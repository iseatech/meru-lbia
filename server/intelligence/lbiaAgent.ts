/**
 * Meru-LBIA v2 (Logistics Business Intelligence Agent)
 * 
 * Senior Logistics Analyst / Cargo Engineering Manager with 20+ years experience.
 * Produces ONE clear, coherent, non-contradictory logistics decision report.
 * 
 * Behaves like a professional analyst preparing a decision memo for executives.
 * NO brainstorming. NO mixed strategies. NO hedging language.
 * 
 * CRITICAL: Language must be PROPORTIONAL to cargo scale.
 * - Small cargo (≤3 CBM): Simple, consolidation-focused, no enterprise language
 * - Standard LCL (3-12 CBM): Cost-effective, frequency-aware
 * - FCL: Container optimization, carrier options
 * - Enterprise: Contract rates, volume coordination
 * - Project: Engineering gates, surveys, charter evaluation
 */

import type { ClientType, CargoClass, TransportMethod } from "./decisionEngine";
import { validateDataQuality, validateVocabulary, validateELJLPhrases, HOLD_FOR_VALIDATION_MESSAGES, isDenseCargo, getDenseCargoAdvisory, DATA_QUALITY_THRESHOLDS, type DataQualityIssue, type VocabularyViolation } from "./vocabulary";
import { generateELJL, type ELJLOutput } from "./eljl";
import type { LaneProfileOutput } from "./config/laneProfiles";

// ============ STRATEGY TYPES ============
export type LogisticsStrategy = "LCL" | "FCL" | "ENTERPRISE_FCL" | "BREAKBULK_HEAVY_LIFT" | "CHARTER" | "HOLD_FOR_VALIDATION";

// ============ CARGO SCALE CLASSIFICATION (B1 - MANDATORY) ============
export type CargoScale = 
  | "SMALL_CONSOLIDATED"      // ≤3 CBM, standard cargo - simple LCL
  | "STANDARD_LCL"            // >3 and ≤12 CBM - cost-effective consolidation
  | "STANDARD_FCL"            // >12 CBM, fits containers
  | "ENTERPRISE_CONTAINERIZED" // ≥200 CBM or 4+ containers
  | "PROJECT_ENGINEERING";     // OOG/Heavy/DG/High-value - specialized

export type CargoScaleClassification = {
  cargo_scale: CargoScale;
  cargo_scale_reason: string;
  is_simple_shipment: boolean;  // TRUE = no enterprise/project language needed
};

// ============ REALISTIC CONTAINER VOLUMES (PLANNING ASSUMPTIONS) ============
const CONTAINER_CBM = {
  "20GP": 33,   // ~33 CBM usable
  "40GP": 67,   // ~67 CBM usable
  "45HC": 76,   // ~76 CBM usable
} as const;

// ============ HARD THRESHOLDS ============
const SMALL_CARGO_MAX_CBM = 3;       // Very small cargo - simplest handling
const LCL_MAX_CBM = 12;              // LCL valid at or below this
const FCL_MAX_CBM = 67;              // FCL max before enterprise (40GP usable)
const FCL_TO_ENTERPRISE_CONTAINERS = 2;  // Escalate to ENTERPRISE if ≥2 containers
const DENSE_CARGO_WEIGHT_THRESHOLD = 333; // kg per CBM - triggers dense cargo note

// ============ B1: CARGO SCALE CLASSIFICATION FUNCTION ============
function classifyCargoScale(
  totalCBM: number,
  totalWeightKg: number,
  cargoClass: CargoClass,
  isOOG: boolean,
  isHeavy: boolean
): CargoScaleClassification {
  // PROJECT_ENGINEERING: Any specialized cargo (OOG/Heavy/DG/High-value)
  if (cargoClass === "OOG" || cargoClass === "HEAVY" || cargoClass === "IMO" || cargoClass === "HIGH_VALUE" || isOOG || isHeavy) {
    return {
      cargo_scale: "PROJECT_ENGINEERING",
      cargo_scale_reason: `Specialized cargo (${cargoClass}) requires engineering review and specialized handling.`,
      is_simple_shipment: false
    };
  }

  // ENTERPRISE_CONTAINERIZED: ≥67 CBM OR ≥2 containers
  const containersNeeded = Math.ceil(totalCBM / CONTAINER_CBM["40GP"]);
  if (totalCBM >= FCL_MAX_CBM || containersNeeded >= FCL_TO_ENTERPRISE_CONTAINERS) {
    return {
      cargo_scale: "ENTERPRISE_CONTAINERIZED",
      cargo_scale_reason: `${totalCBM.toFixed(0)} CBM / ${containersNeeded} container${containersNeeded > 1 ? 's' : ''} requires enterprise-scale coordination and contract rates.`,
      is_simple_shipment: false
    };
  }

  // STANDARD_FCL: 12-67 CBM - container-justified volume
  if (totalCBM > LCL_MAX_CBM) {
    return {
      cargo_scale: "STANDARD_FCL",
      cargo_scale_reason: `${totalCBM.toFixed(1)} CBM justifies full container allocation for cost efficiency.`,
      is_simple_shipment: true
    };
  }

  // STANDARD_LCL: Mid-range consolidation
  if (totalCBM > SMALL_CARGO_MAX_CBM) {
    return {
      cargo_scale: "STANDARD_LCL",
      cargo_scale_reason: `${totalCBM.toFixed(1)} CBM is suitable for LCL consolidation. Volume is below FCL threshold.`,
      is_simple_shipment: true
    };
  }

  // SMALL_CONSOLIDATED: Very small cargo - simplest handling
  return {
    cargo_scale: "SMALL_CONSOLIDATED",
    cargo_scale_reason: `Small shipment (${totalCBM.toFixed(2)} CBM / ${totalWeightKg.toFixed(0)} kg) - standard LCL consolidation is the cost-effective choice.`,
    is_simple_shipment: true
  };
}

export type DiscardedStrategy = {
  strategy: LogisticsStrategy;
  reason: string;
};

export type RiskDomain = 
  | "engineering_feasibility"
  | "port_capability"
  | "execution_complexity"
  | "cost_exposure"
  | "schedule_reliability"
  | "compliance_documentation";

// ============ LBIA REPORT STRUCTURE ============
export type LBIAReport = {
  // Meta
  agent_version: string;
  report_type: "LBIA_DECISION_BRIEF";
  
  // Section 1: Analysis Context (with Cargo Scale B1)
  analysis_context: {
    client_type: ClientType;
    audience_label: string;
    incoterm: string;
    control_level: string;
    cargo_class: CargoClass;
    cargo_scale: CargoScale;           // B1: Cargo scale classification
    cargo_scale_reason: string;        // B1: Why this classification
    is_simple_shipment: boolean;       // B1: TRUE = no enterprise/project language
    total_cbm: number;
    total_weight_kg: number;
    origin: string;
    destination: string;
    mode: string;
    priority: string;
  };
  
  // Section 2: Feasibility Determination
  feasibility_determination: {
    physical_feasibility: boolean;
    engineering_feasibility: boolean;
    override_applied: boolean;
    override_reason: string | null;
    dominant_risk_domains: RiskDomain[];
  };
  
  // Section 3: Selected Logistics Strategy
  selected_strategy: {
    strategy: LogisticsStrategy;
    strategy_label: string;
    rationale: string;
    equipment_recommendation: string | null;
    container_count: number | null;
    charter_type: "PARTIAL" | "FULL" | null;
  };
  
  // Section 4: Discarded Alternatives
  discarded_alternatives: DiscardedStrategy[];
  
  // Section 5: Engineering & Operational Considerations (if applicable)
  engineering_considerations: {
    applicable: boolean;
    lifting_handling: string | null;
    port_capability: string | null;
    stowage_lashing: string | null;
    surveys_required: string[];
  } | null;
  
  // Section 6: Business Impact
  business_impact: string;
  
  // Section 7: Recommendation Rationale
  recommendation_rationale: string;
  
  // Section 8: Next Actions
  next_actions: string[];
  
  // Section 9: Data Quality (C - Sanity Gate)
  data_quality: {
    validated: boolean;
    issues: DataQualityIssue[];
    hold_reason: string | null;
  };
  
  // Section 10: Vocabulary Compliance
  vocabulary_compliance: {
    validated: boolean;
    violations: VocabularyViolation[];
  };
  
  // Section 11: ELJL - Executive Logistics Judgment Layer (v3)
  eljl: ELJLOutput | null;
  
  // Section 12: Dense Cargo Advisory (if applicable)
  dense_cargo_advisory: {
    is_dense: boolean;
    density_kg_per_cbm: number;
    advisory_message: string | null;
  } | null;
  
  // Section 13: Lane Profile (route intelligence)
  lane_profile: LaneProfileOutput | null;
  
  // Risk score (preserved for compatibility)
  risk_score: number;
};

// ============ STRATEGY SELECTION LOGIC (V2 - MANDATORY ORDER) ============
/**
 * Decision Hierarchy (strictly enforced):
 * 1. Physical feasibility (dimensions, weight, CBM, handling)
 * 2. Engineering feasibility (equipment, port capability, lifting, stowage)
 * 3. Cargo classification
 * 4. Shipment scale determination
 * 5. Incoterm control relevance
 * 6. Commercial optimization
 * 7. Risk & resilience
 * 
 * If a strategy fails at ANY level → it is discarded permanently.
 */
function selectPrimaryStrategy(
  cargoClass: CargoClass,
  totalCBM: number,
  totalWeightKg: number,
  maxPieceLengthM: number,
  maxPieceWidthM: number,
  maxPieceHeightM: number,
  maxPieceWeightKg: number,
  userSelectedType: string,
  charterConsideration: boolean
): { strategy: LogisticsStrategy; rationale: string; discarded: DiscardedStrategy[] } {
  
  const discarded: DiscardedStrategy[] = [];
  
  // Container internal limits (45HC as reference for OOG check)
  const MAX_HEIGHT_M = 2.69;
  const MAX_WIDTH_M = 2.35;
  const MAX_LENGTH_M = 13.55;
  const MAX_PIECE_WEIGHT_KG = 26000;
  
  // ============ LEVEL 1: PHYSICAL FEASIBILITY ============
  const exceedsHeight = maxPieceHeightM > MAX_HEIGHT_M;
  const exceedsWidth = maxPieceWidthM > MAX_WIDTH_M;
  const exceedsLength = maxPieceLengthM > MAX_LENGTH_M;
  const exceedsWeight = maxPieceWeightKg > MAX_PIECE_WEIGHT_KG;
  const isOOG = exceedsHeight || exceedsWidth || exceedsLength;
  const isHeavy = maxPieceWeightKg >= 35000;
  
  // ============ LEVEL 2: ENGINEERING FEASIBILITY ============
  // Containers are physically impossible for this cargo
  const containersFeasible = !isOOG && maxPieceWeightKg <= MAX_PIECE_WEIGHT_KG;
  
  // ============ STRATEGY 1: CHARTER ============
  // Required for extreme OOG + Heavy or explicit charter flag with OOG/Heavy
  if ((isOOG && isHeavy) || (charterConsideration && (isOOG || isHeavy))) {
    discarded.push({ strategy: "LCL", reason: "Exceeds LCL dimensional and weight limits." });
    discarded.push({ strategy: "FCL", reason: "Standard containers cannot accommodate cargo dimensions/weight." });
    discarded.push({ strategy: "ENTERPRISE_FCL", reason: "Liner container strategy not feasible for this cargo profile." });
    discarded.push({ strategy: "BREAKBULK_HEAVY_LIFT", reason: "Charter required for handling control and schedule certainty." });
    
    const charterType = totalCBM > 500 || totalWeightKg > 1000000 ? "full" : "partial";
    return {
      strategy: "CHARTER",
      rationale: `Cargo dimensions ${maxPieceLengthM.toFixed(1)}m x ${maxPieceWidthM.toFixed(1)}m x ${maxPieceHeightM.toFixed(1)}m at ${(maxPieceWeightKg/1000).toFixed(1)}t exceed liner container capacity. ${charterType.charAt(0).toUpperCase() + charterType.slice(1)} charter provides handling control and schedule certainty.`,
      discarded
    };
  }
  
  // ============ STRATEGY 2: BREAKBULK / HEAVY-LIFT ============
  // Required for OOG or heavy cargo that cannot fit containers
  if (!containersFeasible || cargoClass === "OOG" || cargoClass === "HEAVY") {
    discarded.push({ strategy: "LCL", reason: "Exceeds LCL dimensional or weight limits." });
    discarded.push({ strategy: "FCL", reason: "Standard containers cannot accommodate cargo dimensions." });
    discarded.push({ strategy: "ENTERPRISE_FCL", reason: "Containerized strategy not feasible for OOG/heavy cargo." });
    
    const dims = [];
    if (exceedsHeight) dims.push(`height ${maxPieceHeightM.toFixed(2)}m exceeds ${MAX_HEIGHT_M}m internal`);
    if (exceedsWidth) dims.push(`width ${maxPieceWidthM.toFixed(2)}m exceeds ${MAX_WIDTH_M}m internal`);
    if (exceedsLength) dims.push(`length ${maxPieceLengthM.toFixed(2)}m exceeds ${MAX_LENGTH_M}m internal`);
    if (exceedsWeight) dims.push(`piece weight ${(maxPieceWeightKg/1000).toFixed(1)}t exceeds ${MAX_PIECE_WEIGHT_KG/1000}t limit`);
    
    const dimText = dims.length > 0 ? dims.join("; ") : "Cargo classified as OOG/Heavy";
    
    return {
      strategy: "BREAKBULK_HEAVY_LIFT",
      rationale: `${dimText}. Flat rack, open top, or breakbulk handling required.`,
      discarded
    };
  }
  
  // ============ LEVEL 4: SCALE DETERMINATION ============
  // Calculate realistic container count using planning volumes
  const containersNeeded40GP = Math.ceil(totalCBM / CONTAINER_CBM["40GP"]);
  const containersNeeded20GP = Math.ceil(totalCBM / CONTAINER_CBM["20GP"]);
  
  // ============ STRATEGY 3: ENTERPRISE_FCL ============
  // ≥67 CBM OR ≥2 containers required
  if (totalCBM >= FCL_MAX_CBM || containersNeeded40GP >= FCL_TO_ENTERPRISE_CONTAINERS) {
    discarded.push({ strategy: "LCL", reason: `Volume ${totalCBM.toFixed(0)} CBM far exceeds LCL threshold of ${LCL_MAX_CBM} CBM.` });
    discarded.push({ strategy: "FCL", reason: `${containersNeeded40GP} containers required; enterprise coordination necessary.` });
    
    return {
      strategy: "ENTERPRISE_FCL",
      rationale: `Enterprise-scale movement: ${totalCBM.toFixed(0)} CBM / ${(totalWeightKg/1000).toFixed(1)}t requires ${containersNeeded40GP}x 40GP with contract rates and dedicated booking coordination.`,
      discarded
    };
  }
  
  // ============ STRATEGY 4: FCL ============
  // Standard containerized cargo: 12-67 CBM (weight alone does NOT trigger FCL)
  if (totalCBM > LCL_MAX_CBM) {
    discarded.push({ strategy: "LCL", reason: `Volume ${totalCBM.toFixed(1)} CBM exceeds LCL threshold of ${LCL_MAX_CBM} CBM.` });
    
    // Select optimal container
    let containerRec: string;
    if (totalCBM <= CONTAINER_CBM["20GP"]) {
      containerRec = "20GP";
    } else {
      containerRec = "40GP";
    }
    
    return {
      strategy: "FCL",
      rationale: `This shipment requires ${containerRec} container allocation. At ${totalCBM.toFixed(1)} CBM / ${(totalWeightKg/1000).toFixed(1)}t, containerized transport is the correct execution.`,
      discarded
    };
  }
  
  // ============ STRATEGY 5: LCL ============
  // Default for ≤12 CBM - weight alone never forces FCL
  discarded.push({ strategy: "FCL", reason: "Volume below container threshold; LCL is cost-optimal." });
  discarded.push({ strategy: "ENTERPRISE_FCL", reason: "Volume does not require enterprise-scale coordination." });
  
  // Check for dense cargo - add advisory note
  const densityKgPerCBM = totalCBM > 0 ? totalWeightKg / totalCBM : 0;
  const isDenseCargo = densityKgPerCBM > DENSE_CARGO_WEIGHT_THRESHOLD;
  
  let lclRationale: string;
  if (isDenseCargo) {
    lclRationale = `This cargo must be executed as LCL consolidation. Dense cargo (${densityKgPerCBM.toFixed(0)} kg/CBM): chargeable W/M applies. Standard CFS handling is appropriate; any container alternative is commercially unjustified.`;
  } else {
    lclRationale = `This shipment requires LCL consolidation. At ${totalCBM.toFixed(2)} CBM / ${totalWeightKg.toFixed(0)} kg, any containerized alternative is commercially inefficient.`;
  }
  
  return {
    strategy: "LCL",
    rationale: lclRationale,
    discarded
  };
}

// ============ RISK DOMAIN SELECTION ============
function selectDominantRiskDomains(
  cargoClass: CargoClass,
  isOOG: boolean,
  isHeavy: boolean,
  strategy: LogisticsStrategy,
  clientType: ClientType
): RiskDomain[] {
  const domains: RiskDomain[] = [];
  
  // Engineering feasibility is always primary for OOG/Heavy
  if (isOOG || isHeavy || cargoClass === "OOG" || cargoClass === "HEAVY") {
    domains.push("engineering_feasibility");
  }
  
  // Port capability for breakbulk/charter
  if (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER") {
    domains.push("port_capability");
  }
  
  // Execution complexity for enterprise
  if (strategy === "ENTERPRISE_FCL") {
    domains.push("execution_complexity");
  }
  
  // Cost exposure for importers
  if (clientType === "importer_exporter" && domains.length < 2) {
    domains.push("cost_exposure");
  }
  
  // Schedule reliability for project cargo
  if (clientType === "project_cargo" && domains.length < 2) {
    domains.push("schedule_reliability");
  }
  
  // Default to cost exposure if nothing else
  if (domains.length === 0) {
    domains.push("cost_exposure");
  }
  
  return domains.slice(0, 2); // Max 2 domains
}

// ============ AUDIENCE-SPECIFIC CONTENT (B4/B5 - PROPORTIONAL LANGUAGE) ============
function buildBusinessImpact(
  clientType: ClientType,
  strategy: LogisticsStrategy,
  cargoClass: CargoClass,
  totalCBM: number,
  riskScore: number,
  cargoScale: CargoScale
): string {
  const isSimple = cargoScale === "SMALL_CONSOLIDATED" || cargoScale === "STANDARD_LCL";
  const cbmStr = totalCBM.toFixed(1);
  
  switch (clientType) {
    case "freight_forwarder":
      if (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER") {
        return `This shipment demands specialized handling coordination with direct implications for margin protection and service liability. Rate forecasting must account for crane hire, rigging, stevedoring, and marine survey costs, none of which follow standard tariff structures. Carrier commitment windows are narrow for breakbulk tonnage; failing to secure a slot within the booking validity period exposes the operation to rate escalation and schedule slippage. Equipment availability at both load and discharge ports must be confirmed in writing before booking acceptance. Document every service parameter including laytime, demurrage terms, and cargo handling responsibilities to prevent cost creep during execution. Exception management protocols should be defined upfront because project cargo routinely encounters stowage conflicts, weather delays, and port congestion that erode margin if not pre-priced.`;
      }
      if (isSimple) {
        return `Straightforward consolidation booking at ${cbmStr} CBM. Confirm the consolidation schedule and weekly departure frequency on this lane before accepting the shipment. Standard CFS handling applies with no specialized equipment requirements. Verify the chargeable weight calculation (W/M) against actual cargo dimensions to ensure accurate quoting. Focus on timely cargo delivery to origin CFS before the consolidation cut-off to secure placement on the intended sailing.`;
      }
      return `This ${cbmStr} CBM shipment requires standard carrier coordination with attention to rate validity and space allocation. Obtain written rate confirmations with clear validity periods to protect against mid-booking surcharges. Monitor local charges exposure at both origin and destination, particularly THC, CFS fees, and any terminal-specific handling surcharges not included in the base freight rate. For recurring lanes, track consolidator on-time performance and cargo damage rates to maintain service quality and defend quoted transit times to your client. Ensure documentation accuracy on HS codes and commercial invoices to prevent customs examination delays that erode service commitments.`;
    
    case "project_cargo":
      if (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER") {
        return `Engineering gates are mandatory before any booking commitment. Pre-shipment survey, method statement, and lashing plan must be completed and approved as prerequisites to carrier nomination. Port capability confirmation requires verification of berth depth, quay load limits, and crane capacity at both load and discharge ports. Rigging plans must specify lift points, spreader bar requirements, and center-of-gravity calculations for each cargo piece. GA drawings should be submitted to the carrier for stowage approval a minimum of 14 days before the intended load date. Schedule variance of 5-10 days should be built into the project timeline to account for weather windows, port congestion, and potential re-stow requirements at intermediate ports.`;
      }
      if (isSimple) {
        return `Standard cargo handling applies for this shipment profile. No specialized equipment, engineering review, or pre-shipment survey is required. Standard packaging and CFS consolidation procedures are sufficient for safe transit.`;
      }
      return `Standard cargo handling applies with reduced engineering complexity compared to heavy-lift operations. Focus on packaging specifications to ensure cargo integrity through multiple handling touchpoints during consolidation and deconsolidation. Verify that cargo dimensions and weight are accurately documented to prevent loading conflicts and CFS handling issues.`;
    
    case "importer_exporter":
    default:
      if (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER") {
        return `This shipment involves specialized logistics with significantly higher cost exposure than standard container movements. Your forwarder must provide transparent pricing with fully itemized breakdowns covering crane hire, rigging, stevedoring, lashing materials, and marine survey fees. Each of these line items is negotiable and should be benchmarked against market rates for the specific port pair. Confirm that your marine cargo insurance policy covers specialized handling risks including crane operations, heavy-lift loading and discharge, and on-deck stowage if applicable. Request a detailed method statement from the forwarder before approving the shipment plan, and verify that the quoted transit time accounts for weather windows and port scheduling constraints that routinely affect breakbulk movements.`;
      }
      if (isSimple) {
        return `This is a straightforward consolidation shipment at ${cbmStr} CBM. Request a single all-in freight quote from your forwarder covering origin to destination, and verify it includes origin CFS charges, THC at both ports, freight rate per CBM or per W/M (whichever is greater), and destination terminal handling. For shipments at this scale, the difference between forwarders is typically in sailing frequency and cargo readiness timing rather than rate. Ensure your cargo is delivered to the origin CFS at least 2-3 days before the consolidation cut-off to secure placement on the intended departure. Confirm insurance coverage matches the declared cargo value and that the policy covers warehouse-to-warehouse transit including CFS storage periods at both ends.`;
      }
      return `This ${cbmStr} CBM shipment warrants a dedicated container to protect against co-mingling risks and reduce handling touchpoints compared to LCL consolidation. Request a complete freight cost breakdown from your forwarder that separates the ocean freight rate from local charges including THC, documentation fees, and any fuel surcharges (BAF/CAF). Compare all-in quotes from at least two forwarders to identify cost drivers specific to this lane. Verify that your insurance coverage matches the full declared cargo value and covers the complete transit from origin warehouse to final destination. Pay attention to free time allowances at destination to avoid unexpected detention and demurrage charges if cargo clearance is delayed.`;
  }
}

function buildRecommendationRationale(
  clientType: ClientType,
  strategy: LogisticsStrategy,
  strategyRationale: string,
  incoterm: string,
  overrideApplied: boolean,
  cargoScale: CargoScale,
  decisionGoal?: string
): string {
  const overrideNote = overrideApplied 
    ? "User-selected shipment type was overridden due to physical/engineering constraints. " 
    : "";
  
  const isSimple = cargoScale === "SMALL_CONSOLIDATED" || cargoScale === "STANDARD_LCL";
  const goalContext = buildDecisionGoalContext(strategy, decisionGoal, cargoScale);
  
  switch (clientType) {
    case "freight_forwarder":
      if (isSimple) {
        return `${overrideNote}${strategyRationale} ${goalContext} Standard consolidation process applies for this cargo profile. Confirm cargo dimensions and actual weight with the shipper before quoting to avoid W/M discrepancies that erode margin on small shipments. Obtain the current consolidation rate from your co-loader or direct CFS operator including all local charges at both origin and destination. Coordinate cargo delivery to origin CFS within the consolidation cut-off window, and communicate the cut-off clearly to the shipper to prevent late delivery penalties. Documentation must be complete and accurate at booking: commercial invoice, packing list, and HS codes verified against destination customs requirements.`;
      }
      if (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER") {
        return `${overrideNote}${strategyRationale} ${goalContext} Under ${incoterm} terms, quote defensibility depends on capturing every cost element in the initial rate build. Obtain lump-sum quotes from carriers that explicitly include crane hire, stevedoring, lashing materials, and marine survey fees. Rate validity on breakbulk is typically 7-14 days compared to 30 days on container; build this into your quoting timeline. Confirm allocation with the carrier OOG or project desk in writing before presenting the rate to your client, and include re-booking penalties in your terms of service.`;
      }
      return `${overrideNote}${strategyRationale} ${goalContext} Under ${incoterm} terms, execution responsibility requires carrier coordination across booking, documentation, and cargo loading milestones. Obtain written rate confirmations with explicit validity periods and document any tariff surcharge assumptions. Monitor local charges exposure at origin and destination to prevent margin erosion from THC adjustments, CFS handling fee changes, or fuel surcharge revisions. Track carrier allocation commitments and confirm space on the nominated vessel before issuing the booking confirmation to your client.`;
    
    case "project_cargo":
      if (isSimple) {
        return `${overrideNote}${strategyRationale} ${goalContext} Standard handling applies for this cargo profile with no specialized engineering review required. Confirm packaging specifications are adequate for CFS handling and standard container loading procedures.`;
      }
      if (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER") {
        return `${overrideNote}${strategyRationale} ${goalContext} Engineering feasibility must be confirmed through independent pre-shipment survey before any carrier commitment. The survey report must validate piece weights, dimensions, center-of-gravity calculations, and lift point specifications. Method statement and lashing plan approval by the carrier are gate requirements that must be completed before cargo ready date. Port infrastructure verification at both load and discharge ports must confirm berth depth, quay load capacity, and crane reach and lift capacity for each piece. Stowage approval from the carrier requires GA drawings showing cargo placement, securing arrangements, and weight distribution across the vessel.`;
      }
      return `${overrideNote}${strategyRationale} ${goalContext} Standard container handling applies with focus on cargo protection and documentation accuracy. Verify packaging specifications are appropriate for the number of handling touchpoints in the transit chain.`;
    
    case "importer_exporter":
    default:
      if (isSimple) {
        return `${overrideNote}${strategyRationale} ${goalContext} For this shipment, work with a single forwarder who can provide end-to-end service from origin to destination. Verify the quoted rate includes all handling charges including origin CFS fees, THC at both ports, and destination terminal handling to avoid cost surprises at delivery. Confirm the sailing schedule and expected transit time in writing, and ensure your cargo is ready for collection at least 2-3 days before the consolidation cut-off date. Review your marine cargo insurance to confirm warehouse-to-warehouse coverage including CFS storage periods at origin and destination.`;
      }
      if (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER") {
        return `${overrideNote}${strategyRationale} ${goalContext} Under ${incoterm} terms, your cost exposure on specialized cargo is significantly higher than standard container shipments. Require your forwarder to provide fully itemized pricing that separates ocean freight, crane hire, rigging, stevedoring, lashing, and marine survey as distinct line items. Each of these components is independently negotiable and should be benchmarked. Confirm that your insurance policy explicitly covers heavy-lift operations, on-deck stowage if applicable, and any specialized handling equipment used during loading and discharge.`;
      }
      return `${overrideNote}${strategyRationale} ${goalContext} Under ${incoterm} terms, your logistics provider must deliver transparent pricing with clear service commitments. Request a freight cost breakdown that separates ocean freight from local charges including THC, documentation fees, and surcharges. Compare all-in quotes from at least two forwarders to identify lane-specific cost drivers. Verify that free time allowances at destination provide adequate clearance time to avoid detention and demurrage charges, particularly when customs clearance delays are foreseeable.`;
  }
}

// Build decision goal-specific context explaining what mistake is avoided and value delivered
function buildDecisionGoalContext(strategy: LogisticsStrategy, decisionGoal?: string, cargoScale?: CargoScale): string {
  if (!decisionGoal) return "";
  
  const isLCL = strategy === "LCL";
  const isFCL = strategy === "FCL" || strategy === "ENTERPRISE_FCL";
  const isSimple = cargoScale === "SMALL_CONSOLIDATED" || cargoScale === "STANDARD_LCL";
  
  switch (decisionGoal) {
    case "avoid_overpaying":
      if (isLCL) {
        return "This approach eliminates the common mistake of booking more container space than required. LCL consolidation means you pay only for the cubic meters used, avoiding 40-60% wasted container capacity.";
      }
      if (isFCL) {
        return "Full container allocation at this volume achieves better per-CBM economics than LCL. The mistake being avoided is paying premium consolidation fees when dedicated container capacity is cost-effective.";
      }
      return "This strategy optimizes cost exposure by matching transport method to cargo profile.";
    
    case "avoid_delays":
      if (isLCL) {
        return "LCL via reliable consolidators provides schedule predictability without booking minimum commitments. The risk being reduced is cargo rollovers from irregular booking patterns.";
      }
      if (isFCL) {
        return "Dedicated container booking provides schedule priority and eliminates consolidation delays. This removes the disruption risk of CFS cargo rollovers during peak seasons.";
      }
      return "This strategy prioritizes transit reliability and schedule certainty.";
    
    case "validate_strategy":
      if (isLCL && isSimple) {
        return "This analysis confirms LCL is the correct approach for this cargo profile. Attempting FCL at this volume would result in paying for unused container capacity.";
      }
      if (isFCL) {
        return "This analysis validates FCL as the appropriate strategy. The cargo volume justifies dedicated container allocation and avoids the handling complexity of consolidation.";
      }
      return "This analysis validates the selected strategy against physical cargo constraints and commercial realities.";
    
    case "reduce_risk":
      if (isLCL) {
        return "LCL through vetted consolidators reduces cargo damage exposure through professional CFS handling. The operational risk being mitigated is cargo mishandling from inexperienced warehouse operations.";
      }
      if (isFCL) {
        return "Full container allocation reduces handling touchpoints and cargo damage risk. Dedicated equipment eliminates co-mingling exposure with other shippers' cargo.";
      }
      return "This strategy minimizes operational risk exposure through appropriate handling controls.";
    
    case "project_planning":
      return "This analysis provides the foundation for project logistics execution. Method statements, equipment specifications, and carrier requirements are defined based on validated cargo parameters.";
    
    default:
      return "";
  }
}

function buildNextActions(
  clientType: ClientType,
  strategy: LogisticsStrategy,
  isOOG: boolean,
  isHeavy: boolean,
  charterConsideration: boolean,
  cargoScale: CargoScale
): string[] {
  // B4: Simple actions for small cargo - NO rollover, backup carriers, milestone escalations
  const isSimple = cargoScale === "SMALL_CONSOLIDATED" || cargoScale === "STANDARD_LCL";
  
  switch (clientType) {
    case "freight_forwarder":
      if (isSimple) {
        return [
          "Confirm cargo dimensions and actual weight with shipper; verify W/M chargeable weight.",
          "Obtain consolidation rate including all local charges at origin and destination.",
          "Coordinate cargo delivery to origin CFS before consolidation cut-off.",
          "Prepare documentation: commercial invoice, packing list, HS codes verified against destination requirements."
        ];
      }
      const ffActions = [
        "Obtain written rate confirmation with validity period and surcharge assumptions.",
        "Confirm carrier space allocation on nominated vessel and obtain booking reference.",
        "Prepare complete documentation package: SI, commercial invoice, packing list, HS codes."
      ];
      if (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER") {
        ffActions.unshift("Coordinate with carrier OOG/project desk for slot confirmation and equipment availability.");
        ffActions.push("Confirm port crane capacity and stevedoring arrangements at both load and discharge.");
      }
      if (charterConsideration) {
        ffActions.push("Obtain charter fixture terms and compare total cost against liner breakbulk options.");
      }
      return ffActions.slice(0, 6);
    
    case "project_cargo":
      if (isSimple) {
        return [
          "Confirm cargo dimensions and packaging.",
          "Obtain freight quote from consolidator.",
          "Ensure adequate packaging for standard handling."
        ];
      }
      const pcActions = [
        "Commission certified dimension and weight survey before cargo ready date.",
        "Obtain approved lashing and securing plan from marine surveyor.",
        "Confirm port crane capacity and heavy-lift equipment availability."
      ];
      if (charterConsideration) {
        pcActions.push("Evaluate charter options and obtain indicative rates.");
      }
      if (isOOG) {
        pcActions.push("Verify vessel OOG capacity and obtain carrier slot confirmation.");
      }
      if (isHeavy) {
        pcActions.push("Confirm rigging plan and lifting equipment specifications.");
      }
      pcActions.push("Arrange marine cargo insurance with agreed value clause.");
      return pcActions.slice(0, 6);
    
    case "importer_exporter":
    default:
      if (isSimple) {
        // B4/B5: Simple, actionable guidance for small cargo importers
        return [
          "Request all-in freight quote from your forwarder (origin to destination).",
          "Verify the quote includes origin CFS/THC and destination terminal handling.",
          "Confirm cargo is ready and delivered to origin on time.",
          "Ensure insurance coverage matches cargo value."
        ];
      }
      const ieActions = [
        "Request itemized freight cost breakdown from your forwarder.",
        "Confirm insurance coverage matches declared cargo value.",
        "Verify transit time commitment and obtain booking confirmation."
      ];
      if (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER") {
        ieActions.unshift("Request survey and lashing plan costs as separate line items.");
        ieActions.push("Confirm specialized handling charges are included in quoted rates.");
      }
      return ieActions.slice(0, 5);
  }
}

// ============ HOLD_FOR_VALIDATION REPORT BUILDER ============
function buildHoldForValidationReport(
  intake: any,
  clientType: ClientType,
  cargoClass: CargoClass,
  totalCBM: number,
  totalWeightKg: number,
  dataQualityIssues: DataQualityIssue[],
  holdReason: string
): LBIAReport {
  return {
    agent_version: "LBIA-1.0",
    report_type: "LBIA_DECISION_BRIEF",
    
    analysis_context: {
      client_type: clientType,
      audience_label: "Pending Validation",
      incoterm: intake.incoterm || "FOB",
      control_level: "Pending",
      cargo_class: cargoClass,
      cargo_scale: "SMALL_CONSOLIDATED",
      cargo_scale_reason: "Data validation required before classification.",
      is_simple_shipment: true,
      total_cbm: Math.round(totalCBM * 100) / 100,
      total_weight_kg: Math.round(totalWeightKg * 10) / 10,
      origin: intake.origin_region || intake.pol || "Origin",
      destination: intake.destination_region || intake.pod || "Destination",
      mode: intake.mode || "SEA",
      priority: intake.priority || "balanced"
    },
    
    feasibility_determination: {
      physical_feasibility: false,
      engineering_feasibility: false,
      override_applied: true,
      override_reason: holdReason,
      dominant_risk_domains: []
    },
    
    selected_strategy: {
      strategy: "HOLD_FOR_VALIDATION",
      strategy_label: "Hold for Data Validation",
      rationale: holdReason,
      equipment_recommendation: null,
      container_count: null,
      charter_type: null
    },
    
    discarded_alternatives: [],
    engineering_considerations: null,
    business_impact: holdReason,
    recommendation_rationale: "Input data requires clarification before logistics analysis can proceed. Please review and confirm the cargo specifications.",
    next_actions: ["Verify cargo weight and dimensions", "Confirm unit count and packaging details", "Resubmit with corrected specifications"],
    
    data_quality: {
      validated: false,
      issues: dataQualityIssues,
      hold_reason: holdReason
    },
    
    vocabulary_compliance: {
      validated: true,
      violations: []
    },
    
    eljl: null,
    
    dense_cargo_advisory: null,
    
    lane_profile: null,
    
    risk_score: 0
  };
}

// ============ MAIN LBIA FUNCTION ============
export function runLBIAAnalysis(
  engineOutput: any,
  intake: any
): LBIAReport {
  const clientType: ClientType = intake.client_type || "importer_exporter";
  const cargoClass: CargoClass = engineOutput.cargo_classification?.cargo_class || "GENERAL";
  
  // Extract metrics
  const totalCBM = engineOutput.cargo_metrics?.total_cbm || 0;
  const totalWeightKg = engineOutput.cargo_metrics?.total_weight_kg || 0;
  const maxDims = engineOutput.cargo_metrics?.max_piece_dimensions_m || { length: 0, width: 0, height: 0 };
  const maxPieceWeightKg = engineOutput.cargo_metrics?.max_piece_weight_kg || 0;
  const unitCount = intake.units_count || 1;
  
  const incoterm = engineOutput.incoterm_context?.incoterm || "FOB";
  const controlLevel = engineOutput.incoterm_context?.control_level || "Origin Only";
  const charterConsideration = engineOutput.equipment_decision?.charter_consideration || false;
  
  // ============ C) DATA QUALITY SANITY GATE ============
  // Detect heavy cargo - allows higher density thresholds for project/heavy cargo
  const isHeavyCargo = cargoClass === "HEAVY" || cargoClass === "OOG" || 
    maxPieceWeightKg > 5000 || intake.shipment_type === "breakbulk" || intake.service_type === "breakbulk";
  
  // Pass dimensions from intake for validation (missing/zero dimensions trigger HOLD)
  const intakeDimensions = unitCount > 0 ? {
    length: intake.unit_length || 0,
    width: intake.unit_width || 0,
    height: intake.unit_height || 0
  } : undefined;
  
  const dataQualityIssues = validateDataQuality(totalCBM, totalWeightKg, totalCBM, unitCount, maxPieceWeightKg, isHeavyCargo, intakeDimensions);
  const hasDataQualityErrors = dataQualityIssues.some(i => i.severity === "ERROR");
  
  // If data quality fails → HOLD_FOR_VALIDATION
  if (hasDataQualityErrors) {
    const holdReason = dataQualityIssues.find(i => i.severity === "ERROR")?.issue || HOLD_FOR_VALIDATION_MESSAGES.general;
    return buildHoldForValidationReport(intake, clientType, cargoClass, totalCBM, totalWeightKg, dataQualityIssues, holdReason);
  }
  
  // Determine if physical/engineering override was applied
  const userSelectedType = engineOutput.feasibility?.user_selected_type || "FCL";
  const overrideApplied = !engineOutput.feasibility?.shipment_type_feasible;
  const overrideReason = overrideApplied 
    ? engineOutput.feasibility?.feasibility_warnings?.[0] || "Cargo profile requires different logistics approach"
    : null;
  
  // Select primary strategy using hierarchy
  const { strategy, rationale, discarded } = selectPrimaryStrategy(
    cargoClass,
    totalCBM,
    totalWeightKg,
    maxDims.length,
    maxDims.width,
    maxDims.height,
    maxPieceWeightKg,
    userSelectedType,
    charterConsideration
  );
  
  // Determine OOG/Heavy flags
  const isOOG = cargoClass === "OOG" || maxDims.height > 2.69 || maxDims.width > 2.35 || maxDims.length > 13.55;
  const isHeavy = cargoClass === "HEAVY" || maxPieceWeightKg >= 5000;
  
  // B1: CARGO SCALE CLASSIFICATION (computed ONCE and stored in output)
  const cargoScaleClassification = classifyCargoScale(totalCBM, totalWeightKg, cargoClass, isOOG, isHeavy);
  const cargoScale = cargoScaleClassification.cargo_scale;
  
  // Select dominant risk domains
  const dominantRiskDomains = selectDominantRiskDomains(cargoClass, isOOG, isHeavy, strategy, clientType);
  
  // Build strategy label
  const strategyLabels: Record<LogisticsStrategy, string> = {
    "LCL": "Less than Container Load (LCL)",
    "FCL": "Full Container Load (FCL)",
    "ENTERPRISE_FCL": "Enterprise Multi-Container Program",
    "BREAKBULK_HEAVY_LIFT": "Breakbulk / Heavy-Lift",
    "CHARTER": "Charter Vessel",
    "HOLD_FOR_VALIDATION": "Hold for Data Validation"
  };
  
  // Build audience label
  const audienceLabels: Record<ClientType, string> = {
    "importer_exporter": "Importer / Exporter",
    "freight_forwarder": "Freight Forwarder / NVOCC",
    "project_cargo": "Project Cargo / EPC / Heavy Lift"
  };
  
  // Equipment recommendation (only for container strategies)
  let equipmentRec: string | null = null;
  let containerCount: number | null = null;
  
  if (strategy === "FCL") {
    if (totalCBM <= CONTAINER_CBM["20GP"]) { equipmentRec = "20GP Standard Container"; containerCount = 1; }
    else if (totalCBM <= CONTAINER_CBM["40GP"]) { equipmentRec = "40GP Standard Container"; containerCount = 1; }
    else if (totalCBM <= CONTAINER_CBM["45HC"]) { equipmentRec = "45HC High Cube Container"; containerCount = 1; }
    else { containerCount = Math.ceil(totalCBM / CONTAINER_CBM["40GP"]); equipmentRec = `${containerCount}x 40GP Containers`; }
  } else if (strategy === "ENTERPRISE_FCL") {
    containerCount = Math.ceil(totalCBM / CONTAINER_CBM["40GP"]);
    equipmentRec = `${containerCount}x 40GP/40HC (Contract Booking)`;
  } else if (strategy === "BREAKBULK_HEAVY_LIFT") {
    const eqOptions = engineOutput.equipment_decision?.recommended_equipment || [];
    const recEquip = eqOptions.find((e: any) => e.suitability === "RECOMMENDED");
    equipmentRec = recEquip?.equipment_type || "Flat Rack / Open Top / Breakbulk";
  } else if (strategy === "CHARTER") {
    equipmentRec = "Charter Vessel with Ship's Gear";
  }
  
  // Charter type
  let charterType: "PARTIAL" | "FULL" | null = null;
  if (strategy === "CHARTER") {
    charterType = totalCBM > 500 || totalWeightKg > 1000000 ? "FULL" : "PARTIAL";
  }
  
  // Engineering considerations (only for applicable strategies)
  let engineeringConsiderations = null;
  if (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER" || isOOG || isHeavy) {
    const surveys: string[] = [];
    if (isOOG || isHeavy) surveys.push("Dimension and weight survey");
    if (isHeavy) surveys.push("Lifting/rigging plan");
    surveys.push("Lashing and securing plan");
    if (strategy === "CHARTER") surveys.push("Pre-shipment cargo inspection");
    
    engineeringConsiderations = {
      applicable: true,
      lifting_handling: isHeavy ? `Maximum piece weight ${(maxPieceWeightKg/1000).toFixed(1)}t requires heavy-lift crane capacity confirmation at both ports.` : null,
      port_capability: (strategy === "BREAKBULK_HEAVY_LIFT" || strategy === "CHARTER") 
        ? "Confirm port has adequate berth depth, crane capacity, and specialized handling equipment."
        : null,
      stowage_lashing: isOOG 
        ? "Out-of-gauge cargo requires approved lashing plan and carrier slot confirmation."
        : "Standard stowage applies with appropriate securing.",
      surveys_required: surveys
    };
  }
  
  // Build audience-specific content (B4: with cargo scale for proportional language)
  const businessImpact = buildBusinessImpact(clientType, strategy, cargoClass, totalCBM, engineOutput.risk_score || 0, cargoScale);
  const recommendationRationale = buildRecommendationRationale(clientType, strategy, rationale, incoterm, overrideApplied, cargoScale, intake.decision_goal);
  const nextActions = buildNextActions(clientType, strategy, isOOG, isHeavy, charterConsideration, cargoScale);
  
  // Generate ELJL - Executive Logistics Judgment Layer (v3)
  const eljlOutput = generateELJL(
    strategy,
    cargoScale,
    totalCBM,
    totalWeightKg,
    maxPieceWeightKg,
    clientType,
    intake.origin_region || intake.pol || "Origin",
    intake.destination_region || intake.pod || "Destination",
    incoterm
  );
  
  return {
    agent_version: "LBIA-1.0",
    report_type: "LBIA_DECISION_BRIEF",
    
    analysis_context: {
      client_type: clientType,
      audience_label: audienceLabels[clientType],
      incoterm,
      control_level: controlLevel,
      cargo_class: cargoClass,
      cargo_scale: cargoScale,                                   // B1: Cargo scale classification
      cargo_scale_reason: cargoScaleClassification.cargo_scale_reason, // B1: Why this classification
      is_simple_shipment: cargoScaleClassification.is_simple_shipment, // B1: TRUE = no enterprise/project language
      total_cbm: Math.round(totalCBM * 100) / 100,
      total_weight_kg: Math.round(totalWeightKg * 10) / 10,
      origin: intake.origin_region || intake.pol || "Origin",
      destination: intake.destination_region || intake.pod || "Destination",
      mode: intake.mode || "SEA",
      priority: intake.priority || "balanced"
    },
    
    feasibility_determination: {
      physical_feasibility: !isOOG && maxPieceWeightKg <= 26000,
      engineering_feasibility: strategy !== "CHARTER",
      override_applied: overrideApplied,
      override_reason: overrideReason,
      dominant_risk_domains: dominantRiskDomains
    },
    
    selected_strategy: {
      strategy,
      strategy_label: strategyLabels[strategy],
      rationale,
      equipment_recommendation: equipmentRec,
      container_count: containerCount,
      charter_type: charterType
    },
    
    discarded_alternatives: discarded,
    
    engineering_considerations: engineeringConsiderations,
    
    business_impact: businessImpact,
    
    recommendation_rationale: recommendationRationale,
    
    next_actions: nextActions,
    
    // Section 9: Data Quality (no errors at this point)
    data_quality: {
      validated: true,
      issues: dataQualityIssues,
      hold_reason: null
    },
    
    // Section 10: Vocabulary Compliance - validate ALL narrative sections including ELJL
    vocabulary_compliance: (() => {
      const allNarrativeText = [
        businessImpact,
        recommendationRationale,
        rationale,
        ...nextActions,
        engineeringConsiderations?.lifting_handling || "",
        engineeringConsiderations?.port_capability || "",
        engineeringConsiderations?.stowage_lashing || "",
        eljlOutput.executive_context || "",
        eljlOutput.executive_judgment?.confidence_statement || "",
        eljlOutput.executive_judgment?.executive_rationale || "",
        eljlOutput.executive_judgment?.commercial_summary || "",
        eljlOutput.commercial_guidance?.cost_range_estimate || "",
        eljlOutput.commercial_guidance?.market_context || ""
      ].join(" ");
      const vocabViolations = validateVocabulary(allNarrativeText, strategy, cargoScale);
      const eljlPhraseViolations = validateELJLPhrases(allNarrativeText);
      const allViolations = [
        ...vocabViolations,
        ...eljlPhraseViolations.violations.map(v => ({ term: v, context: "", violation_type: "ELJL_BANNED_PHRASE" as const }))
      ];
      return {
        validated: allViolations.length === 0,
        violations: vocabViolations
      };
    })(),
    
    // Section 11: ELJL - Executive Logistics Judgment Layer (v3)
    eljl: eljlOutput,
    
    // Section 12: Dense Cargo Advisory
    dense_cargo_advisory: (() => {
      const density = totalCBM > 0 ? totalWeightKg / totalCBM : 0;
      const dense = isDenseCargo(totalCBM, totalWeightKg);
      return {
        is_dense: dense,
        density_kg_per_cbm: Math.round(density),
        advisory_message: dense ? getDenseCargoAdvisory(density) : null
      };
    })(),
    
    // Section 13: Lane Profile (route intelligence from engine)
    lane_profile: engineOutput.lane_profile || null,
    
    risk_score: engineOutput.risk_score || 0
  };
}
