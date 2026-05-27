/**
 * Supabase data layer.
 *
 * Replaces the previous Couchbase Capella library. Same exported surface so
 * route/seed callers compile unchanged. Backend talks to Supabase via the
 * service_role key (bypasses RLS) over the PostgREST API in @supabase/supabase-js.
 *
 * Schema is defined in the migration `riri_schema_v1` on the Supabase project.
 * Columns are snake_case in Postgres; we map to/from camelCase here so the rest
 * of the codebase keeps its existing TypeScript types from `@riri/shared`.
 *
 * Vector search uses the `match_knowledge` RPC defined in the same migration
 * (cosine distance against an HNSW index over `knowledge.embedding`).
 *
 * Slot reservation uses an atomic `UPDATE ... WHERE status='available'` which
 * is the Postgres-native equivalent of Couchbase CAS: if the row's status has
 * changed under us, the WHERE clause matches zero rows and we treat it as a
 * lost race.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { getEnv } from "../env.js";
import type {
  Booking,
  Contact,
  ContactHistoryEntry,
  Handoff,
  IngestKind,
  RagChunk,
  Slot,
} from "@riri/shared";

let clientCache: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (clientCache) return clientCache;
  const env = getEnv();
  clientCache = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return clientCache;
}

// ============================================================================
// Knowledge documents (RAG chunks)
// ============================================================================

export interface StoredChunk {
  text: string;
  embedding: number[];
  kind: IngestKind;
  namespace: string;
  source?: string;
  title?: string;
  createdAt: number;
}

export async function upsertChunk(id: string, chunk: StoredChunk): Promise<void> {
  const { error } = await getClient()
    .from("knowledge")
    .upsert({
      id,
      text: chunk.text,
      embedding: chunk.embedding as unknown as string, // pgvector accepts number[] via supabase-js
      kind: chunk.kind,
      namespace: chunk.namespace,
      source: chunk.source ?? null,
      title: chunk.title ?? null,
      created_at: chunk.createdAt,
    });
  if (error) throw new Error(`upsertChunk failed: ${error.message}`);
}

export async function upsertChunks(
  items: Array<{ id: string; chunk: StoredChunk }>
): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map(({ id, chunk }) => ({
    id,
    text: chunk.text,
    embedding: chunk.embedding as unknown as string,
    kind: chunk.kind,
    namespace: chunk.namespace,
    source: chunk.source ?? null,
    title: chunk.title ?? null,
    created_at: chunk.createdAt,
  }));
  const { error } = await getClient().from("knowledge").upsert(rows);
  if (error) throw new Error(`upsertChunks failed: ${error.message}`);
}

interface MatchKnowledgeRow {
  id: string;
  text: string;
  kind: string;
  namespace: string;
  source: string | null;
  title: string | null;
  score: number;
}

export async function vectorSearch(
  queryEmbedding: number[],
  opts: { topK?: number; namespace?: string } = {}
): Promise<RagChunk[]> {
  const topK = opts.topK ?? 4;
  const { data, error } = await getClient().rpc("match_knowledge", {
    query_embedding: queryEmbedding as unknown as string,
    match_count: topK,
    filter_namespace: opts.namespace ?? null,
  });
  if (error) {
    console.error("[supabase.vectorSearch] RPC failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as MatchKnowledgeRow[];
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    kind: r.kind as IngestKind,
    namespace: r.namespace,
    source: r.source ?? undefined,
    title: r.title ?? undefined,
    score: r.score,
  }));
}

// ============================================================================
// Call records
// ============================================================================

export interface StoredCall {
  callId: string;
  agentId: string;
  personaId: string;
  channel: string;
  prospectId?: string;
  namespace: string;
  startedAt: number;
  endedAt?: number;
  transcript?: Array<{ role: "user" | "assistant"; text: string; ts: number }>;
  summary?: unknown;
  contactId?: string;
}

interface CallRow {
  call_id: string;
  agent_id: string;
  persona_id: string;
  channel: string;
  prospect_id: string | null;
  namespace: string;
  started_at: number;
  ended_at: number | null;
  transcript: StoredCall["transcript"] | null;
  summary: unknown;
  contact_id: string | null;
}

function callRowToDomain(r: CallRow): StoredCall {
  return {
    callId: r.call_id,
    agentId: r.agent_id,
    personaId: r.persona_id,
    channel: r.channel,
    prospectId: r.prospect_id ?? undefined,
    namespace: r.namespace,
    startedAt: r.started_at,
    endedAt: r.ended_at ?? undefined,
    transcript: r.transcript ?? undefined,
    summary: r.summary ?? undefined,
    contactId: r.contact_id ?? undefined,
  };
}

export async function upsertCall(call: StoredCall): Promise<void> {
  const { error } = await getClient()
    .from("calls")
    .upsert({
      call_id: call.callId,
      agent_id: call.agentId,
      persona_id: call.personaId,
      channel: call.channel,
      prospect_id: call.prospectId ?? null,
      namespace: call.namespace,
      started_at: call.startedAt,
      ended_at: call.endedAt ?? null,
      transcript: call.transcript ?? null,
      summary: call.summary ?? null,
      contact_id: call.contactId ?? null,
    });
  if (error) throw new Error(`upsertCall failed: ${error.message}`);
}

export async function getCall(callId: string): Promise<StoredCall | null> {
  const { data, error } = await getClient()
    .from("calls")
    .select("*")
    .eq("call_id", callId)
    .maybeSingle();
  if (error) {
    console.error("[supabase.getCall] failed:", error.message);
    return null;
  }
  return data ? callRowToDomain(data as CallRow) : null;
}

// ============================================================================
// Slots (atomic UPDATE ... WHERE replaces Couchbase CAS)
// ============================================================================

interface SlotRow {
  id: string;
  doctor_id: string;
  starts_at: string;
  duration_min: number;
  status: "available" | "held" | "booked";
  held_until: number | null;
  booking_id: string | null;
  call_id: string | null;
}

function slotRowToDomain(r: SlotRow): Slot {
  return {
    id: r.id,
    doctorId: r.doctor_id,
    startsAt: r.starts_at,
    durationMin: r.duration_min,
    status: r.status,
    heldUntil: r.held_until ?? undefined,
    bookingId: r.booking_id ?? undefined,
    callId: r.call_id ?? undefined,
  };
}

function slotDomainToRow(s: Slot) {
  return {
    id: s.id,
    doctor_id: s.doctorId,
    starts_at: s.startsAt,
    duration_min: s.durationMin,
    status: s.status,
    held_until: s.heldUntil ?? null,
    booking_id: s.bookingId ?? null,
    call_id: s.callId ?? null,
  };
}

export async function upsertSlot(slot: Slot): Promise<void> {
  const { error } = await getClient().from("slots").upsert(slotDomainToRow(slot));
  if (error) throw new Error(`upsertSlot failed: ${error.message}`);
}

export async function getSlot(slotId: string): Promise<Slot | null> {
  const { data, error } = await getClient()
    .from("slots")
    .select("*")
    .eq("id", slotId)
    .maybeSingle();
  if (error) {
    console.error("[supabase.getSlot] failed:", error.message);
    return null;
  }
  return data ? slotRowToDomain(data as SlotRow) : null;
}

export interface ReserveSlotSuccess {
  ok: true;
  slot: Slot;
}
export interface ReserveSlotFailure {
  ok: false;
  reason:
    | "slot_not_found"
    | "slot_unavailable"
    | "slot_taken_concurrent"
    | "internal_error";
  detail?: string;
}
export type ReserveSlotResult = ReserveSlotSuccess | ReserveSlotFailure;

export async function reserveSlot(
  slotId: string,
  callId: string,
  ttlSec = 300
): Promise<ReserveSlotResult> {
  const client = getClient();
  const heldUntil = Date.now() + ttlSec * 1000;

  // Atomic: update to 'held' only if the row is currently 'available'. If 0
  // rows match (someone else got it, or it was never available), the affected
  // count is 0 and we fall through to inspect actual state.
  const { data: updated, error: updErr } = await client
    .from("slots")
    .update({ status: "held", held_until: heldUntil, call_id: callId })
    .eq("id", slotId)
    .eq("status", "available")
    .select()
    .maybeSingle();

  if (updErr) {
    return {
      ok: false,
      reason: "internal_error",
      detail: updErr.message,
    };
  }
  if (updated) {
    return { ok: true, slot: slotRowToDomain(updated as SlotRow) };
  }

  // Update affected zero rows: figure out why.
  const existing = await getSlot(slotId);
  if (!existing) return { ok: false, reason: "slot_not_found" };

  // Idempotent re-acquire by same caller.
  if (existing.status === "held" && existing.callId === callId) {
    return { ok: true, slot: existing };
  }
  // Someone else holds or booked it.
  if (existing.status === "held" || existing.status === "booked") {
    return { ok: false, reason: "slot_taken_concurrent" };
  }
  return { ok: false, reason: "slot_unavailable" };
}

export interface ConfirmBookingResult {
  ok: true;
  slot: Slot;
  booking: Booking;
}
export interface ConfirmBookingFailure {
  ok: false;
  reason:
    | "slot_not_found"
    | "slot_not_held_by_caller"
    | "slot_already_booked"
    | "slot_taken_concurrent"
    | "internal_error";
  detail?: string;
}
export type ConfirmBookingOutcome = ConfirmBookingResult | ConfirmBookingFailure;

export async function confirmBooking(args: {
  slotId: string;
  callId: string;
  serviceId: string;
  contact: { name: string; phone: string; email: string };
}): Promise<ConfirmBookingOutcome> {
  const client = getClient();
  const bookingId = `bk-${nanoid(10)}`;

  // Atomic: flip slot to 'booked' ONLY if the same caller still holds it.
  const { data: updated, error: updErr } = await client
    .from("slots")
    .update({ status: "booked", held_until: null, booking_id: bookingId })
    .eq("id", args.slotId)
    .eq("status", "held")
    .eq("call_id", args.callId)
    .select()
    .maybeSingle();

  if (updErr) {
    return { ok: false, reason: "internal_error", detail: updErr.message };
  }
  if (!updated) {
    const existing = await getSlot(args.slotId);
    if (!existing) return { ok: false, reason: "slot_not_found" };
    if (existing.status === "booked") return { ok: false, reason: "slot_already_booked" };
    if (existing.status === "held" && existing.callId !== args.callId) {
      return { ok: false, reason: "slot_taken_concurrent" };
    }
    return { ok: false, reason: "slot_not_held_by_caller" };
  }

  const updatedSlot = slotRowToDomain(updated as SlotRow);
  const booking: Booking = {
    id: bookingId,
    slotId: args.slotId,
    doctorId: updatedSlot.doctorId,
    serviceId: args.serviceId,
    contact: args.contact,
    scheduledFor: updatedSlot.startsAt,
    createdAt: new Date().toISOString(),
    status: "confirmed",
    source: "voice",
    callId: args.callId,
  };

  const { error: bkErr } = await client.from("bookings").insert({
    id: booking.id,
    slot_id: booking.slotId,
    doctor_id: booking.doctorId,
    service_id: booking.serviceId,
    contact: booking.contact,
    scheduled_for: booking.scheduledFor,
    created_at: booking.createdAt,
    status: booking.status,
    source: booking.source,
    call_id: booking.callId ?? null,
  });
  if (bkErr) {
    // Roll the slot back to 'held' so we don't leak a booked-but-no-booking state.
    await client
      .from("slots")
      .update({ status: "held", held_until: Date.now() + 60_000, booking_id: null })
      .eq("id", args.slotId);
    return { ok: false, reason: "internal_error", detail: bkErr.message };
  }

  return { ok: true, slot: updatedSlot, booking };
}

export async function listSlotsBetween(
  fromIso: string,
  toIso: string,
  doctorId?: string
): Promise<Slot[]> {
  let query = getClient()
    .from("slots")
    .select("*")
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at", { ascending: true });
  if (doctorId) query = query.eq("doctor_id", doctorId);
  const { data, error } = await query;
  if (error) {
    console.error("[supabase.listSlotsBetween] failed:", error.message);
    return [];
  }
  return (data as SlotRow[]).map(slotRowToDomain);
}

export async function listAllSlots(): Promise<Slot[]> {
  const { data, error } = await getClient()
    .from("slots")
    .select("*")
    .order("starts_at", { ascending: true });
  if (error) {
    console.error("[supabase.listAllSlots] failed:", error.message);
    return [];
  }
  return (data as SlotRow[]).map(slotRowToDomain);
}

// ============================================================================
// Contacts
// ============================================================================

interface ContactRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  tags: string[];
  notes: string | null;
  first_seen_at: number;
  last_seen_at: number;
  total_calls: number;
  total_bookings: number;
  last_call_id: string | null;
  history: ContactHistoryEntry[];
}

function contactRowToDomain(r: ContactRow): Contact {
  return {
    id: r.id,
    name: r.name ?? undefined,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    tags: r.tags ?? [],
    notes: r.notes ?? undefined,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    totalCalls: r.total_calls,
    totalBookings: r.total_bookings,
    lastCallId: r.last_call_id ?? undefined,
    history: r.history ?? [],
  };
}

function contactDomainToRow(c: Contact) {
  return {
    id: c.id,
    name: c.name ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    tags: c.tags ?? [],
    notes: c.notes ?? null,
    first_seen_at: c.firstSeenAt,
    last_seen_at: c.lastSeenAt,
    total_calls: c.totalCalls,
    total_bookings: c.totalBookings,
    last_call_id: c.lastCallId ?? null,
    history: c.history ?? [],
  };
}

export async function upsertContact(contact: Contact): Promise<void> {
  const { error } = await getClient()
    .from("contacts")
    .upsert(contactDomainToRow(contact));
  if (error) throw new Error(`upsertContact failed: ${error.message}`);
}

export async function getContact(contactId: string): Promise<Contact | null> {
  const { data, error } = await getClient()
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();
  if (error) {
    console.error("[supabase.getContact] failed:", error.message);
    return null;
  }
  return data ? contactRowToDomain(data as ContactRow) : null;
}

export async function getContactByPhone(phone: string): Promise<Contact | null> {
  const { data, error } = await getClient()
    .from("contacts")
    .select("*")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[supabase.getContactByPhone] failed:", error.message);
    return null;
  }
  return data ? contactRowToDomain(data as ContactRow) : null;
}

export async function listContacts(limit = 50): Promise<Contact[]> {
  const clamped = Math.max(1, Math.min(limit, 200));
  const { data, error } = await getClient()
    .from("contacts")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(clamped);
  if (error) {
    console.error("[supabase.listContacts] failed:", error.message);
    return [];
  }
  return (data as ContactRow[]).map(contactRowToDomain);
}

export async function appendContactHistory(
  contactId: string,
  entry: ContactHistoryEntry
): Promise<void> {
  const existing = await getContact(contactId);
  if (!existing) return;
  const next: Contact = {
    ...existing,
    history: [...existing.history, entry].slice(-50),
    lastSeenAt: entry.ts,
    lastCallId: entry.callId,
    totalCalls: existing.totalCalls + 1,
  };
  await upsertContact(next);
}

// ============================================================================
// Bookings
// ============================================================================

interface BookingRow {
  id: string;
  slot_id: string;
  doctor_id: string;
  service_id: string;
  contact: Booking["contact"];
  scheduled_for: string;
  created_at: string;
  status: Booking["status"];
  source: Booking["source"];
  call_id: string | null;
}

function bookingRowToDomain(r: BookingRow): Booking {
  return {
    id: r.id,
    slotId: r.slot_id,
    doctorId: r.doctor_id,
    serviceId: r.service_id,
    contact: r.contact,
    scheduledFor: r.scheduled_for,
    createdAt: r.created_at,
    status: r.status,
    source: r.source,
    callId: r.call_id ?? undefined,
  };
}

function bookingDomainToRow(b: Booking) {
  return {
    id: b.id,
    slot_id: b.slotId,
    doctor_id: b.doctorId,
    service_id: b.serviceId,
    contact: b.contact,
    scheduled_for: b.scheduledFor,
    created_at: b.createdAt,
    status: b.status,
    source: b.source,
    call_id: b.callId ?? null,
  };
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const { data, error } = await getClient()
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) {
    console.error("[supabase.getBooking] failed:", error.message);
    return null;
  }
  return data ? bookingRowToDomain(data as BookingRow) : null;
}

export async function upsertBooking(booking: Booking): Promise<void> {
  const { error } = await getClient()
    .from("bookings")
    .upsert(bookingDomainToRow(booking));
  if (error) throw new Error(`upsertBooking failed: ${error.message}`);
}

export async function listBookings(limit = 100): Promise<Booking[]> {
  const clamped = Math.max(1, Math.min(limit, 500));
  const { data, error } = await getClient()
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(clamped);
  if (error) {
    console.error("[supabase.listBookings] failed:", error.message);
    return [];
  }
  return (data as BookingRow[]).map(bookingRowToDomain);
}

// ============================================================================
// Handoffs
// ============================================================================

interface HandoffRow {
  id: string;
  call_id: string;
  contact_id: string | null;
  reason: Handoff["reason"];
  priority: Handoff["priority"];
  created_at: number;
  status: Handoff["status"];
  note: string | null;
}

function handoffRowToDomain(r: HandoffRow): Handoff {
  return {
    id: r.id,
    callId: r.call_id,
    contactId: r.contact_id ?? undefined,
    reason: r.reason,
    priority: r.priority,
    createdAt: r.created_at,
    status: r.status,
    note: r.note ?? undefined,
  };
}

export async function createHandoff(handoff: Handoff): Promise<void> {
  const { error } = await getClient()
    .from("handoffs")
    .upsert({
      id: handoff.id,
      call_id: handoff.callId,
      contact_id: handoff.contactId ?? null,
      reason: handoff.reason,
      priority: handoff.priority,
      created_at: handoff.createdAt,
      status: handoff.status,
      note: handoff.note ?? null,
    });
  if (error) throw new Error(`createHandoff failed: ${error.message}`);
}

export async function getHandoff(id: string): Promise<Handoff | null> {
  const { data, error } = await getClient()
    .from("handoffs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[supabase.getHandoff] failed:", error.message);
    return null;
  }
  return data ? handoffRowToDomain(data as HandoffRow) : null;
}

export async function listPendingHandoffs(): Promise<Handoff[]> {
  const { data, error } = await getClient()
    .from("handoffs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[supabase.listPendingHandoffs] failed:", error.message);
    return [];
  }
  return (data as HandoffRow[]).map(handoffRowToDomain);
}
