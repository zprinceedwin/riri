/**
 * Browser-side Agora helpers: join an RTC channel, render the agent's audio,
 * publish the local mic, parse incoming stream-message transcripts.
 *
 * We intentionally keep this small. We do NOT depend on the optional
 * @agora-io/conversational-ai-api file from the docs (which is meant to be
 * copy-pasted into your project) -- instead we listen directly to the RTC
 * `stream-message` event, which is what the toolkit wraps under the hood.
 *
 * Transcript message format observed from Agora Convo AI:
 *   - JSON payload in the data frame
 *   - object: "user.transcription" | "assistant.transcription"
 *   - text, turn_id, stream_id, final
 *
 * Older / fragmented frames have a small binary header; we attempt JSON parse
 * first and skip frames that don't decode cleanly. Good enough for v0.
 */
"use client";

import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

if (typeof window !== "undefined") {
  AgoraRTC.setLogLevel(3);
  AgoraRTC.setParameter("ENABLE_AUDIO_PTS_METADATA", true);
}

export type AgentState = "idle" | "listening" | "thinking" | "speaking" | "silent";

export interface TranscriptTurn {
  role: "user" | "assistant";
  text: string;
  turnId: number;
  final: boolean;
  ts: number;
}

export interface CallHandle {
  client: IAgoraRTCClient;
  mic: IMicrophoneAudioTrack;
  leave: () => Promise<void>;
  interrupt: () => Promise<void>;
  onTranscript: (cb: (t: TranscriptTurn) => void) => () => void;
  onAgentState: (cb: (s: AgentState) => void) => () => void;
}

export interface JoinCallOptions {
  appId: string;
  channel: string;
  uid: number;
  rtcToken: string;
}

export async function joinCall(opts: JoinCallOptions): Promise<CallHandle> {
  const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

  const transcriptListeners = new Set<(t: TranscriptTurn) => void>();
  const stateListeners = new Set<(s: AgentState) => void>();

  const decoder = new TextDecoder();

  client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType) => {
    await client.subscribe(user, mediaType);
    if (mediaType === "audio") {
      user.audioTrack?.play();
    }
  });

  client.on("user-unpublished", (user: IAgoraRTCRemoteUser, mediaType) => {
    if (mediaType === "audio") {
      user.audioTrack?.stop();
    }
  });

  // Transcripts and agent state events come through stream-message.
  client.on("stream-message", (_uid: number | string, payload: Uint8Array) => {
    let text: string;
    try {
      text = decoder.decode(payload);
    } catch {
      return;
    }
    // Some frames have a small binary header; try to extract JSON between the
    // first '{' and last '}'.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return;
    const jsonStr = text.slice(start, end + 1);
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(jsonStr);
    } catch {
      return;
    }

    const obj = typeof msg.object === "string" ? msg.object : "";
    if (obj.endsWith("transcription") || obj === "user.transcription" || obj === "assistant.transcription") {
      const role = obj.startsWith("user") ? "user" : "assistant";
      const t: TranscriptTurn = {
        role,
        text: typeof msg.text === "string" ? msg.text : "",
        turnId: typeof msg.turn_id === "number" ? msg.turn_id : 0,
        final: Boolean(msg.final),
        ts: typeof msg.start_ms === "number" ? msg.start_ms : Date.now(),
      };
      if (t.text.length > 0) {
        transcriptListeners.forEach((cb) => cb(t));
      }
    }

    if (obj === "agent.state" || obj === "message.context" || typeof msg.state === "string") {
      const s = (msg.state as AgentState) ?? "idle";
      if (["idle", "listening", "thinking", "speaking", "silent"].includes(s)) {
        stateListeners.forEach((cb) => cb(s));
      }
    }
  });

  await client.join(opts.appId, opts.channel, opts.rtcToken, opts.uid);

  const mic = await AgoraRTC.createMicrophoneAudioTrack({
    encoderConfig: "speech_standard",
    AEC: true,
    AGC: true,
    ANS: true,
  });
  await client.publish([mic]);

  return {
    client,
    mic,
    async leave() {
      try {
        mic.stop();
        mic.close();
      } catch {
        /* ignore */
      }
      try {
        await client.leave();
      } catch {
        /* ignore */
      }
      transcriptListeners.clear();
      stateListeners.clear();
    },
    async interrupt() {
      // Send an interrupt control message over the stream. The Convo AI engine
      // listens for this and stops speaking immediately.
      try {
        const enc = new TextEncoder();
        const payload = enc.encode(JSON.stringify({ object: "user.interrupt", ts: Date.now() }));
        const streamId = await client.createDataStream({ ordered: true, reliable: true });
        client.sendStreamMessage(streamId, payload);
      } catch (err) {
        console.warn("interrupt failed", err);
      }
    },
    onTranscript(cb) {
      transcriptListeners.add(cb);
      return () => transcriptListeners.delete(cb);
    },
    onAgentState(cb) {
      stateListeners.add(cb);
      return () => stateListeners.delete(cb);
    },
  };
}
