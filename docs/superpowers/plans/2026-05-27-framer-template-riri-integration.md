# Framer Template To Riri Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing Framer marketing template to the Riri Next.js codebase by rebuilding the template as native, maintainable app components while preserving the working voice demo dashboard.

**Architecture:** Treat Unframer MCP as the live design/spec source. The Framer React export path is currently blocked by an inactive React Export subscription, so the implementation should use `getProjectXml` / `getNodeXml` output as reference and hand-build typed Next.js + Tailwind components that reuse Riri's existing design tokens, API wrappers, and demo routes.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, pnpm monorepo, Unframer MCP.

---

## Discovered Context

Framer project:
- Pages: `/`, `/404`
- Main focused page: `augiA20Il`
- Root desktop breakpoint: `WQLkyLRf1`
- Main template sections: hero, problem cards, solution/features accordion, video/info banner, enterprise feature grid, testimonials, FAQ
- Reusable Framer components: `button`, `GhostBadge`, `FeatureCard`, `features`, `faq-container`, plus unused/listed `nav-bar`, `footer`, `link`, `menu-icon`
- Code components: none
- CMS collections: none observed in `getProjectXml`
- Color styles: `/Brand` is orange `rgb(251, 103, 4)`, `/Dark`, `/Light`, `/Background/Black`
- Text styles: Switzer headings/body and IBM Plex Mono labels

Important blocker:
- `exportReactComponents` failed with: "No active React Export subscription found."
- Do not plan on generated `.jsx` / `.css` as the primary implementation path unless the subscription is activated later.

Current Riri app:
- `apps/web/app/page.tsx` is the live voice dashboard.
- `apps/web/app/summary/[callId]/page.tsx` is the post-call summary flow.
- `apps/web/components/*` contains working dashboard components.
- `apps/web/tailwind.config.ts` already defines Riri's `ink-*` and `gold-*` palette.
- `tasks/3-ui-frontend.md` says UI owns `apps/web/app/*`, `apps/web/components/*`, `apps/web/lib/api.ts`, `apps/web/lib/cn.ts`, and must not touch `apps/api/` or `apps/web/lib/agora.ts`.

Design decision:
- Keep Riri's dark-slate + warm-gold identity instead of importing the Framer orange brand wholesale.
- Build the Framer template as a marketing landing layer around the existing demo, not as a replacement for the call runtime UI.

## Route Map

Initial safe route map:
- Keep existing dashboard available during implementation.
- Add marketing landing first at `apps/web/app/landing/page.tsx`.
- Keep post-call summary at `apps/web/app/summary/[callId]/page.tsx`.

Final route map after verification:
- `/` -> marketing landing page
- `/demo` -> existing live voice dashboard
- `/summary/[callId]` -> existing post-call summary

This avoids breaking the working demo while the Framer template is being translated.

## File Structure

Create:
- `apps/web/app/landing/page.tsx` - temporary landing route during implementation.
- `apps/web/app/demo/page.tsx` - final dashboard route.
- `apps/web/components/dashboard/DashboardShell.tsx` - extracted current dashboard implementation from `app/page.tsx`.
- `apps/web/components/marketing/MarketingLanding.tsx` - composed landing page.
- `apps/web/components/marketing/MarketingHero.tsx` - Framer hero adapted to Riri copy and CTA.
- `apps/web/components/marketing/MarketingProblem.tsx` - three-card "problem" section from Framer.
- `apps/web/components/marketing/MarketingSolution.tsx` - "One voice agent" / feature accordion section.
- `apps/web/components/marketing/MarketingProof.tsx` - testimonials and sponsor/technology proof.
- `apps/web/components/marketing/MarketingFaq.tsx` - FAQ section.
- `apps/web/components/marketing/MarketingCta.tsx` - final CTA into `/demo`.
- `apps/web/lib/marketing-content.ts` - typed content arrays and Framer-derived image URLs.

Modify:
- `apps/web/app/page.tsx` - after landing is verified, render `MarketingLanding`.
- `apps/web/app/layout.tsx` - update metadata for landing page positioning.
- `apps/web/app/globals.css` - add only reusable utilities that are broadly useful; prefer local Tailwind classes first.
- `apps/web/tailwind.config.ts` - avoid token changes unless Story explicitly approves a new accent.

Do not modify:
- `apps/api/**`
- `apps/web/lib/agora.ts`
- `packages/personas/**`

---

### Task 1: Preserve The Existing Dashboard

**Files:**
- Create: `apps/web/components/dashboard/DashboardShell.tsx`
- Modify: `apps/web/app/page.tsx`
- Create later: `apps/web/app/demo/page.tsx`

- [ ] **Step 1: Extract the current dashboard component**

Move the current implementation from `apps/web/app/page.tsx` into `apps/web/components/dashboard/DashboardShell.tsx`.

The new component should keep `"use client"` at the top because it uses hooks, router navigation, and live call state.

- [ ] **Step 2: Keep `/` behavior unchanged**

Replace `apps/web/app/page.tsx` with a small wrapper:

```tsx
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function HomePage() {
  return <DashboardShell />;
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @riri/web typecheck`

Expected: PASS, because no behavior changed.

---

### Task 2: Add A Native Marketing Content Model

**Files:**
- Create: `apps/web/lib/marketing-content.ts`

- [ ] **Step 1: Define typed content arrays**

Create typed arrays for:
- problem cards
- solution features
- proof/testimonial cards
- FAQs
- hero stats or sponsor proof

Use Framer copy as the starting point, then adapt to Riri:
- Framer "Voxera" -> Riri
- "AI Voice Agents for Every Customer Call" -> "AI receptionists with the personality of a real closer"
- "book appointments, qualify leads" -> preserve, because it matches Sofia's clinic flow
- generic enterprise claims -> tie to Agora, Couchbase, ElevenLabs, Deepgram, OpenAI, Resend

- [ ] **Step 2: Include Framer-derived image references cautiously**

Store remote Framer asset URLs as constants only if they clearly support the visual layout:
- Hero background: `https://framerusercontent.com/images/5bPb7q14FHHCXYCxIus0taTAm0Y.jpg`
- Solution images from `features`: `AkIv3Rvpq7PgAUtU1esP8bEJCw.jpg`, `vo2YUCIUWfROTRzAdoRIGwfsbDg.jpg`, `cNN9UgUh9ezNi0rkQipuQEpScS8.jpg`, `Rwqhm6V3vJb1rfataSDwcgtsoo.jpg`

Use plain CSS `backgroundImage` or `<img>` initially to avoid changing Next image remote domain config.

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @riri/web typecheck`

Expected: PASS.

---

### Task 3: Build Reusable Marketing Primitives

**Files:**
- Create: `apps/web/components/marketing/MarketingHero.tsx`
- Create: `apps/web/components/marketing/MarketingProblem.tsx`
- Create: `apps/web/components/marketing/MarketingSolution.tsx`
- Create: `apps/web/components/marketing/MarketingProof.tsx`
- Create: `apps/web/components/marketing/MarketingFaq.tsx`
- Create: `apps/web/components/marketing/MarketingCta.tsx`

- [ ] **Step 1: Implement `MarketingHero`**

Mirror Framer structure:
- full-height hero
- dark image backdrop with overlay
- large centered headline
- supporting paragraph
- CTA button
- "Backed by industry leaders" proof row

Adapt behavior:
- CTA links to `/demo`
- secondary CTA can link to `#how-it-works` or `#faq`
- use `BrandMark` from `apps/web/components/Brand.tsx`

- [ ] **Step 2: Implement `MarketingProblem`**

Map Framer's "The Problem" cards:
- missed calls lose revenue
- long wait times damage trust
- support teams do not scale with demand

Use Riri-specific language for clinic and sales calls.

- [ ] **Step 3: Implement `MarketingSolution`**

Map Framer's `features` component:
- "Human-Like Voice Conversations"
- "Instant 24/7 Call Handling"
- "Smart Escalation to Humans"
- "Actionable Call Insights"

Use a simple local selected-state accordion if interaction is useful. Keep it client-side only for this component, not for the whole page.

- [ ] **Step 4: Implement `MarketingProof`**

Replace generic testimonials with product proof:
- Sofia clinic receptionist demo
- persona engine: Sofia/Jordan/Mike
- Agora + Couchbase sponsor proof
- post-call summary and handoff proof

- [ ] **Step 5: Implement `MarketingFaq`**

Adapt Framer FAQ:
- What can Riri handle?
- Does the voice agent sound human?
- How long does setup take?
- Can it integrate with existing tools?
- Is it production-ready?

Be honest about V0 limitations from `README.md`.

- [ ] **Step 6: Implement `MarketingCta`**

Final CTA should send judges/users to `/demo`.

- [ ] **Step 7: Run typecheck**

Run: `pnpm --filter @riri/web typecheck`

Expected: PASS.

---

### Task 4: Compose The Landing Page

**Files:**
- Create: `apps/web/components/marketing/MarketingLanding.tsx`
- Create: `apps/web/app/landing/page.tsx`

- [ ] **Step 1: Compose sections in Framer order**

Order:
1. Hero
2. Problem
3. Solution/features
4. Proof/testimonials
5. FAQ
6. CTA

- [ ] **Step 2: Add anchor navigation**

Use simple links:
- `#problem`
- `#solution`
- `#proof`
- `#faq`
- `/demo`

- [ ] **Step 3: Render temporary route**

`apps/web/app/landing/page.tsx` should render `MarketingLanding`.

- [ ] **Step 4: Run local build check**

Run: `pnpm --filter @riri/web typecheck`

Expected: PASS.

Run: `pnpm --filter @riri/web build`

Expected: PASS.

---

### Task 5: Promote Landing To `/` After Visual Check

**Files:**
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/demo/page.tsx`

- [ ] **Step 1: Create `/demo` route**

Create `apps/web/app/demo/page.tsx`:

```tsx
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function DemoPage() {
  return <DashboardShell />;
}
```

- [ ] **Step 2: Promote landing to `/`**

Change `apps/web/app/page.tsx` to render `MarketingLanding`.

- [ ] **Step 3: Verify route flow**

Manual checks:
- `/` loads landing page
- `/demo` loads the existing call dashboard
- CTA from landing navigates to `/demo`
- ending a call still navigates to `/summary/[callId]`
- "New call" on summary should be reviewed; decide whether it should link to `/demo` instead of `/`

- [ ] **Step 4: Update summary route link if needed**

If `/` becomes marketing, change the summary page "New call" link from `/` to `/demo`.

- [ ] **Step 5: Run final checks**

Run: `pnpm --filter @riri/web typecheck`

Expected: PASS.

Run: `pnpm --filter @riri/web build`

Expected: PASS.

---

### Task 6: Optional React Export Path If Subscription Is Activated

**Files:**
- Scratch only, not production app files unless reviewed.

- [ ] **Step 1: Re-run MCP export**

Call Unframer `exportReactComponents`.

Expected with active subscription: a CLI command for downloading React components.

- [ ] **Step 2: Export into a scratch directory**

Do not export directly into `apps/web/components`.

Suggested scratch target:
- `tmp/unframer-export/`

- [ ] **Step 3: Compare generated output to native components**

Use generated JSX/CSS as reference for:
- spacing
- border radius
- image crop behavior
- responsive breakpoints

Do not ship machine-generated components wholesale unless they are cleaned, typed, and adapted to Riri's tokens.

---

## Verification Checklist

- [ ] `pnpm --filter @riri/web typecheck` passes.
- [ ] `pnpm --filter @riri/web build` passes.
- [ ] `/` landing is responsive on mobile, tablet, and desktop.
- [ ] `/demo` still starts and ends calls.
- [ ] `/summary/[callId]` still renders and returns to the correct call route.
- [ ] No files under `apps/api/**` or `apps/web/lib/agora.ts` changed.
- [ ] Remote Framer image usage is documented or replaced with local assets before production.

## Execution Recommendation

Implement Tasks 1-4 first and review `/landing` visually before changing `/`. Promote the landing page only after the dashboard is confirmed safe at `/demo`.
