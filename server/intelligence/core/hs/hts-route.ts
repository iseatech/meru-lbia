import { classifyHS } from "./hs-engine";
import { searchHtsByDescription } from "./usitc-hts";
import { applyGRI } from "./gri";
import { normalizeMaterialFromText } from "./materials";
import { buildHtsQuery } from "./query-builder";
import type { HtsClassifyInput } from "./types-input";

function buildQuestions(description: string) {
  const qs: string[] = [];
  qs.push("¿Cuál es la función exacta del producto (para qué se usa)?");
  qs.push("¿De qué material principal está hecho (plástico, acero, aluminio, textil, caucho, etc.)?");
  qs.push("¿Es una parte/accesorio de otro producto? Si sí, ¿de cuál?");
  qs.push("¿Es para uso industrial o doméstico? ¿En qué industria/producto final se usa?");
  qs.push("¿Tiene características especiales (adhesivo, clip de resorte, eléctrico, magnético, médico, etc.)?");
  if ((description || "").trim().length < 20) {
    qs.unshift("La descripción es muy corta. Escribe una descripción completa (qué es, material y uso).");
  }
  return qs;
}

function inferIsPart(desc: string): boolean {
  return /\b(part|parts|accessory|accessories|spare|replacement)\b/i.test(desc || "");
}

function inferMaterial(desc: string): string | undefined {
  return normalizeMaterialFromText(desc);
}

export function registerHtsRoutes(app: any) {
  app.post("/api/hts/classify", async (req: any, res: any) => {
    try {
      const body: HtsClassifyInput = (req.body || {}) as any;
      const description = String(body.description || "").trim();

      if (!description) {
        return res.status(400).json({
          ok: false,
          error: "Missing required field: description",
        });
      }

      const result = classifyHS({ description });

      const query = buildHtsQuery({ description, material: body.material, function: body.function, isPartOf: body.isPartOf });

      const rawSuggestions = searchHtsByDescription(query, { limit: 15 });

      const ctx = {
        description,
        material: inferMaterial(description),
        isPart: inferIsPart(description),
      };

      const suggestions = applyGRI(rawSuggestions, ctx);

      const needsMoreInfo = description.length < 15;

      return res.json({
        ok: true,
        query,
        needsMoreInfo,
        result,
        suggestions,
        griContext: ctx,
        questions: needsMoreInfo ? buildQuestions(description) : [],
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || "HTS error" });
    }
  });
}
