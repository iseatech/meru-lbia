export type RerankContext = {
  query: string;          // built query: "clip | plastic | hold cable | fastener | clip"
  description: string;    // raw user description
  material?: string;      // normalized family if available
};

const DOMAIN_BANNERS = [
  { key: "case", rx: /\b(case|cases|cover|covers|housing|housings|shell|shells)\b/i },
  { key: "bag", rx: /\b(bag|bags|pouch|pouches|pack|packs)\b/i },
  { key: "rainwear", rx: /\b(rainwear|poncho|ponchos|jacket|jackets|coat|coats|parka|parkas)\b/i },
];

const FUNCTION_TOKENS = [
  /\bcable\b/i,
  /\bwire\b/i,
  /\bfasten(er|ing)?\b/i,
  /\bclip\b/i,
  /\bclamp\b/i,
  /\bbracket\b/i,
  /\bmount\b/i,
  /\bholder?\b/i,
  /\bstrap\b/i,
];

function hasUserSignal(text: string, rx: RegExp) {
  return rx.test(text);
}

export function rerankCandidate(
  baseScore: number,
  candidateDesc: string,
  code: string,
  ctx: RerankContext,
) {
  let score = baseScore;
  const why: string[] = [];

  const userText = `${ctx.description} | ${ctx.query}`.toLowerCase();
  const cand = String(candidateDesc || "");

  // 1) Penalize special chapters only when user is generic
  const isSpecial = /^9[89]/.test(String(code || ""));
  const userIsGeneric = userText.split(/\s+/).filter(Boolean).length <= 6; // short input
  if (isSpecial && userIsGeneric) {
    score -= 0.25;
    why.push("Penalty: chapter 98/99 is special; input is generic");
  }

  // 2) Penalize domain banners the user didn’t ask for (chapter-agnostic)
  for (const b of DOMAIN_BANNERS) {
    const candHas = b.rx.test(cand);
    const userHas = hasUserSignal(userText, b.rx);
    if (candHas && !userHas) {
      score -= 0.22;
      why.push(`Penalty: candidate looks like ${b.key} but user did not mention it`);
    }
  }

  // 3) Boost function alignment tokens (cable/fastener/etc.)
  let boosts = 0;
  for (const rx of FUNCTION_TOKENS) {
    const userWants = hasUserSignal(userText, rx);
    const candHas = rx.test(cand);
    if (userWants && candHas) boosts += 1;
  }
  if (boosts > 0) {
    const bump = Math.min(0.18, 0.04 * boosts);
    score += bump;
    why.push(`Boost: function tokens aligned (+${bump.toFixed(2)})`);
  }

  // 4) Material small preference (if material word appears)
  if (ctx.material) {
    const m = String(ctx.material).toLowerCase();
    if (cand.toLowerCase().includes(m)) {
      score += 0.06;
      why.push(`Boost: material '${m}' appears in candidate`);
    }
  }

  return { score: Number(score.toFixed(3)), whyExtra: why };
}
