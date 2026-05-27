# Role 2 — Brain / Backend

> You own the brain: Couchbase Capella, the custom LLM proxy, the RAG pipeline,
> the clinic primitives (slot CAS, booking confirm, contacts, handoffs), the
> Resend email pipeline, the post-call summarizer, and all the seed-script
> code. If a request leaves Agora and isn't an RTC packet, it ends up in your
> code.

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
- Seed scripts (the *code*): `seed:company`, `seed:prospect`, `seed:clinic`.
  Story owns the content strings inside `seed-clinic.ts` (clinic overview,
  FAQ, objection playbook). You wire them; you reseed when they change.
- Persona registry code (`packages/personas/src/index.ts`). Content in the
  `*.json` files is Story's — you wire it.

## Not your scope

- Agora REST or RTC plumbing — Voice owns `routes/agent.ts` and `lib/agora.ts`.
- Frontend pages or components — UI owns everything under `apps/web/`.
- **Persona JSON content** (`packages/personas/*.json`) — Story.
- **Seed text strings** (`CLINIC_OVERVIEW`, `FAQ_DOC`, `OBJECTION_PLAYBOOK`
  in `seed-clinic.ts`, service `description`s and doctor `bio`s in
  `clinic-catalog.ts`) — Story. You may move them around; you may not
  edit the prose.
- Pitch deck, demo script, backup video, submission paperwork — Story.

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
- `apps/api/src/seed/seed-clinic.ts` (code structure; Story owns the prose
  inside the `CLINIC_OVERVIEW` / `FAQ_DOC` / `OBJECTION_PLAYBOOK` strings)
- `packages/personas/src/index.ts` (registry code only — JSON content is Story)
- `infra/couchbase-vector-index.md`

## Files you must NOT touch

- `apps/api/src/routes/agent.ts`, `apps/api/src/lib/agora.ts`,
  `apps/api/src/lib/store.ts` — Voice.
- Anything under `apps/web/` — UI.
- `packages/personas/sofia.json`, `jordan.json`, `mike.json` — Story.
- The prose strings inside `apps/api/src/seed/seed-clinic.ts` and the
  `description` / `bio` fields in `apps/api/src/lib/clinic-catalog.ts` —
  Story.
- `docs/DEMO_SCRIPT.md`, `docs/PITCH_PROMPTS.md`, the pitch deck — Story.

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
- [ ] Test the Resend pipeline with a real email address (Story's or your
      own). Confirm the HTML template renders and the X-Riri-Call-Id header
      is present.
- [ ] Post-call summary endpoint:
  - Emits `intent`, `handoffRequired`, `handoffReason`.
  - Creates a Handoff record if `handoffRequired` is true.
  - Returns clinic lead fields (`requestedService`, `requestedDoctor`,
    `requestedTimeWindow`) for Sofia calls.

### H5 (2:30–3:30 PM) — V0 BULLETPROOF DEADLINE

- [ ] Sit with Story during live testing of Sofia. Story edits the JSON;
      you reseed and observe how RAG retrieval responds to each change.
- [ ] Verify the AVAILABLE_SLOTS block stays under ~600 tokens (Sofia gets
      confused if it's huge).
- [ ] Vector search latency: target < 250 ms per turn. If higher, drop top-k
      to 3 or raise numCandidates.
- [ ] Pre-warm Capella by running 5 dummy RAG queries — first call after
      idle can spike to seconds.
- [ ] Help Voice + Story capture the backup video at 3:30 by being ready
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
- [ ] Sit next to Story during rehearsals. If Sofia hallucinates anything,
      Story rewrites the JSON line, you redeploy with Voice in < 60 seconds.

## Definition of done — per phase

| Phase | DoD |
|-------|-----|
| H0 | Capella cluster + 6 collections + vector index `ready` state |
| H1 | One vector search returns one chunk; SSE spike streams OpenAI tokens |
| H2 | LLM proxy streams full completions with RAG context to a real client |
| H3 | `seed:clinic` populates everything; Sofia sees slots + contact in prompt |
| H4 | Full hold → confirm flow works; Resend email arrives; handoff records create |
| H5 | RAG + AVAILABLE_SLOTS retrieval is < 250 ms; reseed loop with Story is one keystroke |
| H6 | Deployed API serves the same flow on Railway URL with Capella in cloud |
| H7 | No further backend merges; Story's rehearsals run cleanly |

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

## Working with Story (persona prompts + seed content)

Story owns every string the agent or the audience reads. You own the
plumbing. Concretely:

- Story edits `packages/personas/sofia.json` and the prose strings in
  `apps/api/src/seed/seed-clinic.ts` + `apps/api/src/lib/clinic-catalog.ts`.
- You re-run `pnpm seed:clinic` whenever Story signals "content updated".
- You're the first responder if Sofia behaves badly in dev. Most fixes are
  content fixes — push them to Story. Code-side fixes (RAG retrieval,
  injection order, prompt assembly) are yours.

When you patch Sofia at runtime (mid-rehearsal hotfix):
- Edit the persona JSON in-line on the deploy host if it's faster than a
  redeploy. The prod box reads the JSON at startup, so a redeploy is needed
  for it to take effect.
- Or: ask Story to amend the source JSON, then redeploy from `main`.

## Handoff signals you must send

- **H1 done → Voice:** "LLM proxy is responding with valid SSE; here's the
  curl reproducer."
- **H2 done → Voice:** "Custom LLM proxy is live at `:3001/v1/chat/completions`,
  point Agora's `llm.url` at your cloudflared URL of it."
- **H3 done → UI:** "All clinic endpoints are live; here are the routes you
  can hit from the dashboard. Seed has been run; expect 5 contacts, 3 bookings,
  ~50% slot fill."
- **H3 done → Story:** "`seed:clinic` is wired against your v1 content. Edit
  the strings in `seed-clinic.ts` / `sofia.json` and ping me to reseed."
- **H4 done → UI:** "Booking confirm + email pipeline is real. You can call
  `/api/bookings/confirm` from a test page if you want a flash highlight."
- **H5 → Story:** "Sofia's prompt is locked from your last edit. If she still
  hallucinates on X, the answer is in [CONTEXT key]."

## At-a-glance checklist

- [ ] H0: Capella cluster + 6 collections + vector index built
- [ ] H1: SSE spike works; first vector search returns a chunk
- [ ] H2: LLM proxy streaming + RAG injection working
- [ ] H3: 🛑 Integration gate passed; `seed:clinic` populated
- [ ] H4: Hold → confirm → Resend email + handoff records all real
- [ ] H5: Reseed loop with Story is < 60 s end-to-end; retrieval < 250 ms
- [ ] H6: API deployed to Railway; Capella in cloud serves prod traffic
- [ ] H7: Backend frozen; sit with Story; redeploy patched prompts on demand
