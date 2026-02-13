import { useState, useEffect } from "react";
import AccountLayout from "../components/AccountLayout";

const STORAGE_KEY = "meru_company";

interface CompanyData {
  companyName: string;
  website: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  industry: string;
  lanes: string;
}

const empty: CompanyData = {
  companyName: "",
  website: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  industry: "",
  lanes: "",
};

export default function AccountCompany() {
  const [form, setForm] = useState<CompanyData>(empty);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setForm(JSON.parse(raw)); } catch {}
    }
  }, []);

  function handleChange(field: keyof CompanyData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSaved(true);
  }

  return (
    <AccountLayout>
      <h1>Company</h1>
      <form onSubmit={handleSave} className="account-form">
        <label>
          Company Name
          <input type="text" value={form.companyName} onChange={(e) => handleChange("companyName", e.target.value)} data-testid="input-company-name" />
        </label>
        <label>
          Website
          <input type="url" value={form.website} onChange={(e) => handleChange("website", e.target.value)} placeholder="https://" data-testid="input-company-website" />
        </label>
        <label>
          Address Line 1
          <input type="text" value={form.address1} onChange={(e) => handleChange("address1", e.target.value)} data-testid="input-company-addr1" />
        </label>
        <label>
          Address Line 2
          <input type="text" value={form.address2} onChange={(e) => handleChange("address2", e.target.value)} data-testid="input-company-addr2" />
        </label>
        <div className="form-row">
          <label>
            City
            <input type="text" value={form.city} onChange={(e) => handleChange("city", e.target.value)} data-testid="input-company-city" />
          </label>
          <label>
            State / Province
            <input type="text" value={form.state} onChange={(e) => handleChange("state", e.target.value)} data-testid="input-company-state" />
          </label>
          <label>
            ZIP / Postal
            <input type="text" value={form.zip} onChange={(e) => handleChange("zip", e.target.value)} data-testid="input-company-zip" />
          </label>
        </div>
        <label>
          Country
          <input type="text" value={form.country} onChange={(e) => handleChange("country", e.target.value)} data-testid="input-company-country" />
        </label>
        <label>
          Industry
          <select value={form.industry} onChange={(e) => handleChange("industry", e.target.value)} data-testid="select-company-industry">
            <option value="">Select...</option>
            <option value="importer-exporter">Importer/Exporter</option>
            <option value="freight-forwarder">Freight Forwarder/NVOCC</option>
            <option value="project-cargo">Project Cargo/EPC</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Primary Lanes
          <input type="text" value={form.lanes} onChange={(e) => handleChange("lanes", e.target.value)} placeholder="e.g., US-China, EU-LATAM" data-testid="input-company-lanes" />
        </label>
        <button type="submit" className="btn-primary" data-testid="button-save-company">Save</button>
        {saved && <span className="save-msg">Saved (demo)</span>}
      </form>
    </AccountLayout>
  );
}
