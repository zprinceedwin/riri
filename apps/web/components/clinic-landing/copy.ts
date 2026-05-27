export const NAV_LINKS = [
  { id: "stakes", label: "The Stakes", href: "/#stakes" },
  { id: "how", label: "How Riri Works", href: "/#solution" },
  { id: "listen", label: "Listen In", href: "/#sample" },
  { id: "faq", label: "FAQ", href: "/#faq" },
] as const;

export const HERO = {
  eyebrow: "For aesthetic and dermatology clinics",
  headlinePre: "The receptionist your",
  headlineEm: "skin clinic",
  headlinePost: "never had.",
  sub:
    "Riri answers every inbound call in your clinic's voice — quotes services, books slots into your calendar, and warm-transfers when she should. Trained on dermatology vocabulary and the cadence of real clinic conversations.",
  primaryCta: { label: "Hear Riri Now", href: "/voice" },
  secondaryCta: { label: "How she works", href: "/#solution" },
  trustNote: "Built on Agora, Supabase, ElevenLabs, and Deepgram.",
} as const;

export const STAKES = {
  eyebrow: "01 — The Stakes",
  title: "Every missed call is a missed booking.",
  lede:
    "Aesthetic clinics live and die by the phone. When the front desk is busy with a walk-in or the doctor is mid-procedure, the next caller goes to voicemail — and 7 out of 10 of them never call back.",
  cards: [
    {
      number: "01",
      title: "Voicemail kills bookings.",
      body:
        "Inbound clinic calls go unanswered during peak hours. Most callers don't leave a message — they just call the next clinic on Google.",
      stat: "~32%",
      statLabel: "of clinic calls go to voicemail at peak",
    },
    {
      number: "02",
      title: "The same five questions, all day.",
      body:
        "How much is HydraFacial? Who does laser? Is Dr. Reyes available Saturday? Your receptionist answers the same script every hour.",
      stat: "5×",
      statLabel: "repeat questions per day, per clinic",
    },
    {
      number: "03",
      title: "Doctors pulled out of procedures.",
      body:
        "When the front desk can't decide a treatment plan or quote a package, the doctor gets paged mid-treatment — bad for the doctor, bad for the patient on the table.",
      stat: "12×",
      statLabel: "interruptions per provider per day",
    },
  ],
} as const;

export const SOLUTION = {
  eyebrow: "02 — How Riri Works",
  title: "One voice. Every call. Booked.",
  lede:
    "Riri is a voice receptionist trained on your clinic's services, doctors, prices, and policies. She picks up on the first ring, qualifies the caller, books the slot, and sends a confirmation email before they've hung up.",
  features: [
    {
      number: "01",
      title: "Knows your menu by heart.",
      body:
        "Every service, every doctor, every package, every promo. Riri quotes prices the way your senior receptionist would — never robotic, always on-brand.",
    },
    {
      number: "02",
      title: "Books straight into your calendar.",
      body:
        "She holds a slot the moment the caller confirms, then atomically books it. No double-bookings, even when two callers race for the same Saturday slot.",
    },
    {
      number: "03",
      title: "Picks up every call, every hour.",
      body:
        "Riri answers on the first ring at 3 AM, on holidays, during peak hours, and while your front desk is mid-checkout. Inbound calls never go to voicemail again.",
    },
    {
      number: "04",
      title: "Hands off when she should.",
      body:
        "Medical emergencies, refund disputes, VIP clients, complex consults — Riri tags the call for human handoff with a summary so your team picks up in context.",
    },
  ],
} as const;

export const SAMPLE = {
  eyebrow: "03 — Listen In",
  title: "A real call, in 45 seconds.",
  lede:
    "A sample exchange between Riri and a first-time caller asking about HydraFacial pricing. Names anonymized.",
  turns: [
    { speaker: "Caller", text: "Hi, I'm calling to ask how much your HydraFacial is." },
    {
      speaker: "Riri",
      text:
        "Hi! Welcome to Belle Aesthetic Manila. Our classic HydraFacial is ₱4,500 and takes about 45 minutes. It's available with Dr. Reyes Tuesday through Saturday.",
    },
    { speaker: "Caller", text: "Is anything open tomorrow?" },
    {
      speaker: "Riri",
      text:
        "Dr. Reyes has 2 PM and 4:30 PM tomorrow. Which one works better for you?",
    },
    { speaker: "Caller", text: "I'll take the 4:30 PM." },
    {
      speaker: "Riri",
      text:
        "Of course. I'll hold the 4:30 PM HydraFacial slot with Dr. Reyes. Could I get your name and email for the confirmation?",
    },
  ],
} as const;

export const PROOF = {
  eyebrow: "04 — Built To Run In Production",
  title: "Voice quality your patients won't second-guess.",
  lede:
    "Riri runs on the same infrastructure that powers some of the world's largest voice-AI deployments — tuned for clinic latency, clinic vocabulary, and clinic privacy.",
  pillars: [
    {
      label: "Agora Conversational AI",
      detail:
        "Sub-650ms voice round-trip with native interruption handling — Riri can be cut off mid-sentence like a real person.",
    },
    {
      label: "Supabase",
      detail:
        "Postgres with pgvector for RAG against your clinic's service catalog, doctor roster, and FAQ — no hallucinated prices, no invented promos.",
    },
    {
      label: "ElevenLabs Voice",
      detail:
        "Studio-grade synthetic voice tuned for warmth and clinic-appropriate pacing. Patients tell us they couldn't tell.",
    },
    {
      label: "Deepgram Speech",
      detail:
        "Streaming ASR with strong accuracy on accented English and noisy connections. She hears you the first time.",
    },
  ],
} as const;

export const FAQ = {
  eyebrow: "05 — Questions clinics ask before signing",
  title: "Honest answers.",
  items: [
    {
      q: "Does Riri actually sound like a real receptionist, or like a robot?",
      a:
        "Patients regularly assume Riri is a real person until told otherwise. The voice is ElevenLabs at studio quality, tuned for clinic warmth and pacing. We avoid the robotic giveaways — slow pauses, over-perfect grammar, scripted-sounding handoffs.",
    },
    {
      q: "Can we customize Riri's voice and tone?",
      a:
        "Yes. We tune her voice profile, pacing, and house phrases to match your clinic's brand. You can choose between several voice options and decide exactly how she greets patients, offers to hold slots, and explains pricing.",
    },
    {
      q: "Does Riri book directly into our existing calendar?",
      a:
        "Yes. She uses an atomic compare-and-swap reservation flow — even if two callers want the same Saturday slot at the same moment, only one of them gets it. The other is offered the next available time without ever knowing the conflict happened.",
    },
    {
      q: "What happens if a caller is in distress, or asks something Riri shouldn't answer?",
      a:
        "Riri tags the call for human handoff in real time. Your on-duty staff sees the live transcript and the reason for handoff (medical emergency, refund dispute, VIP, etc.). She holds the line warmly until your team picks up.",
    },
    {
      q: "How long does setup take?",
      a:
        "About four hours of supervised setup. We ingest your service catalog, doctor roster, FAQ, and pricing into Supabase, train Riri on your house style, and run a private rehearsal call before go-live.",
    },
    {
      q: "Is patient information secure?",
      a:
        "All transcripts, summaries, and calendar holds live in Supabase Postgres with role-based access and row-level security. We do not store voice audio after the call ends. We're happy to sign a clinic-specific DPA before rollout.",
    },
  ],
} as const;

export const FINAL_CTA = {
  eyebrow: "Ready when you are.",
  title: "Let Riri answer your next call.",
  lede:
    "Open the demo line, talk to Riri the way a patient would, and end the call with a real booking summary in front of you.",
  cta: { label: "Open the demo line", href: "/voice" },
  secondary: { label: "Hear the sample call", href: "/#sample" },
} as const;

export const FOOTER = {
  tagline:
    "Voice AI receptionists, made for clinics that take their phone seriously.",
  columns: [
    {
      heading: "Product",
      links: [
        { label: "Hear Riri", href: "/voice" },
        { label: "How it works", href: "/#solution" },
        { label: "Sample call", href: "/#sample" },
        { label: "FAQ", href: "/#faq" },
      ],
    },
    {
      heading: "Built with",
      links: [
        { label: "Agora", href: "https://www.agora.io", external: true },
        {
          label: "Supabase",
          href: "https://supabase.com",
          external: true,
        },
        { label: "ElevenLabs", href: "https://elevenlabs.io", external: true },
        { label: "Deepgram", href: "https://deepgram.com", external: true },
      ],
    },
  ],
  signoff: "Manila, PH. Built with TRAE, Cursor, and Claude Code.",
} as const;
