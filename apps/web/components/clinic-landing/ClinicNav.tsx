"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "./copy";

export function ClinicNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      aria-label="Primary"
      className={[
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-[#1a1410]/8 bg-[#faf5ee]/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4 lg:px-10">
        <Link
          href="/"
          className="group flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#7a3a26]/30 focus-visible:ring-offset-4 focus-visible:ring-offset-[#faf5ee]"
        >
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-full bg-[#1a1410] text-[#faf5ee] transition-transform duration-300 group-hover:rotate-[8deg]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12 2a10 10 0 1 0 10 10h-4a6 6 0 1 1-6-6V2z" />
            </svg>
          </span>
          <span
            className="text-[15px] font-[600] tracking-tight text-[#1a1410]"
            style={{ fontFamily: "var(--font-clinic-display)" }}
          >
            Riri
            <span className="ml-2 text-[10px] font-[500] uppercase tracking-[0.22em] text-[#7a3a26]/70">
              for clinics
            </span>
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={link.href}
                className="text-[13px] font-[500] text-[#1a1410]/70 transition-colors hover:text-[#7a3a26]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <Link
          href="/voice"
          className="group inline-flex items-center gap-2 rounded-full bg-[#1a1410] px-5 py-2.5 text-[13px] font-[500] text-[#faf5ee] transition-all duration-200 hover:bg-[#7a3a26] focus-visible:ring-2 focus-visible:ring-[#7a3a26]/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#faf5ee]"
        >
          Hear Riri
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden
          >
            <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </nav>
  );
}
