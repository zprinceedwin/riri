# Role 4 — Story & Content

> You own the *language* of Riri: the words Sofia speaks, the words on the
> pitch deck, the words in the demo script, and the words you deliver on stage.
> You are the only role on the team who writes prose for both the agent's
> voice AND the audience's ear.

## Scope (what you own end-to-end)

- **Persona content + system prompts** — the entire `packages/personas/*.json`
  set. Sofia is the V0 hero; Jordan and Mike are alternative personas for the
  persona-engine demo.
- **Seed playbook content** — the actual text strings inside
  `seed-clinic.ts` for clinic overview, FAQ, objection-handling playbook,
  doctor bios, service descriptions. (Brain owns the script structure; you
  own the words.)
- **Prompt iteration log** — `docs/PITCH_PROMPTS.md`.
- **Demo script** — `docs/DEMO_SCRIPT.md`: the 5-minute beat sheet you deliver.
- **Pitch deck** — Figma Slides, exported to PDF for submission.
- **Brand direction** — the tone, the copy voice, the palette intent (warm
  gold = trust, dark slate = premium). UI implements the visuals; you make
  sure the visuals say the right thing.
- **The pitch itself** — you stand at the mic and deliver. You also play
  "Maria Cruz" during the live demo segment.
- **Backup demo video** — recorded at H5 no exceptions, you do the voiceover.
- **Q&A prep + delivery** — anticipate, draft, rehearse the answers.
- **Submission paperwork** — convoai.club portal at 7:15 PM.

## Not your scope

- Any production code, API routes, components, or infrastructure.
- Persona registry code (`packages/personas/src/index.ts`) — that's Brain;
  you give them new JSON content and they wire it.
- Seed script structure — Brain. You hand them content strings.
- Brand visual implementation in CSS / Tailwind / components — that's UI.

## Branch convention

`story/<topic>` — push WIP every hour even if rough.

## Files you own

- `packages/personas/sofia.json`
- `packages/personas/jordan.json`
- `packages/personas/mike.json`
- `docs/DEMO_SCRIPT.md`
- `docs/PITCH_PROMPTS.md`
- `docs/SUBMISSION.md`
- **Content strings inside** `apps/api/src/seed/seed-clinic.ts`:
  - `CLINIC_OVERVIEW`
  - `FAQ_DOC`
  - `OBJECTION_PLAYBOOK`
  - The text of each service `description` and each doctor `bio` in
    `apps/api/src/lib/clinic-catalog.ts`.
  - **Mechanism:** edit the strings in place, ping Brain to re-run
    `pnpm seed:clinic` so Couchbase picks them up.
- The pitch deck (Figma Slides) — link goes in `docs/SUBMISSION.md`.
- The backup video file — uploaded to YouTube unlisted or Drive, link goes
  in `docs/SUBMISSION.md`.

## Files you must NOT touch

- Anything under `apps/api/src/routes/`, `apps/api/src/lib/`, or
  `apps/api/src/seed/seed-{company,prospect}.ts` (those are Brain's code,
  not content).
- Anything under `apps/web/`.
- `packages/personas/src/index.ts` (registry code — Brain).
- `packages/shared/` (contracts — Brain).
- README technical sections — Voice or Brain.

## Hour-by-hour tasks

### H0 (8:30–10:30 AM, pre-build during sponsor talks)

- [ ] Read `docs/DEMO_SCRIPT.md` twice. Memorize the Tita Maria framing and
      the "I'm Rocky — but for you" hook.
- [ ] Open a Figma Slides file titled `Riri — Agora Hackathon Philippines 2026`.
- [ ] Draft v0 of Sofia's persona prompt — read it aloud, time it on a sample
      30-second response. If it feels wooden, rewrite.
- [ ] Draft v0 of the clinic FAQ + objection playbook content. These are the
      ground truth Sofia cites from — make them *specific*, not generic.
      ("PHP 18,000 for Botox crow's-feet" not "competitively priced".)
- [ ] Identify who plays "Maria Cruz" during the live demo. Default: you.
- [ ] Confirm team registration for the event.

### H1 (10:30–11:30 AM)

- [ ] Hand Brain v1 persona JSONs and seed content. Brain wires them in.
- [ ] Deck outline: hook → problem → solution → architecture → live demo
      placeholder → sponsor logos → close.
- [ ] Three candidate hooks drafted — A/B with the team at lunch.

### H2 (11:30 AM–12:30 PM, working lunch)

- [ ] First dry-read of the script aloud, alone, with a timer. Target: 5:00.
      If you're at 6:30 you have to cut — likely the architecture explanation
      or the V1 persona switch.
- [ ] Lock pitch deck v1 content.
- [ ] Sit with Brain for 10 minutes: tune Sofia's prompt by simulating
      a call (you read the user lines, Brain runs the LLM proxy in dev mode,
      look at responses, iterate).
- [ ] Brief the team on cue moments — when you say "watch the calendar",
      UI must already have the booking flow primed.

### H3 (12:30–1:30 PM) — INTEGRATION GATE

- [ ] **🛑 1:30 PM HARD GATE — watch with Voice + Brain + UI:** press the
      gold button, hear Sofia, watch transcript, end call, summary appears.
- [ ] If the gate passes: first full rehearsal of the live call, you play
      Maria Cruz, the team operates the dashboard.
- [ ] If the gate fails: STOP all V1. Rewrite the script to pivot to whatever
      V0 actually does (e.g. dashboard tour + backup video only).

### H4 (1:30–2:30 PM)

- [ ] Three rehearsals of the live call. Specifically practice:
  - The price pushback ("how much is it? … that's a lot").
  - Staying silent — Sofia needs space to talk.
  - The Thursday-2-PM close.
- [ ] Note Sofia weak spots → patch the persona JSON. If she invents a
      service or hallucinates a price, the fix is in `sofia.json` or in
      the seed content, NOT in the LLM proxy. Brain re-runs `pnpm seed:clinic`
      after your content edits.
- [ ] Deck v2: add a screenshot of the dashboard for the cover slide.

### H5 (2:30–3:30 PM) — V0 BULLETPROOF DEADLINE + BACKUP VIDEO

- [ ] **🛑 3:30 PM HARD DEADLINE — record the backup video.** No exceptions,
      even if V0 is rough. We need the artifact.
  - OBS Studio or QuickTime, 1080p, 30 fps.
  - 60–90 seconds, max 90.
  - Voice runs the laptop; you do the voiceover.
  - Record TWO takes minimum. Pick the better one.
- [ ] Upload backup video to YouTube unlisted (preferred) or Google Drive.
      Put the link in `docs/SUBMISSION.md`.
- [ ] Lock Sofia's prompt. Append the final iteration notes to
      `docs/PITCH_PROMPTS.md`.
- [ ] Deck v3: complete polish, sponsor-logo slide finalized.

### H6 (3:30–5:30 PM)

- [ ] Wait for Voice's confirmation that Railway + Vercel deploys are live.
- [ ] Run the demo against the deployed URLs (not localhost). Once. Then run
      it twice more — you should be doing it from muscle memory now.
- [ ] Q&A prep: read the Q&A section in `docs/DEMO_SCRIPT.md` aloud, draft
      verbatim answers, rehearse the hardest ones.
- [ ] Submission checklist in `docs/SUBMISSION.md`:
  - [ ] Live demo URL filled in (Vercel)
  - [ ] API URL filled in (Railway)
  - [ ] GitHub repo URL: https://github.com/zprinceedwin/riri
  - [ ] Pitch deck link (PDF or Figma Slides public link)
  - [ ] Backup video link
  - [ ] Team roster confirmed

### H7 (5:30–6:30 PM)

- [ ] 3 final rehearsals on venue WiFi end-to-end with the team. Time each.
      Target: 5:00 ± 15 sec.
- [ ] Charge your laptop. Wired mic preferred over wireless.
- [ ] Lock the stage order of operations:
  - You at the mic, Voice on the laptop, UI watching for visual glitches,
    Brain near you to whisper-cue if Sofia drifts in real-time. Brain can
    redeploy a prompt patch in < 60 seconds if needed.

### 6:30–7:00 PM — Pre-submission

- [ ] Pre-submission smoke test (see `docs/SUBMISSION.md`):
  1. Fresh incognito → Vercel URL loads cleanly with Sofia selected.
  2. Press button → Sofia greets within 5 s.
  3. Say one thing → Sofia responds within ~1 s.
  4. Walk through booking → calendar cell turns gold → email arrives.
  5. End call → land on summary → see score + lead.
  6. Reload — no console errors.
- [ ] Eat. Hydrate. Re-read `docs/DEMO_SCRIPT.md` 3 times.

### 7:00–7:15 PM — Submit

- [ ] Open the convoai.club portal.
- [ ] Use the submission title format: `[(Group #) Team Name - Riri]`.
- [ ] Paste the project description from `docs/SUBMISSION.md`.
- [ ] Attach all required artifacts.
- [ ] Submit. Screenshot the confirmation page.
- [ ] Post in team chat: "submitted at HH:MM, URL: <...>, backup video: <...>".

## Definition of done — per phase

| Phase | DoD |
|-------|-----|
| H0 | Sofia prompt v0 + seed content v0 handed to Brain; deck outlined |
| H1 | Brain has wired your v1 content; deck v1 done |
| H2 | First timed read < 5:30; Sofia tuned in dev with Brain |
| H3 | 🛑 Integration gate watched; rehearsal #1 done |
| H4 | 3 rehearsals; Sofia weak spots patched in content (not in code) |
| H5 | 🛑 Backup video uploaded and linked; Sofia prompt locked; deck v3 |
| H6 | Deployed-URL rehearsals; Q&A drafted; submission checklist filled |
| H7 | 3 venue-WiFi rehearsals at 5:00 ± 15 s |
| 6:55 PM | Pre-submission smoke test passes |
| 7:15 PM | Submitted; team chat notified |

## Persona prompt-writing rules (Sofia is the V0 hero)

These are the rules you tune Sofia against. Same rules apply to Jordan + Mike
but their content matters less for the V0 demo.

1. **Voice-first.** No markdown, no bullets, no list markers, no URL-reading.
   Already in the prompt; don't relax it.
2. **Name capture is the first action.** Sofia must ask for the caller's
   name in turn 1.
3. **Only cite from CONTEXT and AVAILABLE_SLOTS.** Hallucinated doctors,
   prices, or services are demo-killers.
4. **Medical questions trigger an immediate handoff.** Non-negotiable for
   liability AND for the "knows its lane" pitch beat.
5. **Two specific options at a time when offering slots.** Sofia gets
   overwhelming if she lists everything.
6. **Numbers in words.** "Eighteen thousand pesos", not "₱18,000".
7. **Test each prompt change with a 30-second flow:** hook → service ask
   → price test → close. Log every change in `docs/PITCH_PROMPTS.md`.

## The pitch beats (memorize these)

1. **Hook (30 s):** "Who's seen Rocky? I'm Rocky — but for you. That's Riri.
   Quick story. My Tita Maria runs a derma clinic in BGC. Three out of every
   ten calls go to voicemail. Half are clients trying to book five-thousand-peso
   treatments. That's twenty thousand pesos walking out the door — every day."
2. **Frame the data (30 s):** "Right now you're looking at Belle Aesthetic
   Manila's front desk. Live calendar, stats, pipeline — all streaming out
   of Couchbase Capella in real time."
3. **Live call (2:30):** Maria Cruz calls in. Price test. Doctor preference.
   Thursday 2 PM. Watch the calendar cell turn gold. Watch the confirmation
   email land on the second monitor.
4. **Dashboard reveal (45 s):** Lead score, captured contact, intent,
   objections handled, sources cited. "Twelve seconds after she said goodbye."
5. **Optional persona switch (30 s, V1 only):** "Sofia is just one persona.
   Imagine a Series-B SaaS startup hiring Riri." Switch to Jordan, 15 seconds.
6. **The frame (30 s):** "Riri — I'm Rocky, but for you. Built on Agora
   Conversational AI. Couchbase Capella for the brain. ElevenLabs voice.
   Deepgram ears. Resend inbox. Shipped in 7 hours by 4 engineers with TRAE,
   Cursor, and Claude Code. We're not selling SaaS. We're plugging the leak
   in your phone. Thank you."

## Lines to call out live to judges (the "look at this" moments)

These are the moments during the live call when you point at the screen so
judges register what's happening:

- *Sofia opens with the caller's name without being told:* "Notice that. We
  never told her the caller's name. Couchbase looked up the contact by phone."
- *Sofia mentions the 3-session package after price pushback:* "That's the
  objection-handling playbook firing — vector-retrieved from Couchbase, not
  hardcoded."
- *Calendar cell flips to gold:* "That's a Couchbase CAS lock — Sofia just
  won the race condition for that exact slot."
- *Email lands on the side monitor:* "That email went through Resend the
  moment she confirmed verbally."

## Q&A prep (rehearse answers to these)

| Question | One-line answer |
|----------|-----------------|
| How is this different from a generic IVR? | "Sofia closes. IVRs route. She also escalates the moment a medical question comes up — clinics need that lane." |
| What about hallucinations? | "Only cites from retrieved CONTEXT. If a fact isn't there, she defers. Post-call summary flags unsupported claims." |
| Why Couchbase, not Pinecone? | "Vector + operational data in one engine. Slot CAS reservation in the same DB. A bolt-on means two failure modes." |
| Tagalog / Taglish? | "Agora ASR supports 30+ languages. A Tagalog Sofia is a 1-hour persona JSON swap." |
| Production-ready? | "No — auth, multi-tenant, CRM sync, billing all cut for the hackathon. Voice + RAG + booking + persona are real." |
| Handoff to a human? | "Pending Handoff panel — coordinator within 5 minutes. Visible in the right rail." |
| Business model? | "Per-clinic SaaS. Manila-first. Filipino service businesses bleed inbound calls; we plug it." |

## Backup plan if the live call fails on stage

1. **Plan A:** retry once (max 30 seconds).
2. **Plan B:** "Same call we ran 20 minutes ago — venue WiFi is doing what
   venue WiFi does." Switch to the backup video tab. Don't apologize. It IS
   the demo.
3. **Plan C** (only if A and B both fail): walk through the dashboard with
   words: "imagine you press the button…". Almost never needed.

## Common pitfalls

- **Fixing Sofia in code instead of content.** If Sofia hallucinates,
  the fix is almost always in `sofia.json` or in the seed FAQ — not in the
  LLM proxy. Edit the content, ping Brain to reseed.
- **Generic clinic copy.** "Premium treatments at competitive prices" is
  noise. "Botox crow's-feet for eighteen thousand pesos, three-session
  package for forty-eight" is signal. Specifics sell.
- **Reading the deck verbatim on stage.** Slides are guardrails, not a
  script. Deliver from memory; the deck reinforces.
- **Missing the H5 video deadline.** If 3:30 PM passes without a video,
  you lose your insurance. Voice and Brain will remind you; do not snooze.
- **Letting Sofia ramble in rehearsal.** If she talks for 8 seconds when 4
  would do, the live demo runs long. Tighten the prompt's "1-3 sentences"
  rule.
- **Submitting without the backup video link.** Judges check. A live URL
  that 404s during their review is the only thing the video saves you from.

## Handoff signals you must send

- **H0 → Brain:** "v0 persona JSON + seed content handed off, here are the
  files."
- **H2 → Brain:** "Sofia weak point: she does X, should do Y. Suggested
  prompt diff: <…>."
- **H3 → entire team:** "First rehearsal done at HH:MM, length was MM:SS,
  here's what we need to tighten."
- **H4 → Brain:** "Final prompt diff for Sofia, please reseed and redeploy."
- **H5 done → entire team:** "Backup video is up, link in SUBMISSION.md."
- **H6 done → entire team:** "Submission checklist is fully ticked except
  for live URLs — ping me the moment deploys are stable so I can paste them."
- **7:15 PM:** "Submitted at HH:MM, screenshot attached."

## At-a-glance checklist

- [ ] H0: Sofia prompt v0 + seed content v0 to Brain; deck outlined
- [ ] H1: Brain wired v1 content; deck v1
- [ ] H2: First timed read < 5:30; tuning session with Brain
- [ ] H3: 🛑 Integration gate watched; first rehearsal
- [ ] H4: 3 rehearsals; Sofia weak points patched in content
- [ ] H5: 🛑 Backup video recorded and uploaded by 3:30 SHARP
- [ ] H6: Deployed-URL rehearsals; Q&A drafted; submission paperwork queued
- [ ] H7: 3 venue-WiFi rehearsals at 5:00 ± 15 s
- [ ] 6:55 PM: Pre-submission smoke test passes
- [ ] 7:15 PM: Submitted; team chat notified
