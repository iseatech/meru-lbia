import SEO from "../components/SEO";
import { AICoreGovernanceBlock, PublicPageShell, SectionTitle } from "../mvcs/sections/PublicSections";

export default function About() {
  return (
    <PublicPageShell>
      <SEO
        title="About - MERU Express"
        description="MERU transforma operaciones de comercio exterior en una capa auditable de inteligencia logística y compliance."
        canonical="/about"
      />
      <SectionTitle
        eyebrow="About MERU"
        title="Enterprise operating layer for customs, trade, and logistics"
        description="MERU fue diseñado para convertir decisiones críticas de comercio exterior en procesos trazables, gobernables y ejecutables con AI CORE."
      />
      <div className="grid gap-4 rounded-[8px] border border-[#E2E8F0] bg-white p-6 text-sm leading-7 text-[#334155] shadow-sm">
        <p>Unificamos clasificación arancelaria, análisis de aranceles, preparación documental y decision briefs en una experiencia premium para equipos enterprise.</p>
        <p>Learning Ledger y auditoría nativa registran evidencia, contexto y decisiones para cumplimiento interno, preparación de auditorías y continuidad operativa.</p>
      </div>
      <AICoreGovernanceBlock />
    </PublicPageShell>
  );
}
