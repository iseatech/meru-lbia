import type { HtsClassifyInput } from "./types-input";

function clean(s?: string) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

export function buildHtsQuery(input: HtsClassifyInput): string {
  const parts: string[] = [];

  const desc = clean(input.description);
  if (desc) parts.push(desc);

  const material = clean(input.material);
  if (material && !desc.toLowerCase().includes(material.toLowerCase())) {
    parts.push(material);
  }

  const fn = clean(input.function);
  if (fn) parts.push(fn);

  const partOf = clean(input.isPartOf);
  if (partOf) parts.push(partOf);

  // Light hinting for short queries (prevents "plastic-only" dominance)
  if (desc.split(" ").length <= 2) {
    parts.push("fastener");
    parts.push("clip");
  }

  return parts.join(" | ");
}
