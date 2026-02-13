type ServiceMode = "LOGISTICS_ONLY" | "COMPLIANCE_ONLY" | "COMBINED";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderIntelligenceSection(
  intel: any,
  serviceMode: ServiceMode = "COMBINED"
): string {
  if (!intel) return "";

  const parts: string[] = [];

  parts.push(`<div style="margin-top:24px;border-top:1px solid #ccc;padding-top:16px;">`);
  parts.push(`<h3 style="color:#1a2b4a;margin:0 0 4px 0;font-size:15px;">Trade &amp; Country Intelligence</h3>`);
  parts.push(`<p style="color:#666;font-size:11px;margin:0 0 12px 0;">Signals derived from trade policy and regulatory context (trade.gov-ready).</p>`);

  const showRisk = true;
  const showBarriers = serviceMode === "COMPLIANCE_ONLY" || serviceMode === "COMBINED"
    || (serviceMode === "LOGISTICS_ONLY" && intel.tradeBarriers?.length > 0);
  const showRegulatory = true;
  const showSector = serviceMode === "COMBINED";
  const showMeta = serviceMode === "COMPLIANCE_ONLY" || serviceMode === "COMBINED";

  const riskLevel = intel.countryRisk || intel.country_risk_level;
  if (showRisk && riskLevel) {
    const color = riskLevel === "HIGH" ? "#c0392b" : riskLevel === "MEDIUM" ? "#e67e22" : "#27ae60";
    parts.push(`<div style="margin-bottom:10px;"><strong style="font-size:12px;">Country Risk Level:</strong> <span style="color:${color};font-weight:600;font-size:12px;">${escapeHtml(riskLevel)}</span></div>`);
  }

  const barriers = intel.tradeBarriers || intel.trade_barriers;
  if (showBarriers && Array.isArray(barriers) && barriers.length > 0) {
    parts.push(`<div style="margin-bottom:10px;"><strong style="font-size:12px;">Trade Barriers</strong><ul style="margin:4px 0 0 16px;padding:0;font-size:11px;color:#444;">`);
    for (const b of barriers) {
      const barrierType = escapeHtml(b.type || "");
      const summary = escapeHtml(b.description || b.summary || "");
      const sourceLabel = b.source_label ? ` (${escapeHtml(b.source_label)})` : "";
      parts.push(`<li><strong>${barrierType}:</strong> ${summary}${sourceLabel}</li>`);
    }
    parts.push(`</ul></div>`);
  }

  const flags = intel.regulatoryFlags || intel.regulatory_flags;
  if (showRegulatory && Array.isArray(flags) && flags.length > 0) {
    parts.push(`<div style="margin-bottom:10px;"><strong style="font-size:12px;">Regulatory Flags</strong><ul style="margin:4px 0 0 16px;padding:0;font-size:11px;color:#444;">`);
    for (const f of flags) {
      const agency = escapeHtml(f.agency || "");
      const note = escapeHtml(f.note || f.flag || "");
      const action = f.action_required ? ` — Action: ${escapeHtml(f.action_required)}` : "";
      parts.push(`<li><strong>${agency}:</strong> ${note}${action}</li>`);
    }
    parts.push(`</ul></div>`);
  }

  const sectors = intel.sectorInsights || intel.sector_insights;
  if (showSector && Array.isArray(sectors) && sectors.length > 0) {
    parts.push(`<div style="margin-bottom:10px;"><strong style="font-size:12px;">Sector Insights</strong><ul style="margin:4px 0 0 16px;padding:0;font-size:11px;color:#444;">`);
    for (const s of sectors) {
      const sector = escapeHtml(s.sector || "");
      const comment = escapeHtml(s.comment || s.note || "");
      parts.push(`<li><strong>${sector}:</strong> ${comment}</li>`);
    }
    parts.push(`</ul></div>`);
  }

  const lastUpdated = intel.last_updated || intel.lastUpdated;
  if (showMeta && lastUpdated) {
    parts.push(`<div style="margin-bottom:6px;font-size:11px;color:#888;">Last updated: ${escapeHtml(lastUpdated)}</div>`);
  }

  const sources = intel.sources;
  if (showMeta && Array.isArray(sources) && sources.length > 0) {
    const labels = sources.map((s: any) => escapeHtml(typeof s === "string" ? s : s.label || s.name || "")).filter(Boolean);
    if (labels.length > 0) {
      parts.push(`<div style="font-size:11px;color:#888;">Sources: ${labels.join(", ")}</div>`);
    }
  }

  parts.push(`</div>`);

  return parts.join("\n");
}

export function renderIntelligencePdf(
  doc: PDFKit.PDFDocument,
  intel: any,
  serviceMode: ServiceMode = "COMBINED",
  marginLeft: number = 50,
  contentWidth: number = 495
): void {
  if (!intel) return;

  if (doc.y > doc.page.height - 200) {
    doc.addPage();
  }

  doc.moveDown(0.5);
  doc.moveTo(marginLeft, doc.y).lineTo(marginLeft + contentWidth, doc.y).strokeColor("#cccccc").stroke();
  doc.moveDown(0.5);

  doc.fontSize(12).fillColor("#1a2b4a").text("Trade & Country Intelligence", marginLeft, doc.y, { width: contentWidth });
  doc.moveDown(0.2);
  doc.fontSize(8).fillColor("#888888").text("Signals derived from trade policy and regulatory context (trade.gov-ready).", marginLeft, doc.y, { width: contentWidth });
  doc.moveDown(0.6);

  const showRisk = true;
  const showBarriers = serviceMode === "COMPLIANCE_ONLY" || serviceMode === "COMBINED"
    || (serviceMode === "LOGISTICS_ONLY" && intel.tradeBarriers?.length > 0);
  const showRegulatory = true;
  const showSector = serviceMode === "COMBINED";
  const showMeta = serviceMode === "COMPLIANCE_ONLY" || serviceMode === "COMBINED";

  const riskLevel = intel.countryRisk || intel.country_risk_level;
  if (showRisk && riskLevel) {
    const color = riskLevel === "HIGH" ? "#c0392b" : riskLevel === "MEDIUM" ? "#e67e22" : "#27ae60";
    doc.fontSize(10).fillColor("#333333").text("Country Risk Level: ", marginLeft, doc.y, { continued: true, width: contentWidth });
    doc.fillColor(color).text(riskLevel, { continued: false });
    doc.moveDown(0.5);
  }

  const barriers = intel.tradeBarriers || intel.trade_barriers;
  if (showBarriers && Array.isArray(barriers) && barriers.length > 0) {
    doc.fontSize(10).fillColor("#1a2b4a").text("Trade Barriers", marginLeft, doc.y, { width: contentWidth });
    doc.moveDown(0.2);
    for (const b of barriers) {
      if (doc.y > doc.page.height - 150) doc.addPage();
      const barrierType = b.type || "";
      const summary = b.description || b.summary || "";
      const sourceLabel = b.source_label ? ` (${b.source_label})` : "";
      doc.fontSize(9).fillColor("#444444").text(`  •  ${barrierType}: ${summary}${sourceLabel}`, marginLeft + 8, doc.y, { width: contentWidth - 8 });
      doc.moveDown(0.2);
    }
    doc.moveDown(0.3);
  }

  const flags = intel.regulatoryFlags || intel.regulatory_flags;
  if (showRegulatory && Array.isArray(flags) && flags.length > 0) {
    doc.fontSize(10).fillColor("#1a2b4a").text("Regulatory Flags", marginLeft, doc.y, { width: contentWidth });
    doc.moveDown(0.2);
    for (const f of flags) {
      if (doc.y > doc.page.height - 150) doc.addPage();
      const agency = f.agency || "";
      const note = f.note || f.flag || "";
      const action = f.action_required ? ` — Action: ${f.action_required}` : "";
      doc.fontSize(9).fillColor("#444444").text(`  •  ${agency}: ${note}${action}`, marginLeft + 8, doc.y, { width: contentWidth - 8 });
      doc.moveDown(0.2);
    }
    doc.moveDown(0.3);
  }

  const sectors = intel.sectorInsights || intel.sector_insights;
  if (showSector && Array.isArray(sectors) && sectors.length > 0) {
    doc.fontSize(10).fillColor("#1a2b4a").text("Sector Insights", marginLeft, doc.y, { width: contentWidth });
    doc.moveDown(0.2);
    for (const s of sectors) {
      if (doc.y > doc.page.height - 150) doc.addPage();
      const sector = s.sector || "";
      const comment = s.comment || s.note || "";
      doc.fontSize(9).fillColor("#444444").text(`  •  ${sector}: ${comment}`, marginLeft + 8, doc.y, { width: contentWidth - 8 });
      doc.moveDown(0.2);
    }
    doc.moveDown(0.3);
  }

  const lastUpdated = intel.last_updated || intel.lastUpdated;
  if (showMeta && lastUpdated) {
    doc.fontSize(8).fillColor("#888888").text(`Last updated: ${lastUpdated}`, marginLeft, doc.y, { width: contentWidth });
    doc.moveDown(0.2);
  }

  const sources = intel.sources;
  if (showMeta && Array.isArray(sources) && sources.length > 0) {
    const labels = sources.map((s: any) => typeof s === "string" ? s : s.label || s.name || "").filter(Boolean);
    if (labels.length > 0) {
      doc.fontSize(8).fillColor("#888888").text(`Sources: ${labels.join(", ")}`, marginLeft, doc.y, { width: contentWidth });
      doc.moveDown(0.2);
    }
  }
}
