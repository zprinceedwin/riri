# Deploy `apps/api` to Vercel (replace cloudflared)

**Status:** Approved 2026-05-27 (pivoted from Railway → Vercel mid-execution)
**Branch:** `Charles-cloud`
**Owner:** Charles

## Problem

Agora's Conversational AI Engine runs in Agora's cloud. On every turn it calls into our API at two endpoints:

1. `LLM_PROXY_URL` → `POST /v1/chat/completions` ([apps/api/src/routes/llm.ts](../../../apps/api/src/routes/llm.ts))
2. The MCP server URL → `POST /mcp` ([apps/api/src/routes/mcp.ts](../../../apps/api/src/routes/mcp.ts))

Today these only exist on `localhost:3001`, exposed via a `cloudflared tunnel` to an ephemeral `*.trycloudflare.com` URL. That URL dies with the tunnel process and needs to be pasted back into `.env` and the Agora Studio MCP integration every time it changes.

(Note: `https://mcp.agora.io` is a docs-lookup MCP server for AI coding assistants. It does not host our backend and is not a replacement for the tunnel.)

## Goal

Give `apps/api` a permanent public HTTPS URL by deploying it to Vercel, then point `LLM_PROXY_URL` and the Agora Studio MCP integration at that URL.

## Non-goals

- Deploying `apps/web` (it stays on local `pnpm dev` for the demo).
- Adding a `tsc` build step — `tsx` and Vercel's bundler handle TS at deploy time.
- CI/CD, preview environments, secrets rotation tooling.
- Fixing the `VOYAGE_EMBEDDING_DIMENSIONS=1024` vs `SUPABASE_EMBEDDING_DIMENSIONS=1536` mismatch in [.env.example](../../../.env.example) — flagged as a separate bug.

## Why Vercel (and what you give up)

The user chose Vercel after seeing the tradeoffs. Two real costs:

- **Cold starts** add ~0.5–1.5s to the first request after idle. Agora calls `/v1/chat/completions` every conversational turn, so the first turn after silence will feel slower than the README's "sub-650ms" claim. Always-warm hosts like Railway avoid this.
- **`maxDuration` cap.** Vercel Hobby caps function duration at **10 seconds**. SSE streams from `/v1/chat/completions` longer than that are killed. Pro raises this to 60s default (300s with config). The deploy still works on Hobby — long-completion turns just fail. Documented as a known limitation.

A third practical wrinkle: Vercel has no equivalent of Railway's `${{ RAILWAY_PUBLIC_DOMAIN }}` deploy-time template, so `LLM_PROXY_URL` requires a two-step deploy dance (deploy → grab URL → set env → redeploy).

## Approach

Vercel's "Other" project preset + a repo-root `api/index.ts` Vercel entrypoint + a catch-all rewrite in `vercel.json`. The existing Hono app is reused as-is — we just expose it through `hono/vercel`'s `handle()` instead of `@hono/node-server`'s `serve()`. Local Node dev (`pnpm dev`) is preserved untouched.

Alternatives considered and rejected:

- **Set Vercel Root Directory to `apps/api`** — breaks because the pnpm workspace root (`pnpm-workspace.yaml` and `packages/`) live above that directory and Vercel only uploads files inside Root Directory. Putting the entrypoint at the repo root sidesteps this.
- **Edge runtime** — the code uses `Buffer`, the `openai` SDK, `@supabase/supabase-js` — all Node-only. Node runtime, not Edge.
- **Compile to JS first** — adds a `tsc` build step the project doesn't have today. Vercel bundles `tsx` source files natively for serverless functions.

## Components

### 1. Refactor `apps/api/src/index.ts` (split into two files)

Today [apps/api/src/index.ts](../../../apps/api/src/index.ts) does two things: it constructs the Hono `app` (routes, middleware, error handler) AND calls `serve()` to start a Node HTTP listener. The Vercel function only needs the constructed `app`; the `serve()` call is irrelevant in a serverless context.

- **New file `apps/api/src/server.ts`** — exports `app`. Everything from the current `index.ts` *except* the `serve()` call and the port resolution.
- **Updated `apps/api/src/index.ts`** — imports `app` from `./server.js`, then calls `serve()` for local Node dev. Unchanged behavior locally; trivially shorter file.

### 2. `api/index.ts` at the repo root (Vercel entrypoint)

Vercel auto-discovers `api/*.ts` as serverless functions. The file:

```typescript
import { handle } from "hono/vercel";
import { app } from "../apps/api/src/server.js";

export const config = { runtime: "nodejs" };

export default handle(app);
```

That's the entire integration surface.

### 3. `vercel.json` at the repo root

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "pnpm install --frozen-lockfile",
  "rewrites": [
    { "source": "/(.*)", "destination": "/api" }
  ]
}
```

The catch-all rewrite routes every path (`/health`, `/mcp`, `/v1/chat/completions`, `/api/agent/start`, …) to the single `api/index.ts` function, which delegates to Hono's path matching. Vercel rewrites are transparent — Hono sees the original request URL.

### 4. Delete `railway.json`

Removed from the prior Railway iteration — Vercel doesn't read it.

### 5. Vercel environment variables

All keys from [apps/api/src/env.ts](../../../apps/api/src/env.ts) get set in Vercel → Project Settings → Environment Variables. Three behave differently from local `.env`:

| Var | Local | Vercel |
|-----|-------|--------|
| `PORT` | `3001` | **Do not set.** Vercel functions don't bind a port. |
| `LLM_PROXY_URL` | `http://localhost:3001/v1/chat/completions` | After first deploy: `https://<your-app>.vercel.app/v1/chat/completions` (literal — no template syntax available) |
| `WEB_BASE_URL` | `http://localhost:3000` | `http://localhost:3000` (web stays local; CORS code at [apps/api/src/index.ts:38-62](../../../apps/api/src/index.ts#L38-L62) — soon at `server.ts` — already permits localhost) |

All other secrets (Agora, Anthropic, OpenAI, Voyage, ElevenLabs, Deepgram, Resend, Supabase, clinic identity) get pasted from local `.env` into Vercel 1:1.

### 6. Web → API wiring (one local env edit)

After first deploy, update local `.env`:

```
NEXT_PUBLIC_API_BASE_URL=https://<your-app>.vercel.app
```

Now the dashboard and Agora hit the same instance.

### 7. Agora Studio MCP URL (one dashboard edit)

In Agora Console → Conversational AI Studio → Integrations → MCPs, change the existing MCP server URL to `https://<your-app>.vercel.app/mcp`.

### 8. Doc + comment cleanup

- [README.md:125-136](../../../README.md#L125-L136) — replace the Railway block (from the Railway iteration of this branch) with Vercel deploy steps including the two-step `LLM_PROXY_URL` dance.
- [apps/api/src/routes/mcp.ts:17](../../../apps/api/src/routes/mcp.ts#L17) — comment URL pattern: `https://<your-app>.vercel.app/mcp`.

## Data flow (unchanged)

Same routes, same dependencies, same Supabase, same Agora call into `/v1/chat/completions` and `/mcp`. The transport layer becomes a Vercel serverless function instead of a Node HTTP server.

## Streaming behavior

`/v1/chat/completions` streams SSE via `streamSSE()`. Hono's response is a Web `Response` with a `ReadableStream` body. Vercel's Node runtime forwards Web Response streams to the client correctly. Subject to the `maxDuration` cap (see "Why Vercel" above).

## Error handling

- **Boot fails** — `getEnv()` ([apps/api/src/env.ts:62-74](../../../apps/api/src/env.ts#L62-L74)) throws on missing vars. On Vercel this surfaces as a function invocation error in the deploy log and a 500 to the caller.
- **CORS from local web** — already covered by the localhost allow-list, unchanged.
- **Function timeout** — Hobby caps at 10s. The known limitation; bump via `vercel.json`'s `functions.<file>.maxDuration` only on Pro+.

## Testing / verification

1. `GET https://<your-app>.vercel.app/health` returns `{ ok: true, service: "Riri-api", ts: ... }`.
2. `POST https://<your-app>.vercel.app/mcp` with `{"jsonrpc":"2.0","id":1,"method":"tools/list"}` returns the 5 MCP tools.
3. From local web on `localhost:3000`, starting a Sofia call routes through the Vercel-hosted LLM proxy — confirmed by checking Vercel → Logs.
4. Sofia takes the booking flow end-to-end.

## Rollback

The cloudflared script still works: `cloudflared tunnel --url http://localhost:3001`. To roll back: start the tunnel, set `LLM_PROXY_URL` and the Agora Studio MCP URL to the tunnel URL. No code rollback needed — the refactor of `index.ts` into `server.ts + index.ts` is host-neutral.

## Out of scope (explicit reminders)

- Web is not deployed.
- No CI; deploys are triggered by `git push` to whatever branch Vercel watches.
- No Dockerfile. No `tsc` step. No Edge runtime.
- The Voyage/Supabase embedding dim mismatch in `.env.example` is a separate bug.
