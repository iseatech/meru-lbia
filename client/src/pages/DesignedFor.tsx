import { Link } from "wouter";
import SEO from "../components/SEO";
import { designedForContent } from "../mvcs/content";
import { FeatureGridSection } from "../mvcs/sections";

export default function DesignedFor() {
  const audience = designedForContent.sections[0];
  const cta = designedForContent.sections[1];

  return (
    <>
      <SEO
        title={designedForContent.seo.title}
        description={designedForContent.seo.description}
        canonical={designedForContent.seo.canonical}
      />

      <div className="content-page designed-for-page marketing-content-page">
      <span className="mkt-kicker">{designedForContent.kicker}</span>
      <h1>{designedForContent.hero?.title}</h1>
      <p className="page-lead">{designedForContent.hero?.paragraph}</p>

      <div className="mkt-media-placeholder" data-testid={designedForContent.hero?.image?.testId}>
        {designedForContent.hero?.image ? (
          <img
            src={designedForContent.hero.image.src}
            alt={designedForContent.hero.image.alt}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
          />
        ) : null}
      </div>

      <FeatureGridSection items={audience?.features ?? []} className="audience-grid" cardClassName="audience-card" />

      <div className="designed-for-cta">
        <p>Not sure which service fits your team?</p>
        {cta?.ctas?.[0] ? (
          <Link href={cta.ctas[0].href}>
            <span className="btn-primary" data-testid={cta.ctas[0].testId}>{cta.ctas[0].label}</span>
          </Link>
        ) : null}
      </div>
      </div>
    </>
  );
}
