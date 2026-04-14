import SEO from "../components/SEO";
import { contactContent } from "../mvcs/content";

export default function Contact() {
  const trust = contactContent.sections[0];

  return (
    <>
      <SEO
        title={contactContent.seo.title}
        description={contactContent.seo.description}
        canonical={contactContent.seo.canonical}
      />

      <div className="content-page marketing-content-page">
      <span className="mkt-kicker">{contactContent.kicker}</span>
      <h1>{contactContent.hero?.title}</h1>
      <p className="page-lead">{contactContent.hero?.paragraph}</p>

      <div className="contact-layout">
        <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
          <label>
            Full Name
            <input type="text" placeholder="Your name" data-testid="input-contact-name" />
          </label>
          <label>
            Email Address
            <input type="email" placeholder="you@company.com" data-testid="input-contact-email" />
          </label>
          <label>
            Company (optional)
            <input type="text" placeholder="Your company" data-testid="input-contact-company" />
          </label>
          <label>
            Message
            <textarea placeholder="Tell us about your logistics intelligence needs..." data-testid="input-contact-message" />
          </label>
          <button type="submit" className="btn-primary" data-testid="button-contact-submit">
            Send Message
          </button>
          <p className="contact-response-note" data-testid="text-response-time">We typically respond within one business day.</p>
        </form>

        <aside className="contact-trust-panel" data-testid="contact-trust-panel">
          <h2>{trust?.title}</h2>
          <ul className="sales-bullets">
            {(trust?.bullets ?? []).map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <div className="mkt-media-placeholder">
            {trust?.image ? (
              <img
                src={trust.image.src}
                alt={trust.image.alt}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
              />
            ) : null}
          </div>
        </aside>
      </div>

      <h2>Other Ways to Reach Us</h2>
      <p>
        Email: <a href="mailto:hello@meruexpress.com" className="text-link" data-testid="link-email">hello@meruexpress.com</a>
      </p>
      <p>
        For enterprise inquiries and custom trade intelligence packages,
        please include your company name and the trade corridors you operate in.
      </p>
      </div>
    </>
  );
}
