# Brain / Backend — To-Dos

Derived from [`2-brain-backend.md`](2-brain-backend.md).

**Status as of 2026-05-27:** the backend code is already implemented end-to-end. The remaining work is **environment setup** (one Supabase secret + API keys) plus **verification once env is live**. See [Supabase setup walkthrough](#supabase-setup-walkthrough) at the bottom.

**Data layer migrated from Couchbase Capella → Supabase Postgres + pgvector** (2026-05-27). The Supabase project `Riri-hackathon` (ref `fubjaujicmgvfahycgyg`, region `ap-southeast-1`) is already provisioned and the schema is applied — see [`infra/supabase-schema.md`](../infra/supabase-schema.md). All you need to do is paste the `service_role` key.

Supabase JS SDK reference: https://supabase.com/docs/reference/javascript
pgvector docs: https://github.com/pgvector/pgvector

### Cross-impact from Voice/Tech Lead (2026-05-27)

Voice landed changes today that touch the API process but stay in their scope — full report in [`1-voice-tech-lead-UPDATES.md`](updated/1-voice-tech-lead-UPDATES.md). Two items affect Brain's work:

1. **CORS is now strict in production.** [`apps/api/src/index.ts`](../apps/api/src/index.ts) blocks unrecognized origins when `NODE_ENV=production`. Means the H6 Railway env *must* have `WEB_BASE_URL` pointing at the actual Vercel URL or the browser will be blocked. New H6 to-do added below. Dev is unaffected (all origins pass).
2. **Two new debug endpoints exist** on the API (Voice owns them, but Brain can call them during verification):
   - `GET /api/agent/status/:agentId` — Agora-side agent state (IDLE/STARTING/RUNNING/STOPPING/...)
   - `GET /api/agent/sessions` — every active session with age
   Use these in H1/H3/H5 instead of grepping logs when a flow looks stuck. Also useful for auditing the **20 concurrent agent PCU cap** before/after seed reruns.

Other Voice changes (`turn_detection`, `silence_config`, `idle_timeout` 120→30s in [`packages/shared/src/index.ts`](../packages/shared/src/index.ts), web-side reconnect UX) have **no impact on Brain code** — `idleTimeoutSec` is only consumed in [`apps/api/src/lib/agora.ts`](../apps/api/src/lib/agora.ts) which Brain doesn't touch.

Legend:
- ✅ **Code-complete** — implemented and typechecked (`apps/api` typecheck passes)
- 👤 **Needs you** — external account, paid key, or hand-off; I cannot do this
- ⏳ **Verify after env** — can be checked once `.env` is filled and Supabase is reachable

---

## H0 — Infra bootstrap (8:30–10:30 AM)

Most of the database side was done via the Supabase MCP — project provisioned, pgvector enabled, schema applied, RPC + atomic-reserve helpers in place. What's left for you:

- [x] ✅ Supabase project `Riri-hackathon` created (ref `fubjaujicmgvfahycgyg`, region `ap-southeast-1`)
- [x] ✅ pgvector extension enabled
- [x] ✅ Schema migration `riri_schema_v1` applied — 6 tables, HNSW vector index, `match_knowledge` RPC, RLS locked on every table
- [x] ✅ `match_knowledge` function search_path hardened (advisor `function_search_path_mutable` resolved)
- [ ] 👤 **Grab `service_role` key** from https://supabase.com/dashboard/project/fubjaujicmgvfahycgyg/settings/api — "Reveal" under *service_role secret*, paste into `.env` as `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 👤 Get `OPENAI_API_KEY` from https://platform.openai.com (or whatever LLM/embeddings provider you choose — schema is currently 1536-dim, match it)
- [ ] 👤 Get `ELEVENLABS_API_KEY` from https://elevenlabs.io (or whatever TTS vendor you pick — see Agora docs for supported list)
- [ ] 👤 Get `DEEPGRAM_API_KEY` from https://console.deepgram.com (or whatever ASR vendor you pick)
- [ ] 👤 Get `RESEND_API_KEY` from https://resend.com
- [ ] 👤 Confirm `.env` is filled (auto-created from `.env.example` — `SUPABASE_URL` is already pre-filled with the project URL)
- [ ] ⏳ Run one ingest to verify the vector index is usable: `pnpm seed:clinic` then `curl :3001/api/slots?from=...&to=...`

## H1 — First end-to-end signal (10:30–11:30 AM)

- [x] ✅ `POST /api/ingest/text` implemented — [apps/api/src/routes/ingest.ts:59](../apps/api/src/routes/ingest.ts#L59)
- [x] ✅ Vector search wired (pgvector cosine via `match_knowledge` RPC) — [apps/api/src/lib/supabase.ts:104](../apps/api/src/lib/supabase.ts#L104)
- [x] ✅ SSE streaming spike against `/v1/chat/completions` — [apps/api/src/routes/llm.ts:183](../apps/api/src/routes/llm.ts#L183)
- [ ] ⏳ Run ingest once → confirm one chunk lands in `knowledge`
- [ ] ⏳ Run vector search once → confirm the inserted chunk is returned
- [ ] ⏳ After Voice starts the first agent: `curl :3001/api/agent/sessions | jq .` → confirm one session is alive (sanity that the LLM proxy URL Voice configured actually points back to us)
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
- [x] ✅ `POST /api/slots/reserve` returns held slot via atomic UPDATE WHERE — [apps/api/src/routes/slots.ts:37](../apps/api/src/routes/slots.ts#L37), [apps/api/src/lib/supabase.ts:245](../apps/api/src/lib/supabase.ts#L245)
- [x] ✅ Concurrent reserve from different `callId` returns `slot_taken_concurrent` — [apps/api/src/lib/supabase.ts:275](../apps/api/src/lib/supabase.ts#L275)
- [ ] ⏳ Run `pnpm seed:clinic` once `.env` is filled; eyeball the row counts
- [ ] ⏳ Tail `/v1/chat/completions` once → confirm `AVAILABLE_SLOTS` and `CONTACT` blocks appear in the injected system prompt
- [ ] ⏳ Hit `/api/slots/reserve` twice concurrently with different `callId`s; confirm one wins, one gets `slot_taken_concurrent`
- [ ] 👤 **🛑 1:30 PM HARD GATE — demo flow end-to-end with Voice + UI**
- [ ] 👤 **Signal UI**: "All clinic endpoints live; seed run — 5 contacts, 3 bookings, ~50% slot fill"
- [ ] 👤 **Signal Story**: "`seed:clinic` is wired against your v1 content — ping me when strings change"

## H4 — Booking + email + summarizer (1:30–2:30 PM)

- [x] ✅ `POST /api/bookings/confirm` implemented — [apps/api/src/routes/bookings.ts:39](../apps/api/src/routes/bookings.ts#L39)
- [x] ✅ Idempotent on phone (existing contact updated, not duplicated) — [bookings.ts:49-73](../apps/api/src/routes/bookings.ts#L49-L73)
- [x] ✅ Atomic slot flip to 'booked' as primitive — [apps/api/src/lib/supabase.ts:303](../apps/api/src/lib/supabase.ts#L303)
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
- [ ] ⏳ Measure vector search latency under live load (target < 250 ms; if higher: drop top-k → 3 or tune the HNSW `ef_search` via `SET LOCAL hnsw.ef_search = N` before the RPC)
- [ ] ⏳ Pre-warm Supabase with 5 dummy RAG queries (free-tier projects can cold-pause after ~7 days idle)
- [ ] ⏳ Before backup-video recording: `curl :3001/api/agent/sessions` → kill any orphans (PCU=20 cap; Voice's endpoint surfaces them)
- [ ] 👤 Be ready to defend / reseed seed data while Voice + Story capture the backup video at 3:30
- [ ] 👤 **Signal Story**: "Sofia's prompt is locked from your last edit — if she hallucinates on X, answer is in [CONTEXT key]"

## H6 — Deploy (3:30–5:30 PM)

- [ ] 👤 Deploy API to Railway with Voice
- [ ] 👤 Verify Railway env: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set (Supabase auto-allows all egress; no IP allowlist needed)
- [ ] 👤 Verify Railway env: `OPENAI_SUMMARY_MODEL=gpt-4o`
- [ ] 👤 Verify Railway env: `WEB_BASE_URL` set to the deployed Vercel URL (CORS now strict in prod — see Voice's update note)
- [ ] 👤 Re-run `pnpm seed:clinic` against deployed API's env (local run is fine — same Supabase project)
- [ ] ⏳ Post-deploy: `curl <railway-url>/api/agent/sessions` → confirm empty (no orphaned agents eating the PCU=20 budget)
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

- [x] Workspace deps installed and `couchbase` dep removed (`pnpm install` ran clean — no CMake needed; supabase-js is pure JS)
- [x] `apps/api` typecheck passes with 0 errors after the Supabase swap (apps/web still has 3 pre-existing errors in `lib/agora.ts` — UI/Voice scope, unrelated)
- [x] Supabase project + schema provisioned via MCP — only the service_role key is blocked on you

## What I can do once you finish H0 (credentials in `.env`)

- Run `pnpm seed:clinic` and confirm row counts via `SELECT count(*)` (or the `mcp__claude_ai_Supabase__execute_sql` tool I have)
- Start the API (`pnpm dev:api`) and hit the endpoints with curl to verify each contract
- Measure pgvector latency
- Run the concurrent-reserve race test against `match_knowledge` + `reserveSlot`

---

## Supabase setup walkthrough

90% of this was done for you via the Supabase MCP. The only step you need is grabbing one secret.

### What's already provisioned

- Project: `Riri-hackathon` in `ap-southeast-1` (Singapore — closest free-tier region to Manila)
- pgvector extension enabled
- 6 tables created with RLS locked down (backend uses service_role → bypasses RLS)
- HNSW vector index on `knowledge.embedding`
- `match_knowledge` RPC for vector search (cosine, with namespace filter)
- Atomic slot reservation primitive (`UPDATE WHERE status='available'`) — replaces Couchbase CAS
- Schema doc: [`infra/supabase-schema.md`](../infra/supabase-schema.md)

### What you need to do

1. Open https://supabase.com/dashboard/project/fubjaujicmgvfahycgyg/settings/api
2. Under "Project API keys" find **service_role** (NOT "anon public")
3. Click **Reveal** → copy
4. Open `.env` (already created from the template) → replace `paste_service_role_key_here` with the value you copied
5. Fill in the other API keys (`OPENAI_API_KEY`, `RESEND_API_KEY`, etc.)
6. Tell me — I'll run the seed + smoke tests via MCP

### Smoke test (after `.env` is filled)

```powershell
pnpm seed:clinic
pnpm dev:api

# in another terminal:
curl "http://localhost:3001/api/slots?from=2026-05-27T00:00:00Z&to=2026-06-10T00:00:00Z"
# expect ~100 rows
```

### Common gotchas

- **`service_role` vs `anon`.** Backend MUST use service_role; anon will be silently blocked by RLS on every write.
- **Embedding dim must match column.** Schema is `vector(1536)`. If you swap to a non-1536 embedding provider, see [`infra/supabase-schema.md`](../infra/supabase-schema.md) for the one-liner `ALTER TABLE` migration.
- **Free-tier auto-pause.** Supabase pauses free-tier projects after ~7 days of inactivity. If you come back to a "paused" status, the first request will fail; un-pause via the dashboard (or I can do it with the MCP `restore_project` tool).

---

## Files I own — keep these green

Routes: [`llm.ts`](../apps/api/src/routes/llm.ts) · [`calls.ts`](../apps/api/src/routes/calls.ts) · [`ingest.ts`](../apps/api/src/routes/ingest.ts) · [`slots.ts`](../apps/api/src/routes/slots.ts) · [`bookings.ts`](../apps/api/src/routes/bookings.ts) · [`contacts.ts`](../apps/api/src/routes/contacts.ts) · [`handoffs.ts`](../apps/api/src/routes/handoffs.ts) · [`catalog.ts`](../apps/api/src/routes/catalog.ts) · [`personas.ts`](../apps/api/src/routes/personas.ts)

Libs: [`supabase.ts`](../apps/api/src/lib/supabase.ts) · [`rag.ts`](../apps/api/src/lib/rag.ts) · [`openai.ts`](../apps/api/src/lib/openai.ts) · [`resend.ts`](../apps/api/src/lib/resend.ts) · [`clinic-catalog.ts`](../apps/api/src/lib/clinic-catalog.ts) · [`chunk.ts`](../apps/api/src/lib/chunk.ts) · [`scrape.ts`](../apps/api/src/lib/scrape.ts)

Seed (code only — prose is Story's): [`seed-company.ts`](../apps/api/src/seed/seed-company.ts) · [`seed-prospect.ts`](../apps/api/src/seed/seed-prospect.ts) · [`seed-clinic.ts`](../apps/api/src/seed/seed-clinic.ts)

## Do NOT touch

- `apps/api/src/routes/agent.ts`, `apps/api/src/lib/agora.ts`, `apps/api/src/lib/store.ts` (Voice)
- Anything under `apps/web/` (UI)
- `packages/personas/sofia.json`, `jordan.json`, `mike.json` (Story)
- Prose strings in `seed-clinic.ts` and `description`/`bio` fields in `clinic-catalog.ts` (Story)
- `docs/DEMO_SCRIPT.md`, `docs/PITCH_PROMPTS.md`, pitch deck (Story)
