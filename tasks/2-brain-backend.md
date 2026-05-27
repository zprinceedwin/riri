# Role 2 — Brain / Backend

> You own the brain: Couchbase Capella, the custom LLM proxy, the RAG pipeline,
> the clinic primitives (slot CAS, booking confirm, contacts, handoffs), the
> Resend email pipeline, the post-call summarizer, and — newly — the persona
> prompt content. If a request leaves Agora and isn't an RTC packet, it ends
> up in your code.

## Scope (what you own end-to-end)

- Couchbase Capella cluster + bucket + scope + collections + vector index.
- `/v1/chat/completions` custom LLM proxy with RAG injection + Sofia-only
  `AVAILABLE_SLOTS` + `CONTACT` blocks.
- Vector search retrieval (`top-k=4`) over the `knowledge` collection.
- Clinic primitives:
  - CAS-based slot reservation (`reserveSlot`).
  - CAS-based booking confirmation (`confirmBooking`) that flips slot status
    + inserts a Booking record atomically.
  - Contact upsert + lookup by phone + history append.
  - Handoff create + list-pending + resolve.
- Resend transactional email for booking confirmation (fetch-based, no SDK).
- Post-call summary endpoint with intent + handoff + clinic lead fields.
- Seed scripts: `seed:company`, `seed:prospect`, `seed:clinic`.
- **Persona JSON content + system prompts** (delegated from the old Person 4).
  Wiring is done; you tune the words.

## Not your scope

- Agora REST or RTC plumbing — Voice owns `routes/agent.ts` and `lib/agora.ts`.
- Frontend pages or components — UI owns everything under `apps/web/`.
- Pitch deck, demo script, backup video, submission paperwork — Pitcher.

## Branch convention

`brain/<topic>` — push WIP every hour even if broken.

## Files you own

- `apps/api/src/routes/llm.ts`
- `apps/api/src/routes/calls.ts`
- `apps/api/src/routes/ingest.ts`
- `apps/api/src/routes/slots.ts`
- `apps/api/src/routes/bookings.ts`
- `apps/api/src/routes/contacts.ts`
- `apps/api/src/routes/handoffs.ts`
- `apps/api/src/routes/catalog.ts`
- `apps/api/src/routes/personas.ts`
- `apps/api/src/lib/couchbase.ts`
- `apps/api/src/lib/rag.ts`
- `apps/api/src/lib/openai.ts`
- `apps/api/src/lib/resend.ts`
- `apps/api/src/lib/clinic-catalog.ts`
- `apps/api/src/lib/chunk.ts`
- `apps/api/src/lib/scrape.ts`
- `apps/api/src/seed/seed-company.ts`
- `apps/api/src/seed/seed-prospect.ts`
- `apps/api/src/seed/seed-clinic.ts`
- `packages/personas/sofia.json`
- `packages/personas/jordan.json`
- `packages/personas/mike.json`
- `packages/personas/src/index.ts`
- `infra/couchbase-vector-index.md`
- `docs/PITCH_PROMPTS.md` (the prompt iteration log)

## Files you must NOT touch

- `apps/api/src/routes/agent.ts`, `apps/api/src/lib/agora.ts`,
  `apps/api/src/lib/store.ts` — Voice.
- Anything under `apps/web/` — UI.
- `docs/DEMO_SCRIPT.md`, the pitch deck — Pitcher.

## Hour-by-hour tasks

### H0 (8:30–10:30 AM, pre-build during sponsor talks)

- [ ] Capella signup, cluster creation, bucket `Riri`, default scope.
- [ ] Create all six collections: `knowledge`, `calls`, `slots`, `contacts`,
      `bookings`, `handoffs`.
- [ ] Create the vector search index `riri_vector_idx` per
      [`infra/couchbase-vector-index.md`](../infra/couchbase-vector-index.md)
      (vector field: `embedding`, dim 1536). **Build this FIRST** — it takes
      time and blocks RAG.
- [ ] OpenAI + ElevenLabs + Deepgram + Resend keys all in `.env`.
- [ ] One embedding inserted by hand to confirm the index is usable.

### H1 (10:30–11:30 AM)

- [ ] First end-to-end ingest of a single text doc via `POST /api/ingest/text`.
- [ ] First vector search returns the chunk you just inserted.
- [ ] Spike a "hello world" SSE stream against `/v1/chat/completions` to be
      sure Agora's expected wire format works. **This is risk #1 in the plan.**

### H2 (11:30 AM–12:30 PM, working lunch)

- [ ] Custom LLM proxy streams OpenAI completions back as SSE.
- [ ] RAG injection wired: top-4 chunks prepended to the system prompt.
- [ ] Sofia namespace switch verified: `personaId === "sofia"` routes to
      `CLINIC_DEMO_NAMESPACE`.
- [ ] Ping Voice: "LLM proxy is live at `localhost:3001/v1/chat/completions`,
      pointing your `LLM_PROXY_URL` at the cloudflared URL when you have it."

### H3 (12:30–1:30 PM) — INTEGRATION GATE

- [ ] Run `pnpm seed:clinic` against Capella. Confirm:
  - 14 days of slots written
  - ~50% pre-booked
  - clinic KB chunks under `clinic-belle-manila` namespace
  - 5 contacts + 3 historical bookings landed
- [ ] Verify `AVAILABLE_SLOTS` block is injected for Sofia (log it on the
      first turn of a call).
- [ ] Verify `CONTACT` block flows in when Voice sends a `phone` in `/start`.
- [ ] Test `POST /api/slots/reserve` returns the held slot on success; test
      that a second concurrent call with the same `slotId` from a different
      `callId` returns `{ ok: false, reason: "slot_taken_concurrent" }`.
- [ ] **🛑 1:30 PM HARD GATE — with Voice + UI:** demo flow runs end-to-end.

### H4 (1:30–2:30 PM)

- [ ] Implement and harden `POST /api/bookings/confirm`:
  - Idempotent on contact phone (existing contact gets updated, not duplicated).
  - Slot CAS replace as the atomic primitive.
  - Resend email best-effort; booking success NEVER depends on email success.
  - Append to contact history.
- [ ] Test the full booking flow: hold a slot via `/reserve` → call `/confirm`
      → verify Couchbase has the booking + contact updated + slot status
      flipped to `booked`.
- [ ] Test the Resend pipeline with a real email address (Pitcher's or your
      own). Confirm the HTML template renders and the X-Riri-Call-Id header
      is present.
- [ ] Post-call summary endpoint:
  - Emits `intent`, `handoffRequired`, `handoffReason`.
  - Creates a Handoff record if `handoffRequired` is true.
  - Returns clinic lead fields (`requestedService`, `requestedDoctor`,
    `requestedTimeWindow`) for Sofia calls.

### H5 (2:30–3:30 PM) — V0 BULLETPROOF DEADLINE

- [ ] Tune Sofia's prompt with live testing. Log every iteration in
      `docs/PITCH_PROMPTS.md`.
- [ ] Verify the AVAILABLE_SLOTS block stays under ~600 tokens (Sofia gets
      confused if it's huge).
- [ ] Vector search latency: target < 250 ms per turn. If higher, drop top-k
      to 3 or raise numCandidates.
- [ ] Pre-warm Capella by running 5 dummy RAG queries — first call after
      idle can spike to seconds.
- [ ] Help Voice + Pitcher capture the backup video at 3:30 by being ready
      to defend the seed data and reseed if anything got polluted.

### H6 (3:30–5:30 PM)

- [ ] Deploy API to Railway with Voice. Confirm all 6 collections names in
      Railway env match Capella. Confirm `OPENAI_SUMMARY_MODEL=gpt-4o`.
- [ ] Once deployed: re-run `pnpm seed:clinic` against the deployed API's
      env (locally is fine — same Capella cluster).
- [ ] Performance pass: trim the system prompt if the cold-start TTFT is
      sluggish. Cache the persona system message if you have time.
- [ ] V1 stretch only if V0 is rock-solid:
  - Live ingest moment in the pitch ("we just ingested this doc 30 sec ago").
  - SourcesPanel population from `session.lastCitations`.

### H7 (5:30–6:30 PM)

- [ ] Stop touching the backend. Hand the keyboard to Voice for the deploy
      bug-fix queue.
- [ ] Sit next to Pitcher during rehearsals. If Sofia hallucinates anything,
      you patch the prompt in real-time and redeploy with Voice.

## Definition of done — per phase

| Phase | DoD |
|-------|-----|
| H0 | Capella cluster + 6 collections + vector index `ready` state |
| H1 | One vector search returns one chunk; SSE spike streams OpenAI tokens |
| H2 | LLM proxy streams full completions with RAG context to a real client |
| H3 | `seed:clinic` populates everything; Sofia sees slots + contact in prompt |
| H4 | Full hold → confirm flow works; Resend email arrives; handoff records create |
| H5 | Sofia talks naturally, never invents facts, escalates on medical questions |
| H6 | Deployed API serves the same flow on Railway URL with Capella in cloud |
| H7 | No further backend merges; Pitcher's rehearsals run cleanly |

## Common pitfalls

- **Vector index slow to build.** Build it FIRST in H0. If you wait until H2
  to create it, the index is still "indexing" when you need it.
- **Couchbase WAN config profile.** The SDK needs `configProfile: "wanDevelopment"`
  for Capella. Already set in `lib/couchbase.ts` — don't remove it.
- **CAS replace semantics.** During `reserveSlot`, the same `callId` re-acquiring
  its own held slot returns ok. Don't break this idempotency; the UI may retry.
- **SQL++ injection.** `listSlotsBetween` and `getContactByPhone` use parameterized
  queries. Never string-concatenate user input into N1QL.
- **Resend `from` must be a verified sender.** The default `onboarding@resend.dev`
  works without verification but you can't customize the From name freely. If
  you want a real From, verify a domain in Resend first.
- **`response_format: { type: "json_object" }`** on the summarizer. Don't
  forget — without it, gpt-4o sometimes wraps JSON in markdown.
- **AVAILABLE_SLOTS token budget.** 20 slots × ~30 tokens each ≈ 600 tokens.
  Anything more and Sofia starts ignoring CONTEXT in favour of slot listing.
- **Connection pool warmup.** First Couchbase call after a cold serve can take
  2+ seconds. Pre-warm in `serve()` callback if cold-start matters in prod.

## Persona prompt content rules (Sofia)

Sofia's system prompt lives in `packages/personas/sofia.json`. When you tune it:

1. **Voice-first.** No markdown, no bullets, no URL-reading. Already in the prompt;
   don't relax it.
2. **Name capture is the first action.** Don't let her open with anything else.
3. **Only cite from CONTEXT and AVAILABLE_SLOTS.** Hallucinated doctors, prices,
   or services are demo-killers.
4. **Medical questions trigger an immediate handoff.** Non-negotiable for liability
   and for the "knows its lane" pitch beat.
5. **Two specific options at a time when offering slots.** Sofia gets overwhelming
   if she lists everything available.
6. **Numbers in words.** "Eighteen thousand pesos", not "₱18,000".

Test each prompt change with a 30-second flow: hook → service ask → price test
→ close. Log the change in `docs/PITCH_PROMPTS.md`.

## Handoff signals you must send

- **H1 done → Voice:** "LLM proxy is responding with valid SSE; here's the
  curl reproducer."
- **H2 done → Voice:** "Custom LLM proxy is live at `:3001/v1/chat/completions`,
  point Agora's `llm.url` at your cloudflared URL of it."
- **H3 done → UI:** "All clinic endpoints are live; here are the routes you
  can hit from the dashboard. Seed has been run; expect 5 contacts, 3 bookings,
  ~50% slot fill."
- **H4 done → UI:** "Booking confirm + email pipeline is real. You can call
  `/api/bookings/confirm` from a test page if you want a flash highlight."
- **H5 → Pitcher:** "Sofia's prompt is locked. If she still hallucinates on
  X, here's the workaround / the answer is in [CONTEXT key]."

## At-a-glance checklist

- [ ] H0: Capella cluster + 6 collections + vector index built
- [ ] H1: SSE spike works; first vector search returns a chunk
- [ ] H2: LLM proxy streaming + RAG injection working
- [ ] H3: 🛑 Integration gate passed; `seed:clinic` populated
- [ ] H4: Hold → confirm → Resend email + handoff records all real
- [ ] H5: Sofia prompt tuned, hallucination-free in 5 test calls
- [ ] H6: API deployed to Railway; Capella in cloud serves prod traffic
- [ ] H7: Backend frozen; sit with Pitcher; patch prompts on demand
