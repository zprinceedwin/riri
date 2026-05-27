import { SAMPLE } from "./copy";

export function ClinicSample() {
  return (
    <section
      id="sample"
      className="relative overflow-hidden bg-[#efd7c2]/40 py-28 lg:py-40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(ellipse_50%_30%_at_50%_0%,rgba(122,58,38,0.12),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-[920px] px-6 lg:px-10">
        <header className="text-center">
          <span
            className="inline-flex items-center gap-2 text-[11px] font-[500] uppercase tracking-[0.24em] text-[#7a3a26]"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            <span aria-hidden className="block h-px w-8 bg-[#7a3a26]/60" />
            {SAMPLE.eyebrow}
            <span aria-hidden className="block h-px w-8 bg-[#7a3a26]/60" />
          </span>
          <h2
            className="mt-6 text-[clamp(2.2rem,4.5vw,3.8rem)] font-[400] leading-[1.05] tracking-[-0.02em] text-[#1a1410]"
            style={{
              fontFamily: "var(--font-clinic-display)",
              fontVariationSettings: "'opsz' 144, 'SOFT' 60",
            }}
          >
            {SAMPLE.title}
          </h2>
          <p
            className="mx-auto mt-6 max-w-[52ch] text-[15px] leading-[1.6] text-[#1a1410]/70"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            {SAMPLE.lede}
          </p>
        </header>

        <div className="relative mx-auto mt-16 max-w-[680px] lg:mt-20">
          <ol className="relative space-y-4">
            <span
              aria-hidden
              className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-[#1a1410]/15 to-transparent"
            />
            {SAMPLE.turns.map((turn, idx) => (
              <SampleTurn
                key={idx}
                index={idx}
                speaker={turn.speaker}
                text={turn.text}
                isRiri={turn.speaker === "Riri"}
              />
            ))}
          </ol>

          <div
            className="mt-12 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[0.3em] text-[#1a1410]/45"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            <span aria-hidden className="block h-px w-12 bg-[#1a1410]/20" />
            End of sample · 00:47 elapsed
            <span aria-hidden className="block h-px w-12 bg-[#1a1410]/20" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SampleTurn({
  index,
  speaker,
  text,
  isRiri,
}: {
  index: number;
  speaker: string;
  text: string;
  isRiri: boolean;
}) {
  return (
    <li
      className="relative grid grid-cols-[40px,1fr] items-start gap-5 motion-safe:opacity-0 motion-safe:[animation:fade-up_500ms_ease-out_forwards] motion-reduce:opacity-100"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <span
        aria-hidden
        className={[
          "relative z-10 grid h-10 w-10 place-items-center rounded-full border text-[11px] font-[500] uppercase tracking-[0.18em]",
          isRiri
            ? "border-[#7a3a26] bg-[#7a3a26] text-[#faf5ee]"
            : "border-[#1a1410]/15 bg-[#faf5ee] text-[#1a1410]/65",
        ].join(" ")}
        style={{ fontFamily: "var(--font-clinic-body)" }}
      >
        {isRiri ? "R" : "C"}
      </span>

      <div
        className={[
          "rounded-2xl border px-5 py-4 shadow-[0_8px_30px_-20px_rgba(26,20,16,0.4)]",
          isRiri
            ? "border-[#7a3a26]/15 bg-[#faf5ee]"
            : "border-[#1a1410]/8 bg-[#faf5ee]/85 backdrop-blur-sm",
        ].join(" ")}
      >
        <span
          className="text-[10px] font-[500] uppercase tracking-[0.22em] text-[#1a1410]/45"
          style={{ fontFamily: "var(--font-clinic-body)" }}
        >
          {speaker}
        </span>
        <p
          className="mt-1.5 text-[15px] leading-[1.55] text-[#1a1410]"
          style={{ fontFamily: "var(--font-clinic-body)" }}
        >
          {text}
        </p>
      </div>
    </li>
  );
}
