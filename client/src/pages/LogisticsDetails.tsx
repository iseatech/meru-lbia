import { Link } from "wouter";
import BackButton from "../components/BackButton";
import SEO from "../components/SEO";

export default function LogisticsDetails() {
  return (
    <div className="service-detail-page">
      <SEO
        title="Logistics Decision Brief - Meru Express"
        description="Comprehensive logistics intelligence report covering routing, cost, regulatory risks, and trade barriers for your shipment corridor."
        canonical="/services/logistics/details"
      />
      <BackButton />
      <h1>Logistics Decision Brief</h1>
      <span className="detail-price" data-testid="text-detail-price">$149 per brief</span>

      <section className="detail-section">
        <h2>What is it?</h2>
        <p>
          A country-specific intelligence report that tells you exactly what to expect
          when shipping to or from a target market. We analyze trade.gov data, tariff
          schedules, and regulatory databases to build a single document you can hand
          to your team, your client, or your customs broker.
        </p>
      </section>

      <section className="detail-section">
        <h2>Deliverables</h2>
        <ul className="detail-list" data-testid="list-deliverables">
          <li>Executive decision summary with risk rating (LOW / MEDIUM / HIGH)</li>
          <li>Route options and recommended transport mode</li>
          <li>Cost drivers and landed-cost considerations</li>
          <li>Trade barrier analysis (tariffs, quotas, sanctions)</li>
          <li>Regulatory flags from relevant government agencies</li>
          <li>Documentation checklist for the corridor</li>
          <li>Key assumptions and data sources cited</li>
          <li>SHA-256 verified PDF with embedded barcode and QR code</li>
        </ul>
      </section>

      <section className="detail-section detail-case">
        <h2>Case Example</h2>
        <div className="case-box" data-testid="text-case-example">
          <p className="case-scenario">
            <strong>Scenario:</strong> A mid-size importer evaluating a new electronics supplier
            in Vietnam needed clarity on total landed costs and regulatory exposure before
            signing a purchase order.
          </p>
          <p className="case-result">
            <strong>Result:</strong> The decision brief identified a LOW country risk rating,
            flagged preferential duty rates under CPTPP, detected a pending anti-dumping
            investigation on similar goods from a competing origin, and recommended ocean
            FCL via Ho Chi Minh City with an estimated transit of 18&ndash;22 days. The
            importer used the report to negotiate better Incoterms and avoid a $40K
            duty exposure on the first shipment.
          </p>
        </div>
      </section>

      <div className="detail-cta">
        <Link href="/services/logistics/request">
          <span className="btn-primary btn-lg" data-testid="button-start-request">Start Request &mdash; $149</span>
        </Link>
      </div>
    </div>
  );
}
