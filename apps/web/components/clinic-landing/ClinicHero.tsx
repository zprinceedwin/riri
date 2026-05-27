import Link from "next/link";
import { HERO } from "./copy";

export function ClinicHero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-[#faf5ee] pt-32 pb-24 lg:pt-44 lg:pb-32"
    >
      <GrainOverlay />
      <BackdropMesh />

      <div className="relative mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-10">
        <div className="lg:col-span-7">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-[500] uppercase tracking-[0.24em] text-[#7a3a26]"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            <span aria-hidden className="block h-px w-8 bg-[#7a3a26]/60" />
            {HERO.eyebrow}
          </span>

          <h1
            className="mt-8 max-w-[14ch] text-[clamp(2.6rem,6vw,5.5rem)] font-[400] leading-[1.02] tracking-[-0.025em] text-[#1a1410]"
            style={{ fontFamily: "var(--font-clinic-display)", fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}
          >
            {HERO.headlinePre}{" "}
            <em
              className="not-italic relative inline-block text-[#7a3a26]"
              style={{
                fontFamily: "var(--font-clinic-display)",
                fontStyle: "italic",
                fontVariationSettings: "'opsz' 144, 'SOFT' 100",
              }}
            >
              {HERO.headlineEm}
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-[0.18em] w-full origin-left scale-x-0 bg-[#c8a572] [animation:hero-underline_700ms_ease-out_900ms_forwards] motion-reduce:scale-x-100 motion-reduce:[animation:none]"
              />
            </em>{" "}
            {HERO.headlinePost}
          </h1>

          <p
            className="mt-8 max-w-[52ch] text-[17px] leading-[1.55] text-[#1a1410]/72"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            {HERO.sub}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href={HERO.primaryCta.href}
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[#1a1410] px-7 py-4 text-[14px] font-[500] text-[#faf5ee] transition-all duration-300 hover:gap-4 hover:bg-[#7a3a26] focus-visible:ring-2 focus-visible:ring-[#7a3a26]/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#faf5ee]"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              <span className="relative z-10">{HERO.primaryCta.label}</span>
              <span
                aria-hidden
                className="relative z-10 grid h-6 w-6 place-items-center rounded-full bg-[#faf5ee] text-[#1a1410] transition-transform duration-300 group-hover:rotate-45"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 11L11 5M11 5H6.5M11 5V9.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>

            <a
              href={HERO.secondaryCta.href}
              className="group inline-flex items-center gap-2 text-[14px] font-[500] text-[#1a1410] transition-colors hover:text-[#7a3a26]"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              {HERO.secondaryCta.label}
              <span
                aria-hidden
                className="block h-px w-8 bg-[#1a1410] transition-all duration-300 group-hover:w-12 group-hover:bg-[#7a3a26]"
              />
            </a>
          </div>

          <p
            className="mt-12 max-w-[42ch] text-[11px] uppercase tracking-[0.22em] text-[#1a1410]/45"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            {HERO.trustNote}
          </p>
        </div>

        <aside className="relative lg:col-span-5">
          <HeroPortrait />
        </aside>
      </div>

      <ScrollHint />
    </section>
  );
}

function HeroPortrait() {
  return (
    <div className="relative mx-auto h-full max-w-[420px] lg:max-w-none">
      <div
        aria-hidden
        className="absolute inset-0 -translate-x-3 translate-y-6 rounded-[28px] border border-[#1a1410]/10 bg-[#efd7c2]/40"
      />

      <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] border border-[#1a1410]/10 bg-gradient-to-br from-[#efd7c2] via-[#f7e6d4] to-[#fbf2e6] shadow-[0_30px_80px_-40px_rgba(122,58,38,0.45)]">
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_30%_20%,rgba(122,58,38,0.15),transparent_55%),radial-gradient(circle_at_80%_85%,rgba(200,165,114,0.32),transparent_55%)]" />
        <div className="absolute inset-0 [background-image:repeating-linear-gradient(180deg,transparent_0,transparent_120px,rgba(26,20,16,0.05)_120px,rgba(26,20,16,0.05)_121px)]" />

        <div className="relative flex h-full flex-col justify-between p-8 lg:p-10">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-[500] uppercase tracking-[0.28em] text-[#1a1410]/55"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              Now answering
            </span>
            <PulseDot />
          </div>

          <div>
            <p
              className="text-[10px] font-[500] uppercase tracking-[0.24em] text-[#7a3a26]"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              Riri · Front desk
            </p>
            <p
              className="mt-3 text-[34px] leading-[1.05] tracking-[-0.02em] text-[#1a1410]"
              style={{
                fontFamily: "var(--font-clinic-display)",
                fontVariationSettings: "'opsz' 96, 'SOFT' 80",
              }}
            >
              "Dr. Reyes is open at 2 PM or 4:30 PM tomorrow. Which one works better?"
            </p>
            <div className="mt-6 flex items-center gap-3 text-[12px] text-[#1a1410]/55" style={{ fontFamily: "var(--font-clinic-body)" }}>
              <span>00:47</span>
              <span aria-hidden className="block h-px flex-1 bg-[#1a1410]/15" />
              <span>Caller · Maria, BGC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PulseDot() {
  return (
    <span aria-hidden className="relative grid h-3 w-3 place-items-center">
      <span className="absolute h-3 w-3 rounded-full bg-[#7a3a26]/30 motion-safe:animate-ping" />
      <span className="relative block h-2 w-2 rounded-full bg-[#7a3a26]" />
    </span>
  );
}

function ScrollHint() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 mx-auto flex w-fit items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-[#1a1410]/40">
      <span aria-hidden className="block h-px w-12 bg-[#1a1410]/25" />
      Scroll
      <span aria-hidden className="block h-px w-12 bg-[#1a1410]/25" />
    </div>
  );
}

function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[1] opacity-[0.35] mix-blend-multiply [background-image:url('data:image/svg+xml;utf8,<svg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/><feColorMatrix values=%220 0 0 0 0.10 0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0.5 0%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]"
    />
  );
}

function BackdropMesh() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[2] [background-image:radial-gradient(ellipse_70%_45%_at_15%_15%,rgba(239,215,194,0.55),transparent_60%),radial-gradient(ellipse_50%_35%_at_85%_70%,rgba(200,165,114,0.32),transparent_60%)]"
    />
  );
}
