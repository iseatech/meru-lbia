import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import BackButton from "../components/BackButton";
import SEO from "../components/SEO";

export default function CustomsTradeDocument() {
  const { isAuthenticated, isLoading } = useAuth();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  function updateField(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  const requiredFields = ["document_type", "shipper_name", "consignee_name", "product_description", "country_of_origin", "destination_country"];
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
        body: JSON.stringify({ service_type: "customs-trade-document", ...formData }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Submission failed."); setSubmitting(false); return; }
      setSuccess({ id: data.id });
    } catch { setError("Something went wrong. Please try again."); }
    setSubmitting(false);
  }

  function handleDownloadPdf() {
    if (!success) return;
    window.open(`/meru/decision-briefs/${success.id}/pdf`, "_blank");
  }

  if (isLoading) {
    return <div className="service-detail-page"><BackButton /><div className="intake-form-wrap"><div className="intake-loading">Loading...</div></div></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="service-detail-page">
        <SEO title="Trade Document Review - Meru Express" description="Expert review of international trade documents." canonical="/services/customs/trade-document" />
        <BackButton />
        <h1>International Trade Document Review</h1>
        <div className="intake-form-wrap">
          <div className="intake-auth-gate" data-testid="text-auth-gate">
            <div className="intake-gate-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg></div>
            <h3>Sign in to get started</h3>
            <p>Create an account or log in to submit your trade document review request.</p>
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
            <p>Your trade document review request has been submitted and is being processed.</p>
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
      <SEO title="Trade Document Review - Meru Express" description="Expert review of international trade documents." canonical="/services/customs/trade-document" />
      <BackButton />
      <h1>International Trade Document Review</h1>
      <p className="service-detail-desc">Expert review and compliance verification of your international trade documents.</p>
      <div className="intake-form-wrap">
        <div className="intake-header">
          <h2 data-testid="text-form-title">Trade Document Review</h2>
          <span className="intake-price" data-testid="text-form-price">$149</span>
        </div>
        {error && <p className="intake-error" data-testid="text-form-error">{error}</p>}
        <form onSubmit={handleSubmit} className="intake-form" noValidate>
          <fieldset className="form-section">
            <legend>Document Details</legend>
            <div className="intake-field">
              <label htmlFor="document_type">Document Type <span className="required-mark">*</span></label>
              <select id="document_type" value={formData.document_type || ""} onChange={(e) => updateField("document_type", e.target.value)} data-testid="select-document-type">
                <option value="">Select...</option>
                <option value="commercial-invoice">Commercial Invoice</option>
                <option value="packing-list">Packing List</option>
                <option value="certificate-of-origin">Certificate of Origin</option>
                <option value="bill-of-lading">Bill of Lading</option>
                <option value="customs-declaration">Customs Declaration</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="intake-field">
              <label htmlFor="product_description">Product / Cargo Description <span className="required-mark">*</span></label>
              <textarea id="product_description" value={formData.product_description || ""} onChange={(e) => updateField("product_description", e.target.value)} placeholder="Describe the goods being shipped" rows={3} data-testid="input-product-description" />
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Shipper &amp; Consignee</legend>
            <div className="intake-field">
              <label htmlFor="shipper_name">Shipper / Exporter Name <span className="required-mark">*</span></label>
              <input id="shipper_name" type="text" value={formData.shipper_name || ""} onChange={(e) => updateField("shipper_name", e.target.value)} placeholder="e.g., ABC Manufacturing Co." data-testid="input-shipper-name" />
            </div>
            <div className="intake-field">
              <label htmlFor="consignee_name">Consignee / Importer Name <span className="required-mark">*</span></label>
              <input id="consignee_name" type="text" value={formData.consignee_name || ""} onChange={(e) => updateField("consignee_name", e.target.value)} placeholder="e.g., XYZ Distribution Inc." data-testid="input-consignee-name" />
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Trade Route</legend>
            <div className="intake-field">
              <label htmlFor="country_of_origin">Country of Origin <span className="required-mark">*</span></label>
              <input id="country_of_origin" type="text" value={formData.country_of_origin || ""} onChange={(e) => updateField("country_of_origin", e.target.value)} placeholder="e.g., Vietnam" data-testid="input-country-of-origin" />
            </div>
            <div className="intake-field">
              <label htmlFor="destination_country">Destination Country <span className="required-mark">*</span></label>
              <input id="destination_country" type="text" value={formData.destination_country || ""} onChange={(e) => updateField("destination_country", e.target.value)} placeholder="e.g., United States" data-testid="input-destination-country" />
            </div>
          </fieldset>

          <div className="intake-field">
            <label htmlFor="special_requirements">Additional Notes</label>
            <textarea id="special_requirements" value={formData.special_requirements || ""} onChange={(e) => updateField("special_requirements", e.target.value)} placeholder="Any specific document requirements or concerns" rows={3} data-testid="input-special-requirements" />
          </div>

          <button type="submit" className="btn-primary intake-submit" disabled={!canSubmit} data-testid="button-submit-request">
            {submitting ? "Submitting..." : "Submit Request \u2014 $149"}
          </button>
        </form>
      </div>
    </div>
  );
}
