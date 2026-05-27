/**
 * Riri API server (local Node dev entrypoint).
 * Imports the host-neutral `app` from ./server and starts a Node HTTP listener.
 * On Vercel, api/index.ts (repo root) uses `hono/vercel`'s `handle()` instead.
 */
import { serve } from "@hono/node-server";
import { app } from "./server.js";
import { getEnv } from "./env.js";

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
  console.log(`  mcp server:   POST http://localhost:${info.port}/mcp  (Agora Studio integration)`);
  console.log(`  llm proxy:    http://localhost:${info.port}/v1/chat/completions  (legacy, used only if not on Studio path)`);
  console.log(`  agent start:  POST http://localhost:${info.port}/api/agent/start`);
  console.log(`  clinic slots: GET  http://localhost:${info.port}/api/slots`);
});
