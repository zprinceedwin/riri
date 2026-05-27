# Railway Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ephemeral `cloudflared` tunnel with a permanent Railway-hosted public URL for `apps/api`, so Agora's Conversational AI Engine has a stable target for `/v1/chat/completions` and `/mcp`.

**Architecture:** Add a root `railway.json` that pins a Nixpacks build (`pnpm install --frozen-lockfile`) and a workspace start (`pnpm --filter @riri/api start:prod`). Add an `apps/api` `start:prod` script that drops the `--env-file=../../.env` flag because Railway injects env vars directly. Use `${{ RAILWAY_PUBLIC_DOMAIN }}` templating for `LLM_PROXY_URL` so it resolves to the live domain on first boot.

**Tech Stack:** Railway (Nixpacks builder), pnpm workspaces, Hono on Node 20, `tsx` runtime.

**Spec:** [docs/superpowers/specs/2026-05-27-railway-deploy-design.md](../specs/2026-05-27-railway-deploy-design.md)

---

## Task 1: Add `start:prod` script to `apps/api`

**Why:** Railway has no `.env` file in the container, so `tsx --env-file=../../.env` would crash on boot. Railway populates `process.env` directly; we need a script that just runs `tsx src/index.ts`.

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Add the `start:prod` script**

Open [apps/api/package.json](../../../apps/api/package.json). The `scripts` block currently looks like:

```json
"scripts": {
  "dev": "tsx watch --env-file=../../.env src/index.ts",
  "start": "tsx --env-file=../../.env src/index.ts",
  "build": "tsc",
  "typecheck": "tsc --noEmit",
  "seed:company": "tsx --env-file=../../.env src/seed/seed-company.ts",
  "seed:prospect": "tsx --env-file=../../.env src/seed/seed-prospect.ts",
  "seed:clinic": "tsx --env-file=../../.env src/seed/seed-clinic.ts",
  "seed:clinic": "tsx --env-file=../../.env src/seed/seed-clinic.ts"
}
```

Note: there's a duplicate `seed:clinic` entry — leave it alone, it's outside the scope of this change. Add `start:prod` immediately after `start`:

```json
"scripts": {
  "dev": "tsx watch --env-file=../../.env src/index.ts",
  "start": "tsx --env-file=../../.env src/index.ts",
  "start:prod": "tsx src/index.ts",
  "build": "tsc",
  "typecheck": "tsc --noEmit",
  "seed:company": "tsx --env-file=../../.env src/seed/seed-company.ts",
  "seed:prospect": "tsx --env-file=../../.env src/seed/seed-prospect.ts",
  "seed:clinic": "tsx --env-file=../../.env src/seed/seed-clinic.ts",
  "seed:clinic": "tsx --env-file=../../.env src/seed/seed-clinic.ts"
}
```

- [ ] **Step 2: Verify the script is valid JSON**

Run: `node -e "require('./apps/api/package.json')"`
Expected: no output (parses cleanly). If you see a `SyntaxError`, you broke the JSON — re-open and fix.

- [ ] **Step 3: Verify local `dev` still works (smoke test)**

Run: `pnpm --filter @riri/api dev`
Expected: API boots, logs `Riri API listening on http://localhost:3001`. Hit `Ctrl+C` to stop. If it fails to boot, you accidentally broke the `dev` script — revert and try again.

- [ ] **Step 4: Commit**

```powershell
git add apps/api/package.json
git commit -m "feat(api): add start:prod script for cloud deploys"
```

---

## Task 2: Add root `railway.json`

**Why:** Tell Railway's Nixpacks builder exactly how to install and start the workspace. Without this, Railway will autodetect and probably try `pnpm start` from the repo root, which doesn't exist.

**Files:**
- Create: `railway.json`

- [ ] **Step 1: Create the file**

Create `railway.json` at the repo root with this exact content:

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

- [ ] **Step 2: Verify the file parses as JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('railway.json', 'utf8'))"`
Expected: no output. If `SyntaxError`, fix the JSON.

- [ ] **Step 3: Commit**

```powershell
git add railway.json
git commit -m "feat: add railway.json for Nixpacks deploy of apps/api"
```

---

## Task 3: Remove the cloudflared reminder log line

**Files:**
- Modify: `apps/api/src/index.ts:105`

- [ ] **Step 1: Delete the stale log line**

Open [apps/api/src/index.ts](../../../apps/api/src/index.ts). At line 105 you'll find:

```typescript
  console.log("Reminder: expose this with cloudflared/ngrok so Agora Studio can reach /mcp");
```

Delete that line. Also delete the empty `console.log("")` immediately above it (line 104) since it was only there to separate the reminder from the route list. After the change, the `serve()` callback should end with the `clinic slots` log line.

- [ ] **Step 2: Verify the file still compiles**

Run: `pnpm --filter @riri/api typecheck`
Expected: exit code 0, no errors.

- [ ] **Step 3: Commit**

```powershell
git add apps/api/src/index.ts
git commit -m "chore(api): drop stale cloudflared reminder log"
```

---

## Task 4: Update the cloudflared example URL in the MCP route comment

**Files:**
- Modify: `apps/api/src/routes/mcp.ts:17`

- [ ] **Step 1: Update the comment**

Open [apps/api/src/routes/mcp.ts](../../../apps/api/src/routes/mcp.ts). Line 17 currently reads:

```typescript
 * Public URL pattern: https://<your-cloudflared>.trycloudflare.com/mcp
```

Replace with:

```typescript
 * Public URL pattern: https://<your-railway-app>.up.railway.app/mcp
```

- [ ] **Step 2: Verify the file still compiles**

Run: `pnpm --filter @riri/api typecheck`
Expected: exit code 0.

- [ ] **Step 3: Commit**

```powershell
git add apps/api/src/routes/mcp.ts
git commit -m "docs(api): update mcp route comment to railway URL pattern"
```

---

## Task 5: Rewrite the "expose the API publicly" block in README

**Files:**
- Modify: `README.md` (the Quick Start section, currently lines 125-130)

- [ ] **Step 1: Replace the cloudflared block**

Open [README.md](../../../README.md). Find this block in the Quick Start section (lines 125-130):

```markdown
# 5. Expose the API publicly (Agora needs to reach our LLM proxy)
# In a separate terminal:
# cloudflared tunnel --url http://localhost:3001
# (or: ngrok http 3001)
# Update LLM_PROXY_URL in .env with the public URL it gives you
```

Replace it with:

```markdown
# 5. Deploy the API to Railway (Agora needs to reach our LLM proxy + /mcp)
# - Sign in at https://railway.com and create a new project from this GitHub repo
# - Railway auto-detects railway.json and runs `pnpm install` + `pnpm --filter @riri/api start:prod`
# - In Railway > Variables, paste every key from your local .env EXCEPT:
#     * Do NOT set PORT (Railway injects its own)
#     * Set LLM_PROXY_URL to: https://${{ RAILWAY_PUBLIC_DOMAIN }}/v1/chat/completions
#     * Keep WEB_BASE_URL=http://localhost:3000 (web stays local for the demo)
# - After the first deploy, Railway gives you https://<your-app>.up.railway.app
# - Update your local .env:
#     NEXT_PUBLIC_API_BASE_URL=https://<your-app>.up.railway.app
# - In Agora Console > Conversational AI Studio > Integrations > MCPs, point the
#   server URL at https://<your-app>.up.railway.app/mcp
```

- [ ] **Step 2: Commit**

```powershell
git add README.md
git commit -m "docs: replace cloudflared instructions with Railway deploy steps"
```

---

## Task 6: Push the branch to GitHub

**Why:** Railway pulls from GitHub. We need the `Charles-cloud` branch visible on the remote before configuring the Railway project.

- [ ] **Step 1: Push the branch**

```powershell
git push -u origin Charles-cloud
```

Expected output includes `* [new branch]      Charles-cloud -> Charles-cloud` and `branch 'Charles-cloud' set up to track 'origin/Charles-cloud'`.

If the push is rejected because the remote has commits we don't, **do not force-push**. Run `git pull --rebase origin Charles-cloud`, resolve any conflicts, then push again.

---

## Task 7: Create the Railway project (manual, in Railway dashboard)

**Why:** This is a one-time setup that has to happen in the Railway UI. The plan documents the exact steps so the engineer doesn't have to guess.

- [ ] **Step 1: Sign in and create the project**

1. Go to https://railway.com and sign in (GitHub auth is the path of least resistance).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Authorize Railway for the `zprinceedwin/riri` repo if not already done.
4. Select the repo.

- [ ] **Step 2: Point the service at the `Charles-cloud` branch**

In the new service's **Settings** → **Source**:
- **Branch:** `Charles-cloud` (later we'll merge to `main` and switch it)
- Leave **Root Directory** blank — `railway.json` handles the monorepo from the root.

- [ ] **Step 3: Generate a public domain**

Service → **Settings** → **Networking** → **Generate Domain**. Note the URL (e.g. `https://riri-api-production.up.railway.app`). You'll paste this into your local `.env` later.

---

## Task 8: Set environment variables in Railway

**Why:** The app's Zod env schema ([apps/api/src/env.ts](../../../apps/api/src/env.ts)) will refuse to boot if any required key is missing. Set everything in one pass.

- [ ] **Step 1: Open Variables → Raw Editor**

In the Railway service: **Variables** → click the **Raw Editor** button (top right of the variables table). This lets you paste KEY=VALUE lines in bulk instead of one at a time.

- [ ] **Step 2: Paste the full block (with your real values)**

Paste this template into the Raw Editor and replace each `your_*_here` with the matching value from your local `.env`. Important: leave `LLM_PROXY_URL` exactly as shown — the `${{ RAILWAY_PUBLIC_DOMAIN }}` is Railway template syntax that resolves at deploy time.

```
AGORA_APP_ID=your_agora_app_id_here
AGORA_APP_CERTIFICATE=your_agora_app_certificate_here
AGORA_CUSTOMER_ID=your_agora_customer_id_here
AGORA_CUSTOMER_SECRET=your_agora_customer_secret_here

ANTHROPIC_API_KEY=your_anthropic_key_here
ANTHROPIC_LLM_MODEL=claude-sonnet-4-6
ANTHROPIC_SUMMARY_MODEL=claude-haiku-4-5

OPENAI_API_KEY=your_openai_key_here
OPENAI_LLM_MODEL=gpt-4o-mini
OPENAI_SUMMARY_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

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
SUPABASE_EMBEDDING_DIMENSIONS=1536

CLINIC_NAME=Belle Aesthetic Manila
CLINIC_DEMO_NAMESPACE=clinic-belle-manila
CLINIC_ADDRESS_LINE=Ground Floor, Bonifacio High Street, BGC, Taguig

API_BASE_URL=https://${{ RAILWAY_PUBLIC_DOMAIN }}
LLM_PROXY_URL=https://${{ RAILWAY_PUBLIC_DOMAIN }}/v1/chat/completions
WEB_BASE_URL=http://localhost:3000
```

- [ ] **Step 3: Save and trigger redeploy**

Click **Update Variables**. Railway will redeploy automatically. Watch the build log: you should see `pnpm install` succeed, then `Riri API listening on http://localhost:<port>` (it logs `localhost` but it's bound to the Railway container — that's fine, the public URL fronts it).

If the deploy crashes with `Environment validation failed`, the Railway log will list which key is missing. Add it and redeploy.

---

## Task 9: Verify the deploy

- [ ] **Step 1: Health check**

```powershell
curl https://<your-app>.up.railway.app/health
```

Expected: `{"ok":true,"service":"Riri-api","ts":"2026-05-27T..."}`

If you get a 502 / connection error, check the Railway deployment status — boot may have failed or the public domain isn't generated.

- [ ] **Step 2: MCP `tools/list` check**

```powershell
curl -X POST https://<your-app>.up.railway.app/mcp `
  -H "Content-Type: application/json" `
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expected: JSON-RPC response listing five tools — `search_clinic_kb`, `list_available_slots`, `get_contact_by_phone`, `reserve_slot`, `confirm_booking`. If you get an empty `tools` array or a 500, check Railway logs for the route registration error.

- [ ] **Step 3: Confirm `LLM_PROXY_URL` resolved correctly**

Railway service → **Variables**. The `LLM_PROXY_URL` row should show the resolved value (e.g. `https://riri-api-production.up.railway.app/v1/chat/completions`) under or next to the templated form. If it still shows the literal `${{ RAILWAY_PUBLIC_DOMAIN }}` after the deploy succeeded, the public domain wasn't generated yet — go back to Task 7 Step 3.

---

## Task 10: Update local `.env` so the web dashboard talks to Railway

**Files:**
- Modify: `.env` (your local one — not `.env.example`, which is checked in)

- [ ] **Step 1: Point the web app at the deployed API**

In your local `.env`, change:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

to:

```
NEXT_PUBLIC_API_BASE_URL=https://<your-app>.up.railway.app
```

- [ ] **Step 2: Restart the web dev server**

If `pnpm dev:web` is running, stop it (`Ctrl+C`) and restart it — Next.js bakes `NEXT_PUBLIC_*` vars at startup.

```powershell
pnpm dev:web
```

- [ ] **Step 3: Open http://localhost:3000 and confirm the dashboard loads stats from Railway**

The stats strip at the top of the page hits the API. If you see numbers, the wiring is right. If you see CORS errors in DevTools, double-check that Railway has `WEB_BASE_URL=http://localhost:3000` set.

---

## Task 11: Repoint Agora Studio MCP at the Railway URL

This is a one-time edit in the Agora Console — no code change.

- [ ] **Step 1: Update the MCP server URL in Agora Studio**

1. Open https://console.agora.io.
2. Go to **Conversational AI Studio** → **Integrations** → **MCPs**.
3. Find the existing MCP server entry (the one currently pointing at your `*.trycloudflare.com/mcp`).
4. Edit the **Server URL** to `https://<your-app>.up.railway.app/mcp`.
5. Save.

- [ ] **Step 2: End-to-end test — start a Sofia call**

1. Make sure `pnpm dev:web` is running locally on `localhost:3000`.
2. Open the dashboard, pick **Sofia**, click push-to-talk.
3. Verify in Railway logs that you see `[agora]` and `[llm]` lines as the call progresses — that confirms Agora is hitting the Railway-hosted endpoints, not localhost.
4. Walk through a booking flow: ask about a service → request a slot → reserve → confirm. Verify the Resend confirmation email lands.

If the agent never speaks, check Railway logs for failed inbound requests; the most likely cause is `LLM_PROXY_URL` still pointing at localhost (Task 8 Step 2) or the Agora Studio MCP URL not saved (Step 1 above).

---

## Task 12: Final commit summary + PR

- [ ] **Step 1: Confirm the branch contains only the deploy-related commits**

```powershell
git log --oneline main..Charles-cloud
```

Expected: roughly six commits — the spec, `start:prod`, `railway.json`, the index.ts log cleanup, the mcp.ts comment, the README rewrite. No surprise commits.

- [ ] **Step 2: Open a PR (ask the user first)**

Do **not** open the PR autonomously. Ask the user: *"All Railway deploy tasks done and verified. Should I open a PR from `Charles-cloud` → `main`?"* If yes:

```powershell
gh pr create --base main --head Charles-cloud --title "Deploy apps/api to Railway (replace cloudflared)" --body "$(cat <<'EOF'
## Summary
- Replaces ephemeral cloudflared tunnel with a permanent Railway public URL for apps/api
- Adds railway.json (Nixpacks) + start:prod script
- Cleans up stale cloudflared references in code comments and README

## Test plan
- [x] /health returns 200 from the Railway URL
- [x] /mcp tools/list returns all five tools
- [x] Web dashboard on localhost:3000 talks to the Railway API
- [x] Agora Studio reaches /mcp at the Railway URL
- [x] Sofia booking flow works end-to-end (slot reserve + confirm + Resend email)

See [spec](docs/superpowers/specs/2026-05-27-railway-deploy-design.md) for the full design.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
