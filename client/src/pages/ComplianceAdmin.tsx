import { useState, useEffect, useCallback } from "react";
import SEO from "../components/SEO";

type Ruleset = {
  id: string;
  name: string;
  version: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string | null;
};

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ComplianceAdmin() {
  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", version: "1.0", description: "" });
  const [saving, setSaving] = useState(false);

  const fetchRulesets = useCallback(() => {
    setLoading(true);
    fetch("/admin/api/compliance/rulesets?limit=100", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setRulesets(data.items);
          setTotal(data.total);
        } else {
          setError(data.message || "Failed to load rulesets.");
        }
      })
      .catch(() => setError("Failed to connect."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchRulesets(); }, [fetchRulesets]);

  function createRuleset() {
    if (!form.name.trim()) return;
    setSaving(true);
    fetch("/admin/api/compliance/rulesets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: form.name, version: form.version, description: form.description }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setForm({ name: "", version: "1.0", description: "" });
          setCreateOpen(false);
          fetchRulesets();
        } else {
          setError(data.message || "Failed to create.");
        }
      })
      .catch(() => setError("Failed to connect."))
      .finally(() => setSaving(false));
  }

  function deactivate(id: string) {
    fetch(`/admin/api/compliance/rulesets/${id}/deactivate`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setRulesets((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: false } : r)));
        }
      })
      .catch(() => {});
  }

  return (
    <>
      <SEO title="Compliance - Admin - Meru Express" description="Manage compliance rulesets." canonical="/admin/compliance" />
      <div className="admin-page-header">
        <div>
          <h1>Compliance Rulesets</h1>
          <p className="admin-page-subtitle">{total} ruleset{total !== 1 ? "s" : ""}.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)} data-testid="button-create-ruleset">Create Ruleset</button>
      </div>

      {error && <div className="admin-error" data-testid="admin-error">{error}</div>}

      <div className="admin-table-wrap" data-testid="compliance-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th>Description</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
            ) : rulesets.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>No rulesets yet.</td></tr>
            ) : (
              rulesets.map((r) => (
                <tr key={r.id} data-testid={`row-ruleset-${r.id}`}>
                  <td className="admin-td-name" data-testid={`text-ruleset-name-${r.id}`}>{r.name}</td>
                  <td>{r.version || "-"}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                    {r.description || "-"}
                  </td>
                  <td>
                    <span className={`admin-status-badge ${r.is_active ? "status-active" : "status-disabled"}`} data-testid={`badge-ruleset-status-${r.id}`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="admin-td-date">{formatDate(r.created_at)}</td>
                  <td className="admin-td-actions">
                    {r.is_active && (
                      <button className="btn-sm-ghost btn-warn" onClick={() => deactivate(r.id)} data-testid={`button-deactivate-ruleset-${r.id}`}>
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

      {createOpen && (
        <div className="admin-modal-overlay" onClick={() => setCreateOpen(false)} data-testid="modal-create-ruleset">
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Create Ruleset</h2>
              <button className="admin-modal-close" onClick={() => setCreateOpen(false)} data-testid="button-close-create-ruleset">&times;</button>
            </div>
            <div className="admin-modal-body">
              <label className="admin-modal-field">
                Name
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ruleset name" data-testid="input-ruleset-name" />
              </label>
              <label className="admin-modal-field">
                Version
                <input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="1.0" data-testid="input-ruleset-version" />
              </label>
              <label className="admin-modal-field">
                Description
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" data-testid="input-ruleset-description" />
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="btn-outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create-ruleset">Cancel</button>
              <button className="btn-primary" onClick={createRuleset} disabled={saving || !form.name.trim()} data-testid="button-submit-create-ruleset">
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
