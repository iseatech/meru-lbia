import { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import SEO from "../components/SEO";

const ROLES = ["Owner", "Admin", "Analyst", "Support", "Developer", "Viewer"] as const;
type Role = typeof ROLES[number];

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "Active" | "Disabled";
  lastActive: string;
};

const INITIAL_TEAM: TeamMember[] = [
  { id: "1", name: "Sarah Chen", email: "sarah.chen@meruexpress.com", role: "Owner", status: "Active", lastActive: "2026-02-12" },
  { id: "2", name: "Marcus Rivera", email: "marcus.r@meruexpress.com", role: "Admin", status: "Active", lastActive: "2026-02-11" },
  { id: "3", name: "Aisha Patel", email: "aisha.p@meruexpress.com", role: "Analyst", status: "Active", lastActive: "2026-02-10" },
  { id: "4", name: "James Okafor", email: "james.o@meruexpress.com", role: "Developer", status: "Active", lastActive: "2026-02-09" },
  { id: "5", name: "Elena Volkov", email: "elena.v@meruexpress.com", role: "Support", status: "Disabled", lastActive: "2026-01-28" },
  { id: "6", name: "David Kim", email: "david.k@meruexpress.com", role: "Viewer", status: "Active", lastActive: "2026-02-08" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminTeam() {
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "Viewer" as Role });
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "Viewer" as Role });

  function toggleStatus(id: string) {
    setTeam((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: m.status === "Active" ? "Disabled" : "Active" } : m
      )
    );
  }

  function openEdit(member: TeamMember) {
    setEditMember(member);
    setEditForm({ name: member.name, email: member.email, role: member.role });
  }

  function saveEdit() {
    if (!editMember) return;
    setTeam((prev) =>
      prev.map((m) =>
        m.id === editMember.id ? { ...m, name: editForm.name, email: editForm.email, role: editForm.role } : m
      )
    );
    setEditMember(null);
  }

  function submitInvite() {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role,
      status: "Active",
      lastActive: new Date().toISOString().split("T")[0],
    };
    setTeam((prev) => [...prev, newMember]);
    setInviteForm({ name: "", email: "", role: "Viewer" });
    setInviteOpen(false);
  }

  return (
    <AdminLayout>
      <SEO title="Team Management - Admin - Meru Express" description="Manage your Meru Express team members." canonical="/admin/team" />
      <div className="admin-page-header">
        <div>
          <h1>Team</h1>
          <p className="admin-page-subtitle">Manage team members and access.</p>
        </div>
        <button className="btn-primary" onClick={() => setInviteOpen(true)} data-testid="button-invite-member">Invite Member</button>
      </div>

      <div className="admin-table-wrap" data-testid="team-table">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id} data-testid={`row-member-${m.id}`}>
                <td className="admin-td-name" data-testid={`text-member-name-${m.id}`}>{m.name}</td>
                <td className="admin-td-email" data-testid={`text-member-email-${m.id}`}>{m.email}</td>
                <td><span className={`admin-role-badge role-${m.role.toLowerCase()}`} data-testid={`badge-role-${m.id}`}>{m.role}</span></td>
                <td><span className={`admin-status-badge status-${m.status.toLowerCase()}`} data-testid={`badge-status-${m.id}`}>{m.status}</span></td>
                <td className="admin-td-date" data-testid={`text-last-active-${m.id}`}>{formatDate(m.lastActive)}</td>
                <td className="admin-td-actions">
                  <button className="btn-sm-ghost" onClick={() => openEdit(m)} data-testid={`button-edit-${m.id}`}>Edit</button>
                  <button className={`btn-sm-ghost ${m.status === "Active" ? "btn-warn" : "btn-ok"}`} onClick={() => toggleStatus(m.id)} data-testid={`button-toggle-${m.id}`}>
                    {m.status === "Active" ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <div className="admin-modal-overlay" onClick={() => setInviteOpen(false)} data-testid="modal-invite">
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Invite Team Member</h2>
              <button className="admin-modal-close" onClick={() => setInviteOpen(false)} data-testid="button-close-invite">&times;</button>
            </div>
            <div className="admin-modal-body">
              <label className="admin-modal-field">
                Name
                <input type="text" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Full name" data-testid="input-invite-name" />
              </label>
              <label className="admin-modal-field">
                Email
                <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="email@example.com" data-testid="input-invite-email" />
              </label>
              <label className="admin-modal-field">
                Role
                <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as Role })} data-testid="select-invite-role">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="btn-outline" onClick={() => setInviteOpen(false)} data-testid="button-cancel-invite">Cancel</button>
              <button className="btn-primary" onClick={submitInvite} disabled={!inviteForm.name.trim() || !inviteForm.email.trim()} data-testid="button-submit-invite">Send Invite</button>
            </div>
          </div>
        </div>
      )}

      {editMember && (
        <div className="admin-modal-overlay" onClick={() => setEditMember(null)} data-testid="modal-edit">
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Edit Member</h2>
              <button className="admin-modal-close" onClick={() => setEditMember(null)} data-testid="button-close-edit">&times;</button>
            </div>
            <div className="admin-modal-body">
              <label className="admin-modal-field">
                Name
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="input-edit-name" />
              </label>
              <label className="admin-modal-field">
                Email
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} data-testid="input-edit-email" />
              </label>
              <label className="admin-modal-field">
                Role
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })} data-testid="select-edit-role">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="btn-outline" onClick={() => setEditMember(null)} data-testid="button-cancel-edit">Cancel</button>
              <button className="btn-primary" onClick={saveEdit} disabled={!editForm.name.trim() || !editForm.email.trim()} data-testid="button-save-edit">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
