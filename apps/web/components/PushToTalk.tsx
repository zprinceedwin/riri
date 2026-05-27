"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonaId } from "@riri/shared";
import { cn } from "@/lib/cn";
import { joinCall, type AgentState, type CallHandle, type ConnectionState, type TranscriptTurn } from "@/lib/agora";
import { startAgent, stopAgent } from "@/lib/api";

export type CallStatus = "idle" | "connecting" | "live" | "reconnecting" | "ending" | "error";

const CONNECTION_TIMEOUT_MS = 20_000;

export interface PushToTalkProps {
  personaId: PersonaId;
  prospectId?: string;
  phone?: string;
  onTranscript: (t: TranscriptTurn) => void;
  onAgentState: (s: AgentState) => void;
  onStatusChange: (s: CallStatus) => void;
  onCallStarted: (info: { callId: string; agentId: string }) => void;
  onCallEnded: (info: { callId: string }) => void;
}

export function PushToTalk(props: PushToTalkProps) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const handleRef = useRef<CallHandle | null>(null);
  const callRef = useRef<{ callId: string; agentId: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    props.onStatusChange(status);
  }, [status, props]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setCallDuration(0);
    setStatus("connecting");

    const timeout = new Promise<never>((_, reject) => {
      timeoutRef.current = setTimeout(
        () => reject(new Error("Connection timed out — check your network and try again")),
        CONNECTION_TIMEOUT_MS
      );
    });

    try {
      const session = await Promise.race([
        startAgent({
          personaId: props.personaId,
          prospectId: props.prospectId,
          phone: props.phone,
        }),
        timeout,
      ]);

      const handle = await Promise.race([
        joinCall({
          appId: session.appId,
          channel: session.channel,
          uid: session.uid,
          rtcToken: session.rtcToken,
        }),
        timeout,
      ]);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      handle.onTranscript((t) => props.onTranscript(t));
      handle.onAgentState((s) => props.onAgentState(s));

      handle.onConnectionState((cur: ConnectionState) => {
        if (cur === "RECONNECTING") setStatus("reconnecting");
        else if (cur === "CONNECTED") setStatus("live");
      });

      handle.onError((msg) => {
        setError(msg);
      });

      handleRef.current = handle;
      callRef.current = { callId: session.callId, agentId: session.agentId };
      props.onCallStarted(callRef.current);
      setStatus("live");

      const startMs = Date.now();
      timerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startMs) / 1000));
      }, 1000);
    } catch (err) {
      clearTimers();
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setStatus("error");
    }
  }, [props, clearTimers]);

  const stop = useCallback(async () => {
    setStatus("ending");
    clearTimers();
    const call = callRef.current;
    try {
      await handleRef.current?.leave();
    } catch (err) {
      console.warn("leave call error", err);
    }
    handleRef.current = null;
    if (call) {
      try {
        await stopAgent({ agentId: call.agentId, callId: call.callId });
      } catch (err) {
        console.warn("stopAgent error", err);
      }
      props.onCallEnded({ callId: call.callId });
    }
    callRef.current = null;
    setCallDuration(0);
    setStatus("idle");
  }, [props, clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      handleRef.current?.leave().catch(() => undefined);
    };
  }, [clearTimers]);

  const interrupt = useCallback(async () => {
    await handleRef.current?.interrupt();
  }, []);

  const isLive = status === "live" || status === "reconnecting";
  const isBusy = status === "connecting" || status === "ending";

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-5 px-6 py-8">
      <button
        type="button"
        onClick={isLive ? stop : start}
        disabled={isBusy}
        className={cn(
          "relative grid h-32 w-32 place-items-center rounded-full text-base font-semibold tracking-tight transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gold-500/40",
          isLive
            ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-2xl shadow-rose-700/40 hover:scale-[1.02]"
            : isBusy
              ? "cursor-wait bg-ink-700 text-ink-300"
              : status === "error"
                ? "bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-2xl shadow-rose-700/40 hover:scale-[1.02]"
                : "bg-gradient-to-br from-gold-400 to-gold-600 text-ink-950 shadow-2xl shadow-gold-700/40 hover:scale-[1.02] animate-pulse-glow"
        )}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl leading-none">
            {isLive ? "■" : status === "error" ? "↻" : "🎤"}
          </span>
          <span className="text-xs uppercase tracking-[0.18em]">
            {isLive ? "End call" : isBusy ? "Working" : status === "error" ? "Retry" : "Start call"}
          </span>
        </div>
      </button>

      {isLive && callDuration > 0 && (
        <span className="text-sm font-mono tabular-nums text-ink-400">
          {fmtDuration(callDuration)}
        </span>
      )}

      {status === "reconnecting" && (
        <p className="text-xs text-amber-400 animate-pulse">Reconnecting...</p>
      )}

      {isLive && (
        <button
          type="button"
          onClick={interrupt}
          className="rounded-full border border-ink-700 bg-ink-900/60 px-4 py-1.5 text-xs font-medium text-ink-200 hover:border-ink-600 hover:bg-ink-800"
        >
          Interrupt agent
        </button>
      )}

      {error && (
        <p className="max-w-xs text-center text-xs leading-relaxed text-rose-400">{error}</p>
      )}
    </div>
  );
}
