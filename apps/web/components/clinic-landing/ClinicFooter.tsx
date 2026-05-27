import Link from "next/link";
import { FOOTER } from "./copy";

export function ClinicFooter() {
  return (
    <footer className="bg-[#faf5ee] py-20 text-[#1a1410]">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-12 border-b border-[#1a1410]/10 pb-16 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <span
                aria-hidden
                className="grid h-9 w-9 place-items-center rounded-full bg-[#1a1410] text-[#faf5ee]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M12 2a10 10 0 1 0 10 10h-4a6 6 0 1 1-6-6V2z" />
                </svg>
              </span>
              <span
                className="text-[16px] font-[500] tracking-tight"
                style={{ fontFamily: "var(--font-clinic-display)" }}
              >
                Riri{" "}
                <span className="text-[#7a3a26]/70 text-[10px] uppercase tracking-[0.22em]">
                  for clinics
                </span>
              </span>
            </Link>

            <p
              className="mt-6 max-w-[42ch] text-[15px] leading-[1.6] text-[#1a1410]/65"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              {FOOTER.tagline}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 lg:col-span-7">
            {FOOTER.columns.map((col) => (
              <div key={col.heading}>
                <h3
                  className="text-[10px] font-[500] uppercase tracking-[0.24em] text-[#1a1410]/45"
                  style={{ fontFamily: "var(--font-clinic-body)" }}
                >
                  {col.heading}
                </h3>
                <ul className="mt-5 space-y-3">
                  {col.links.map((link) => {
                    const isExt = "external" in link && link.external;
                    return (
                      <li key={link.label}>
                        {isExt ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-2 text-[14px] text-[#1a1410]/85 transition-colors hover:text-[#7a3a26]"
                            style={{ fontFamily: "var(--font-clinic-body)" }}
                          >
                            {link.label}
                            <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-[#1a1410]/40" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                              <path d="M5 11L11 5M11 5H6.5M11 5V9.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="text-[14px] text-[#1a1410]/85 transition-colors hover:text-[#7a3a26]"
                            style={{ fontFamily: "var(--font-clinic-body)" }}
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-10 flex flex-col items-start justify-between gap-4 text-[11px] uppercase tracking-[0.2em] text-[#1a1410]/40 sm:flex-row sm:items-center"
          style={{ fontFamily: "var(--font-clinic-body)" }}
        >
          <span>{FOOTER.signoff}</span>
          <span>© {new Date().getFullYear()} Riri</span>
        </div>
      </div>
    </footer>
  );
}
