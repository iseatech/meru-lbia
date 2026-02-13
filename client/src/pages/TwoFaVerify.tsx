import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";

export default function TwoFaVerify() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body: Record<string, string> = {};
    if (useRecovery) {
      if (!recoveryCode.trim()) {
        setError("Enter a recovery code");
        setLoading(false);
        return;
      }
      body.recoveryCode = recoveryCode.trim();
    } else {
      if (!code || code.length !== 6) {
        setError("Enter a 6-digit code");
        setLoading(false);
        return;
      }
      body.code = code;
    }

    try {
      const res = await fetch("/api/admin/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Verification failed");
        setLoading(false);
        return;
      }
      await refetch();
      setLocation("/dashboard");
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card twofa-card">
        <h1>Two-Factor Verification</h1>
        <p className="auth-subtitle">
          Enter the code from your authenticator app to access the admin dashboard.
        </p>

        {error && <p className="auth-error" data-testid="text-2fa-error">{error}</p>}

        <form onSubmit={handleVerify} className="twofa-confirm">
          {!useRecovery ? (
            <>
              <label>
                Authenticator Code
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="twofa-input"
                  autoFocus
                  data-testid="input-2fa-code"
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Recovery Code
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="Enter recovery code"
                  className="twofa-input"
                  autoFocus
                  data-testid="input-recovery-code"
                />
              </label>
            </>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            data-testid="button-2fa-verify"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <button
          type="button"
          className="btn-link twofa-toggle"
          onClick={() => {
            setUseRecovery(!useRecovery);
            setError("");
          }}
          data-testid="button-toggle-recovery"
        >
          {useRecovery ? "Use authenticator code instead" : "Use a recovery code instead"}
        </button>
      </div>
    </div>
  );
}
