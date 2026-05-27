# Pitch Prompts (the soul of Riri)

The full system prompts live in JSON:
- [packages/personas/sofia.json](../packages/personas/sofia.json) — V0 clinic concierge
- [packages/personas/jordan.json](../packages/personas/jordan.json) — alternative persona for the persona-engine demo
- [packages/personas/mike.json](../packages/personas/mike.json) — alternative persona for the persona-engine demo

This doc is the **iteration log** — the lessons we learn during testing live here.

## Sofia — Belle Aesthetic Manila concierge

Sofia is the load-bearing persona for V0. Everything else is decoration.

### Design goals

1. **Sound like a real human receptionist**, not a chatbot. Warm, professional, conversational. Never robotic.
2. **Get the name in the first 10 seconds.** Then use it naturally throughout. Returning callers (via the CONTACT block) get greeted by name immediately.
3. **Sell, don't just route.** Handle price resistance with package savings. Suggest relevant upsells. Always assume the close.
4. **Know its lane.** Medical questions, contraindications, frustration, or repeated misunderstanding triggers an explicit handoff to a coordinator. Sofia is not a doctor.
5. **Never invent facts.** Prices, doctors, services, availability — only what's in CONTEXT and AVAILABLE_SLOTS.

### Lesson log

Append as you test. Format: `HH:MM — what changed — why`.

- 13:00 — initial Sofia prompt drafted — warm clinic concierge, BGC derma clinic
- 13:15 — added "first action: get the caller's name" — calls without the name tag felt impersonal
- 13:30 — added explicit medical-question handoff trigger — Sofia was wandering toward giving dermatology advice; bad form for safety + liability
- 13:45 — moved "say prices in words not digits" into the voice rules — TTS was reading "₱18,000" as "peso symbol one eight comma zero zero zero"
- 14:00 — emphasized "use AVAILABLE_SLOTS, propose TWO specific options" — Sofia was over-listing and the caller felt overwhelmed

### Anti-patterns we've caught testing Sofia

- **Listing services like a menu.** Symptom: "We have Botox, Profhilo, Hydrafacial, Carbon laser, Chemical peel, LED…". Fix: explicit rule — speak naturally, propose TWO specific options at a time.
- **Reading prices as digits.** Symptom: "one eight comma zero zero zero pesos". Fix: voice rule — say numbers naturally ("eighteen thousand pesos").
- **Improvising medical advice.** Symptom: caller asks "is Botox safe for me", Sofia answers anyway. Fix: explicit medical-question escalation trigger.
- **Forgetting the name.** Symptom: Sofia uses "you" the whole call after the caller said "I'm Maria". Fix: "use it naturally throughout the call" with concrete examples.
- **Pushing too hard on packages.** Symptom: every objection collapses into "buy the 3-session package!". Fix: "mention the relevant package savings or an alternative service tier" — give her room to pivot.

## Jordan and Mike (alternative personas, persona-engine demo)

Kept in the codebase for the V1 persona-switch reveal in the pitch. Same principles apply:

1. Hook with a specific fact from CONTEXT.
2. Ask one question at a time.
3. Tie features to pain — no feature dumps.
4. Voice-first — no markdown, no lists, no read-aloud URLs.
5. Stay in character — never say "as an AI".

## How to tune any persona

1. Edit the persona JSON in `packages/personas/`.
2. Save — backend hot reloads via `tsx watch`.
3. Press the call button on the dashboard.
4. Test a 30-second flow appropriate to the persona (Sofia: hook → service ask → price test → close).
5. Log the change above.

## When to add a new persona

1. Copy an existing persona JSON to `<name>.json` in `packages/personas/`.
2. Bump `packages/shared/src/index.ts` `PersonaIdSchema` to include your new id.
3. Register it in `packages/personas/src/index.ts`.
4. Add an env var `ELEVENLABS_VOICE_ID_<NAME>` and map it in `apps/api/src/lib/agora.ts` (the `buildTtsConfig` switch).
5. The PersonaSwitcher picks it up automatically.
