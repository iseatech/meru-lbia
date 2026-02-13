import { useState, useEffect } from "react";
import { Link } from "wouter";
import AccountLayout from "../components/AccountLayout";
import { getServiceLabel } from "../components/ServiceIntakeForm";

type Brief = {
  id: string;
  serviceType: string | null;
  status: string | null;
  countryOfOrigin: string | null;
  createdAt: string | null;
};

export default function AccountReports() {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/my-briefs", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => {
        setBriefs(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load your reports.");
        setLoading(false);
      });
  }, []);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <AccountLayout>
      <h1>Reports</h1>

      {loading && <p style={{ color: "var(--text-secondary)", padding: "24px 0" }}>Loading reports...</p>}

      {error && <p className="intake-error">{error}</p>}

      {!loading && !error && briefs.length === 0 && (
        <div className="reports-empty">
          <p>You haven't submitted any service requests yet.</p>
          <Link href="/services">
            <span className="btn-primary" data-testid="link-start-first-request">Browse Services</span>
          </Link>
        </div>
      )}

      {!loading && briefs.length > 0 && (
        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Service</th>
                <th>Country</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((b) => (
                <tr key={b.id} data-testid={`row-report-${b.id}`}>
                  <td>{formatDate(b.createdAt)}</td>
                  <td>{getServiceLabel(b.serviceType || "")}</td>
                  <td>{b.countryOfOrigin || "\u2014"}</td>
                  <td>
                    <span
                      className={
                        "status-badge " +
                        (b.status === "completed" ? "status-done" : "status-pending")
                      }
                    >
                      {b.status === "completed" ? "Completed" : b.status || "Pending"}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <a
                      href={`/meru/decision-briefs/${b.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="btn-sm" data-testid={`button-download-${b.id}`}>
                        Download PDF
                      </span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AccountLayout>
  );
}
