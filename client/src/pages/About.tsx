import SEO from "../components/SEO";
import { aboutContent } from "../mvcs/content";
import { FeatureGridSection, SectionWrapper } from "../mvcs/sections";

export default function About() {
  const mission = aboutContent.sections[0];
  const builtFor = aboutContent.sections[1];

  return (
    <>
      <SEO
        title={aboutContent.seo.title}
        description={aboutContent.seo.description}
        canonical={aboutContent.seo.canonical}
      />

      <div className="content-page marketing-content-page">
      <span className="mkt-kicker">{aboutContent.kicker}</span>
      {aboutContent.hero ? (
        <>
          <h1>{aboutContent.hero.title}</h1>
          <p className="page-lead">{aboutContent.hero.paragraph}</p>
          <div className="mkt-media-placeholder" data-testid={aboutContent.hero.image?.testId}>
            {aboutContent.hero.image ? (
              <img
                src={aboutContent.hero.image.src}
                alt={aboutContent.hero.image.alt}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
              />
            ) : null}
          </div>
        </>
      ) : null}

      {mission ? <SectionWrapper className="" innerClassName="" title={mission.title} paragraph={mission.paragraph} /> : null}

      <SectionWrapper className="" innerClassName="" title="What We Do" paragraph="Our platform produces decision briefs that cover trade barriers, regulatory flags, sector-specific insights, and geopolitical risk assessments.">
        <FeatureGridSection
          className="mkt-grid-3"
          cardClassName="mkt-card"
          items={[
            { title: "Logistics Decision Briefs", paragraph: "Country-specific intelligence for routing and sourcing decisions.", iconText: "01" },
            { title: "Customs Compliance", paragraph: "HS code classification and duty-rate analysis at operational scale.", iconText: "02" },
            { title: "Integrity Verification", paragraph: "Barcode and QR-backed, SHA-256 verified documents.", iconText: "03" },
          ]}
        />
      </SectionWrapper>

      <div className="mkt-trust-strip about-trust-strip" data-testid="about-trust-strip">
        <div className="mkt-trust-block">
          <strong>24h</strong>
          <p>Typical decision brief turnaround</p>
        </div>
        <div className="mkt-trust-block">
          <strong>SHA-256</strong>
          <p>Integrity verification on every report</p>
        </div>
        <div className="mkt-trust-block">
          <strong>190+</strong>
          <p>Country intelligence coverage</p>
        </div>
        <div className="mkt-trust-block">
          <strong>Enterprise</strong>
          <p>Built for auditable team decisions</p>
        </div>
      </div>

      {builtFor ? <SectionWrapper className="" innerClassName="" title={builtFor.title} paragraph={builtFor.paragraph} /> : null}
      </div>
    </>
  );
}
