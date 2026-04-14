import { randomUUID } from "node:crypto";
import { eventBus } from "../events/event-bus";
import { TraceContext, createTraceContext } from "../trace/trace-context";

export interface AuditorConfig {
  actor: string;
  mode: "observe" | "enforce";
  version: string;
}

export async function bootstrapAuditor(
  trace: TraceContext,
  config: AuditorConfig,
): Promise<void> {
  await eventBus.publish({
    id: randomUUID(),
    type: "audit.bootstrap",
    phase: "audit",
    timestamp: new Date().toISOString(),
    correlationId: trace.correlationId,
    severity: "info",
    actor: config.actor,
    action: "bootstrap",
    details: {
      mode: config.mode,
      version: config.version,
    },
  });
}

export function registerAuditorBootstrapReaction(config: AuditorConfig): void {
  eventBus.subscribe("task.started", async (event) => {
    const trace = createTraceContext({
      tags: { correlationId: event.correlationId ?? "" },
    });
    await bootstrapAuditor(trace, config);
  });
}
