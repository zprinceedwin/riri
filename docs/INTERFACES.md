# Riri API Contracts

All shapes are defined in [packages/shared/src/index.ts](../packages/shared/src/index.ts) as Zod schemas. **Change them there first**, never invent endpoints ad-hoc.

## Agent lifecycle

### `POST /api/agent/start`
Spawn an Agora Convo AI agent in a fresh channel and return the human user's RTC credentials. If `phone` is supplied, the API looks up the contact by phone and injects a `knownContact` snippet so Sofia can greet returning callers by name.

Request:
```json
{
  "personaId": "sofia" | "jordan" | "mike",
  "prospectId": "optional-string",
  "channel": "optional-string",
  "phone": "+63-917-555-0101"
}
```

Response:
```json
{
  "agentId": "agora-internal-id",
  "callId": "Riri-call-id",
  "channel": "Riri-xxxxxxxx",
  "rtcToken": "<token>",
  "uid": 1002,
  "personaId": "sofia",
  "appId": "<your agora app id>",
  "knownContact": {
    "id": "ct-...",
    "name": "Maria Cruz",
    "totalCalls": 6,
    "totalBookings": 5
  }
}
```

### `POST /api/agent/stop`
Tear down the agent. The browser should leave the RTC channel before calling this.

Request: `{ "agentId": "...", "callId": "optional-but-recommended" }`

Response: `{ "ok": true, "callId": "..." }`

## Custom LLM proxy (Agora calls this)

### `POST /v1/chat/completions`
OpenAI-compatible. Agora hits this every conversational turn. Our proxy retrieves top-k chunks from Couchbase based on the latest user message, injects a CONTEXT block into the system message, and streams the augmented completion back from OpenAI.

For Sofia specifically we also inject:
- `AVAILABLE_SLOTS` block — the next ~20 open slots in the 14-day window
- `CONTACT` block — when `riri_context.knownContact` is present, so Sofia can greet by name

The proxy reads `riri_context` from either the top-level request or `request.context.riri_context`. We set it when starting the agent (`lib/agora.ts`). Shape:

```ts
type RiriContext = {
  callId: string;
  personaId: "sofia" | "jordan" | "mike";
  namespace: string;        // "clinic-belle-manila", "default", or "prospect:<id>"
  prospectId?: string;
  knownContact?: {
    id: string;
    name?: string;
    totalCalls: number;
    totalBookings: number;
  };
};
```

If retrieval fails for any reason, the proxy logs and forwards the original request without CONTEXT — the conversation continues degraded but unbroken.

## Ingest

### `POST /api/ingest/url`
Scrape a URL → chunk → embed → upsert.
Request: `{ "url": "https://...", "kind": "company"|"prospect"|"playbook"|"clinic", "namespace": "default", "title": "optional" }`
Response: `{ "docId": "...", "chunks": N, "namespace": "...", "kind": "..." }`

### `POST /api/ingest/text`
Same as above but raw text input. Used by seed scripts.

### `POST /api/ingest/prospect`
Structured prospect profile. Body: `{ name, company, companyUrl?, role?, notes? }`. Optionally scrapes `companyUrl` into the same prospect namespace. Returns `{ prospectId, chunks }`.

## Post-call

### `POST /api/calls/:callId/transcript`
Browser ships its collected transcript to the backend before calling summarize.
Body: `{ "transcript": [{ "role": "user"|"assistant", "text": "...", "ts": <ms> }, ...] }`

### `POST /api/calls/:callId/summarize`
GPT-4o reads the transcript and returns a structured `CallSummary`:
```ts
{
  callId, personaId, startedAt, endedAt, durationMs,
  qualificationScore: 0..100,
  qualificationReasoning: string,
  objectionsHandled: Array<{ objection, rebuttal, effectiveness: "weak"|"good"|"strong" }>,
  citedSources: string[],
  lead: {
    name, company, role, email, phone,
    meetingBookedAt,
    budgetSignal, timelineSignal,
    intent: "book_new"|"reschedule"|"cancel"|"faq"|"escalate"|"upsell_consideration"|"other",
    requestedService, requestedDoctor, requestedTimeWindow
  },
  summary: string,
  nextSteps: string[],
  intent: "book_new"|...|"other",
  handoffRequired: boolean,
  handoffReason: string | null,
}
```

If `handoffRequired` is true, the summarizer also creates a `Handoff` record so the Pending Handoff panel picks it up.

### `GET /api/calls/:callId`
Fetch the stored call record (transcript + summary if available).

## Personas

### `GET /api/personas`  →  `Persona[]`
### `GET /api/personas/:id`  →  `Persona`

`Persona` is defined in [packages/shared/src/index.ts](../packages/shared/src/index.ts) and includes voice config, greeting, system prompt, and display metadata. The full prompts live in JSON in [packages/personas](../packages/personas).

## Clinic — slots

### `GET /api/slots?from=<ISO>&to=<ISO>&doctorId=<optional>`
List slots in a time window with their current status (`available`, `held`, `booked`).
Response: `{ "slots": Slot[] }`

### `POST /api/slots/reserve`
CAS-based 5-minute hold. Only succeeds if the slot is `available`. The reservation is keyed by `callId` so the same call can re-acquire its own hold idempotently.

Request: `{ "slotId": "...", "callId": "...", "ttlSec": 300 }`
Response (success): `{ "ok": true, "slot": Slot }`
Response (failure): `{ "ok": false, "reason": "slot_taken_concurrent" | "slot_unavailable" | "slot_not_found" }` with HTTP 409.

## Clinic — bookings

### `POST /api/bookings/confirm`
Turn a held slot into a booking, send the Resend confirmation email, and append to the contact's history. Atomic against concurrent confirms: the slot must be currently `held` by this `callId`.

Request:
```json
{
  "slotId": "...",
  "callId": "...",
  "serviceId": "svc-botox-crows",
  "contact": { "name": "Maria Cruz", "phone": "+63-...", "email": "maria@example.com" }
}
```
Response:
```json
{
  "booking": Booking,
  "contact": Contact,
  "emailSent": true
}
```

Booking success does NOT depend on email success. `emailSent: false` is logged but the booking is still confirmed.

### `GET /api/bookings/:bookingId`
Fetch a single booking record.

### `GET /api/bookings`
List recent bookings (default limit 100).

## Clinic — contacts

### `GET /api/contacts`
List recent contacts (most recent first, limit 50 by default). Used by the dashboard's pipeline column.

### `GET /api/contacts/by-phone/:phone`
Caller lookup at call start. URL-encoded phone. Response: `{ "contact": Contact | null }`.

## Clinic — handoffs

### `GET /api/handoffs`
List pending handoffs. The dashboard's Pending Handoff panel polls this every 5 seconds during an active call.
Response: `{ "handoffs": Handoff[] }`

### `POST /api/handoffs`
Create a handoff. Called by the agent via the call summarizer when it detects an escalation in the transcript, or by future function-calling integrations.

Request:
```json
{
  "callId": "...",
  "contactId": "ct-...",
  "reason": "explicit_human" | "low_comprehension" | "negative_sentiment" | "out_of_scope" | "complex_case",
  "priority": "high" | "normal" | "low",
  "note": "optional 1-sentence summary"
}
```
Response: the created `Handoff`.

### `POST /api/handoffs/:id/resolve`
Mark a handoff as resolved. Response: the updated `Handoff`.

## Clinic — catalog

### `GET /api/services` → `{ services: Service[] }`
Static service catalog (id, name, durationMin, priceCents, description, doctorIds).

### `GET /api/doctors` → `{ doctors: Doctor[] }`
Static doctor catalog (id, name, title, specialties, bio).

## Internal note: keeping CONTEXT under control

The LLM proxy is the only place in the codebase where retrieval, prompt injection, and OpenAI streaming all meet. If you change retrieval (top-k, namespacing, scoring), change it in [apps/api/src/lib/rag.ts](../apps/api/src/lib/rag.ts). If you change how CONTEXT is injected, change [apps/api/src/routes/llm.ts](../apps/api/src/routes/llm.ts). Don't fan that logic out.
