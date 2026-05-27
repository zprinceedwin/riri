"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Persona, PersonaId } from "@riri/shared";
import { BrandMark } from "@/components/Brand";
import { AgentStateBadge } from "@/components/AgentStateBadge";
import { TranscriptPanel, type TranscriptItem } from "@/components/TranscriptPanel";
import { PersonaSwitcher } from "@/components/PersonaSwitcher";
import { SourcesPanel, type CitedSource } from "@/components/SourcesPanel";
import { PushToTalk, type CallStatus } from "@/components/PushToTalk";
import { CalendarGrid } from "@/components/CalendarGrid";
import { PipelineBoard } from "@/components/PipelineBoard";
import { StatsStrip } from "@/components/StatsStrip";
import { PendingHandoffPanel } from "@/components/PendingHandoffPanel";
import { DEMO_PROSPECT_ID, listPersonas, postTranscript } from "@/lib/api";
import type { AgentState, TranscriptTurn } from "@/lib/agora";

const DEFAULT_PERSONA: PersonaId = "sofia";
const PRELOADED_DEMO_PHONE = "+63-917-555-0101";

export default function Dashboard() {
  const router = useRouter();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState<PersonaId>(DEFAULT_PERSONA);

  const [turns, setTurns] = useState<TranscriptItem[]>([]);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callId, setCallId] = useState<string | null>(null);
  const [sources] = useState<CitedSource[]>([]);
  const [usePreloadedContact, setUsePreloadedContact] = useState(false);

  useEffect(() => {
    listPersonas()
      .then(setPersonas)
      .catch((err) => console.error("failed to load personas", err));
  }, []);

  const activePersona = useMemo(
    () => personas.find((p) => p.id === personaId),
    [personas, personaId]
  );

  const handleTranscript = useCallback((t: TranscriptTurn) => {
    setTurns((prev) => {
      // If this is a partial update for the same turn, replace the last entry.
      const last = prev[prev.length - 1];
      if (
        last &&
        last.role === t.role &&
        last.turnId === t.turnId &&
        last.partial
      ) {
        const next = prev.slice(0, -1);
        next.push({
          role: t.role,
          text: t.text,
          ts: t.ts,
          turnId: t.turnId,
          partial: !t.final,
        });
        return next;
      }
      return [
        ...prev,
        {
          role: t.role,
          text: t.text,
          ts: t.ts,
          turnId: t.turnId,
          partial: !t.final,
        },
      ];
    });
  }, []);

  const handleCallEnded = useCallback(
    async ({ callId: endedCallId }: { callId: string }) => {
      const finalTurns = turns
        .filter((t) => !t.partial)
        .map((t) => ({ role: t.role, text: t.text, ts: t.ts }));
      try {
        if (finalTurns.length > 0) {
          await postTranscript(endedCallId, finalTurns);
        }
      } catch (err) {
        console.warn("postTranscript failed", err);
      }
      router.push(`/summary/${endedCallId}`);
    },
    [router, turns]
  );

  const handleCallStarted = useCallback(({ callId: id }: { callId: string }) => {
    setCallId(id);
    setTurns([]);
  }, []);

  const isLive = callStatus === "live" || callStatus === "connecting";
  const isClinic = personaId === "sofia";
  const today = useMemo(() => {
    return new Date().toLocaleDateString("en-PH", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1480px] flex-col px-6 py-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-4">
          <BrandMark />
          <div className="hidden flex-col leading-none md:flex">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-500">
              Today
            </span>
            <span className="text-xs font-semibold text-ink-200">{today}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AgentStateBadge state={agentState} />
          <span className="hidden text-[11px] uppercase tracking-[0.18em] text-ink-400 md:inline">
            {callStatus === "live" ? "Live call" : callStatus === "connecting" ? "Connecting" : "Ready"}
          </span>
        </div>
      </header>

      <section className="mb-4">
        <StatsStrip pollMs={8000} />
      </section>

      {/* Main grid */}
      <section className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)_300px]">
        {/* Left rail */}
        <aside className="glass-card flex flex-col">
          <div className="border-b border-ink-700/60 px-5 py-4">
            <h2 className="text-sm font-semibold tracking-tight text-ink-100">
              {isClinic ? "Front desk" : "Pick your closer"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">
              {isClinic
                ? "Sofia handles inbound for Belle Aesthetic Manila. Switch to Jordan or Mike to demo the persona engine."
                : "Same product, different soul. Switch the persona to fit the deal."}
            </p>
          </div>
          <div className="p-3">
            <PersonaSwitcher
              personas={personas}
              value={personaId}
              onChange={setPersonaId}
              disabled={callStatus !== "idle"}
            />
          </div>

          <div className="border-t border-ink-700/60 px-5 py-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-ink-100">
                  Pre-loaded caller
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-ink-400">
                  Treat this call as Maria Cruz — Sofia greets her by name.
                </div>
              </div>
              <input
                type="checkbox"
                checked={usePreloadedContact}
                onChange={(e) => setUsePreloadedContact(e.target.checked)}
                disabled={callStatus !== "idle" || !isClinic}
                className="h-4 w-4 accent-gold-500"
              />
            </label>
          </div>

          <div className="border-t border-ink-700/60 px-5 py-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              This call
            </h3>
            <dl className="mt-3 space-y-2 text-xs">
              <Row
                label="Mode"
                value={isClinic ? "Inbound clinic concierge" : "Outbound sales"}
              />
              <Row
                label="Knowledge"
                value={isClinic ? "Couchbase: clinic KB" : "Couchbase vector RAG"}
              />
              <Row label="Voice" value="Agora + ElevenLabs + Deepgram" />
            </dl>
          </div>

          <PushToTalk
            personaId={personaId}
            prospectId={isClinic ? undefined : DEMO_PROSPECT_ID}
            phone={usePreloadedContact && isClinic ? PRELOADED_DEMO_PHONE : undefined}
            onTranscript={handleTranscript}
            onAgentState={setAgentState}
            onStatusChange={setCallStatus}
            onCallStarted={handleCallStarted}
            onCallEnded={handleCallEnded}
          />

          <div className="mt-auto border-t border-ink-700/60 px-5 py-3">
            <p className="text-[10px] leading-relaxed text-ink-500">
              {activePersona?.displayName ?? "Sofia"} runs on Agora Conversational
              AI, Couchbase Capella, ElevenLabs, Deepgram, and Resend. Built with
              TRAE + Cursor + Claude Code.
            </p>
          </div>
        </aside>

        {/* Center */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="glass-card h-[360px] overflow-hidden">
            <CalendarGrid active={isLive} pollMs={3000} />
          </div>
          <div className="glass-card h-[360px] overflow-hidden">
            <TranscriptPanel turns={turns} />
          </div>
        </section>

        {/* Right rail */}
        <aside className="hidden flex-col gap-4 lg:flex">
          <div className="glass-card h-[360px] overflow-hidden">
            <SourcesPanel sources={sources} />
          </div>
          <div className="glass-card h-[360px] overflow-hidden">
            <PendingHandoffPanel active={isLive} pollMs={5000} />
          </div>
        </aside>
      </section>

      <section className="mt-4">
        <PipelineBoard pollMs={7000} />
      </section>

      <footer className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-ink-500">
        Call ID: {callId ?? "—"} · {activePersona?.displayName ?? "Sofia"} ·
        Agora Hackathon Philippines 2026
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-right text-ink-200">{value}</dd>
    </div>
  );
}
