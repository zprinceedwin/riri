# Submission Checklist (7:15 PM hard deadline)

Submission portal: **[convoai.club](https://convoai.club)** — submit through the team's hackathon portal account.

**Submission title format:** `[(Group #) Team Name - Riri]`
(replace `Group #` and `Team Name` with the assigned values from the organizers).

## Required artifacts

- [ ] **Live demo URL** — the Vercel deployment of `apps/web`
- [ ] **API URL** — the Railway / Render deployment of `apps/api` (must be publicly reachable, Agora needs to hit `/v1/chat/completions`)
- [ ] **GitHub repo URL** — public, with a clear README
- [ ] **Pitch deck** — 5-10 slides, PDF or Figma Slides link, attached to submission
- [ ] **Backup demo video** — 60-90 seconds, recorded at hour 5 no matter what, uploaded to YouTube (unlisted) or Google Drive
- [ ] **Team roster** — confirmed all 4 members are registered for the event

## What's in the README (booklet checklist)

The submitted README must contain, in order:

- [ ] One-sentence elevator pitch ("voice AI receptionist for a BGC derma clinic — same Agora speed, same Couchbase brain, configurable persona")
- [ ] Architecture diagram (ASCII or image) showing Browser ↔ Agora ↔ LLM proxy ↔ Couchbase Capella + OpenAI
- [ ] **Agora Integration section** — explicit callouts for:
  - Agora Conversational AI Engine REST `/v2/projects/:appid/join` wiring
  - Custom LLM endpoint at `/v1/chat/completions`
  - Agora Web SDK + RTM + stream-message for transcripts
  - Deepgram ASR + ElevenLabs TTS as Agora-native vendors
- [ ] Sponsor hooks section (Agora, Couchbase Capella, ElevenLabs, Deepgram, Resend, AWS)
- [ ] Repo layout
- [ ] Quick start (`pnpm install`, populate `.env`, `pnpm seed:clinic`, then `pnpm dev`)
- [ ] Team / roles
- [ ] **Known Limitations section** — auth, multi-tenant, CRM sync, language, outbound, persona editor, Resend sender, HIPAA
- [ ] "Built with TRAE + Cursor + Claude Code"

## Project description (paste into submission form)

> **Riri — Voice AI Receptionist for Belle Aesthetic Manila**
>
> Riri is a voice AI receptionist that picks up every inbound call to a BGC derma clinic. Meet Sofia: warm, professional, photographic memory of every service, every doctor, every returning client. She handles price objections with the package playbook, locks an appointment slot atomically against the calendar using a Couchbase CAS reservation, and sends a confirmation email via Resend before the caller has hung up.
>
> Riri is also a **persona engine**. Sofia is the V0 clinic concierge, but Jordan (high-energy phone closer) and Mike (calm consultative B2B closer) live in the codebase as alternative personas. Same Agora voice quality, same Couchbase Capella brain, different soul.
>
> Built on Agora's Conversational AI Engine for sub-650-millisecond real-time voice with native interruption handling. Powered by Couchbase Capella for vector RAG + operational data in one engine. ElevenLabs for voice, Deepgram for speech-to-text, Resend for transactional email. Shipped in 7 hours by 4 engineers using TRAE, Cursor, and Claude Code.
>
> We're not selling SaaS. We're plugging the leak in your phone.
>
> **Sponsors used:**
> - **Agora** — Conversational AI Engine + Web SDK + custom LLM proxy. Sub-650ms latency and interruption handling are the core voice wow.
> - **Couchbase Capella** — Vector search powers the clinic knowledge base AND a CAS-based slot reservation flow that's safe against concurrent writers. Vectors + JSON + locking in one engine.
> - **Resend** — Transactional booking confirmation emails sent the moment Sofia confirms verbally.
> - **TRAE & Cursor & Claude Code** — AI coding tools that let us ship a full-stack monorepo in 7 hours.
> - **AWS** — backend deployable to App Runner / Lambda / EC2.

## Talking points for the submission form

- **Problem:** Filipino aesthetic clinics lose 20-30% of inbound calls to voicemail. Every missed call is a five-figure-peso treatment walking out the door.
- **Solution:** A voice AI receptionist with photographic memory of the clinic, real-time slot reservation, and an email confirmation in the same call.
- **Differentiation:** Persona engine + sales-native objection handling + Couchbase Capella for vectors + operational data in one engine + atomic slot CAS lock. Most competitors stitch two databases and don't handle the booking side at all.
- **Market:** Every Manila clinic, salon, dental practice. Filipino service businesses where the front desk is the bottleneck.
- **Demo:** Live voice call with Sofia booking a Botox refresh for a returning client (Maria Cruz, looked up by phone) — calendar cell turns gold, confirmation email lands, lead score scored, pipeline updates. Optional V1: persona-switch to Jordan to show productization.

## Pre-submission smoke test (do at 6:55 PM)

1. Open the deployed web URL on a fresh browser/incognito → page loads cleanly with Sofia selected.
2. Press the call button → Sofia joins, greeting plays within 5 seconds.
3. Say one thing → Sofia responds within ~1 second.
4. Walk through to a booking → calendar cell turns gold, confirmation email arrives.
5. End the call → land on the summary page → see lead score + intent + captured contact.
6. Reload — no console errors.

If any step fails: do NOT panic. The backup video is good enough for first-round judging. Push the fix in parallel.

## Post-submission

- Push final commit to `main` and tag `v1.0.0`.
- Post in team chat: "submitted at HH:MM, URL: ..., backup video: ..."
- Eat. Hydrate. Re-read [DEMO_SCRIPT.md](DEMO_SCRIPT.md) 3 times before stage call.
