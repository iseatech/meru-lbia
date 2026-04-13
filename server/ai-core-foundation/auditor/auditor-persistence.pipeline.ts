import { eventBus } from "../events/event-bus";
import { AiCoreEvent } from "../events/event-types";
import { auditorStoreService } from "./auditor-store.service";

let initialized = false;

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

function eventType(input: unknown): string | null {
  if (!isObject(input)) {
    return null;
  }
  const value = input.type;
  return typeof value === "string" ? value : null;
}

async function persistNotificationIfMissing(event: AiCoreEvent | Record<string, unknown>): Promise<void> {
  const type = eventType(event);
  if (type === "notification.recorded") {
    await auditorStoreService.persistNotification(event);
  }
}

async function persistByEventType(event: AiCoreEvent | Record<string, unknown>): Promise<void> {
  const type = eventType(event);
  if (!type) {
    await auditorStoreService.persistSystemHealthWarning("auditor.pipeline", "Event without type ignored", {
      event,
    });
    return;
  }

  switch (type) {
    case "audit.bootstrap":
    case "audit.recorded":
      await auditorStoreService.persistAuditSession(event);
      await auditorStoreService.persistAssistantSnapshot(event);
      break;

    case "task.started":
    case "phase.started":
    case "phase.completed":
    case "phase.failed":
    case "ledger-writer":
    case "ledger-feedback":
    case "ledger-outcome":
    case "calibration-proposal":
      await auditorStoreService.persistExecutionEvent(event);
      await auditorStoreService.persistAssistantSnapshot(event);
      break;

    case "learning.captured": {
      await auditorStoreService.persistExecutionEvent(event);
      const signalType = isObject(event) ? event.signalType : undefined;
      if (signalType === "drift") {
        await auditorStoreService.persistDeviation(event);
      }
      break;
    }

    case "runtime.health": {
      await auditorStoreService.persistSystemHealth(event);
      const status = isObject(event) ? event.status : undefined;
      if (status === "degraded" || status === "failed") {
        await auditorStoreService.persistAlert(event);
        await auditorStoreService.persistNotification({
          type: "notification.recorded",
          source: "runtime.health",
          status,
          timestamp: new Date().toISOString(),
          event,
        });
      }
      break;
    }

    case "system.health.warning":
      await auditorStoreService.persistSystemHealth(event);
      break;

    case "notification.recorded":
      await auditorStoreService.persistNotification(event);
      break;

    default:
      break;
  }

  await persistNotificationIfMissing(event);
}

async function persistWithGuard(event: AiCoreEvent | Record<string, unknown>): Promise<void> {
  try {
    await persistByEventType(event);
  } catch (error) {
    console.warn("[meru-auditor] persistence warning:", error);
    try {
      await auditorStoreService.persistSystemHealthWarning("auditor.pipeline.persistWithGuard", error, {
        eventType: eventType(event),
      });
    } catch (persistError) {
      console.warn("[meru-auditor] system-health warning persist failed:", persistError);
    }
  }
}

export async function initializeAuditorPersistencePipeline(): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;

  await auditorStoreService.ensureStorage();

  const subscribedEventTypes = [
    "task.started",
    "phase.started",
    "phase.completed",
    "phase.failed",
    "learning.captured",
    "audit.bootstrap",
    "audit.recorded",
    "runtime.health",
    "ledger-writer",
    "ledger-feedback",
    "ledger-outcome",
    "calibration-proposal",
    "notification.recorded",
    "system.health.warning",
  ] as const;

  for (const type of subscribedEventTypes) {
    eventBus.subscribe(type as AiCoreEvent["type"], async (event) => {
      await persistWithGuard(event);
    });
  }
}

export async function getAssistantPersistedState() {
  return auditorStoreService.getAssistantState();
}
