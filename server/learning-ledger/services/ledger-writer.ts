import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

export interface LearningLedgerEventInput {
  correlationId: string;
  eventType: string;
  userId?: string | null;
  serviceType?: string | null;
  decisionBriefId?: string | null;
  hsClassificationId?: string | null;
  payload?: JsonRecord | null;
  decisionSnapshot?: JsonRecord | null;
  complianceSnapshot?: JsonRecord | null;
}

export interface LearningLedgerDefaultsInput {
  correlationId: string;
  decisionBriefId?: string | null;
}

const DEFAULT_LEDGER_DIR = path.join(process.cwd(), ".meru-learning-ledger");
const LEDGER_EVENTS_FILE = "learning-events.jsonl";
const LEDGER_DEFAULTS_FILE = "learning-defaults.jsonl";

function getLedgerStoragePath(): string {
  return process.env.MERU_LEARNING_LEDGER_PATH?.trim() || DEFAULT_LEDGER_DIR;
}

async function appendJsonl(fileName: string, data: JsonRecord): Promise<void> {
  const storagePath = getLedgerStoragePath();
  await mkdir(storagePath, { recursive: true });
  const targetFile = path.join(storagePath, fileName);
  await appendFile(targetFile, JSON.stringify(data) + "\n", "utf8");
}

export async function writeLearningLedgerEvent(input: LearningLedgerEventInput): Promise<void> {
  const eventRecord: JsonRecord = {
    type: "ledger-writer",
    recordedAt: new Date().toISOString(),
    correlationId: input.correlationId,
    eventType: input.eventType,
    userId: input.userId ?? null,
    serviceType: input.serviceType ?? null,
    decisionBriefId: input.decisionBriefId ?? null,
    hsClassificationId: input.hsClassificationId ?? null,
    payload: input.payload ?? null,
    decisionSnapshot: input.decisionSnapshot ?? null,
    complianceSnapshot: input.complianceSnapshot ?? null,
  };

  await appendJsonl(LEDGER_EVENTS_FILE, eventRecord);
}

export async function writeLearningLedgerDefaults(input: LearningLedgerDefaultsInput): Promise<void> {
  const defaultsRecord: JsonRecord = {
    type: "ledger-feedback",
    recordedAt: new Date().toISOString(),
    correlationId: input.correlationId,
    decisionBriefId: input.decisionBriefId ?? null,
    feedbackStatus: "pending",
    outcomeStatus: "pending",
    calibrationStatus: "not-started",
  };

  await appendJsonl(LEDGER_DEFAULTS_FILE, defaultsRecord);
}
