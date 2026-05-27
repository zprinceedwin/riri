import { ClinicNav } from "./ClinicNav";
import { ClinicHero } from "./ClinicHero";
import { ClinicStakes } from "./ClinicStakes";
import { ClinicSolution } from "./ClinicSolution";
import { ClinicSample } from "./ClinicSample";
import { ClinicProof } from "./ClinicProof";
import { ClinicFaq } from "./ClinicFaq";
import { ClinicCta } from "./ClinicCta";
import { ClinicFooter } from "./ClinicFooter";

export function ClinicLanding() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[#1a1410] focus:px-4 focus:py-2 focus:text-[12px] focus:text-[#faf5ee]"
      >
        Skip to main content
      </a>

      <ClinicNav />

      <main id="main" className="relative">
        <ClinicHero />
        <ClinicStakes />
        <ClinicSolution />
        <ClinicSample />
        <ClinicProof />
        <ClinicFaq />
        <ClinicCta />
      </main>

      <ClinicFooter />
    </>
  );
}
