import type { ClientType } from "./decisionEngine";
import type { LogisticsStrategy } from "./lbiaAgent";

export type LaneProfileMatch = {
  mode: string;
  originRegions?: string[];
  destinationRegions?: string[];
  polIn?: string[];
  podIn?: string[];
};

export type LaneProfile = {
  id: string;
  name: string;
  match: LaneProfileMatch;
  route_options: string[];
  port_notes: string[];
  cost_drivers: string[];
  execution_checks: string[];
};

type MatchInput = {
  pol: string;
  pod: string;
  origin_region: string;
  destination_region: string;
  mode: string;
  shipment_type: string;
};

const PORT_ALIASES: Record<string, string[]> = {
  CNSHA: ["CNSHA", "SHANGHAI"],
  CNNGB: ["CNNGB", "NINGBO"],
  CNYTN: ["CNYTN", "YANTIAN", "SHENZHEN"],
  HKHKG: ["HKHKG", "HONG KONG", "HONGKONG"],
  KRPUS: ["KRPUS", "BUSAN"],
  SGSIN: ["SGSIN", "SINGAPORE"],
  VNHPH: ["VNHPH", "HAIPHONG", "HAI PHONG"],
  TWKHH: ["TWKHH", "KAOHSIUNG"],
  JPYOK: ["JPYOK", "YOKOHAMA"],
  JPTYO: ["JPTYO", "TOKYO"],
  USLAX: ["USLAX", "LOS ANGELES", "LA"],
  USLGB: ["USLGB", "LONG BEACH"],
  USOAK: ["USOAK", "OAKLAND"],
  USSEA: ["USSEA", "SEATTLE", "TACOMA"],
  USNYC: ["USNYC", "NEW YORK", "NEWARK"],
  USSAV: ["USSAV", "SAVANNAH"],
  USMIA: ["USMIA", "MIAMI"],
  USHOU: ["USHOU", "HOUSTON"],
  USMOB: ["USMOB", "MOBILE"],
  USMSY: ["USMSY", "NEW ORLEANS"],
  CAPRR: ["CAPRR", "PRINCE RUPERT"],
  CAVAN: ["CAVAN", "VANCOUVER"],
  DEHAM: ["DEHAM", "HAMBURG"],
  NLRTM: ["NLRTM", "ROTTERDAM"],
  BEANR: ["BEANR", "ANTWERP"],
  GBFXT: ["GBFXT", "FELIXSTOWE"],
  BRSSZ: ["BRSSZ", "SANTOS"],
  MXZLO: ["MXZLO", "MANZANILLO"],
  COBUN: ["COBUN", "BUENAVENTURA"],
};

function normalizePort(port: string): string {
  if (!port) return "";
  const upper = port.toUpperCase().trim();
  for (const [code, aliases] of Object.entries(PORT_ALIASES)) {
    if (aliases.some(a => upper === a || upper.includes(a))) {
      return code;
    }
  }
  return upper;
}

const ASIA_PORTS = ["CNSHA", "CNNGB", "CNYTN", "HKHKG", "KRPUS", "SGSIN", "VNHPH", "TWKHH", "JPYOK", "JPTYO"];
const US_WC_PORTS = ["USLAX", "USLGB", "USOAK", "USSEA"];
const US_EC_PORTS = ["USNYC", "USSAV", "USMIA"];
const EU_PORTS = ["DEHAM", "NLRTM", "BEANR", "GBFXT"];
const LATAM_PORTS = ["BRSSZ", "MXZLO", "COBUN"];

const LANE_PROFILES: LaneProfile[] = [
  {
    id: "asia_us_west_coast",
    name: "Asia → US West Coast",
    match: {
      mode: "SEA",
      originRegions: ["ASIA"],
      destinationRegions: ["US", "USA", "NORTH_AMERICA"],
      polIn: ASIA_PORTS,
      podIn: US_WC_PORTS,
    },
    route_options: [
      "Direct transpacific service via LA/Long Beach: fastest transit at 12-16 days, subject to port congestion peaks and chassis availability constraints. Best for time-sensitive cargo when congestion levels are manageable.",
      "Oakland routing: comparable transit times with significantly lower congestion frequency. Terminal productivity is more consistent, making this the preferred contingency when LA/LB delays exceed 3 days.",
      "Prince Rupert or Vancouver with rail intermodal: adds 2-3 days to total transit but bypasses US West Coast port bottlenecks entirely. Cost-effective for inland destinations in the Midwest and East Coast via Canadian rail connections.",
    ],
    port_notes: [
      "LA/LB handles approximately 40% of US container imports; congestion is structural, not seasonal.",
      "Chassis pools at LA/LB operate under appointment systems; pre-arrange drayage to avoid demurrage.",
      "CFS consolidation cut-offs at Shanghai and Ningbo are typically 3-4 days before vessel departure.",
    ],
    cost_drivers: [
      "BAF / bunker adjustments",
      "Origin THC + CFS handling (LCL)",
      "Destination CFS/terminal handling + documentation fees",
      "Drayage + chassis (especially US West Coast)",
      "Detention/Demurrage exposure when cut-offs and free time are missed",
    ],
    execution_checks: [
      "Lock the consolidation schedule (ETD/ETS) and cut-offs before cargo tender.",
      "Confirm chargeable W/M method (per CBM vs per ton) and minimums for dense cargo.",
      "Validate HS codes and ISF timing (US import) to prevent holds and penalties.",
    ],
  },

  {
    id: "asia_us_east_coast_panama",
    name: "Asia → US East Coast (Panama / All-water)",
    match: {
      mode: "SEA",
      originRegions: ["ASIA"],
      destinationRegions: ["US", "USA", "NORTH_AMERICA"],
      polIn: ASIA_PORTS,
      podIn: US_EC_PORTS,
    },
    route_options: [
      "All-water via Panama for East Coast delivery; longer transit but can reduce inland rail exposure for East Coast destinations.",
      "Consider Gulf gateways when final destination is Southeast/central (lane-dependent); confirm weekly frequency and transshipment risk.",
    ],
    port_notes: [
      "All-water services have fewer weekly sailings on some lanes; missed cut-offs can push you out by 7+ days.",
      "For LCL: destination devanning schedule often drives real delivery date more than vessel ETA.",
    ],
    cost_drivers: [
      "Panama canal surcharges (lane/market dependent)",
      "Transshipment risk premiums and schedule variability",
      "Destination terminal handling + trucking variability by East Coast port",
    ],
    execution_checks: [
      "Confirm transshipment points and buffer time for connection risk.",
      "Align delivery commitments with devanning schedule, not just vessel ETA.",
    ],
  },

  {
    id: "europe_us_east_coast",
    name: "Europe → US East Coast",
    match: {
      mode: "SEA",
      originRegions: ["EUROPE"],
      destinationRegions: ["US", "USA", "NORTH_AMERICA"],
      polIn: EU_PORTS,
      podIn: US_EC_PORTS,
    },
    route_options: [
      "Direct North Atlantic services for predictable schedules; verify weekly frequency and equipment availability for your load plan.",
      "Use alternate discharge ports when one gateway is constrained; manage inland drayage/rail trade-offs.",
    ],
    port_notes: [
      "Euro origin cut-offs and export customs filing windows can become the critical path—confirm who owns filing under the chosen Incoterm.",
    ],
    cost_drivers: [
      "Origin export handling and documentation",
      "Peak season equipment imbalance (empty repositioning)",
      "Destination terminal handling + trucking",
    ],
    execution_checks: [
      "Confirm export customs responsibility and timeline under the Incoterm.",
      "Validate VGM/weight declarations and documentation consistency.",
    ],
  },

  {
    id: "latin_us_gulf_east",
    name: "LatAm → US Gulf / East Coast",
    match: {
      mode: "SEA",
      originRegions: ["LATAM", "LATIN_AMERICA"],
      destinationRegions: ["US", "USA", "NORTH_AMERICA"],
      polIn: LATAM_PORTS,
      podIn: [...US_EC_PORTS, "USHOU", "USMSY"],
    },
    route_options: [
      "Direct regional services where available; otherwise align on transshipment points and connection risk.",
      "For time-sensitive cargo, prioritize higher-frequency services even if the ocean rate is slightly higher.",
    ],
    port_notes: [
      "Documentation accuracy and broker coordination typically drives outcomes more than carrier selection on this lane.",
    ],
    cost_drivers: [
      "Origin export documentation and inspections (lane/country dependent)",
      "Destination handling + broker fees",
      "Domestic trucking variability",
    ],
    execution_checks: [
      "Confirm document set completeness before cargo receives at origin.",
      "Align broker pre-clear and ISF/entry timing to avoid holds.",
    ],
  },

  {
    id: "global_generic",
    name: "Global (Generic Sea Lane)",
    match: { mode: "SEA" },
    route_options: [
      "Use the highest-frequency service that matches your priority (cost vs time). Frequency reduces delay exposure more than marginal rate differences.",
    ],
    port_notes: [
      "For LCL: the CFS schedule is the controlling timeline. For FCL: gate cut-offs and free time terms control cost exposure.",
    ],
    cost_drivers: [
      "Origin/destination handling and documentation",
      "Fuel/BAF adjustments",
      "Trucking/drayage variability",
    ],
    execution_checks: [
      "Confirm cut-offs, free time, and chargeable W/M method in writing.",
    ],
  },
];

export function getLaneProfile(input: MatchInput): LaneProfile | null {
  const mode = input.mode?.toUpperCase();
  if (mode !== "SEA") return null;

  const pol = normalizePort(input.pol);
  const pod = normalizePort(input.pod);
  const originRegion = (input.origin_region || "").toUpperCase().trim();
  const destRegion = (input.destination_region || "").toUpperCase().trim();

  const exact = LANE_PROFILES.find((p) => {
    const m = p.match;
    if (m.mode && m.mode !== mode) return false;
    if (m.polIn && pol && !m.polIn.includes(pol)) return false;
    if (m.podIn && pod && !m.podIn.includes(pod)) return false;
    if (m.originRegions && originRegion && !m.originRegions.some(r => originRegion.includes(r))) return false;
    if (m.destinationRegions && destRegion && !m.destinationRegions.some(r => destRegion.includes(r))) return false;
    if (m.polIn && !pol) return false;
    if (m.podIn && !pod) return false;
    return true;
  });

  if (exact) return exact;

  const regional = LANE_PROFILES.find((p) => {
    const m = p.match;
    if (m.mode && m.mode !== mode) return false;
    if (m.originRegions && originRegion && !m.originRegions.some(r => originRegion.includes(r))) return false;
    if (m.destinationRegions && destRegion && !m.destinationRegions.some(r => destRegion.includes(r))) return false;
    return p.id !== "global_generic";
  });

  return regional ?? LANE_PROFILES.find((p) => p.id === "global_generic") ?? null;
}

export function normalizePortCode(port: string): string {
  return normalizePort(port);
}

export type LaneProfileOutput = {
  id: string;
  name: string;
  route_options: string[];
  port_notes: string[];
  cost_drivers: string[];
  execution_checks: string[];
  negotiation_advice: string[];
};

export function buildLaneProfileOutput(
  profile: LaneProfile,
  _strategy: LogisticsStrategy,
  _clientType: ClientType
): LaneProfileOutput {
  return {
    id: profile.id,
    name: profile.name,
    route_options: profile.route_options,
    port_notes: profile.port_notes,
    cost_drivers: profile.cost_drivers,
    execution_checks: profile.execution_checks,
    negotiation_advice: [],
  };
}
