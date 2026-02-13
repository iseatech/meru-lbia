import { useState } from "react";

export type PackageLine = {
  qty: string;
  weight_kg: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
  notes: string;
};

const EMPTY_PACKAGE: PackageLine = {
  qty: "",
  weight_kg: "",
  length_cm: "",
  width_cm: "",
  height_cm: "",
  notes: "",
};

export type LogisticsFormData = {
  origin_pol: string;
  destination_pod: string;
  country_of_origin: string;
  destination_country: string;
  incoterm: string;
  control_level: string;
  mode: string;
  cargo_nature: string;
  shipment_type: string;
  reference_number: string;
  product_description: string;
  total_units: string;
  unit_type: string;
  total_weight_kg: string;
  total_volume_cbm: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
  packages: PackageLine[];
};

export const INITIAL_LOGISTICS: LogisticsFormData = {
  origin_pol: "",
  destination_pod: "",
  country_of_origin: "",
  destination_country: "",
  incoterm: "",
  control_level: "",
  mode: "",
  cargo_nature: "",
  shipment_type: "",
  reference_number: "",
  product_description: "",
  total_units: "",
  unit_type: "units",
  total_weight_kg: "",
  total_volume_cbm: "",
  length_cm: "",
  width_cm: "",
  height_cm: "",
  packages: [],
};

export function isLogisticsValid(data: LogisticsFormData): boolean {
  return !!(
    data.origin_pol.trim() &&
    data.destination_pod.trim() &&
    data.country_of_origin.trim() &&
    data.destination_country.trim() &&
    data.incoterm.trim() &&
    data.control_level.trim() &&
    data.mode.trim() &&
    data.cargo_nature.trim() &&
    data.product_description.trim()
  );
}

export function logisticsPayload(data: LogisticsFormData): Record<string, unknown> {
  const out: Record<string, unknown> = {
    origin_pol: data.origin_pol,
    destination_pod: data.destination_pod,
    country_of_origin: data.country_of_origin,
    destination_country: data.destination_country,
    product_description: data.product_description,
    incoterm: data.incoterm,
    control_level: data.control_level,
    mode: data.mode,
    shipment_mode: data.mode,
    cargo_nature: data.cargo_nature,
  };
  if (data.shipment_type) out.shipment_type = data.shipment_type;
  if (data.reference_number) out.reference_number = data.reference_number;
  if (data.total_units) out.total_units = data.total_units;
  if (data.unit_type) out.unit_type = data.unit_type;
  if (data.total_weight_kg) out.total_weight_kg = data.total_weight_kg;
  if (data.total_volume_cbm) out.total_volume_cbm = data.total_volume_cbm;
  if (data.length_cm || data.width_cm || data.height_cm) {
    out.dimensions = {
      length_cm: data.length_cm,
      width_cm: data.width_cm,
      height_cm: data.height_cm,
    };
  }
  if (data.packages.length > 0) {
    out.packages = data.packages;
  }
  return out;
}

const INCOTERMS = [
  { value: "EXW", label: "EXW - Ex Works" },
  { value: "FCA", label: "FCA - Free Carrier" },
  { value: "FAS", label: "FAS - Free Alongside Ship" },
  { value: "FOB", label: "FOB - Free on Board" },
  { value: "CFR", label: "CFR - Cost and Freight" },
  { value: "CIF", label: "CIF - Cost, Insurance & Freight" },
  { value: "CPT", label: "CPT - Carriage Paid To" },
  { value: "CIP", label: "CIP - Carriage and Insurance Paid To" },
  { value: "DAP", label: "DAP - Delivered at Place" },
  { value: "DPU", label: "DPU - Delivered at Place Unloaded" },
  { value: "DDP", label: "DDP - Delivered Duty Paid" },
];

const CONTROL_LEVELS = [
  { value: "standard", label: "Standard" },
  { value: "controlled", label: "Controlled / Regulated" },
  { value: "restricted", label: "Restricted" },
  { value: "prohibited", label: "Prohibited / Embargoed" },
  { value: "unknown", label: "Unknown / Need guidance" },
];

const MODES = [
  { value: "ocean_fcl", label: "Ocean - FCL (Full Container)" },
  { value: "ocean_lcl", label: "Ocean - LCL (Less than Container)" },
  { value: "air", label: "Air Freight" },
  { value: "ground", label: "Ground / Truck" },
  { value: "rail", label: "Rail" },
  { value: "multimodal", label: "Multimodal" },
  { value: "courier", label: "Courier / Express" },
];

const CARGO_NATURES = [
  { value: "general", label: "General Cargo" },
  { value: "perishable", label: "Perishable" },
  { value: "hazardous", label: "Hazardous (DG)" },
  { value: "oversized", label: "Oversized / Out of Gauge" },
  { value: "temperature_controlled", label: "Temperature Controlled" },
  { value: "high_value", label: "High Value" },
  { value: "fragile", label: "Fragile" },
  { value: "livestock", label: "Livestock / Live Animals" },
  { value: "other", label: "Other" },
];

const SHIPMENT_TYPES = [
  { value: "", label: "Let Meru decide" },
  { value: "door_to_door", label: "Door to Door" },
  { value: "door_to_port", label: "Door to Port" },
  { value: "port_to_door", label: "Port to Door" },
  { value: "port_to_port", label: "Port to Port" },
];

const UNIT_TYPES = [
  { value: "units", label: "Units" },
  { value: "pallets", label: "Pallets" },
  { value: "cartons", label: "Cartons" },
  { value: "crates", label: "Crates" },
  { value: "drums", label: "Drums" },
  { value: "bags", label: "Bags" },
  { value: "rolls", label: "Rolls" },
];

type Props = {
  data: LogisticsFormData;
  onChange: (data: LogisticsFormData) => void;
};

export default function LogisticsIntakeForm({ data, onChange }: Props) {
  const [showPackages, setShowPackages] = useState(data.packages.length > 0);

  function updateField(name: keyof LogisticsFormData, value: string) {
    onChange({ ...data, [name]: value });
  }

  function addPackage() {
    onChange({ ...data, packages: [...data.packages, { ...EMPTY_PACKAGE }] });
  }

  function removePackage(idx: number) {
    const next = data.packages.filter((_, i) => i !== idx);
    onChange({ ...data, packages: next });
    if (next.length === 0) setShowPackages(false);
  }

  function updatePackage(idx: number, field: keyof PackageLine, value: string) {
    const next = data.packages.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
    onChange({ ...data, packages: next });
  }

  function togglePackages() {
    if (showPackages) {
      onChange({ ...data, packages: [] });
      setShowPackages(false);
    } else {
      onChange({ ...data, packages: [{ ...EMPTY_PACKAGE }] });
      setShowPackages(true);
    }
  }

  return (
    <>
      <fieldset className="form-section">
        <legend>Shipment &amp; Route</legend>

        <div className="intake-field">
          <label htmlFor="product_description">Product / Cargo Description <span className="required-mark">*</span></label>
          <textarea id="product_description" value={data.product_description} onChange={(e) => updateField("product_description", e.target.value)} placeholder="e.g., Consumer electronics, lithium-ion batteries, 500 units palletized" rows={3} data-testid="input-product-description" />
        </div>

        <div className="field-row field-row-2">
          <div className="intake-field">
            <label htmlFor="country_of_origin">Country of Origin <span className="required-mark">*</span></label>
            <input id="country_of_origin" type="text" value={data.country_of_origin} onChange={(e) => updateField("country_of_origin", e.target.value)} placeholder="e.g., China, Vietnam, Germany" data-testid="input-country-of-origin" />
          </div>
          <div className="intake-field">
            <label htmlFor="destination_country">Destination Country <span className="required-mark">*</span></label>
            <input id="destination_country" type="text" value={data.destination_country} onChange={(e) => updateField("destination_country", e.target.value)} placeholder="e.g., United States" data-testid="input-destination-country" />
          </div>
        </div>

        <div className="field-row field-row-2">
          <div className="intake-field">
            <label htmlFor="origin_pol">Origin (Port of Loading) <span className="required-mark">*</span></label>
            <input id="origin_pol" type="text" value={data.origin_pol} onChange={(e) => updateField("origin_pol", e.target.value)} placeholder="e.g., Shanghai, Shenzhen, Ho Chi Minh" data-testid="input-origin-pol" />
          </div>
          <div className="intake-field">
            <label htmlFor="destination_pod">Destination (Port of Discharge) <span className="required-mark">*</span></label>
            <input id="destination_pod" type="text" value={data.destination_pod} onChange={(e) => updateField("destination_pod", e.target.value)} placeholder="e.g., Los Angeles, Long Beach, New York" data-testid="input-destination-pod" />
          </div>
        </div>

        <div className="field-row field-row-2">
          <div className="intake-field">
            <label htmlFor="incoterm">Incoterm <span className="required-mark">*</span></label>
            <select id="incoterm" value={data.incoterm} onChange={(e) => updateField("incoterm", e.target.value)} data-testid="select-incoterm">
              <option value="">Select Incoterm...</option>
              {INCOTERMS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="intake-field">
            <label htmlFor="control_level">Control Level <span className="required-mark">*</span></label>
            <select id="control_level" value={data.control_level} onChange={(e) => updateField("control_level", e.target.value)} data-testid="select-control-level">
              <option value="">Select...</option>
              {CONTROL_LEVELS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field-row field-row-2">
          <div className="intake-field">
            <label htmlFor="mode">Mode of Transport <span className="required-mark">*</span></label>
            <select id="mode" value={data.mode} onChange={(e) => updateField("mode", e.target.value)} data-testid="select-mode">
              <option value="">Select...</option>
              {MODES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="intake-field">
            <label htmlFor="cargo_nature">Cargo Nature <span className="required-mark">*</span></label>
            <select id="cargo_nature" value={data.cargo_nature} onChange={(e) => updateField("cargo_nature", e.target.value)} data-testid="select-cargo-nature">
              <option value="">Select...</option>
              {CARGO_NATURES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field-row field-row-2">
          <div className="intake-field">
            <label htmlFor="shipment_type">Shipment Type</label>
            <select id="shipment_type" value={data.shipment_type} onChange={(e) => updateField("shipment_type", e.target.value)} data-testid="select-shipment-type">
              {SHIPMENT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className="field-hint">Optional &mdash; leave blank for Meru to recommend</span>
          </div>
          <div className="intake-field">
            <label htmlFor="reference_number">Reference / PO Number</label>
            <input id="reference_number" type="text" value={data.reference_number} onChange={(e) => updateField("reference_number", e.target.value)} placeholder="e.g., PO-2026-0041" data-testid="input-reference-number" />
          </div>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Cargo Summary</legend>

        <div className="field-row field-row-3">
          <div className="intake-field">
            <label htmlFor="total_units">Total Units</label>
            <div className="input-with-addon">
              <input id="total_units" type="number" min="0" value={data.total_units} onChange={(e) => updateField("total_units", e.target.value)} placeholder="e.g., 500" data-testid="input-total-units" />
              <select className="addon-select" value={data.unit_type} onChange={(e) => updateField("unit_type", e.target.value)} data-testid="select-unit-type">
                {UNIT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="intake-field">
            <label htmlFor="total_weight_kg">Total Weight (kg)</label>
            <input id="total_weight_kg" type="number" min="0" step="0.01" value={data.total_weight_kg} onChange={(e) => updateField("total_weight_kg", e.target.value)} placeholder="e.g., 2500" data-testid="input-total-weight" />
          </div>
          <div className="intake-field">
            <label htmlFor="total_volume_cbm">Total Volume (CBM)</label>
            <input id="total_volume_cbm" type="number" min="0" step="0.01" value={data.total_volume_cbm} onChange={(e) => updateField("total_volume_cbm", e.target.value)} placeholder="e.g., 14.5" data-testid="input-total-volume" />
          </div>
        </div>

        <div className="field-row field-row-3">
          <div className="intake-field">
            <label htmlFor="dims_length">Length (cm)</label>
            <input id="dims_length" type="number" min="0" value={data.length_cm} onChange={(e) => updateField("length_cm", e.target.value)} placeholder="L" data-testid="input-length-cm" />
          </div>
          <div className="intake-field">
            <label htmlFor="dims_width">Width (cm)</label>
            <input id="dims_width" type="number" min="0" value={data.width_cm} onChange={(e) => updateField("width_cm", e.target.value)} placeholder="W" data-testid="input-width-cm" />
          </div>
          <div className="intake-field">
            <label htmlFor="dims_height">Height (cm)</label>
            <input id="dims_height" type="number" min="0" value={data.height_cm} onChange={(e) => updateField("height_cm", e.target.value)} placeholder="H" data-testid="input-height-cm" />
          </div>
        </div>
      </fieldset>

      <div className="packages-section">
        <div className="packages-header">
          <button type="button" className="btn-outline btn-sm" onClick={togglePackages} data-testid="button-toggle-packages">
            {showPackages ? "Remove Packages" : "Add Package Lines (optional)"}
          </button>
          {showPackages && data.packages.length > 0 && (
            <span className="packages-count" data-testid="packages-counter">{data.packages.length} package{data.packages.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {showPackages && (
          <div className="packages-list" data-testid="packages-list">
            {data.packages.map((pkg, idx) => (
              <div className="package-card" key={idx} data-testid={`package-${idx}`}>
                <div className="package-card-header">
                  <span className="package-label">Package {idx + 1}</span>
                  <button type="button" className="btn-text-danger btn-sm" onClick={() => removePackage(idx)} data-testid={`button-remove-package-${idx}`}>Remove</button>
                </div>
                <div className="field-row field-row-5">
                  <div className="intake-field">
                    <label>Qty</label>
                    <input type="number" min="1" value={pkg.qty} onChange={(e) => updatePackage(idx, "qty", e.target.value)} placeholder="1" data-testid={`input-pkg-qty-${idx}`} />
                  </div>
                  <div className="intake-field">
                    <label>Weight (kg)</label>
                    <input type="number" min="0" step="0.01" value={pkg.weight_kg} onChange={(e) => updatePackage(idx, "weight_kg", e.target.value)} placeholder="kg" data-testid={`input-pkg-weight-${idx}`} />
                  </div>
                  <div className="intake-field">
                    <label>L (cm)</label>
                    <input type="number" min="0" value={pkg.length_cm} onChange={(e) => updatePackage(idx, "length_cm", e.target.value)} placeholder="L" data-testid={`input-pkg-length-${idx}`} />
                  </div>
                  <div className="intake-field">
                    <label>W (cm)</label>
                    <input type="number" min="0" value={pkg.width_cm} onChange={(e) => updatePackage(idx, "width_cm", e.target.value)} placeholder="W" data-testid={`input-pkg-width-${idx}`} />
                  </div>
                  <div className="intake-field">
                    <label>H (cm)</label>
                    <input type="number" min="0" value={pkg.height_cm} onChange={(e) => updatePackage(idx, "height_cm", e.target.value)} placeholder="H" data-testid={`input-pkg-height-${idx}`} />
                  </div>
                </div>
                <div className="intake-field">
                  <label>Notes</label>
                  <input type="text" value={pkg.notes} onChange={(e) => updatePackage(idx, "notes", e.target.value)} placeholder="e.g., Fragile, stack max 3" data-testid={`input-pkg-notes-${idx}`} />
                </div>
              </div>
            ))}
            <button type="button" className="btn-outline btn-sm" onClick={addPackage} data-testid="button-add-package">+ Add Package</button>
          </div>
        )}
      </div>
    </>
  );
}
