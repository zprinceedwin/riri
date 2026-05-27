import type { Metadata } from "next";
import { ClinicLanding } from "@/components/clinic-landing/ClinicLanding";

export const metadata: Metadata = {
  title: "Riri for Clinics — Voice receptionist for skin clinics",
  description:
    "Riri is a voice AI receptionist for aesthetic and dermatology clinics. Answers every call, books slots into your calendar, and warm-transfers when she should.",
  openGraph: {
    title: "Riri for Clinics",
    description:
      "Voice AI receptionists, made for clinics that take their phone seriously.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <div
      className="relative min-h-screen bg-[#faf5ee] text-[#1a1410]"
      style={{ colorScheme: "light" }}
    >
      <ClinicLanding />
    </div>
  );
}
