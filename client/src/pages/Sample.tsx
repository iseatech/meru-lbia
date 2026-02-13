import { Link } from "wouter";
import SEO from "../components/SEO";

export default function Sample() {
  return (
    <div className="content-page sample-page">
      <SEO
        title="Sample Brief - Meru Express"
        description="Preview a sample Meru Express logistics decision brief to see the intelligence, analysis, and verification features included in every report."
        canonical="/sample"
      />
      <h1>Sample Decision Brief</h1>
      <p className="page-lead">
        See what a Meru Express logistics decision brief looks like.
        Every brief includes country risk analysis, trade barrier assessment,
        regulatory flags, and cryptographic verification.
      </p>

      <div className="sample-preview-card" data-testid="card-sample-preview">
        <div className="sample-preview-header">
          <span className="sample-preview-badge">Sample Report</span>
          <h3>What is included</h3>
        </div>
        <ul className="sample-checklist">
          <li data-testid="sample-item-risk">Country risk assessment (LOW / MEDIUM / HIGH)</li>
          <li data-testid="sample-item-barriers">Trade barriers and tariff analysis</li>
          <li data-testid="sample-item-regulatory">Regulatory flags from government agencies</li>
          <li data-testid="sample-item-sector">Sector-specific insights and trends</li>
          <li data-testid="sample-item-geo">Geopolitical notes and risk factors</li>
          <li data-testid="sample-item-pdf">SHA-256 verified PDF with embedded barcode and QR code</li>
          <li data-testid="sample-item-code">Unique MERU verification code for document authentication</li>
        </ul>
      </div>

      <h2>Intelligence Sources</h2>
      <p>
        Our briefs draw from curated trade.gov data, International Trade
        Administration publications, and proprietary intelligence analysis.
        The DB-first approach ensures you receive the most current information
        available.
      </p>

      <h2>Ready to order?</h2>
      <p>
        Create an account to request your first logistics decision brief.
        Reports are typically delivered within 24 hours.
      </p>
      <div className="sample-actions">
        <Link href="/auth/signup">
          <span className="btn-primary" data-testid="link-sample-signup">Create Account</span>
        </Link>
        <Link href="/services">
          <span className="btn-outline" data-testid="link-sample-services">View All Services</span>
        </Link>
      </div>
    </div>
  );
}
