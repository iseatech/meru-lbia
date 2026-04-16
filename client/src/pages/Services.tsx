import SEO from "../components/SEO";
import { solutionCards } from "../mvcs/content/publicContent";
import {
  FinalCTA,
  PublicPageShell,
  SectionTitle,
  ValueCards,
} from "../mvcs/sections/PublicSections";

export default function Services() {
  return (
    <>
      <SEO
        title="Servicios Enterprise - MERU Express"
        description="Customs compliance, HS classification, duty rate analysis, trade documents y decision intelligence con AI CORE y auditoría."
        canonical="/services"
      />
      <PublicPageShell>
        <SectionTitle
          eyebrow="Services"
          title="Asegure el cumplimiento de sus operaciones y elimine multas aduaneras con nuestro AI-Core"
          description="Plataforma enterprise para importadores, freight forwarders, 3PL y equipos de compliance que operan comercio internacional de alto volumen."
        />
        <ValueCards items={solutionCards} />
        <FinalCTA />
      </PublicPageShell>
    </>
  );
}
