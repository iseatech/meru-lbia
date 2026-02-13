import { useState, useEffect, useCallback } from "react";
import SEO from "../components/SEO";

type IntelEntry = {
  id: string;
  country_code: string | null;
  country_name: string | null;
  title: string | null;
  risk_level: string | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: string | null;
};

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TradeGovAdmin() {
  const [entries, setEntries] = useState<IntelEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const fetchEntries = useCallback(() => {
    setLoading(true);
    const qs = filter ? `?country=${encodeURIComponent(filter)}&limit=100` : "?limit=100";
    fetch(`/admin/intelligence/tradegov/list${qs}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setEntries(data.items);
          setTotal(data.total);
        } else {
          setError(data.message || "Failed to load entries.");
        }
      })
      .catch(() => setError("Failed to connect."))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  function deactivate(id: string) {
    fetch(`/admin/intelligence/tradegov/deactivate/${id}`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, is_active: false } : e)));
        }
      })
      .catch(() => {});
  }

  return (
    <>
      <SEO title="Trade Intelligence - Admin - Meru Express" description="Manage trade.gov intelligence entries." canonical="/admin/intelligence" />
      <div className="admin-page-header">
        <div>
          <h1>Trade Intelligence</h1>
          <p className="admin-page-subtitle">{total} entries from trade.gov curated data.</p>
        </div>
      </div>

      <div className="admin-filter-row" data-testid="intelligence-filter">
        <input
          type="text"
          placeholder="Filter by country..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="admin-filter-input"
          data-testid="input-filter-country"
        />
        <button className="btn-outline" onClick={fetchEntries} data-testid="button-filter-apply">Apply</button>
      </div>

      {error && <div className="admin-error" data-testid="admin-error">{error}</div>}

      <div className="admin-table-wrap" data-testid="intelligence-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>Title</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>No entries found.</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} data-testid={`row-intel-${e.id}`}>
                  <td className="admin-td-name" data-testid={`text-intel-country-${e.id}`}>
                    {e.country_name || e.country_code || "-"}
                  </td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.title || "-"}
                  </td>
                  <td>
                    {e.risk_level ? (
                      <span className={`admin-role-badge risk-${(e.risk_level || "").toLowerCase()}`} data-testid={`badge-risk-${e.id}`}>
                        {e.risk_level}
                      </span>
                    ) : "-"}
                  </td>
                  <td>
                    <span className={`admin-status-badge ${e.is_active ? "status-active" : "status-disabled"}`} data-testid={`badge-active-${e.id}`}>
                      {e.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="admin-td-date">{formatDate(e.created_at)}</td>
                  <td className="admin-td-actions">
                    {e.is_active && (
                      <button className="btn-sm-ghost btn-warn" onClick={() => deactivate(e.id)} data-testid={`button-deactivate-${e.id}`}>
                        Deactivate
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
