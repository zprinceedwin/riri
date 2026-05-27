/**
 * Custom LLM Proxy -- the heart of Riri.
 *
 * Agora's Conversational AI Engine calls this URL as its `llm.url`. The contract
 * is OpenAI's /v1/chat/completions (streaming SSE).
 *
 * On every turn, we:
 *   1. Look at the latest user message in the incoming request
 *   2. Run a vector search against Couchbase for relevant chunks
 *   3. Inject a CONTEXT block into the system prompt
 *   4. (Sofia only) inject an AVAILABLE_SLOTS block + CONTACT block
 *   5. Forward the (augmented) request to OpenAI with streaming enabled
 *   6. Stream the SSE response straight back to Agora
 *
 * Custom context (which call, which prospect, known contact) flows through the
 * `params.riri_context` field we configured in startConvoAgent. Agora passes it
 * back to us on every call.
 */
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { getEnv } from "../env.js";
import { getOpenAI } from "../lib/openai.js";
import { formatContextBlock, retrieve } from "../lib/rag.js";
import { getSessionByCall } from "../lib/store.js";
import { listSlotsBetween } from "../lib/supabase.js";
import { getDoctor } from "../lib/clinic-catalog.js";
import type { Slot } from "@riri/shared";

export const llmRoutes = new Hono();

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
}

interface KnownContact {
  id: string;
  name?: string;
  totalCalls: number;
  totalBookings: number;
}

interface AgoraLlmRequest {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  // Custom passthrough we added in lib/agora.ts:
  riri_context?: {
    callId?: string;
    personaId?: string;
    namespace?: string;
    prospectId?: string;
    knownContact?: KnownContact;
  };
  // Sometimes Agora nests it under `context`
  context?: {
    riri_context?: AgoraLlmRequest["riri_context"];
  };
}

const BOOK_INTENT_RX = /\b(book|booking|schedule|appointment|reserve|reschedul|cancel)\b/i;
const ESCALATE_RX = /\b(human|coordinator|manager|talk to (?:someone|a person)|real person|speak to)\b/i;

function classifyIntent(text: string): string | undefined {
  if (!text) return undefined;
  if (ESCALATE_RX.test(text)) return "escalate";
  if (/\b(cancel)\b/i.test(text)) return "cancel";
  if (/\b(reschedul)/i.test(text)) return "reschedule";
  if (BOOK_INTENT_RX.test(text)) return "book_new";
  return undefined;
}

llmRoutes.post("/chat/completions", async (c) => {
  const env = getEnv();
  const body = (await c.req.json()) as AgoraLlmRequest;

  // Resolve Riri context from either the top-level passthrough or Agora's
  // generic context wrapper.
  const RiriCtx = body.riri_context ?? body.context?.riri_context ?? {};

  const personaId = RiriCtx.personaId ?? getSessionByCall(RiriCtx.callId ?? "")?.personaId;
  const namespace =
    RiriCtx.namespace ??
    (RiriCtx.callId ? getSessionByCall(RiriCtx.callId)?.namespace : undefined) ??
    "default";

  const lastUserMsg = [...body.messages].reverse().find((m) => m.role === "user");
  const userQuery = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

  // Best-effort intent tagging for the post-call summary + UI.
  if (RiriCtx.callId) {
    const intent = classifyIntent(userQuery);
    if (intent) {
      const session = getSessionByCall(RiriCtx.callId);
      if (session) session.lastIntent = intent;
    }
  }

  // RAG retrieval -- best-effort, don't break the conversation if it fails.
  let contextBlock = "";
  if (userQuery.trim().length > 0) {
    try {
      const chunks = await retrieve(userQuery, { topK: 4, namespace });
      contextBlock = formatContextBlock(chunks);

      // Persist the retrieved sources for the post-call summary panel.
      if (RiriCtx.callId && chunks.length > 0) {
        const session = getSessionByCall(RiriCtx.callId);
        if (session) {
          session.lastCitations = chunks
            .map((ch) => ch.title ?? ch.source ?? ch.id)
            .filter(Boolean);
        }
      }
    } catch (err) {
      console.error("[llm.proxy] RAG retrieve failed (continuing without context):", err);
    }
  }

  // Sofia-only augmentations: AVAILABLE_SLOTS + CONTACT.
  let slotsBlock = "";
  let contactBlock = "";
  if (personaId === "sofia") {
    try {
      slotsBlock = await buildAvailableSlotsBlock();
    } catch (err) {
      console.warn("[llm.proxy] failed to build slots block:", err);
    }
    if (RiriCtx.knownContact) {
      contactBlock = formatContactBlock(RiriCtx.knownContact);
    }
  }

  // Augment the system message with our CONTEXT block(s).
  const augmentedMessages = [...body.messages];
  const augmentationPieces = [contextBlock, slotsBlock, contactBlock]
    .filter((s) => s.trim().length > 0)
    .join("\n\n");

  if (augmentationPieces) {
    const firstSystemIdx = augmentedMessages.findIndex((m) => m.role === "system");
    if (firstSystemIdx >= 0) {
      const existing = augmentedMessages[firstSystemIdx]!;
      augmentedMessages[firstSystemIdx] = {
        ...existing,
        content: `${existing.content ?? ""}\n\n${augmentationPieces}`,
      };
    } else {
      augmentedMessages.unshift({ role: "system", content: augmentationPieces });
    }
  }

  const openai = getOpenAI();
  const model = body.model ?? env.OPENAI_LLM_MODEL;
  const wantsStream = body.stream !== false;

  if (!wantsStream) {
    const completion = await openai.chat.completions.create({
      model,
      messages: augmentedMessages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens,
      stream: false,
    });
    return c.json(completion);
  }

  const completion = await openai.chat.completions.create({
    model,
    messages: augmentedMessages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
    temperature: body.temperature ?? 0.7,
    max_tokens: body.max_tokens,
    stream: true,
  });

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache, no-transform");
  c.header("Connection", "keep-alive");

  return stream(c, async (s) => {
    try {
      for await (const chunk of completion) {
        const payload = `data: ${JSON.stringify(chunk)}\n\n`;
        await s.write(payload);
      }
      await s.write("data: [DONE]\n\n");
    } catch (err) {
      console.error("[llm.proxy] streaming error:", err);
      try {
        await s.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
      } catch {
        /* ignore */
      }
    }
  });
});

async function buildAvailableSlotsBlock(): Promise<string> {
  // 14-day window from "now". We only inject the next ~20 available slots so
  // we stay well under the system-prompt token budget.
  const now = new Date();
  const fromIso = now.toISOString();
  const toIso = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const all = await listSlotsBetween(fromIso, toIso);
  const available = all
    .filter((s) => s.status === "available")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 20);

  if (available.length === 0) {
    return "===== AVAILABLE_SLOTS =====\n(no open slots in the next two weeks — offer a callback to be added to the waitlist)\n===== END AVAILABLE_SLOTS =====";
  }
  const lines = ["===== AVAILABLE_SLOTS (next 14 days, format: when -- doctor) ====="];
  for (const slot of available) {
    lines.push(formatSlotLine(slot));
  }
  lines.push("===== END AVAILABLE_SLOTS =====");
  return lines.join("\n");
}

function formatSlotLine(slot: Slot): string {
  const doctor = getDoctor(slot.doctorId);
  const doctorName = doctor?.name ?? slot.doctorId;
  const when = (() => {
    try {
      return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(slot.startsAt));
    } catch {
      return slot.startsAt;
    }
  })();
  const specialties = doctor?.specialties.slice(0, 2).join(", ");
  return `- ${when} -- ${doctorName}${specialties ? ` (${specialties})` : ""} [slotId=${slot.id}]`;
}

function formatContactBlock(contact: KnownContact): string {
  const lines = [
    "===== CONTACT (returning caller -- greet by name, reference history) =====",
    `Name: ${contact.name ?? "unknown"}`,
    `Past calls: ${contact.totalCalls}`,
    `Past bookings: ${contact.totalBookings}`,
    "===== END CONTACT =====",
  ];
  return lines.join("\n");
}
