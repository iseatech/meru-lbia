import React from "react";

export type HsMode = "suggest" | "validate";

export type HsIntakeItemV1 = {
  product_description: string;
  primary_use: string;
  material_composition: string;
  country_of_origin: string;

  hs_mode: HsMode;
  provided_hs_code?: string;

  brand_model?: string;
  technical_specs?: string;

  unit_value_usd?: string; // UI keeps string; server accepts number (we will convert on submit)

  is_food_or_supplement?: boolean;
  is_medical_or_device?: boolean;
  is_chemical_or_battery?: boolean;
  is_children_product?: boolean;

  additional_notes?: string;
};

type Props = {
  max: number;
  items: HsIntakeItemV1[];
  onChange: (items: HsIntakeItemV1[]) => void;
};

export const EMPTY_HS_ITEM_V1: HsIntakeItemV1 = {
  product_description: "",
  primary_use: "",
  material_composition: "",
  country_of_origin: "",
  hs_mode: "suggest",
  provided_hs_code: "",
  brand_model: "",
  technical_specs: "",
  unit_value_usd: "",
  is_food_or_supplement: false,
  is_medical_or_device: false,
  is_chemical_or_battery: false,
  is_children_product: false,
  additional_notes: "",
};

export default function HsLineItemsV1({ max, items, onChange }: Props) {
  function updateItem(index: number, patch: Partial<HsIntakeItemV1>) {
    const updated = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    onChange(updated);
  }

  function addItem() {
    if (items.length >= max) return;
    onChange([...items, { ...EMPTY_HS_ITEM_V1 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="hs-line-items" data-testid="hs-line-items-v1">
      <div className="hs-counter" data-testid="hs-counter-v1">
        {items.length} / {max} Items
      </div>

      {items.map((item, index) => {
        const isValidate = item.hs_mode === "validate";
        return (
          <div className="hs-item-card" key={index} data-testid={`hs-item-v1-${index}`}>
            <div className="hs-item-header">
              <span className="hs-item-number">Item {index + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  className="hs-item-remove"
                  onClick={() => removeItem(index)}
                  data-testid={`button-remove-hs-v1-${index}`}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="hs-item-fields">
              <div className="field-row field-row-2">
                <div className="intake-field">
                  <label htmlFor={`hs-mode-${index}`}>
                    Mode <span className="required-mark">*</span>
                  </label>
                  <select
                    id={`hs-mode-${index}`}
                    value={item.hs_mode}
                    onChange={(e) => {
                      const nextMode = e.target.value as HsMode;
                      updateItem(index, {
                        hs_mode: nextMode,
                        provided_hs_code: nextMode === "validate" ? (item.provided_hs_code || "") : "",
                      });
                    }}
                    data-testid={`select-hs-mode-${index}`}
                  >
                    <option value="suggest">Suggest HS (Meru recommends)</option>
                    <option value="validate">Validate my HS code</option>
                  </select>
                </div>

                <div className="intake-field">
                  <label htmlFor={`hs-provided-${index}`}>
                    Provided HS Code {isValidate ? <span className="required-mark">*</span> : null}
                  </label>
                  <input
                    id={`hs-provided-${index}`}
                    type="text"
                    value={item.provided_hs_code || ""}
                    onChange={(e) => updateItem(index, { provided_hs_code: e.target.value })}
                    placeholder={isValidate ? "e.g., 8507.60.00" : "Optional"}
                    disabled={!isValidate}
                    data-testid={`input-provided-hs-${index}`}
                  />
                  <span className="field-hint">Format: 0000.00.00 or 000.000.000</span>
                </div>
              </div>

              <div className="intake-field">
                <label htmlFor={`hs-desc-${index}`}>
                  Product Description <span className="required-mark">*</span>
                </label>
                <textarea
                  id={`hs-desc-${index}`}
                  value={item.product_description}
                  onChange={(e) => updateItem(index, { product_description: e.target.value })}
                  placeholder="Describe the product clearly (composition, function, form)."
                  rows={3}
                  data-testid={`input-hs-desc-v1-${index}`}
                />
              </div>

              <div className="field-row field-row-2">
                <div className="intake-field">
                  <label htmlFor={`hs-use-${index}`}>
                    Primary Use <span className="required-mark">*</span>
                  </label>
                  <input
                    id={`hs-use-${index}`}
                    type="text"
                    value={item.primary_use}
                    onChange={(e) => updateItem(index, { primary_use: e.target.value })}
                    placeholder="e.g., Power storage for portable devices"
                    data-testid={`input-hs-use-${index}`}
                  />
                </div>

                <div className="intake-field">
                  <label htmlFor={`hs-origin-${index}`}>
                    Country of Origin <span className="required-mark">*</span>
                  </label>
                  <input
                    id={`hs-origin-${index}`}
                    type="text"
                    value={item.country_of_origin}
                    onChange={(e) => updateItem(index, { country_of_origin: e.target.value })}
                    placeholder="e.g., China"
                    data-testid={`input-hs-origin-v1-${index}`}
                  />
                </div>
              </div>

              <div className="intake-field">
                <label htmlFor={`hs-mat-${index}`}>
                  Material Composition <span className="required-mark">*</span>
                </label>
                <input
                  id={`hs-mat-${index}`}
                  type="text"
                  value={item.material_composition}
                  onChange={(e) => updateItem(index, { material_composition: e.target.value })}
                  placeholder="Main material + % if known (e.g., 70% cotton / 30% polyester)"
                  data-testid={`input-hs-mat-${index}`}
                />
              </div>

              <div className="field-row field-row-2">
                <div className="intake-field">
                  <label htmlFor={`hs-brand-${index}`}>Brand / Model</label>
                  <input
                    id={`hs-brand-${index}`}
                    type="text"
                    value={item.brand_model || ""}
                    onChange={(e) => updateItem(index, { brand_model: e.target.value })}
                    placeholder="Optional"
                    data-testid={`input-hs-brand-${index}`}
                  />
                </div>

                <div className="intake-field">
                  <label htmlFor={`hs-value-${index}`}>Unit Value (USD)</label>
                  <input
                    id={`hs-value-${index}`}
                    type="text"
                    value={item.unit_value_usd || ""}
                    onChange={(e) => updateItem(index, { unit_value_usd: e.target.value })}
                    placeholder="Optional (e.g., 12.50)"
                    data-testid={`input-hs-value-${index}`}
                  />
                </div>
              </div>

              <div className="intake-field">
                <label htmlFor={`hs-specs-${index}`}>Technical Specs</label>
                <textarea
                  id={`hs-specs-${index}`}
                  value={item.technical_specs || ""}
                  onChange={(e) => updateItem(index, { technical_specs: e.target.value })}
                  placeholder="Optional (dimensions, voltage, capacity, materials detail, etc.)"
                  rows={2}
                  data-testid={`input-hs-specs-${index}`}
                />
              </div>

              <div className="intake-field">
                <label>Agency Flags (optional)</label>
                <div className="field-row field-row-2" style={{ alignItems: "center" }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!item.is_food_or_supplement}
                      onChange={(e) => updateItem(index, { is_food_or_supplement: e.target.checked })}
                      data-testid={`chk-food-${index}`}
                    />
                    Food / Supplement (FDA/USDA)
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!item.is_medical_or_device}
                      onChange={(e) => updateItem(index, { is_medical_or_device: e.target.checked })}
                      data-testid={`chk-med-${index}`}
                    />
                    Medical / Device (FDA)
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!item.is_chemical_or_battery}
                      onChange={(e) => updateItem(index, { is_chemical_or_battery: e.target.checked })}
                      data-testid={`chk-chem-${index}`}
                    />
                    Chemical / Battery (EPA/DOT)
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!item.is_children_product}
                      onChange={(e) => updateItem(index, { is_children_product: e.target.checked })}
                      data-testid={`chk-child-${index}`}
                    />
                    Children Product (CPSC)
                  </label>
                </div>
              </div>

              <div className="intake-field">
                <label htmlFor={`hs-notes-${index}`}>Additional Notes</label>
                <input
                  id={`hs-notes-${index}`}
                  type="text"
                  value={item.additional_notes || ""}
                  onChange={(e) => updateItem(index, { additional_notes: e.target.value })}
                  placeholder="Optional"
                  data-testid={`input-hs-notes-v1-${index}`}
                />
              </div>
            </div>
          </div>
        );
      })}

      {items.length < max && (
        <button
          type="button"
          className="btn-outline hs-add-button"
          onClick={addItem}
          data-testid="button-add-hs-v1"
        >
          + Add another item
        </button>
      )}
    </div>
  );
}
