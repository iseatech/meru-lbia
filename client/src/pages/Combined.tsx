import { Link } from "wouter";
import ServiceIntakeForm from "../components/ServiceIntakeForm";

const FIELDS = [
  { name: "product_description", label: "Product / Cargo Description", type: "textarea" as const, placeholder: "e.g., Consumer electronics, lithium-ion batteries, 500 units", required: true },
  { name: "country_of_origin", label: "Country of Origin", type: "text" as const, placeholder: "e.g., China, Vietnam, Germany", required: true },
  { name: "destination_country", label: "Destination Country", type: "text" as const, placeholder: "e.g., United States", required: true },
  { name: "hs_codes", label: "HS Codes (comma-separated)", type: "textarea" as const, placeholder: "e.g., 8507.60, 8471.30", required: true },
  { name: "shipment_mode", label: "Shipment Mode", type: "select" as const, options: [
    { value: "ocean", label: "Ocean Freight" },
    { value: "air", label: "Air Freight" },
    { value: "ground", label: "Ground / Truck" },
    { value: "multimodal", label: "Multimodal" },
    { value: "unsure", label: "Not sure yet" },
  ], required: true },
  { name: "special_requirements", label: "Special Requirements or Notes", type: "textarea" as const, placeholder: "e.g., Hazmat, temperature-controlled, FTZ consideration", required: false },
];

export default function Combined() {
  return (
    <div className="service-detail-page">
      <Link href="/services" className="back-link" data-testid="link-back-services">
        &larr; Back to Services
      </Link>
      <h1>Combined: Logistics + Customs Compliance</h1>
      <p className="service-detail-desc">
        Our most comprehensive analysis combining logistics routing with full customs compliance.
        Get a single decision brief covering shipping strategy, duty optimization, regulatory risks,
        and trade intelligence &mdash; all in one report.
      </p>
      <ServiceIntakeForm
        serviceType="combined"
        serviceLabel="Combined: Logistics + Customs Compliance"
        price="$299"
        fields={FIELDS}
      />
    </div>
  );
}
