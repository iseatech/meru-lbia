export type AiCorePhase =
  | "bootstrap"
  | "trace"
  | "learning"
  | "audit"
  | "runtime";

export type AiCoreSeverity = "debug" | "info" | "warn" | "error";

export interface AiCoreEventBase {
  id: string;
  type: string;
  phase: AiCorePhase;
  timestamp: string;
  severity: AiCoreSeverity;
  correlationId?: string;
}

export interface AiCoreLifecycleEvent extends AiCoreEventBase {
  type: "phase.started" | "phase.completed" | "phase.failed";
  phaseName: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface AiCoreLearningEvent extends AiCoreEventBase {
  type: "learning.captured";
  signalType: "feedback" | "outcome" | "drift";
  payload: Record<string, unknown>;
}

export interface AiCoreAuditEvent extends AiCoreEventBase {
  type: "audit.bootstrap" | "audit.recorded";
  actor: string;
  action: string;
  details?: Record<string, unknown>;
}

export interface AiCoreHealthEvent extends AiCoreEventBase {
  type: "runtime.health";
  status: "ok" | "degraded" | "failed";
  checks: Record<string, boolean>;
}

export type AiCoreEvent =
  | AiCoreLifecycleEvent
  | AiCoreLearningEvent
  | AiCoreAuditEvent
  | AiCoreHealthEvent;

export type AiCoreEventHandler<T extends AiCoreEvent = AiCoreEvent> = (
  event: T,
) => void | Promise<void>;
