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

export type ConnectionState = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "RECONNECTING" | "DISCONNECTING";

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
  onConnectionState: (cb: (s: ConnectionState, prev: ConnectionState) => void) => () => void;
  onError: (cb: (msg: string) => void) => () => void;
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
  const connectionListeners = new Set<(s: ConnectionState, prev: ConnectionState) => void>();
  const errorListeners = new Set<(msg: string) => void>();

  const decoder = new TextDecoder();

  client.on("connection-state-change", (cur, prev, reason) => {
    console.log(`[agora-web] Connection: ${prev} → ${cur} (${reason ?? "n/a"})`);
    connectionListeners.forEach((cb) => cb(cur as ConnectionState, prev as ConnectionState));

    if (cur === "DISCONNECTED" && prev === "CONNECTED") {
      const msg = `Connection lost: ${reason ?? "unknown"}`;
      console.warn(`[agora-web] ${msg}`);
      errorListeners.forEach((cb) => cb(msg));
    }
  });

  client.on("exception", (evt) => {
    console.warn("[agora-web] Exception:", evt.code, evt.msg);
    errorListeners.forEach((cb) => cb(`Agora exception: ${evt.msg}`));
  });

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

  client.on("stream-message", (_uid: number | string, payload: Uint8Array) => {
    let text: string;
    try {
      text = decoder.decode(payload);
    } catch {
      return;
    }
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

  client.on("stream-message-error", (_uid: number | string, streamId: number, code: number, missed: number, cached: number) => {
    console.warn(`[agora-web] Stream msg error: stream=${streamId} code=${code} missed=${missed} cached=${cached}`);
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
      connectionListeners.clear();
      errorListeners.clear();
    },
    async interrupt() {
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
    onConnectionState(cb) {
      connectionListeners.add(cb);
      return () => connectionListeners.delete(cb);
    },
    onError(cb) {
      errorListeners.add(cb);
      return () => errorListeners.delete(cb);
    },
  };
}
