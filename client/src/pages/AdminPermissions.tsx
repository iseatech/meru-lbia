import { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import SEO from "../components/SEO";

const ROLES = ["Owner", "Admin", "Analyst", "Support", "Developer", "Viewer"] as const;
type Role = typeof ROLES[number];

const PERMISSIONS = [
  "View Users",
  "Manage Users",
  "View Briefs",
  "Manage Briefs",
  "View Intelligence",
  "Manage Intelligence",
  "View System",
  "Manage Billing",
  "Manage Team",
  "Manage Prompts",
] as const;
type Permission = typeof PERMISSIONS[number];

const DEFAULT_MATRIX: Record<Permission, Record<Role, boolean>> = {
  "View Users":          { Owner: true,  Admin: true,  Analyst: false, Support: true,  Developer: false, Viewer: false },
  "Manage Users":        { Owner: true,  Admin: true,  Analyst: false, Support: false, Developer: false, Viewer: false },
  "View Briefs":         { Owner: true,  Admin: true,  Analyst: true,  Support: true,  Developer: false, Viewer: true  },
  "Manage Briefs":       { Owner: true,  Admin: true,  Analyst: true,  Support: false, Developer: false, Viewer: false },
  "View Intelligence":   { Owner: true,  Admin: true,  Analyst: true,  Support: false, Developer: true,  Viewer: true  },
  "Manage Intelligence": { Owner: true,  Admin: true,  Analyst: false, Support: false, Developer: true,  Viewer: false },
  "View System":         { Owner: true,  Admin: true,  Analyst: false, Support: false, Developer: true,  Viewer: false },
  "Manage Billing":      { Owner: true,  Admin: false, Analyst: false, Support: false, Developer: false, Viewer: false },
  "Manage Team":         { Owner: true,  Admin: true,  Analyst: false, Support: false, Developer: false, Viewer: false },
  "Manage Prompts":      { Owner: true,  Admin: true,  Analyst: false, Support: false, Developer: true,  Viewer: false },
};

export default function AdminPermissions() {
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX);

  function toggle(perm: Permission, role: Role) {
    if (role === "Owner") return;
    setMatrix((prev) => ({
      ...prev,
      [perm]: {
        ...prev[perm],
        [role]: !prev[perm][role],
      },
    }));
  }

  return (
    <AdminLayout>
      <SEO title="Permissions (RBAC) - Admin - Meru Express" description="Configure role-based access control for Meru Express." canonical="/admin/permissions" />
      <div className="admin-page-header">
        <div>
          <h1>Permissions</h1>
          <p className="admin-page-subtitle">Role-based access control matrix. Toggle permissions per role.</p>
        </div>
      </div>

      <div className="admin-table-wrap" data-testid="permissions-matrix">
        <table className="admin-table rbac-table">
          <thead>
            <tr>
              <th className="rbac-perm-col">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className="rbac-role-col" data-testid={`col-role-${r.toLowerCase()}`}>{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm) => (
              <tr key={perm} data-testid={`row-perm-${perm.toLowerCase().replace(/\s+/g, "-")}`}>
                <td className="rbac-perm-label">{perm}</td>
                {ROLES.map((role) => (
                  <td key={role} className="rbac-toggle-cell">
                    <button
                      type="button"
                      className={`rbac-toggle ${matrix[perm][role] ? "rbac-on" : "rbac-off"} ${role === "Owner" ? "rbac-locked" : ""}`}
                      onClick={() => toggle(perm, role)}
                      disabled={role === "Owner"}
                      aria-label={`${perm} for ${role}: ${matrix[perm][role] ? "enabled" : "disabled"}`}
                      data-testid={`toggle-${perm.toLowerCase().replace(/\s+/g, "-")}-${role.toLowerCase()}`}
                    >
                      {matrix[perm][role] ? (
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      ) : (
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="admin-info-note" data-testid="text-rbac-note">Changes are UI-only and will not persist. Backend RBAC enforcement will be implemented in Phase 2.</p>
    </AdminLayout>
  );
}
