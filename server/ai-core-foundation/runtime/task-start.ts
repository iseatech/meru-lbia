import { randomUUID } from "node:crypto";
import { eventBus } from "../events/event-bus";

export interface TaskStartInput {
  taskId: string;
  correlationId?: string;
  details?: Record<string, unknown>;
}

export async function emitTaskStart(input: TaskStartInput): Promise<void> {
  await eventBus.publish({
    id: randomUUID(),
    type: "task.started",
    phase: "runtime",
    timestamp: new Date().toISOString(),
    severity: "info",
    correlationId: input.correlationId,
    taskType: "decision-workflow",
    taskId: input.taskId,
    details: input.details,
  });
}
