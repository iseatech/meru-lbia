import { Link } from "wouter";
import ServiceIntakeForm from "../components/ServiceIntakeForm";

const FIELDS = [
  { name: "product_description", label: "Product / Cargo Description", type: "textarea" as const, placeholder: "e.g., Consumer electronics, lithium-ion batteries, 500 units", required: true },
  { name: "country_of_origin", label: "Country of Origin", type: "text" as const, placeholder: "e.g., China, Vietnam, Germany", required: true },
  { name: "destination_country", label: "Destination Country", type: "text" as const, placeholder: "e.g., United States", required: true },
  { name: "hs_code", label: "HS Code (if known)", type: "text" as const, placeholder: "e.g., 8507.60", required: false },
  { name: "shipment_mode", label: "Shipment Mode", type: "select" as const, options: [
    { value: "ocean", label: "Ocean Freight" },
    { value: "air", label: "Air Freight" },
    { value: "ground", label: "Ground / Truck" },
    { value: "multimodal", label: "Multimodal" },
    { value: "unsure", label: "Not sure yet" },
  ], required: true },
  { name: "special_requirements", label: "Special Requirements or Notes", type: "textarea" as const, placeholder: "e.g., Temperature-controlled, hazardous materials, tight timeline", required: false },
];

export default function LogisticsDecisionBrief() {
  return (
    <div className="service-detail-page">
      <Link href="/services" className="back-link" data-testid="link-back-services">
        &larr; Back to Services
      </Link>
      <h1>Logistics Decision Brief</h1>
      <p className="service-detail-desc">
        Get a comprehensive logistics analysis covering routing options, cost estimates, 
        regulatory risks, and trade intelligence for your shipment. Our engine analyzes 
        trade.gov data and country-specific regulations to deliver actionable insights.
      </p>
      <ServiceIntakeForm
        serviceType="logistics-decision-brief"
        serviceLabel="Logistics Decision Brief"
        price="$149"
        fields={FIELDS}
      />
    </div>
  );
}
