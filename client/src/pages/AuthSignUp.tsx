import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";

function validatePassword(pw: string) {
  return {
    minLength: pw.length >= 8,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasNumberOrSpecial: /[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw),
  };
}

export default function AuthSignUp() {
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const rules = useMemo(() => validatePassword(password), [password]);
  const allRulesPass = rules.minLength && rules.hasUpper && rules.hasLower && rules.hasNumberOrSpecial;
  const passwordsMatch = password === confirm;
  const canSubmit = fullName.trim() && email.trim() && allRulesPass && passwordsMatch && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    if (!canSubmit) return;
    setSubmitting(true);
    setServerError("");

    try {
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.message || "Registration failed.");
        setSubmitting(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setServerError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="auth-subtitle">Get started with Meru Express</p>

        <a href="/api/login" className="btn-google" data-testid="button-google-signup">
          <svg viewBox="0 0 24 24" width="18" height="18" className="google-icon">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        <div className="auth-divider" data-testid="text-divider">
          <span>or sign up with email</span>
        </div>

        {serverError && <p className="auth-error" data-testid="text-server-error">{serverError}</p>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label>
            Full Name
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jane Doe"
              required
              data-testid="input-signup-name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              data-testid="input-signup-email"
            />
          </label>
          <label>
            Password
            <div className="input-password-wrap">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="Create a password"
                required
                data-testid="input-signup-password"
              />
              <button type="button" className="eye-toggle" onClick={() => setShowPw(!showPw)} data-testid="button-toggle-password" aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </label>
          {touched.password && password.length > 0 && (
            <ul className="pw-rules" data-testid="list-password-rules">
              <li className={rules.minLength ? "pass" : "fail"}>At least 8 characters</li>
              <li className={rules.hasUpper ? "pass" : "fail"}>1 uppercase letter</li>
              <li className={rules.hasLower ? "pass" : "fail"}>1 lowercase letter</li>
              <li className={rules.hasNumberOrSpecial ? "pass" : "fail"}>1 number or special character</li>
            </ul>
          )}
          <label>
            Confirm Password
            <div className="input-password-wrap">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                placeholder="Confirm your password"
                required
                data-testid="input-signup-confirm"
              />
              <button type="button" className="eye-toggle" onClick={() => setShowConfirm(!showConfirm)} data-testid="button-toggle-confirm" aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}>
                {showConfirm ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </label>
          {touched.confirm && confirm.length > 0 && !passwordsMatch && (
            <p className="field-error" data-testid="text-confirm-error">Passwords do not match.</p>
          )}
          <button type="submit" className="btn-primary" disabled={!canSubmit} data-testid="button-signup">
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        <div className="auth-links">
          <span>
            Already have an account? <Link href="/auth/login">Log in</Link>
          </span>
        </div>
        <p className="auth-trust">Decision intelligence, not legal advice.</p>
      </div>
    </div>
  );
}
