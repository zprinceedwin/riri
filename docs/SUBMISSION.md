# Submission Checklist (7:00 PM hard deadline)

## Required artifacts

- [ ] **Live demo URL** — the Vercel deployment of `apps/web`
- [ ] **API URL** — the Railway / Render deployment of `apps/api` (must be publicly reachable, Agora needs to hit `/v1/chat/completions`)
- [ ] **GitHub repo URL** — public, with a clear README
- [ ] **Pitch deck** — 5-10 slides, PDF or Figma Slides link, attached to submission
- [ ] **Backup demo video** — 60-90 seconds, recorded at hour 5 no matter what, uploaded to YouTube (unlisted) or Google Drive
- [ ] **Team roster** — confirmed all 4 members are registered for the event

## Project description (paste into submission form)

> **Riri — Voice AI Sales Agents with Personality**
>
> Riri lets any B2B company spin up a voice AI sales agent with a configurable persona — from Wolf-of-Wall-Street energy to consultative enterprise calm. Built on Agora's Conversational AI Engine for sub-650-millisecond real-time voice with native interruption handling. Powered by Couchbase Capella vector RAG over the company's product knowledge and per-prospect intel — so the agent has photographic memory of every deal. Shipped in 7 hours by 4 engineers using TRAE and Cursor.
>
> **Sponsors used:**
> - **Agora** — Conversational AI Engine + Web SDK + custom LLM proxy. Sub-650ms latency and interruption handling are the core voice wow.
> - **Couchbase Capella** — Vector search powers the RAG brain. Product knowledge + prospect profiles in one engine, one query path.
> - **TRAE & Cursor** — AI coding tools that let us ship a full-stack monorepo in 7 hours.
> - **AWS** — backend deployable to App Runner / Lambda / EC2.

## Talking points for the submission form

- **Problem:** Voice AI sales bots today sound robotic and forget everything between calls. They're not closers — they're chatbots with microphones.
- **Solution:** A platform where every voice agent has a real persona, photographic memory of the prospect, and a real sales methodology (discovery → qualify → handle objections → close).
- **Differentiation:** Persona engine + sales-native qualification scoring + native Couchbase vector + Agora voice quality.
- **Market:** Every B2B sales team. SDR replacement + augmentation, not just inbound.
- **Demo:** Live voice call with Jordan persona, then persona-switch to Mike to show productization.

## Pre-submission smoke test (do at 6:45 PM)

1. Open the deployed web URL on a fresh browser/incognito → page loads cleanly.
2. Press the call button → agent joins, greeting plays within 5 seconds.
3. Say one thing → agent responds within ~1 second.
4. End the call → land on the summary page → see qualification score + lead + summary.
5. Reload — no console errors.

If any step fails: do NOT panic. The backup video is good enough for first-round judging. Push the fix in parallel.

## Post-submission

- Push final commit to `main` and tag `v1.0.0`.
- Post in team chat: "submitted at HH:MM, URL: ..., backup video: ..."
- Eat. Hydrate. Re-read [DEMO_SCRIPT.md](DEMO_SCRIPT.md) 3 times before stage call.
