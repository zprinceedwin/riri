/**
 * Post-call analysis.
 *   POST /api/calls/:callId/summarize  -- run gpt-4o over the transcript,
 *                                          return qualification + lead + summary
 *   POST /api/calls/:callId/transcript -- accept a transcript blob from the FE
 *   GET  /api/calls/:callId            -- fetch the stored call record
 *
 * The FE collects the transcript from Agora's Web Toolkit and POSTs it to us
 * before calling summarize, so we keep the API server stateless during the call.
 */
import { Hono } from "hono";
import { z } from "zod";
import {
  CallSummarySchema,
  type CallSummary,
  CapturedLeadSchema,
} from "@stratton/shared";
import { getEnv } from "../env.js";
import { getOpenAI } from "../lib/openai.js";
import { getCall, upsertCall, type StoredCall } from "../lib/couchbase.js";
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
    personaId: getSessionByCall(callId)?.personaId ?? "jordan",
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

  // Fetch the stored call record (transcript + persona).
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

  const personaId = call?.personaId ?? session?.personaId ?? "jordan";
  const startedAt = call?.startedAt ?? session?.startedAt ?? Date.now();
  const endedAt = call?.endedAt ?? Date.now();

  const conversation = transcript
    .map((t) => `${t.role === "assistant" ? "AGENT" : "PROSPECT"}: ${t.text}`)
    .join("\n");

  const openai = getOpenAI();

  const systemPrompt = `You are a sales operations analyst. You will read a transcript of a live voice sales call between an AI agent and a prospect, and produce a structured JSON evaluation.

Return ONLY valid JSON matching this TypeScript type:

type Output = {
  qualificationScore: number;        // 0-100, BANT-style (budget/authority/need/timeline)
  qualificationReasoning: string;    // 1-2 sentences explaining the score
  objectionsHandled: Array<{
    objection: string;               // verbatim or paraphrased
    rebuttal: string;                // what the agent said
    effectiveness: "weak" | "good" | "strong";
  }>;
  citedSources: string[];            // facts the agent cited from CONTEXT
  lead: {
    name: string | null;
    company: string | null;
    role: string | null;
    email: string | null;
    phone: string | null;
    meetingBookedAt: string | null;
    budgetSignal: string | null;
    timelineSignal: string | null;
  };
  summary: string;                   // 2-3 sentence narrative
  nextSteps: string[];               // 1-4 concrete follow-up actions
};

Rules:
- If a field is unknown, use null. Never fabricate.
- meetingBookedAt should be an ISO string ONLY if the agent and prospect agreed on a specific time.
- Be honest about effectiveness -- if a rebuttal was weak, mark it weak.
- Return JSON only, no markdown, no commentary.`;

  const userPrompt = `TRANSCRIPT of voice sales call (persona: ${personaId}):
---
${conversation}
---`;

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_SUMMARY_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
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

  // Persist the summary back onto the call record.
  if (call) {
    await upsertCall({ ...call, summary }).catch((err) =>
      console.error("[calls.summarize] upsert failed:", err.message)
    );
  }

  return c.json(summary);
});
