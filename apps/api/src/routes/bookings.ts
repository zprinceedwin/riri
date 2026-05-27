/**
 * Clinic booking endpoints.
 *   POST /api/bookings/confirm  -- turn a held slot into a confirmed booking
 *   GET  /api/bookings/:id      -- fetch a booking record
 *   GET  /api/bookings          -- list recent bookings (for the dashboard)
 *
 * The confirm flow is the load-bearing voice-to-record handoff:
 *   1. Upsert/find contact by phone
 *   2. CAS-confirm the slot (only succeeds if held by this callId)
 *   3. Insert the Booking record
 *   4. Best-effort Resend confirmation email
 *   5. Append the call to the contact's history
 *   6. Return the booking + contact + emailSent flag
 *
 * Booking success does NOT depend on email success.
 */
import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  ConfirmBookingRequestSchema,
  type ConfirmBookingResponse,
  type Contact,
  type ListBookingsResponse,
} from "@riri/shared";
import { getEnv } from "../env.js";
import {
  appendContactHistory,
  confirmBooking,
  getBooking,
  getContactByPhone,
  listBookings,
  upsertContact,
} from "../lib/couchbase.js";
import { sendBookingConfirmation } from "../lib/resend.js";
import { getDoctor, getService } from "../lib/clinic-catalog.js";

export const bookingRoutes = new Hono();

bookingRoutes.post("/confirm", async (c) => {
  const body = await c.req.json();
  const parsed = ConfirmBookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", detail: parsed.error.message }, 400);
  }
  const { slotId, callId, serviceId, contact: contactInput } = parsed.data;

  // 1. Upsert contact (find by phone first).
  let contact: Contact;
  const existing = await getContactByPhone(contactInput.phone);
  const now = Date.now();
  if (existing) {
    contact = {
      ...existing,
      name: contactInput.name || existing.name,
      email: contactInput.email || existing.email,
      lastSeenAt: now,
      lastCallId: callId,
    };
  } else {
    contact = {
      id: `ct-${nanoid(10)}`,
      name: contactInput.name,
      phone: contactInput.phone,
      email: contactInput.email,
      tags: ["voice-booking"],
      firstSeenAt: now,
      lastSeenAt: now,
      totalCalls: 1,
      totalBookings: 0,
      lastCallId: callId,
      history: [],
    };
  }

  // 2. CAS-confirm the slot.
  const outcome = await confirmBooking({
    slotId,
    callId,
    serviceId,
    contact: contactInput,
  });
  if (!outcome.ok) {
    return c.json({ error: "booking_failed", reason: outcome.reason, detail: outcome.detail }, 409);
  }

  // 3. Persist contact + tag with the booking count.
  contact = {
    ...contact,
    totalBookings: contact.totalBookings + 1,
  };
  await upsertContact(contact).catch((err) =>
    console.error("[bookings.confirm] upsertContact failed:", err)
  );

  // 4. Best-effort email. Booking already succeeded.
  let emailSent = false;
  try {
    const env = getEnv();
    const service = getService(serviceId);
    const doctor = getDoctor(outcome.booking.doctorId);
    const result = await sendBookingConfirmation({
      to: contactInput.email,
      name: contactInput.name,
      serviceName: service?.name ?? serviceId,
      doctorName: doctor?.name ?? outcome.booking.doctorId,
      clinicName: env.CLINIC_NAME,
      scheduledFor: outcome.booking.scheduledFor,
      durationMin: service?.durationMin ?? 30,
      addressLine: env.CLINIC_ADDRESS_LINE,
      priceCents: service?.priceCents,
      callId,
    });
    emailSent = result.ok;
    if (!result.ok) {
      console.warn("[bookings.confirm] confirmation email failed:", result.error);
    }
  } catch (err) {
    console.warn("[bookings.confirm] email pipeline failed:", err);
  }

  // 5. Append history.
  try {
    await appendContactHistory(contact.id, {
      callId,
      ts: now,
      outcome: "booking_confirmed",
      summary: `Booked ${getService(serviceId)?.name ?? serviceId} with ${
        getDoctor(outcome.booking.doctorId)?.name ?? outcome.booking.doctorId
      } at ${outcome.booking.scheduledFor}.`,
    });
  } catch (err) {
    console.warn("[bookings.confirm] appendContactHistory failed:", err);
  }

  const res: ConfirmBookingResponse = {
    booking: outcome.booking,
    contact,
    emailSent,
  };
  return c.json(res);
});

bookingRoutes.get("/", async (c) => {
  const limitRaw = c.req.query("limit");
  const limit = limitRaw ? Number(limitRaw) : 100;
  const bookings = await listBookings(Number.isFinite(limit) ? limit : 100);
  const res: ListBookingsResponse = { bookings };
  return c.json(res);
});

bookingRoutes.get("/:bookingId", async (c) => {
  const bookingId = c.req.param("bookingId");
  const booking = await getBooking(bookingId);
  if (!booking) return c.json({ error: "not_found" }, 404);
  return c.json(booking);
});
