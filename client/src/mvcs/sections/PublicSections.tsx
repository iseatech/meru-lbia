import { Link } from "wouter";
import { enterpriseTokens } from "../design/tokens";

type HeroProps = {
  title: string;
  subtitle: string;
  primaryCta: { label: string; href: string; testId: string };
  secondaryCta?: { label: string; href: string; testId: string };
};

export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#FFFFFF] text-[#334155]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">{children}</div>
    </div>
  );
}

export function EnterpriseHero({ title, subtitle, primaryCta, secondaryCta }: HeroProps) {
  return (
    <section className="grid gap-8 rounded-[8px] border border-[#E2E8F0] bg-gradient-to-br from-[#F8FAFC] to-white p-6 shadow-sm md:grid-cols-5 md:p-10">
      <div className="md:col-span-3">
        <p className="mb-4 inline-flex rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
          Decision intelligence for customs, trade, and logistics execution
        </p>
        <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] text-[#0F172A] md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#334155] md:text-lg">{subtitle}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={primaryCta.href}><span className="inline-flex cursor-pointer rounded-[8px] bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white hover:opacity-95" data-testid={primaryCta.testId}>{primaryCta.label}</span></Link>
          {secondaryCta ? <Link href={secondaryCta.href}><span className="inline-flex cursor-pointer rounded-[8px] border border-[#E2E8F0] bg-white px-5 py-3 text-sm font-semibold text-[#0F172A]" data-testid={secondaryCta.testId}>{secondaryCta.label}</span></Link> : null}
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[8px] border border-[#E2E8F0] bg-[#0F172A] p-4 text-white md:col-span-2">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.35),_transparent_55%)]" />
        <div className="relative grid gap-3">
          <div className="rounded-[8px] border border-white/20 bg-white/10 p-3 text-xs">AI CORE · Controls</div>
          <div className="rounded-[8px] border border-white/20 bg-white/10 p-3 text-xs">Learning Ledger · Audit Trail</div>
          <div className="rounded-[8px] border border-white/20 bg-white/10 p-3 text-xs">Decision Briefs · Operational Output</div>
          <div className="h-24 rounded-[8px] border border-dashed border-white/30 bg-[linear-gradient(120deg,rgba(37,99,235,0.35),rgba(15,23,42,0.8))]" />
        </div>
      </div>
    </section>
  );
}

export function TrustBar({ items }: { items: string[] }) {
  return (
    <section className="mt-8 rounded-[8px] border border-[#E2E8F0] bg-[#F1F5F9] px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
        {items.map((item) => (
          <div key={item} className="rounded-[8px] border border-[#E2E8F0] bg-white/70 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">{item}</div>
        ))}
      </div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-6 mt-12">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.02em] text-[#0F172A] md:text-3xl">{title}</h2>
      {description ? <p className="mt-3 max-w-3xl text-base leading-7 text-[#334155]">{description}</p> : null}
    </div>
  );
}

export function ValueCards({ items }: { items: { title: string; description: string }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.title} className="rounded-[8px] border border-[#E2E8F0] bg-white p-5 shadow-sm" style={{ boxShadow: enterpriseTokens.shadow }}>
          <div className="mb-4 h-10 w-10 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC]" />
          <h3 className="text-lg font-bold tracking-[-0.02em] text-[#0F172A]">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#334155]">{item.description}</p>
          <Link href="/services"><span className="mt-4 inline-flex cursor-pointer text-sm font-semibold text-[#2563EB]">Explorar solución →</span></Link>
        </article>
      ))}
    </div>
  );
}

export function DarkNearshoringBlock() {
  return (
    <section className="mt-12 rounded-[8px] bg-[#0F172A] p-6 text-white md:p-10">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-200">Nearshoring Intelligence</p>
          <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.02em]">México–USA corridor readiness with T-MEC automation</h3>
          <p className="mt-4 text-sm leading-7 text-slate-200">Automatice reglas de origen, validaciones de compliance y análisis de impacto arancelario para acelerar operaciones cross-border sin perder control.</p>
        </div>
        <div className="rounded-[8px] border border-white/20 bg-white/5 p-5">
          <div className="h-40 rounded-[8px] bg-[linear-gradient(120deg,rgba(37,99,235,0.45),rgba(30,41,59,0.55))]" />
        </div>
      </div>
    </section>
  );
}

export function AICoreGovernanceBlock() {
  return (
    <section className="mt-12 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-6 md:p-10">
      <h3 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0F172A]">From classification to compliance, MERU gives your team a controlled, auditable, AI-assisted operating layer.</h3>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {["AI CORE", "Learning Ledger", "Auditoría", "Decision Briefs"].map((layer) => (
          <div key={layer} className="rounded-[8px] border border-[#E2E8F0] bg-white p-4 text-sm font-semibold text-[#0F172A]">{layer}</div>
        ))}
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="mt-12 rounded-[8px] border border-[#E2E8F0] bg-white p-6 text-center md:p-10">
      <h3 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0F172A]">Bring control, compliance, and decision intelligence into one operating layer.</h3>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/services"><span className="inline-flex cursor-pointer rounded-[8px] bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white">Explorar soluciones</span></Link>
        <Link href="/contact"><span className="inline-flex cursor-pointer rounded-[8px] border border-[#E2E8F0] px-5 py-3 text-sm font-semibold text-[#0F172A]">Hablar con MERU</span></Link>
      </div>
    </section>
  );
}
