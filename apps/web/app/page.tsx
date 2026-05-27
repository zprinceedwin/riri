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
import { DEMO_PROSPECT_ID, listPersonas, postTranscript } from "@/lib/api";
import type { AgentState, TranscriptTurn } from "@/lib/agora";

export default function Dashboard() {
  const router = useRouter();

  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState<PersonaId>("jordan");

  const [turns, setTurns] = useState<TranscriptItem[]>([]);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callId, setCallId] = useState<string | null>(null);
  const [sources] = useState<CitedSource[]>([]);

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
      // Ship the final transcript to the backend, then jump to summary.
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

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
      {/* Header */}
      <header className="flex items-center justify-between pb-6">
        <BrandMark />
        <div className="flex items-center gap-3">
          <AgentStateBadge state={agentState} />
          <span className="hidden text-[11px] uppercase tracking-[0.18em] text-ink-400 md:inline">
            {callStatus === "live" ? "Live call" : callStatus === "connecting" ? "Connecting" : "Ready"}
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="mb-6 flex flex-col items-start gap-2">
        <span className="pill border-gold-500/30 bg-gold-500/10 text-gold-300">
          Agora Hackathon Philippines 2026
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-50 md:text-4xl">
          Voice AI sales agents — with the personality of a real closer.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-300">
          Riri hires {activePersona?.displayName ?? "Jordan"} to handle the call. Real-time voice
          on Agora, photographic memory on Couchbase. Press the button, talk like a prospect, see
          how Riri works the deal.
        </p>
      </section>

      {/* Main grid */}
      <section className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[320px_1fr_300px]">
        {/* Left rail */}
        <aside className="glass-card flex flex-col">
          <div className="border-b border-ink-700/60 px-5 py-4">
            <h2 className="text-sm font-semibold tracking-tight text-ink-100">Pick your closer</h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-400">
              Same product, different soul. Switch the persona to fit the deal.
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
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              This call
            </h3>
            <dl className="mt-3 space-y-2 text-xs">
              <Row label="Prospect" value={DEMO_PROSPECT_ID ? "Pre-loaded" : "Seed-default"} />
              <Row label="Knowledge" value="Couchbase vector RAG" />
              <Row label="Voice" value="Agora Convo AI + ElevenLabs" />
            </dl>
          </div>

          <PushToTalk
            personaId={personaId}
            prospectId={DEMO_PROSPECT_ID}
            onTranscript={handleTranscript}
            onAgentState={setAgentState}
            onStatusChange={setCallStatus}
            onCallStarted={handleCallStarted}
            onCallEnded={handleCallEnded}
          />

          <div className="mt-auto border-t border-ink-700/60 px-5 py-3">
            <p className="text-[10px] leading-relaxed text-ink-500">
              Built on Agora, Couchbase, ElevenLabs, Deepgram, OpenAI. Shipped in 7 hours with TRAE
              and Cursor.
            </p>
          </div>
        </aside>

        {/* Center */}
        <section className="glass-card overflow-hidden">
          <TranscriptPanel turns={turns} />
        </section>

        {/* Right rail */}
        <aside className="glass-card hidden overflow-hidden lg:block">
          <SourcesPanel sources={sources} />
        </aside>
      </section>

      <footer className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-ink-500">
        Call ID: {callId ?? "—"}
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-right text-ink-200">{value}</dd>
    </div>
  );
}
