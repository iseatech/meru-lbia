import { randomUUID } from "node:crypto";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
  startedAt: string;
  tags: Record<string, string>;
}

export function createTraceContext(
  input: Partial<Pick<TraceContext, "parentSpanId" | "tags">> = {},
): TraceContext {
  const now = new Date().toISOString();

  return {
    traceId: randomUUID(),
    spanId: randomUUID(),
    parentSpanId: input.parentSpanId,
    correlationId: randomUUID(),
    startedAt: now,
    tags: input.tags ?? {},
  };
}

export function createChildTraceContext(
  parent: TraceContext,
  tags: Record<string, string> = {},
): TraceContext {
  return {
    traceId: parent.traceId,
    spanId: randomUUID(),
    parentSpanId: parent.spanId,
    correlationId: parent.correlationId,
    startedAt: new Date().toISOString(),
    tags: { ...parent.tags, ...tags },
  };
}
