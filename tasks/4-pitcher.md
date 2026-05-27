# Role 4 — Pitcher

> You deliver the 5-minute pitch. You own the words, the deck, the stage
> choreography, the backup video, the caller-role acting during the live demo,
> and the submission paperwork. You are the face of Riri on stage.

## Scope (what you own end-to-end)

- The 5-minute pitch script (`docs/DEMO_SCRIPT.md`) and its delivery.
- The pitch deck (Figma Slides → PDF for submission).
- The 60–90 second backup demo video (recorded at H5, no exceptions).
- Stage choreography: where the team stands, who runs the laptop, where the
  mic goes, when to cue the dashboard.
- The "Maria Cruz" caller role during the live demo.
- 3 dress rehearsals on real venue WiFi.
- Q&A preparation.
- Submission at 7:15 PM via [convoai.club](https://convoai.club).

## Not your scope

- Writing any production code, persona JSON, or API logic. You can REQUEST
  changes by pinging Brain (e.g. "Sofia is hallucinating on cancellation
  policy, can you tighten that prompt").
- Owning deployment URLs — that's Voice.
- Building the dashboard — that's UI.

## Branch convention

`story/<topic>` for any doc PRs. You'll mostly be editing markdown + Figma
links, not code.

## Files you own

- `docs/DEMO_SCRIPT.md`
- `docs/SUBMISSION.md`
- The pitch deck (Figma Slides) — link goes in `docs/SUBMISSION.md`.
- The backup video file — uploaded to YouTube unlisted or Google Drive,
  link goes in `docs/SUBMISSION.md`.

## Files you must NOT touch

- Any code in `apps/` or `packages/`.
- Persona JSON content — Brain.
- README technical sections — Voice or Brain.

## Hour-by-hour tasks

### H0 (8:30–10:30 AM, pre-build during sponsor talks)

- [ ] Read [`docs/DEMO_SCRIPT.md`](../docs/DEMO_SCRIPT.md) twice. Internalize
      the Tita Maria framing and the "I'm Rocky — but for you" hook.
- [ ] Confirm team roster registration for the event.
- [ ] Open a Figma Slides file titled `Riri — Agora Hackathon Philippines 2026`.
- [ ] Identify which teammate plays "Maria Cruz" on the mic (you, ideally — or
      a co-pilot with a warm, conversational voice).
- [ ] Memorize the demo script beats by hour markers:
      - 0:00 — Hook + Tita Maria
      - 0:30 — Frame the data
      - 1:00 — Live call
      - 3:30 — Dashboard reveal
      - 4:15 — Optional persona switch
      - 4:45 — The frame + thank-you

### H1 (10:30–11:30 AM)

- [ ] Pitch deck v0 outline: hook slide → problem slide → solution slide →
      architecture slide → live demo placeholder → sponsor logos → close slide.
- [ ] Draft 3 candidate hooks to A/B with the team at lunch.
- [ ] Confirm the venue stage layout: where you'll stand, how the projector
      faces, whether the mic is wired or wireless.

### H2 (11:30 AM–12:30 PM, working lunch)

- [ ] First dry-read of the script aloud (alone, with a timer). Target: 5:00.
      If you're at 6:30, you have to cut — likely from the architecture
      explanation or the V1 persona switch.
- [ ] Lock the pitch deck content (1 v1).
- [ ] Brief the team on the cue moments — what Voice + UI should do when you
      hit specific lines (e.g., "when I say 'watch the calendar', UI should
      already have the booking flow primed").

### H3 (12:30–1:30 PM) — INTEGRATION GATE

- [ ] **🛑 1:30 PM HARD GATE — watch with Voice + Brain + UI:** press the gold
      button, hear Sofia, watch transcript, end call, summary appears.
- [ ] If the gate passes: rehearse the live-call section with the team for the
      first time, you playing Maria.
- [ ] If the gate fails: STOP all V1 work, pivot the script to whatever V0
      can do (e.g., maybe no live call — just the dashboard tour and the
      backup video).

### H4 (1:30–2:30 PM)

- [ ] Rehearse the live call 3 times. Specifically practice:
  - The price pushback ("how much is it? … that's a lot").
  - Staying silent when you should — Sofia needs space to talk.
  - The Thursday-2-PM close moment.
- [ ] Note any Sofia weak spots — ping Brain to tune them.
- [ ] Deck v2: add the live-demo screenshot of the dashboard for the cover.

### H5 (2:30–3:30 PM) — V0 BULLETPROOF DEADLINE + BACKUP VIDEO

- [ ] **🛑 3:30 PM HARD DEADLINE — record the backup video.** No exceptions,
      even if V0 is rough. We need the artifact.
  - Use OBS Studio or QuickTime.
  - Resolution: 1080p, 30 fps.
  - Length: 60–90 seconds, MAX 90.
  - Voice runs the laptop, you do the voiceover. UI is ready to redeploy if
    something visual breaks mid-record.
  - Record TWO takes minimum. Pick the better one.
- [ ] Upload backup video to YouTube unlisted (preferred) or Google Drive.
      Put the link in `docs/SUBMISSION.md`.
- [ ] Deck v3: complete polish, sponsor-logo slide finalized.

### H6 (3:30–5:30 PM)

- [ ] Wait for Voice to confirm Railway + Vercel deploys are live.
- [ ] Run the demo against the deployed URLs (not localhost). Once.
- [ ] Then run it 2 more times. You should be able to do it from muscle
      memory now.
- [ ] Q&A prep: read the Q&A section in `docs/DEMO_SCRIPT.md` aloud, draft
      your answers verbatim, rehearse the hardest ones.
- [ ] Submission checklist (`docs/SUBMISSION.md`):
  - [ ] Live demo URL filled in (Vercel)
  - [ ] API URL filled in (Railway)
  - [ ] GitHub repo URL: https://github.com/zprinceedwin/riri
  - [ ] Pitch deck link (PDF or Figma Slides public link)
  - [ ] Backup video link
  - [ ] Team roster confirmed

### H7 (5:30–6:30 PM)

- [ ] 3 final rehearsals on venue WiFi end-to-end with the team. Time each.
      Target: 5:00 ± 15 sec.
- [ ] Charge your laptop. Wired mic preferred over wireless if available.
- [ ] Lock the order of operations on stage:
  - You at the mic, Voice on the laptop, UI watching for visual glitches.
  - Brain near you to whisper-cue if Sofia drifts in real-time (they can
    redeploy a prompt patch in <60 sec if needed).

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
- [ ] Submit. Take a screenshot of the confirmation page.
- [ ] Post in team chat: "submitted at HH:MM, URL: <...>, backup video: <...>".

## Definition of done — per phase

| Phase | DoD |
|-------|-----|
| H0 | Script memorized; deck outlined; roles + stage layout confirmed |
| H1 | Deck v1; hook candidates drafted |
| H2 | First timed read at < 5:30; team briefed on cues |
| H3 | 🛑 Integration gate watched; rehearsal #1 done |
| H4 | 3 rehearsals; weak points flagged to Brain; deck v2 |
| H5 | 🛑 Backup video uploaded and linked; deck v3 |
| H6 | Deployed-URL rehearsals; Q&A drafted; submission checklist fully ticked |
| H7 | 3 venue-WiFi rehearsals at 5:00 ± 15 sec each |
| 6:55 PM | Pre-submission smoke test passes |
| 7:15 PM | Submission confirmed; screenshot saved |

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
   Conversational AI for sub-650 ms voice. Couchbase Capella for the brain.
   ElevenLabs voice. Deepgram ears. Resend inbox. Shipped in 7 hours by 4
   engineers with TRAE, Cursor, and Claude Code. We're not selling SaaS.
   We're plugging the leak in your phone. Thank you."

## Lines to call out live to judges (the "look at this" moments)

These are the moments where you point at the screen during the call to make
sure judges register what's happening:

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
| Tagalog / Taglish? | "Agora ASR supports 30+ languages. A Tagalog Sofia is a 1-hour persona swap." |
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

## Handoff signals you must send

- **H0 → Voice:** "Stage layout: I'm at the mic stage-left, you're at the
  laptop stage-center."
- **H4 → Brain:** "Sofia is weak on X — can you tune?" (or "Sofia is rock-solid,
  ship it.")
- **H5 done → entire team:** "Backup video is up, link in SUBMISSION.md."
- **H6 done → entire team:** "Submission checklist is fully ticked except for
  the live URLs, ping me the moment deploys are stable."
- **7:15 PM:** "Submitted at HH:MM, screenshot attached."

## At-a-glance checklist

- [ ] H0: Script memorized, deck outlined, stage layout locked
- [ ] H1: Hook candidates drafted, deck v1
- [ ] H2: First timed read < 5:30
- [ ] H3: 🛑 Integration gate watched; first rehearsal
- [ ] H4: 3 rehearsals; weak prompts pinged to Brain
- [ ] H5: 🛑 Backup video recorded and uploaded by 3:30 SHARP
- [ ] H6: Deployed-URL rehearsals; Q&A drafted; submission paperwork queued
- [ ] H7: 3 venue-WiFi rehearsals at 5:00 ± 15 s
- [ ] 6:55 PM: Pre-submission smoke test passes
- [ ] 7:15 PM: Submitted; team chat notified
