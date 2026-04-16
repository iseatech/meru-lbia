import SEO from "../components/SEO";
import { PublicPageShell, SectionTitle } from "../mvcs/sections/PublicSections";

export default function Contact() {
  return (
    <PublicPageShell>
      <SEO
        title="Contact - MERU Express"
        description="Converse con MERU para implementar AI-Core en customs compliance, clasificación HS y decision intelligence enterprise."
        canonical="/contact"
      />
      <SectionTitle
        eyebrow="Contact"
        title="Design your compliance and decision-intelligence operating model with MERU"
        description="Compártanos su volumen de operaciones, corredores prioritarios y retos de compliance para diseñar una implementación enterprise."
      />

      <form className="grid gap-4 rounded-[8px] border border-[#E2E8F0] bg-white p-5 shadow-sm" onSubmit={(e) => e.preventDefault()}>
        <label className="grid gap-2 text-sm font-medium text-[#334155]">
          Full Name
          <input type="text" placeholder="Your name" className="rounded-[8px] border border-[#E2E8F0] px-3 py-2" data-testid="input-contact-name" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#334155]">
          Email Address
          <input type="email" placeholder="you@company.com" className="rounded-[8px] border border-[#E2E8F0] px-3 py-2" data-testid="input-contact-email" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#334155]">
          Company (optional)
          <input type="text" placeholder="Your company" className="rounded-[8px] border border-[#E2E8F0] px-3 py-2" data-testid="input-contact-company" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#334155]">
          Message
          <textarea placeholder="Tell us about your logistics intelligence needs..." className="min-h-32 rounded-[8px] border border-[#E2E8F0] px-3 py-2" data-testid="input-contact-message" />
        </label>
        <button type="submit" className="rounded-[8px] bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white" data-testid="button-contact-submit">Send Message</button>
        <p className="text-sm text-[#64748B]" data-testid="text-response-time">We typically respond within one business day.</p>
      </form>
    </PublicPageShell>
  );
}
