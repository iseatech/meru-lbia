import { Link } from "wouter";
import BackButton from "../components/BackButton";
import SEO from "../components/SEO";

export default function CombinedDetails() {
  return (
    <div className="service-detail-page">
      <SEO
        title="Combined Logistics + Customs - Meru Express"
        description="Full-spectrum logistics decision brief and customs compliance analysis delivered in one verified document."
        canonical="/services/combined/details"
      />
      <BackButton />
      <h1>Combined: Logistics + Customs Compliance</h1>
      <span className="detail-price" data-testid="text-detail-price">$299 per package</span>

      <section className="detail-section">
        <h2>What is it?</h2>
        <p>
          The full-spectrum package. You get a logistics decision brief and customs
          compliance analysis delivered together in one verified document &mdash; covering
          everything from country risk and trade barriers to HS classification and duty rates.
          One report, one verification code, complete coverage.
        </p>
      </section>

      <section className="detail-section">
        <h2>Deliverables</h2>
        <ul className="detail-list" data-testid="list-deliverables">
          <li>Everything in the Logistics Decision Brief</li>
          <li>Full customs compliance analysis (up to 20 HS codes included)</li>
          <li>Integrated risk and compliance matrix</li>
          <li>Unified PDF with cross-referenced findings</li>
          <li>Single verification code covering the entire package</li>
          <li>SHA-256 verified PDF with embedded barcode and QR code</li>
        </ul>
      </section>

      <section className="detail-section detail-case">
        <h2>Case Example</h2>
        <div className="case-box" data-testid="text-case-example">
          <p className="case-scenario">
            <strong>Scenario:</strong> A freight forwarder was quoting a new lane from Shenzhen
            to Chicago for an electronics client with 14 SKUs. They needed both a routing
            analysis and full tariff classification before committing to the quote.
          </p>
          <p className="case-result">
            <strong>Result:</strong> The combined package delivered a country risk brief covering
            Section 301 tariffs, classified all 14 HS codes with applicable duty rates,
            identified an exclusion opportunity on two product lines that saved the client
            an estimated $18K per shipment, and provided a documentation checklist for
            both origin and destination &mdash; all in one report.
          </p>
        </div>
      </section>

      <div className="detail-cta">
        <Link href="/services/combined/request">
          <span className="btn-primary btn-lg" data-testid="button-start-request">Start Request &mdash; $299</span>
        </Link>
      </div>
    </div>
  );
}
