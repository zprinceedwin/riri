/**
 * In-memory fallback store for call sessions.
 * Used when Couchbase is unavailable or for transient session state that
 * does not need to survive a restart (e.g. agent <-> callId mapping).
 *
 * For hackathon scope, we keep this very simple. Persistent call records
 * are written through to Couchbase via lib/couchbase.ts.
 */

export interface KnownContactSnippet {
  id: string;
  name?: string;
  totalCalls: number;
  totalBookings: number;
}

export interface CallSession {
  callId: string;
  agentId: string;
  channel: string;
  personaId: string;
  namespace: string;
  prospectId?: string;
  knownContact?: KnownContactSnippet;
  startedAt: number;
  lastCitations?: string[];
  lastIntent?: string;
}

const sessionsByAgent = new Map<string, CallSession>();
const sessionsByCall = new Map<string, CallSession>();

export function registerSession(session: CallSession): void {
  sessionsByAgent.set(session.agentId, session);
  sessionsByCall.set(session.callId, session);
}

export function getSessionByAgent(agentId: string): CallSession | undefined {
  return sessionsByAgent.get(agentId);
}

export function getSessionByCall(callId: string): CallSession | undefined {
  return sessionsByCall.get(callId);
}

export function unregisterAgent(agentId: string): CallSession | undefined {
  const s = sessionsByAgent.get(agentId);
  if (s) {
    sessionsByAgent.delete(agentId);
    // Keep call mapping around so post-call summary lookups still work.
  }
  return s;
}

export function getAllSessions(): CallSession[] {
  return Array.from(sessionsByAgent.values());
}

const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

export function purgeStale(): number {
  const cutoff = Date.now() - MAX_SESSION_AGE_MS;
  let purged = 0;
  for (const [agentId, s] of sessionsByAgent) {
    if (s.startedAt < cutoff) {
      sessionsByAgent.delete(agentId);
      purged++;
    }
  }
  for (const [callId, s] of sessionsByCall) {
    if (s.startedAt < cutoff) {
      sessionsByCall.delete(callId);
      purged++;
    }
  }
  return purged;
}

setInterval(() => {
  const n = purgeStale();
  if (n > 0) console.log(`[store] Purged ${n} stale session entries`);
}, 10 * 60 * 1000);
