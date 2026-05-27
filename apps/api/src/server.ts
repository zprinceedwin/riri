/**
 * Riri Hono app (host-neutral).
 *
 * This module constructs and configures the Hono `app` — routes, middleware,
 * error handler. It does NOT start a server. Two consumers wrap it:
 *
 *   - apps/api/src/index.ts        -> @hono/node-server `serve()` for local Node dev
 *   - api/index.ts (repo root)     -> `hono/vercel`'s `handle()` for Vercel deploys
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
 *   /api/services, /api/doctors                 -- static clinic catalog
 *   /v1/chat/completions                        -- the custom LLM proxy Agora calls
 *   /health                                     -- liveness
 */
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
import { catalogRoutes } from "./routes/catalog.js";
import { mcpRoutes } from "./routes/mcp.js";

export const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      try {
        const env = getEnv();
        const allowed = [
          env.WEB_BASE_URL,
          "http://localhost:3000",
          "http://localhost:3001",
        ];
        if (!origin) return env.WEB_BASE_URL;
        if (allowed.includes(origin)) return origin;
        if (process.env.NODE_ENV !== "production") return origin;
        console.warn(`[cors] Blocked origin: ${origin}`);
        return allowed[0];
      } catch {
        return origin ?? "*";
      }
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
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
app.route("/api", catalogRoutes);
app.route("/v1", llmRoutes);
app.route("/mcp", mcpRoutes);

app.onError((err, c) => {
  console.error("[api] unhandled error:", err);
  return c.json({ error: "internal_error", detail: err.message }, 500);
});
