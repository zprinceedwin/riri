# Role 3 — UI / Frontend

> You own everything the user sees: the Next.js dashboard, every component, the
> live calendar, the post-call summary, the brand visual kit. Your work is
> what the judges look at while Pitcher talks.

## Scope (what you own end-to-end)

- The Next.js 14 dashboard at `apps/web/`.
- All React components: push-to-talk, transcript panel, sources panel, calendar
  grid, pipeline board, stats strip, pending handoff panel, lead score card,
  persona switcher, brand mark.
- Live transcript wiring against the Agora data channel events (you take
  what Voice's `lib/agora.ts` emits and render it).
- The post-call summary screen at `/summary/[callId]`.
- Vercel deployment of the web app.
- **Brand kit** (delegated from the old Person 4): logo lockup, color palette,
  type scale, the dark-slate + warm-gold aesthetic in `globals.css` and
  `tailwind.config.ts`.

## Not your scope

- Agora SDK plumbing or RTC token logic — Voice owns `lib/agora.ts` (you
  consume its public API).
- API routes, Couchbase, LLM proxy, Resend — Brain owns everything backend.
- Pitch deck, demo script, backup video — Pitcher.
- Persona JSON content — Brain.

## Branch convention

`ui/<topic>` — push WIP every hour even if broken.

## Files you own

- `apps/web/app/page.tsx` (the main dashboard)
- `apps/web/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/summary/[callId]/page.tsx`
- All of `apps/web/components/*`:
  - `AgentStateBadge.tsx`
  - `Brand.tsx`
  - `CalendarGrid.tsx`
  - `LeadScoreCard.tsx`
  - `PendingHandoffPanel.tsx`
  - `PersonaSwitcher.tsx`
  - `PipelineBoard.tsx`
  - `PushToTalk.tsx` (UI; Voice owns the Agora wiring inside)
  - `SourcesPanel.tsx`
  - `StatsStrip.tsx`
  - `TranscriptPanel.tsx`
- `apps/web/lib/api.ts` (typed wrappers — you maintain these in sync with
  Brain's routes)
- `apps/web/lib/cn.ts`
- `apps/web/tailwind.config.ts`
- `apps/web/postcss.config.js`

## Files you must NOT touch

- Anything under `apps/api/` — Brain.
- `apps/web/lib/agora.ts` — Voice (consume its public API, don't edit).
- Persona JSON files — Brain.

## Hour-by-hour tasks

### H0 (8:30–10:30 AM, pre-build during sponsor talks)

- [ ] Next.js scaffold confirmed running locally on port 3000.
- [ ] Tailwind config + globals.css produce the dark-slate + gold aesthetic.
- [ ] Brand kit confirmed: `BrandMark` component renders, ink + gold palette
      consistent across `pill` + `glass-card` utility classes.
- [ ] Route shells exist for `/` and `/summary/[callId]`.

### H1 (10:30–11:30 AM)

- [ ] `apps/web/lib/api.ts` typed wrappers point at the API. Make sure every
      `ROUTE` constant from `@riri/shared` is wired.
- [ ] `BrandMark` + `AgentStateBadge` + `PersonaSwitcher` polished.
- [ ] `PushToTalk` connects to Voice's `joinCall()` and surfaces `agentState`.

### H2 (11:30 AM–12:30 PM)

- [ ] `TranscriptPanel` renders partial + final turns with the correct styling.
- [ ] Make sure partial turns visually fade (already done with `opacity-70`).
- [ ] Pre-build `CalendarGrid` against mock data so you're ready when Brain's
      `/api/slots` lands. Use the same status enum: `available` / `held` / `booked`.

### H3 (12:30–1:30 PM) — INTEGRATION GATE

- [ ] Wire `CalendarGrid` to `listSlots()` polling every 3 s.
- [ ] Wire `PipelineBoard` to `listContacts()` + `listBookings()` + `listServices()`.
- [ ] Wire `StatsStrip` to the same data.
- [ ] Wire `PendingHandoffPanel` to `listHandoffs()` polling every 5 s.
- [ ] **🛑 1:30 PM HARD GATE — with Voice + Brain:** demo flow renders cleanly,
      transcript appears, end call lands on summary.

### H4 (1:30–2:30 PM)

- [ ] Summary page (`/summary/[callId]`) uses the prominent `LeadScoreCard`
      hero with SVG ring + tier label + top-3 objections.
- [ ] Handoff banner appears at the top of the summary when
      `summary.handoffRequired === true`.
- [ ] Lead card on the summary screen shows clinic fields: `intent`,
      `requestedService`, `requestedDoctor`, `requestedTimeWindow`.
- [ ] Pre-loaded caller toggle on the left rail is functional and disabled
      when the persona is not Sofia.

### H5 (2:30–3:30 PM) — V0 BULLETPROOF DEADLINE

- [ ] Micro-animations:
  - StatsStrip numbers count up smoothly on mount and on data change.
  - Pipeline NEW pill scale-ins.
  - Calendar booked cells: optional `highlightSlotId` flash after a booking
    confirms.
- [ ] Mobile-responsive smoke test (judges might glance at a phone): the grid
      stacks gracefully on `lg:` breakpoint.
- [ ] Help Pitcher capture the backup video by running the demo flow flawlessly
      while they OBS-record at 3:30.

### H6 (3:30–5:30 PM)

- [ ] Deploy to Vercel.
- [ ] Set `NEXT_PUBLIC_API_BASE_URL` to the Railway URL.
- [ ] Re-test the entire demo flow from a fresh incognito window on the
      Vercel URL.
- [ ] If V0 is rock-solid, V1 polish stretch:
  - SourcesPanel populates from a polling endpoint Brain might add.
  - Persona switch animation between Sofia/Jordan/Mike.
  - "Pre-loaded prospect" toggle label refinement.

### H7 (5:30–6:30 PM)

- [ ] Stop touching the FE. The Vercel deploy is frozen.
- [ ] Run 3 rehearsals end-to-end with Pitcher and Voice.
- [ ] Be ready to hotfix Vercel from your laptop if a deploy goes sideways
      during the actual pitch.

## Definition of done — per phase

| Phase | DoD |
|-------|-----|
| H0 | Brand mark + palette + route shells render in dev |
| H1 | API wrappers typed and importable; PushToTalk + AgentStateBadge work |
| H2 | TranscriptPanel renders Voice's live turns |
| H3 | 🛑 Integration gate; CalendarGrid + Pipeline + Stats all live |
| H4 | Summary screen with hero LeadScoreCard; handoff banner working |
| H5 | All micro-animations and polish; mobile-safe |
| H6 | Vercel deploy live; full flow verified on the real URL |
| H7 | No further FE merges; 3 rehearsals clean |

## Common pitfalls

- **Hydration mismatch on Intl date formatting.** Always wrap `new Date()`
  calls in `useMemo` with `[]` deps, or do them in `useEffect`. Otherwise
  SSR + CSR disagree.
- **CORS.** When you switch to the deployed API, the API CORS must allow your
  Vercel origin. If you hit CORS errors after deploy, ping Brain to add the
  origin to the env-driven allowlist.
- **Polling during call.** CalendarGrid polls every 3 s and PendingHandoff
  polls every 5 s. Both ONLY when `active={isLive}`. Don't burn API quota
  when no call is happening.
- **Persona switcher disabled mid-call.** You must disable persona switching
  while `callStatus !== "idle"` — switching personas mid-call leaves Agora in
  a bad state.
- **`use client` is required** on every component that uses hooks. Always
  check the top of the file.
- **Don't import server-only code into the client.** Anything that touches
  Couchbase or OpenAI must stay in `apps/api/`.
- **TailwindCSS purge.** Don't dynamically construct class names like
  `bg-${color}-500` — they get purged. Use a switch.

## Brand kit reference (owned by you)

- **Palette:** `ink-*` (dark slate scale, 50–950) and `gold-*` (warm gold,
  400–700). Already in `tailwind.config.ts`. Do not add new accent colors
  without ping.
- **Components:** `glass-card` utility for surfaces, `pill` utility for tags.
- **Type:** display + sans both fall through to system stack. Inter is
  preferred but not mandatory (we don't load a webfont to keep cold-start fast).
- **Logo:** the gold square with white "R" + the wordmark "Riri" + the
  "AI Sales Closer" / for clinic V0 you may swap that line to "AI Receptionist"
  if Pitcher agrees.
- **Spacing:** 4-pt grid. All padding/margin uses Tailwind's default scale.

## Handoff signals you must send

- **H1 done → Voice:** "PushToTalk is calling your `joinCall()` correctly,
  ready to consume `onTranscript` + `onAgentState`."
- **H2 done → Voice + Brain:** "TranscriptPanel renders turns; format I expect
  is `{ role, text, ts, turnId, final }`."
- **H3 done → Pitcher:** "Dashboard is ready to demo. Calendar + Pipeline +
  Stats are all live-wired."
- **H4 done → Pitcher:** "Summary page is ready, LeadScoreCard hero renders."
- **H6 done → Pitcher + Voice:** "Vercel URL is `<...>`, deploy is frozen,
  ready for rehearsals."

## At-a-glance checklist

- [ ] H0: Brand mark, palette, route shells in dev
- [ ] H1: API wrappers + PushToTalk + AgentStateBadge live
- [ ] H2: TranscriptPanel renders turns from Voice's pipeline
- [ ] H3: 🛑 Integration gate; Calendar, Pipeline, Stats, Handoffs wired
- [ ] H4: Summary hero LeadScoreCard; handoff banner; clinic lead fields
- [ ] H5: Micro-animations; mobile-safe; backup video captured with Pitcher
- [ ] H6: Vercel live; full flow on production URL
- [ ] H7: FE frozen; 3 rehearsals; ready to hotfix
