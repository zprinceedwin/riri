/**
 * Static clinic catalog -- doctors and services for Belle Aesthetic Manila.
 *
 * Source of truth for the V0 clinic demo. The seed script writes copies into
 * Couchbase knowledge so the LLM can cite them; the routes also expose this
 * catalog directly so the FE doesn't have to round-trip through Couchbase for
 * deterministic data.
 *
 * Prices are stored in PHP cents (₱1 = 100 cents). Realistic Manila aesthetics
 * pricing as of 2026.
 */
import type { Doctor, Service } from "@riri/shared";

export const DOCTORS: Doctor[] = [
  {
    id: "dr-santos",
    name: "Dr. Maria Santos",
    title: "Cosmetic Dermatologist, Injectables Lead",
    specialties: ["Botox", "Lip filler", "Profhilo", "Skin boosters"],
    bio: "Board-certified dermatologist with 12 years of experience in aesthetic injectables. Trained at Allergan Medical Institute, Seoul. Known for natural-looking results and a conservative, consult-first approach.",
    avatarEmoji: "👩‍⚕️",
  },
  {
    id: "dr-cruz",
    name: "Dr. Liam Cruz",
    title: "Laser & Energy-Based Devices Specialist",
    specialties: [
      "Carbon laser",
      "Pico laser",
      "IPL",
      "Radiofrequency tightening",
    ],
    bio: "Leads the laser program at Belle. PhD in dermatology, fellowship at Sciton in California. Designs treatment plans around skin type and downtime tolerance.",
    avatarEmoji: "🧑‍⚕️",
  },
  {
    id: "dr-reyes",
    name: "Dr. Anna Reyes",
    title: "Medical Facialist & Chemical Peels",
    specialties: ["Hydrafacial", "Chemical peels", "Microneedling", "LED therapy"],
    bio: "Aesthetician-dermatologist hybrid with 9 years of practice. Specializes in skin barrier rehabilitation and pigmentation. Gentle hands, deep knowledge of post-procedure recovery.",
    avatarEmoji: "👩‍⚕️",
  },
  {
    id: "dr-tan",
    name: "Dr. Marcus Tan",
    title: "Body Contouring & Wellness",
    specialties: ["CoolSculpting", "Emsculpt", "PRP", "IV drips"],
    bio: "Body and wellness lead. Background in sports medicine, transitioned to aesthetics in 2021. Programs are evidence-based and combine procedure with nutrition guidance.",
    avatarEmoji: "🧑‍⚕️",
  },
];

export const SERVICES: Service[] = [
  {
    id: "svc-botox-crows",
    name: "Botox — Crow's Feet",
    durationMin: 30,
    priceCents: 18_000 * 100,
    description:
      "Targeted neuromodulator injection for fine lines around the eyes. Onset in 3-5 days, peak in 2 weeks, lasts 3-4 months.",
    doctorIds: ["dr-santos"],
    category: "Injectables",
  },
  {
    id: "svc-lip-filler",
    name: "Lip Filler",
    durationMin: 45,
    priceCents: 25_000 * 100,
    description:
      "Hyaluronic acid filler for lip definition and volume. 1 syringe standard. Lasts 6-9 months. Minimal downtime, possible swelling for 48 hours.",
    doctorIds: ["dr-santos"],
    category: "Injectables",
  },
  {
    id: "svc-hydrafacial",
    name: "Hydrafacial",
    durationMin: 45,
    priceCents: 5_500 * 100,
    description:
      "Three-step cleanse, exfoliation, and hydration treatment using vortex suction. Instant glow, no downtime. Recommended every 3-4 weeks.",
    doctorIds: ["dr-reyes"],
    category: "Facials",
  },
  {
    id: "svc-carbon-laser",
    name: "Carbon Laser Peel",
    durationMin: 30,
    priceCents: 8_000 * 100,
    description:
      "Carbon mask + Q-switch laser for instant pore refinement, oil reduction, and brightening. Lunchtime-friendly. Series of 4-6 recommended for best results.",
    doctorIds: ["dr-cruz"],
    category: "Laser",
  },
  {
    id: "svc-chemical-peel",
    name: "Chemical Peel — Medium",
    durationMin: 45,
    priceCents: 4_500 * 100,
    description:
      "Glycolic + lactic acid peel for pigmentation, dullness, and surface texture. 3-5 days of mild flaking expected. Six-session protocol for melasma.",
    doctorIds: ["dr-reyes"],
    category: "Facials",
  },
  {
    id: "svc-led-therapy",
    name: "LED Light Therapy",
    durationMin: 30,
    priceCents: 2_500 * 100,
    description:
      "Red and blue LED for inflammation, acne, and collagen stimulation. Pairs well with Hydrafacial or after laser. Zero downtime.",
    doctorIds: ["dr-reyes"],
    category: "Facials",
  },
  {
    id: "svc-microneedling",
    name: "Microneedling with PRP",
    durationMin: 75,
    priceCents: 9_500 * 100,
    description:
      "Collagen induction therapy. Combined with platelet-rich plasma from your own blood draw. Best for acne scars and large pores. 2-3 day social downtime.",
    doctorIds: ["dr-reyes", "dr-tan"],
    category: "Treatments",
  },
  {
    id: "svc-profhilo",
    name: "Profhilo Bio-Remodeling",
    durationMin: 60,
    priceCents: 32_000 * 100,
    description:
      "Hyaluronic acid bio-stimulator that hydrates and remodels skin from within. Two sessions, 30 days apart. Lasts 6 months.",
    doctorIds: ["dr-santos"],
    category: "Injectables",
  },
  {
    id: "svc-botox-package-3",
    name: "Botox 3-Session Package (annual)",
    durationMin: 30,
    priceCents: 48_000 * 100,
    description:
      "Three sessions of crow's-feet or forehead Botox spaced across the year. Save ₱6,000 vs paying per session. Best for clients maintaining a consistent look.",
    doctorIds: ["dr-santos"],
    category: "Packages",
  },
  {
    id: "svc-hydrafacial-package-6",
    name: "Hydrafacial 6-Session Package",
    durationMin: 45,
    priceCents: 28_000 * 100,
    description:
      "Six Hydrafacial sessions, one every 3-4 weeks. Save ₱5,000 vs paying per session. Ideal for sustained glow and pore health.",
    doctorIds: ["dr-reyes"],
    category: "Packages",
  },
];

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function getDoctor(id: string): Doctor | undefined {
  return DOCTORS.find((d) => d.id === id);
}
