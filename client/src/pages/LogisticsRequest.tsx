import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import BackButton from "../components/BackButton";
import LogisticsIntakeForm, {
  INITIAL_LOGISTICS,
  isLogisticsValid,
  logisticsPayload,
  type LogisticsFormData,
} from "../components/LogisticsIntakeForm";
import SEO from "../components/SEO";

export default function LogisticsRequest() {
  const { isAuthenticated, isLoading } = useAuth();
  const [logistics, setLogistics] = useState<LogisticsFormData>({ ...INITIAL_LOGISTICS });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  const canSubmit = isAuthenticated && isLogisticsValid(logistics) && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        service_type: "logistics-decision-brief",
        ...logisticsPayload(logistics),
      };

      const res = await fetch("/meru/decision-briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
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
        <SEO title="Logistics Decision Brief - Meru Express" description="Submit your logistics analysis request." canonical="/services/logistics/request" />
        <BackButton />
        <h1>Logistics Decision Brief</h1>
        <div className="intake-form-wrap">
          <div className="intake-auth-gate" data-testid="text-auth-gate">
            <div className="intake-gate-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg></div>
            <h3>Sign in to get started</h3>
            <p>Create an account or log in to submit your Logistics Decision Brief request.</p>
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
            <h3>Request Submitted</h3>
            <p>Your Logistics Decision Brief has been submitted and is being processed.</p>
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
      <SEO title="Logistics Decision Brief - Meru Express" description="Submit your logistics analysis request." canonical="/services/logistics/request" />
      <BackButton />
      <h1>Logistics Decision Brief</h1>
      <p className="service-detail-desc">
        Complete the shipment details below for your logistics intelligence analysis.
      </p>
      <div className="intake-form-wrap">
        <div className="intake-header">
          <h2 data-testid="text-form-title">Logistics Decision Brief</h2>
          <span className="intake-price" data-testid="text-form-price">$149</span>
        </div>
        {error && <p className="intake-error" data-testid="text-form-error">{error}</p>}
        <form onSubmit={handleSubmit} className="intake-form" noValidate>
          <LogisticsIntakeForm data={logistics} onChange={setLogistics} />
          <button type="submit" className="btn-primary intake-submit" disabled={!canSubmit} data-testid="button-submit-request">
            {submitting ? "Submitting..." : "Submit Request \u2014 $149"}
          </button>
        </form>
      </div>
    </div>
  );
}
