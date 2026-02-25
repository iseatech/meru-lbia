export type OfficialSource = {
  name: string;
  scope:
    | "Customs"
    | "Trade"
    | "Tariffs"
    | "Sanctions"
    | "Ports"
    | "Transportation"
    | "Safety"
    | "Statistics"
    | "ExportControls"
    | "FoodDrug"
    | "Environment";
  what_it_covers: string[];
  update_channel: string[];
  url: string;
};

export const US_OFFICIAL_SOURCES: OfficialSource[] = [
  {
    name: "U.S. Customs and Border Protection (CBP)",
    scope: "Customs",
    what_it_covers: [
      "Import requirements",
      "Entry process",
      "Customs compliance guidance",
      "CSMS notices"
    ],
    update_channel: ["CBP Trade News", "CSMS notices"],
    url: "https://www.cbp.gov/trade"
  },
  {
    name: "International Trade Administration (ITA) — trade.gov",
    scope: "Trade",
    what_it_covers: [
      "Country commercial guides",
      "Market intelligence",
      "Trade barriers",
      "Industry insights"
    ],
    update_channel: ["trade.gov updates", "Country/sector pages"],
    url: "https://www.trade.gov"
  },
  {
    name: "U.S. International Trade Commission (USITC) — HTS",
    scope: "Tariffs",
    what_it_covers: [
      "Official Harmonized Tariff Schedule (HTSUS)",
      "Tariff rates",
      "Legal notes and chapters"
    ],
    update_channel: ["HTS updates (official)"],
    url: "https://hts.usitc.gov"
  },
  {
    name: "U.S. Department of the Treasury — OFAC",
    scope: "Sanctions",
    what_it_covers: [
      "Sanctions programs",
      "Restricted parties guidance",
      "Compliance advisories"
    ],
    update_channel: ["OFAC updates", "Sanctions lists updates"],
    url: "https://ofac.treasury.gov"
  },
  {
    name: "U.S. Department of Commerce — Bureau of Industry and Security (BIS)",
    scope: "ExportControls",
    what_it_covers: [
      "Export controls (EAR)",
      "Entity List / restricted parties",
      "Licensing requirements and guidance"
    ],
    update_channel: ["BIS updates", "EAR/Entity List updates"],
    url: "https://www.bis.gov"
  },
  {
    name: "U.S. Census Bureau — Foreign Trade",
    scope: "Statistics",
    what_it_covers: [
      "Import/export trade statistics",
      "Data for lanes, commodities, volumes"
    ],
    update_channel: ["Foreign Trade data releases"],
    url: "https://www.census.gov/foreign-trade/index.html"
  },
  {
    name: "Federal Maritime Commission (FMC)",
    scope: "Ports",
    what_it_covers: [
      "Ocean shipping regulatory guidance",
      "Ocean carrier/NVOCC requirements",
      "Maritime complaints and compliance"
    ],
    update_channel: ["FMC announcements"],
    url: "https://www.fmc.gov"
  },
  {
    name: "U.S. Maritime Administration (MARAD)",
    scope: "Ports",
    what_it_covers: [
      "Maritime policy",
      "Port and vessel-related programs",
      "Maritime infrastructure context"
    ],
    update_channel: ["MARAD updates"],
    url: "https://www.maritime.dot.gov"
  },
  {
    name: "Federal Motor Carrier Safety Administration (FMCSA)",
    scope: "Transportation",
    what_it_covers: [
      "Trucking safety regulations",
      "Carrier compliance context for ground moves"
    ],
    update_channel: ["FMCSA updates"],
    url: "https://www.fmcsa.dot.gov"
  },
  {
    name: "Transportation Security Administration (TSA)",
    scope: "Transportation",
    what_it_covers: [
      "Air cargo security rules",
      "Security program guidance"
    ],
    update_channel: ["TSA updates"],
    url: "https://www.tsa.gov"
  },
  {
    name: "Food and Drug Administration (FDA)",
    scope: "FoodDrug",
    what_it_covers: [
      "Food/drug import requirements",
      "Prior notice and compliance guidance"
    ],
    update_channel: ["FDA updates"],
    url: "https://www.fda.gov"
  },
  {
    name: "USDA — APHIS",
    scope: "FoodDrug",
    what_it_covers: [
      "Agriculture import restrictions",
      "Plant/animal product requirements"
    ],
    update_channel: ["APHIS updates"],
    url: "https://www.aphis.usda.gov"
  },
  {
    name: "Environmental Protection Agency (EPA)",
    scope: "Environment",
    what_it_covers: [
      "Regulated substances and environmental compliance context",
      "Certain product category rules (as applicable)"
    ],
    update_channel: ["EPA updates"],
    url: "https://www.epa.gov"
  },
  {
    name: "Consumer Product Safety Commission (CPSC)",
    scope: "Safety",
    what_it_covers: [
      "Consumer product safety requirements",
      "Recalls and safety standards context"
    ],
    update_channel: ["CPSC updates"],
    url: "https://www.cpsc.gov"
  },
  {
    name: "National Highway Traffic Safety Administration (NHTSA)",
    scope: "Safety",
    what_it_covers: [
      "Vehicle/auto product compliance context",
      "Safety standards and recalls"
    ],
    update_channel: ["NHTSA updates"],
    url: "https://www.nhtsa.gov"
  }
];

// Helper (no rompe nada): por ahora solo “sugiere” fuentes según el tipo de servicio
export function getOfficialSourcesForService(serviceType: string): OfficialSource[] {
  const s = (serviceType || "").toLowerCase();

  // Customs / HS / restrictions
  if (s.includes("customs") || s.includes("hs") || s.includes("compliance")) {
    return US_OFFICIAL_SOURCES.filter(x =>
      ["Customs", "Tariffs", "Sanctions", "Trade", "FoodDrug", "Safety", "Environment", "ExportControls"].includes(x.scope)
    );
  }

  // Logistics decision brief / routing / carriers
  if (s.includes("logistics") || s.includes("decision")) {
    return US_OFFICIAL_SOURCES.filter(x =>
      ["Transportation", "Ports", "Statistics", "Trade", "Sanctions"].includes(x.scope)
    );
  }

  // Default
  return US_OFFICIAL_SOURCES;
}
