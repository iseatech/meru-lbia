import fs from "node:fs";
import path from "node:path";

export type UsitcHtsRow = {
  htsno: string;
  indent?: number | string;
  description?: string;
  superior?: string;
  units?: string;
  general?: string;
  special?: string;
  other?: string;
  footnotes?: string;
  quotaQuantity?: string;
  additionalDuties?: any;
  addiitionalDuties?: any; // typo exists in some datasets
};

export type HtsIndex = {
  byCode: Map<string, UsitcHtsRow>;
  tokenToCodes: Map<string, Set<string>>;
};

const DEFAULT_DATA_PATH = path.join(
  process.cwd(),
  "server/intelligence/core/hs/data/hts_2026_rev4.json",
);

let cached: { index: HtsIndex; loadedAt: number } | null = null;

function normalizeCode(code: string): string {
  return String(code || "").trim();
}

function tokenize(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function isSpecialChapter(code: string): boolean {
  // Commonly, 98/99 are special provisions (e.g., 9902).
  return /^9[89]/.test(code.replace(/\./g, ""));
}

export function loadUsitcHtsIndex(filePath: string = DEFAULT_DATA_PATH): HtsIndex {
  if (cached) return cached.index;

  const raw = fs.readFileSync(filePath, "utf-8");
  const rows = JSON.parse(raw) as UsitcHtsRow[];

  const byCode = new Map<string, UsitcHtsRow>();
  const tokenToCodes = new Map<string, Set<string>>();

  for (const row of rows) {
    const code = normalizeCode(row.htsno);
    if (!code) continue;

    if (!byCode.has(code)) byCode.set(code, row);

    const desc = row.description || "";
    for (const tok of tokenize(desc)) {
      if (!tokenToCodes.has(tok)) tokenToCodes.set(tok, new Set());
      tokenToCodes.get(tok)!.add(code);
    }
  }

  const index: HtsIndex = { byCode, tokenToCodes };
  cached = { index, loadedAt: Date.now() };
  return index;
}

export function getHtsRowByCode(code: string, filePath?: string): UsitcHtsRow | null {
  const idx = loadUsitcHtsIndex(filePath);
  return idx.byCode.get(normalizeCode(code)) || null;
}

export type HtsSuggestion = {
  code: string;
  description: string;
  score: number;
  reasons: string[];
  isSpecial: boolean;
};

export function searchHtsByDescription(
  query: string,
  opts?: { limit?: number; filePath?: string },
): HtsSuggestion[] {
  const limit = opts?.limit ?? 15;
  const idx = loadUsitcHtsIndex(opts?.filePath);

  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  // Union candidates (broad), not strict intersection, to avoid empty results.
  const candidateScores = new Map<string, number>();
  const candidateReasons = new Map<string, string[]>();

  for (const t of tokens) {
    const set = idx.tokenToCodes.get(t);
    if (!set) continue;
    for (const code of set) {
      candidateScores.set(code, (candidateScores.get(code) || 0) + 1);
      if (!candidateReasons.has(code)) candidateReasons.set(code, []);
      candidateReasons.get(code)!.push(`token:${t}`);
    }
  }

  const out: HtsSuggestion[] = [];
  for (const [code, hits] of candidateScores.entries()) {
    const row = idx.byCode.get(code);
    if (!row) continue;

    const isSpecial = isSpecialChapter(code);

    // Base score: token hits / token count
    let score = hits / Math.max(1, tokens.length);

    // Preference: if description is short, penalize special chapters heavily
    if (query.trim().length < 25 && isSpecial) score *= 0.25;

    // Preference: slightly favor "base" codes (non-special) for general queries
    if (!isSpecial) score *= 1.05;

    // Keep reasons
    const reasons = candidateReasons.get(code) || [];
    if (isSpecial) reasons.push("penalty:special_chapter(98/99)");
    if (query.trim().length < 25) reasons.push("query:short");

    out.push({
      code,
      description: row.description || "",
      score: Math.round(score * 1000) / 1000,
      reasons,
      isSpecial,
    });
  }

  out.sort((a, b) => b.score - a.score);

  // De-dup similar descriptions (light)
  const seen = new Set<string>();
  const filtered: HtsSuggestion[] = [];
  for (const s of out) {
    const key = (s.code + "|" + (s.description || "").slice(0, 60)).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push(s);
    if (filtered.length >= limit) break;
  }

  return filtered;
}
