/**
 * Legacy LLM Proxy stub.
 *
 * The primary LLM path now runs through Agora Console (managed LLM) with
 * MCP tool calls to /mcp for RAG, slots, bookings, etc.
 *
 * This route is kept so the /v1/chat/completions URL still responds
 * (some old config may still reference it).
 */
import { Hono } from "hono";

export const llmRoutes = new Hono();

llmRoutes.post("/chat/completions", async (c) => {
  return c.json({
    id: "riri-mcp-redirect",
    object: "chat.completion",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content:
            "This server now uses Agora Console's managed LLM with MCP tools at /mcp. " +
            "The legacy /v1/chat/completions proxy is no longer active.",
        },
        finish_reason: "stop",
      },
    ],
  });
});
