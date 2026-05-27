/**
 * Tiny typed client for the Riri API. The interface contracts live in
 * @riri/shared so the FE and BE never drift.
 */
import {
  ROUTE,
  type Booking,
  type CallSummary,
  type ConfirmBookingRequest,
  type ConfirmBookingResponse,
  type Contact,
  type Doctor,
  type GetContactByPhoneResponse,
  type Handoff,
  type ListBookingsResponse,
  type ListContactsResponse,
  type ListDoctorsResponse,
  type ListHandoffsResponse,
  type ListServicesResponse,
  type ListSlotsResponse,
  type Persona,
  type PersonaId,
  type ReserveSlotRequest,
  type ReserveSlotResponse,
  type Service,
  type Slot,
  type StartAgentRequest,
  type StartAgentResponse,
  type StopAgentRequest,
  type StopAgentResponse,
} from "@riri/shared";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3001");

/** Override at build time once the seed:prospect script has been run. */
export const DEMO_PROSPECT_ID = process.env.NEXT_PUBLIC_DEMO_PROSPECT_ID ?? undefined;

async function jfetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} -- ${detail}`);
  }
  return (await res.json()) as T;
}

// ============================================================================
// Agent
// ============================================================================

export async function startAgent(input: StartAgentRequest): Promise<StartAgentResponse> {
  return jfetch(ROUTE.agentStart, { method: "POST", body: JSON.stringify(input) });
}

export async function stopAgent(input: StopAgentRequest): Promise<StopAgentResponse> {
  return jfetch(ROUTE.agentStop, { method: "POST", body: JSON.stringify(input) });
}

// ============================================================================
// Personas
// ============================================================================

export async function listPersonas(): Promise<Persona[]> {
  return jfetch(ROUTE.personasList);
}

export async function getPersona(id: PersonaId): Promise<Persona> {
  return jfetch(ROUTE.personaGet(id));
}

// ============================================================================
// Calls
// ============================================================================

export async function postTranscript(
  callId: string,
  transcript: Array<{ role: "user" | "assistant"; text: string; ts?: number }>
): Promise<void> {
  await jfetch(`/api/calls/${callId}/transcript`, {
    method: "POST",
    body: JSON.stringify({ transcript }),
  });
}

export async function summarizeCall(callId: string): Promise<CallSummary> {
  return jfetch(ROUTE.callSummarize(callId), { method: "POST" });
}

export async function getCall(callId: string): Promise<unknown> {
  return jfetch(ROUTE.callGet(callId));
}

// ============================================================================
// Clinic slots
// ============================================================================

export async function listSlots(args: {
  from: string;
  to: string;
  doctorId?: string;
}): Promise<Slot[]> {
  const params = new URLSearchParams();
  params.set("from", args.from);
  params.set("to", args.to);
  if (args.doctorId) params.set("doctorId", args.doctorId);
  const res = await jfetch<ListSlotsResponse>(`${ROUTE.slotsList}?${params.toString()}`);
  return res.slots;
}

export async function reserveSlot(input: ReserveSlotRequest): Promise<ReserveSlotResponse> {
  const res = await fetch(`${API_BASE}${ROUTE.slotsReserve}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await res.json()) as ReserveSlotResponse;
}

// ============================================================================
// Clinic bookings
// ============================================================================

export async function confirmBooking(
  input: ConfirmBookingRequest
): Promise<ConfirmBookingResponse> {
  return jfetch(ROUTE.bookingsConfirm, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listBookings(): Promise<Booking[]> {
  const res = await jfetch<ListBookingsResponse>(ROUTE.bookingsList);
  return res.bookings;
}

// ============================================================================
// Contacts
// ============================================================================

export async function listContacts(): Promise<Contact[]> {
  const res = await jfetch<ListContactsResponse>(ROUTE.contactsList);
  return res.contacts;
}

export async function getContactByPhone(phone: string): Promise<Contact | null> {
  const res = await jfetch<GetContactByPhoneResponse>(
    ROUTE.contactGetByPhone(phone)
  );
  return res.contact;
}

// ============================================================================
// Handoffs
// ============================================================================

export async function listHandoffs(): Promise<Handoff[]> {
  const res = await jfetch<ListHandoffsResponse>(ROUTE.handoffsList);
  return res.handoffs;
}

export async function resolveHandoff(handoffId: string): Promise<Handoff> {
  return jfetch(`/api/handoffs/${handoffId}/resolve`, { method: "POST" });
}

// ============================================================================
// Catalog
// ============================================================================

export async function listServices(): Promise<Service[]> {
  const res = await jfetch<ListServicesResponse>(ROUTE.servicesList);
  return res.services;
}

export async function listDoctors(): Promise<Doctor[]> {
  const res = await jfetch<ListDoctorsResponse>(ROUTE.doctorsList);
  return res.doctors;
}
