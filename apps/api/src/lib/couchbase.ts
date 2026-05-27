/**
 * Couchbase Capella client + vector search helpers.
 *
 * Setup (one-time, in Capella UI):
 *   1. Create bucket `Riri`
 *   2. Default scope, create these collections:
 *      - `knowledge` (vector RAG chunks)
 *      - `calls` (post-call records + transcript)
 *      - `slots` (clinic appointment slots, used as CAS-based reservation locks)
 *      - `contacts` (CRM-style caller records)
 *      - `bookings` (confirmed appointments)
 *      - `handoffs` (escalations from voice agent to human coordinator)
 *   3. Create a Search index named `riri_vector_idx` with the JSON shown in
 *      infra/couchbase-vector-index.md (vector field: `embedding`, dim 1536).
 *
 * Connection is lazy -- the API server starts even if Capella creds are missing,
 * so frontend dev work is not blocked. First DB call throws if misconfigured.
 */
import {
  Bucket,
  Cluster,
  Collection,
  Scope,
  SearchRequest,
  VectorQuery,
  VectorSearch,
  connect,
} from "couchbase";
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

let clusterCache: Cluster | null = null;
let bucketCache: Bucket | null = null;
let scopeCache: Scope | null = null;
let knowledgeCache: Collection | null = null;
let callsCache: Collection | null = null;
let slotsCache: Collection | null = null;
let contactsCache: Collection | null = null;
let bookingsCache: Collection | null = null;
let handoffsCache: Collection | null = null;

async function getCluster(): Promise<Cluster> {
  if (clusterCache) return clusterCache;
  const env = getEnv();
  clusterCache = await connect(env.COUCHBASE_CONNECTION_STRING, {
    username: env.COUCHBASE_USERNAME,
    password: env.COUCHBASE_PASSWORD,
    configProfile: "wanDevelopment",
  });
  return clusterCache;
}

async function getBucket(): Promise<Bucket> {
  if (bucketCache) return bucketCache;
  const cluster = await getCluster();
  bucketCache = cluster.bucket(getEnv().COUCHBASE_BUCKET);
  return bucketCache;
}

async function getScope(): Promise<Scope> {
  if (scopeCache) return scopeCache;
  const bucket = await getBucket();
  scopeCache = bucket.scope(getEnv().COUCHBASE_SCOPE);
  return scopeCache;
}

export async function getKnowledgeCollection(): Promise<Collection> {
  if (knowledgeCache) return knowledgeCache;
  const scope = await getScope();
  knowledgeCache = scope.collection(getEnv().COUCHBASE_COLLECTION_KNOWLEDGE);
  return knowledgeCache;
}

export async function getCallsCollection(): Promise<Collection> {
  if (callsCache) return callsCache;
  const scope = await getScope();
  callsCache = scope.collection(getEnv().COUCHBASE_COLLECTION_CALLS);
  return callsCache;
}

export async function getSlotsCollection(): Promise<Collection> {
  if (slotsCache) return slotsCache;
  const scope = await getScope();
  slotsCache = scope.collection(getEnv().COUCHBASE_COLLECTION_SLOTS);
  return slotsCache;
}

export async function getContactsCollection(): Promise<Collection> {
  if (contactsCache) return contactsCache;
  const scope = await getScope();
  contactsCache = scope.collection(getEnv().COUCHBASE_COLLECTION_CONTACTS);
  return contactsCache;
}

export async function getBookingsCollection(): Promise<Collection> {
  if (bookingsCache) return bookingsCache;
  const scope = await getScope();
  bookingsCache = scope.collection(getEnv().COUCHBASE_COLLECTION_BOOKINGS);
  return bookingsCache;
}

export async function getHandoffsCollection(): Promise<Collection> {
  if (handoffsCache) return handoffsCache;
  const scope = await getScope();
  handoffsCache = scope.collection(getEnv().COUCHBASE_COLLECTION_HANDOFFS);
  return handoffsCache;
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
  const collection = await getKnowledgeCollection();
  await collection.upsert(id, chunk);
}

export async function upsertChunks(
  items: Array<{ id: string; chunk: StoredChunk }>
): Promise<void> {
  // Couchbase Node SDK lacks a bulk upsert helper -- parallelize manually.
  await Promise.all(items.map(({ id, chunk }) => upsertChunk(id, chunk)));
}

/**
 * Vector search over the `knowledge` collection.
 * Returns top-k chunks with similarity scores, optionally filtered by namespace.
 */
export async function vectorSearch(
  queryEmbedding: number[],
  opts: { topK?: number; namespace?: string } = {}
): Promise<RagChunk[]> {
  const topK = opts.topK ?? 4;
  const cluster = await getCluster();
  const env = getEnv();

  const vq = VectorQuery.create("embedding", queryEmbedding).numCandidates(
    Math.max(topK * 4, 10)
  );

  const request = SearchRequest.create(VectorSearch.fromVectorQuery(vq));

  // Use cluster.search() (SearchRequest API) rather than searchQuery() which
  // is the older FTS-only signature. SDK 4.7+ requires this for vector queries.
  const result = await cluster.search(env.COUCHBASE_VECTOR_INDEX, request, {
    limit: topK,
    fields: ["text", "kind", "namespace", "source", "title"],
  });

  const rows = result.rows ?? [];
  const filtered = opts.namespace
    ? rows.filter(
        (r) => (r.fields?.namespace as string | undefined) === opts.namespace
      )
    : rows;

  return filtered.map((r) => ({
    id: r.id,
    text: (r.fields?.text as string) ?? "",
    kind: (r.fields?.kind as IngestKind) ?? "company",
    namespace: (r.fields?.namespace as string) ?? "default",
    source: r.fields?.source as string | undefined,
    title: r.fields?.title as string | undefined,
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

export async function upsertCall(call: StoredCall): Promise<void> {
  const collection = await getCallsCollection();
  await collection.upsert(call.callId, call);
}

export async function getCall(callId: string): Promise<StoredCall | null> {
  try {
    const collection = await getCallsCollection();
    const res = await collection.get(callId);
    return res.content as StoredCall;
  } catch (err: unknown) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

// ============================================================================
// Slots (CAS-based reservation lock)
//
// CAS = Compare-And-Swap. Every Couchbase document carries an opaque revision
// stamp. We read the slot, mutate it locally, then replace with `cas:` set to
// the stamp we observed. If anyone else changed the doc between our read and
// write, the server rejects the replace and we treat it as a lost race.
// That gives us a multi-writer-safe reservation without distributed locks.
// ============================================================================

export async function upsertSlot(slot: Slot): Promise<void> {
  const collection = await getSlotsCollection();
  await collection.upsert(slot.id, slot);
}

export async function getSlot(slotId: string): Promise<Slot | null> {
  try {
    const collection = await getSlotsCollection();
    const res = await collection.get(slotId);
    return res.content as Slot;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
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
  const collection = await getSlotsCollection();
  try {
    const existing = await collection.get(slotId);
    const current = existing.content as Slot;
    if (current.status !== "available") {
      // Allow the same callId to re-acquire a slot it already held (idempotent).
      if (current.status === "held" && current.callId === callId) {
        return { ok: true, slot: current };
      }
      return { ok: false, reason: "slot_unavailable" };
    }
    const heldUntil = Date.now() + ttlSec * 1000;
    const updated: Slot = {
      ...current,
      status: "held",
      heldUntil,
      callId,
    };
    await collection.replace(slotId, updated, { cas: existing.cas });
    return { ok: true, slot: updated };
  } catch (err) {
    if (isNotFound(err)) {
      return { ok: false, reason: "slot_not_found" };
    }
    if (isCasMismatch(err) || isDocumentExists(err)) {
      return { ok: false, reason: "slot_taken_concurrent" };
    }
    return {
      ok: false,
      reason: "internal_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
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
  const slots = await getSlotsCollection();
  const bookings = await getBookingsCollection();

  try {
    const existing = await slots.get(args.slotId);
    const current = existing.content as Slot;
    if (current.status === "booked") {
      return { ok: false, reason: "slot_already_booked" };
    }
    if (current.status !== "held" || current.callId !== args.callId) {
      return { ok: false, reason: "slot_not_held_by_caller" };
    }
    const bookingId = `bk-${nanoid(10)}`;
    const booking: Booking = {
      id: bookingId,
      slotId: args.slotId,
      doctorId: current.doctorId,
      serviceId: args.serviceId,
      contact: args.contact,
      scheduledFor: current.startsAt,
      createdAt: new Date().toISOString(),
      status: "confirmed",
      source: "voice",
      callId: args.callId,
    };
    const updatedSlot: Slot = {
      ...current,
      status: "booked",
      heldUntil: undefined,
      bookingId,
    };
    // CAS replace the slot first so two simultaneous confirms can't both win.
    await slots.replace(args.slotId, updatedSlot, { cas: existing.cas });
    await bookings.insert(bookingId, booking);
    return { ok: true, slot: updatedSlot, booking };
  } catch (err) {
    if (isNotFound(err)) return { ok: false, reason: "slot_not_found" };
    if (isCasMismatch(err) || isDocumentExists(err)) {
      return { ok: false, reason: "slot_taken_concurrent" };
    }
    return {
      ok: false,
      reason: "internal_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function listSlotsBetween(
  fromIso: string,
  toIso: string,
  doctorId?: string
): Promise<Slot[]> {
  const env = getEnv();
  const scopePath = `\`${env.COUCHBASE_BUCKET}\`.\`${env.COUCHBASE_SCOPE}\`.\`${env.COUCHBASE_COLLECTION_SLOTS}\``;
  const params: Record<string, unknown> = { from: fromIso, to: toIso };
  let where = "WHERE s.startsAt >= $from AND s.startsAt < $to";
  if (doctorId) {
    where += " AND s.doctorId = $doctorId";
    params.doctorId = doctorId;
  }
  const query = `SELECT s.* FROM ${scopePath} s ${where} ORDER BY s.startsAt ASC`;
  try {
    const cluster = await getCluster();
    const result = await cluster.query(query, { parameters: params });
    return (result.rows ?? []) as Slot[];
  } catch (err) {
    console.error("[couchbase.listSlotsBetween] query failed:", err);
    return [];
  }
}

export async function listAllSlots(): Promise<Slot[]> {
  const env = getEnv();
  const scopePath = `\`${env.COUCHBASE_BUCKET}\`.\`${env.COUCHBASE_SCOPE}\`.\`${env.COUCHBASE_COLLECTION_SLOTS}\``;
  const query = `SELECT s.* FROM ${scopePath} s ORDER BY s.startsAt ASC`;
  try {
    const cluster = await getCluster();
    const result = await cluster.query(query);
    return (result.rows ?? []) as Slot[];
  } catch (err) {
    console.error("[couchbase.listAllSlots] query failed:", err);
    return [];
  }
}

// ============================================================================
// Contacts
// ============================================================================

export async function upsertContact(contact: Contact): Promise<void> {
  const collection = await getContactsCollection();
  await collection.upsert(contact.id, contact);
}

export async function getContact(contactId: string): Promise<Contact | null> {
  try {
    const collection = await getContactsCollection();
    const res = await collection.get(contactId);
    return res.content as Contact;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function getContactByPhone(phone: string): Promise<Contact | null> {
  const env = getEnv();
  const scopePath = `\`${env.COUCHBASE_BUCKET}\`.\`${env.COUCHBASE_SCOPE}\`.\`${env.COUCHBASE_COLLECTION_CONTACTS}\``;
  const query = `SELECT c.* FROM ${scopePath} c WHERE c.phone = $phone LIMIT 1`;
  try {
    const cluster = await getCluster();
    const result = await cluster.query(query, { parameters: { phone } });
    const rows = (result.rows ?? []) as Contact[];
    return rows[0] ?? null;
  } catch (err) {
    console.error("[couchbase.getContactByPhone] query failed:", err);
    return null;
  }
}

export async function listContacts(limit = 50): Promise<Contact[]> {
  const env = getEnv();
  const scopePath = `\`${env.COUCHBASE_BUCKET}\`.\`${env.COUCHBASE_SCOPE}\`.\`${env.COUCHBASE_COLLECTION_CONTACTS}\``;
  const query = `SELECT c.* FROM ${scopePath} c ORDER BY c.lastSeenAt DESC LIMIT ${Math.max(1, Math.min(limit, 200))}`;
  try {
    const cluster = await getCluster();
    const result = await cluster.query(query);
    return (result.rows ?? []) as Contact[];
  } catch (err) {
    console.error("[couchbase.listContacts] query failed:", err);
    return [];
  }
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

export async function getBooking(bookingId: string): Promise<Booking | null> {
  try {
    const collection = await getBookingsCollection();
    const res = await collection.get(bookingId);
    return res.content as Booking;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function upsertBooking(booking: Booking): Promise<void> {
  const collection = await getBookingsCollection();
  await collection.upsert(booking.id, booking);
}

export async function listBookings(limit = 100): Promise<Booking[]> {
  const env = getEnv();
  const scopePath = `\`${env.COUCHBASE_BUCKET}\`.\`${env.COUCHBASE_SCOPE}\`.\`${env.COUCHBASE_COLLECTION_BOOKINGS}\``;
  const query = `SELECT b.* FROM ${scopePath} b ORDER BY b.createdAt DESC LIMIT ${Math.max(1, Math.min(limit, 500))}`;
  try {
    const cluster = await getCluster();
    const result = await cluster.query(query);
    return (result.rows ?? []) as Booking[];
  } catch (err) {
    console.error("[couchbase.listBookings] query failed:", err);
    return [];
  }
}

// ============================================================================
// Handoffs
// ============================================================================

export async function createHandoff(handoff: Handoff): Promise<void> {
  const collection = await getHandoffsCollection();
  await collection.upsert(handoff.id, handoff);
}

export async function getHandoff(id: string): Promise<Handoff | null> {
  try {
    const collection = await getHandoffsCollection();
    const res = await collection.get(id);
    return res.content as Handoff;
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export async function listPendingHandoffs(): Promise<Handoff[]> {
  const env = getEnv();
  const scopePath = `\`${env.COUCHBASE_BUCKET}\`.\`${env.COUCHBASE_SCOPE}\`.\`${env.COUCHBASE_COLLECTION_HANDOFFS}\``;
  const query = `SELECT h.* FROM ${scopePath} h WHERE h.status = "pending" ORDER BY h.createdAt DESC`;
  try {
    const cluster = await getCluster();
    const result = await cluster.query(query);
    return (result.rows ?? []) as Handoff[];
  } catch (err) {
    console.error("[couchbase.listPendingHandoffs] query failed:", err);
    return [];
  }
}

// ============================================================================
// Error helpers
//
// The Couchbase Node SDK throws typed errors that all carry a `.name`. We
// match on those rather than instanceof so we don't have to import the
// concrete error classes (which vary across SDK minor versions).
// ============================================================================

function errName(err: unknown): string | null {
  if (err && typeof err === "object" && "name" in err) {
    const name = (err as { name?: unknown }).name;
    if (typeof name === "string") return name;
  }
  return null;
}

export function isNotFound(err: unknown): boolean {
  const n = errName(err);
  return n === "DocumentNotFoundError" || n === "ParsingFailureError";
}

export function isCasMismatch(err: unknown): boolean {
  return errName(err) === "CasMismatchError";
}

export function isDocumentExists(err: unknown): boolean {
  return errName(err) === "DocumentExistsError";
}
