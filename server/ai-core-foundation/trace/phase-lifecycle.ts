import { randomUUID } from "node:crypto";
import { eventBus } from "../events/event-bus";
import { AiCorePhase } from "../events/event-types";
import { TraceContext } from "./trace-context";

function baseEvent(phase: AiCorePhase, trace: TraceContext) {
  return {
    id: randomUUID(),
    phase,
    timestamp: new Date().toISOString(),
    severity: "info" as const,
    correlationId: trace.correlationId,
  };
}

export async function publishPhaseStarted(
  phase: AiCorePhase,
  phaseName: string,
  trace: TraceContext,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await eventBus.publish({
    ...baseEvent(phase, trace),
    type: "phase.started",
    phaseName,
    metadata,
  });
}

export async function publishPhaseCompleted(
  phase: AiCorePhase,
  phaseName: string,
  trace: TraceContext,
  durationMs: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await eventBus.publish({
    ...baseEvent(phase, trace),
    type: "phase.completed",
    phaseName,
    durationMs,
    metadata,
  });
}

export async function publishPhaseFailed(
  phase: AiCorePhase,
  phaseName: string,
  trace: TraceContext,
  error: unknown,
): Promise<void> {
  await eventBus.publish({
    ...baseEvent(phase, trace),
    type: "phase.failed",
    phaseName,
    severity: "error",
    metadata: {
      errorMessage: error instanceof Error ? error.message : String(error),
    },
  });
}
