/**
 * HS normalizer (v1)
 * Goal: normalize into "####.##.##" when possible.
 * - Accepts: "8507.60.00", "85076000", "8507 60 00", "8507.6000", "850.760.000"
 * - Returns: normalized code + digits only + flags
 *
 * NOTE: This is not legal classification logic.
 */
export type NormalizedHs = {
  input: string;
  digits: string;            // only digits
  normalized?: string;       // ####.##.## (if >= 6 digits)
  is_valid_length: boolean;  // 6, 8, 10 digits common; we accept 6-10
  warnings: string[];
};

export function normalizeHsCode(input: string): NormalizedHs {
  const raw = String(input || "").trim();
  const digits = raw.replace(/\D/g, "");

  const warnings: string[] = [];
  if (!raw) warnings.push("HS code is empty.");
  if (digits.length === 0 && raw) warnings.push("No digits found in HS code.");

  // We accept 6 to 10 digits as "potentially valid" for our workflow
  const is_valid_length = digits.length >= 6 && digits.length <= 10;
  if (!is_valid_length && digits.length > 0) {
    warnings.push(`HS digits length (${digits.length}) is unusual. Expected 6–10 digits.`);
  }

  // Build normalized ####.##.## using first 8 digits when available, else 6
  let normalized: string | undefined;

  if (digits.length >= 8) {
    const d = digits.slice(0, 8);
    normalized = `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}`;
    if (digits.length > 8) warnings.push("Extra digits detected; using first 8 digits for display.");
  } else if (digits.length >= 6) {
    const d = digits.slice(0, 6);
    normalized = `${d.slice(0, 4)}.${d.slice(4, 6)}`;
    warnings.push("Only 6 digits provided; HTSUS may require 8–10 digits for U.S. duty determination.");
  }

  return { input: raw, digits, normalized, is_valid_length, warnings };
}
