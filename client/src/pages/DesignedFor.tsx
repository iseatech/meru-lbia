import { Link } from "wouter";
import SEO from "../components/SEO";

export default function DesignedFor() {
  return (
    <div className="content-page designed-for-page">
      <SEO
        title="Designed For - Meru Express"
        description="Meru Express is designed for importers, freight forwarders, customs brokers, project cargo operators, and trade compliance teams."
        canonical="/designed-for"
      />
      <h1>Designed For</h1>
      <p className="page-lead">
        Meru Express serves the professionals who keep global trade moving.
        Our intelligence platform is built for teams that need reliable,
        actionable data to make confident logistics decisions.
      </p>

      <div className="audience-grid">
        <div className="audience-card" data-testid="card-audience-importers">
          <div className="audience-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
          </div>
          <h3>Importers &amp; Exporters</h3>
          <p>
            Navigate tariff schedules, assess country risk, and ensure customs
            compliance before goods ship. Reduce delays and avoid costly penalties
            with verified intelligence on every corridor you operate.
          </p>
        </div>
        <div className="audience-card" data-testid="card-audience-forwarders">
          <div className="audience-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          </div>
          <h3>Freight Forwarders &amp; NVOCCs</h3>
          <p>
            Evaluate new trade lanes with comprehensive decision briefs covering
            regulatory barriers, sector insights, and geopolitical risk factors.
            Confidently quote and book lanes backed by current intelligence.
          </p>
        </div>
        <div className="audience-card" data-testid="card-audience-brokers">
          <div className="audience-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <h3>Customs Brokers</h3>
          <p>
            Streamline HS code classification and compliance checks. Process
            single codes or bulk batches of up to 250 items efficiently with
            automated duty rate analysis and document verification.
          </p>
        </div>
        <div className="audience-card" data-testid="card-audience-cargo">
          <div className="audience-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <h3>Project Cargo Operators</h3>
          <p>
            Plan oversized and heavy-lift shipments with intelligence on
            country-specific infrastructure, permitting requirements, and
            regulatory frameworks for exceptional cargo movements.
          </p>
        </div>
        <div className="audience-card" data-testid="card-audience-compliance">
          <div className="audience-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>
          </div>
          <h3>Trade Compliance Teams</h3>
          <p>
            Access verified intelligence with SHA-256 document integrity,
            embedded verification codes, and auditable decision trails
            that meet enterprise governance requirements.
          </p>
        </div>
        <div className="audience-card" data-testid="card-audience-executives">
          <div className="audience-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <h3>Supply Chain Executives</h3>
          <p>
            Get executive-grade briefs that distill complex trade data into
            clear risk assessments and actionable recommendations for
            strategic supply chain decisions.
          </p>
        </div>
      </div>

      <div className="designed-for-cta">
        <p>Not sure which service fits your team?</p>
        <Link href="/contact">
          <span className="btn-primary" data-testid="link-designed-contact">Talk to Us</span>
        </Link>
      </div>
    </div>
  );
}
