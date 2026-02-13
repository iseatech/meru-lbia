import { Link } from "wouter";
import BackButton from "../components/BackButton";
import SEO from "../components/SEO";

export default function CustomsDetails() {
  return (
    <div className="service-detail-page">
      <SEO
        title="Customs Compliance - Meru Express"
        description="HS code classification, duty rate analysis, and trade document preparation at every scale."
        canonical="/services/customs/details"
      />
      <BackButton />
      <h1>Customs Compliance</h1>
      <span className="detail-price" data-testid="text-detail-price">From $79 per engagement</span>

      <section className="detail-section">
        <h2>What is it?</h2>
        <p>
          HS code classification, duty rate analysis, and trade document preparation
          at every scale &mdash; from a handful of product codes to bulk processing of
          entire catalogs. Each deliverable is verified and ready for broker or agency submission.
          Choose from five plans based on the scope of your compliance needs.
        </p>
      </section>

      <section className="detail-section">
        <h2>Deliverables (all plans)</h2>
        <ul className="detail-list" data-testid="list-deliverables">
          <li>Correct HS code classification with supporting rationale</li>
          <li>Applicable duty rates and preferential program eligibility</li>
          <li>Regulatory agency flags (FDA, CPSC, FCC, EPA as applicable)</li>
          <li>Anti-dumping / countervailing duty screening</li>
          <li>Documentation review and compliance checklist</li>
          <li>SHA-256 verified PDF with embedded barcode and QR code</li>
        </ul>
      </section>

      <section className="detail-section">
        <h2>Available Plans</h2>
        <div className="detail-plans-summary" data-testid="list-plans">
          <div className="plan-row">
            <span className="plan-name">Up to 5 HS Codes</span>
            <span className="plan-price">$79</span>
          </div>
          <div className="plan-row">
            <span className="plan-name">6&ndash;20 HS Codes</span>
            <span className="plan-price">$129</span>
          </div>
          <div className="plan-row">
            <span className="plan-name">Bulk &mdash; up to 250 HS Codes</span>
            <span className="plan-price">$199</span>
          </div>
          <div className="plan-row">
            <span className="plan-name">International Trade Document</span>
            <span className="plan-price">$149</span>
          </div>
          <div className="plan-row">
            <span className="plan-name">Letter of Credit (L/C)</span>
            <span className="plan-price">$149</span>
          </div>
        </div>
      </section>

      <section className="detail-section detail-case">
        <h2>Case Example</h2>
        <div className="case-box" data-testid="text-case-example">
          <p className="case-scenario">
            <strong>Scenario:</strong> An importer was bringing in 12 SKUs of kitchen appliances
            from Germany and needed to confirm tariff classifications and regulatory requirements
            before the goods reached U.S. customs.
          </p>
          <p className="case-result">
            <strong>Result:</strong> The compliance report classified each product under the correct
            HS heading, identified a 2.7% MFN duty rate, flagged one item requiring FDA
            food-contact certification, confirmed no anti-dumping orders applied, and provided
            a documentation checklist that the importer forwarded directly to their customs
            broker &mdash; clearing the shipment on first attempt with zero holds.
          </p>
        </div>
      </section>

      <p className="detail-disclaimer">
        We provide analytical guidance; final classification and filing remains the
        importer&rsquo;s responsibility.
      </p>

      <div className="detail-cta">
        <Link href="/services/customs">
          <span className="btn-primary btn-lg" data-testid="button-choose-plan">Choose a Plan</span>
        </Link>
      </div>
    </div>
  );
}
