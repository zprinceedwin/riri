# Brain / Backend — To-Dos

Derived from [`2-brain-backend.md`](2-brain-backend.md).

**Status as of 2026-05-27:** the backend code is already implemented end-to-end. The remaining work is **environment setup** (Capella + API keys) plus **verification once env is live**. See [Couchbase setup walkthrough](#couchbase-capella-setup-walkthrough) at the bottom.

Couchbase Node.js SDK reference: https://docs.couchbase.com/nodejs-sdk/current/hello-world/overview.html
API ref: https://docs.couchbase.com/sdk-api/couchbase-node-client/modules.html

Legend:
- ✅ **Code-complete** — implemented and typechecked (`apps/api` typecheck passes)
- 👤 **Needs you** — external account, paid key, or hand-off; I cannot do this
- ⏳ **Verify after env** — can be checked once `.env` is filled and Capella is reachable

---

## H0 — Infra bootstrap (8:30–10:30 AM)

- [ ] 👤 Sign up for Couchbase Capella and create a cluster — see walkthrough below
- [ ] 👤 Create bucket `Riri` with default scope
- [ ] 👤 Create collection: `knowledge`
- [ ] 👤 Create collection: `calls`
- [ ] 👤 Create collection: `slots`
- [ ] 👤 Create collection: `contacts`
- [ ] 👤 Create collection: `bookings`
- [ ] 👤 Create collection: `handoffs`
- [ ] 👤 Create vector search index `riri_vector_idx` — JSON spec in [`infra/couchbase-vector-index.md`](../infra/couchbase-vector-index.md). **DO THIS FIRST.**
- [ ] 👤 Allowlist your laptop IP in Capella → Settings → Allowed IPs
- [ ] 👤 Create a DB Access user with R/W on the `Riri` bucket
- [ ] 👤 Get the `couchbases://...` connection string from Cluster → Connect
- [ ] 👤 Get `OPENAI_API_KEY` from https://platform.openai.com
- [ ] 👤 Get `ELEVENLABS_API_KEY` from https://elevenlabs.io
- [ ] 👤 Get `DEEPGRAM_API_KEY` from https://console.deepgram.com
- [ ] 👤 Get `RESEND_API_KEY` from https://resend.com
- [ ] 👤 Copy `.env.example` → `.env` and fill all keys above
- [x] ✅ `configProfile: "wanDevelopment"` is set — [apps/api/src/lib/couchbase.ts:57](../apps/api/src/lib/couchbase.ts#L57)
- [ ] ⏳ Insert one embedding by hand to verify the index is usable (use the smoke-test snippet in [`infra/couchbase-vector-index.md`](../infra/couchbase-vector-index.md))

## H1 — First end-to-end signal (10:30–11:30 AM)

- [x] ✅ `POST /api/ingest/text` implemented — [apps/api/src/routes/ingest.ts:59](../apps/api/src/routes/ingest.ts#L59)
- [x] ✅ Vector search wired — [apps/api/src/lib/couchbase.ts:148](../apps/api/src/lib/couchbase.ts#L148)
- [x] ✅ SSE streaming spike against `/v1/chat/completions` — [apps/api/src/routes/llm.ts:183](../apps/api/src/routes/llm.ts#L183)
- [ ] ⏳ Run ingest once → confirm one chunk lands in `knowledge`
- [ ] ⏳ Run vector search once → confirm the inserted chunk is returned
- [ ] 👤 **Signal Voice**: "LLM proxy responds with valid SSE — here's the curl reproducer"

## H2 — LLM proxy + RAG (11:30 AM–12:30 PM)

- [x] ✅ `/v1/chat/completions` streams OpenAI back as SSE — [apps/api/src/routes/llm.ts:76](../apps/api/src/routes/llm.ts#L76)
- [x] ✅ RAG injection: top-4 chunks prepended to system prompt — [apps/api/src/routes/llm.ts:104](../apps/api/src/routes/llm.ts#L104), [apps/api/src/lib/rag.ts](../apps/api/src/lib/rag.ts)
- [x] ✅ Sofia namespace switch (`personaId === "sofia"` → `CLINIC_DEMO_NAMESPACE`) — [apps/api/src/routes/llm.ts:126](../apps/api/src/routes/llm.ts#L126)
- [ ] 👤 **Signal Voice**: "LLM proxy live at `:3001/v1/chat/completions` — point Agora's `llm.url` at your cloudflared URL"

## H3 — Integration gate (12:30–1:30 PM) 🛑

- [x] ✅ `pnpm seed:clinic` script implemented — [apps/api/src/seed/seed-clinic.ts](../apps/api/src/seed/seed-clinic.ts)
- [x] ✅ Seed writes 14 days of slots — [seed-clinic.ts:150-203](../apps/api/src/seed/seed-clinic.ts#L150-L203)
- [x] ✅ Seed pre-books ~50% — [seed-clinic.ts:189-191](../apps/api/src/seed/seed-clinic.ts#L189-L191)
- [x] ✅ Seed writes KB chunks under `clinic-belle-manila` namespace
- [x] ✅ Seed writes 5 contacts + 3 historical bookings — [seed-clinic.ts:206-322](../apps/api/src/seed/seed-clinic.ts#L206-L322)
- [x] ✅ `AVAILABLE_SLOTS` block built for Sofia (next 14 days, top 20 available) — [apps/api/src/routes/llm.ts:201](../apps/api/src/routes/llm.ts#L201)
- [x] ✅ `CONTACT` block injected when Voice sends `knownContact` — [apps/api/src/routes/llm.ts:132](../apps/api/src/routes/llm.ts#L132)
- [x] ✅ `POST /api/slots/reserve` returns held slot via CAS — [apps/api/src/routes/slots.ts:37](../apps/api/src/routes/slots.ts#L37), [apps/api/src/lib/couchbase.ts:262](../apps/api/src/lib/couchbase.ts#L262)
- [x] ✅ Concurrent reserve from different `callId` returns `slot_taken_concurrent` — [apps/api/src/lib/couchbase.ts:291](../apps/api/src/lib/couchbase.ts#L291)
- [ ] ⏳ Run `pnpm seed:clinic` once Capella + `.env` are live; eyeball the row counts
- [ ] ⏳ Tail `/v1/chat/completions` once → confirm `AVAILABLE_SLOTS` and `CONTACT` blocks appear in the injected system prompt
- [ ] ⏳ Hit `/api/slots/reserve` twice concurrently with different `callId`s; confirm one wins, one gets `slot_taken_concurrent`
- [ ] 👤 **🛑 1:30 PM HARD GATE — demo flow end-to-end with Voice + UI**
- [ ] 👤 **Signal UI**: "All clinic endpoints live; seed run — 5 contacts, 3 bookings, ~50% slot fill"
- [ ] 👤 **Signal Story**: "`seed:clinic` is wired against your v1 content — ping me when strings change"

## H4 — Booking + email + summarizer (1:30–2:30 PM)

- [x] ✅ `POST /api/bookings/confirm` implemented — [apps/api/src/routes/bookings.ts:39](../apps/api/src/routes/bookings.ts#L39)
- [x] ✅ Idempotent on phone (existing contact updated, not duplicated) — [bookings.ts:49-73](../apps/api/src/routes/bookings.ts#L49-L73)
- [x] ✅ Slot CAS replace as atomic primitive — [apps/api/src/lib/couchbase.ts:357](../apps/api/src/lib/couchbase.ts#L357)
- [x] ✅ Resend email is best-effort, never blocks booking success — [bookings.ts:96-119](../apps/api/src/routes/bookings.ts#L96-L119)
- [x] ✅ Contact history append — [bookings.ts:122-133](../apps/api/src/routes/bookings.ts#L122-L133)
- [x] ✅ Resend pipeline with `X-Riri-Call-Id` header — [apps/api/src/lib/resend.ts:58-61](../apps/api/src/lib/resend.ts#L58-L61)
- [x] ✅ Post-call summary emits `intent`, `handoffRequired`, `handoffReason` — [apps/api/src/routes/calls.ts:165-167](../apps/api/src/routes/calls.ts#L165-L167)
- [x] ✅ Summary creates Handoff record when required — [apps/api/src/routes/calls.ts:191-206](../apps/api/src/routes/calls.ts#L191-L206)
- [x] ✅ Summary returns Sofia clinic lead fields — [apps/api/src/routes/calls.ts:236-238](../apps/api/src/routes/calls.ts#L236-L238)
- [x] ✅ Summarizer uses `response_format: { type: "json_object" }` — [apps/api/src/routes/calls.ts:140](../apps/api/src/routes/calls.ts#L140)
- [ ] ⏳ Run the full `/reserve` → `/confirm` flow; confirm slot flips to `booked` and a Booking row appears
- [ ] ⏳ Send a Resend test to Story's or your own real email; confirm HTML renders and `X-Riri-Call-Id` is present
- [ ] 👤 **Signal UI**: "Booking confirm + email pipeline real — `/api/bookings/confirm` callable from test page"

## H5 — V0 bulletproof (2:30–3:30 PM)

- [x] ✅ `AVAILABLE_SLOTS` capped to 20 (~600 tokens) — [apps/api/src/routes/llm.ts:211](../apps/api/src/routes/llm.ts#L211)
- [ ] 👤 Sit with Story; reseed and observe RAG retrieval as JSON edits land
- [ ] ⏳ Measure vector search latency under live load (target < 250 ms; if higher: top-k → 3 or raise `numCandidates`)
- [ ] ⏳ Pre-warm Capella with 5 dummy RAG queries (idle cold-starts spike to seconds)
- [ ] 👤 Be ready to defend / reseed seed data while Voice + Story capture the backup video at 3:30
- [ ] 👤 **Signal Story**: "Sofia's prompt is locked from your last edit — if she hallucinates on X, answer is in [CONTEXT key]"

## H6 — Deploy (3:30–5:30 PM)

- [ ] 👤 Deploy API to Railway with Voice
- [ ] 👤 Verify Railway env: all 6 collection names match Capella exactly
- [ ] 👤 Verify Railway env: `OPENAI_SUMMARY_MODEL=gpt-4o`
- [ ] 👤 Re-run `pnpm seed:clinic` against deployed API's env (local run is fine — same Capella)
- [ ] ⏳ Performance pass: trim system prompt if cold-start TTFT is sluggish
- [ ] ⏳ (Optional) Cache the persona system message
- [ ] ⏳ V1 stretch: live ingest moment for the pitch
- [ ] ⏳ V1 stretch: SourcesPanel population from `session.lastCitations`

## H7 — Freeze (5:30–6:30 PM)

- [ ] 👤 Stop touching the backend — hand keyboard to Voice for deploy bug-fix queue
- [ ] 👤 Sit next to Story during rehearsals
- [ ] 👤 On hallucination: Story rewrites the JSON line, you redeploy with Voice in < 60 s

---

## What I can do for you right now (no credentials needed)

- [x] Workspace deps installed (`pnpm install --ignore-scripts`)
- [x] `apps/api` typecheck passes (apps/web has 3 errors in `lib/agora.ts` — that's UI/Voice scope)
- [ ] If you want me to also build CMake-enabled deps so the Couchbase native bindings work locally, install CMake first (`winget install Kitware.CMake`), then I'll re-run `pnpm install` without `--ignore-scripts`

## What I can do once you finish H0 (credentials in `.env`)

- Run `pnpm seed:clinic` and confirm row counts
- Start the API (`pnpm dev:api`) and hit the endpoints with curl to verify each contract
- Measure vector search latency
- Run the concurrent-reserve race test

---

## Couchbase Capella setup walkthrough

This is the full "how do I create the project" answer. Roughly 15–20 min end-to-end. The vector index is the slowest step — start it first.

### 1. Account + cluster

1. Go to https://cloud.couchbase.com and sign up (Google / GitHub SSO is fine).
2. After verification you land on the **Operational** dashboard. Click **Create Cluster**.
3. Choose:
   - **Free tier** ("Capella Free") — no credit card.
   - **Provider:** AWS (cheapest), GCP, or Azure — any works.
   - **Region:** pick the one closest to where your laptop is during the hackathon. Manila → `ap-southeast-1` (Singapore) is ideal.
   - **Cluster name:** anything, e.g. `riri-hackathon`.
4. Click **Create** and wait ~3–5 min for status to flip from *deploying* → *healthy*.

### 2. Bucket + scope + collections

1. Once healthy, click into the cluster → **Data Tools** → **Buckets** → **Create Bucket**.
2. Bucket name: `Riri`. Memory quota: leave default. Click **Create**.
3. Click into bucket `Riri` → you'll see the default scope `_default`.
4. In `_default`, click **Add Collection** six times to create:
   - `knowledge`
   - `calls`
   - `slots`
   - `contacts`
   - `bookings`
   - `handoffs`

(The names must match the `COUCHBASE_COLLECTION_*` values in `.env`.)

### 3. Database Access user

1. Cluster → **Settings** → **Database Access** → **Create Database Access**.
2. Username: anything (e.g. `riri-app`). Password: generate a strong one and **save it**.
3. Bucket access: select `Riri` → **All Scopes & Collections** → **Read/Write Data**.
4. Click **Create**. Username + password go into `.env` as `COUCHBASE_USERNAME` / `COUCHBASE_PASSWORD`.

### 4. Allowed IPs

1. Cluster → **Settings** → **Allowed IPs** → **Add Allowed IP**.
2. Click **Add My IP** for your dev laptop. Hit **Confirm**.
3. (Later for Railway deploy: add `0.0.0.0/0` or the Railway egress range — Railway doesn't publish a fixed IP, so for the hackathon `0.0.0.0/0` is fine.)

Without this step the SDK errors with cryptic "unambiguous timeout / auth failure" messages.

### 5. Connection string

1. Cluster → **Connect** → **Use a driver** tab.
2. Copy the `couchbases://cb.xxxxxxxx.cloud.couchbase.com` string.
3. Goes into `.env` as `COUCHBASE_CONNECTION_STRING`.

### 6. Vector search index

This is the one that takes a few minutes — start it as soon as the cluster is healthy and let it build while you do the other steps.

1. Cluster → **Data Tools** → **Search** → **Create Search Index**.
2. Click **JSON Editor** (top-right toggle).
3. Paste the entire JSON from [`infra/couchbase-vector-index.md`](../infra/couchbase-vector-index.md) section 5. The important fields are:
   - `name`: `riri_vector_idx`
   - `sourceName`: `Riri`
   - vector field `embedding` with `dims: 1536` and `similarity: cosine`
4. Click **Create Index**.
5. Wait for status to read **Healthy** (usually 10–30 sec for an empty collection).

### 7. Wire up `.env`

```bash
cp .env.example .env
# then edit .env and fill in:
#   COUCHBASE_CONNECTION_STRING
#   COUCHBASE_USERNAME
#   COUCHBASE_PASSWORD
#   OPENAI_API_KEY
#   ELEVENLABS_API_KEY
#   DEEPGRAM_API_KEY
#   RESEND_API_KEY
# Everything else has sensible defaults.
```

### 8. Smoke test

```bash
# 1. Seed
pnpm seed:clinic

# 2. Start API
pnpm dev:api

# 3. In another terminal, sanity-check the vector index
curl http://localhost:3001/api/slots?from=2026-05-27T00:00:00Z&to=2026-06-10T00:00:00Z
# expect: { "slots": [ ...about 100 rows... ] }
```

If `/api/slots` returns an empty array but no error, the seed didn't run successfully — re-check the connection string + credentials. If you get an auth error, the IP allowlist is the usual cause.

### 9. Common gotchas

- **CMake required for `pnpm install`.** The Couchbase Node SDK has a native build step. On Windows: `winget install Kitware.CMake`. Without it, `pnpm install` fails on the `couchbase` postinstall (we worked around it locally with `--ignore-scripts`, which is fine for typecheck only — but you must do a real install before running the API).
- **`configProfile: "wanDevelopment"`** is already set in [`apps/api/src/lib/couchbase.ts:57`](../apps/api/src/lib/couchbase.ts#L57). Without it, Capella's WAN latency causes connection timeouts.
- **Index `Healthy` ≠ ready to query.** After the first seed, the index re-builds; wait ~10 sec before running a vector search or you'll get an empty result.

---

## Files I own — keep these green

Routes: [`llm.ts`](../apps/api/src/routes/llm.ts) · [`calls.ts`](../apps/api/src/routes/calls.ts) · [`ingest.ts`](../apps/api/src/routes/ingest.ts) · [`slots.ts`](../apps/api/src/routes/slots.ts) · [`bookings.ts`](../apps/api/src/routes/bookings.ts) · [`contacts.ts`](../apps/api/src/routes/contacts.ts) · [`handoffs.ts`](../apps/api/src/routes/handoffs.ts) · [`catalog.ts`](../apps/api/src/routes/catalog.ts) · [`personas.ts`](../apps/api/src/routes/personas.ts)

Libs: [`couchbase.ts`](../apps/api/src/lib/couchbase.ts) · [`rag.ts`](../apps/api/src/lib/rag.ts) · [`openai.ts`](../apps/api/src/lib/openai.ts) · [`resend.ts`](../apps/api/src/lib/resend.ts) · [`clinic-catalog.ts`](../apps/api/src/lib/clinic-catalog.ts) · [`chunk.ts`](../apps/api/src/lib/chunk.ts) · [`scrape.ts`](../apps/api/src/lib/scrape.ts)

Seed (code only — prose is Story's): [`seed-company.ts`](../apps/api/src/seed/seed-company.ts) · [`seed-prospect.ts`](../apps/api/src/seed/seed-prospect.ts) · [`seed-clinic.ts`](../apps/api/src/seed/seed-clinic.ts)

## Do NOT touch

- `apps/api/src/routes/agent.ts`, `apps/api/src/lib/agora.ts`, `apps/api/src/lib/store.ts` (Voice)
- Anything under `apps/web/` (UI)
- `packages/personas/sofia.json`, `jordan.json`, `mike.json` (Story)
- Prose strings in `seed-clinic.ts` and `description`/`bio` fields in `clinic-catalog.ts` (Story)
- `docs/DEMO_SCRIPT.md`, `docs/PITCH_PROMPTS.md`, pitch deck (Story)
