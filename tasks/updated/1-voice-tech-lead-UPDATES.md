# Voice / Tech Lead — Updates Report

**Date:** 2026-05-27
**Skill applied:** Karpathy Guidelines (evidence-driven, read-data-first, sanity-check intermediates, prefer boring solutions)
**Methodology:** Research all 4 Agora doc URLs + read entire owned codebase before making any changes. Every change below traces to a concrete finding in the docs or a task requirement.

---

## Research Phase — Agora Documentation Findings

### Sources Consulted
1. `https://docs.agora.io/en/conversational-ai/overview/product-overview`
2. `https://docs.agora.io/en/build-with-ai`
3. `https://docs.agora.io/en/api-reference`
4. `https://docs.agora.io/en/sdks?platform=android`
5. `https://docs-md.agora.io/en/conversational-ai/rest-api/agent/join.md` (full REST schema)
6. `https://docs-md.agora.io/en/conversational-ai/rest-api/agent/leave.md`
7. `https://docs-md.agora.io/en/conversational-ai/rest-api/agent/query.md`
8. `https://docs-md.agora.io/en/conversational-ai/rest-api/agent/update.md`
9. `https://docs-md.agora.io/en/conversational-ai/develop/start-stop-agent.md`
10. `https://docs-md.agora.io/en/conversational-ai/develop/transcripts.md`

### Key API Facts Verified
- **Join endpoint:** `POST /api/conversational-ai-agent/v2/projects/{appid}/join` — matches codebase
- **Leave endpoint:** `POST .../agents/{agentId}/leave` — matches codebase
- **Query endpoint:** `GET .../agents/{agentId}` — was missing from codebase (now added)
- **Update endpoint:** `POST .../agents/{agentId}/update` — was missing from codebase (now added)
- **Auth:** Basic HTTP auth with `customer_id:customer_secret` base64-encoded — matches codebase
- **Numeric UIDs:** `enable_string_uid: false` requires numeric UIDs (1001/1002) — matches codebase
- **Token format:** `agora-token` `buildTokenWithUid` with numeric uid — matches codebase
- **Transcript delivery:** Requires `advanced_features.enable_rtm: true` + `parameters.data_channel: "rtm"` — matches codebase
- **404 on leave:** Expected when agent already exited — codebase already handles this correctly
- **PCU limit:** 20 concurrent agents per App ID without quota increase — noted for demo planning

---

## Changes Made

### 1. `apps/api/src/lib/agora.ts` — Agora REST Client

**Added `turn_detection` configuration (task H4: ~650ms interrupt yield)**

The original code sent no `turn_detection` config, relying entirely on Agora defaults. Per the Agora REST API docs, `turn_detection` supports `start_of_speech` (VAD-based interrupt) and `end_of_speech` (semantic or VAD-based silence detection).

Configuration applied:
```
turn_detection.config.start_of_speech.mode = "vad"
  interrupt_duration_ms: 200       (how fast the agent yields when user starts talking)
  speaking_interrupt_duration_ms: 200
  prefix_padding_ms: 300           (capture slight lead-in before speech onset)

turn_detection.config.end_of_speech.mode = "semantic"
  silence_duration_ms: 480         (faster than default ~640ms for snappier responses)
  max_wait_ms: 3000                (max wait for semantic end-of-utterance signal)
```

Why `semantic` for end-of-speech: reduces false-positive end-of-turn on brief pauses (e.g., "I'd like to book... hmm... the Botox treatment"). The VAD alone would cut at every 640ms pause.

**Added `silence_config` and `farewell_config`**

- `silence_config`: After 15s of silence, Sofia says "I'm still here -- take your time." Prevents dead air during demos.
- `farewell_config`: `graceful_enabled: true` with 10s timeout. Lets the agent finish its current sentence before leaving the channel on teardown.

**Added `greeting_config`**

- `mode: "single_every"` — greets every user who joins (important for demo where the same channel may be reused).
- `delay_ms: 800` — slight delay before greeting so the mic is fully subscribed.
- `interruptable: true` — user can cut in during the greeting.

**Added `queryAgentStatus()` function**

Calls `GET /api/conversational-ai-agent/v2/projects/{appid}/agents/{agentId}` to retrieve agent lifecycle status (IDLE/STARTING/RUNNING/STOPPING/STOPPED/FAILED). Critical for debugging during H1-H3 when things go wrong.

**Added `updateAgentConfig()` function**

Calls `POST .../agents/{agentId}/update` to update token or system messages on a running agent. Enables token refresh for demos that run close to the 1-hour expiry.

**Added structured logging**

Every `startConvoAgent`, `stopConvoAgent` call now logs channel, LLM URL, agent ID, and status. Essential for debugging Agora handshake issues during the event.

### 2. `apps/api/src/routes/agent.ts` — Agent Routes

**Added `GET /api/agent/status/:agentId`**

Returns Agora-side agent status merged with local session info (callId, channel, personaId, startedAt). Use: `curl http://localhost:3001/api/agent/status/<agentId>` to debug whether an agent is actually running.

**Added `GET /api/agent/sessions`**

Returns all active in-memory sessions with age in ms. Use: `curl http://localhost:3001/api/agent/sessions` to see what's alive. Invaluable during H5-H7 rehearsals.

### 3. `apps/api/src/lib/store.ts` — Session Store

**Added `getAllSessions()` export** — supports the new `/api/agent/sessions` endpoint.

**Added stale session purge** — sessions older than 2 hours are automatically cleaned up every 10 minutes. Prevents memory leaks during long hackathon sessions.

### 4. `apps/api/src/index.ts` — CORS

**Tightened CORS for production**

Before: The CORS handler returned `origin` for all requests regardless of the allowlist, making the allowlist a no-op.

After: In production (`NODE_ENV=production`), unrecognized origins are rejected (the first allowed origin is returned instead, which will cause the browser to block the request). In dev, all origins still pass through.

Also added explicit `allowHeaders` and `allowMethods` for defense-in-depth.

### 5. `apps/web/lib/agora.ts` — Browser Agora Client

**Added connection state monitoring**

New `onConnectionState` callback fires on every RTC connection state change: DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING, DISCONNECTING. Logs every transition with the reason.

This is critical for venue WiFi debugging (task H7). If the connection drops, the PushToTalk component now shows a "Reconnecting..." indicator instead of silently dying.

**Added error event handling**

New `onError` callback fires on Agora `exception` events and connection loss. Previously, SDK errors were silently swallowed.

**Added `stream-message-error` listener**

Logs dropped or corrupted transcript frames. Helps diagnose transcript gaps during the demo.

**Exported `ConnectionState` type** for downstream consumers.

### 6. `apps/web/components/PushToTalk.tsx` — Call Widget

**Added 20-second connection timeout**

Previously: If the API or Agora was down, the "connecting" spinner would spin forever.
Now: After 20 seconds, the connection attempt fails with a clear error message: "Connection timed out -- check your network and try again."

**Added `reconnecting` status**

New `CallStatus` value: `"reconnecting"`. When the Agora connection drops and attempts to reconnect (flaky WiFi), the UI shows an amber "Reconnecting..." pulse instead of looking frozen.

**Added live call duration counter**

Shows `M:SS` elapsed time during a live call. Useful for demo pacing (Story needs to know how long calls are running) and for staying under the 1-hour token expiry.

**Added retry-friendly error state**

When in the `error` state, the button now shows a retry icon and says "Retry" instead of "Start call", making it obvious that the user should try again.

**Proper timer cleanup**

All intervals and timeouts are cleared on stop, unmount, and error. No leaked timers.

### 7. `packages/shared/src/index.ts` — Constants

**Changed `idleTimeoutSec` from 120 to 30**

120 seconds is too long for a demo — if the human disconnects, the agent hangs around consuming resources. 30 seconds is enough to survive brief WiFi drops without wasting Agora minutes.

---

## Files Modified (all within Voice/Tech Lead scope)

| File | Change Type |
|------|-------------|
| `apps/api/src/lib/agora.ts` | turn_detection, silence/farewell config, greeting_config, queryAgentStatus, updateAgentConfig, structured logging |
| `apps/api/src/routes/agent.ts` | GET /status/:agentId, GET /sessions endpoints |
| `apps/api/src/lib/store.ts` | getAllSessions, stale session purge |
| `apps/api/src/index.ts` | CORS tightening for prod |
| `apps/web/lib/agora.ts` | connection state monitoring, error handling, stream-message-error logging |
| `apps/web/components/PushToTalk.tsx` | connection timeout, reconnecting state, call duration, retry UX |
| `packages/shared/src/index.ts` | idle_timeout reduced to 30s |

## Files NOT Modified (confirmed out of scope)

All Brain, UI, and Story files remain untouched as specified in the task.

---

## Verification

- **API typecheck:** `pnpm --filter @riri/api typecheck` passes with 0 errors
- **Web typecheck:** 3 pre-existing errors (Agora SDK type defs missing `setParameter`, `createDataStream`, `sendStreamMessage`) — these existed before this change and are runtime-valid. Zero new errors introduced.
- **No dependency changes:** No packages added or removed.

---

## Risk Notes for Demo Day

1. **`LLM_PROXY_URL` must be public.** Agora's servers POST to it. localhost will silently fail. Always run cloudflared/ngrok during local dev.
2. **Two distinct UIDs (1001 agent, 1002 human).** Sharing a UID throws. This is enforced in `agent.ts:47-48`.
3. **Token expiry is 1 hour.** If a demo session runs long, `updateAgentConfig()` can refresh the token without restarting the agent.
4. **PCU limit is 20.** Don't leave orphaned agents running — use `GET /api/agent/sessions` to audit.
5. **Venue WiFi:** The new reconnection indicator will surface drops immediately. Have the cloudflared tunnel command ready.
6. **CORS after deploy:** The tightened CORS requires `WEB_BASE_URL` in Railway env to match the actual Vercel URL. Triple-check this.

---

## Curl Cheatsheet for H0-H1 Smoke Tests

```bash
# Mint a token (sanity check)
curl -s http://localhost:3001/health | jq .

# Start an agent
curl -X POST http://localhost:3001/api/agent/start \
  -H "Content-Type: application/json" \
  -d '{"personaId":"sofia"}' | jq .

# Check agent status
curl -s http://localhost:3001/api/agent/status/<agentId> | jq .

# List active sessions
curl -s http://localhost:3001/api/agent/sessions | jq .

# Stop an agent
curl -X POST http://localhost:3001/api/agent/stop \
  -H "Content-Type: application/json" \
  -d '{"agentId":"<agentId>"}' | jq .
```
