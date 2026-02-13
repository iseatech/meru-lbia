import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import BackButton from "../components/BackButton";
import SEO from "../components/SEO";

const PLANS = [
  {
    slug: "upto-5",
    name: "Up to 5 HS Codes",
    price: "$79",
    desc: "Ideal for single-product importers or initial compliance checks.",
    nested: false,
  },
  {
    slug: "6-20",
    name: "6\u201320 HS Codes",
    price: "$129",
    desc: "For mid-range product lines needing full classification and duty analysis.",
    nested: false,
  },
  {
    slug: "bulk-250",
    name: "Bulk \u2014 up to 250 HS Codes",
    price: "$199",
    desc: "Excel-based bulk processing for large catalogs or warehouse audits.",
    nested: false,
  },
  {
    slug: "trade-document",
    name: "International Trade Document",
    price: "$149",
    desc: "Preparation and review of key trade documents for cross-border shipments.",
    nested: false,
  },
  {
    slug: "letter-of-credit",
    name: "Letter of Credit (L/C)",
    price: "$149",
    desc: "Compliance review ensuring L/C terms align with shipment documentation.",
    nested: true,
  },
];

export default function CustomsSelect() {
  const [selected, setSelected] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const selectedPlan = PLANS.find((p) => p.slug === selected);

  function handleStartRequest() {
    if (!selected) return;
    const target = `/services/customs/${selected}`;
    if (!isAuthenticated) {
      setLocation(`/auth/login`);
      return;
    }
    setLocation(target);
  }

  return (
    <div className="service-detail-page">
      <SEO
        title="Customs Compliance Plans - Meru Express"
        description="Choose a customs compliance plan: HS code classification, duty rate analysis, trade documents, or letter of credit review."
        canonical="/services/customs"
      />
      <BackButton />
      <h1>Customs Compliance</h1>
      <p className="service-detail-desc">
        Select the plan that matches the scope of your compliance needs.
        Each plan includes HS classification, duty analysis, regulatory flags,
        and a SHA-256 verified PDF.
      </p>

      <div className="plan-selector" data-testid="plan-selector">
        {PLANS.map((plan) => (
          <label
            key={plan.slug}
            className={`plan-option${selected === plan.slug ? " plan-option-selected" : ""}${plan.nested ? " plan-option-nested" : ""}`}
            data-testid={`plan-option-${plan.slug}`}
          >
            <input
              type="radio"
              name="customs-plan"
              value={plan.slug}
              checked={selected === plan.slug}
              onChange={() => setSelected(plan.slug)}
              className="plan-radio"
            />
            <div className="plan-option-content">
              <div className="plan-option-header">
                <span className="plan-option-name">{plan.name}</span>
                <span className="plan-option-price">{plan.price}</span>
              </div>
              <span className="plan-option-desc">{plan.desc}</span>
            </div>
          </label>
        ))}
      </div>

      {selectedPlan && (
        <div className="plan-summary" data-testid="plan-summary">
          <span className="plan-summary-label">Selected plan:</span>
          <span className="plan-summary-name">{selectedPlan.name}</span>
          <span className="plan-summary-price">{selectedPlan.price}</span>
        </div>
      )}

      <div className="detail-cta">
        {selected ? (
          <button
            type="button"
            className="btn-primary btn-lg"
            onClick={handleStartRequest}
            data-testid="button-start-request"
          >
            Start Request {selectedPlan ? `\u2014 ${selectedPlan.price}` : ""}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary btn-lg"
            disabled
            data-testid="button-start-request-disabled"
          >
            Select a plan to continue
          </button>
        )}
      </div>
    </div>
  );
}
