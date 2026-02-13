import { useState, useEffect } from "react";
import { Link } from "wouter";
import SEO from "../components/SEO";
import { useAuth } from "../hooks/use-auth";
import { getServiceLabel } from "../components/ServiceIntakeForm";

type Brief = {
  id: string;
  serviceType: string | null;
  status: string | null;
  countryOfOrigin: string | null;
  createdAt: string | null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [recentBriefs, setRecentBriefs] = useState<Brief[]>([]);
  const [briefsLoading, setBriefsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/my-briefs", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setRecentBriefs(data.slice(0, 5));
        setBriefsLoading(false);
      })
      .catch(() => setBriefsLoading(false));
  }, []);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="page dashboard-page">
      <SEO
        title="Admin Dashboard - Meru Express"
        description="Meru Express admin dashboard for managing accounts, reports, and intelligence operations."
        canonical="/dashboard"
      />
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle" data-testid="text-dashboard-welcome">Welcome to your Meru Express workspace.</p>
        </div>
        <Link href="/services">
          <span className="btn-primary" data-testid="link-new-request-top">New Request</span>
        </Link>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card" data-testid="card-profile">
          <div className="dashboard-card-head">
            <span className="dashboard-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            <h2>Profile</h2>
          </div>
          <div className="card-fields">
            <div className="card-field">
              <span className="field-label">Full Name</span>
              <span className="field-value" data-testid="text-profile-name">{user?.firstName || user?.lastName ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim() : "\u2014"}</span>
            </div>
            <div className="card-field">
              <span className="field-label">Email</span>
              <span className="field-value" data-testid="text-profile-email">{user?.email || "\u2014"}</span>
            </div>
            <div className="card-field">
              <span className="field-label">Phone</span>
              <span className="field-value">&mdash;</span>
            </div>
            <div className="card-field">
              <span className="field-label">Role / Title</span>
              <span className="field-value">&mdash;</span>
            </div>
          </div>
          <Link href="/account/profile">
            <span className="card-action" data-testid="link-edit-profile">Edit Profile</span>
          </Link>
        </div>

        <div className="dashboard-card" data-testid="card-company">
          <div className="dashboard-card-head">
            <span className="dashboard-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </span>
            <h2>Company</h2>
          </div>
          <div className="card-fields">
            <div className="card-field">
              <span className="field-label">Company Name</span>
              <span className="field-value">&mdash;</span>
            </div>
            <div className="card-field">
              <span className="field-label">Industry</span>
              <span className="field-value">&mdash;</span>
            </div>
            <div className="card-field">
              <span className="field-label">Primary Lanes</span>
              <span className="field-value">&mdash;</span>
            </div>
          </div>
          <Link href="/account/company">
            <span className="card-action" data-testid="link-edit-company">Edit Company</span>
          </Link>
        </div>

        <div className="dashboard-card" data-testid="card-billing">
          <div className="dashboard-card-head">
            <span className="dashboard-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </span>
            <h2>Billing / Invoices</h2>
          </div>
          <div className="card-placeholder-icon">
            <div className="placeholder-icon" data-testid="icon-billing">$</div>
            Billing will be enabled at launch.
          </div>
          <Link href="/account/billing">
            <span className="card-action" data-testid="link-billing">View Billing</span>
          </Link>
        </div>

        <div className="dashboard-card" data-testid="card-pdfs">
          <div className="dashboard-card-head">
            <span className="dashboard-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </span>
            <h2>My PDFs / Downloads</h2>
          </div>
          {briefsLoading ? (
            <div className="card-placeholder-icon" style={{ color: "var(--text-secondary)" }}>Loading...</div>
          ) : recentBriefs.length === 0 ? (
            <div className="card-placeholder-icon">
              <div className="placeholder-icon" data-testid="icon-pdfs">PDF</div>
              No reports yet. Submit a service request to get started.
            </div>
          ) : (
            <div className="card-fields">
              {recentBriefs.map((b) => (
                <div className="card-field" key={b.id}>
                  <span className="field-label">{formatDate(b.createdAt)}</span>
                  <a
                    href={`/meru/decision-briefs/${b.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="field-value"
                    style={{ color: "var(--primary)", textDecoration: "none", fontSize: "13px" }}
                    data-testid={`link-pdf-${b.id}`}
                  >
                    {getServiceLabel(b.serviceType || "")}
                  </a>
                </div>
              ))}
            </div>
          )}
          <Link href="/account/reports">
            <span className="card-action" data-testid="link-pdfs">View All Reports</span>
          </Link>
        </div>

        <div className="dashboard-card" data-testid="card-payment">
          <div className="dashboard-card-head">
            <span className="dashboard-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            </span>
            <h2>Payment Methods</h2>
          </div>
          <div className="card-placeholder-icon">
            <div className="placeholder-icon" data-testid="icon-payment">CC</div>
            Payment methods will be available at launch.
          </div>
        </div>

        <div className="dashboard-card" data-testid="card-settings">
          <div className="dashboard-card-head">
            <span className="dashboard-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </span>
            <h2>Account Settings</h2>
          </div>
          <div className="card-placeholder-icon">
            <div className="placeholder-icon" data-testid="icon-settings">S</div>
            Manage your account security and preferences.
          </div>
          <Link href="/account/security">
            <span className="card-action" data-testid="link-settings">Manage Security</span>
          </Link>
        </div>

        <div className="dashboard-card dashboard-card-wide" data-testid="card-subscriptions">
          <div className="dashboard-card-head">
            <span className="dashboard-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </span>
            <h2>My Subscriptions / Contracted Services</h2>
          </div>
          <div className="card-placeholder-icon">
            <div className="placeholder-icon" data-testid="icon-subscriptions">S</div>
            No active subscriptions yet.
          </div>
          <div className="card-hint">
            <Link href="/services">
              <span className="btn-primary-sm" data-testid="link-start-request">Start a New Request</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
