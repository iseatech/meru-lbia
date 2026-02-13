import SEO from "../components/SEO";

export default function Contact() {
  return (
    <div className="content-page">
      <SEO
        title="Contact - Meru Express"
        description="Get in touch with Meru Express for logistics intelligence inquiries, partnership opportunities, or support."
        canonical="/contact"
      />
      <h1>Contact Us</h1>
      <p className="page-lead">
        Have questions about our services? Need a custom logistics intelligence
        solution? We would love to hear from you.
      </p>

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

      <h2>Other Ways to Reach Us</h2>
      <p>
        Email: <a href="mailto:hello@meruexpress.com" className="text-link" data-testid="link-email">hello@meruexpress.com</a>
      </p>
      <p>
        For enterprise inquiries and custom trade intelligence packages,
        please include your company name and the trade corridors you operate in.
      </p>
    </div>
  );
}
