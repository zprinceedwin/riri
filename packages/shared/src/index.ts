/**
 * Riri Shared Contracts
 * ---------------------------------------------------------------
 * Frozen at hour 0. Every app imports types from here.
 * No one invents endpoints ad-hoc. If you need to change a shape,
 * change it here first, then update both apps/api and apps/web.
 */

import { z } from "zod";

// =============================================================================
// PERSONAS
// =============================================================================

export const PersonaIdSchema = z.enum(["jordan", "mike"]);
export type PersonaId = z.infer<typeof PersonaIdSchema>;

export const PersonaSchema = z.object({
  id: PersonaIdSchema,
  displayName: z.string(),
  shortDescription: z.string(),
  voice: z.object({
    provider: z.enum(["elevenlabs"]),
    voiceId: z.string(),
    speed: z.number().min(0.5).max(2.0).default(1.0),
    stability: z.number().min(0).max(1).default(0.5),
    similarityBoost: z.number().min(0).max(1).default(0.75),
  }),
  greetingMessage: z.string(),
  systemPrompt: z.string(),
  styleNotes: z.string().optional(),
  avatarEmoji: z.string().optional(),
});
export type Persona = z.infer<typeof PersonaSchema>;

// =============================================================================
// AGENT CONTROL (POST /api/agent/start, /api/agent/stop)
// =============================================================================

export const StartAgentRequestSchema = z.object({
  personaId: PersonaIdSchema,
  prospectId: z.string().optional(),
  channel: z.string().optional(),
});
export type StartAgentRequest = z.infer<typeof StartAgentRequestSchema>;

export const StartAgentResponseSchema = z.object({
  agentId: z.string(),
  callId: z.string(),
  channel: z.string(),
  rtcToken: z.string(),
  uid: z.number(),
  personaId: PersonaIdSchema,
  appId: z.string(),
});
export type StartAgentResponse = z.infer<typeof StartAgentResponseSchema>;

export const StopAgentRequestSchema = z.object({
  agentId: z.string(),
  callId: z.string().optional(),
});
export type StopAgentRequest = z.infer<typeof StopAgentRequestSchema>;

export const StopAgentResponseSchema = z.object({
  ok: z.literal(true),
  callId: z.string(),
});
export type StopAgentResponse = z.infer<typeof StopAgentResponseSchema>;

// =============================================================================
// INGEST (POST /api/ingest/url, /api/ingest/prospect)
// =============================================================================

export const IngestKindSchema = z.enum(["company", "prospect", "playbook"]);
export type IngestKind = z.infer<typeof IngestKindSchema>;

export const IngestUrlRequestSchema = z.object({
  url: z.string().url(),
  kind: IngestKindSchema,
  namespace: z.string().default("default"),
  title: z.string().optional(),
});
export type IngestUrlRequest = z.infer<typeof IngestUrlRequestSchema>;

export const IngestTextRequestSchema = z.object({
  text: z.string().min(1),
  kind: IngestKindSchema,
  namespace: z.string().default("default"),
  title: z.string().optional(),
  source: z.string().optional(),
});
export type IngestTextRequest = z.infer<typeof IngestTextRequestSchema>;

export const IngestProspectRequestSchema = z.object({
  name: z.string(),
  company: z.string(),
  companyUrl: z.string().url().optional(),
  role: z.string().optional(),
  notes: z.string().optional(),
});
export type IngestProspectRequest = z.infer<typeof IngestProspectRequestSchema>;

export const IngestResponseSchema = z.object({
  docId: z.string(),
  chunks: z.number(),
  namespace: z.string(),
  kind: IngestKindSchema,
});
export type IngestResponse = z.infer<typeof IngestResponseSchema>;

export const IngestProspectResponseSchema = z.object({
  prospectId: z.string(),
  chunks: z.number(),
});
export type IngestProspectResponse = z.infer<typeof IngestProspectResponseSchema>;

// =============================================================================
// POST-CALL SUMMARY (POST /api/calls/:id/summarize)
// =============================================================================

export const CapturedLeadSchema = z.object({
  name: z.string().nullable(),
  company: z.string().nullable(),
  role: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  meetingBookedAt: z.string().nullable(),
  budgetSignal: z.string().nullable(),
  timelineSignal: z.string().nullable(),
});
export type CapturedLead = z.infer<typeof CapturedLeadSchema>;

export const CallSummarySchema = z.object({
  callId: z.string(),
  personaId: PersonaIdSchema,
  startedAt: z.string(),
  endedAt: z.string(),
  durationMs: z.number(),
  qualificationScore: z.number().min(0).max(100),
  qualificationReasoning: z.string(),
  objectionsHandled: z.array(
    z.object({
      objection: z.string(),
      rebuttal: z.string(),
      effectiveness: z.enum(["weak", "good", "strong"]),
    })
  ),
  citedSources: z.array(z.string()),
  lead: CapturedLeadSchema,
  summary: z.string(),
  nextSteps: z.array(z.string()),
});
export type CallSummary = z.infer<typeof CallSummarySchema>;

export const SummarizeCallResponseSchema = CallSummarySchema;
export type SummarizeCallResponse = z.infer<typeof SummarizeCallResponseSchema>;

// =============================================================================
// LLM PROXY (POST /v1/chat/completions)
// Agora's Conversational AI Engine calls this URL. It is an OpenAI-compatible
// /v1/chat/completions endpoint, so the request/response shape matches OpenAI's
// ChatCompletion API exactly. We do NOT redeclare it here -- it is the OpenAI
// contract. The proxy just adds RAG context before forwarding to OpenAI.
// =============================================================================

export const ChatCompletionMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.union([z.string(), z.null(), z.array(z.any())]),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
  tool_calls: z.array(z.any()).optional(),
});
export type ChatCompletionMessage = z.infer<typeof ChatCompletionMessageSchema>;

export const ChatCompletionRequestSchema = z.object({
  model: z.string().optional(),
  messages: z.array(ChatCompletionMessageSchema),
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  // Agora extras
  context: z.record(z.any()).optional(),
  // We allow any other OpenAI fields to pass through
}).passthrough();
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

// =============================================================================
// RAG INTERNAL TYPES (not over the wire, but shared)
// =============================================================================

export interface RagChunk {
  id: string;
  text: string;
  kind: IngestKind;
  namespace: string;
  source?: string;
  title?: string;
  score?: number;
}

// =============================================================================
// ERROR ENVELOPE
// =============================================================================

export const ApiErrorSchema = z.object({
  error: z.string(),
  detail: z.string().optional(),
  code: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// =============================================================================
// CONSTANTS
// =============================================================================

export const ROUTE = {
  agentStart: "/api/agent/start",
  agentStop: "/api/agent/stop",
  ingestUrl: "/api/ingest/url",
  ingestText: "/api/ingest/text",
  ingestProspect: "/api/ingest/prospect",
  callSummarize: (callId: string) => `/api/calls/${callId}/summarize`,
  callGet: (callId: string) => `/api/calls/${callId}`,
  personasList: "/api/personas",
  personaGet: (id: string) => `/api/personas/${id}`,
  llmProxy: "/v1/chat/completions",
} as const;

export const AGORA_DEFAULTS = {
  agentRtcUid: "0",
  remoteRtcUid: "1002",
  idleTimeoutSec: 120,
  asrLanguage: "en-US",
} as const;
