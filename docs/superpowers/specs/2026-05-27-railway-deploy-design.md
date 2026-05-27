# Deploy `apps/api` to Railway (replace cloudflared)

**Status:** Approved 2026-05-27
**Branch:** `Charles-cloud`
**Owner:** Charles

## Problem

Agora's Conversational AI Engine runs in Agora's cloud. On every turn it calls into our API at two endpoints:

1. `LLM_PROXY_URL` → `POST /v1/chat/completions` ([apps/api/src/routes/llm.ts](../../../apps/api/src/routes/llm.ts))
2. The MCP server URL → `POST /mcp` ([apps/api/src/routes/mcp.ts](../../../apps/api/src/routes/mcp.ts))

Today these only exist on `localhost:3001`, so we expose them with a `cloudflared tunnel` to a `*.trycloudflare.com` URL. That URL is ephemeral, dies with the tunnel process, and needs to be pasted back into both `.env` (`LLM_PROXY_URL`) and the Agora Studio MCP integration every time it changes. It is the wrong shape for anything beyond a single dev session.

(Note: the Agora MCP at `https://mcp.agora.io` is a docs-lookup server for AI coding assistants. It does not host our backend and is not a replacement for the tunnel.)

## Goal

Give `apps/api` a permanent public HTTPS URL by deploying it to Railway, then point `LLM_PROXY_URL` and the Agora Studio MCP integration at that URL.

## Non-goals

- Deploying `apps/web` (it stays on local `pnpm dev` for the demo).
- Adding a Dockerfile or a `tsc` build step.
- CI/CD, preview environments, secrets rotation tooling.
- Fixing the `VOYAGE_EMBEDDING_DIMENSIONS=1024` vs `SUPABASE_EMBEDDING_DIMENSIONS=1536` mismatch in [.env.example](../../../.env.example) — flagged as a separate bug.

## Approach: Nixpacks build with a root `railway.json`

Railway autodetects pnpm + Node 20 via Nixpacks. A small `railway.json` at the repo root pins the install and start commands so the workspace builds the same way locally and on Railway. Workspace deps (`@riri/shared`, `@riri/personas`) resolve through pnpm without any extra config.

Alternatives considered and rejected:

- **Dockerfile** — more control, but ~50 lines to maintain for no current benefit. Easy to graduate to later without throwing this work away.
- **`tsc` build, ship compiled JS** — requires sorting out ESM `.js`-extension imports and adding a build step the project doesn't have today. Overkill for a hackathon repo that runs `tsx` at runtime.

## Components

### 1. `railway.json` (new file at repo root)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install --frozen-lockfile"
  },
  "deploy": {
    "startCommand": "pnpm --filter @riri/api start:prod",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### 2. `apps/api/package.json` — new `start:prod` script

The existing `start` script uses `tsx --env-file=../../.env src/index.ts`. Railway injects env vars directly into `process.env`, and there is no `.env` file in the container — the `--env-file` flag would crash the boot. Add a sibling script that omits the flag:

```json
"start:prod": "tsx src/index.ts"
```

Keep `dev` and `start` unchanged so local workflows are untouched.

### 3. Railway environment variables

All keys from [apps/api/src/env.ts](../../../apps/api/src/env.ts) get set in Railway → Variables. Three vars behave differently from local `.env`:

| Var | Local | Railway |
|-----|-------|---------|
| `PORT` | `3001` | **Do not set.** Railway injects its own; `z.coerce.number().default(3001)` picks it up. |
| `LLM_PROXY_URL` | `http://localhost:3001/v1/chat/completions` | `https://${{RAILWAY_PUBLIC_DOMAIN}}/v1/chat/completions` (uses Railway's variable templating so it resolves on first boot — no chicken-and-egg) |
| `WEB_BASE_URL` | `http://localhost:3000` | `http://localhost:3000` (web stays local; CORS at [apps/api/src/index.ts:38-62](../../../apps/api/src/index.ts#L38-L62) already permits localhost) |

All other secrets (Agora, Anthropic, OpenAI, Voyage, ElevenLabs, Deepgram, Resend, Supabase, clinic identity) get pasted from local `.env` into Railway → Variables 1:1.

### 4. Web → API wiring (one local env edit)

The web dashboard currently calls `http://localhost:3001` via `NEXT_PUBLIC_API_BASE_URL`. After deploy, the API no longer runs on localhost. Update the local `.env`:

```
NEXT_PUBLIC_API_BASE_URL=https://<your-app>.up.railway.app
```

Now the dashboard and Agora hit the same instance — single source of truth.

### 5. Agora Studio MCP URL (one dashboard edit)

In the Agora Console → Conversational AI Studio → Integrations → MCPs → the existing MCP server entry, change the URL from `https://<your-cloudflared>.trycloudflare.com/mcp` to `https://<your-app>.up.railway.app/mcp`. Manual one-time change. Not code.

### 6. Doc + comment cleanup

- [README.md:125-130](../../../README.md#L125-L130) — replace the "Expose the API publicly" cloudflared block with Railway deploy steps (connect repo, set env vars, get URL, paste into local `.env` and Agora Studio).
- [apps/api/src/index.ts:105](../../../apps/api/src/index.ts#L105) — remove the stale `"Reminder: expose this with cloudflared/ngrok..."` log line.
- [apps/api/src/routes/mcp.ts:17](../../../apps/api/src/routes/mcp.ts#L17) — the comment `https://<your-cloudflared>.trycloudflare.com/mcp` becomes `https://<your-app>.up.railway.app/mcp`.

## Data flow (unchanged)

The deploy does not change runtime behavior. Same routes, same dependencies, same Supabase, same Agora call into `/v1/chat/completions` and `/mcp` — just resolved through a stable Railway domain instead of a tunnel.

## Error handling

- **Boot fails** — `getEnv()` ([apps/api/src/env.ts:62-74](../../../apps/api/src/env.ts#L62-L74)) already throws with a descriptive Zod error on missing vars. Railway will log it and the restart policy retries 3× before parking.
- **CORS from local web** — already covered by the `http://localhost:3000` allow-list in [apps/api/src/index.ts:44-49](../../../apps/api/src/index.ts#L44-L49). No change needed.
- **Agora can't reach the URL** — same failure mode as today with cloudflared; surfaces as an Agora agent start error. Logs visible in Railway.

## Testing / verification

1. `GET https://<your-app>.up.railway.app/health` returns `{ ok: true, service: "Riri-api", ts: ... }`.
2. `POST https://<your-app>.up.railway.app/mcp` with a JSON-RPC `tools/list` request returns the 5 tools from [apps/api/src/routes/mcp.ts:40-158](../../../apps/api/src/routes/mcp.ts#L40-L158).
3. From local web (`pnpm dev:web` on `localhost:3000`), starting a Sofia call routes through the Railway-hosted LLM proxy — confirmed by checking Railway logs show `[llm]` traffic per turn.
4. Sofia takes the booking flow end-to-end: slots list → reserve → confirm → Resend email lands.

## Rollback

`cloudflared tunnel --url http://localhost:3001` still works. To roll back: start the tunnel, set `LLM_PROXY_URL` and the Agora Studio MCP URL back to the `*.trycloudflare.com` value. No code rollback needed (Railway changes are additive — the `start:prod` script and `railway.json` don't affect local `dev`).

## Out of scope (explicit reminders)

- Web is not deployed.
- No CI; deploys are triggered by `git push` to whatever branch Railway is watching, configured in the Railway dashboard (default: `main`, but for this branch we can point it at `Charles-cloud` initially).
- No Dockerfile. No `tsc`.
- The Voyage/Supabase embedding dim mismatch in `.env.example` is a separate bug.
