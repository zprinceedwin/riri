/**
 * Custom LLM Proxy -- the heart of Stratton.
 *
 * Agora's Conversational AI Engine calls this URL as its `llm.url`. The contract
 * is OpenAI's /v1/chat/completions (streaming SSE).
 *
 * On every turn, we:
 *   1. Look at the latest user message in the incoming request
 *   2. Run a vector search against Couchbase for relevant chunks
 *   3. Inject a CONTEXT block into the system prompt
 *   4. Forward the (augmented) request to OpenAI with streaming enabled
 *   5. Stream the SSE response straight back to Agora
 *
 * Custom context (which call, which prospect) flows through the `params.stratton_context`
 * field we configured in startConvoAgent. Agora passes it back to us on every call.
 */
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { getEnv } from "../env.js";
import { getOpenAI } from "../lib/openai.js";
import { formatContextBlock, retrieve } from "../lib/rag.js";
import { getSessionByCall } from "../lib/store.js";

export const llmRoutes = new Hono();

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
}

interface AgoraLlmRequest {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  // Custom passthrough we added in lib/agora.ts:
  stratton_context?: {
    callId?: string;
    personaId?: string;
    namespace?: string;
    prospectId?: string;
  };
  // Sometimes Agora nests it under `context`
  context?: {
    stratton_context?: AgoraLlmRequest["stratton_context"];
  };
}

llmRoutes.post("/chat/completions", async (c) => {
  const env = getEnv();
  const body = (await c.req.json()) as AgoraLlmRequest;

  // Resolve stratton context from either the top-level passthrough or Agora's
  // generic context wrapper.
  const strattonCtx =
    body.stratton_context ?? body.context?.stratton_context ?? {};

  const namespace =
    strattonCtx.namespace ??
    (strattonCtx.callId ? getSessionByCall(strattonCtx.callId)?.namespace : undefined) ??
    "default";

  const lastUserMsg = [...body.messages].reverse().find((m) => m.role === "user");
  const userQuery = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

  // RAG retrieval -- best-effort, don't break the conversation if it fails.
  let contextBlock = "";
  if (userQuery.trim().length > 0) {
    try {
      const chunks = await retrieve(userQuery, { topK: 4, namespace });
      contextBlock = formatContextBlock(chunks);

      // Persist the retrieved sources for the post-call summary panel.
      if (strattonCtx.callId && chunks.length > 0) {
        const session = getSessionByCall(strattonCtx.callId);
        if (session) {
          // Stash citations on the session object for UI display.
          (session as { lastCitations?: string[] }).lastCitations = chunks
            .map((ch) => ch.title ?? ch.source ?? ch.id)
            .filter(Boolean);
        }
      }
    } catch (err) {
      console.error("[llm.proxy] RAG retrieve failed (continuing without context):", err);
    }
  }

  // Augment the system message with our CONTEXT block.
  const augmentedMessages = [...body.messages];
  if (contextBlock) {
    const firstSystemIdx = augmentedMessages.findIndex((m) => m.role === "system");
    if (firstSystemIdx >= 0) {
      const existing = augmentedMessages[firstSystemIdx]!;
      augmentedMessages[firstSystemIdx] = {
        ...existing,
        content: `${existing.content ?? ""}\n\n${contextBlock}`,
      };
    } else {
      augmentedMessages.unshift({ role: "system", content: contextBlock });
    }
  }

  const openai = getOpenAI();
  const model = body.model ?? env.OPENAI_LLM_MODEL;
  const wantsStream = body.stream !== false;

  if (!wantsStream) {
    // Non-streaming fallback (Agora always streams, but useful for debugging)
    const completion = await openai.chat.completions.create({
      model,
      messages: augmentedMessages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens,
      stream: false,
    });
    return c.json(completion);
  }

  // Streaming: pipe OpenAI's SSE stream straight to the caller.
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
