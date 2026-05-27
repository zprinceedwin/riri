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
import { RtcTokenBuilder, RtcRole } from "agora-token";
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
  /** Opaque context the LLM proxy will receive on every /v1/chat/completions call. */
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

const AGORA_API_BASE = "https://api.agora.io/api/conversational-ai-agent/v2";

export async function startConvoAgent(params: StartAgentParams): Promise<StartedAgent> {
  const env = getEnv();
  const url = `${AGORA_API_BASE}/projects/${env.AGORA_APP_ID}/join`;

  const tts = buildTtsConfig(params.persona);

  // Pre-warm the greeting when we know the caller (Sofia returning-client flow).
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
      },
      llm: {
        url: env.LLM_PROXY_URL,
        // We don't pass an API key because the proxy is ours -- but Agora still
        // forwards the header to our endpoint, so set anything non-empty.
        api_key: "Riri-internal",
        system_messages: [
          {
            role: "system",
            content: params.persona.systemPrompt,
          },
        ],
        greeting_message: greetingMessage,
        failure_message: "Sorry, I missed that -- could you say it again?",
        max_history: 12,
        params: {
          model: env.OPENAI_LLM_MODEL,
          // We pass our context as an OpenAI passthrough field. Our proxy reads it.
          riri_context: params.llmContext,
        },
      },
      asr: {
        language: AGORA_DEFAULTS.asrLanguage,
        // Use Deepgram for ASR (lower latency than Azure for English).
        vendor: "deepgram",
        params: {
          key: env.DEEPGRAM_API_KEY,
          model: "nova-2-general",
        },
      },
      tts,
    },
  };

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
    throw new Error(`Agora start agent failed: ${res.status} ${text}`);
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

export async function stopConvoAgent(agentId: string): Promise<void> {
  const env = getEnv();
  const url = `${AGORA_API_BASE}/projects/${env.AGORA_APP_ID}/agents/${agentId}/leave`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: basicAuth() },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Agora stop agent failed: ${res.status} ${text}`);
  }
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
