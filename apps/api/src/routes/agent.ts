/**
 * Agent control endpoints.
 *   POST /api/agent/start  -- start an Agora Convo AI agent in a fresh channel
 *   POST /api/agent/stop   -- stop the agent and free the channel
 *
 * The flow is:
 *   1. Browser hits /api/agent/start with { personaId, prospectId? }
 *   2. We mint two RTC tokens (one for the agent, one for the human user) for
 *      a fresh channel name.
 *   3. We POST to Agora's /v2/projects/:appid/join to spawn the agent.
 *   4. We register the call in our session store + Couchbase.
 *   5. We return the human's RTC token + channel + agentId + callId to the browser.
 *   6. The browser joins the channel with the Agora Web SDK and the agent is
 *      already there.
 */
import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  StartAgentRequestSchema,
  StopAgentRequestSchema,
  type StartAgentResponse,
  type StopAgentResponse,
} from "@stratton/shared";
import { getPersona } from "@stratton/personas";
import { getEnv } from "../env.js";
import { buildRtcToken, startConvoAgent, stopConvoAgent } from "../lib/agora.js";
import { registerSession, unregisterAgent, getSessionByAgent } from "../lib/store.js";
import { upsertCall } from "../lib/couchbase.js";

export const agentRoutes = new Hono();

agentRoutes.post("/start", async (c) => {
  const body = await c.req.json();
  const parsed = StartAgentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_request", detail: parsed.error.message }, 400);
  }
  const { personaId, prospectId } = parsed.data;
  const env = getEnv();

  const persona = getPersona(personaId);
  const channel = parsed.data.channel ?? `stratton-${nanoid(8)}`;
  const callId = nanoid(12);

  // Two distinct UIDs: agent uses 1001, human user uses 1002.
  const agentUid = 1001;
  const remoteUid = 1002;

  const agentRtcToken = buildRtcToken(channel, agentUid, 3600);
  const humanRtcToken = buildRtcToken(channel, remoteUid, 3600);

  // Namespace for RAG lookups -- 'default' uses all seeded company knowledge.
  // If a prospect is attached, we still let the LLM see company + prospect data.
  const namespace = prospectId ? `prospect:${prospectId}` : "default";

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
  };
  registerSession(session);

  // Best-effort persistence to Couchbase. Don't block the call if it fails.
  upsertCall({ ...session }).catch((err) => {
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
    const ended = { ...session, endedAt: Date.now() };
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
