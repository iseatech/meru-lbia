export type AnalysisScope = "operational" | "financial" | "strategic";

export type IncotermRule = {
  control_level: string;
  analysis_scope: AnalysisScope;
  enabled_modules: string[];
  limitation_message?: string;
};

export const incotermRules: Record<string, IncotermRule> = {
  EXW: {
    control_level: "Full Control",
    analysis_scope: "operational",
    enabled_modules: ["routing", "consolidation", "forwarder", "port", "customs", "delivery"]
  },
  FCA: {
    control_level: "High Control",
    analysis_scope: "operational",
    enabled_modules: ["routing", "consolidation", "forwarder", "port", "customs", "delivery"]
  },
  FAS: {
    control_level: "High Control",
    analysis_scope: "operational",
    enabled_modules: ["routing", "consolidation", "forwarder", "port", "customs", "delivery"]
  },
  FOB: {
    control_level: "Origin Only",
    analysis_scope: "operational",
    enabled_modules: ["routing", "consolidation", "forwarder", "port", "customs", "delivery"]
  },
  CFR: {
    control_level: "Freight Paid",
    analysis_scope: "financial",
    enabled_modules: ["routing", "forwarder", "port", "customs", "delivery"],
    limitation_message: "Scope limited to financial analysis; seller controls main carriage."
  },
  CIF: {
    control_level: "Freight + Insurance",
    analysis_scope: "financial",
    enabled_modules: ["routing", "forwarder", "port", "customs", "delivery"],
    limitation_message: "Scope limited to financial analysis; seller controls main carriage and insurance."
  },
  CPT: {
    control_level: "Freight Paid",
    analysis_scope: "financial",
    enabled_modules: ["routing", "forwarder", "customs", "delivery"],
    limitation_message: "Scope limited to financial analysis; seller controls main carriage."
  },
  CIP: {
    control_level: "Freight + Insurance",
    analysis_scope: "financial",
    enabled_modules: ["routing", "forwarder", "customs", "delivery"],
    limitation_message: "Scope limited to financial analysis; seller controls main carriage and insurance."
  },
  DAP: {
    control_level: "Minimal Control",
    analysis_scope: "strategic",
    enabled_modules: ["customs", "delivery"],
    limitation_message: "Scope limited to strategic overview; seller delivers to destination."
  },
  DPU: {
    control_level: "Minimal Control",
    analysis_scope: "strategic",
    enabled_modules: ["customs", "delivery"],
    limitation_message: "Scope limited to strategic overview; seller delivers unloaded."
  },
  DDP: {
    control_level: "None",
    analysis_scope: "strategic",
    enabled_modules: ["delivery"],
    limitation_message: "Scope limited to strategic overview; seller handles all logistics and duties."
  }
};

export function getIncotermRule(incoterm: string): IncotermRule {
  const upper = (incoterm || "").toUpperCase().trim();
  return incotermRules[upper] || {
    control_level: "Unknown",
    analysis_scope: "operational",
    enabled_modules: ["routing", "consolidation", "forwarder", "port", "customs", "delivery"]
  };
}

export function getIncotermContext(incoterm: string): {
  incoterm: string;
  control_level: string;
  analysis_scope: AnalysisScope;
  enabled_modules: string[];
  limitation_message: string | null;
} {
  const rule = getIncotermRule(incoterm);
  return {
    incoterm: (incoterm || "").toUpperCase().trim() || "UNKNOWN",
    control_level: rule.control_level,
    analysis_scope: rule.analysis_scope,
    enabled_modules: rule.enabled_modules,
    limitation_message: rule.limitation_message || null
  };
}
