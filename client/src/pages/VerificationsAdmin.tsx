import { useState, useEffect, useCallback } from "react";
import SEO from "../components/SEO";

type Verification = {
  id: string;
  verification_code: string;
  service_type: string;
  status: string | null;
  issued_at: string | null;
};

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function VerificationsAdmin() {
  const [records, setRecords] = useState<Verification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRecords = useCallback(() => {
    setLoading(true);
    fetch("/admin/api/verifications?limit=100", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setRecords(data.items);
          setTotal(data.total);
        } else {
          setError(data.message || "Failed to load records.");
        }
      })
      .catch(() => setError("Failed to connect."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function revoke(code: string) {
    fetch(`/admin/api/verifications/${encodeURIComponent(code)}/revoke`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setRecords((prev) => prev.map((v) => (v.verification_code === code ? { ...v, status: "revoked" } : v)));
        }
      })
      .catch(() => {});
  }

  return (
    <>
      <SEO title="Verifications - Admin - Meru Express" description="Manage document verification records." canonical="/admin/verifications" />
      <div className="admin-page-header">
        <div>
          <h1>Verification Records</h1>
          <p className="admin-page-subtitle">{total} verification{total !== 1 ? "s" : ""} issued.</p>
        </div>
      </div>

      {error && <div className="admin-error" data-testid="admin-error">{error}</div>}

      <div className="admin-table-wrap" data-testid="verifications-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Service</th>
              <th>Status</th>
              <th>Issued</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>No verification records.</td></tr>
            ) : (
              records.map((v) => (
                <tr key={v.id} data-testid={`row-verification-${v.id}`}>
                  <td style={{ fontFamily: "monospace", fontSize: "var(--text-xs)" }} data-testid={`text-verification-code-${v.id}`}>
                    {v.verification_code}
                  </td>
                  <td>{v.service_type}</td>
                  <td>
                    <span className={`admin-status-badge ${v.status === "valid" ? "status-active" : "status-disabled"}`} data-testid={`badge-verification-status-${v.id}`}>
                      {v.status || "unknown"}
                    </span>
                  </td>
                  <td className="admin-td-date">{formatDate(v.issued_at)}</td>
                  <td className="admin-td-actions">
                    {v.status === "valid" && (
                      <button className="btn-sm-ghost btn-warn" onClick={() => revoke(v.verification_code)} data-testid={`button-revoke-${v.id}`}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
