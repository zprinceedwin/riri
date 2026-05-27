"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonaId } from "@riri/shared";
import { cn } from "@/lib/cn";
import { joinCall, type AgentState, type CallHandle, type TranscriptTurn } from "@/lib/agora";
import { startAgent, stopAgent } from "@/lib/api";

export type CallStatus = "idle" | "connecting" | "live" | "ending" | "error";

export interface PushToTalkProps {
  personaId: PersonaId;
  prospectId?: string;
  /** Optional caller phone for contact lookup (used by Sofia for warm greetings). */
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
  const handleRef = useRef<CallHandle | null>(null);
  const callRef = useRef<{ callId: string; agentId: string } | null>(null);

  // Forward status changes upstream.
  useEffect(() => {
    props.onStatusChange(status);
  }, [status, props]);

  const start = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      const session = await startAgent({
        personaId: props.personaId,
        prospectId: props.prospectId,
        phone: props.phone,
      });

      const handle = await joinCall({
        appId: session.appId,
        channel: session.channel,
        uid: session.uid,
        rtcToken: session.rtcToken,
      });

      handle.onTranscript((t) => props.onTranscript(t));
      handle.onAgentState((s) => props.onAgentState(s));

      handleRef.current = handle;
      callRef.current = { callId: session.callId, agentId: session.agentId };
      props.onCallStarted(callRef.current);
      setStatus("live");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setStatus("error");
    }
  }, [props]);

  const stop = useCallback(async () => {
    setStatus("ending");
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
    setStatus("idle");
  }, [props]);

  // Defensive cleanup if the component unmounts mid-call
  useEffect(() => {
    return () => {
      handleRef.current?.leave().catch(() => undefined);
    };
  }, []);

  const interrupt = useCallback(async () => {
    await handleRef.current?.interrupt();
  }, []);

  const isLive = status === "live";
  const isBusy = status === "connecting" || status === "ending";

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
              : "bg-gradient-to-br from-gold-400 to-gold-600 text-ink-950 shadow-2xl shadow-gold-700/40 hover:scale-[1.02] animate-pulse-glow"
        )}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="text-3xl leading-none">{isLive ? "■" : "🎤"}</span>
          <span className="text-xs uppercase tracking-[0.18em]">
            {isLive ? "End call" : isBusy ? "Working" : "Start call"}
          </span>
        </div>
      </button>

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
