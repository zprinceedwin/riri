/**
 * Seed Couchbase with the clinic demo dataset for Belle Aesthetic Manila.
 *
 * What this script writes:
 *  - knowledge collection: clinic overview, per-service descriptions, doctor
 *    bios, FAQ, objection-handling playbook -- all under namespace
 *    `clinic-belle-manila`.
 *  - slots collection: 14 days of 30-minute slots across the 4 doctors,
 *    9:00 AM to 6:00 PM Manila time. About half are pre-marked booked so
 *    the live demo feels real.
 *  - contacts collection: 5 pre-seeded contacts so the dashboard is not empty.
 *  - bookings collection: 3 historical bookings tied to those contacts.
 *
 * Usage:
 *   pnpm seed:clinic
 *
 * Idempotent at the document-id level -- re-running upserts the same ids.
 */
import { nanoid } from "nanoid";
import { embedBatch } from "../lib/voyage.js";
import {
  upsertBooking,
  upsertChunks,
  upsertContact,
  upsertSlot,
  type StoredChunk,
} from "../lib/supabase.js";
import { chunkText } from "../lib/chunk.js";
import { DOCTORS, SERVICES } from "../lib/clinic-catalog.js";
import { getEnv } from "../env.js";
import type { Booking, Contact, Slot } from "@riri/shared";

const CLINIC_OVERVIEW = `Belle Aesthetic Manila is a premium dermatology and aesthetics clinic located on the ground floor of Bonifacio High Street, Bonifacio Global City, Taguig. We've been operating in BGC since 2019. The clinic is open Monday to Saturday from 10:00 AM to 8:00 PM, and Sunday from 12:00 PM to 6:00 PM. We are closed on major Philippine holidays. Parking is validated for 2 hours at the BGC High Street basement parking. We're a 4-minute walk from the BGC Bus station, and a 6-minute walk from Market! Market!. We accept GCash, Maya, all major credit cards, and cash. We also offer 0%-interest installment plans through BDO, BPI, Metrobank, and Security Bank for treatments above ₱10,000. Our facility includes 4 private treatment rooms, a dedicated laser suite, and a recovery lounge. We follow Department of Health licensing standards and our medical waste is handled by a DOH-accredited disposal partner.`;

const FAQ_DOC = `Cancellation policy: We ask for 24-hours notice for cancellations. Same-day cancellations and no-shows are charged 50% of the booked treatment value. Rescheduling within the 24-hour window is free.

Age requirements: Injectables (Botox, fillers, Profhilo) require clients to be at least 21 years old, with valid government ID. Lasers and facials are available from 18 and up. Anyone under 18 must be accompanied by a parent or legal guardian and we'll review parental consent before any treatment.

Payment methods: We accept GCash, Maya, BDO/BPI/Metrobank/Security Bank cards, all major international credit cards, and cash. 0% installment plans are available for any single treatment above ₱10,000 through our partner banks.

Post-procedure care: Sun protection (SPF 50 minimum) is non-negotiable for the first 7 days after any laser, peel, or microneedling treatment. For injectables: no strenuous exercise, alcohol, or saunas for 24 hours. We provide written aftercare instructions and a follow-up message at 48 hours.

Recovery times by treatment: Botox and fillers -- zero downtime, possible minor swelling for 24 to 48 hours. Hydrafacial -- zero downtime. Carbon laser -- mild redness for up to 2 hours. Chemical peel medium -- 3 to 5 days of mild flaking. Microneedling with PRP -- 2 to 3 days social downtime, redness fades by day 3. Profhilo -- small papules at injection sites for 24 hours.

Consultations: First-time consultations with any doctor are free if booked through the clinic phone or website. We do not consult on the spot for laser or injectables without a prior assessment.

Refunds and unsatisfactory results: We offer a touch-up window of 14 days for injectables (free, with the same doctor) and complimentary make-good sessions for non-injectable treatments if results are below expected. We do not offer cash refunds for services already rendered.`;

const OBJECTION_PLAYBOOK = `OBJECTION: "I think it's too expensive."
RESPONSE: Mention the relevant package savings (e.g. "The 3-session Botox package brings the per-session price down to about sixteen thousand, and you save six thousand overall."). Offer the lower-cost alternative tier if one exists ("If you'd like to try a less intensive option first, the Hydrafacial is five thousand five hundred and a lot of clients start there."). Mention our 0% installment plans through partner banks for anything above ₱10,000.

OBJECTION: "I'm scared of needles" / "I'm scared of the procedure."
RESPONSE: Acknowledge the fear genuinely. Offer a consult-only first visit at no cost so the client can meet the doctor, see the room, and ask questions without committing to a procedure. Mention that for injectables we use the finest needles available and topical numbing, and that we can stop at any time.

OBJECTION: "Can I bring a friend?"
RESPONSE: Yes, friends are welcome in the consultation rooms. As a thank-you, if your friend books their first treatment within 30 days, they get 10% off and you get a complementary LED therapy session (worth ₱2,500) added to your next visit.

OBJECTION: "I want to think about it" / "Let me get back to you."
RESPONSE: Respect the no-pressure pause. Offer to provisionally hold a slot for 24 hours with no card needed. "I can pencil you in for Saturday at four PM and hold it for twenty-four hours. If you change your mind, just call us back -- otherwise it opens up automatically."

OBJECTION: "Is this safe?" / "What about side effects?"
RESPONSE: This is a medical question -- escalate to a human coordinator who can connect them with the relevant doctor. Do NOT improvise medical advice.

OBJECTION: "Do you offer financing?"
RESPONSE: Yes -- we partner with BDO, BPI, Metrobank, and Security Bank for 0% installment plans on treatments above ₱10,000. We process the application at the clinic in about 5 minutes if you bring your card.

OBJECTION: "What makes you different from [other clinic]?"
RESPONSE: We focus on natural, conservative results -- our doctors are trained to under-do rather than over-do. We're also one of the few clinics in BGC with a dedicated laser suite separate from the treatment rooms, which means appointments stay on time. All consultations are free if you book through us directly.`;

interface SeedDoc {
  title: string;
  source: string;
  text: string;
}

function buildKnowledgeDocs(): SeedDoc[] {
  const docs: SeedDoc[] = [
    {
      title: "Clinic overview -- Belle Aesthetic Manila",
      source: "clinic-overview",
      text: CLINIC_OVERVIEW,
    },
    {
      title: "Frequently asked questions",
      source: "clinic-faq",
      text: FAQ_DOC,
    },
    {
      title: "Objection-handling playbook",
      source: "clinic-playbook",
      text: OBJECTION_PLAYBOOK,
    },
  ];
  for (const doctor of DOCTORS) {
    docs.push({
      title: `Doctor bio -- ${doctor.name}`,
      source: `doctor:${doctor.id}`,
      text: `${doctor.name}, ${doctor.title}. Specialties: ${doctor.specialties.join(", ")}. ${doctor.bio}`,
    });
  }
  for (const service of SERVICES) {
    const php = (service.priceCents / 100).toLocaleString("en-PH", {
      maximumFractionDigits: 0,
    });
    const doctorList = service.doctorIds
      .map((id) => DOCTORS.find((d) => d.id === id)?.name ?? id)
      .join(", ");
    docs.push({
      title: `Service -- ${service.name}`,
      source: `service:${service.id}`,
      text: `${service.name}. Duration: ${service.durationMin} minutes. Price: ₱${php}. Performed by: ${doctorList}. ${service.description}`,
    });
  }
  return docs;
}

async function seedKnowledge(namespace: string): Promise<number> {
  const docs = buildKnowledgeDocs();
  // Collect every chunk across every doc into one flat list so we embed them
  // all in a single Voyage API call. The free tier limits us to 3 requests
  // per minute; chunking ~30 doc-chunks into one batched request keeps us
  // comfortably within that.
  type PendingChunk = {
    id: string;
    text: string;
    source: string;
    title: string;
  };
  const pending: PendingChunk[] = [];
  for (const doc of docs) {
    const chunks = chunkText(doc.text);
    if (chunks.length === 0) continue;
    const docId = nanoid(8);
    chunks.forEach((text, i) =>
      pending.push({
        id: `seed-clinic-${docId}-${i}`,
        text,
        source: doc.source,
        title: doc.title,
      })
    );
  }
  if (pending.length === 0) return 0;

  console.log(`  embedding ${pending.length} chunks in one batched call...`);
  const embeddings = await embedBatch(pending.map((p) => p.text));

  const items = pending.map((p, i) => ({
    id: p.id,
    chunk: {
      text: p.text,
      embedding: embeddings[i]!,
      kind: "clinic" as const,
      namespace,
      source: p.source,
      title: p.title,
      createdAt: Date.now(),
    } satisfies StoredChunk,
  }));
  await upsertChunks(items);
  console.log(`  + KB: ${items.length} chunks across ${docs.length} docs`);
  return items.length;
}

interface SlotPlan {
  doctorId: string;
  startsAt: Date;
  durationMin: number;
}

function buildSlotPlans(): SlotPlan[] {
  const plans: SlotPlan[] = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    for (let hour = 9; hour < 18; hour++) {
      for (const minute of [0, 30]) {
        const startsAt = new Date(startOfToday);
        startsAt.setDate(startsAt.getDate() + dayOffset);
        startsAt.setHours(hour, minute, 0, 0);
        // Rotate doctors deterministically across slots so each doctor has
        // realistic coverage across the week.
        const doctorIdx =
          (dayOffset + hour + (minute === 30 ? 1 : 0)) % DOCTORS.length;
        plans.push({
          doctorId: DOCTORS[doctorIdx]!.id,
          startsAt,
          durationMin: 30,
        });
      }
    }
  }
  return plans;
}

function slotIdFor(plan: SlotPlan): string {
  const yyyy = plan.startsAt.getFullYear();
  const mm = `${plan.startsAt.getMonth() + 1}`.padStart(2, "0");
  const dd = `${plan.startsAt.getDate()}`.padStart(2, "0");
  const hh = `${plan.startsAt.getHours()}`.padStart(2, "0");
  const mi = `${plan.startsAt.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${hh}${mi}-${plan.doctorId}`;
}

async function seedSlots(): Promise<{ total: number; preBooked: number }> {
  const plans = buildSlotPlans();
  let preBooked = 0;
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i]!;
    // ~50% pre-booked, deterministic so re-runs are consistent.
    const pseudoRand = (i * 2654435761) % 100;
    const isBooked = pseudoRand < 50 && plan.startsAt.getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000;
    const slot: Slot = {
      id: slotIdFor(plan),
      doctorId: plan.doctorId,
      startsAt: plan.startsAt.toISOString(),
      durationMin: plan.durationMin,
      status: isBooked ? "booked" : "available",
      bookingId: isBooked ? `bk-seed-${i}` : undefined,
    };
    if (isBooked) preBooked++;
    await upsertSlot(slot);
  }
  return { total: plans.length, preBooked };
}

function buildContactsAndBookings(): { contacts: Contact[]; bookings: Booking[] } {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const contacts: Contact[] = [
    {
      id: "ct-seed-maria",
      name: "Maria Cruz",
      phone: "+63-917-555-0101",
      email: "maria.cruz@example.com",
      tags: ["returning", "botox-regular"],
      notes: "Prefers Dr. Santos. Has a maintenance plan for crow's-feet Botox every 4 months.",
      firstSeenAt: now - 220 * day,
      lastSeenAt: now - 8 * day,
      totalCalls: 6,
      totalBookings: 5,
      history: [
        {
          callId: "seed-call-maria-1",
          ts: now - 8 * day,
          outcome: "booking_confirmed",
          summary: "Booked Botox crow's-feet refresh with Dr. Santos for next week.",
        },
      ],
    },
    {
      id: "ct-seed-luis",
      name: "Luis Reyes",
      phone: "+63-917-555-0102",
      email: "luis.reyes@example.com",
      tags: ["new"],
      notes: "Inquired about Carbon laser, has not booked yet.",
      firstSeenAt: now - 3 * day,
      lastSeenAt: now - 3 * day,
      totalCalls: 1,
      totalBookings: 0,
      history: [],
    },
    {
      id: "ct-seed-anna",
      name: "Anna Lim",
      phone: "+63-917-555-0103",
      email: "anna.lim@example.com",
      tags: ["returning", "hydrafacial-package"],
      notes: "On the 6-session Hydrafacial package, 4 sessions done.",
      firstSeenAt: now - 150 * day,
      lastSeenAt: now - 14 * day,
      totalCalls: 4,
      totalBookings: 4,
      history: [],
    },
    {
      id: "ct-seed-james",
      name: "James Tan",
      phone: "+63-917-555-0104",
      email: "james.tan@example.com",
      tags: ["new", "consultation-pending"],
      notes: "Asking about Profhilo. Coordinator follow-up scheduled.",
      firstSeenAt: now - 1 * day,
      lastSeenAt: now - 1 * day,
      totalCalls: 1,
      totalBookings: 0,
      history: [],
    },
    {
      id: "ct-seed-priya",
      name: "Priya Singh",
      phone: "+63-917-555-0105",
      email: "priya.singh@example.com",
      tags: ["returning", "vip"],
      notes: "Long-time client. Always books with Dr. Cruz for laser.",
      firstSeenAt: now - 410 * day,
      lastSeenAt: now - 22 * day,
      totalCalls: 11,
      totalBookings: 10,
      history: [],
    },
  ];

  const bookings: Booking[] = [
    {
      id: "bk-seed-1",
      slotId: "seed-historical-1",
      doctorId: "dr-santos",
      serviceId: "svc-botox-crows",
      contact: { name: "Maria Cruz", phone: contacts[0]!.phone!, email: contacts[0]!.email! },
      scheduledFor: new Date(now + 6 * day).toISOString(),
      createdAt: new Date(now - 8 * day).toISOString(),
      status: "confirmed",
      source: "voice",
    },
    {
      id: "bk-seed-2",
      slotId: "seed-historical-2",
      doctorId: "dr-reyes",
      serviceId: "svc-hydrafacial",
      contact: { name: "Anna Lim", phone: contacts[2]!.phone!, email: contacts[2]!.email! },
      scheduledFor: new Date(now - 14 * day).toISOString(),
      createdAt: new Date(now - 25 * day).toISOString(),
      status: "completed",
      source: "voice",
    },
    {
      id: "bk-seed-3",
      slotId: "seed-historical-3",
      doctorId: "dr-cruz",
      serviceId: "svc-carbon-laser",
      contact: { name: "Priya Singh", phone: contacts[4]!.phone!, email: contacts[4]!.email! },
      scheduledFor: new Date(now - 22 * day).toISOString(),
      createdAt: new Date(now - 30 * day).toISOString(),
      status: "completed",
      source: "voice",
    },
  ];

  return { contacts, bookings };
}

async function seedContactsAndBookings(): Promise<{ contacts: number; bookings: number }> {
  const { contacts, bookings } = buildContactsAndBookings();
  for (const contact of contacts) {
    await upsertContact(contact);
  }
  for (const booking of bookings) {
    await upsertBooking(booking);
  }
  return { contacts: contacts.length, bookings: bookings.length };
}

async function main() {
  const env = (() => {
    try {
      return getEnv();
    } catch (err) {
      console.error("Could not load env -- check .env.", err);
      process.exit(1);
    }
  })();
  const namespace = env.CLINIC_DEMO_NAMESPACE;
  console.log(`Seeding clinic data for ${env.CLINIC_NAME} (namespace=${namespace})`);

  console.log("\nStep 1/3 -- knowledge base...");
  const kbChunks = await seedKnowledge(namespace);

  console.log("\nStep 2/3 -- 14 days of slots...");
  const { total, preBooked } = await seedSlots();
  console.log(`  + ${total} slots written, ${preBooked} pre-booked, ${total - preBooked} available`);

  console.log("\nStep 3/3 -- 5 contacts and 3 historical bookings...");
  const { contacts, bookings } = await seedContactsAndBookings();
  console.log(`  + ${contacts} contacts, ${bookings} bookings`);

  console.log("\nDone.");
  console.log(`  KB chunks:    ${kbChunks}`);
  console.log(`  Slots:        ${total} (${preBooked} booked)`);
  console.log(`  Contacts:     ${contacts}`);
  console.log(`  Bookings:     ${bookings}`);
  console.log(`  Namespace:    ${namespace}`);
}

main().catch((err) => {
  console.error("seed:clinic failed:", err);
  process.exit(1);
});
