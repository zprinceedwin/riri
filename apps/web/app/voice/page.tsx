"use client";

import dynamic from "next/dynamic";

const VoiceClient = dynamic(() => import("@/components/VoiceClient"), {
  ssr: false,
  loading: () => (
    <main
      className="grid min-h-screen place-items-center bg-[#faf5ee] text-[#1a1410]/40"
      style={{ colorScheme: "light" }}
    >
      <span
        className="text-[11px] uppercase tracking-[0.28em]"
        style={{ fontFamily: "var(--font-clinic-body)" }}
      >
        Loading demo line…
      </span>
    </main>
  ),
});

export default function VoicePage() {
  return <VoiceClient />;
}
