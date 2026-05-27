# Pitch Prompts (the soul of Riri)

The full system prompts are in [packages/personas/jordan.json](../packages/personas/jordan.json) and [packages/personas/mike.json](../packages/personas/mike.json). This doc is the **iteration log** — the lessons we learn during the day live here.

## Lesson log

Append to this section as you test. Format:

> **HH:MM — what changed — why**

- HH:MM — initial Jordan prompt drafted — focus on urgency, short sentences, never break character
- HH:MM — initial Mike prompt drafted — consultative, cite specifics, never push

## What both personas need to do

1. **Hook with a specific fact** from CONTEXT in the first 10 seconds.
2. **Ask one question at a time**, then shut up.
3. **Tie product features to prospect pain** using CONTEXT — no feature dumps.
4. **Handle objections** by re-framing with a specific fact.
5. **Always be closing** — push for a calendar booking.
6. **Never invent facts** — if something isn't in CONTEXT, defer ("let me get back to you").
7. **Voice-first** — no markdown, no lists, conversational sentences only.
8. **Stay in character** — never say "as an AI" or "I'm a bot".

## Anti-patterns we've caught in testing

- **Feature dumping.** Symptom: the agent recites 4 bullet points without listening. Fix: tighten the "ask one question at a time" instruction.
- **Hallucinating customer names.** Symptom: agent says "we work with Acme" when Acme isn't in CONTEXT. Fix: add explicit "only cite from CONTEXT" rule.
- **Reading URLs out loud.** Symptom: "https colon slash slash". Fix: add explicit "never read URLs" rule.
- **Breaking into Markdown.** Symptom: asterisks and bullet markers leaking into speech. Fix: emphasize "voice-first, no markdown" at the top of the prompt.

## How to tune

1. Edit `packages/personas/jordan.json` (or `mike.json`).
2. Save — backend hot reloads via `tsx watch`.
3. Press the call button on the dashboard.
4. Test a 30-second flow: hook → discovery → pitch → objection → close.
5. Log the change above.

## When to add a new persona

1. Copy `jordan.json` to `<name>.json`.
2. Bump `packages/shared/src/index.ts` `PersonaIdSchema` to include your new id.
3. Register it in `packages/personas/src/index.ts`.
4. Map a voice id in `apps/api/src/env.ts` if you want a different ElevenLabs voice.
5. Update the PersonaSwitcher — should pick it up automatically.
