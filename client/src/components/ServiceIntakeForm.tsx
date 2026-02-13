import { useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";

type FieldConfig = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
};

type ServiceIntakeFormProps = {
  serviceType: string;
  serviceLabel: string;
  price: string;
  fields: FieldConfig[];
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  "logistics-decision-brief": "Logistics Decision Brief",
  "customs-upto-5": "U.S. Customs Compliance (Up to 5 HS Codes)",
  "customs-6-20": "U.S. Customs Compliance (6\u201320 HS Codes)",
  "customs-bulk-250": "U.S. Customs Compliance (Bulk up to 250)",
  "customs-trade-document": "International Trade Document",
  "customs-letter-of-credit": "Letter of Credit (L/C)",
  "combined": "Combined: Logistics + Customs Compliance",
};

export function getServiceLabel(serviceType: string): string {
  return SERVICE_TYPE_LABELS[serviceType] || serviceType;
}

export default function ServiceIntakeForm({
  serviceType,
  serviceLabel,
  price,
  fields,
}: ServiceIntakeFormProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  function updateField(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  const requiredFields = fields.filter((f) => f.required !== false);
  const allFilled = requiredFields.every((f) => (formData[f.name] || "").trim());
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
        body: JSON.stringify({
          service_type: serviceType,
          country_of_origin: formData.country_of_origin || formData.origin_country || null,
          ...formData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Submission failed.");
        setSubmitting(false);
        return;
      }
      setSuccess({ id: data.id });
      setSubmitting(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function handleDownloadPdf() {
    if (!success) return;
    window.open(`/meru/decision-briefs/${success.id}/pdf`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="intake-form-wrap">
        <div className="intake-loading">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="intake-form-wrap">
        <div className="intake-auth-gate" data-testid="text-auth-gate">
          <div className="intake-gate-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h3>Sign in to get started</h3>
          <p>Create an account or log in to submit your {serviceLabel} request.</p>
          <div className="intake-gate-actions">
            <Link href="/auth/login">
              <span className="btn-primary" data-testid="button-login-gate">Log In</span>
            </Link>
            <Link href="/auth/signup">
              <span className="btn-outline" data-testid="button-signup-gate">Create Account</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="intake-form-wrap">
        <div className="intake-success" data-testid="text-submission-success">
          <div className="intake-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3>Request Submitted</h3>
          <p>Your {serviceLabel} has been submitted and is being processed.</p>
          <p className="intake-ref">Reference ID: <span className="mono">{success.id}</span></p>
          <div className="intake-success-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleDownloadPdf}
              data-testid="button-download-pdf"
            >
              Download PDF
            </button>
            <Link href="/account/reports">
              <span className="btn-outline" data-testid="link-back-dashboard">Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="intake-form-wrap">
      <div className="intake-header">
        <h2 data-testid="text-form-title">{serviceLabel}</h2>
        <span className="intake-price" data-testid="text-form-price">{price}</span>
      </div>

      {error && <p className="intake-error" data-testid="text-form-error">{error}</p>}

      <form onSubmit={handleSubmit} className="intake-form" noValidate>
        {fields.map((field) => (
          <div className="intake-field" key={field.name}>
            <label htmlFor={`intake-${field.name}`}>
              {field.label}
              {field.required !== false && <span className="required-mark">*</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea
                id={`intake-${field.name}`}
                value={formData[field.name] || ""}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                data-testid={`input-${field.name}`}
              />
            ) : field.type === "select" ? (
              <select
                id={`intake-${field.name}`}
                value={formData[field.name] || ""}
                onChange={(e) => updateField(field.name, e.target.value)}
                data-testid={`select-${field.name}`}
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`intake-${field.name}`}
                type="text"
                value={formData[field.name] || ""}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder}
                data-testid={`input-${field.name}`}
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          className="btn-primary intake-submit"
          disabled={!canSubmit}
          data-testid="button-submit-request"
        >
          {submitting ? "Submitting..." : `Submit Request \u2014 ${price}`}
        </button>
      </form>
    </div>
  );
}
