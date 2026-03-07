import { classifyHS } from "./hs-engine";
import { searchHtsByDescription } from "./usitc-hts";
import { applyGRI } from "./gri";
import { normalizeMaterialFromText } from "./materials";
import { buildHtsQuery } from "./query-builder";
import type { HtsClassifyInput } from "./types-input";
import { db } from "../../../db";

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

async function getRecentHsHistory(limit = 20) {
  const result = await db.execute(`
    SELECT
      id,
      user_id,
      description,
      query,
      input_json,
      result_json,
      suggestions_json,
      gri_context_json,
      questions_json,
      created_at
    FROM meru_hs_classifications
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return result.rows || [];
}
export function registerHtsRoutes(app: any) {
  app.get("/api/hts/history", async (_req: any, res: any) => {
    try {
      const rows = await getRecentHsHistory(20);
      return res.json({
        ok: true,
        count: rows.length,
        items: rows,
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: err?.message || "HS history error",
      });
    }
  });

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
try {
  await db.execute(`
    INSERT INTO meru_hs_classifications
    (description, query, result_json, suggestions_json, gri_context_json, questions_json)
    VALUES ($1,$2,$3,$4,$5,$6)
  `, [
    description,
    JSON.stringify(query),
    JSON.stringify(result),
    JSON.stringify(suggestions),
    JSON.stringify(ctx),
    JSON.stringify(needsMoreInfo ? buildQuestions(description) : [])
  ]);
} catch (e) {
  console.error("HS log error:", e);
}


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
