import { PROOF } from "./copy";

export function ClinicProof() {
  return (
    <section className="relative bg-[#faf5ee] py-28 lg:py-40">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <header className="lg:col-span-5">
            <span
              className="inline-flex items-center gap-2 text-[11px] font-[500] uppercase tracking-[0.24em] text-[#54614b]"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              <span aria-hidden className="block h-px w-8 bg-[#54614b]/60" />
              {PROOF.eyebrow}
            </span>
            <h2
              className="mt-6 max-w-[18ch] text-[clamp(2rem,4vw,3.4rem)] font-[400] leading-[1.08] tracking-[-0.02em] text-[#1a1410]"
              style={{
                fontFamily: "var(--font-clinic-display)",
                fontVariationSettings: "'opsz' 96, 'SOFT' 40",
              }}
            >
              {PROOF.title}
            </h2>
            <p
              className="mt-6 max-w-[50ch] text-[15px] leading-[1.6] text-[#1a1410]/70"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              {PROOF.lede}
            </p>
          </header>

          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#1a1410]/10 bg-[#1a1410]/10 sm:grid-cols-2 lg:col-span-7">
            {PROOF.pillars.map((pillar) => (
              <li key={pillar.label} className="flex flex-col gap-4 bg-[#faf5ee] p-7 transition-colors duration-300 hover:bg-[#efd7c2]/35 lg:p-9">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="block h-px w-6 bg-[#7a3a26]" />
                  <span
                    className="text-[11px] font-[500] uppercase tracking-[0.22em] text-[#1a1410]/55"
                    style={{ fontFamily: "var(--font-clinic-body)" }}
                  >
                    Stack
                  </span>
                </div>
                <h3
                  className="text-[22px] leading-[1.2] tracking-[-0.015em] text-[#1a1410]"
                  style={{
                    fontFamily: "var(--font-clinic-display)",
                    fontVariationSettings: "'opsz' 36, 'SOFT' 30",
                  }}
                >
                  {pillar.label}
                </h3>
                <p
                  className="text-[14px] leading-[1.6] text-[#1a1410]/65"
                  style={{ fontFamily: "var(--font-clinic-body)" }}
                >
                  {pillar.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
