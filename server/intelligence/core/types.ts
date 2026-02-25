/**
 * Meru LBIA Core R&D — Types
 * NOTE: Structural types only. No business logic here.
 */

export type AudienceType =
  | "3pl"
  | "freight_forwarder"
  | "customs_broker"
  | "amazon_seller"
  | "importer_exporter"
  | "procurement_team"
  | "oil_gas_logistics"
  | "supply_chain"
  | "unknown";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface DecisionInput {
  /** Original intake payload coming from service forms */
  intake: unknown;

  /** Optional trace id for debugging / audit */
  trace_id?: string;

  /** Future: indicate which audience/niche to tailor narrative */
  audience_type?: AudienceType;

  /** Optional note when human-in-the-loop overrides occur */
  override_note?: string;
}

export interface DecisionContext {
  input: DecisionInput;
  audience_type: AudienceType;
  incoterm_context?: unknown;
  lane_context?: unknown;
  client_context?: unknown;
  guards_triggered?: string[];
}

export interface DecisionResult {
  status: "success" | "warning" | "blocked";
  confidence_level: ConfidenceLevel;
  rationale: string;
  warnings?: string[];
  errors?: string[];
}

export interface DecisionBrief {
  summary: string;
  rationale: string;
  scenarios?: Record<string, unknown>;
  actions?: unknown[];
  takeaways?: string[];
}
