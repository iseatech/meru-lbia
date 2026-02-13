import { useState } from "react";
import AccountLayout from "../components/AccountLayout";

export default function AccountSecurity() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [toast, setToast] = useState("");

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setToast("Saved (demo)");
    setCurrent("");
    setNewPw("");
    setConfirm("");
    setTimeout(() => setToast(""), 3000);
  }

  function handleResetEmail() {
    setToast("Reset flow enabled at launch");
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <AccountLayout>
      <h1>Security</h1>

      {toast && <div className="toast" data-testid="text-toast">{toast}</div>}

      <section className="security-section">
        <h2>Change Password</h2>
        <form onSubmit={handleChangePassword} className="account-form">
          <label>
            Current Password
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required data-testid="input-current-password" />
          </label>
          <label>
            New Password
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required data-testid="input-new-password" />
          </label>
          <label>
            Confirm New Password
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required data-testid="input-confirm-password" />
          </label>
          <button type="submit" className="btn-primary" data-testid="button-change-password">Update Password</button>
        </form>
      </section>

      <section className="security-section">
        <h2>Forgot Password</h2>
        <p>Receive a password reset link by email.</p>
        <button type="button" className="btn-outline" onClick={handleResetEmail} data-testid="button-reset-email">
          Send password reset email
        </button>
      </section>

      <section className="security-section">
        <h2>Sessions</h2>
        <table className="status-table">
          <tbody>
            <tr>
              <td className="status-label">Current device</td>
              <td>Active now</td>
            </tr>
          </tbody>
        </table>
      </section>
    </AccountLayout>
  );
}
