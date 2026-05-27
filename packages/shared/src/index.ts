/**
 * Riri Shared Contracts
 * ---------------------------------------------------------------
 * Frozen at hour 0, extended for the clinic pivot.
 * Every app imports types from here.
 * No one invents endpoints ad-hoc. If you need to change a shape,
 * change it here first, then update both apps/api and apps/web.
 */

import { z } from "zod";

// =============================================================================
// PERSONAS
// =============================================================================

export const PersonaIdSchema = z.enum(["jordan", "mike", "sofia"]);
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
// CLINIC DOMAIN (services, doctors, slots, bookings, contacts)
// =============================================================================

export const ServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationMin: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  description: z.string(),
  doctorIds: z.array(z.string()),
  category: z.string().optional(),
});
export type Service = z.infer<typeof ServiceSchema>;

export const DoctorSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  specialties: z.array(z.string()),
  bio: z.string(),
  avatarEmoji: z.string().optional(),
});
export type Doctor = z.infer<typeof DoctorSchema>;

export const SlotStatusSchema = z.enum(["available", "held", "booked"]);
export type SlotStatus = z.infer<typeof SlotStatusSchema>;

export const SlotSchema = z.object({
  id: z.string(),
  doctorId: z.string(),
  startsAt: z.string(),
  durationMin: z.number().int().positive(),
  status: SlotStatusSchema,
  heldUntil: z.number().optional(),
  bookingId: z.string().optional(),
  callId: z.string().optional(),
});
export type Slot = z.infer<typeof SlotSchema>;

export const BookingStatusSchema = z.enum([
  "confirmed",
  "cancelled",
  "no_show",
  "completed",
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const BookingSourceSchema = z.enum(["voice", "manual"]);
export type BookingSource = z.infer<typeof BookingSourceSchema>;

export const BookingContactSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().email(),
});
export type BookingContact = z.infer<typeof BookingContactSchema>;

export const BookingSchema = z.object({
  id: z.string(),
  slotId: z.string(),
  doctorId: z.string(),
  serviceId: z.string(),
  contact: BookingContactSchema,
  scheduledFor: z.string(),
  createdAt: z.string(),
  status: BookingStatusSchema,
  source: BookingSourceSchema,
  callId: z.string().optional(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const ContactHistoryEntrySchema = z.object({
  callId: z.string(),
  ts: z.number(),
  outcome: z.string(),
  summary: z.string(),
});
export type ContactHistoryEntry = z.infer<typeof ContactHistoryEntrySchema>;

export const ContactSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  firstSeenAt: z.number(),
  lastSeenAt: z.number(),
  totalCalls: z.number().int().nonnegative(),
  totalBookings: z.number().int().nonnegative(),
  lastCallId: z.string().optional(),
  history: z.array(ContactHistoryEntrySchema),
});
export type Contact = z.infer<typeof ContactSchema>;

export const HandoffReasonSchema = z.enum([
  "explicit_human",
  "low_comprehension",
  "negative_sentiment",
  "out_of_scope",
  "complex_case",
]);
export type HandoffReason = z.infer<typeof HandoffReasonSchema>;

export const HandoffPrioritySchema = z.enum(["low", "normal", "high"]);
export type HandoffPriority = z.infer<typeof HandoffPrioritySchema>;

export const HandoffStatusSchema = z.enum([
  "pending",
  "acknowledged",
  "resolved",
]);
export type HandoffStatus = z.infer<typeof HandoffStatusSchema>;

export const HandoffSchema = z.object({
  id: z.string(),
  callId: z.string(),
  contactId: z.string().optional(),
  reason: HandoffReasonSchema,
  priority: HandoffPrioritySchema,
  createdAt: z.number(),
  status: HandoffStatusSchema,
  note: z.string().optional(),
});
export type Handoff = z.infer<typeof HandoffSchema>;

export const IntentSchema = z.enum([
  "book_new",
  "reschedule",
  "cancel",
  "faq",
  "escalate",
  "upsell_consideration",
  "other",
]);
export type Intent = z.infer<typeof IntentSchema>;

// =============================================================================
// AGENT CONTROL (POST /api/agent/start, /api/agent/stop)
// =============================================================================

export const StartAgentRequestSchema = z.object({
  personaId: PersonaIdSchema,
  prospectId: z.string().optional(),
  channel: z.string().optional(),
  /** Optional caller phone -- if present, the API will pre-load the contact. */
  phone: z.string().optional(),
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
  knownContact: z
    .object({
      id: z.string(),
      name: z.string().optional(),
      totalCalls: z.number(),
      totalBookings: z.number(),
    })
    .optional(),
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

export const IngestKindSchema = z.enum([
  "company",
  "prospect",
  "playbook",
  "clinic",
]);
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
  intent: IntentSchema.default("other"),
  requestedService: z.string().nullable().optional(),
  requestedDoctor: z.string().nullable().optional(),
  requestedTimeWindow: z.string().nullable().optional(),
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
  intent: IntentSchema.default("other"),
  handoffRequired: z.boolean().default(false),
  handoffReason: z.string().nullable().optional(),
});
export type CallSummary = z.infer<typeof CallSummarySchema>;

export const SummarizeCallResponseSchema = CallSummarySchema;
export type SummarizeCallResponse = z.infer<typeof SummarizeCallResponseSchema>;

// =============================================================================
// SLOT / BOOKING / CONTACT / HANDOFF APIs
// =============================================================================

export const ListSlotsRequestSchema = z.object({
  from: z.string(),
  to: z.string(),
  doctorId: z.string().optional(),
});
export type ListSlotsRequest = z.infer<typeof ListSlotsRequestSchema>;

export const ListSlotsResponseSchema = z.object({
  slots: z.array(SlotSchema),
});
export type ListSlotsResponse = z.infer<typeof ListSlotsResponseSchema>;

export const ReserveSlotRequestSchema = z.object({
  slotId: z.string(),
  callId: z.string(),
  ttlSec: z.number().int().positive().optional(),
});
export type ReserveSlotRequest = z.infer<typeof ReserveSlotRequestSchema>;

export const ReserveSlotResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    slot: SlotSchema,
  }),
  z.object({
    ok: z.literal(false),
    reason: z.string(),
  }),
]);
export type ReserveSlotResponse = z.infer<typeof ReserveSlotResponseSchema>;

export const ConfirmBookingRequestSchema = z.object({
  slotId: z.string(),
  callId: z.string(),
  serviceId: z.string(),
  contact: BookingContactSchema,
});
export type ConfirmBookingRequest = z.infer<typeof ConfirmBookingRequestSchema>;

export const ConfirmBookingResponseSchema = z.object({
  booking: BookingSchema,
  contact: ContactSchema,
  emailSent: z.boolean(),
});
export type ConfirmBookingResponse = z.infer<typeof ConfirmBookingResponseSchema>;

export const ListContactsResponseSchema = z.object({
  contacts: z.array(ContactSchema),
});
export type ListContactsResponse = z.infer<typeof ListContactsResponseSchema>;

export const GetContactByPhoneResponseSchema = z.object({
  contact: ContactSchema.nullable(),
});
export type GetContactByPhoneResponse = z.infer<
  typeof GetContactByPhoneResponseSchema
>;

export const ListHandoffsResponseSchema = z.object({
  handoffs: z.array(HandoffSchema),
});
export type ListHandoffsResponse = z.infer<typeof ListHandoffsResponseSchema>;

export const CreateHandoffRequestSchema = z.object({
  callId: z.string(),
  contactId: z.string().optional(),
  reason: HandoffReasonSchema,
  priority: HandoffPrioritySchema.default("normal"),
  note: z.string().optional(),
});
export type CreateHandoffRequest = z.infer<typeof CreateHandoffRequestSchema>;

export const ListServicesResponseSchema = z.object({
  services: z.array(ServiceSchema),
});
export type ListServicesResponse = z.infer<typeof ListServicesResponseSchema>;

export const ListDoctorsResponseSchema = z.object({
  doctors: z.array(DoctorSchema),
});
export type ListDoctorsResponse = z.infer<typeof ListDoctorsResponseSchema>;

export const ListBookingsResponseSchema = z.object({
  bookings: z.array(BookingSchema),
});
export type ListBookingsResponse = z.infer<typeof ListBookingsResponseSchema>;

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

export const ChatCompletionRequestSchema = z
  .object({
    model: z.string().optional(),
    messages: z.array(ChatCompletionMessageSchema),
    stream: z.boolean().optional(),
    temperature: z.number().optional(),
    max_tokens: z.number().optional(),
    context: z.record(z.any()).optional(),
  })
  .passthrough();
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

  // Clinic pivot routes
  slotsList: "/api/slots",
  slotsReserve: "/api/slots/reserve",
  bookingsConfirm: "/api/bookings/confirm",
  bookingGet: (id: string) => `/api/bookings/${id}`,
  bookingsList: "/api/bookings",
  contactsList: "/api/contacts",
  contactGetByPhone: (phone: string) =>
    `/api/contacts/by-phone/${encodeURIComponent(phone)}`,
  handoffsList: "/api/handoffs",
  handoffsCreate: "/api/handoffs",
  servicesList: "/api/services",
  doctorsList: "/api/doctors",
} as const;

export const AGORA_DEFAULTS = {
  agentRtcUid: "0",
  remoteRtcUid: "1002",
  // Agora REST API idle_timeout: seconds until the agent auto-exits when all
  // subscribed remote users have left the channel. 0 = manual teardown only.
  idleTimeoutSec: 30,
  asrLanguage: "en-US",
} as const;

export const CLINIC = {
  defaultNamespace: "clinic-belle-manila",
  brandName: "Belle Aesthetic Manila",
} as const;
