export type GriContext = {
  description: string;
  material?: string;
  isPart?: boolean;
};

function addWhy(arr: string[], msg: string) {
  if (!arr.includes(msg)) arr.push(msg);
}

export function applyGRI(candidates: any[], ctx: GriContext) {
  const q = String(ctx.description || "").toLowerCase();

  return candidates
    .map((c) => {
      let score = Number(c.score ?? 0);
      const why: string[] = [];
      const griApplied: string[] = [];

      // Base reasons (from search)
      if (Array.isArray(c.reasons) && c.reasons.length) {
        addWhy(why, `Match por tokens: ${c.reasons.filter((r: string) => r.startsWith("token:")).slice(0, 6).join(", ")}`);
      }

      // GRI 1 – literal/semantic alignment (light)
      if (c.description?.toLowerCase().includes(q) && q.length >= 6) {
        score += 0.15;
        griApplied.push("GRI 1");
        addWhy(why, "GRI 1: texto del heading/descripcion coincide fuertemente con tu descripción");
      }

      // GRI 2(a) – part vs complete article (assistant)
      if (ctx.isPart) {
        griApplied.push("GRI 2(a)");
        if (/accessory|part/i.test(String(c.description || ""))) {
          score += 0.10;
          addWhy(why, "GRI 2(a): tu descripción sugiere parte/accesorio; este candidato menciona part/accessory");
        } else {
          addWhy(why, "GRI 2(a): tu descripción sugiere parte/accesorio; candidatos sin 'part/accessory' pueden ser menos probables");
        }
      }

      // GRI 3(b) – material dominance (assistant)
      if (ctx.material) {
        griApplied.push("GRI 3(b)");
        const d = String(c.description || "").toLowerCase();
        if (d.includes(String(ctx.material).toLowerCase())) {
          score += 0.12;
          addWhy(why, `GRI 3(b): coincide con material dominante detectado (${ctx.material})`);
        } else {
          addWhy(why, `GRI 3(b): material dominante detectado (${ctx.material}); preferir candidatos consistentes con ese material`);
        }
      }

      // Keep special-chapter penalty explanation
      if (c.isSpecial) {
        addWhy(why, "Nota: Capítulo 98/99 (provisiones especiales). Se penaliza cuando la descripción es general.");
      }

      return {
        ...c,
        why,
        griApplied: Array.from(new Set(griApplied)),
        griScore: Number(score.toFixed(3)),
      };
    })
    .sort((a, b) => (b.griScore ?? 0) - (a.griScore ?? 0));
}
