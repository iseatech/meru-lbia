export type HsMode = "suggest" | "validate";

export type RequesterRole = "importer" | "broker" | "forwarder" | "seller" | "other";

export type HsIntakeItemV1 = {
  // A) Identificación del producto (mínimo)
  product_description: string;      // obligatorio
  primary_use: string;              // obligatorio
  material_composition: string;     // obligatorio (material principal y % si se conoce)

  // B) Origen / destino
  country_of_origin: string;        // obligatorio

  // C) Modo de trabajo
  hs_mode: HsMode;                  // obligatorio
  provided_hs_code?: string;         // obligatorio si hs_mode="validate"

  // D) Datos opcionales para precisión
  brand_model?: string;
  technical_specs?: string;

  // E) Valor / costo (según diseño validado)
  unit_value_usd?: number;          // opcional

  // F) Flags opcionales (clasificación por agencias)
  is_food_or_supplement?: boolean;
  is_medical_or_device?: boolean;
  is_chemical_or_battery?: boolean;
  is_children_product?: boolean;

  // Notas
  additional_notes?: string;
};

export type HsIntakeV1 = {
  service_type: "hs_customs_v1" | string; // permitimos strings por compatibilidad
  destination_country: string;            // en v1: "United States" (o texto libre)
  requester_role?: RequesterRole;
  notes_global?: string;
  items: HsIntakeItemV1[];
};

// === Output v1 ===

export type DutyEstimateV1 = {
  // Orientativo, no cálculo final de impuestos.
  rate_text?: string;              // ejemplo: "General: 3.4%"
  special_rate_text?: string;      // ejemplo: "Special: Free (if eligible)"
  column2_rate_text?: string;      // ejemplo: "Column 2: 35%"
  disclaimer: string;              // siempre presente
};

export type HsSuggestionV1 = {
  hs_code: string;                 // normalizado (p.ej. 8507.60.00)
  title?: string;                  // descripción corta del HTS line
  confidence: "LOW" | "MEDIUM" | "HIGH";
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  risk_reasons: string[];
  duty_estimate?: DutyEstimateV1;
  official_sources_used: { name: string; url: string }[];
};

export type HsResultItemV1 = {
  item_index: number;
  mode: HsMode;
  input_echo: {
    product_description: string;
    primary_use: string;
    material_composition: string;
    country_of_origin: string;
    destination_country: string;
    provided_hs_code?: string;
    unit_value_usd?: number;
  };
  suggested: HsSuggestionV1[];     // 2–3 opciones (o 1 si validate)
  regulatory_agencies: string[];   // ejemplo: ["FDA", "CPSC"]
  notes: string[];
};

export type HsResultV1 = {
  version: "v1";
  generated_at_iso: string;
  destination_country: string;
  items: HsResultItemV1[];
};

// === Validación mínima (v1) ===
export function validateHsIntakeV1(intake: HsIntakeV1): { ok: true } | { ok: false; message: string } {
  if (!intake) return { ok: false, message: "Missing intake body." };
  if (!intake.destination_country || !String(intake.destination_country).trim()) {
    return { ok: false, message: "destination_country is required." };
  }
  if (!Array.isArray(intake.items) || intake.items.length < 1) {
    return { ok: false, message: "items[] is required (at least 1 item)." };
  }

  for (let i = 0; i < intake.items.length; i++) {
    const it = intake.items[i];
    const prefix = `items[${i}]`;
    if (!String(it.product_description || "").trim()) return { ok: false, message: `${prefix}.product_description is required.` };
    if (!String(it.primary_use || "").trim()) return { ok: false, message: `${prefix}.primary_use is required.` };
    if (!String(it.material_composition || "").trim()) return { ok: false, message: `${prefix}.material_composition is required.` };
    if (!String(it.country_of_origin || "").trim()) return { ok: false, message: `${prefix}.country_of_origin is required.` };
    if (it.hs_mode !== "suggest" && it.hs_mode !== "validate") return { ok: false, message: `${prefix}.hs_mode must be "suggest" or "validate".` };
    if (it.hs_mode === "validate" && !String(it.provided_hs_code || "").trim()) return { ok: false, message: `${prefix}.provided_hs_code is required when hs_mode="validate".` };
    if (it.unit_value_usd != null && Number.isNaN(Number(it.unit_value_usd))) return { ok: false, message: `${prefix}.unit_value_usd must be a number if provided.` };
  }

  return { ok: true };
}
