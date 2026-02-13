import { useState } from "react";

export type HsItem = {
  hs_code: string;
  product_description: string;
  country_of_origin: string;
  additional_notes: string;
};

type HsLineItemsProps = {
  max: number;
  items: HsItem[];
  onChange: (items: HsItem[]) => void;
};

const EMPTY_ITEM: HsItem = {
  hs_code: "",
  product_description: "",
  country_of_origin: "",
  additional_notes: "",
};

export default function HsLineItems({ max, items, onChange }: HsLineItemsProps) {
  function updateItem(index: number, field: keyof HsItem, value: string) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  }

  function addItem() {
    if (items.length >= max) return;
    onChange([...items, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="hs-line-items" data-testid="hs-line-items">
      <div className="hs-counter" data-testid="hs-counter">
        {items.length} / {max} HS codes
      </div>

      {items.map((item, index) => (
        <div className="hs-item-card" key={index} data-testid={`hs-item-${index}`}>
          <div className="hs-item-header">
            <span className="hs-item-number">Item {index + 1}</span>
            {items.length > 1 && (
              <button
                type="button"
                className="hs-item-remove"
                onClick={() => removeItem(index)}
                data-testid={`button-remove-hs-${index}`}
              >
                Remove
              </button>
            )}
          </div>

          <div className="hs-item-fields">
            <div className="intake-field">
              <label htmlFor={`hs-code-${index}`}>
                HS Code <span className="required-mark">*</span>
              </label>
              <input
                id={`hs-code-${index}`}
                type="text"
                value={item.hs_code}
                onChange={(e) => updateItem(index, "hs_code", e.target.value)}
                placeholder="e.g., 8507.60.00 or 850.760.000"
                data-testid={`input-hs-code-${index}`}
              />
              <span className="field-hint">Format: 0000.00.00 or 000.000.000</span>
            </div>

            <div className="intake-field">
              <label htmlFor={`hs-desc-${index}`}>
                Product Description <span className="required-mark">*</span>
              </label>
              <input
                id={`hs-desc-${index}`}
                type="text"
                value={item.product_description}
                onChange={(e) => updateItem(index, "product_description", e.target.value)}
                placeholder="e.g., Lithium-ion battery packs for consumer electronics"
                data-testid={`input-hs-desc-${index}`}
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
                onChange={(e) => updateItem(index, "country_of_origin", e.target.value)}
                placeholder="e.g., China"
                data-testid={`input-hs-origin-${index}`}
              />
            </div>

            <div className="intake-field">
              <label htmlFor={`hs-notes-${index}`}>
                Additional Notes
              </label>
              <input
                id={`hs-notes-${index}`}
                type="text"
                value={item.additional_notes}
                onChange={(e) => updateItem(index, "additional_notes", e.target.value)}
                placeholder="Optional"
                data-testid={`input-hs-notes-${index}`}
              />
            </div>
          </div>
        </div>
      ))}

      {items.length < max && (
        <button
          type="button"
          className="btn-outline hs-add-button"
          onClick={addItem}
          data-testid="button-add-hs"
        >
          + Add another HS code
        </button>
      )}
    </div>
  );
}

export { EMPTY_ITEM };
