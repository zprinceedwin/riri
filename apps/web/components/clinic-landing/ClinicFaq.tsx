"use client";

import { useState } from "react";
import { FAQ } from "./copy";

export function ClinicFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative bg-[#faf5ee] py-28 lg:py-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(ellipse_40%_30%_at_0%_50%,rgba(122,58,38,0.08),transparent_60%)]"
      />

      <div className="relative mx-auto max-w-[1080px] px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <header className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start">
            <span
              className="inline-flex items-center gap-2 text-[11px] font-[500] uppercase tracking-[0.24em] text-[#7a3a26]"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              <span aria-hidden className="block h-px w-8 bg-[#7a3a26]/60" />
              {FAQ.eyebrow}
            </span>
            <h2
              className="mt-6 text-[clamp(2.2rem,4.5vw,3.6rem)] font-[400] leading-[1.05] tracking-[-0.02em] text-[#1a1410]"
              style={{
                fontFamily: "var(--font-clinic-display)",
                fontVariationSettings: "'opsz' 144, 'SOFT' 50",
              }}
            >
              {FAQ.title}
            </h2>
          </header>

          <ul className="divide-y divide-[#1a1410]/10 border-t border-b border-[#1a1410]/10 lg:col-span-8">
            {FAQ.items.map((item, idx) => {
              const isOpen = open === idx;
              return (
                <li key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${idx}`}
                    className="group flex w-full items-start justify-between gap-6 py-7 text-left transition-colors duration-200 hover:text-[#7a3a26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a3a26]/30 focus-visible:ring-offset-4 focus-visible:ring-offset-[#faf5ee]"
                  >
                    <span
                      className="text-[20px] leading-[1.3] tracking-[-0.01em] text-[#1a1410] transition-colors duration-200 group-hover:text-[#7a3a26] lg:text-[22px]"
                      style={{
                        fontFamily: "var(--font-clinic-display)",
                        fontVariationSettings: "'opsz' 36, 'SOFT' 30",
                      }}
                    >
                      {item.q}
                    </span>

                    <span
                      aria-hidden
                      className={[
                        "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#1a1410]/15 text-[#1a1410] transition-all duration-300",
                        isOpen
                          ? "rotate-45 border-[#7a3a26] bg-[#7a3a26] text-[#faf5ee]"
                          : "group-hover:border-[#7a3a26] group-hover:text-[#7a3a26]",
                      ].join(" ")}
                    >
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M6 1.5v9M1.5 6h9" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>

                  <div
                    id={`faq-panel-${idx}`}
                    role="region"
                    aria-hidden={!isOpen}
                    className={[
                      "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    ].join(" ")}
                  >
                    <div className="min-h-0">
                      <p
                        className="pb-7 pr-12 text-[15px] leading-[1.65] text-[#1a1410]/72"
                        style={{ fontFamily: "var(--font-clinic-body)" }}
                      >
                        {item.a}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
