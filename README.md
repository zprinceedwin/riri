# Riri

> Voice AI sales agents — with the personality of a real closer. *I'm Rocky — but for you.*

Built for the **Agora Hackathon Philippines 2026** in 7 hours by a team of 4 using Cursor / Claude Code / TRAE.

Riri lets any B2B company spin up a voice AI sales agent with a configurable **persona**. The showcase personas are **Jordan** (high-energy phone closer, Wolf-of-Wall-Street vibes) and **Mike** (calm consultative B2B closer, Suits vibes). Under the hood: Agora Conversational AI Engine for real-time voice (sub-650ms latency, interruption handling), Couchbase Capella for vector-RAG over your product knowledge and prospect intel, and OpenAI as the LLM brain.

## Architecture

```
Browser (Next.js + Agora Web SDK + Web Toolkit)
   |
   |--- start/stop agent, get RTC token ----> Backend (Hono on Node)
   |                                            |
   |<--- audio + transcripts -- Agora RTC <--- Backend ---> Agora Convo AI Engine
                                                              |
                                                              |---> Deepgram ASR
                                                              |---> ElevenLabs TTS
                                                              |---> /v1/chat/completions (our LLM proxy)
                                                                       |
                                                                       |---> vector search ---> Couchbase
                                                                       |---> completion --------> OpenAI
```

**Key design choice:** Agora's `llm.url` field accepts any OpenAI-compatible endpoint. We stand up our own `/v1/chat/completions` proxy that injects RAG context from Couchbase on every turn. This keeps voice latency low (no extra LLM round-trip for tool calls) and gives us full control over how knowledge flows into the agent.

## Repo Layout

```
Riri/
  apps/
    web/         # Next.js 14 dashboard + push-to-talk widget
    api/         # Hono backend - agent control, LLM proxy, ingest, post-call summary
  packages/
    shared/      # Zod schemas + TS types (frozen API contracts)
    personas/    # JSON definitions of Jordan, Mike, etc.
  docs/
    DEMO_SCRIPT.md      # 5-minute pitch script
    INTERFACES.md       # API contracts mirrored from packages/shared
    PITCH_PROMPTS.md    # System prompts for the personas (iterable)
  infra/
    couchbase-vector-index.md   # Exact JSON to create the Capella vector index
```

## Quick Start

```powershell
# 1. Install dependencies (one-time)
pnpm install

# 2. Configure environment
Copy-Item .env.example .env
# Edit .env and fill in Agora, OpenAI, ElevenLabs, Deepgram, Couchbase keys

# 3. Set up Couchbase
# - Sign up at https://cloud.couchbase.com (free tier)
# - Create a cluster, bucket named "Riri"
# - Create vector search index per infra/couchbase-vector-index.md

# 4. Seed the demo data (pre-ingest company + prospect)
pnpm seed:all

# 5. Expose the API publicly (Agora needs to reach our LLM proxy)
# In a separate terminal:
# cloudflared tunnel --url http://localhost:3001
# (or: ngrok http 3001)
# Update LLM_PROXY_URL in .env with the public URL it gives you

# 6. Run both apps
pnpm dev
# - Web:  http://localhost:3000
# - API:  http://localhost:3001
```

## Team / Roles (4 engineers, 7 hours)

- **Voice / Tech Lead** - Agora end-to-end + integration ownership. Owns `apps/api/src/routes/agent.ts`, `apps/api/src/lib/agora.ts`, `apps/web/lib/agora.ts`. Branch prefix `voice/*`.
- **Brain / Backend** - Couchbase + LLM proxy + RAG. Owns `apps/api/src/routes/llm.ts`, `apps/api/src/routes/ingest.ts`, `apps/api/src/routes/calls.ts`, `apps/api/src/lib/{couchbase,rag,openai}.ts`, seed scripts. Branch prefix `brain/*`.
- **UI / Frontend** - Dashboard + push-to-talk + transcript. Owns `apps/web/app/*`, `apps/web/components/*`. Branch prefix `ui/*`.
- **Story / Product / Pitch** - Persona prompts, demo content, pitch deck. Owns `packages/personas/*.json`, `docs/DEMO_SCRIPT.md`, `docs/PITCH_PROMPTS.md`, the pitch deck. Branch prefix `story/*`.

See [docs/PLAN.md](docs/PLAN.md) for the full hour-by-hour plan.

## Branch Strategy

- `main` - protected, deploy target
- Each engineer works on `<role>/*` branches and PRs to `main`
- Voice/Tech Lead is the integration owner and merges to `main`
- **Hard integration gate: 1:30 PM** - push-the-button-and-it-talks must work end-to-end. If not, all V1 stretch features are cancelled.

## Sponsor Hooks (for the pitch)

- **Agora** - Conversational AI Engine + Web SDK + Web Toolkit (sub-650ms latency, interruption handling)
- **Couchbase** - Capella vector search powers the RAG brain (product knowledge + prospect intel)
- **TRAE / Cursor / Claude Code** - shipped the whole thing in 7 hours with AI coding tools
- **AWS** - backend deployable to App Runner / EC2 / Lambda

## Demo Recipe (the killer 5 minutes)

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).
