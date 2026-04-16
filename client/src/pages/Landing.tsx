import { Link } from "wouter";
import { useEffect } from "react";
import SEO from "../components/SEO";

export default function Landing() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Meru Express",
      url: "https://meruexpress.com",
      description: "Executive-grade logistics and trade intelligence for importers, freight forwarders and project cargo operators.",
      sameAs: [
        "https://www.linkedin.com/company/meruexpress",
        "https://twitter.com/meruexpress",
        "https://www.facebook.com/meruexpress",
        "https://www.instagram.com/meruexpress"
      ]
    });
    script.id = "org-jsonld";
    if (!document.getElementById("org-jsonld")) {
      document.head.appendChild(script);
    }
    return () => {
      const el = document.getElementById("org-jsonld");
      if (el) el.remove();
    };
  }, []);

  return (
    <>
      <SEO
        title="Meru Express - Logistics Decision Intelligence"
        description="Executive-grade logistics and trade intelligence. Decision briefs, customs compliance, and country risk analysis for importers, freight forwarders and project cargo operators."
        canonical="/"
      />

      <section className="hero-section">
        <div className="hero-pattern" />
        <div className="hero-glow" />
        <div className="hero-content">
          <span className="hero-label" data-testid="text-hero-label">Logistics Decision Intelligence</span>
          <h1 data-testid="text-hero-title">Make smarter logistics decisions, faster</h1>
          <p data-testid="text-hero-description">
            Executive-grade decision briefs, customs compliance analysis,
            and trade intelligence for global supply chain professionals.
          </p>
          <div className="hero-actions">
            <Link href="/services">
              <span className="btn-hero-primary" data-testid="link-explore-services">
                Explore Services
              </span>
            </Link>
            <Link href="/sample">
              <span className="btn-hero-outline" data-testid="link-view-sample">
                View Sample Brief
              </span>
            </Link>
          </div>
        </div>
      </section>

      <div className="trust-bar">
        <div className="trust-item">
          <div className="trust-number" data-testid="text-trust-countries">190+</div>
          <div className="trust-label">Countries Covered</div>
        </div>
        <div className="trust-item">
          <div className="trust-number" data-testid="text-trust-time">24h</div>
          <div className="trust-label">Turnaround</div>
        </div>
        <div className="trust-item">
          <div className="trust-number" data-testid="text-trust-compliance">100%</div>
          <div className="trust-label">Compliance Verified</div>
        </div>
        <div className="trust-item">
          <div className="trust-number" data-testid="text-trust-integrity">SHA-256</div>
          <div className="trust-label">Document Integrity</div>
        </div>
      </div>

      <section className="landing-section">
        <div className="landing-inner">
          <span className="section-label">Capabilities</span>
          <h2>Intelligence that drives decisions</h2>
          <p className="section-desc">
            From country risk assessment to HS code compliance, our platform delivers
            actionable intelligence tailored to your specific trade corridors.
          </p>
          <div className="features-grid">
            <div className="feature-card" data-testid="card-feature-decision">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>
              </div>
              <h3>Logistics Decision Briefs</h3>
              <p>
                Comprehensive country-by-country analysis covering trade barriers,
                regulatory flags, and sector-specific insights for informed decision making.
              </p>
            </div>
            <div className="feature-card" data-testid="card-feature-customs">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              </div>
              <h3>Customs Compliance</h3>
              <p>
                HS code classification, duty rate analysis, and trade document
                preparation. From single codes to bulk processing of 250+ items.
              </p>
            </div>
            <div className="feature-card" data-testid="card-feature-intelligence">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              </div>
              <h3>Trade Intelligence</h3>
              <p>
                DB-first intelligence sourced from trade.gov data, real-time risk
                assessments, and geopolitical analysis with document-level verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section alt">
        <div className="landing-inner">
          <span className="section-label">What You Get</span>
          <h2>Every brief includes</h2>
          <div className="deliverables-grid">
            <div className="deliverable-item" data-testid="deliverable-risk">
              <span className="deliverable-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </span>
              <div>
                <strong>Country risk rating</strong>
                <span>LOW / MEDIUM / HIGH classification with supporting evidence</span>
              </div>
            </div>
            <div className="deliverable-item" data-testid="deliverable-barriers">
              <span className="deliverable-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              </span>
              <div>
                <strong>Trade barrier analysis</strong>
                <span>Tariffs, quotas, sanctions, and non-tariff barriers identified</span>
              </div>
            </div>
            <div className="deliverable-item" data-testid="deliverable-regulatory">
              <span className="deliverable-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
              </span>
              <div>
                <strong>Regulatory flags</strong>
                <span>Agency alerts and compliance requirements by jurisdiction</span>
              </div>
            </div>
            <div className="deliverable-item" data-testid="deliverable-sector">
              <span className="deliverable-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </span>
              <div>
                <strong>Sector-specific insights</strong>
                <span>Industry trends and supply chain dynamics for your vertical</span>
              </div>
            </div>
            <div className="deliverable-item" data-testid="deliverable-verified">
              <span className="deliverable-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </span>
              <div>
                <strong>SHA-256 verified PDF</strong>
                <span>Cryptographically signed with embedded barcode and QR code</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-inner">
          <span className="section-label">Security</span>
          <h2>Enterprise-grade document integrity</h2>
          <p className="section-desc">
            Every decision brief is cryptographically verified with SHA-256 hashing,
            embedded barcodes, and QR codes for tamper-proof authentication.
          </p>
          <div className="features-grid">
            <div className="feature-card" data-testid="card-security-verification">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3>Verification Codes</h3>
              <p>
                Each document receives a unique MERU verification code that can
                be validated through our public verification endpoint.
              </p>
            </div>
            <div className="feature-card" data-testid="card-security-hash">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </div>
              <h3>SHA-256 Hashing</h3>
              <p>
                PDF documents are hashed post-generation to ensure content integrity
                throughout the document lifecycle.
              </p>
            </div>
            <div className="feature-card" data-testid="card-security-barcode">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h7v7h-7z"/></svg>
              </div>
              <h3>Embedded Authentication</h3>
              <p>
                Code128 barcodes and QR codes are embedded directly in every PDF
                for instant verification scanning.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to get started?</h2>
        <p>
          Create your account and request your first logistics decision brief today.
        </p>
        <div className="hero-actions">
          <Link href="/auth/signup">
            <span className="btn-hero-primary" data-testid="link-cta-signup">Create Free Account</span>
          </Link>
          <Link href="/contact">
            <span className="btn-hero-outline" data-testid="link-cta-contact">Contact Sales</span>
          </Link>
        </div>
      </section>
    </>
  );
}
