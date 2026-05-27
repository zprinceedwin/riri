"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonaId } from "@riri/shared";
import { joinCall, type AgentState, type CallHandle, type TranscriptTurn } from "@/lib/agora";
import { postTranscript, startAgent, stopAgent } from "@/lib/api";
import { ClinicNav } from "@/components/clinic-landing/ClinicNav";
import { ClinicFooter } from "@/components/clinic-landing/ClinicFooter";

type VoiceStatus = "idle" | "connecting" | "live" | "ending" | "error";

const RIRI_PERSONA_ID: PersonaId = "sofia";

export default function VoiceClient() {
  const router = useRouter();
  const handleRef = useRef<CallHandle | null>(null);
  const callRef = useRef<{ callId: string; agentId: string } | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const isLive = status === "live";
  const isError = status === "error";
  const isBusy = status === "connecting" || status === "ending";

  useEffect(() => {
    if (!isLive) {
      setElapsedMs(0);
      startedAtRef.current = null;
      return;
    }
    startedAtRef.current = performance.now();
    const id = setInterval(() => {
      if (startedAtRef.current === null) return;
      setElapsedMs(performance.now() - startedAtRef.current);
    }, 500);
    return () => clearInterval(id);
  }, [isLive]);

  const statusLabel = useMemo(() => {
    if (status === "connecting") return "Connecting…";
    if (status === "ending") return "Wrapping up…";
    if (status === "error") return "Something interrupted the call.";
    if (status === "live") {
      switch (agentState) {
        case "speaking":
          return "Riri is speaking";
        case "thinking":
          return "Thinking…";
        case "listening":
          return "Listening to you";
        case "silent":
        case "idle":
        default:
          return "Live · Riri is on the line";
      }
    }
    return "Tap to call the demo line";
  }, [agentState, status]);

  const handleTranscript = useCallback((turn: TranscriptTurn) => {
    setTurns((prev) => {
      const last = prev[prev.length - 1];
      if (
        last &&
        last.role === turn.role &&
        last.turnId === turn.turnId &&
        !last.final
      ) {
        return [...prev.slice(0, -1), turn];
      }
      return [...prev, turn];
    });
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setTurns([]);
    setStatus("connecting");

    try {
      const session = await startAgent({ personaId: RIRI_PERSONA_ID });
      const handle = await joinCall({
        appId: session.appId,
        channel: session.channel,
        uid: session.uid,
        rtcToken: session.rtcToken,
      });

      handle.onTranscript(handleTranscript);
      handle.onAgentState(setAgentState);

      handleRef.current = handle;
      callRef.current = { callId: session.callId, agentId: session.agentId };
      setStatus("live");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to start call");
      setStatus("error");
    }
  }, [handleTranscript]);

  const stop = useCallback(async () => {
    setStatus("ending");
    const call = callRef.current;

    try {
      await handleRef.current?.leave();
    } catch (err) {
      console.warn("leave call error", err);
    }

    handleRef.current = null;
    callRef.current = null;
    setAgentState("idle");

    if (!call) {
      setStatus("idle");
      return;
    }

    try {
      await stopAgent({ agentId: call.agentId, callId: call.callId });
    } catch (err) {
      console.warn("stopAgent error", err);
    }

    const finalTurns = turns
      .filter((turn) => turn.final)
      .map((turn) => ({ role: turn.role, text: turn.text, ts: turn.ts }));

    if (finalTurns.length > 0) {
      try {
        await postTranscript(call.callId, finalTurns);
        router.push(`/summary/${call.callId}`);
        return;
      } catch (err) {
        console.warn("postTranscript failed", err);
      }
    }

    setStatus("idle");
  }, [router, turns]);

  const interrupt = useCallback(async () => {
    try {
      await handleRef.current?.interrupt();
    } catch (err) {
      console.warn("interrupt failed", err);
    }
  }, []);

  const toggleCall = useCallback(() => {
    if (isLive) {
      void stop();
      return;
    }
    if (!isBusy) {
      void start();
    }
  }, [isBusy, isLive, start, stop]);

  useEffect(() => {
    return () => {
      handleRef.current?.leave().catch(() => undefined);
    };
  }, []);

  return (
    <div
      className="relative min-h-screen bg-[#faf5ee] text-[#1a1410]"
      style={{ colorScheme: "light" }}
    >
      <ClinicNav />

      <main className="relative pt-32 pb-24 lg:pt-44 lg:pb-32">
        <BackdropMesh />

        <section className="relative mx-auto max-w-[920px] px-6 lg:px-10">
          <header className="text-center">
            <span
              className="inline-flex items-center gap-2 text-[11px] font-[500] uppercase tracking-[0.24em] text-[#7a3a26]"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              <span aria-hidden className="block h-px w-8 bg-[#7a3a26]/60" />
              Demo line · Live now
              <span aria-hidden className="block h-px w-8 bg-[#7a3a26]/60" />
            </span>
            <h1
              className="mx-auto mt-8 max-w-[18ch] text-[clamp(2.6rem,6vw,5.2rem)] font-[400] leading-[1.02] tracking-[-0.025em] text-[#1a1410]"
              style={{
                fontFamily: "var(--font-clinic-display)",
                fontVariationSettings: "'opsz' 144, 'SOFT' 50",
              }}
            >
              Talk to{" "}
              <em
                className="not-italic relative inline-block text-[#7a3a26]"
                style={{
                  fontFamily: "var(--font-clinic-display)",
                  fontStyle: "italic",
                  fontVariationSettings: "'opsz' 144, 'SOFT' 100",
                }}
              >
                Riri
              </em>
              .
            </h1>
            <p
              className="mx-auto mt-8 max-w-[52ch] text-[17px] leading-[1.6] text-[#1a1410]/72"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              Tap the call button to connect to a live Riri receptionist.
              Speak naturally — ask about a treatment, book a slot, throw a
              real objection at her. The summary appears the moment you hang up.
            </p>
          </header>

          <div className="relative mt-16 lg:mt-20">
            <CallCard
              status={status}
              agentState={agentState}
              elapsedMs={elapsedMs}
              statusLabel={statusLabel}
              isBusy={isBusy}
              isLive={isLive}
              isError={isError}
              onToggle={toggleCall}
              onInterrupt={interrupt}
            />
          </div>

          {error && (
            <p
              className="mx-auto mt-6 max-w-[44ch] text-center text-[13px] leading-[1.6] text-rose-700/80"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              {error}
            </p>
          )}

          {turns.length > 0 && <TranscriptPanel turns={turns} />}

          <p
            className="mx-auto mt-20 max-w-[42ch] text-center text-[11px] uppercase tracking-[0.24em] text-[#1a1410]/45"
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            Built on Agora, Supabase, ElevenLabs, and Deepgram.
          </p>
        </section>
      </main>

      <ClinicFooter />
    </div>
  );
}

function CallCard({
  status,
  agentState,
  elapsedMs,
  statusLabel,
  isBusy,
  isLive,
  isError,
  onToggle,
  onInterrupt,
}: {
  status: VoiceStatus;
  agentState: AgentState;
  elapsedMs: number;
  statusLabel: string;
  isBusy: boolean;
  isLive: boolean;
  isError: boolean;
  onToggle: () => void;
  onInterrupt: () => void;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[32px] border p-8 transition-all duration-500 sm:p-12",
        isLive
          ? "border-[#7a3a26]/40 bg-[#1a1410] text-[#faf5ee] shadow-[0_50px_120px_-50px_rgba(122,58,38,0.55)]"
          : isError
            ? "border-rose-700/40 bg-[#faf5ee] text-[#1a1410] shadow-[0_30px_80px_-50px_rgba(180,40,40,0.35)]"
            : "border-[#1a1410]/10 bg-[#faf5ee] text-[#1a1410] shadow-[0_30px_80px_-50px_rgba(26,20,16,0.4)]",
      ].join(" ")}
    >
      <CardBackdrop isLive={isLive} />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span
            className={[
              "text-[10px] font-[500] uppercase tracking-[0.26em]",
              isLive ? "text-[#c8a572]" : "text-[#7a3a26]",
            ].join(" ")}
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            Riri · Front desk
          </span>
          <StateBadge isLive={isLive} isBusy={isBusy} isError={isError} agentState={agentState} status={status} />
        </div>

        <div className="my-14 flex flex-col items-center text-center">
          {isLive ? (
            <Waveform agentState={agentState} />
          ) : (
            <CallVisual isError={isError} isBusy={isBusy} />
          )}

          <p
            className={[
              "mt-10 text-[15px] uppercase tracking-[0.24em]",
              isLive ? "text-[#faf5ee]/70" : isError ? "text-rose-700/75" : "text-[#1a1410]/55",
            ].join(" ")}
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            {statusLabel}
          </p>

          {isLive && <Timer ms={elapsedMs} />}
        </div>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={onToggle}
            disabled={isBusy}
            aria-label={isLive ? "End call with Riri" : "Start call with Riri"}
            className={[
              "group inline-flex items-center gap-3 rounded-full px-8 py-4 text-[14px] font-[500] outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-4",
              isLive
                ? "bg-[#faf5ee] text-[#1a1410] hover:gap-4 hover:bg-[#c8a572] focus-visible:ring-[#c8a572]/40 focus-visible:ring-offset-[#1a1410]"
                : isError
                  ? "bg-rose-900 text-[#faf5ee] hover:gap-4 hover:bg-rose-800 focus-visible:ring-rose-500/40 focus-visible:ring-offset-[#faf5ee]"
                  : "bg-[#1a1410] text-[#faf5ee] hover:gap-4 hover:bg-[#7a3a26] focus-visible:ring-[#7a3a26]/40 focus-visible:ring-offset-[#faf5ee]",
              isBusy ? "cursor-wait opacity-70" : "",
            ].join(" ")}
            style={{ fontFamily: "var(--font-clinic-body)" }}
          >
            <span>
              {isLive ? "End call" : isBusy ? (status === "connecting" ? "Connecting…" : "Wrapping up…") : isError ? "Try again" : "Start call"}
            </span>
            <span
              aria-hidden
              className={[
                "grid h-6 w-6 place-items-center rounded-full transition-transform duration-300 group-hover:rotate-45",
                isLive ? "bg-[#1a1410] text-[#faf5ee]" : "bg-[#faf5ee] text-[#1a1410]",
              ].join(" ")}
            >
              {isLive ? (
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden>
                  <rect x="4" y="4" width="8" height="8" rx="1.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 11L11 5M11 5H6.5M11 5V9.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </button>

          {isLive && (
            <button
              type="button"
              onClick={onInterrupt}
              className="group inline-flex items-center gap-2 rounded-full border border-[#faf5ee]/25 px-6 py-3.5 text-[13px] font-[500] text-[#faf5ee]/80 transition-all duration-300 hover:border-[#c8a572] hover:text-[#c8a572] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a572]/40 focus-visible:ring-offset-4 focus-visible:ring-offset-[#1a1410]"
              style={{ fontFamily: "var(--font-clinic-body)" }}
            >
              Interrupt
              <span
                aria-hidden
                className="block h-px w-6 bg-[#faf5ee]/30 transition-all duration-300 group-hover:w-10 group-hover:bg-[#c8a572]"
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CardBackdrop({ isLive }: { isLive: boolean }) {
  return (
    <div
      aria-hidden
      className={[
        "pointer-events-none absolute inset-0 transition-opacity duration-700",
        isLive
          ? "[background-image:radial-gradient(circle_at_30%_20%,rgba(122,58,38,0.4),transparent_55%),radial-gradient(circle_at_80%_85%,rgba(200,165,114,0.25),transparent_55%)]"
          : "[background-image:radial-gradient(circle_at_30%_20%,rgba(239,215,194,0.6),transparent_55%),radial-gradient(circle_at_85%_85%,rgba(200,165,114,0.22),transparent_55%)]",
      ].join(" ")}
    />
  );
}

function CallVisual({ isError, isBusy }: { isError: boolean; isBusy: boolean }) {
  return (
    <div className="relative grid h-32 w-32 place-items-center">
      {!isError && !isBusy && (
        <>
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-[#7a3a26]/30 motion-safe:[animation:call-ring_2.4s_ease-out_infinite]"
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-[#7a3a26]/20 motion-safe:[animation:call-ring_2.4s_ease-out_infinite_900ms]"
          />
        </>
      )}

      <span
        aria-hidden
        className={[
          "relative grid h-28 w-28 place-items-center rounded-full transition-colors duration-300",
          isError ? "bg-rose-900/15 text-rose-800" : "bg-[#7a3a26]/10 text-[#7a3a26]",
        ].join(" ")}
      >
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor" aria-hidden>
          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.28-.28.69-.37 1.05-.25 1.15.38 2.39.58 3.64.58.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.71 21 3 13.29 3 3.9c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.49.58 3.64.11.36.03.76-.25 1.05l-2.21 2.2Z" />
        </svg>
      </span>
    </div>
  );
}

function Waveform({ agentState }: { agentState: AgentState }) {
  const isActive = agentState === "speaking" || agentState === "listening";
  const bars = [10, 22, 36, 54, 70, 84, 70, 54, 36, 22, 10, 22, 36, 54, 70, 84, 70, 54, 36, 22, 10];
  return (
    <div aria-hidden className="flex items-end gap-[5px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className={[
            "block w-[3px] origin-bottom rounded-full bg-[#c8a572] transition-opacity",
            isActive ? "opacity-100 motion-safe:[animation:wave_1.1s_ease-in-out_infinite]" : "opacity-40",
          ].join(" ")}
          style={{
            height: `${h}px`,
            animationDelay: `${i * 55}ms`,
          }}
        />
      ))}
    </div>
  );
}

function StateBadge({
  isLive,
  isBusy,
  isError,
  agentState,
  status,
}: {
  isLive: boolean;
  isBusy: boolean;
  isError: boolean;
  agentState: AgentState;
  status: VoiceStatus;
}) {
  const tone = isLive
    ? agentState === "speaking"
      ? "text-[#c8a572]"
      : "text-[#faf5ee]"
    : isError
      ? "text-rose-700"
      : "text-[#1a1410]/65";

  const label = isLive
    ? agentState === "speaking"
      ? "Speaking"
      : agentState === "listening"
        ? "Listening"
        : agentState === "thinking"
          ? "Thinking"
          : "Live"
    : isError
      ? "Error"
      : isBusy
        ? status === "connecting"
          ? "Dialing"
          : "Wrapping"
        : "Ready";

  return (
    <span
      className={`inline-flex items-center gap-2 text-[10px] font-[500] uppercase tracking-[0.26em] ${tone}`}
      style={{ fontFamily: "var(--font-clinic-body)" }}
    >
      {isLive && (
        <span aria-hidden className="relative grid h-2.5 w-2.5 place-items-center">
          <span className="absolute h-2.5 w-2.5 rounded-full bg-current/30 motion-safe:animate-ping" />
          <span className="relative block h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}

function Timer({ ms }: { ms: number }) {
  const total = Math.floor(ms / 1000);
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return (
    <p
      className="mt-3 text-[13px] tabular-nums tracking-[0.18em] text-[#faf5ee]/55"
      style={{ fontFamily: "var(--font-clinic-body)" }}
    >
      {minutes}:{seconds}
    </p>
  );
}

function TranscriptPanel({ turns }: { turns: TranscriptTurn[] }) {
  const recent = turns.slice(-8);
  return (
    <section className="mt-16 lg:mt-20">
      <div className="text-center">
        <span
          className="inline-flex items-center gap-2 text-[11px] font-[500] uppercase tracking-[0.24em] text-[#7a3a26]"
          style={{ fontFamily: "var(--font-clinic-body)" }}
        >
          <span aria-hidden className="block h-px w-8 bg-[#7a3a26]/60" />
          Live transcript
          <span aria-hidden className="block h-px w-8 bg-[#7a3a26]/60" />
        </span>
      </div>

      <ol className="relative mx-auto mt-8 max-w-[640px] space-y-3">
        <span
          aria-hidden
          className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-[#1a1410]/15 to-transparent"
        />
        {recent.map((turn, idx) => (
          <TranscriptTurnRow key={`${turn.turnId}-${idx}`} index={idx} turn={turn} />
        ))}
      </ol>
    </section>
  );
}

function TranscriptTurnRow({ turn, index }: { turn: TranscriptTurn; index: number }) {
  const isRiri = turn.role === "assistant";
  return (
    <li
      className="relative grid grid-cols-[40px,1fr] items-start gap-5 motion-safe:opacity-0 motion-safe:[animation:fade-up_420ms_ease-out_forwards] motion-reduce:opacity-100"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        aria-hidden
        className={[
          "relative z-10 grid h-10 w-10 place-items-center rounded-full border text-[11px] font-[500] uppercase tracking-[0.18em]",
          isRiri
            ? "border-[#7a3a26] bg-[#7a3a26] text-[#faf5ee]"
            : "border-[#1a1410]/15 bg-[#faf5ee] text-[#1a1410]/65",
        ].join(" ")}
        style={{ fontFamily: "var(--font-clinic-body)" }}
      >
        {isRiri ? "R" : "C"}
      </span>

      <div
        className={[
          "rounded-2xl border px-5 py-4 shadow-[0_8px_30px_-20px_rgba(26,20,16,0.35)]",
          isRiri
            ? "border-[#7a3a26]/15 bg-[#faf5ee]"
            : "border-[#1a1410]/8 bg-[#faf5ee]/85 backdrop-blur-sm",
          !turn.final ? "opacity-65" : "",
        ].join(" ")}
      >
        <span
          className="text-[10px] font-[500] uppercase tracking-[0.22em] text-[#1a1410]/45"
          style={{ fontFamily: "var(--font-clinic-body)" }}
        >
          {isRiri ? "Riri" : "You"}
        </span>
        <p
          className="mt-1.5 text-[15px] leading-[1.55] text-[#1a1410]"
          style={{ fontFamily: "var(--font-clinic-body)" }}
        >
          {turn.text}
        </p>
      </div>
    </li>
  );
}

function BackdropMesh() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 [background-image:radial-gradient(ellipse_70%_45%_at_15%_15%,rgba(239,215,194,0.5),transparent_60%),radial-gradient(ellipse_50%_35%_at_85%_70%,rgba(200,165,114,0.28),transparent_60%)]"
    />
  );
}
