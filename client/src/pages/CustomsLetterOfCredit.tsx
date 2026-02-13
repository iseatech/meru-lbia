import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import BackButton from "../components/BackButton";
import SEO from "../components/SEO";

export default function CustomsLetterOfCredit() {
  const { isAuthenticated, isLoading } = useAuth();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  function updateField(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  const requiredFields = ["lc_type", "product_description", "beneficiary_name", "applicant_name", "issuing_bank", "country_of_origin", "destination_country"];
  const allFilled = requiredFields.every((f) => (formData[f] || "").trim());
  const canSubmit = isAuthenticated && allFilled && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/meru/decision-briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ service_type: "customs-letter-of-credit", ...formData }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Submission failed."); setSubmitting(false); return; }
      setSuccess({ id: data.id });
    } catch { setError("Something went wrong. Please try again."); }
    setSubmitting(false);
  }

  if (isLoading) {
    return <div className="service-detail-page"><BackButton /><div className="intake-form-wrap"><div className="intake-loading">Loading...</div></div></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="service-detail-page">
        <SEO title="Letter of Credit Review - Meru Express" description="L/C compliance review and documentation analysis." canonical="/services/customs/letter-of-credit" />
        <BackButton />
        <h1>Letter of Credit (L/C) Compliance Review</h1>
        <div className="intake-form-wrap">
          <div className="intake-auth-gate" data-testid="text-auth-gate">
            <div className="intake-gate-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg></div>
            <h3>Sign in to get started</h3>
            <p>Create an account or log in to submit your L/C compliance review request.</p>
            <div className="intake-gate-actions">
              <Link href="/auth/login"><span className="btn-primary" data-testid="button-login-gate">Log In</span></Link>
              <Link href="/auth/signup"><span className="btn-outline" data-testid="button-signup-gate">Create Account</span></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="service-detail-page">
        <BackButton />
        <div className="intake-form-wrap">
          <div className="intake-success" data-testid="text-submission-success">
            <div className="intake-success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
            <h3>Draft Request Submitted</h3>
            <p>Your Letter of Credit compliance review request has been submitted.</p>
            <div className="intake-success-actions">
              <div className="tooltip-wrap">
                <button type="button" className="btn-primary btn-disabled-tooltip" disabled data-testid="button-download-pdf">Download PDF</button>
                <span className="tooltip-text">Available after processing</span>
              </div>
              <Link href="/account/reports"><span className="btn-outline" data-testid="link-back-dashboard">Back to Dashboard</span></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="service-detail-page">
      <SEO title="Letter of Credit Review - Meru Express" description="L/C compliance review and documentation analysis." canonical="/services/customs/letter-of-credit" />
      <BackButton />
      <h1>Letter of Credit (L/C) Compliance Review</h1>
      <p className="service-detail-desc">Professional compliance analysis of your Letter of Credit documentation.</p>
      <div className="intake-form-wrap">
        <div className="intake-header">
          <h2 data-testid="text-form-title">L/C Compliance Review</h2>
          <span className="intake-price" data-testid="text-form-price">$149</span>
        </div>
        {error && <p className="intake-error" data-testid="text-form-error">{error}</p>}
        <form onSubmit={handleSubmit} className="intake-form" noValidate>
          <fieldset className="form-section">
            <legend>Letter of Credit Details</legend>
            <div className="intake-field">
              <label htmlFor="lc_type">L/C Type <span className="required-mark">*</span></label>
              <select id="lc_type" value={formData.lc_type || ""} onChange={(e) => updateField("lc_type", e.target.value)} data-testid="select-lc-type">
                <option value="">Select...</option>
                <option value="irrevocable">Irrevocable L/C</option>
                <option value="confirmed">Confirmed L/C</option>
                <option value="standby">Standby L/C</option>
                <option value="transferable">Transferable L/C</option>
                <option value="unsure">Not sure / Need guidance</option>
              </select>
            </div>
            <div className="intake-field">
              <label htmlFor="transaction_value">Approximate Transaction Value</label>
              <input id="transaction_value" type="text" value={formData.transaction_value || ""} onChange={(e) => updateField("transaction_value", e.target.value)} placeholder="e.g., $250,000" data-testid="input-transaction-value" />
            </div>
            <div className="intake-field">
              <label htmlFor="issuing_bank">Issuing Bank <span className="required-mark">*</span></label>
              <input id="issuing_bank" type="text" value={formData.issuing_bank || ""} onChange={(e) => updateField("issuing_bank", e.target.value)} placeholder="e.g., Bank of China" data-testid="input-issuing-bank" />
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Parties</legend>
            <div className="intake-field">
              <label htmlFor="beneficiary_name">Beneficiary (Exporter) <span className="required-mark">*</span></label>
              <input id="beneficiary_name" type="text" value={formData.beneficiary_name || ""} onChange={(e) => updateField("beneficiary_name", e.target.value)} placeholder="e.g., ABC Manufacturing Co." data-testid="input-beneficiary-name" />
            </div>
            <div className="intake-field">
              <label htmlFor="applicant_name">Applicant (Importer) <span className="required-mark">*</span></label>
              <input id="applicant_name" type="text" value={formData.applicant_name || ""} onChange={(e) => updateField("applicant_name", e.target.value)} placeholder="e.g., XYZ Distribution Inc." data-testid="input-applicant-name" />
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Trade Route &amp; Goods</legend>
            <div className="intake-field">
              <label htmlFor="country_of_origin">Exporter Country <span className="required-mark">*</span></label>
              <input id="country_of_origin" type="text" value={formData.country_of_origin || ""} onChange={(e) => updateField("country_of_origin", e.target.value)} placeholder="e.g., India" data-testid="input-country-of-origin" />
            </div>
            <div className="intake-field">
              <label htmlFor="destination_country">Importer Country <span className="required-mark">*</span></label>
              <input id="destination_country" type="text" value={formData.destination_country || ""} onChange={(e) => updateField("destination_country", e.target.value)} placeholder="e.g., United States" data-testid="input-destination-country" />
            </div>
            <div className="intake-field">
              <label htmlFor="product_description">Product / Transaction Description <span className="required-mark">*</span></label>
              <textarea id="product_description" value={formData.product_description || ""} onChange={(e) => updateField("product_description", e.target.value)} placeholder="Describe the goods and transaction details" rows={3} data-testid="input-product-description" />
            </div>
          </fieldset>

          <div className="intake-field">
            <label htmlFor="special_requirements">Additional Notes</label>
            <textarea id="special_requirements" value={formData.special_requirements || ""} onChange={(e) => updateField("special_requirements", e.target.value)} placeholder="Any specific L/C terms, conditions, or concerns" rows={3} data-testid="input-special-requirements" />
          </div>

          <button type="submit" className="btn-primary intake-submit" disabled={!canSubmit} data-testid="button-submit-request">
            {submitting ? "Submitting..." : "Submit Request \u2014 $149"}
          </button>
        </form>
      </div>
    </div>
  );
}
