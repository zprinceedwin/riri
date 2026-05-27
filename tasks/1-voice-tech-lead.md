# Role 1 — Voice / Tech Lead

> You own Agora end-to-end and you are the integration owner. Everyone else
> writes features; you make sure they fit together and ship.

## Scope (what you own end-to-end)

- Agora Conversational AI Engine REST integration (`/v2/projects/:appid/join` /
  `/leave`).
- RTC token minting for both the human user and the agent.
- The web-side Agora SDK + RTM + stream-message transcript pipeline.
- The push-to-talk widget and its lifecycle (start → live → end → summary).
- Integration ownership: merging everyone's branches to `main` from H5 onwards.
- Deployment of the API to Railway and the web to Vercel.
- Venue WiFi smoke tests + cloudflared/ngrok tunnel for the LLM proxy.

## Not your scope (do NOT touch these)

- Couchbase queries, the LLM proxy, RAG, post-call summarizer — that's Brain.
- Dashboard layout, components, brand visuals — that's UI.
- Persona prompt content, demo script, pitch deck — Brain owns persona content,
  Pitcher owns the deck and script.

## Branch convention

`voice/<topic>` — push WIP every hour even if broken.

## Files you own

- `apps/api/src/routes/agent.ts`
- `apps/api/src/lib/agora.ts`
- `apps/api/src/lib/store.ts` (in-memory session map)
- `apps/web/lib/agora.ts`
- `apps/web/components/PushToTalk.tsx`
- `apps/web/components/AgentStateBadge.tsx`
- Deployment configs: `apps/api/Dockerfile`, `apps/api/railway.json`,
  `apps/web/vercel.json`, `apps/web/next.config.mjs`.

## Files you must NOT touch

- `apps/api/src/routes/{llm,calls,ingest,slots,bookings,contacts,handoffs,catalog}.ts`
- `apps/api/src/lib/{couchbase,rag,openai,resend,clinic-catalog,chunk,scrape}.ts`
- `apps/api/src/seed/*`
- Dashboard pages and clinic components (`apps/web/app/page.tsx`,
  `apps/web/app/summary/*`, `apps/web/components/Calendar*`,
  `apps/web/components/Pipeline*`, `apps/web/components/Stats*`,
  `apps/web/components/PendingHandoff*`, `apps/web/components/LeadScore*`).
- Persona JSON files in `packages/personas/`.
- Demo script, pitch deck.

## Hour-by-hour tasks

### H0 (8:30–10:30 AM, pre-build during sponsor talks)

- [ ] Confirm Agora Console access: app ID, app certificate, customer ID,
      customer secret all populated in `.env`.
- [ ] Sanity-check Agora Convo AI quota and supported regions (Manila/Singapore).
- [ ] `pnpm install` clean from a fresh clone in your branch.
- [ ] Curl test: mint an RTC token locally; verify it parses.
- [ ] Read the `riri_context` plumbing in `apps/api/src/lib/agora.ts` so you
      know exactly what Brain's proxy will receive.

### H1 (10:30–11:30 AM)

- [ ] First end-to-end Agora agent join via curl against your local
      `/api/agent/start`. Use a junk LLM URL pointing at httpbin or similar —
      Brain doesn't need to be ready yet, you're just testing the Agora REST
      handshake.
- [ ] Verify the agent UID + human UID setup mints two valid tokens for the
      same channel.
- [ ] Push `voice/wip-agent-start` to keep the team unblocked.

### H2 (11:30 AM–12:30 PM, working lunch)

- [ ] Once Brain has the LLM proxy responding at `localhost:3001/v1/chat/completions`,
      set `LLM_PROXY_URL` in `.env` and re-join with your own real URL via
      cloudflared.
- [ ] Verify Agora can actually reach the cloudflared URL — call from the Agora
      Console diagnostics if available, or just listen to the agent's
      first response.
- [ ] Confirm `riri_context.knownContact` flows through (Brain logs will show
      it).

### H3 (12:30–1:30 PM) — INTEGRATION GATE

- [ ] Wire the web SDK fully in `apps/web/lib/agora.ts`: join channel,
      subscribe to remote audio, subscribe to RTM stream-message for
      transcripts.
- [ ] Confirm `TRANSCRIPT_UPDATED`-equivalent events fire and render in
      `TranscriptPanel`. Coordinate with UI on the wire format.
- [ ] **🛑 1:30 PM HARD GATE — verify together with Brain + UI:** press the
      gold button on the dashboard, hear Sofia, watch transcript appear,
      stop cleanly, land on summary page. **If broken, kill all V1 work.**

### H4 (1:30–2:30 PM)

- [ ] Defensive teardown: `stopConvoAgent` must handle 404s gracefully (already
      does — don't regress). Test by pressing End Call twice rapidly.
- [ ] Test interruption: user starts talking while Sofia is talking — Agora
      should yield within ~650ms. Tune `idle_timeout` or `interrupt_threshold`
      if not.
- [ ] Lock the "pre-loaded caller" toggle wire: confirm `phone` in the
      `/start` request reaches `agent.ts` and the contact lookup returns
      the expected `knownContact`.

### H5 (2:30–3:30 PM) — V0 BULLETPROOF DEADLINE

- [ ] V0 stable on local. Stop writing features.
- [ ] **From this hour on, you are pure integration owner.** No new code unless
      it's a fix for a `main`-blocker.
- [ ] Help Pitcher record the backup demo video at 3:30 sharp (run the demo
      end-to-end so they can OBS-record it).

### H6 (3:30–5:30 PM)

- [ ] Deploy API to Railway. Set every env var from `.env.example` in the
      Railway dashboard. Triple-check `LLM_PROXY_URL` points to the Railway
      public URL (not localhost).
- [ ] Deploy web to Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to the Railway URL.
- [ ] Run the demo flow on the deployed URLs from a clean incognito browser.
- [ ] If venue WiFi is iffy, fall back to the cloudflared tunnel from a
      laptop — confirm the public URL works for outsiders.
- [ ] Cut V1 stretch work at 5:00 PM hard. Merge what's solid; revert what
      isn't.

### H7 (5:30–6:30 PM)

- [ ] 3 demo rehearsals on real venue WiFi, end-to-end with Pitcher.
- [ ] Have the cloudflared backup tunnel command in your terminal scrollback
      ready to copy-paste if the deployed URL flakes mid-demo.
- [ ] Be on the laptop during the actual pitch — you operate the dashboard,
      Pitcher delivers the words.

## Definition of done — per phase

| Phase | DoD |
|-------|-----|
| H1 | Curl join against Agora Convo AI returns an agent_id |
| H2 | Agent's first LLM response audibly plays through your speakers |
| H3 | Browser button → Sofia speaks → transcript renders → end → summary loads |
| H4 | Interruption works; double end-call doesn't crash; phone lookup wired |
| H5 | V0 demo flow stable on local; backup video recorded |
| H6 | Deployed URLs run the same demo flow as local |
| H7 | 3 rehearsals on venue WiFi, all passing |

## Common pitfalls (learn from these)

- **Agora's `llm.url` MUST be publicly reachable.** localhost will silently fail.
  Always run cloudflared or ngrok during local dev.
- **Two distinct UIDs.** The agent (1001) and the human (1002) need different
  UIDs in the same channel, with separate tokens. Sharing a UID throws.
- **`api_key` for the proxy can't be empty.** Agora forwards it as a header;
  we set "Riri-internal" as a placeholder.
- **Tear down before the channel expires.** RTC tokens expire after 1 hour;
  if a demo runs that long, mint a fresh one.
- **CORS at deploy.** Vercel + Railway are different origins. Confirm the API's
  CORS allows the Vercel URL after deploy.
- **`enable_string_uid: false`.** Agora's REST expects numeric UIDs in the
  RTC token; mixing string and number throws.

## Handoff signals you must send

- **H2 done → Brain:** "LLM proxy URL is alive at <cloudflared URL>, set
  `LLM_PROXY_URL=<...>` in your `.env`."
- **H3 done → Pitcher:** "Integration is green, full demo flow works."
- **H5 done → Pitcher:** "V0 stable, ready to record backup video now."
- **H6 done → Pitcher:** "Production URL is <Vercel URL>, smoke-tested, demo
  ready against real venue WiFi."
- **H6 done → Brain + UI:** "Both deploys live, both ENVs set, no further
  feature merges until after the pitch."

## At-a-glance checklist

- [ ] H0: Agora creds in `.env`, dependencies installed, token mint sanity test
- [ ] H1: First successful curl to Agora `/join`
- [ ] H2: LLM URL public via cloudflared and reachable by Agora
- [ ] H3: 🛑 Integration gate passed (button → Sofia → transcript → summary)
- [ ] H4: Interruption + double-end + contact-lookup hardened
- [ ] H5: V0 frozen on local; help Pitcher capture backup video
- [ ] H6: Railway + Vercel deploys live with all env vars; URLs smoke-tested
- [ ] H7: 3 venue-WiFi rehearsals; backup tunnel pre-staged in terminal
- [ ] 7:15 PM: Hands on the laptop, Pitcher on the mic, dashboard reveal cued
