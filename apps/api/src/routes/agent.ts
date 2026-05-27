/**
 * Agent control endpoints.
 *   POST /api/agent/start  -- start an Agora Convo AI agent in a fresh channel
 *   POST /api/agent/stop   -- stop the agent and free the channel
 *
 * The flow is:
 *   1. Browser hits /api/agent/start with { personaId, prospectId?, phone? }
 *   2. If a phone is supplied, we look up the known contact in Couchbase and
 *      inject a `knownContact` snippet into the llm context so Sofia greets
 *      them by name with their last visit.
 *   3. We mint two RTC tokens (agent + human) for a fresh channel.
 *   4. We POST to Agora's /v2/projects/:appid/join to spawn the agent.
 *   5. We register the call in our session store + Couchbase.
 *   6. We return the human's RTC token + channel + agentId + callId.
 */
import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  StartAgentRequestSchema,
  StopAgentRequestSchema,
  type StartAgentResponse,
  type StopAgentResponse,
} from "@riri/shared";
import { getPersona } from "@riri/personas";
import { getEnv } from "../env.js";
import { buildRtcToken, startConvoAgent, stopConvoAgent, queryAgentStatus } from "../lib/agora.js";
import { registerSession, unregisterAgent, getSessionByAgent, getAllSessions } from "../lib/store.js";
import { getContactByPhone, upsertCall } from "../lib/supabase.js";

export const agentRoutes = new Hono();

agentRoutes.post("/start", async (c) => {
  const body = await c.req.json();
  const parsed = StartAgentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", detail: parsed.error.message }, 400);
  }
  const { personaId, prospectId, phone } = parsed.data;
  const env = getEnv();

  const persona = getPersona(personaId);
  const channel = parsed.data.channel ?? `Riri-${nanoid(8)}`;
  const callId = nanoid(12);

  // Two distinct UIDs: agent uses 1001, human user uses 1002.
  const agentUid = 1001;
  const remoteUid = 1002;

  const agentRtcToken = buildRtcToken(channel, agentUid, 3600);
  const humanRtcToken = buildRtcToken(channel, remoteUid, 3600);

  // Sofia (clinic) lives in its own RAG namespace so the receptionist never
  // sees Voltline/Couchbase B2B docs. Jordan/Mike keep using prospect:* or
  // default namespaces as before.
  let namespace: string;
  if (personaId === "sofia") {
    namespace = env.CLINIC_DEMO_NAMESPACE;
  } else if (prospectId) {
    namespace = `prospect:${prospectId}`;
  } else {
    namespace = "default";
  }

  // Known-contact lookup -- only when the FE supplies a phone (e.g. "pre-loaded
  // prospect" toggle). Sofia uses this to greet returning clients by name. The
  // lookup is best-effort -- a Couchbase outage must NOT block the call.
  let knownContact: StartAgentResponse["knownContact"];
  if (phone) {
    try {
      const contact = await getContactByPhone(phone);
      if (contact) {
        knownContact = {
          id: contact.id,
          name: contact.name,
          totalCalls: contact.totalCalls,
          totalBookings: contact.totalBookings,
        };
      }
    } catch (err) {
      console.warn("[agent.start] contact lookup failed (non-fatal):", err);
    }
  }

  const started = await startConvoAgent({
    channel,
    agentRtcToken,
    agentUid: String(agentUid),
    remoteUid: String(remoteUid),
    persona,
    llmContext: {
      callId,
      personaId,
      namespace,
      prospectId,
      knownContact,
    },
  });

  const session = {
    callId,
    agentId: started.agentId,
    channel,
    personaId,
    namespace,
    prospectId,
    startedAt: Date.now(),
    knownContact,
  };
  registerSession(session);

  // Best-effort persistence to Couchbase. Don't block the call if it fails.
  upsertCall({
    callId,
    agentId: started.agentId,
    personaId,
    channel,
    namespace,
    prospectId,
    startedAt: session.startedAt,
    contactId: knownContact?.id,
  }).catch((err) => {
    console.error("[agent.start] Couchbase upsertCall failed (non-fatal):", err.message);
  });

  const res: StartAgentResponse = {
    agentId: started.agentId,
    callId,
    channel,
    rtcToken: humanRtcToken,
    uid: remoteUid,
    personaId,
    appId: env.AGORA_APP_ID,
    knownContact,
  };
  return c.json(res);
});

agentRoutes.post("/stop", async (c) => {
  const body = await c.req.json();
  const parsed = StopAgentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", detail: parsed.error.message }, 400);
  }
  const { agentId } = parsed.data;

  const session = getSessionByAgent(agentId);
  await stopConvoAgent(agentId);
  unregisterAgent(agentId);

  if (session) {
    const ended = {
      callId: session.callId,
      agentId: session.agentId,
      personaId: session.personaId,
      channel: session.channel,
      namespace: session.namespace,
      prospectId: session.prospectId,
      startedAt: session.startedAt,
      endedAt: Date.now(),
    };
    upsertCall(ended).catch((err) => {
      console.error("[agent.stop] Couchbase upsertCall failed (non-fatal):", err.message);
    });
  }

  const res: StopAgentResponse = {
    ok: true,
    callId: parsed.data.callId ?? session?.callId ?? "unknown",
  };
  return c.json(res);
});

agentRoutes.get("/status/:agentId", async (c) => {
  const agentId = c.req.param("agentId");
  try {
    const status = await queryAgentStatus(agentId);
    const session = getSessionByAgent(agentId);
    return c.json({
      ...status,
      callId: session?.callId,
      channel: session?.channel,
      personaId: session?.personaId,
      startedAt: session?.startedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return c.json({ error: "agent_query_failed", detail: msg }, 502);
  }
});

agentRoutes.get("/sessions", async (c) => {
  const sessions = getAllSessions();
  return c.json({
    count: sessions.length,
    sessions: sessions.map((s) => ({
      callId: s.callId,
      agentId: s.agentId,
      channel: s.channel,
      personaId: s.personaId,
      startedAt: s.startedAt,
      ageMs: Date.now() - s.startedAt,
    })),
  });
});
