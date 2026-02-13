import { useState, useEffect } from "react";
import SEO from "../components/SEO";
import { Link } from "wouter";

type Stats = {
  users: number;
  verifications: number;
  tradegov_entries: number;
  compliance_rulesets: number;
  decision_briefs: number;
  audit_events: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/admin/api/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setStats(data);
        else setError("Failed to load stats.");
      })
      .catch(() => setError("Failed to connect."))
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        { label: "Users", value: stats.users, href: "/admin/users", color: "stat-blue" },
        { label: "Decision Briefs", value: stats.decision_briefs, href: "#", color: "stat-teal" },
        { label: "Intelligence Entries", value: stats.tradegov_entries, href: "/admin/intelligence", color: "stat-purple" },
        { label: "Compliance Rulesets", value: stats.compliance_rulesets, href: "/admin/compliance", color: "stat-amber" },
        { label: "Verifications", value: stats.verifications, href: "/admin/verifications", color: "stat-green" },
        { label: "Audit Events", value: stats.audit_events, href: "#", color: "stat-gray" },
      ]
    : [];

  return (
    <>
      <SEO title="Admin Overview - Meru Express" description="Admin dashboard overview." canonical="/admin" />
      <div className="admin-page-header">
        <div>
          <h1>Admin Overview</h1>
          <p className="admin-page-subtitle">System-wide metrics and quick navigation.</p>
        </div>
      </div>

      {loading && <div className="admin-loading" data-testid="admin-loading">Loading stats...</div>}
      {error && <div className="admin-error" data-testid="admin-error">{error}</div>}

      {stats && (
        <div className="admin-stats-grid" data-testid="stats-grid">
          {cards.map((c) => (
            <Link key={c.label} href={c.href}>
              <div className={`admin-stat-card ${c.color}`} data-testid={`stat-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <div className="admin-stat-value">{c.value}</div>
                <div className="admin-stat-label">{c.label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="admin-quick-links" data-testid="quick-links">
        <h2>Quick Actions</h2>
        <div className="admin-quick-grid">
          <Link href="/admin/users"><span className="admin-quick-item" data-testid="quick-link-users">Manage Users</span></Link>
          <Link href="/admin/intelligence"><span className="admin-quick-item" data-testid="quick-link-intelligence">Trade Intelligence</span></Link>
          <Link href="/admin/compliance"><span className="admin-quick-item" data-testid="quick-link-compliance">Compliance Rulesets</span></Link>
          <Link href="/admin/verifications"><span className="admin-quick-item" data-testid="quick-link-verifications">Verification Records</span></Link>
          <Link href="/admin/system"><span className="admin-quick-item" data-testid="quick-link-system">System Health</span></Link>
        </div>
      </div>
    </>
  );
}
