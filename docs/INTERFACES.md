# Stratton API Contracts

All shapes are defined in [packages/shared/src/index.ts](../packages/shared/src/index.ts) as Zod schemas. **Change them there first**, never invent endpoints ad-hoc.

## Agent lifecycle

### `POST /api/agent/start`
Spawn an Agora Convo AI agent in a fresh channel and return the human user's RTC credentials.

Request:
```json
{ "personaId": "jordan" | "mike", "prospectId": "optional-string", "channel": "optional-string" }
```

Response:
```json
{
  "agentId": "agora-internal-id",
  "callId": "stratton-call-id",
  "channel": "stratton-xxxxxxxx",
  "rtcToken": "<token>",
  "uid": 1002,
  "personaId": "jordan",
  "appId": "<your agora app id>"
}
```

### `POST /api/agent/stop`
Tear down the agent. The browser should leave the RTC channel before calling this.

Request: `{ "agentId": "...", "callId": "optional-but-recommended" }`

Response: `{ "ok": true, "callId": "..." }`

## Custom LLM proxy (Agora calls this)

### `POST /v1/chat/completions`
OpenAI-compatible. Agora hits this every conversational turn. Our proxy retrieves top-k chunks from Couchbase based on the latest user message, injects a CONTEXT block into the system message, and streams the augmented completion back from OpenAI.

The proxy reads `stratton_context` from either the top-level request or `request.context.stratton_context`. We set it when starting the agent (`lib/agora.ts`). Shape:

```ts
type StrattonContext = {
  callId: string;
  personaId: "jordan" | "mike";
  namespace: string;        // "default" or "prospect:<id>"
  prospectId?: string;
};
```

If retrieval fails for any reason, the proxy logs and forwards the original request without CONTEXT — the conversation continues degraded but unbroken.

## Ingest

### `POST /api/ingest/url`  
Scrape a URL → chunk → embed → upsert.
Request: `{ "url": "https://...", "kind": "company"|"prospect"|"playbook", "namespace": "default", "title": "optional" }`  
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
  lead: { name, company, role, email, phone, meetingBookedAt, budgetSignal, timelineSignal },
  summary: string,
  nextSteps: string[],
}
```

### `GET /api/calls/:callId`
Fetch the stored call record (transcript + summary if available).

## Personas

### `GET /api/personas`  →  `Persona[]`
### `GET /api/personas/:id`  →  `Persona`

`Persona` is defined in [packages/shared/src/index.ts](../packages/shared/src/index.ts) and includes voice config, greeting, system prompt, and display metadata. The full prompts live in JSON in [packages/personas](../packages/personas).

## Internal note: keeping CONTEXT under control

The LLM proxy is the only place in the codebase where retrieval, prompt injection, and OpenAI streaming all meet. If you change retrieval (top-k, namespacing, scoring), change it in [apps/api/src/lib/rag.ts](../apps/api/src/lib/rag.ts). If you change how CONTEXT is injected, change [apps/api/src/routes/llm.ts](../apps/api/src/routes/llm.ts). Don't fan that logic out.
