import { useState, useEffect, useCallback } from "react";
import SEO from "../components/SEO";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string | null;
  last_sign_in: string | null;
};

const VALID_ROLES = ["user", "admin", "analyst", "support"];

function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleModal, setRoleModal] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    fetch("/admin/api/users?limit=100", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setUsers(data.items);
          setTotal(data.total);
        } else {
          setError(data.message || "Failed to load users.");
        }
      })
      .catch(() => setError("Failed to connect."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openRoleModal(user: AdminUser) {
    setRoleModal(user);
    setNewRole(user.role);
  }

  function saveRole() {
    if (!roleModal) return;
    setSaving(true);
    fetch(`/admin/api/users/${roleModal.id}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role: newRole }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setUsers((prev) => prev.map((u) => (u.id === roleModal.id ? { ...u, role: newRole } : u)));
          setRoleModal(null);
        } else {
          setError(data.message || "Failed to update role.");
        }
      })
      .catch(() => setError("Failed to connect."))
      .finally(() => setSaving(false));
  }

  return (
    <>
      <SEO title="Users - Admin - Meru Express" description="Manage users." canonical="/admin/users" />
      <div className="admin-page-header">
        <div>
          <h1>Users</h1>
          <p className="admin-page-subtitle">{total} registered user{total !== 1 ? "s" : ""}.</p>
        </div>
      </div>

      {error && <div className="admin-error" data-testid="admin-error">{error}</div>}

      <div className="admin-table-wrap" data-testid="users-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} data-testid={`row-user-${u.id}`}>
                  <td className="admin-td-name" data-testid={`text-user-name-${u.id}`}>{u.full_name || "-"}</td>
                  <td className="admin-td-email" data-testid={`text-user-email-${u.id}`}>{u.email || "-"}</td>
                  <td>
                    <span className={`admin-role-badge role-${u.role}`} data-testid={`badge-role-${u.id}`}>{u.role}</span>
                  </td>
                  <td className="admin-td-date">{formatDate(u.created_at)}</td>
                  <td className="admin-td-date">{formatDate(u.last_sign_in)}</td>
                  <td className="admin-td-actions">
                    <button className="btn-sm-ghost" onClick={() => openRoleModal(u)} data-testid={`button-set-role-${u.id}`}>Set Role</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {roleModal && (
        <div className="admin-modal-overlay" onClick={() => setRoleModal(null)} data-testid="modal-set-role">
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Set Role</h2>
              <button className="admin-modal-close" onClick={() => setRoleModal(null)} data-testid="button-close-role-modal">&times;</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", margin: 0 }}>
                User: <strong>{roleModal.full_name || roleModal.email || roleModal.id}</strong>
              </p>
              <label className="admin-modal-field">
                Role
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} data-testid="select-new-role">
                  {VALID_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="btn-outline" onClick={() => setRoleModal(null)} data-testid="button-cancel-role">Cancel</button>
              <button className="btn-primary" onClick={saveRole} disabled={saving || newRole === roleModal.role} data-testid="button-save-role">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
