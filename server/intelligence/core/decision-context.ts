import type { DecisionContext, DecisionInput, AudienceType } from "./types";

/**
 * buildDecisionContext
 * Construye el contexto base de decisión a partir del intake.
 * NO aplica reglas ni heurísticas todavía.
 */
export function buildDecisionContext(intake: any): DecisionContext {
  const input: DecisionInput = { intake };

  const audience_type: AudienceType =
    (intake?.audience_type as AudienceType) || "unknown";

  return {
    input,
    audience_type,
    incoterm_context: undefined,
    lane_context: undefined,
    client_context: undefined,
    guards_triggered: []
  };
}
