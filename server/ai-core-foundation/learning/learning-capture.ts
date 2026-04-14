import { randomUUID } from "node:crypto";
import { eventBus } from "../events/event-bus";
import { TraceContext, createTraceContext } from "../trace/trace-context";

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

export function registerLearningCaptureReaction(): void {
  const ledgerEventTypes = [
    "ledger-writer",
    "ledger-feedback",
    "ledger-outcome",
  ] as const;

  for (const evType of ledgerEventTypes) {
    eventBus.subscribe(evType, async (event) => {
      const trace = createTraceContext({
        tags: { correlationId: event.correlationId ?? "" },
      });
      await captureLearningSignal(trace, {
        signalType: "outcome",
        payload: {
          sourceEvent: evType,
          ...(typeof event === "object" && event !== null ? event as Record<string, unknown> : {}),
        },
        severity: "info",
      });
    });
  }
}
