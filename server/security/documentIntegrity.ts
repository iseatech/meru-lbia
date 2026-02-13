import crypto from "crypto";
import QRCode from "qrcode";
import bwipjs from "bwip-js";
import { db } from "../db";
import { meruDocumentVerifications } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface VerificationCodeInput {
  briefId: string;
  userId: string;
  serviceType: string;
}

export function generateVerificationCode(input: VerificationCodeInput): {
  code: string;
  timestamp: string;
} {
  const now = new Date();
  const yyyy = now.getUTCFullYear().toString();
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = now.getUTCDate().toString().padStart(2, "0");
  const hh = now.getUTCHours().toString().padStart(2, "0");
  const mi = now.getUTCMinutes().toString().padStart(2, "0");
  const ss = now.getUTCSeconds().toString().padStart(2, "0");

  const dateStr = `${yyyy}${mm}${dd}`;
  const timeStr = `${hh}${mi}${ss}`;
  const timestampStr = `${dateStr}-${timeStr}`;
  const isoTimestamp = now.toISOString();

  const hashInput = `${input.briefId}${input.userId}${isoTimestamp}${input.serviceType}`;
  const hash = crypto.createHash("sha256").update(hashInput).digest("hex");
  const suffix = hash.substring(0, 8).toUpperCase();

  return {
    code: `MERU-${timestampStr}-${suffix}`,
    timestamp: isoTimestamp,
  };
}

export function computePdfSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function storeVerificationRecord(input: {
  briefId: string;
  userId: string;
  serviceType: string;
  verificationCode: string;
  pdfSha256: string;
}): Promise<void> {
  try {
    await db.insert(meruDocumentVerifications).values({
      briefId: input.briefId,
      userId: input.userId,
      serviceType: input.serviceType,
      verificationCode: input.verificationCode,
      pdfSha256: input.pdfSha256,
      status: "valid",
    });
  } catch (err) {
    console.error("Failed to store verification record:", err);
  }
}

export async function lookupVerification(code: string): Promise<{
  valid: boolean;
  issued_at?: string;
  service_type?: string;
} | null> {
  try {
    const [record] = await db
      .select()
      .from(meruDocumentVerifications)
      .where(eq(meruDocumentVerifications.verificationCode, code));

    if (!record) {
      return { valid: false };
    }

    if (record.status !== "valid") {
      return { valid: false };
    }

    return {
      valid: true,
      issued_at: record.createdAt?.toISOString(),
      service_type: record.serviceType,
    };
  } catch (err) {
    console.error("Verification lookup error:", err);
    return { valid: false };
  }
}

export async function getExistingVerification(briefId: string): Promise<{
  verificationCode: string;
  timestamp: string;
} | null> {
  try {
    const [record] = await db
      .select()
      .from(meruDocumentVerifications)
      .where(eq(meruDocumentVerifications.briefId, briefId));

    if (record && record.status === "valid") {
      return {
        verificationCode: record.verificationCode,
        timestamp: record.createdAt?.toISOString() || new Date().toISOString(),
      };
    }
    return null;
  } catch (err) {
    console.error("Failed to look up existing verification:", err);
    return null;
  }
}

export async function updatePdfHash(briefId: string, pdfSha256: string): Promise<void> {
  try {
    await db
      .update(meruDocumentVerifications)
      .set({ pdfSha256 })
      .where(eq(meruDocumentVerifications.briefId, briefId));
  } catch (err) {
    console.error("Failed to update PDF hash:", err);
  }
}

export async function generateBarcodePng(text: string): Promise<Buffer | null> {
  try {
    return await bwipjs.toBuffer({
      bcid: "code128",
      text,
      scale: 2,
      height: 10,
      includetext: true,
      textxalign: "center",
      textsize: 8,
    });
  } catch (err) {
    console.error("Barcode generation error:", err);
    return null;
  }
}

export async function generateQrPng(url: string): Promise<Buffer | null> {
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 120, margin: 1 });
    const base64 = dataUrl.split(",")[1];
    return Buffer.from(base64, "base64");
  } catch (err) {
    console.error("QR code generation error:", err);
    return null;
  }
}
