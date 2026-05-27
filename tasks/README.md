# tasks/ — Per-role task books

This folder holds one comprehensive task list per role for the Riri team during
the Agora Hackathon Philippines 2026. Each file is the **single source of truth**
for what its role has to do — pre-event, hour by hour, and through to submission
at 7:15 PM.

## The four roles

| # | Role | File | One-line |
|---|------|------|----------|
| 1 | **Voice / Tech Lead** | [`1-voice-tech-lead.md`](1-voice-tech-lead.md) | Owns Agora end-to-end and is the integration owner who merges to `main`. |
| 2 | **Brain / Backend** | [`2-brain-backend.md`](2-brain-backend.md) | Owns Couchbase + the custom LLM proxy + clinic primitives (slot CAS, bookings, contacts, handoffs) + Resend + seed-script code. |
| 3 | **UI / Frontend** | [`3-ui-frontend.md`](3-ui-frontend.md) | Owns the Next.js dashboard, every component, the brand visual implementation, and the Vercel deploy. |
| 4 | **Story & Content** | [`4-story-content.md`](4-story-content.md) | Owns every word: persona JSON content, seed playbook prose, demo script, pitch deck, pitch delivery, brand direction, and submission paperwork. |

## How the work splits along the code / content seam

Brain and Story share files but on different axes — code vs prose. Anywhere
this matters:

| File or area | Code (Brain) | Content (Story) |
|---|---|---|
| `packages/personas/sofia.json` etc. | registry wiring (`src/index.ts`) | the system prompt + greeting + voice notes |
| `apps/api/src/seed/seed-clinic.ts` | script structure, embedding pipeline, Couchbase upserts | the `CLINIC_OVERVIEW` / `FAQ_DOC` / `OBJECTION_PLAYBOOK` strings |
| `apps/api/src/lib/clinic-catalog.ts` | the array shapes, the IDs, the prices | `description` text on each service, `bio` text on each doctor |
| `docs/PITCH_PROMPTS.md` | (nothing) | the prompt-iteration log; Story writes every entry |
| `docs/DEMO_SCRIPT.md` | (nothing) | Story owns top to bottom |
| `tailwind.config.ts` + `globals.css` | UI implements palette + utilities | Story directs intent (what each color means, what the tone is) |

Brain reseeds when Story signals "content updated"; UI repaints when Story
signals "tone shifted". The compile-time wiring stays with the engineers; the
prose stays with the writer.

## How to use this folder

1. **Each role reads their file once at H0** and treats the at-a-glance checklist
   at the bottom as the to-do for the day.
2. **Hour-by-hour sections** mirror the master timeline in
   [`../docs/PLAN.md`](../docs/PLAN.md). If a deadline slips, the hour boundary
   tells you which dependencies are now blocked.
3. **"Files you own"** is the swimlane — only this role merges changes there
   without prior ping.
4. **"Files you must NOT touch"** is the explicit anti-collision rule. Stay
   out of other people's swimlanes unless you ping the owner first.
5. **"Handoff signals"** is the queue of pings to other roles you need to send
   at specific moments (e.g. Voice telling Brain "LLM proxy URL is alive at X").
6. **"Definition of done"** at each phase is the only thing that lets you move
   on to the next phase.

## Integration ownership

Voice / Tech Lead is the integration owner. From **H5 onwards** they stop
writing features and only merge other people's branches into `main`. If you
have a branch ready, ping Voice — do not merge to `main` yourself after H5
unless Voice is offline.

## Hard deadlines

- **H3 — 1:30 PM**: end-to-end integration gate. Press the button, Sofia
  talks, calendar updates, transcript appears. If this fails, **all V1
  features are cancelled** and the whole team converges on V0 polish.
- **H5 — 3:30 PM**: backup demo video recorded no matter what. Story
  enforces this with a calendar alert.
- **H6 — 4:30 PM**: production deploys live on Vercel + Railway with real
  URLs smoke-tested.
- **6:55 PM**: pre-submission smoke test (see `4-story-content.md`).
- **7:15 PM**: submission at [convoai.club](https://convoai.club).
