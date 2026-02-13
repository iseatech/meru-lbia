import { useState, useRef } from "react";
import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import BackButton from "../components/BackButton";
import SEO from "../components/SEO";
import * as XLSX from "xlsx";

type ParsedRow = {
  hs_code: string;
  product_description: string;
  country_of_origin: string;
  additional_notes: string;
  _errors: string[];
  _row: number;
};

export default function CustomsBulk250() {
  const { isAuthenticated, isLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  const validRows = parsedRows.filter((r) => r._errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r._errors.length > 0);
  const canSubmit = isAuthenticated && validRows.length > 0 && invalidRows.length === 0 && destinationCountry.trim() && !submitting;

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError("");
    setParsedRows([]);
    setFileName(file.name);

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setParseError("Please upload an .xlsx file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });

        if (jsonData.length === 0) {
          setParseError("The uploaded file contains no data rows.");
          return;
        }

        if (jsonData.length > 250) {
          setParseError(`Too many rows (${jsonData.length}). Maximum is 250.`);
          return;
        }

        const rows: ParsedRow[] = jsonData.map((row, index) => {
          const errors: string[] = [];
          const hsCode = String(row.hs_code || row["HS Code"] || row["hs code"] || "").trim();
          const desc = String(row.product_description || row["Product Description"] || row["product description"] || "").trim();
          const origin = String(row.country_of_origin || row["Country of Origin"] || row["country of origin"] || "").trim();
          const notes = String(row.additional_notes || row["Additional Notes"] || row["additional notes"] || "").trim();

          if (!hsCode) errors.push("HS Code is required");
          if (!desc) errors.push("Product Description is required");
          if (!origin) errors.push("Country of Origin is required");

          return {
            hs_code: hsCode,
            product_description: desc,
            country_of_origin: origin,
            additional_notes: notes,
            _errors: errors,
            _row: index + 2,
          };
        });

        setParsedRows(rows);
      } catch {
        setParseError("Failed to parse the Excel file. Please ensure it follows the template format.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      const hsItems = validRows.map(({ hs_code, product_description, country_of_origin, additional_notes }) => ({
        hs_code, product_description, country_of_origin, additional_notes,
      }));

      const res = await fetch("/meru/decision-briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          service_type: "customs-bulk-250",
          hs_items: hsItems,
          destination_country: destinationCountry,
          country_of_origin: hsItems[0]?.country_of_origin || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Submission failed.");
        setSubmitting(false);
        return;
      }
      setSuccess({ id: data.id });
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  function handleDownloadPdf() {
    if (!success) return;
    window.open(`/meru/decision-briefs/${success.id}/pdf`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="service-detail-page">
        <BackButton />
        <div className="intake-form-wrap"><div className="intake-loading">Loading...</div></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="service-detail-page">
        <SEO title="Bulk Customs Compliance - Meru Express" description="Bulk HS code analysis for up to 250 codes via Excel upload." canonical="/services/customs/bulk-250" />
        <BackButton />
        <h1>Bulk Customs Compliance &mdash; Up to 250 HS Codes</h1>
        <div className="intake-form-wrap">
          <div className="intake-auth-gate" data-testid="text-auth-gate">
            <div className="intake-gate-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
            </div>
            <h3>Sign in to get started</h3>
            <p>Create an account or log in to submit your bulk compliance request.</p>
            <div className="intake-gate-actions">
              <Link href="/auth/login"><span className="btn-primary" data-testid="button-login-gate">Log In</span></Link>
              <Link href="/auth/signup"><span className="btn-outline" data-testid="button-signup-gate">Create Account</span></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="service-detail-page">
        <BackButton />
        <div className="intake-form-wrap">
          <div className="intake-success" data-testid="text-submission-success">
            <div className="intake-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            </div>
            <h3>Request Submitted</h3>
            <p>Your bulk compliance analysis ({validRows.length} HS codes) has been submitted.</p>
            <div className="intake-success-actions">
              <button type="button" className="btn-primary" onClick={handleDownloadPdf} data-testid="button-download-pdf">Download PDF</button>
              <Link href="/account/reports"><span className="btn-outline" data-testid="link-back-dashboard">Back to Dashboard</span></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="service-detail-page">
      <SEO title="Bulk Customs Compliance - Meru Express" description="Bulk HS code analysis for up to 250 codes via Excel upload." canonical="/services/customs/bulk-250" />
      <BackButton />
      <h1>Bulk Customs Compliance &mdash; Up to 250 HS Codes</h1>
      <p className="service-detail-desc">
        Upload an Excel file with your HS codes for enterprise-scale compliance analysis.
      </p>
      <div className="intake-form-wrap">
        <div className="intake-header">
          <h2 data-testid="text-form-title">Bulk Upload (up to 250)</h2>
          <span className="intake-price" data-testid="text-form-price">$199</span>
        </div>
        {error && <p className="intake-error" data-testid="text-form-error">{error}</p>}

        <form onSubmit={handleSubmit} className="intake-form" noValidate>
          <div className="bulk-template-section">
            <h3>Step 1: Download Template</h3>
            <p>Use our template to ensure your data is formatted correctly.</p>
            <a href="/templates/hs-codes-template.xlsx" download className="btn-outline" data-testid="button-download-template">
              Download Excel Template
            </a>
          </div>

          <div className="bulk-upload-section">
            <h3>Step 2: Upload Your File</h3>
            <p>Fill in the template and upload your .xlsx file (max 250 rows).</p>
            <div className="file-upload-area" onClick={() => fileInputRef.current?.click()} data-testid="area-file-upload">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span>{fileName || "Click to select .xlsx file"}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                data-testid="input-file-upload"
              />
            </div>
            {parseError && <p className="intake-error">{parseError}</p>}
          </div>

          {parsedRows.length > 0 && (
            <div className="bulk-preview-section">
              <h3>Step 3: Review Data</h3>
              <p className="bulk-stats">
                {validRows.length} valid row{validRows.length !== 1 ? "s" : ""}
                {invalidRows.length > 0 && (
                  <span className="bulk-errors-badge"> &middot; {invalidRows.length} with errors</span>
                )}
              </p>

              {invalidRows.length > 0 && (
                <div className="bulk-validation-errors" data-testid="bulk-validation-errors">
                  <strong>Row errors:</strong>
                  <ul>
                    {invalidRows.slice(0, 10).map((row) => (
                      <li key={row._row}>Row {row._row}: {row._errors.join(", ")}</li>
                    ))}
                    {invalidRows.length > 10 && <li>...and {invalidRows.length - 10} more</li>}
                  </ul>
                </div>
              )}

              <div className="bulk-preview-table-wrap">
                <table className="bulk-preview-table" data-testid="table-preview">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>HS Code</th>
                      <th>Product Description</th>
                      <th>Country of Origin</th>
                      <th>Notes</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 15).map((row) => (
                      <tr key={row._row} className={row._errors.length > 0 ? "row-error" : ""}>
                        <td>{row._row}</td>
                        <td>{row.hs_code || "\u2014"}</td>
                        <td>{row.product_description || "\u2014"}</td>
                        <td>{row.country_of_origin || "\u2014"}</td>
                        <td>{row.additional_notes || "\u2014"}</td>
                        <td>{row._errors.length > 0 ? "Error" : "OK"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 15 && (
                  <p className="bulk-preview-more">Showing 15 of {parsedRows.length} rows</p>
                )}
              </div>
            </div>
          )}

          <div className="intake-field">
            <label htmlFor="destination_country">Destination Country <span className="required-mark">*</span></label>
            <input id="destination_country" type="text" value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} placeholder="e.g., United States" data-testid="input-destination-country" />
          </div>

          <button type="submit" className="btn-primary intake-submit" disabled={!canSubmit} data-testid="button-submit-request">
            {submitting ? "Submitting..." : `Submit Request \u2014 $199`}
          </button>
        </form>
      </div>
    </div>
  );
}
