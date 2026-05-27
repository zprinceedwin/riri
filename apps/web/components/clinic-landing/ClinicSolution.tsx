import { SOLUTION } from "./copy";

export function ClinicSolution() {
  return (
    <section
      id="solution"
      className="relative overflow-hidden bg-[#faf5ee] py-28 lg:py-40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(ellipse_60%_40%_at_90%_20%,rgba(122,58,38,0.08),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <header className="max-w-[44ch]">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-[500] uppercase tracking-[0.24em] text-[#7a3a26]"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            <span aria-hidden className="block h-px w-8 bg-[#7a3a26]/60" />
            {SOLUTION.eyebrow}
          </span>
          <h2
            className="mt-6 text-[clamp(2.2rem,4.5vw,4rem)] font-[400] leading-[1.05] tracking-[-0.02em] text-[#1a1410]"
            style={{
              fontFamily: "var(--font-clinic-display)",
              fontVariationSettings: "'opsz' 144, 'SOFT' 40",
            }}
          >
            {SOLUTION.title}
          </h2>
          <p
            className="mt-6 text-[17px] leading-[1.6] text-[#1a1410]/72"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            {SOLUTION.lede}
          </p>
        </header>

        <div className="mt-20 grid grid-cols-1 gap-16 lg:mt-28 lg:grid-cols-12 lg:gap-20">
          <ol className="lg:col-span-7">
            {SOLUTION.features.map((feature, idx) => (
              <li
                key={feature.number}
                className={[
                  "group relative grid grid-cols-[auto,1fr] items-baseline gap-x-6 gap-y-3 py-8 transition-colors duration-300 hover:bg-[#1a1410]/[0.02]",
                  idx === 0 ? "border-t border-[#1a1410]/10" : "",
                  "border-b border-[#1a1410]/10",
                ].join(" ")}
              >
                <span
                  className="text-[11px] font-[500] uppercase tracking-[0.24em] text-[#1a1410]/40 transition-colors duration-300 group-hover:text-[#7a3a26]"
                  style={{ fontFamily: "var(--font-clinic-body)" }}
                >
                  {feature.number}
                </span>
                <h3
                  className="text-[26px] leading-[1.15] tracking-[-0.015em] text-[#1a1410] transition-colors duration-300 group-hover:text-[#7a3a26] lg:text-[30px]"
                  style={{
                    fontFamily: "var(--font-clinic-display)",
                    fontVariationSettings: "'opsz' 96, 'SOFT' 40",
                  }}
                >
                  {feature.title}
                </h3>
                <span aria-hidden className="col-start-1" />
                <p
                  className="text-[15px] leading-[1.6] text-[#1a1410]/68"
                  style={{ fontFamily: "var(--font-clinic-body)" }}
                >
                  {feature.body}
                </p>
              </li>
            ))}
          </ol>

          <aside className="relative lg:col-span-5">
            <SolutionVisual />
          </aside>
        </div>
      </div>
    </section>
  );
}

function SolutionVisual() {
  return (
    <div className="sticky top-32 mx-auto max-w-[360px] lg:max-w-none">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-[#1a1410]/10 bg-gradient-to-b from-[#1a1410] via-[#2a1f17] to-[#1a1410] p-7 text-[#faf5ee] shadow-[0_30px_80px_-40px_rgba(26,20,16,0.55)]">
        <div
          aria-hidden
          className="absolute inset-0 [background-image:radial-gradient(circle_at_30%_20%,rgba(200,165,114,0.18),transparent_55%),radial-gradient(circle_at_75%_85%,rgba(122,58,38,0.32),transparent_60%)]"
        />

        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-[500] uppercase tracking-[0.28em] text-[#c8a572]"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              Voice channel
            </span>
            <span
              className="text-[10px] font-[500] uppercase tracking-[0.24em] text-[#faf5ee]/45"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              live
            </span>
          </div>

          <div className="mt-auto space-y-5">
            <BubbleRow speaker="Caller" align="start" text="Do you have packages for laser hair removal?" />
            <BubbleRow
              speaker="Riri"
              align="end"
              text="Yes — 6 sessions for ₱18,000, underarm and Brazilian. Want me to hold a slot with Dr. Reyes?"
            />
            <BubbleRow speaker="Caller" align="start" text="Yes please, Friday afternoon." />

            <div className="relative flex items-center gap-2 pt-3">
              <span aria-hidden className="block h-px flex-1 bg-[#faf5ee]/15" />
              <Waveform />
              <span aria-hidden className="block h-px flex-1 bg-[#faf5ee]/15" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BubbleRow({
  speaker,
  align,
  text,
}: {
  speaker: string;
  align: "start" | "end";
  text: string;
}) {
  return (
    <div className={`flex flex-col ${align === "end" ? "items-end" : "items-start"}`}>
      <span
        className="mb-2 text-[10px] font-[500] uppercase tracking-[0.22em] text-[#faf5ee]/45"
        style={{ fontFamily: "var(--font-clinic-body)" }}
      >
        {speaker}
      </span>
      <p
        className={[
          "max-w-[88%] rounded-2xl px-4 py-3 text-[13px] leading-[1.45]",
          align === "end"
            ? "bg-[#c8a572] text-[#1a1410]"
            : "bg-[#faf5ee]/8 text-[#faf5ee]/85 backdrop-blur-sm",
        ].join(" ")}
        style={{ fontFamily: "var(--font-clinic-body)" }}
      >
        {text}
      </p>
    </div>
  );
}

function Waveform() {
  const bars = [3, 7, 12, 18, 22, 18, 12, 7, 3, 7, 12, 18, 22, 18, 12, 7, 3];
  return (
    <div aria-hidden className="flex items-center gap-1">
      {bars.map((h, i) => (
        <span
          key={i}
          className="block w-[2px] rounded-full bg-[#c8a572] motion-safe:[animation:wave_1.2s_ease-in-out_infinite]"
          style={{
            height: `${h}px`,
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
    </div>
  );
}
