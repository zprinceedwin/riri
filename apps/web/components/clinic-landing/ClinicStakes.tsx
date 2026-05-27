import { STAKES } from "./copy";

export function ClinicStakes() {
  return (
    <section
      id="stakes"
      className="relative bg-[#1a1410] py-28 text-[#faf5ee] lg:py-40"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <header className="lg:col-span-5">
            <span
              className="inline-flex items-center gap-2 text-[11px] font-[500] uppercase tracking-[0.24em] text-[#c8a572]"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              <span aria-hidden className="block h-px w-8 bg-[#c8a572]/70" />
              {STAKES.eyebrow}
            </span>

            <h2
              className="mt-6 max-w-[16ch] text-[clamp(2.2rem,4.5vw,4rem)] font-[400] leading-[1.05] tracking-[-0.02em]"
              style={{
                fontFamily: "var(--font-clinic-display)",
                fontVariationSettings: "'opsz' 144, 'SOFT' 30",
              }}
            >
              {STAKES.title}
            </h2>
          </header>

          <p
            className="max-w-[48ch] self-end text-[17px] leading-[1.6] text-[#faf5ee]/70 lg:col-span-6 lg:col-start-7"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            {STAKES.lede}
          </p>
        </div>

        <ol className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mt-28 lg:grid-cols-3 lg:gap-8">
          {STAKES.cards.map((card) => (
            <li
              key={card.number}
              className="group relative flex flex-col gap-8 rounded-2xl border border-[#faf5ee]/12 bg-[#faf5ee]/[0.03] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#c8a572]/40 hover:bg-[#faf5ee]/[0.05] lg:p-9"
            >
              <div className="flex items-baseline justify-between">
                <span
                  className="text-[11px] font-[500] uppercase tracking-[0.24em] text-[#c8a572]/80"
                  style={{ fontFamily: "var(--font-clinic-body)" }}
                >
                  {card.number}
                </span>
                <span
                  aria-hidden
                  className="text-[10px] font-[500] uppercase tracking-[0.22em] text-[#faf5ee]/35"
                  style={{ fontFamily: "var(--font-clinic-body)" }}
                >
                  Cost
                </span>
              </div>

              <h3
                className="text-[26px] leading-[1.15] tracking-[-0.015em] text-[#faf5ee] lg:text-[28px]"
                style={{
                  fontFamily: "var(--font-clinic-display)",
                  fontVariationSettings: "'opsz' 36, 'SOFT' 30",
                }}
              >
                {card.title}
              </h3>

              <p
                className="text-[14px] leading-[1.6] text-[#faf5ee]/65"
                style={{ fontFamily: "var(--font-clinic-body)" }}
              >
                {card.body}
              </p>

              <div className="mt-auto border-t border-[#faf5ee]/10 pt-5">
                <p
                  className="text-[34px] font-[400] leading-none tracking-[-0.02em] text-[#c8a572]"
                  style={{
                    fontFamily: "var(--font-clinic-display)",
                    fontVariationSettings: "'opsz' 96, 'SOFT' 70",
                  }}
                >
                  {card.stat}
                </p>
                <p
                  className="mt-2 text-[12px] uppercase tracking-[0.18em] text-[#faf5ee]/45"
                  style={{ fontFamily: "var(--font-clinic-body)" }}
                >
                  {card.statLabel}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
