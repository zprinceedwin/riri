/**
 * Agora helpers: RTC token builder and Conversational AI Engine REST client.
 *
 * Docs:
 *  - https://docs.agora.io/en/conversational-ai/develop/start-stop-agent
 *  - https://docs.agora.io/en/conversational-ai/develop/transcripts
 *
 * Key design:
 *  - We use the v2 REST API (POST /api/conversational-ai-agent/v2/projects/:appid/join)
 *  - The agent calls our own /v1/chat/completions as its LLM (via llm.url field)
 *  - We enable RTM data channel so the Web Toolkit can stream transcripts
 */
// `agora-token` is a CommonJS package; Node's ESM named-export detection
// misses some keys, so default-import the whole object and destructure.
import pkg from "agora-token";
const { RtcTokenBuilder, RtcRole } = pkg;
import { getEnv } from "../env.js";
import { AGORA_DEFAULTS, type Persona } from "@riri/shared";

function basicAuth(): string {
  const env = getEnv();
  const raw = `${env.AGORA_CUSTOMER_ID}:${env.AGORA_CUSTOMER_SECRET}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

export function buildRtcToken(channel: string, uid: number, expireSec = 3600): string {
  const env = getEnv();
  const privilegeExpire = Math.floor(Date.now() / 1000) + expireSec;
  return RtcTokenBuilder.buildTokenWithUid(
    env.AGORA_APP_ID,
    env.AGORA_APP_CERTIFICATE,
    channel,
    uid,
    RtcRole.PUBLISHER,
    expireSec,
    privilegeExpire
  );
}

export interface StartAgentParams {
  channel: string;
  agentRtcToken: string;
  agentUid: string;
  remoteUid: string;
  persona: Persona;
  llmContext: {
    callId: string;
    personaId: string;
    namespace: string;
    prospectId?: string;
    knownContact?: {
      id: string;
      name?: string;
      totalCalls: number;
      totalBookings: number;
    };
  };
}

export interface StartedAgent {
  agentId: string;
  status: string;
  createdAt: number;
}

export type AgentStatus = "IDLE" | "STARTING" | "RUNNING" | "STOPPING" | "STOPPED" | "FAILED";

export interface AgentStatusResponse {
  agentId: string;
  status: AgentStatus;
  name: string;
  startTs: number;
  stopTs: number;
}

const AGORA_API_BASE = "https://api.agora.io/api/conversational-ai-agent/v2";

export async function startConvoAgent(params: StartAgentParams): Promise<StartedAgent> {
  const env = getEnv();
  const url = `${AGORA_API_BASE}/projects/${env.AGORA_APP_ID}/join`;

  const tts = buildTtsConfig(params.persona);

  const known = params.llmContext.knownContact;
  const greetingMessage = known?.name
    ? `Hi ${firstName(known.name)}, welcome back to Belle Aesthetic Manila — this is Sofia. What can I help you with today?`
    : params.persona.greetingMessage;

  const body = {
    name: `Riri-${params.llmContext.callId}`,
    properties: {
      channel: params.channel,
      token: params.agentRtcToken,
      agent_rtc_uid: params.agentUid,
      remote_rtc_uids: [params.remoteUid],
      enable_string_uid: false,
      idle_timeout: AGORA_DEFAULTS.idleTimeoutSec,
      advanced_features: {
        enable_rtm: true,
      },
      parameters: {
        data_channel: "rtm",
        enable_metrics: true,
        enable_error_message: true,
        silence_config: {
          timeout_ms: 15_000,
          action: "speak",
          content: "I'm still here — take your time.",
        },
        farewell_config: {
          graceful_enabled: true,
          graceful_timeout_seconds: 10,
        },
      },
      turn_detection: {
        mode: "default",
        config: {
          start_of_speech: {
            mode: "vad",
            vad_config: {
              interrupt_duration_ms: 200,
              speaking_interrupt_duration_ms: 200,
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: "semantic",
            semantic_config: {
              silence_duration_ms: 480,
              max_wait_ms: 3000,
            },
          },
        },
      },
      llm: {
        url: env.LLM_PROXY_URL,
        api_key: "Riri-internal",
        system_messages: [
          {
            role: "system",
            content: params.persona.systemPrompt,
          },
        ],
        greeting_message: greetingMessage,
        greeting_configs: {
          mode: "single_every",
          delay_ms: 800,
          interruptable: true,
        },
        failure_message: "Sorry, I missed that -- could you say it again?",
        max_history: 12,
        params: {
          model: env.OPENAI_LLM_MODEL,
          riri_context: params.llmContext,
        },
      },
      asr: {
        language: AGORA_DEFAULTS.asrLanguage,
        vendor: "deepgram",
        params: {
          key: env.DEEPGRAM_API_KEY,
          model: "nova-2-general",
        },
      },
      tts,
    },
  };

  console.log(`[agora] Starting agent Riri-${params.llmContext.callId} in channel ${params.channel}`);
  console.log(`[agora] LLM URL: ${env.LLM_PROXY_URL}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[agora] Start agent failed: ${res.status}`, text);
    throw new Error(`Agora start agent failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    agent_id: string;
    create_ts: number;
    status: string;
  };

  console.log(`[agora] Agent started: id=${json.agent_id} status=${json.status}`);

  return {
    agentId: json.agent_id,
    status: json.status,
    createdAt: json.create_ts,
  };
}

export async function stopConvoAgent(agentId: string): Promise<void> {
  const env = getEnv();
  const url = `${AGORA_API_BASE}/projects/${env.AGORA_APP_ID}/agents/${agentId}/leave`;

  console.log(`[agora] Stopping agent ${agentId}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: basicAuth() },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    console.error(`[agora] Stop agent failed: ${res.status}`, text);
    throw new Error(`Agora stop agent failed: ${res.status} ${text}`);
  }

  console.log(`[agora] Agent ${agentId} stopped (status=${res.status})`);
}

export async function queryAgentStatus(agentId: string): Promise<AgentStatusResponse> {
  const env = getEnv();
  const url = `${AGORA_API_BASE}/projects/${env.AGORA_APP_ID}/agents/${agentId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: basicAuth() },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agora query agent failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    agent_id: string;
    status: string;
    name: string;
    start_ts: number;
    stop_ts: number;
  };

  return {
    agentId: json.agent_id,
    status: json.status as AgentStatus,
    name: json.name,
    startTs: json.start_ts,
    stopTs: json.stop_ts,
  };
}

export async function updateAgentConfig(
  agentId: string,
  updates: { token?: string; systemMessages?: Array<{ role: string; content: string }> }
): Promise<StartedAgent> {
  const env = getEnv();
  const url = `${AGORA_API_BASE}/projects/${env.AGORA_APP_ID}/agents/${agentId}/update`;

  const properties: Record<string, unknown> = {};
  if (updates.token) properties.token = updates.token;
  if (updates.systemMessages) {
    properties.llm = { system_messages: updates.systemMessages };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Agora update agent failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    agent_id: string;
    create_ts: number;
    status: string;
  };

  return {
    agentId: json.agent_id,
    status: json.status,
    createdAt: json.create_ts,
  };
}

function firstName(full: string): string {
  return full.split(" ")[0] ?? full;
}

function buildTtsConfig(persona: Persona) {
  const env = getEnv();
  // Resolve voice id from env so we don't bake keys into the persona JSON.
  const voiceId = (() => {
    switch (persona.id) {
      case "jordan":
        return env.ELEVENLABS_VOICE_ID_JORDAN;
      case "mike":
        return env.ELEVENLABS_VOICE_ID_MIKE;
      case "sofia":
        return env.ELEVENLABS_VOICE_ID_SOFIA;
      default:
        return persona.voice.voiceId;
    }
  })();

  return {
    vendor: "elevenlabs",
    params: {
      key: env.ELEVENLABS_API_KEY,
      voice_id: voiceId,
      model_id: "eleven_turbo_v2_5",
      stability: persona.voice.stability,
      similarity_boost: persona.voice.similarityBoost,
      speed: persona.voice.speed,
    },
  };
}
