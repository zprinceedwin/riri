import Link from "next/link";
import { FINAL_CTA } from "./copy";

export function ClinicCta() {
  return (
    <section className="relative overflow-hidden bg-[#1a1410] py-28 text-[#faf5ee] lg:py-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(ellipse_70%_45%_at_20%_30%,rgba(122,58,38,0.55),transparent_60%),radial-gradient(ellipse_60%_40%_at_80%_75%,rgba(200,165,114,0.35),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]"
      />

      <div className="relative mx-auto max-w-[920px] px-6 text-center lg:px-10">
        <span
          className="inline-flex items-center gap-2 text-[11px] font-[500] uppercase tracking-[0.28em] text-[#c8a572]"
          style={{ fontFamily: "var(--font-clinic-body)" }}
        >
          <span aria-hidden className="block h-px w-10 bg-[#c8a572]/70" />
          {FINAL_CTA.eyebrow}
          <span aria-hidden className="block h-px w-10 bg-[#c8a572]/70" />
        </span>

        <h2
          className="mt-8 text-[clamp(2.8rem,6vw,5.4rem)] font-[400] leading-[1] tracking-[-0.03em]"
          style={{
            fontFamily: "var(--font-clinic-display)",
            fontVariationSettings: "'opsz' 144, 'SOFT' 70",
          }}
        >
          {FINAL_CTA.title}
        </h2>

        <p
          className="mx-auto mt-8 max-w-[52ch] text-[17px] leading-[1.6] text-[#faf5ee]/70"
          style={{ fontFamily: "var(--font-clinic-body)" }}
        >
          {FINAL_CTA.lede}
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={FINAL_CTA.cta.href}
            className="group inline-flex items-center gap-3 rounded-full bg-[#faf5ee] px-8 py-4 text-[14px] font-[500] text-[#1a1410] transition-all duration-300 hover:gap-4 hover:bg-[#c8a572] focus-visible:ring-2 focus-visible:ring-[#c8a572]/50 focus-visible:ring-offset-4 focus-visible:ring-offset-[#1a1410]"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            {FINAL_CTA.cta.label}
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-full bg-[#1a1410] text-[#faf5ee] transition-transform duration-300 group-hover:rotate-45"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 11L11 5M11 5H6.5M11 5V9.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>

          <Link
            href={FINAL_CTA.secondary.href}
            className="group inline-flex items-center gap-2 text-[14px] font-[500] text-[#faf5ee]/70 transition-colors hover:text-[#c8a572]"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            {FINAL_CTA.secondary.label}
            <span
              aria-hidden
              className="block h-px w-8 bg-[#faf5ee]/40 transition-all duration-300 group-hover:w-12 group-hover:bg-[#c8a572]"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
