/**
 * Riri API server.
 * Hono on Node, listens on PORT (default 3001).
 *
 * Routes:
 *   /api/agent/start, /api/agent/stop          -- voice agent lifecycle
 *   /api/ingest/url, /text, /prospect           -- RAG ingest
 *   /api/calls/:id/{transcript,summarize} + GET -- post-call
 *   /api/personas, /api/personas/:id            -- persona registry
 *   /api/slots, /api/slots/reserve              -- clinic slot list + CAS hold
 *   /api/bookings/confirm, /api/bookings/:id    -- booking confirmation
 *   /api/contacts, /api/contacts/by-phone/:p    -- CRM-lite caller lookup
 *   /api/handoffs                               -- human-in-the-loop escalations
 *   /v1/chat/completions                        -- the custom LLM proxy Agora calls
 *   /health                                     -- liveness
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getEnv } from "./env.js";
import { agentRoutes } from "./routes/agent.js";
import { ingestRoutes } from "./routes/ingest.js";
import { callRoutes } from "./routes/calls.js";
import { personaRoutes } from "./routes/personas.js";
import { llmRoutes } from "./routes/llm.js";
import { slotRoutes } from "./routes/slots.js";
import { bookingRoutes } from "./routes/bookings.js";
import { contactRoutes } from "./routes/contacts.js";
import { handoffRoutes } from "./routes/handoffs.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Permissive in dev; tighten via WEB_BASE_URL allowlist in prod
      try {
        const env = getEnv();
        const allowed = [env.WEB_BASE_URL, "http://localhost:3000"];
        if (!origin) return "*";
        if (allowed.includes(origin)) return origin;
        return origin;
      } catch {
        return origin ?? "*";
      }
    },
    credentials: true,
  })
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "Riri-api",
    ts: new Date().toISOString(),
  })
);

app.route("/api/agent", agentRoutes);
app.route("/api/ingest", ingestRoutes);
app.route("/api/calls", callRoutes);
app.route("/api/personas", personaRoutes);
app.route("/api/slots", slotRoutes);
app.route("/api/bookings", bookingRoutes);
app.route("/api/contacts", contactRoutes);
app.route("/api/handoffs", handoffRoutes);
app.route("/v1", llmRoutes);

app.onError((err, c) => {
  console.error("[api] unhandled error:", err);
  return c.json({ error: "internal_error", detail: err.message }, 500);
});

const port = (() => {
  try {
    return getEnv().PORT;
  } catch {
    return Number(process.env.PORT ?? 3001);
  }
})();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Riri API listening on http://localhost:${info.port}`);
  console.log(`  health:       http://localhost:${info.port}/health`);
  console.log(`  llm proxy:    http://localhost:${info.port}/v1/chat/completions`);
  console.log(`  agent start:  POST http://localhost:${info.port}/api/agent/start`);
  console.log(`  clinic slots: GET  http://localhost:${info.port}/api/slots`);
  console.log("");
  console.log("Reminder: expose this with cloudflared/ngrok so Agora can reach /v1/chat/completions");
});
