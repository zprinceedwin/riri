/**
 * Tiny typed client for the Riri API. The interface contracts live in
 * @riri/shared so the FE and BE never drift.
 */
import {
  ROUTE,
  type Persona,
  type PersonaId,
  type StartAgentRequest,
  type StartAgentResponse,
  type StopAgentRequest,
  type StopAgentResponse,
  type CallSummary,
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

export async function startAgent(input: StartAgentRequest): Promise<StartAgentResponse> {
  return jfetch(ROUTE.agentStart, { method: "POST", body: JSON.stringify(input) });
}

export async function stopAgent(input: StopAgentRequest): Promise<StopAgentResponse> {
  return jfetch(ROUTE.agentStop, { method: "POST", body: JSON.stringify(input) });
}

export async function listPersonas(): Promise<Persona[]> {
  return jfetch(ROUTE.personasList);
}

export async function getPersona(id: PersonaId): Promise<Persona> {
  return jfetch(ROUTE.personaGet(id));
}

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
