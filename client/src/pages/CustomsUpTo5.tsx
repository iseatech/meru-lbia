import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import BackButton from "../components/BackButton";
import HsLineItems, { EMPTY_ITEM, type HsItem } from "../components/HsLineItems";
import SEO from "../components/SEO";

export default function CustomsUpTo5() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [items, setItems] = useState<HsItem[]>([{ ...EMPTY_ITEM }]);
  const [destinationCountry, setDestinationCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  const allItemsValid = items.every(
    (item) => item.hs_code.trim() && item.product_description.trim() && item.country_of_origin.trim()
  );
  const canSubmit = isAuthenticated && allItemsValid && destinationCountry.trim() && !submitting;

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
        body: JSON.stringify({
          service_type: "customs-upto-5",
          hs_items: items,
          destination_country: destinationCountry,
          country_of_origin: items[0]?.country_of_origin || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Submission failed.");
        setSubmitting(false);
        return;
      }
      setSuccess({ id: data.id });
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  function handleDownloadPdf() {
    if (!success) return;
    window.open(`/meru/decision-briefs/${success.id}/pdf`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="service-detail-page">
        <BackButton />
        <div className="intake-form-wrap"><div className="intake-loading">Loading...</div></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="service-detail-page">
        <SEO title="Customs Compliance - Up to 5 HS Codes - Meru Express" description="HS code classification and compliance analysis for up to 5 codes." canonical="/services/customs/upto-5" />
        <BackButton />
        <h1>Customs Compliance &mdash; Up to 5 HS Codes</h1>
        <div className="intake-form-wrap">
          <div className="intake-auth-gate" data-testid="text-auth-gate">
            <div className="intake-gate-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
            </div>
            <h3>Sign in to get started</h3>
            <p>Create an account or log in to submit your customs compliance request.</p>
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
            <div className="intake-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            </div>
            <h3>Request Submitted</h3>
            <p>Your customs compliance analysis has been submitted and is being processed.</p>
            <div className="intake-success-actions">
              <button type="button" className="btn-primary" onClick={handleDownloadPdf} data-testid="button-download-pdf">Download PDF</button>
              <Link href="/account/reports"><span className="btn-outline" data-testid="link-back-dashboard">Back to Dashboard</span></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="service-detail-page">
      <SEO title="Customs Compliance - Up to 5 HS Codes - Meru Express" description="HS code classification and compliance analysis for up to 5 codes." canonical="/services/customs/upto-5" />
      <BackButton />
      <h1>Customs Compliance &mdash; Up to 5 HS Codes</h1>
      <p className="service-detail-desc">
        Add up to 5 HS codes for duty rate analysis, tariff classification, and compliance flags.
      </p>
      <div className="intake-form-wrap">
        <div className="intake-header">
          <h2 data-testid="text-form-title">Up to 5 HS Codes</h2>
          <span className="intake-price" data-testid="text-form-price">$79</span>
        </div>
        {error && <p className="intake-error" data-testid="text-form-error">{error}</p>}
        <form onSubmit={handleSubmit} className="intake-form" noValidate>
          <HsLineItems max={5} items={items} onChange={setItems} />
          <div className="intake-field">
            <label htmlFor="destination_country">Destination Country <span className="required-mark">*</span></label>
            <input id="destination_country" type="text" value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} placeholder="e.g., United States" data-testid="input-destination-country" />
          </div>
          <button type="submit" className="btn-primary intake-submit" disabled={!canSubmit} data-testid="button-submit-request">
            {submitting ? "Submitting..." : "Submit Request \u2014 $79"}
          </button>
        </form>
      </div>
    </div>
  );
}
