import { randomUUID } from "node:crypto";
import { eventBus } from "../events/event-bus";
import { TraceContext } from "../trace/trace-context";

export interface HealthCheck {
  name: string;
  probe: () => boolean | Promise<boolean>;
}

export async function runHealthProbe(
  trace: TraceContext,
  checks: HealthCheck[],
): Promise<{ status: "ok" | "degraded" | "failed"; checks: Record<string, boolean> }> {
  const results: Record<string, boolean> = {};

  for (const check of checks) {
    try {
      results[check.name] = await check.probe();
    } catch {
      results[check.name] = false;
    }
  }

  const values = Object.values(results);
  const passed = values.filter(Boolean).length;

  let status: "ok" | "degraded" | "failed" = "ok";
  if (passed === 0 && values.length > 0) {
    status = "failed";
  } else if (passed < values.length) {
    status = "degraded";
  }

  await eventBus.publish({
    id: randomUUID(),
    type: "runtime.health",
    phase: "runtime",
    timestamp: new Date().toISOString(),
    correlationId: trace.correlationId,
    severity: status === "failed" ? "error" : status === "degraded" ? "warn" : "info",
    status,
    checks: results,
  });

  return { status, checks: results };
}
