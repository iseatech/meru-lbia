export type CountryRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface TradeBarrier {
  type: string;
  description: string;
}

export interface RegulatoryFlag {
  agency: string;
  note: string;
}

export interface SectorInsight {
  sector: string;
  comment: string;
}

export interface IntelligenceResult {
  country: string;
  countryRisk: CountryRiskLevel;
  geopoliticalNotes?: string[];
  tradeBarriers?: TradeBarrier[];
  regulatoryFlags?: RegulatoryFlag[];
  sectorInsights?: SectorInsight[];
  source: "STATIC" | "DB" | "EXTERNAL_API";
}
