import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import SEO from "../components/SEO";

type HealthData = {
  ok: boolean;
  status: string;
  uptime_seconds: number;
  db: { connected: boolean; latency_ms: number };
  counts: { users: number; verifications: number; tradegov_entries: number; compliance_rulesets: number };
  memory: { rss_mb: number; heap_used_mb: number };
  node_version: string;
  timestamp: string;
};

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function TwoFaSection() {
  const { twoFaEnabled, twoFaVerified, refetch } = useAuth();
  const [step, setStep] = useState<"idle" | "scan" | "confirm">("idle");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
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

  async function handleConfirmSetup(e: React.FormEvent) {
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
      setStep("idle");
      setCode("");
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

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
      setCode("");
      setRecoveryCode("");
    } catch {
      setError("Something went wrong.");
    }
    setLoading(false);
  }

  if (twoFaEnabled && twoFaVerified) {
    return (
      <div className="admin-2fa-section" data-testid="section-2fa">
        <div className="admin-2fa-header">
          <h2>Admin Security (2FA)</h2>
          <span className="admin-status-badge status-active" data-testid="badge-2fa-active">Active</span>
        </div>
        <p className="admin-2fa-desc">Two-factor authentication is enabled and verified for this session.</p>
      </div>
    );
  }

  if (twoFaEnabled && !twoFaVerified) {
    return (
      <div className="admin-2fa-section admin-2fa-pending" data-testid="section-2fa">
        <div className="admin-2fa-header">
          <h2>Admin Security (2FA)</h2>
          <span className="admin-status-badge status-pending" data-testid="badge-2fa-pending">Verification Required</span>
        </div>
        <p className="admin-2fa-desc">Enter your authenticator code to unlock full admin access for this session.</p>
        {error && <p className="admin-2fa-error" data-testid="text-2fa-error">{error}</p>}
        <form onSubmit={handleVerify} className="admin-2fa-form">
          {!useRecovery ? (
            <label className="admin-2fa-label">
              Authenticator Code
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="admin-2fa-input"
                autoFocus
                data-testid="input-2fa-code"
              />
            </label>
          ) : (
            <label className="admin-2fa-label">
              Recovery Code
              <input
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="Enter recovery code"
                className="admin-2fa-input"
                autoFocus
                data-testid="input-recovery-code"
              />
            </label>
          )}
          <div className="admin-2fa-actions">
            <button type="submit" className="btn-primary" disabled={loading} data-testid="button-2fa-verify">
              {loading ? "Verifying..." : "Verify"}
            </button>
            <button
              type="button"
              className="btn-link"
              onClick={() => { setUseRecovery(!useRecovery); setError(""); }}
              data-testid="button-toggle-recovery"
            >
              {useRecovery ? "Use authenticator code" : "Use a recovery code"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-2fa-section admin-2fa-setup" data-testid="section-2fa">
      <div className="admin-2fa-header">
        <h2>Admin Security (2FA)</h2>
        <span className="admin-status-badge status-disabled" data-testid="badge-2fa-disabled">Not Enabled</span>
      </div>
      <p className="admin-2fa-desc">
        Two-factor authentication is required for full admin panel access. Set it up now using any TOTP authenticator app.
      </p>
      {error && <p className="admin-2fa-error" data-testid="text-2fa-error">{error}</p>}

      {step === "idle" && (
        <button className="btn-primary" onClick={handleSetup} disabled={loading} data-testid="button-2fa-begin">
          {loading ? "Setting up..." : "Begin 2FA Setup"}
        </button>
      )}

      {step === "scan" && (
        <div className="admin-2fa-scan">
          <p>Scan this QR code with your authenticator app:</p>
          <div className="admin-2fa-qr-wrap">
            <img src={qrDataUrl} alt="2FA QR Code" className="admin-2fa-qr" data-testid="img-2fa-qr" />
          </div>
          <p className="admin-2fa-manual-label">Or enter this code manually:</p>
          <code className="admin-2fa-secret" data-testid="text-2fa-secret">{secret}</code>

          <div className="admin-2fa-recovery">
            <h3>Recovery Codes</h3>
            <p className="admin-2fa-recovery-warn">
              Save these codes in a safe place. Each can only be used once.
            </p>
            <div className="admin-2fa-codes-grid" data-testid="list-recovery-codes">
              {recoveryCodes.map((c, i) => (
                <span key={i} className="admin-2fa-code">{c}</span>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={() => setStep("confirm")} data-testid="button-2fa-next">
            I've saved my codes. Next
          </button>
        </div>
      )}

      {step === "confirm" && (
        <form onSubmit={handleConfirmSetup} className="admin-2fa-form">
          <p>Enter the 6-digit code from your authenticator app to confirm setup:</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="admin-2fa-input"
            autoFocus
            data-testid="input-2fa-code"
          />
          <button type="submit" className="btn-primary" disabled={loading || code.length !== 6} data-testid="button-2fa-confirm">
            {loading ? "Verifying..." : "Verify & Enable 2FA"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function SystemAdmin() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function fetchHealth() {
    setLoading(true);
    setError("");
    fetch("/admin/api/system/health", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setHealth(data))
      .catch(() => setError("Failed to connect."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchHealth(); }, []);

  return (
    <>
      <SEO title="System Health - Admin - Meru Express" description="System health and diagnostics." canonical="/admin/system" />

      <TwoFaSection />

      <div className="admin-page-header">
        <div>
          <h1>System Health</h1>
          <p className="admin-page-subtitle">API and database diagnostics.</p>
        </div>
        <button className="btn-outline" onClick={fetchHealth} disabled={loading} data-testid="button-refresh-health">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="admin-error" data-testid="admin-error">{error}</div>}

      {health && (
        <div className="admin-health-grid" data-testid="health-grid">
          <div className="admin-health-card">
            <div className="admin-health-card-header">
              <span>API Status</span>
              <span className={`admin-status-badge ${health.ok ? "status-active" : "status-disabled"}`} data-testid="badge-api-status">
                {health.status}
              </span>
            </div>
            <div className="admin-health-card-body">
              <div className="admin-health-row">
                <span>Uptime</span>
                <span data-testid="text-uptime">{formatUptime(health.uptime_seconds)}</span>
              </div>
              <div className="admin-health-row">
                <span>Node.js</span>
                <span data-testid="text-node-version">{health.node_version}</span>
              </div>
              <div className="admin-health-row">
                <span>Timestamp</span>
                <span>{new Date(health.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="admin-health-card">
            <div className="admin-health-card-header">
              <span>Database</span>
              <span className={`admin-status-badge ${health.db.connected ? "status-active" : "status-disabled"}`} data-testid="badge-db-status">
                {health.db.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="admin-health-card-body">
              <div className="admin-health-row">
                <span>Latency</span>
                <span data-testid="text-db-latency">{health.db.latency_ms}ms</span>
              </div>
            </div>
          </div>

          <div className="admin-health-card">
            <div className="admin-health-card-header">
              <span>Memory</span>
            </div>
            <div className="admin-health-card-body">
              <div className="admin-health-row">
                <span>RSS</span>
                <span data-testid="text-memory-rss">{health.memory.rss_mb} MB</span>
              </div>
              <div className="admin-health-row">
                <span>Heap Used</span>
                <span data-testid="text-memory-heap">{health.memory.heap_used_mb} MB</span>
              </div>
            </div>
          </div>

          <div className="admin-health-card">
            <div className="admin-health-card-header">
              <span>Record Counts</span>
            </div>
            <div className="admin-health-card-body">
              <div className="admin-health-row">
                <span>Users</span>
                <span data-testid="text-count-users">{health.counts.users}</span>
              </div>
              <div className="admin-health-row">
                <span>Verifications</span>
                <span data-testid="text-count-verifications">{health.counts.verifications}</span>
              </div>
              <div className="admin-health-row">
                <span>Intelligence Entries</span>
                <span data-testid="text-count-entries">{health.counts.tradegov_entries}</span>
              </div>
              <div className="admin-health-row">
                <span>Compliance Rulesets</span>
                <span data-testid="text-count-rulesets">{health.counts.compliance_rulesets}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
