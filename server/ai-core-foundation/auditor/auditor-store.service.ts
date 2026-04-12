import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { AiCoreEvent } from "../events/event-types";

export type AuditorFileName =
  | "audit-sessions.jsonl"
  | "execution-events.jsonl"
  | "deviations.jsonl"
  | "alerts.jsonl"
  | "assistant-snapshots.jsonl"
  | "notifications.jsonl"
  | "system-health.jsonl";

interface AssistantState {
  latestSession: Record<string, unknown> | null;
  latestHealth: Record<string, unknown> | null;
  recentAlerts: Record<string, unknown>[];
  recentNotifications: Record<string, unknown>[];
  recentExecutionEvents: Record<string, unknown>[];
}

export class AuditorStoreService {
  private readonly storagePath: string;
  private readonly knownFiles: AuditorFileName[] = [
    "audit-sessions.jsonl",
    "execution-events.jsonl",
    "deviations.jsonl",
    "alerts.jsonl",
    "assistant-snapshots.jsonl",
    "notifications.jsonl",
    "system-health.jsonl",
  ];

  constructor(storagePath = process.env.MERU_AUDITOR_STORAGE_PATH ?? path.join(process.cwd(), ".meru-auditor")) {
    this.storagePath = storagePath;
  }

  async ensureStorage(): Promise<void> {
    await mkdir(this.storagePath, { recursive: true });
    await Promise.all(this.knownFiles.map((name) => this.appendJsonl(name, { type: "system.bootstrap", createdAt: new Date().toISOString() }, true)));
  }

  async persistAuditSession(event: AiCoreEvent | Record<string, unknown>): Promise<void> {
    await this.appendJsonl("audit-sessions.jsonl", this.wrapRecord("audit_session", event));
  }

  async persistExecutionEvent(event: AiCoreEvent | Record<string, unknown>): Promise<void> {
    await this.appendJsonl("execution-events.jsonl", this.wrapRecord("execution_event", event));
  }

  async persistDeviation(event: AiCoreEvent | Record<string, unknown>): Promise<void> {
    await this.appendJsonl("deviations.jsonl", this.wrapRecord("deviation", event));
  }

  async persistAlert(event: AiCoreEvent | Record<string, unknown>): Promise<void> {
    await this.appendJsonl("alerts.jsonl", this.wrapRecord("alert", event));
  }

  async persistAssistantSnapshot(event: AiCoreEvent | Record<string, unknown>): Promise<void> {
    await this.appendJsonl("assistant-snapshots.jsonl", this.wrapRecord("assistant_snapshot", event));
  }

  async persistNotification(event: AiCoreEvent | Record<string, unknown>): Promise<void> {
    await this.appendJsonl("notifications.jsonl", this.wrapRecord("notification", event));
  }

  async persistSystemHealth(event: AiCoreEvent | Record<string, unknown>): Promise<void> {
    await this.appendJsonl("system-health.jsonl", this.wrapRecord("system_health", event));
  }

  async persistSystemHealthWarning(source: string, warning: unknown, context?: Record<string, unknown>): Promise<void> {
    await this.persistSystemHealth({
      type: "system.health.warning",
      source,
      warning: warning instanceof Error ? warning.message : String(warning),
      context: context ?? {},
      timestamp: new Date().toISOString(),
    });
  }

  async getAssistantState(): Promise<AssistantState> {
    const [sessions, health, alerts, notifications, execution] = await Promise.all([
      this.readJsonl("audit-sessions.jsonl"),
      this.readJsonl("system-health.jsonl"),
      this.readJsonl("alerts.jsonl"),
      this.readJsonl("notifications.jsonl"),
      this.readJsonl("execution-events.jsonl"),
    ]);

    return {
      latestSession: sessions.at(-1) ?? null,
      latestHealth: health.at(-1) ?? null,
      recentAlerts: alerts.slice(-10),
      recentNotifications: notifications.slice(-10),
      recentExecutionEvents: execution.slice(-25),
    };
  }

  private wrapRecord(kind: string, event: unknown): Record<string, unknown> {
    return {
      kind,
      recordedAt: new Date().toISOString(),
      event,
    };
  }

  private async appendJsonl(fileName: AuditorFileName, payload: Record<string, unknown>, onlyWhenMissing = false): Promise<void> {
    const target = path.join(this.storagePath, fileName);
    const line = JSON.stringify(payload) + "\n";

    if (onlyWhenMissing) {
      try {
        await readFile(target, "utf8");
        return;
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : undefined;
        if (code !== "ENOENT") {
          console.warn("[meru-auditor] storage preflight warning:", error);
        }
        await appendFile(target, line, "utf8");
        return;
      }
    }

    await appendFile(target, line, "utf8");
  }

  private async readJsonl(fileName: AuditorFileName): Promise<Record<string, unknown>[]> {
    const target = path.join(this.storagePath, fileName);
    try {
      const raw = await readFile(target, "utf8");
      return raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line) as Record<string, unknown>;
          } catch {
            return { parseError: true, raw: line };
          }
        });
    } catch (error) {
      console.warn("[meru-auditor] readJsonl warning:", fileName, error);
      return [];
    }
  }
}

export const auditorStoreService = new AuditorStoreService();
