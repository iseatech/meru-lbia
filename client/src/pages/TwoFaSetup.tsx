import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";

export default function TwoFaSetup() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [step, setStep] = useState<"init" | "scan" | "confirm">("init");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/2fa/setup", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Setup failed");
        setLoading(false);
        return;
      }
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setRecoveryCodes(data.recoveryCodes);
      setStep("scan");
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError("Enter a 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/2fa/confirm-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
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
        <h1>Set Up Two-Factor Authentication</h1>
        <p className="auth-subtitle">
          Admin accounts require 2FA via Google Authenticator (or any TOTP app).
        </p>

        {error && <p className="auth-error" data-testid="text-2fa-error">{error}</p>}

        {step === "init" && (
          <div className="twofa-init">
            <p>To access the admin dashboard, you need to enable two-factor authentication.</p>
            <button
              className="btn-primary"
              onClick={handleSetup}
              disabled={loading}
              data-testid="button-2fa-begin"
            >
              {loading ? "Setting up..." : "Begin 2FA Setup"}
            </button>
          </div>
        )}

        {step === "scan" && (
          <div className="twofa-scan">
            <p>Scan this QR code with Google Authenticator or any TOTP app:</p>
            <div className="twofa-qr-wrap">
              <img src={qrDataUrl} alt="2FA QR Code" className="twofa-qr" data-testid="img-2fa-qr" />
            </div>
            <p className="twofa-manual-label">Or enter this code manually:</p>
            <code className="twofa-secret" data-testid="text-2fa-secret">{secret}</code>

            <div className="twofa-recovery">
              <h3>Recovery Codes</h3>
              <p className="twofa-recovery-warn">
                Save these codes in a safe place. Each can only be used once.
              </p>
              <div className="twofa-codes-grid" data-testid="list-recovery-codes">
                {recoveryCodes.map((c, i) => (
                  <span key={i} className="twofa-code">{c}</span>
                ))}
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => setStep("confirm")}
              data-testid="button-2fa-next"
            >
              I've saved my codes. Next
            </button>
          </div>
        )}

        {step === "confirm" && (
          <form onSubmit={handleConfirm} className="twofa-confirm">
            <p>Enter the 6-digit code from your authenticator app to confirm setup:</p>
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
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || code.length !== 6}
              data-testid="button-2fa-confirm"
            >
              {loading ? "Verifying..." : "Verify & Enable 2FA"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
