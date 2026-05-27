import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-clinic-display",
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-clinic-body",
});

export const metadata: Metadata = {
  title: "Riri for Clinics — Voice receptionist for skin clinics",
  description:
    "Voice AI receptionist for aesthetic and dermatology clinics. Built on Agora, Supabase, ElevenLabs, and Deepgram.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} dark`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
