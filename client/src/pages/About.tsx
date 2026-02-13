import SEO from "../components/SEO";

export default function About() {
  return (
    <div className="content-page">
      <SEO
        title="About - Meru Express"
        description="Learn about Meru Express, the logistics decision intelligence platform built for importers, freight forwarders, and project cargo operators."
        canonical="/about"
      />
      <h1>About Meru Express</h1>
      <p className="page-lead">
        We deliver executive-grade logistics and trade intelligence so supply chain
        professionals can make confident, data-driven decisions.
      </p>

      <h2>Our Mission</h2>
      <p>
        Meru Express was built to close the intelligence gap in international logistics.
        Too many trade decisions are made with incomplete data, outdated country risk
        profiles, or manual compliance checks that slow down operations and increase exposure.
      </p>
      <p>
        We combine curated trade.gov intelligence, real-time country risk analysis,
        and automated customs compliance into a single decision brief that arrives
        in 24 hours or less — replacing weeks of fragmented research with one verified document.
      </p>

      <h2>What We Do</h2>
      <p>
        Our platform produces decision briefs that cover trade barriers, regulatory
        flags, sector-specific insights, and geopolitical risk assessments. Every
        document is cryptographically verified with SHA-256 hashing and embedded
        verification codes.
      </p>
      <ul>
        <li>Logistics Decision Briefs with country-specific intelligence</li>
        <li>Customs compliance analysis for HS code classification</li>
        <li>Combined logistics and compliance packages</li>
        <li>Document integrity verification with barcode and QR code authentication</li>
      </ul>

      <h2>Built for Professionals</h2>
      <p>
        Whether you are a freight forwarder evaluating a new trade lane, an importer
        navigating complex tariff schedules, or a project cargo operator planning
        oversized shipments, Meru Express provides the intelligence you need
        to move with confidence.
      </p>
    </div>
  );
}
