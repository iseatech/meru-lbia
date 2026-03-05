export type MaterialFamily =
  | "plastic"
  | "rubber"
  | "textile"
  | "steel"
  | "iron"
  | "aluminum"
  | "wood"
  | "glass"
  | "paper"
  | "ceramic"
  | "leather"
  | "unknown";

const MATERIAL_SYNONYMS: Array<[MaterialFamily, RegExp[]]> = [
  ["plastic", [
    /\bplastic\b/i, /\bpolymer\b/i, /\bpvc\b/i, /\babs\b/i, /\bpolyethylene\b/i, /\bpolypropylene\b/i,
    /\bpet\b/i, /\bnylon\b/i, /\bpolycarbonate\b/i, /\bacrylic\b/i, /\bresin\b/i,
  ]],
  ["rubber", [/\brubber\b/i, /\belastomer\b/i, /\bsilicone\b/i, /\blatex\b/i, /\bneoprene\b/i]],
  ["textile", [/\btextile\b/i, /\bfabric\b/i, /\bcloth\b/i, /\bcotton\b/i, /\bpolyester\b/i, /\bnylon\b/i]],
  ["steel", [/\bsteel\b/i, /\bstainless\b/i, /\bstainless steel\b/i]],
  ["iron", [/\biron\b/i, /\bcast iron\b/i]],
  ["aluminum", [/\baluminum\b/i, /\baluminium\b/i]],
  ["wood", [/\bwood\b/i, /\btimber\b/i, /\bplywood\b/i]],
  ["glass", [/\bglass\b/i]],
  ["paper", [/\bpaper\b/i, /\bcardboard\b/i, /\bpaperboard\b/i]],
  ["ceramic", [/\bceramic\b/i, /\bporcelain\b/i, /\bstoneware\b/i]],
  ["leather", [/\bleather\b/i, /\bhide\b/i]],
];

export function normalizeMaterialFromText(desc: string): MaterialFamily | undefined {
  const d = String(desc || "");
  for (const [family, regs] of MATERIAL_SYNONYMS) {
    for (const r of regs) {
      if (r.test(d)) return family;
    }
  }
  return undefined;
}
