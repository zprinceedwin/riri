# Riri Plan

The full plan lives in the Cursor workspace at:

`c:\Users\Prince\.cursor\plans\Riri_hackathon_build_plan_d63702ff.plan.md`

This file is a stable mirror of the key decisions so the team can read it in-repo.

## Product

- **Name:** Riri (Voice AI Sales Agents with Personality)
- **Tagline:** "Voice AI sales agents — with the personality of a real closer."
- **Showcase personas:** Jordan (Wolf-of-Wall-Street vibes) and Mike (Suits vibes)
- **Demo company:** sell Couchbase to a fictional fintech prospect (Voltline) — sponsor brownie points, knowledge is already public, story is plausible

## Architecture

Browser (Next.js + Agora Web SDK) → Backend (Hono on Node) → Agora Conversational AI Engine → our `/v1/chat/completions` LLM proxy → Couchbase vector search → OpenAI gpt-4o-mini. TTS via ElevenLabs, ASR via Deepgram.

**Key design choice:** RAG is implemented as a transparent OpenAI-compatible LLM proxy. Agora's agent calls our proxy; we silently retrieve from Couchbase and inject CONTEXT into the system prompt before forwarding to OpenAI. No tool-call round trips, low voice latency.

## Roles

- **Voice / Tech Lead** — `apps/api/src/routes/agent.ts`, `apps/api/src/lib/agora.ts`, `apps/web/lib/agora.ts`. Owns integration.
- **Brain** — `apps/api/src/routes/llm.ts`, `apps/api/src/routes/ingest.ts`, `apps/api/src/lib/{couchbase,rag,openai}.ts`, seed scripts.
- **UI** — `apps/web/app/*`, `apps/web/components/*`.
- **Story** — `packages/personas/*.json`, `docs/DEMO_SCRIPT.md`, `docs/PITCH_PROMPTS.md`, pitch deck.

## Branch strategy

- `main` — protected, deploy target.
- `voice/*`, `brain/*`, `ui/*`, `story/*` — one per engineer.
- Voice/Tech Lead owns merge to `main`.

## Hard gate

By 1:30 PM (end of H3): press the button → agent joins → Couchbase RAG retrieves → agent speaks with CONTEXT → transcript shows. If broken, all V1 features cancelled.

## Pre-event checklist (each person)

- Agora dev account, App ID, customer key + secret.
- Couchbase Capella free-tier cluster, bucket `Riri`, vector index per [infra/couchbase-vector-index.md](../infra/couchbase-vector-index.md).
- OpenAI API key, ElevenLabs trial key, Deepgram trial key.
- `pnpm install` works from repo root.
- `cloudflared` or `ngrok` installed (so Agora can reach `/v1/chat/completions` on your laptop during dev).
