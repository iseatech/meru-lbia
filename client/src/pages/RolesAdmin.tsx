import { useState, useEffect } from "react";
import SEO from "../components/SEO";

type RoleEntry = { role: string; count: number };

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full system access. Can manage users, roles, intelligence, compliance, and system settings.",
  user: "Standard user. Can access public features and personal dashboard.",
  analyst: "Can view intelligence data, decision briefs, and compliance reports. Read-only admin sections.",
  support: "Can view user records and verification status. Limited write access.",
};

export default function RolesAdmin() {
  const [roles, setRoles] = useState<RoleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/admin/api/users?limit=200", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          const counts: Record<string, number> = {};
          for (const u of data.items) {
            counts[u.role] = (counts[u.role] || 0) + 1;
          }
          setRoles(Object.entries(counts).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <SEO title="Roles - Admin - Meru Express" description="Manage roles and permissions." canonical="/admin/roles" />
      <div className="admin-page-header">
        <div>
          <h1>Roles</h1>
          <p className="admin-page-subtitle">Role definitions and current distribution.</p>
        </div>
      </div>

      <div className="admin-table-wrap" data-testid="roles-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Users</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
            ) : (
              Object.keys(ROLE_DESCRIPTIONS).map((role) => {
                const entry = roles.find((r) => r.role === role);
                return (
                  <tr key={role} data-testid={`row-role-${role}`}>
                    <td><span className={`admin-role-badge role-${role}`} data-testid={`badge-role-def-${role}`}>{role}</span></td>
                    <td data-testid={`text-role-count-${role}`}>{entry?.count ?? 0}</td>
                    <td style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{ROLE_DESCRIPTIONS[role]}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-info-note" data-testid="text-roles-note">
        <p>To assign or change a user's role, go to the Users page and use the "Set Role" action.</p>
        <a href="/admin/users" className="btn-primary" style={{ display: "inline-block", marginTop: "0.75rem" }} data-testid="link-assign-roles">
          Assign roles in Users
        </a>
      </div>
    </>
  );
}
