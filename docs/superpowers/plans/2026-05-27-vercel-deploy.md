# Vercel Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ephemeral `cloudflared` tunnel (and undo the in-progress Railway iteration) with a permanent Vercel-hosted public URL for `apps/api`, so Agora's Conversational AI Engine has a stable target for `/v1/chat/completions` and `/mcp`.

**Architecture:** Vercel "Other" project deploying a single Node-runtime serverless function at `api/index.ts` (repo root). The Hono app is factored into `apps/api/src/server.ts` (just the `app` instance — no `serve()`) so both local dev (`apps/api/src/index.ts` → `@hono/node-server`) and Vercel (`api/index.ts` → `hono/vercel`'s `handle()`) reuse it. A repo-root `vercel.json` runs `pnpm install --frozen-lockfile` and catch-all-rewrites every path to the single function.

**Tech Stack:** Vercel (Node 20 runtime), `hono/vercel`, pnpm workspaces, `tsx` for local dev only.

**Spec:** [docs/superpowers/specs/2026-05-27-vercel-deploy-design.md](../specs/2026-05-27-vercel-deploy-design.md)

---

## Task A: Delete `railway.json`

**Why:** Leftover from the Railway iteration of this branch. Vercel ignores it but it's misleading documentation.

**Files:**
- Delete: `railway.json`

- [ ] **Step 1: Delete the file**

```powershell
git rm railway.json
```

- [ ] **Step 2: Commit**

```powershell
git commit -m "chore: remove railway.json (pivoting to Vercel)"
```

---

## Task B: Factor `apps/api/src/index.ts` into `server.ts` + `index.ts`

**Why:** The Vercel function needs the Hono `app` instance without the `serve()` call. Local Node dev still needs `serve()`. Splitting separates "what the app is" from "how it's started," so both runtimes can share the routes/middleware/error-handler definitions.

**Files:**
- Create: `apps/api/src/server.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Create `apps/api/src/server.ts`**

This file owns the Hono `app` construction. Copy everything from the current `apps/api/src/index.ts` EXCEPT the bottom block (`const port = ...` through the end of `serve(...)`), and export `app`.

Final content of `apps/api/src/server.ts`:

```typescript
/**
 * Riri Hono app (host-neutral).
 *
 * This module constructs and configures the Hono `app` — routes, middleware,
 * error handler. It does NOT start a server. Two consumers wrap it:
 *
 *   - apps/api/src/index.ts        -> @hono/node-server `serve()` for local Node dev
 *   - api/index.ts (repo root)     -> `hono/vercel`'s `handle()` for Vercel deploys
 *
 * Routes:
 *   /api/agent/start, /api/agent/stop          -- voice agent lifecycle
 *   /api/ingest/url, /text, /prospect           -- RAG ingest
 *   /api/calls/:id/{transcript,summarize} + GET -- post-call
 *   /api/personas, /api/personas/:id            -- persona registry
 *   /api/slots, /api/slots/reserve              -- clinic slot list + CAS hold
 *   /api/bookings/confirm, /api/bookings/:id    -- booking confirmation
 *   /api/contacts, /api/contacts/by-phone/:p    -- CRM-lite caller lookup
 *   /api/handoffs                               -- human-in-the-loop escalations
 *   /api/services, /api/doctors                 -- static clinic catalog
 *   /v1/chat/completions                        -- the custom LLM proxy Agora calls
 *   /health                                     -- liveness
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getEnv } from "./env.js";
import { agentRoutes } from "./routes/agent.js";
import { ingestRoutes } from "./routes/ingest.js";
import { callRoutes } from "./routes/calls.js";
import { personaRoutes } from "./routes/personas.js";
import { llmRoutes } from "./routes/llm.js";
import { slotRoutes } from "./routes/slots.js";
import { bookingRoutes } from "./routes/bookings.js";
import { contactRoutes } from "./routes/contacts.js";
import { handoffRoutes } from "./routes/handoffs.js";
import { catalogRoutes } from "./routes/catalog.js";
import { mcpRoutes } from "./routes/mcp.js";

export const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      try {
        const env = getEnv();
        const allowed = [
          env.WEB_BASE_URL,
          "http://localhost:3000",
          "http://localhost:3001",
        ];
        if (!origin) return env.WEB_BASE_URL;
        if (allowed.includes(origin)) return origin;
        if (process.env.NODE_ENV !== "production") return origin;
        console.warn(`[cors] Blocked origin: ${origin}`);
        return allowed[0];
      } catch {
        return origin ?? "*";
      }
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "Riri-api",
    ts: new Date().toISOString(),
  })
);

app.route("/api/agent", agentRoutes);
app.route("/api/ingest", ingestRoutes);
app.route("/api/calls", callRoutes);
app.route("/api/personas", personaRoutes);
app.route("/api/slots", slotRoutes);
app.route("/api/bookings", bookingRoutes);
app.route("/api/contacts", contactRoutes);
app.route("/api/handoffs", handoffRoutes);
app.route("/api", catalogRoutes);
app.route("/v1", llmRoutes);
app.route("/mcp", mcpRoutes);

app.onError((err, c) => {
  console.error("[api] unhandled error:", err);
  return c.json({ error: "internal_error", detail: err.message }, 500);
});
```

- [ ] **Step 2: Replace `apps/api/src/index.ts` with a thin local-dev wrapper**

Final content of `apps/api/src/index.ts`:

```typescript
/**
 * Riri API server (local Node dev entrypoint).
 * Imports the host-neutral `app` from ./server and starts a Node HTTP listener.
 * On Vercel, api/index.ts (repo root) uses `hono/vercel`'s `handle()` instead.
 */
import { serve } from "@hono/node-server";
import { app } from "./server.js";
import { getEnv } from "./env.js";

const port = (() => {
  try {
    return getEnv().PORT;
  } catch {
    return Number(process.env.PORT ?? 3001);
  }
})();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Riri API listening on http://localhost:${info.port}`);
  console.log(`  health:       http://localhost:${info.port}/health`);
  console.log(`  mcp server:   POST http://localhost:${info.port}/mcp  (Agora Studio integration)`);
  console.log(`  llm proxy:    http://localhost:${info.port}/v1/chat/completions  (legacy, used only if not on Studio path)`);
  console.log(`  agent start:  POST http://localhost:${info.port}/api/agent/start`);
  console.log(`  clinic slots: GET  http://localhost:${info.port}/api/slots`);
});
```

- [ ] **Step 3: Typecheck**

```powershell
pnpm --filter @riri/api typecheck
```

Expected: exit 0, no errors.

- [ ] **Step 4: Smoke-test local dev**

```powershell
pnpm --filter @riri/api dev
```

Expected: the boot banner ("Riri API listening on http://localhost:3001" + the route summaries) prints exactly as before. Ctrl+C to stop. If it errors, the refactor broke something — fix before committing.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/server.ts apps/api/src/index.ts
git commit -m "refactor(api): split server.ts (Hono app) from index.ts (Node serve)"
```

---

## Task C: Create `api/index.ts` at the repo root (Vercel entrypoint)

**Why:** Vercel auto-discovers `api/*.ts` files at the project root as serverless functions. This is the single integration surface between Vercel and the Hono app.

**Files:**
- Create: `api/index.ts` (at the repo root — NOT inside `apps/api`)

- [ ] **Step 1: Create the file**

```typescript
/**
 * Vercel entrypoint.
 *
 * Vercel auto-discovers this file as a serverless function. The catch-all
 * rewrite in `vercel.json` routes every incoming request to /api so all
 * paths (/health, /mcp, /v1/chat/completions, /api/agent/start, ...) hit
 * this handler and get dispatched by Hono's router.
 */
import { handle } from "hono/vercel";
import { app } from "../apps/api/src/server.js";

export const config = { runtime: "nodejs" };

export default handle(app);
```

- [ ] **Step 2: Add `hono` as a direct dependency of the repo root (so Vercel installs it for `api/`)**

The `hono` package is already a dependency of `apps/api`, but Vercel sees `api/index.ts` from the repo root. Since this is a pnpm workspace and `node_modules` is hoisted via the lockfile, the import resolves — but to be safe, ensure the repo root `package.json` doesn't need its own `hono` entry. Verify by reading the existing root `package.json`:

```powershell
node -e "const p = require('./package.json'); console.log(Object.keys(p.dependencies || {})); console.log('devDeps:', Object.keys(p.devDependencies || {}))"
```

If it lists `tsx` and `typescript` only (current state), **do nothing further** — pnpm's hoisted `node_modules` will make `hono` resolvable from the repo root. If the Vercel deploy later fails with "cannot find module 'hono'", add `hono` (matching the version in `apps/api/package.json`) to the root `package.json` `dependencies` and re-run `pnpm install`.

This step is a verification only — no edits.

- [ ] **Step 3: Typecheck the whole repo**

```powershell
pnpm typecheck
```

Expected: exit 0. If `api/index.ts` has a TS error (e.g., the relative import path resolution), fix before committing.

- [ ] **Step 4: Commit**

```powershell
git add api/index.ts
git commit -m "feat: add Vercel entrypoint (api/index.ts) routing to Hono app"
```

---

## Task D: Create `vercel.json` at the repo root

**Why:** Tell Vercel how to install the workspace and to route every request to the single `api/` function instead of trying to serve static files.

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create the file**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "pnpm install --frozen-lockfile",
  "rewrites": [
    { "source": "/(.*)", "destination": "/api" }
  ]
}
```

- [ ] **Step 2: Verify the JSON parses**

```powershell
node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))"
```

Expected: no output.

- [ ] **Step 3: Commit**

```powershell
git add vercel.json
git commit -m "feat: add vercel.json (pnpm install + catch-all rewrite to /api)"
```

---

## Task E: Update `apps/api/src/routes/mcp.ts` comment

**Why:** The comment was updated to `up.railway.app` in the Railway iteration; flip it to `vercel.app`.

**Files:**
- Modify: `apps/api/src/routes/mcp.ts`

- [ ] **Step 1: Update line 17 of the JSDoc header**

The current line (set by the prior Railway commit) reads:

```typescript
 * Public URL pattern: https://<your-railway-app>.up.railway.app/mcp
```

Replace EXACTLY that line with:

```typescript
 * Public URL pattern: https://<your-app>.vercel.app/mcp
```

Preserve the leading ` * ` JSDoc prefix. Change nothing else.

- [ ] **Step 2: Typecheck**

```powershell
pnpm --filter @riri/api typecheck
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```powershell
git add apps/api/src/routes/mcp.ts
git commit -m "docs(api): switch mcp route comment from railway to vercel URL pattern"
```

---

## Task F: Rewrite README Quick Start step 5 (Railway → Vercel)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the Railway block**

In `README.md`, find the Quick Start block (the prior Railway iteration replaced lines 125–129 with a 12-line Railway block; it now starts with `# 5. Deploy the API to Railway`). Replace that entire 12-line block with EXACTLY these 13 lines (inside the powershell code fence):

```
# 5. Deploy the API to Vercel (Agora needs to reach our LLM proxy + /mcp)
# - Sign in at https://vercel.com and import this GitHub repo as a new project
# - Framework Preset: Other. Root Directory: leave blank (repo root).
# - Vercel reads vercel.json: runs `pnpm install --frozen-lockfile` and
#   serves the function at `api/index.ts`
# - In Project Settings > Environment Variables, paste every key from your local .env EXCEPT:
#     * Do NOT set PORT (Vercel functions don't bind a port)
#     * Skip LLM_PROXY_URL for the FIRST deploy
#     * Keep WEB_BASE_URL=http://localhost:3000 (web stays local for the demo)
# - Deploy. Vercel gives you https://<your-app>.vercel.app
# - Add LLM_PROXY_URL=https://<your-app>.vercel.app/v1/chat/completions to env vars and redeploy
# - Update your local .env: NEXT_PUBLIC_API_BASE_URL=https://<your-app>.vercel.app
# - In Agora Console > Conversational AI Studio > Integrations > MCPs, point the
#   server URL at https://<your-app>.vercel.app/mcp
```

Touch nothing else in the README.

- [ ] **Step 2: Confirm no stale references remain**

```powershell
git grep -n -i "railway\|cloudflared\|trycloudflare\|ngrok" README.md
```

Expected: no matches. If Railway or cloudflared mentions still appear, clean them up in the same commit.

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "docs: switch README deploy steps from Railway to Vercel"
```

---

## Task G: Push the branch

- [ ] **Step 1: Push**

```powershell
git push origin Charles-cloud
```

Expected: a fast-forward push (we already pushed the Railway iteration; this layers Vercel commits on top).

---

## Task H: Create the Vercel project (manual, in Vercel dashboard)

- [ ] **Step 1: Import the repo**

1. https://vercel.com → **Add New** → **Project**.
2. Import `zprinceedwin/riri`.
3. **Framework Preset:** Other.
4. **Root Directory:** leave blank.
5. **Build & Output Settings:** leave defaults (vercel.json overrides what matters).
6. **Production Branch:** in **Project Settings → Git**, set to `Charles-cloud` (we'll move to `main` after PR merge).
7. Do NOT click Deploy yet — set env vars first (Task I).

- [ ] **Step 2: Note the project URL pattern**

Vercel will give you a URL like `https://riri-<some-suffix>.vercel.app`. You'll see it on the project dashboard immediately after creation, before the first deploy.

---

## Task I: Set Vercel environment variables (first pass)

- [ ] **Step 1: Open Environment Variables in Project Settings**

Project → **Settings** → **Environment Variables**.

- [ ] **Step 2: Paste the bulk values**

Use the "paste .env file" button (top right of the variables panel) and paste this block, substituting `your_*_here` with the real values from your local `.env`. **Omit `LLM_PROXY_URL` for now — we'll add it after the first deploy gives us the public URL.**

```
AGORA_APP_ID=your_agora_app_id_here
AGORA_APP_CERTIFICATE=your_agora_app_certificate_here
AGORA_CUSTOMER_ID=your_agora_customer_id_here
AGORA_CUSTOMER_SECRET=your_agora_customer_secret_here

OPENAI_API_KEY=your_openai_key_here
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_SUMMARY_MODEL=gpt-4o

VOYAGE_API_KEY=your_voyage_key_here
VOYAGE_EMBEDDING_MODEL=voyage-3-large
VOYAGE_EMBEDDING_DIMENSIONS=1024

ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID_JORDAN=nPczCjzI2devNBz1zQrb
ELEVENLABS_VOICE_ID_MIKE=onwK4e9ZLuTAKqWW03F9
ELEVENLABS_VOICE_ID_SOFIA=XB0fDUnXU5powFXDhCwa

DEEPGRAM_API_KEY=your_deepgram_key_here

RESEND_API_KEY=your_resend_key_here
RESEND_FROM_EMAIL=Riri Clinic <onboarding@resend.dev>

SUPABASE_URL=https://your_project_ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

CLINIC_NAME=Belle Aesthetic Manila
CLINIC_DEMO_NAMESPACE=clinic-belle-manila
CLINIC_ADDRESS_LINE=Ground Floor, Bonifacio High Street, BGC, Taguig

WEB_BASE_URL=http://localhost:3000
```

Set scope: Production + Preview + Development (all three).

- [ ] **Step 3: Deploy**

Vercel → **Deployments** → trigger a deploy of `Charles-cloud`. Wait for it to complete. If `getEnv()` complains about a missing key, check the deploy logs, add it, redeploy.

---

## Task J: Add `LLM_PROXY_URL` and redeploy (the two-step dance)

- [ ] **Step 1: Copy the production URL**

From the deployment in Task I Step 3, copy the URL (e.g. `https://riri-<suffix>.vercel.app`).

- [ ] **Step 2: Add the env var**

Project → **Settings** → **Environment Variables** → Add:

```
LLM_PROXY_URL=https://<your-app>.vercel.app/v1/chat/completions
```

Scope: Production + Preview + Development.

- [ ] **Step 3: Redeploy**

Vercel → **Deployments** → most recent → "..." menu → **Redeploy**. Confirm. The new build will pick up `LLM_PROXY_URL`.

---

## Task K: Verify the deploy

- [ ] **Step 1: Health check**

```powershell
curl https://<your-app>.vercel.app/health
```

Expected: `{"ok":true,"service":"Riri-api","ts":"2026-..."}`. If 404 or 500, check Vercel logs.

- [ ] **Step 2: MCP tools/list**

```powershell
curl -X POST https://<your-app>.vercel.app/mcp `
  -H "Content-Type: application/json" `
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected: JSON-RPC response listing five tools — `search_clinic_kb`, `list_available_slots`, `get_contact_by_phone`, `reserve_slot`, `confirm_booking`.

- [ ] **Step 3: Confirm logs flow**

Vercel → **Logs** → tail the function. Make a curl request and confirm `[api]` / `[mcp]` log lines appear. This confirms the function is actually executing your Hono app.

---

## Task L: Wire local web to the Vercel API

**Files:**
- Modify: your local (untracked) `.env`

- [ ] **Step 1: Update `NEXT_PUBLIC_API_BASE_URL`**

In your local `.env`:

```
NEXT_PUBLIC_API_BASE_URL=https://<your-app>.vercel.app
```

- [ ] **Step 2: Restart web dev server**

```powershell
pnpm dev:web
```

Open http://localhost:3000. Stats strip should populate from the Vercel API. CORS errors → check `WEB_BASE_URL=http://localhost:3000` is set in Vercel.

---

## Task M: Repoint Agora Studio MCP at the Vercel URL

- [ ] **Step 1: Update the MCP server URL in Agora Console**

1. https://console.agora.io → **Conversational AI Studio** → **Integrations** → **MCPs**.
2. Edit the existing MCP server entry.
3. Server URL → `https://<your-app>.vercel.app/mcp`.
4. Save.

- [ ] **Step 2: End-to-end Sofia test**

1. Local web running on `localhost:3000`.
2. Pick Sofia, press push-to-talk, run a booking conversation.
3. Expect: Vercel **Logs** show `[agora]` + `[llm]` lines as the call progresses.
4. Walk through: ask service → request slot → reserve → confirm. Verify the Resend confirmation email arrives.

If the agent never speaks: check `LLM_PROXY_URL` value in Vercel env vars and the Agora Studio MCP URL.

If a turn dies mid-stream with a 504: you hit the Hobby 10s `maxDuration` cap. Either upgrade to Pro and add `"functions": { "api/index.ts": { "maxDuration": 60 } }` to `vercel.json`, or accept it for the demo.

---

## Task N: Open the PR (ask first)

- [ ] **Step 1: Confirm the branch state**

```powershell
git log --oneline main..Charles-cloud
```

Should show: the Vercel doc rewrite, Task A–F commits, plus the prior Railway-iteration commits that are still valid (`start:prod` script, cloudflared log cleanup). The Railway-specific commits are still in history — that's fine; the design doc explains the pivot.

- [ ] **Step 2: Ask the user before opening the PR**

Do not auto-open. Ask: *"All Vercel deploy tasks verified. Open a PR from `Charles-cloud` → `main`?"* If yes:

```powershell
gh pr create --base main --head Charles-cloud --title "Deploy apps/api to Vercel (replace cloudflared)" --body "$(cat <<'EOF'
## Summary
- Replaces ephemeral cloudflared tunnel with a permanent Vercel-hosted public URL for apps/api
- Refactors apps/api/src/index.ts → server.ts (host-neutral) + index.ts (local Node dev)
- Adds api/index.ts (Vercel Node serverless function via hono/vercel)
- Adds vercel.json (pnpm install + catch-all rewrite to /api)
- Cleans up stale cloudflared/Railway references in code comments and README

## Test plan
- [x] /health returns 200 from the Vercel URL
- [x] /mcp tools/list returns all five tools
- [x] Web dashboard on localhost:3000 talks to the Vercel API
- [x] Agora Studio reaches /mcp at the Vercel URL
- [x] Sofia booking flow works end-to-end (slot reserve + confirm + Resend email)

Known limitation: Vercel Hobby caps function duration at 10s. Long LLM streams can be cut off. Bump via vercel.json maxDuration after upgrading to Pro if needed.

See [spec](docs/superpowers/specs/2026-05-27-vercel-deploy-design.md) for the full design.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
