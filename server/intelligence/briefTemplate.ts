function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\'/g, "&#39;");
}

type AudienceType =
  | "3PL"
  | "Amazon Seller"
  | "Importer & Export"
  | "Supply Chain"
  | "Freight Forwarder / Customs Broker";

type ConfidenceLevel = "High" | "Medium" | "Low";

function normalizeAudienceType(raw: any): AudienceType {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return "Importer & Export";
  if (v.includes("3pl")) return "3PL";
  if (v.includes("amazon")) return "Amazon Seller";
  if (v.includes("supply")) return "Supply Chain";
  if (v.includes("freight") || v.includes("forward") || v.includes("broker") || v.includes("customs")) {
    return "Freight Forwarder / Customs Broker";
  }
  if (v.includes("import") || v.includes("export")) return "Importer & Export";
  return "Importer & Export";
}

function computeConfidence(payload: any, result: any): ConfidenceLevel {
  // Informativo (no legal). Heurística simple para Phase-1.
  const hasCore =
    !!payload?.shipment_mode ||
    !!payload?.mode ||
    !!payload?.origin ||
    !!payload?.destination ||
    !!payload?.destination_country ||
    !!payload?.hs_codes ||
    !!payload?.product_description;

  const hasQuant =
    !!payload?.weight_kg ||
    !!payload?.weight ||
    !!payload?.volume_cbm ||
    !!payload?.pieces ||
    (Array.isArray(payload?.packages) && payload.packages.length > 0);

  const hasOutcome =
    !!result?.primaryRecommendation ||
    !!result?.recommendation ||
    (Array.isArray(result?.recommendations) && result.recommendations.length > 0);

  if (hasCore && hasQuant && hasOutcome) return "High";
  if (hasCore && hasOutcome) return "Medium";
  return "Low";
}

function renderConfidenceBadge(level: ConfidenceLevel): string {
  const cls =
    level === "High" ? "pill pill-high" : level === "Medium" ? "pill pill-med" : "pill pill-low";
  return `<span class="${cls}">Confidence: ${escapeHtml(level)}</span>`;
}

function renderAudienceSummary(audience: AudienceType, payload: any, result: any): string {
  const common = [
    "Clear next-step recommendation (what to do first).",
    "Risks and constraints highlighted before money is spent.",
    "Practical checklist to execute with your team/partners.",
  ];

  const byAudience: Record<AudienceType, string[]> = {
    "3PL": [
      "How to position the shipment plan to win/retain accounts.",
      "Where margin is likely leaking (surcharges, accessorials, routing).",
      "What proof points to send the customer (ETA, milestones, exceptions).",
    ],
    "Amazon Seller": [
      "How to protect landed cost (duties, fees, delivery timing).",
      "What shipment mode best fits inventory velocity and cashflow.",
      "Where peak season/FC constraints can hit ETA and inbound planning.",
    ],
    "Importer & Export": [
      "What route + mode best matches cost vs speed vs reliability.",
      "Which documents and Incoterms reduce disputes and delays.",
      "Where compliance or country-origin risk can block entry.",
    ],
    "Supply Chain": [
      "How to standardize decisions (repeatable logic, not guessing).",
      "Where to reduce lead-time variability and stockout risk.",
      "Which levers improve OTIF and total landed cost.",
    ],
    "Freight Forwarder / Customs Broker": [
      "Decision narrative you can reuse with your client (why this path).",
      "Where to pre-empt holds (documents, data quality, screening).",
      "How to translate compliance signals into execution actions.",
    ],
  };

  const bullets = [...(byAudience[audience] || []), ...common].slice(0, 6);

  return `
    <section class="card">
      <h2>Intelligent Summary for ${escapeHtml(audience)}</h2>
      <ul class="bullets">
        ${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderDecisionRationale(
  audience: AudienceType,
  payload: any,
  result: any,
  confidence: ConfidenceLevel
): string {
  const rec =
    result?.primaryRecommendation?.title ||
    result?.primaryRecommendation?.name ||
    result?.recommendation?.title ||
    result?.recommendation ||
    (Array.isArray(result?.recommendations) && result.recommendations[0]?.title) ||
    "the recommended option";

  const contextBits: string[] = [];
  if (payload?.shipment_mode || payload?.mode) contextBits.push(`mode: ${payload.shipment_mode || payload.mode}`);
  if (payload?.origin) contextBits.push(`origin: ${payload.origin}`);
  if (payload?.destination) contextBits.push(`destination: ${payload.destination}`);
  if (payload?.destination_country) contextBits.push(`destination country: ${payload.destination_country}`);
  if (payload?.country_of_origin) contextBits.push(`country of origin: ${payload.country_of_origin}`);
  if (payload?.product_description) contextBits.push(`cargo: ${payload.product_description}`);

  const ctx = contextBits.length ? contextBits.join(" · ") : "";

  // ML hook placeholder (Phase-2 activation)
  const rationale =
    result?.recommendation_rationale?.summary ||
    result?.primaryRecommendation?.rationale ||
    result?.primaryRecommendation?.reason ||
    "";

  const base = rationale
    ? `Based on your inputs, ${escapeHtml(rec)} was selected because ${escapeHtml(String(rationale))}.`
    : `Based on your inputs, ${escapeHtml(rec)} was selected as the best balance of cost, speed, and execution risk for your case.`;

  const tail =
    confidence === "Low"
      ? " Some key inputs are missing, so treat this as a first-pass decision and refine with more details."
      : confidence === "Medium"
      ? " This is a strong starting point; refine with any missing operational details to lock in execution."
      : " The available inputs support a confident recommendation; execute with the checklist below.";

  return `
    <section class="card">
      <h2>Decision Rationale</h2>
      ${ctx ? `<div class="muted">${escapeHtml(ctx)}</div>` : ""}
      <p>${base}${tail}</p>
    </section>
  `;
}

function mlHooks(): { enabled: boolean; note: string } {
  // Phase-1: placeholder to keep a consistent contract across engines.
  // Phase-2+: wire to a real ML/LLM service and store learning artifacts.
  return { enabled: false, note: "ML hooks available (Phase-2 activation)" };
}

/**
 * Render the Decision Brief as a standalone HTML document.
 * This HTML is used for on-screen rendering and/or can be reused by the PDF generator.
 */
export function renderBriefHTML(payload: any, result: any): string {
  const serviceType = String(payload?.service_type || "Logistics Decision Brief");
  const briefId = payload?.brief_id || payload?.id || result?.brief_id || result?.id || "";
  const generatedAtUtc = payload?.generated_at_utc || result?.generated_at_utc || new Date().toISOString();

  const clientContext = payload?.client_context || {};
  const audienceType = normalizeAudienceType(payload?.audience_type || clientContext?.audience_type);
  const confidenceLevel = computeConfidence(payload, result);
  const audienceSummaryHtml = renderAudienceSummary(audienceType, payload, result);
  const rationaleHtml = renderDecisionRationale(audienceType, payload, result, confidenceLevel);
  const confidenceHtml = renderConfidenceBadge(confidenceLevel);
  const ml = mlHooks();

  const maybeMeta = () => {
    const items: { label: string; value: any }[] = [
      { label: "Country of Origin", value: payload?.country_of_origin },
      { label: "Product Description", value: payload?.product_description },
      { label: "HS Code", value: payload?.hs_code },
      { label: "Destination Country", value: payload?.destination_country },
    ];
    const present = items.filter((x) => !!x.value);
    if (!present.length) return "";
    return `
      <section class="card">
        <h2>Key Identifiers</h2>
        <div class="grid">
          ${present
            .map(
              (x) => `
            <div class="kv">
              <div class="k">${escapeHtml(x.label)}</div>
              <div class="v">${escapeHtml(String(x.value))}</div>
            </div>
          `
            )
            .join("")}
        </div>
      </section>
    `;
  };

  const shipmentSummary = result?.shipment_summary || result?.summary || {};
  const recommendation = result?.primaryRecommendation || result?.recommendation || {};
  const recTitle = recommendation?.title || recommendation?.name || recommendation || "";

  const recRationale = result?.recommendation_rationale || {};
  const rationaleBullets: string[] = Array.isArray(recRationale?.bullets) ? recRationale.bullets : [];

  const actionChecklist: string[] = Array.isArray(result?.action_checklist)
    ? result.action_checklist
    : Array.isArray(result?.checklist)
    ? result.checklist
    : [];

  const risks: string[] = Array.isArray(result?.risks) ? result.risks : [];
  const assumptions: string[] = Array.isArray(result?.assumptions) ? result.assumptions : [];

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Meru — Decision Brief</title>
  <style>
    :root{
      --bg:#0b1220;
      --card:#0f1a33;
      --card2:#0c162e;
      --text:#e5e7eb;
      --muted:#94a3b8;
      --teal:#14b8a6;
      --line:rgba(255,255,255,.08);
      --shadow:0 12px 30px rgba(0,0,0,.35);
    }
    body{ margin:0; background:linear-gradient(180deg,#050816,#0b1220); color:var(--text); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
    .wrap{ max-width: 980px; margin: 32px auto; padding: 0 16px; }
    .top{ display:flex; justify-content:space-between; gap: 16px; align-items:flex-start; margin-bottom: 16px; }
    .brand{ display:flex; flex-direction:column; gap:6px; }
    .brand h1{ margin:0; font-size: 20px; letter-spacing:.2px;}
    .brand .sub{ color:var(--muted); font-size: 13px; }
    .subrow { margin-top: 8px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
    .pill { display:inline-flex; align-items:center; border-radius:999px; padding:6px 10px; font-size:12px; font-weight:700; }
    .pill-high { background:#0b3b2e; color:#c8ffe6; border:1px solid #0f5a44; }
    .pill-med { background:#3b320b; color:#fff1b0; border:1px solid #6a5a0f; }
    .pill-low { background:#3b0b0b; color:#ffd0d0; border:1px solid #6a0f0f; }

    .meta{ text-align:right; color: var(--muted); font-size: 12px; line-height: 1.4; }
    .meta .k{ text-transform: uppercase; letter-spacing:.06em; font-size: 11px; }
    .meta .v{ color: var(--text); font-weight: 700; }
    .card{ background: linear-gradient(180deg,var(--card),var(--card2)); border:1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); padding: 18px; margin: 14px 0; }
    h2{ margin: 0 0 10px; font-size: 16px; letter-spacing:.2px; }
    p{ margin: 10px 0; color: var(--text); line-height: 1.55; }
    .muted{ color: var(--muted); font-size: 13px; }
    .grid{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
    .kv{ border:1px solid var(--line); border-radius: 12px; padding: 12px; background: rgba(255,255,255,.02); }
    .kv .k{ color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing:.06em; margin-bottom: 6px; }
    .kv .v{ font-weight: 700; }
    ul{ margin: 8px 0 0 18px; color: var(--text); }
    li{ margin: 6px 0; line-height:1.45; }
    .bullets{ margin: 0; padding-left: 18px; }
    .hr{ height:1px; background: var(--line); margin: 12px 0; }
    .footer{ margin-top: 18px; font-size: 12px; color: var(--muted); }
    .badge{ display:inline-flex; align-items:center; gap: 8px; padding: 8px 10px; border-radius: 999px; border:1px solid var(--line); background: rgba(255,255,255,.03); color: var(--muted); font-size: 12px; }
    .dot{ width:8px; height:8px; border-radius: 999px; background: var(--teal); box-shadow: 0 0 0 4px rgba(20,184,166,.15); }
    @media (max-width: 720px){
      .top{ flex-direction: column; }
      .meta{ text-align:left; }
      .grid{ grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand">
        <h1>MERU EXPRESS LLC — ${escapeHtml(serviceType)}</h1>
        <div class="sub">Decision Intelligence Brief</div>
        <div class="subrow">${confidenceHtml}</div>
      </div>
      <div class="meta">
        <div><span class="k">Brief ID</span><br/><span class="v">${escapeHtml(String(briefId))}</span></div>
        <div style="margin-top:10px;"><span class="k">Generated At (UTC)</span><br/><span class="v">${escapeHtml(String(generatedAtUtc))}</span></div>
        <div style="margin-top:10px;" class="badge"><span class="dot"></span> ML: ${escapeHtml(ml.enabled ? "ON" : "READY")} • ${escapeHtml(ml.note)}</div>
      </div>
    </div>

    ${maybeMeta()}

    ${audienceSummaryHtml}
    ${rationaleHtml}

    <section class="card">
      <h2>Shipment Summary</h2>
      <div class="grid">
        ${Object.entries(shipmentSummary || {})
          .slice(0, 10)
          .map(
            ([k, v]) => `
          <div class="kv">
            <div class="k">${escapeHtml(String(k).replace(/_/g, " "))}</div>
            <div class="v">${escapeHtml(String(v ?? ""))}</div>
          </div>
        `
          )
          .join("")}
      </div>
      ${!Object.keys(shipmentSummary || {}).length ? `<div class="muted">No structured shipment summary provided.</div>` : ""}
    </section>

    <section class="card">
      <h2>Recommendation</h2>
      <p><strong>${escapeHtml(String(recTitle || "Recommendation pending"))}</strong></p>

      ${
        rationaleBullets.length
          ? `<div class="hr"></div><div class="muted">Key drivers</div><ul>${rationaleBullets
              .slice(0, 10)
              .map((b) => `<li>${escapeHtml(String(b))}</li>`)
              .join("")}</ul>`
          : ""
      }

      ${
        actionChecklist.length
          ? `<div class="hr"></div><div class="muted">Action checklist</div><ul>${actionChecklist
              .slice(0, 12)
              .map((b) => `<li>${escapeHtml(String(b))}</li>`)
              .join("")}</ul>`
          : ""
      }
    </section>

    ${
      risks.length
        ? `<section class="card"><h2>Risks & Constraints</h2><ul>${risks
            .slice(0, 12)
            .map((r) => `<li>${escapeHtml(String(r))}</li>`)
            .join("")}</ul></section>`
        : ""
    }

    ${
      assumptions.length
        ? `<section class="card"><h2>Assumptions</h2><ul>${assumptions
            .slice(0, 10)
            .map((r) => `<li>${escapeHtml(String(r))}</li>`)
            .join("")}</ul></section>`
        : ""
    }

    <div class="footer">
      This report is for operational decision support only. It does not constitute legal, tax, or regulatory advice.
    </div>
  </div>
</body>
</html>`;

  return html;
}