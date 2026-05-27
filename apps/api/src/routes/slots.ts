/**
 * Clinic slot endpoints.
 *   GET  /api/slots?from=ISO&to=ISO&doctorId=optional   -- list slots in window
 *   POST /api/slots/reserve                              -- CAS-based 5min hold
 *
 * Reservation uses a Couchbase CAS replace so two simultaneous reservations
 * for the same slot are guaranteed to have exactly one winner. See
 * `reserveSlot` in lib/couchbase.ts for the details of the locking protocol.
 */
import { Hono } from "hono";
import {
  ReserveSlotRequestSchema,
  type ReserveSlotResponse,
  type ListSlotsResponse,
} from "@riri/shared";
import { listSlotsBetween, reserveSlot } from "../lib/couchbase.js";

export const slotRoutes = new Hono();

slotRoutes.get("/", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");
  const doctorId = c.req.query("doctorId") || undefined;

  if (!from || !to) {
    return c.json(
      { error: "missing_query", detail: "from and to (ISO timestamps) are required" },
      400
    );
  }

  const slots = await listSlotsBetween(from, to, doctorId);
  const res: ListSlotsResponse = { slots };
  return c.json(res);
});

slotRoutes.post("/reserve", async (c) => {
  const body = await c.req.json();
  const parsed = ReserveSlotRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", detail: parsed.error.message }, 400);
  }
  const { slotId, callId, ttlSec } = parsed.data;
  const result = await reserveSlot(slotId, callId, ttlSec ?? 300);

  if (result.ok) {
    const ok: ReserveSlotResponse = { ok: true, slot: result.slot };
    return c.json(ok);
  }
  const fail: ReserveSlotResponse = { ok: false, reason: result.reason };
  return c.json(fail, 409);
});
