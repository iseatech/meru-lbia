import { randomUUID } from "node:crypto";
import { eventBus } from "../events/event-bus";
import { TraceContext } from "../trace/trace-context";

export interface LearningSignal {
  signalType: "feedback" | "outcome" | "drift";
  payload: Record<string, unknown>;
  severity?: "debug" | "info" | "warn" | "error";
}

export async function captureLearningSignal(
  trace: TraceContext,
  signal: LearningSignal,
): Promise<void> {
  await eventBus.publish({
    id: randomUUID(),
    type: "learning.captured",
    phase: "learning",
    timestamp: new Date().toISOString(),
    correlationId: trace.correlationId,
    severity: signal.severity ?? "info",
    signalType: signal.signalType,
    payload: signal.payload,
  });
}
