import { Link, useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import SEO from "../components/SEO";
import { servicesContent } from "../mvcs/content";
import { CtaSection, HeroSection } from "../mvcs/sections";

function AuthStartButton({ href, label, testId }: { href: string; label: string; testId: string }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      setLocation("/auth/login");
      return;
    }
    setLocation(href);
  }

  return (
    <button type="button" className="btn-primary" onClick={handleClick} data-testid={testId}>
      {label}
    </button>
  );
}

export default function Services() {
  const stats = servicesContent.sections[0]?.stats ?? [];

  return (
    <>
      <SEO
        title={servicesContent.seo.title}
        description={servicesContent.seo.description}
        canonical={servicesContent.seo.canonical}
      />

      <>
      {servicesContent.hero ? <HeroSection content={servicesContent.hero} /> : null}

      <section className="services-overview-strip" data-testid="services-overview-strip">
        {stats.map((item, idx) => (
          <div key={`${item.value}-${idx}`} className="services-overview-item">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <div className="services-cards">

        {/* Logistics Decision Brief */}
        <div className="sales-card" data-testid="card-logistics">
          <div className="sales-card-eyebrow">Most requested for corridor planning</div>
          <div className="sales-card-top">
            <span className="sales-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>
            </span>
            <div className="sales-card-price" data-testid="price-logistics">
              <span className="price-amount">$149</span>
              <span className="price-unit">per brief</span>
            </div>
          </div>
          <h2 data-testid="title-logistics">Logistics Decision Brief</h2>
          <p className="sales-card-desc">
            A comprehensive, country-specific intelligence report covering trade barriers,
            regulatory flags, and sector-level dynamics for confident routing and sourcing decisions.
          </p>
          <div className="sales-card-actions">
            <Link href="/services/logistics/details">
              <span className="btn-outline" data-testid="link-logistics-details">View Details</span>
            </Link>
            <AuthStartButton href="/services/logistics/request" label="Start Request" testId="link-logistics-start" />
          </div>
        </div>

        {/* Customs Compliance */}
        <div className="sales-card" data-testid="card-customs">
          <div className="sales-card-eyebrow">Best for HS and customs readiness</div>
          <div className="sales-card-top">
            <span className="sales-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            </span>
            <div className="sales-card-price" data-testid="price-customs">
              <span className="price-amount">From $79</span>
              <span className="price-unit">per engagement</span>
            </div>
          </div>
          <h2 data-testid="title-customs">Customs Compliance</h2>
          <p className="sales-card-desc">
            HS code classification, duty rate analysis, and trade document preparation
            at every scale &mdash; from a handful of product codes to bulk processing of entire catalogs.
          </p>
          <div className="sales-card-actions">
            <Link href="/services/customs/details">
              <span className="btn-outline" data-testid="link-customs-details">View Details</span>
            </Link>
            <AuthStartButton href="/services/customs" label="Start Request" testId="link-customs-start" />
          </div>
        </div>

        {/* Combined */}
        <div className="sales-card sales-card-featured" data-testid="card-combined">
          <div className="sales-card-badge" data-testid="badge-best-value">Best Value</div>
          <div className="sales-card-eyebrow">End-to-end risk and compliance coverage</div>
          <div className="sales-card-top">
            <span className="sales-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            </span>
            <div className="sales-card-price" data-testid="price-combined">
              <span className="price-amount">$299</span>
              <span className="price-unit">per package</span>
            </div>
          </div>
          <h2 data-testid="title-combined">Combined: Logistics + Customs Compliance</h2>
          <p className="sales-card-desc">
            The full-spectrum package &mdash; logistics decision brief and customs compliance analysis
            delivered together in one verified document.
          </p>
          <div className="sales-card-actions">
            <Link href="/services/combined/details">
              <span className="btn-outline" data-testid="link-combined-details">View Details</span>
            </Link>
            <AuthStartButton href="/services/combined/request" label="Start Request" testId="link-combined-start" />
          </div>
        </div>
      </div>

      <section className="services-trust">
        <h2>Every report includes</h2>
        <div className="services-trust-grid">
          <div className="services-trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>SHA-256 document integrity</span>
          </div>
          <div className="services-trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h7v7h-7z"/></svg>
            <span>Embedded barcode &amp; QR code</span>
          </div>
          <div className="services-trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span>Public verification endpoint</span>
          </div>
          <div className="services-trust-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>24-hour turnaround</span>
          </div>
        </div>
      </section>

      <section className="services-final-cta">
        {servicesContent.sections[1] ? (
          <CtaSection
            title={servicesContent.sections[1].title ?? ""}
            paragraph={servicesContent.sections[1].paragraph}
            ctas={servicesContent.sections[1].ctas ?? []}
          />
        ) : null}
      </section>
      </>
    </>
  );
}
