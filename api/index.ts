/**
 * Vercel entrypoint.
 *
 * Vercel auto-discovers this file as a serverless function. The catch-all
 * rewrite in `vercel.json` routes every incoming request to /api so all
 * paths (/health, /mcp, /v1/chat/completions, /api/agent/start, ...) hit
 * this handler and get dispatched by Hono's router.
 */
import { handle } from "hono/vercel";
import { app } from "../apps/api/src/server.js";

export const config = { runtime: "nodejs" };

export default handle(app);
