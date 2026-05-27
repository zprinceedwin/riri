/**
 * Handoff endpoints. A handoff is a record that the voice agent escalated
 * a call to a human coordinator. The dashboard's PendingHandoffPanel polls
 * the GET endpoint every few seconds to surface unresolved escalations.
 *
 *   GET  /api/handoffs   -- list pending handoffs
 *   POST /api/handoffs   -- create one (called by the LLM via function calling
 *                           OR by the post-call summarizer if it detected
 *                           an escalation event in the transcript)
 *   POST /api/handoffs/:id/resolve -- mark resolved
 */
import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  CreateHandoffRequestSchema,
  type Handoff,
  type ListHandoffsResponse,
} from "@riri/shared";
import {
  createHandoff,
  getHandoff,
  listPendingHandoffs,
} from "../lib/supabase.js";

export const handoffRoutes = new Hono();

handoffRoutes.get("/", async (c) => {
  const handoffs = await listPendingHandoffs();
  const res: ListHandoffsResponse = { handoffs };
  return c.json(res);
});

handoffRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = CreateHandoffRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", detail: parsed.error.message }, 400);
  }
  const handoff: Handoff = {
    id: `ho-${nanoid(10)}`,
    callId: parsed.data.callId,
    contactId: parsed.data.contactId,
    reason: parsed.data.reason,
    priority: parsed.data.priority ?? "normal",
    createdAt: Date.now(),
    status: "pending",
    note: parsed.data.note,
  };
  await createHandoff(handoff);
  return c.json(handoff);
});

handoffRoutes.post("/:id/resolve", async (c) => {
  const id = c.req.param("id");
  const handoff = await getHandoff(id);
  if (!handoff) return c.json({ error: "not_found" }, 404);
  const resolved: Handoff = { ...handoff, status: "resolved" };
  await createHandoff(resolved);
  return c.json(resolved);
});
