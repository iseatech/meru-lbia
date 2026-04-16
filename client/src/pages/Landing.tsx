import { useEffect } from "react";
import SEO from "../components/SEO";
import { trustIndustries, solutionCards } from "../mvcs/content/publicContent";
import {
  AICoreGovernanceBlock,
  DarkNearshoringBlock,
  EnterpriseHero,
  FinalCTA,
  PublicPageShell,
  SectionTitle,
  TrustBar,
  ValueCards,
} from "../mvcs/sections/PublicSections";

export default function Landing() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Meru Express",
      url: "https://meruexpress.com",
      description: "Decision intelligence for customs, trade, and logistics execution.",
    });
    script.id = "org-jsonld";
    if (!document.getElementById("org-jsonld")) document.head.appendChild(script);
    return () => document.getElementById("org-jsonld")?.remove();
  }, []);

  return (
    <>
      <SEO
        title="MERU Express - Inteligencia Logística y Compliance"
        description="Asegure el cumplimiento de sus operaciones, acelere decisiones de comercio internacional y reduzca fricción operativa con MERU AI-Core."
        canonical="/"
      />
      <PublicPageShell>
        <EnterpriseHero
          title="Inteligencia Logística y Compliance sin Fronteras"
          subtitle="Asegure el cumplimiento de sus operaciones, acelere decisiones de comercio internacional y reduzca fricción operativa con MERU AI-Core."
          primaryCta={{ label: "Explorar soluciones", href: "/services", testId: "link-explore-services" }}
          secondaryCta={{ label: "Ver Decision Briefs", href: "/sample", testId: "link-view-sample" }}
        />
        <TrustBar items={trustIndustries} />
        <SectionTitle eyebrow="Soluciones" title="Enterprise capabilities for customs, compliance, and execution" />
        <ValueCards items={solutionCards} />
        <DarkNearshoringBlock />
        <AICoreGovernanceBlock />
        <FinalCTA />
      </PublicPageShell>
    </>
  );
}
