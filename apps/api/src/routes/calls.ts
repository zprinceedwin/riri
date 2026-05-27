/**
 * Post-call analysis.
 *   POST /api/calls/:callId/summarize  -- run gpt-4o over the transcript,
 *                                          return qualification + lead + summary
 *   POST /api/calls/:callId/transcript -- accept a transcript blob from the FE
 *   GET  /api/calls/:callId            -- fetch the stored call record
 *
 * The FE collects the transcript from Agora's Web Toolkit and POSTs it to us
 * before calling summarize, so we keep the API server stateless during the call.
 *
 * Summarize ALSO emits clinic-pivot fields:
 *   - intent: book_new | reschedule | cancel | faq | escalate | upsell_consideration | other
 *   - handoffRequired: boolean
 *   - handoffReason: string | null
 *   - requestedService / requestedDoctor / requestedTimeWindow on the lead
 *
 * If handoffRequired is true, we create a Handoff record so the dashboard
 * Pending Handoff panel picks it up without manual intervention.
 */
import { Hono } from "hono";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  CallSummarySchema,
  CapturedLeadSchema,
  HandoffReasonSchema,
  IntentSchema,
  type CallSummary,
  type Handoff,
} from "@riri/shared";
import { getEnv } from "../env.js";
import { createCompletion } from "../lib/anthropic.js";
import {
  createHandoff,
  getCall,
  upsertCall,
  type StoredCall,
} from "../lib/supabase.js";
import { getSessionByCall } from "../lib/store.js";

export const callRoutes = new Hono();

const TranscriptTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  ts: z.number().optional(),
});

const SetTranscriptRequestSchema = z.object({
  transcript: z.array(TranscriptTurnSchema),
});

callRoutes.post("/:callId/transcript", async (c) => {
  const callId = c.req.param("callId");
  const body = await c.req.json();
  const parsed = SetTranscriptRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", detail: parsed.error.message }, 400);
  }

  const existing = (await getCall(callId)) ?? {
    callId,
    agentId: "unknown",
    personaId: getSessionByCall(callId)?.personaId ?? "sofia",
    channel: getSessionByCall(callId)?.channel ?? "unknown",
    namespace: getSessionByCall(callId)?.namespace ?? "default",
    startedAt: getSessionByCall(callId)?.startedAt ?? Date.now(),
  };
  const ts = Date.now();
  const updated: StoredCall = {
    ...existing,
    transcript: parsed.data.transcript.map((t) => ({
      role: t.role,
      text: t.text,
      ts: t.ts ?? ts,
    })),
  };
  await upsertCall(updated).catch((err) =>
    console.error("[calls.transcript] upsert failed:", err.message)
  );
  return c.json({ ok: true });
});

callRoutes.get("/:callId", async (c) => {
  const callId = c.req.param("callId");
  const call = await getCall(callId).catch(() => null);
  if (!call) return c.json({ error: "not_found" }, 404);
  return c.json(call);
});

callRoutes.post("/:callId/summarize", async (c) => {
  const callId = c.req.param("callId");
  const env = getEnv();

  const call = await getCall(callId).catch(() => null);
  const session = getSessionByCall(callId);

  if (!call && !session) {
    return c.json({ error: "call_not_found" }, 404);
  }

  const transcript = call?.transcript ?? [];
  if (transcript.length === 0) {
    return c.json(
      {
        error: "no_transcript",
        detail:
          "POST /api/calls/:callId/transcript with the conversation turns before calling summarize.",
      },
      422
    );
  }

  const personaId = (call?.personaId ?? session?.personaId ?? "sofia") as
    | "jordan"
    | "mike"
    | "sofia";
  const startedAt = call?.startedAt ?? session?.startedAt ?? Date.now();
  const endedAt = call?.endedAt ?? Date.now();

  const conversation = transcript
    .map((t) => `${t.role === "assistant" ? "AGENT" : "CALLER"}: ${t.text}`)
    .join("\n");

  const systemPrompt = buildSystemPrompt(personaId);
  const userPrompt = `TRANSCRIPT of voice call (persona: ${personaId}):
---
${conversation}
---

Return ONLY valid JSON. No markdown fences, no commentary.`;

  const raw = await createCompletion({
    model: env.ANTHROPIC_SUMMARY_MODEL,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    temperature: 0.2,
    maxTokens: 4096,
  });
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return c.json({ error: "summary_parse_failed", raw }, 500);
  }

  const AnalysisSchema = z.object({
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

  const analysis = AnalysisSchema.safeParse(parsedJson);
  if (!analysis.success) {
    return c.json({ error: "summary_schema_invalid", detail: analysis.error.message }, 500);
  }

  const summary: CallSummary = CallSummarySchema.parse({
    callId,
    personaId,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    durationMs: Math.max(0, endedAt - startedAt),
    ...analysis.data,
  });

  if (call) {
    await upsertCall({ ...call, summary }).catch((err) =>
      console.error("[calls.summarize] upsert failed:", err.message)
    );
  }

  // If the summarizer flagged a handoff, create one (idempotent best-effort).
  if (summary.handoffRequired) {
    const reasonGuess = guessHandoffReason(summary.handoffReason ?? "");
    const handoff: Handoff = {
      id: `ho-${nanoid(10)}`,
      callId,
      contactId: session?.knownContact?.id ?? call?.contactId,
      reason: reasonGuess,
      priority: "high",
      createdAt: Date.now(),
      status: "pending",
      note: summary.handoffReason ?? undefined,
    };
    createHandoff(handoff).catch((err) =>
      console.error("[calls.summarize] createHandoff failed:", err)
    );
  }

  return c.json(summary);
});

function buildSystemPrompt(personaId: "jordan" | "mike" | "sofia"): string {
  if (personaId === "sofia") {
    return `You are a clinic operations analyst. You will read a transcript of a voice call between an AI clinic receptionist (Sofia) and a caller, and produce a structured JSON evaluation.

Return ONLY valid JSON matching this TypeScript type:

type Output = {
  qualificationScore: number;        // 0-100: how qualified the caller is for a booking
  qualificationReasoning: string;    // 1-2 sentences explaining the score
  objectionsHandled: Array<{
    objection: string;
    rebuttal: string;
    effectiveness: "weak" | "good" | "strong";
  }>;
  citedSources: string[];            // facts the agent cited from CONTEXT
  lead: {
    name: string | null;
    company: string | null;          // null for clinic callers
    role: string | null;             // null for clinic callers
    email: string | null;
    phone: string | null;
    meetingBookedAt: string | null;  // ISO if a specific time was confirmed
    budgetSignal: string | null;
    timelineSignal: string | null;
    intent: "book_new" | "reschedule" | "cancel" | "faq" | "escalate" | "upsell_consideration" | "other";
    requestedService: string | null;
    requestedDoctor: string | null;
    requestedTimeWindow: string | null;
  };
  summary: string;                   // 2-3 sentence narrative
  nextSteps: string[];               // 1-4 concrete follow-up actions
  intent: "book_new" | "reschedule" | "cancel" | "faq" | "escalate" | "upsell_consideration" | "other";
  handoffRequired: boolean;
  handoffReason: string | null;      // 1 sentence if handoffRequired=true
};

Handoff is REQUIRED when the caller asked for a human, expressed frustration, asked a medical/contraindication question, or Sofia failed comprehension repeatedly.

Rules:
- If a field is unknown, use null. Never fabricate.
- meetingBookedAt only when a specific time was confirmed verbally.
- Be honest about effectiveness -- if a rebuttal was weak, mark it weak.
- Return JSON only, no markdown, no commentary.`;
  }
  return `You are a sales operations analyst. You will read a transcript of a live voice sales call between an AI agent and a prospect, and produce a structured JSON evaluation.

Return ONLY valid JSON matching this TypeScript type:

type Output = {
  qualificationScore: number;        // 0-100, BANT-style (budget/authority/need/timeline)
  qualificationReasoning: string;
  objectionsHandled: Array<{
    objection: string;
    rebuttal: string;
    effectiveness: "weak" | "good" | "strong";
  }>;
  citedSources: string[];
  lead: {
    name: string | null;
    company: string | null;
    role: string | null;
    email: string | null;
    phone: string | null;
    meetingBookedAt: string | null;
    budgetSignal: string | null;
    timelineSignal: string | null;
    intent: "book_new" | "reschedule" | "cancel" | "faq" | "escalate" | "upsell_consideration" | "other";
    requestedService: string | null;
    requestedDoctor: string | null;
    requestedTimeWindow: string | null;
  };
  summary: string;
  nextSteps: string[];
  intent: "book_new" | "reschedule" | "cancel" | "faq" | "escalate" | "upsell_consideration" | "other";
  handoffRequired: boolean;
  handoffReason: string | null;
};

Rules:
- If a field is unknown, use null. Never fabricate.
- meetingBookedAt should be an ISO string ONLY if the agent and prospect agreed on a specific time.
- Be honest about effectiveness -- if a rebuttal was weak, mark it weak.
- Return JSON only, no markdown, no commentary.`;
}

function guessHandoffReason(text: string): z.infer<typeof HandoffReasonSchema> {
  const t = text.toLowerCase();
  if (/human|coordinator|manager|real person|talk to/.test(t)) return "explicit_human";
  if (/medical|allerg|pregnan|contraindication|safety|condition/.test(t)) return "complex_case";
  if (/frustrat|upset|angry|annoy/.test(t)) return "negative_sentiment";
  if (/comprehen|understand|didn't catch|misheard|repeat/.test(t)) return "low_comprehension";
  return "out_of_scope";
}
