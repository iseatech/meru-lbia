import { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import SEO from "../components/SEO";

const PROMPT_CATEGORIES = ["LBIA", "Compliance", "Copywriting", "QA"] as const;
type PromptCategory = typeof PROMPT_CATEGORIES[number];

type Prompt = {
  id: string;
  title: string;
  category: PromptCategory;
};

type ImprovementRequest = {
  id: string;
  title: string;
  type: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Resolved";
};

const INITIAL_PROMPTS: Prompt[] = [
  { id: "p1", title: "Generate LBIA Executive Summary", category: "LBIA" },
  { id: "p2", title: "Risk Assessment Matrix Builder", category: "LBIA" },
  { id: "p3", title: "HS Classification Validator", category: "Compliance" },
  { id: "p4", title: "Regulatory Flag Explanation", category: "Compliance" },
  { id: "p5", title: "Service Page Copy Generator", category: "Copywriting" },
  { id: "p6", title: "Brief Output Quality Check", category: "QA" },
];

const INITIAL_REQUESTS: ImprovementRequest[] = [
  { id: "r1", title: "Improve tariff risk scoring accuracy", type: "Accuracy", priority: "High", status: "Open" },
  { id: "r2", title: "Add multi-language brief support", type: "Feature", priority: "Medium", status: "In Progress" },
  { id: "r3", title: "Reduce LBIA generation latency", type: "Performance", priority: "Critical", status: "Open" },
];

const MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
const REQUEST_TYPES = ["Accuracy", "Feature", "Performance", "UX", "Bug"];
const PRIORITIES: ImprovementRequest["priority"][] = ["Low", "Medium", "High", "Critical"];

export default function AdminAiWorkspace() {
  const [prompts, setPrompts] = useState<Prompt[]>(INITIAL_PROMPTS);
  const [requests, setRequests] = useState<ImprovementRequest[]>(INITIAL_REQUESTS);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [activeCategory, setActiveCategory] = useState<PromptCategory | "All">("All");

  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState<Prompt | null>(null);
  const [promptForm, setPromptForm] = useState({ title: "", category: "LBIA" as PromptCategory });

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ title: "", type: "Accuracy", priority: "Medium" as ImprovementRequest["priority"] });

  const filteredPrompts = activeCategory === "All" ? prompts : prompts.filter((p) => p.category === activeCategory);

  function openAddPrompt() {
    setEditPrompt(null);
    setPromptForm({ title: "", category: "LBIA" });
    setPromptModalOpen(true);
  }

  function openEditPrompt(p: Prompt) {
    setEditPrompt(p);
    setPromptForm({ title: p.title, category: p.category });
    setPromptModalOpen(true);
  }

  function savePrompt() {
    if (editPrompt) {
      setPrompts((prev) => prev.map((p) => (p.id === editPrompt.id ? { ...p, title: promptForm.title, category: promptForm.category } : p)));
    } else {
      setPrompts((prev) => [...prev, { id: `p-${Date.now()}`, title: promptForm.title, category: promptForm.category }]);
    }
    setPromptModalOpen(false);
  }

  function deletePrompt(id: string) {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  }

  function submitRequest() {
    setRequests((prev) => [...prev, { id: `r-${Date.now()}`, title: requestForm.title, type: requestForm.type, priority: requestForm.priority, status: "Open" }]);
    setRequestForm({ title: "", type: "Accuracy", priority: "Medium" });
    setRequestModalOpen(false);
  }

  return (
    <AdminLayout>
      <SEO title="AI Workspace - Admin - Meru Express" description="Configure AI provider settings, manage prompts, and track improvement requests." canonical="/admin/ai-workspace" />
      <div className="admin-page-header">
        <div>
          <h1>AI Workspace</h1>
          <p className="admin-page-subtitle">Provider configuration, prompt management, and improvement tracking.</p>
        </div>
      </div>

      <div className="admin-info-banner" data-testid="text-phase2-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        Keys &amp; live connection will be implemented in Phase 2 (secure backend).
      </div>

      <div className="ai-workspace-grid">
        <div className="ai-card" data-testid="card-provider-settings">
          <div className="ai-card-header">
            <h2>Provider Settings</h2>
            <span className="ai-status-badge status-disconnected" data-testid="badge-provider-status">Not connected</span>
          </div>
          <div className="ai-card-body">
            <div className="ai-setting-row">
              <span className="ai-setting-label">Provider</span>
              <span className="ai-setting-value" data-testid="text-provider-name">OpenAI</span>
            </div>
            <div className="ai-setting-row">
              <span className="ai-setting-label">Model</span>
              <select className="ai-model-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} data-testid="select-model">
                {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="ai-setting-row">
              <span className="ai-setting-label">API Key</span>
              <span className="ai-setting-value ai-key-placeholder" data-testid="text-api-key-placeholder">sk-****...****</span>
            </div>
            <div className="ai-setting-row">
              <span className="ai-setting-label">Status</span>
              <span className="ai-setting-value ai-status-text" data-testid="text-connection-status">Awaiting configuration</span>
            </div>
          </div>
        </div>

        <div className="ai-card ai-card-wide" data-testid="card-prompts-library">
          <div className="ai-card-header">
            <h2>Prompts Library</h2>
            <button className="btn-primary btn-sm" onClick={openAddPrompt} data-testid="button-add-prompt">Add Prompt</button>
          </div>
          <div className="ai-card-body">
            <div className="ai-category-tabs">
              <button className={`ai-cat-tab ${activeCategory === "All" ? "active" : ""}`} onClick={() => setActiveCategory("All")} data-testid="tab-category-all">All</button>
              {PROMPT_CATEGORIES.map((c) => (
                <button key={c} className={`ai-cat-tab ${activeCategory === c ? "active" : ""}`} onClick={() => setActiveCategory(c)} data-testid={`tab-category-${c.toLowerCase()}`}>{c}</button>
              ))}
            </div>
            <div className="ai-prompts-list" data-testid="prompts-list">
              {filteredPrompts.length === 0 && <p className="ai-empty-text">No prompts in this category.</p>}
              {filteredPrompts.map((p) => (
                <div className="ai-prompt-row" key={p.id} data-testid={`prompt-${p.id}`}>
                  <div className="ai-prompt-info">
                    <span className="ai-prompt-title" data-testid={`text-prompt-title-${p.id}`}>{p.title}</span>
                    <span className={`ai-prompt-category cat-${p.category.toLowerCase()}`}>{p.category}</span>
                  </div>
                  <div className="ai-prompt-actions">
                    <button className="btn-sm-ghost" onClick={() => openEditPrompt(p)} data-testid={`button-edit-prompt-${p.id}`}>Edit</button>
                    <button className="btn-sm-ghost btn-warn" onClick={() => deletePrompt(p.id)} data-testid={`button-delete-prompt-${p.id}`}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ai-card ai-card-wide" data-testid="card-improvement-requests">
          <div className="ai-card-header">
            <h2>LBIA Improvement Requests</h2>
            <button className="btn-primary btn-sm" onClick={() => setRequestModalOpen(true)} data-testid="button-create-request">Create Request</button>
          </div>
          <div className="ai-card-body">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} data-testid={`row-request-${r.id}`}>
                      <td data-testid={`text-request-title-${r.id}`}>{r.title}</td>
                      <td><span className="admin-role-badge">{r.type}</span></td>
                      <td><span className={`ai-priority-badge priority-${r.priority.toLowerCase()}`} data-testid={`badge-priority-${r.id}`}>{r.priority}</span></td>
                      <td><span className={`admin-status-badge status-${r.status.toLowerCase().replace(/\s+/g, "-")}`} data-testid={`badge-request-status-${r.id}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {promptModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setPromptModalOpen(false)} data-testid="modal-prompt">
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editPrompt ? "Edit Prompt" : "Add Prompt"}</h2>
              <button className="admin-modal-close" onClick={() => setPromptModalOpen(false)} data-testid="button-close-prompt-modal">&times;</button>
            </div>
            <div className="admin-modal-body">
              <label className="admin-modal-field">
                Title
                <input type="text" value={promptForm.title} onChange={(e) => setPromptForm({ ...promptForm, title: e.target.value })} placeholder="Prompt title" data-testid="input-prompt-title" />
              </label>
              <label className="admin-modal-field">
                Category
                <select value={promptForm.category} onChange={(e) => setPromptForm({ ...promptForm, category: e.target.value as PromptCategory })} data-testid="select-prompt-category">
                  {PROMPT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="btn-outline" onClick={() => setPromptModalOpen(false)} data-testid="button-cancel-prompt">Cancel</button>
              <button className="btn-primary" onClick={savePrompt} disabled={!promptForm.title.trim()} data-testid="button-save-prompt">{editPrompt ? "Save Changes" : "Add Prompt"}</button>
            </div>
          </div>
        </div>
      )}

      {requestModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setRequestModalOpen(false)} data-testid="modal-request">
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Create Improvement Request</h2>
              <button className="admin-modal-close" onClick={() => setRequestModalOpen(false)} data-testid="button-close-request-modal">&times;</button>
            </div>
            <div className="admin-modal-body">
              <label className="admin-modal-field">
                Title
                <input type="text" value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })} placeholder="Describe the improvement" data-testid="input-request-title" />
              </label>
              <label className="admin-modal-field">
                Type
                <select value={requestForm.type} onChange={(e) => setRequestForm({ ...requestForm, type: e.target.value })} data-testid="select-request-type">
                  {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="admin-modal-field">
                Priority
                <select value={requestForm.priority} onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value as ImprovementRequest["priority"] })} data-testid="select-request-priority">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>
            <div className="admin-modal-footer">
              <button className="btn-outline" onClick={() => setRequestModalOpen(false)} data-testid="button-cancel-request">Cancel</button>
              <button className="btn-primary" onClick={submitRequest} disabled={!requestForm.title.trim()} data-testid="button-submit-request">Create Request</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
