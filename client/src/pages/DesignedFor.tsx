import SEO from "../components/SEO";
import { designedForProfiles } from "../mvcs/content/publicContent";
import { FinalCTA, PublicPageShell, SectionTitle } from "../mvcs/sections/PublicSections";

export default function DesignedFor() {
  return (
    <PublicPageShell>
      <SEO
        title="Designed For - MERU Express"
        description="Soluciones para importadores, freight forwarders, 3PL y operadores cross-border México-Estados Unidos."
        canonical="/designed-for"
      />
      <SectionTitle
        eyebrow="Designed For"
        title="Built for enterprise operators managing cross-border execution"
        description="MERU se adapta a equipos con distintos roles operativos, manteniendo una sola capa de control y trazabilidad sobre la operación."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {designedForProfiles.map((profile) => (
          <article key={profile.title} className="rounded-[8px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0F172A]">{profile.title}</h3>
            <p className="mt-2 text-sm leading-7 text-[#334155]">{profile.description}</p>
          </article>
        ))}
      </div>
      <FinalCTA />
    </PublicPageShell>
  );
}
