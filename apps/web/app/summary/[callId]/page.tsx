"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CallSummary } from "@riri/shared";
import { BrandMark } from "@/components/Brand";
import { LeadScoreCard } from "@/components/LeadScoreCard";
import { cn } from "@/lib/cn";
import { summarizeCall } from "@/lib/api";

export default function CallSummaryPage({ params }: { params: { callId: string } }) {
  const { callId } = params;
  const [summary, setSummary] = useState<CallSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    summarizeCall(callId)
      .then((s) => {
        if (!cancelled) setSummary(s);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [callId]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <BrandMark />
        <Link
          href="/"
          className="rounded-full border border-ink-700 bg-ink-900/60 px-4 py-1.5 text-xs font-medium text-ink-200 hover:border-ink-600 hover:bg-ink-800"
        >
          New call
        </Link>
      </header>

      <section className="mb-6 flex flex-col gap-2">
        <span className="pill border-gold-500/30 bg-gold-500/10 text-gold-300">
          Post-call analysis
        </span>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-50">
          Call summary
        </h1>
        <p className="font-mono text-xs text-ink-500">{callId}</p>
      </section>

      {loading && (
        <div className="glass-card animate-pulse p-12 text-center text-sm text-ink-300">
          Reading the transcript and scoring the deal...
        </div>
      )}

      {error && !loading && (
        <div className="glass-card border-rose-500/40 bg-rose-950/30 p-6 text-rose-200">
          <div className="text-sm font-semibold">Could not summarize this call.</div>
          <p className="mt-1 text-xs leading-relaxed text-rose-300/80">{error}</p>
          <p className="mt-3 text-xs text-rose-300/60">
            Hint: the transcript must be POSTed before summarize. If the call ended without any
            spoken turns, there is nothing to summarize.
          </p>
        </div>
      )}

      {summary && (
        <div className="flex flex-col gap-5">
          <LeadScoreCard
            score={summary.qualificationScore}
            reasoning={summary.qualificationReasoning}
            objectionsHandled={summary.objectionsHandled}
          />

          {summary.handoffRequired && (
            <div className="glass-card flex flex-col gap-2 border-rose-500/40 bg-rose-950/20 p-5 ring-1 ring-rose-500/30">
              <span className="pill border-rose-500/40 bg-rose-500/10 text-rose-200">
                Handoff queued
              </span>
              <p className="text-sm leading-relaxed text-rose-100">
                {summary.handoffReason ??
                  "Riri escalated this call. A coordinator should follow up within 5 minutes."}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="glass-card md:col-span-2">
              <SectionHeader title="Summary" />
              <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-ink-100">
                <p>{summary.summary}</p>
              </div>
              <div className="border-t border-ink-700/60 px-5 py-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Next steps
                </h4>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-100">
                  {summary.nextSteps.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-gold-500">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <LeadCard lead={summary.lead} intent={summary.intent} />

            <div className="glass-card md:col-span-3">
              <SectionHeader title="Objections handled" />
              <div className="divide-y divide-ink-700/40">
                {summary.objectionsHandled.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-ink-400">
                    No major objections in this call.
                  </p>
                ) : (
                  summary.objectionsHandled.map((o, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-ink-100">&ldquo;{o.objection}&rdquo;</div>
                        <EffectivenessBadge level={o.effectiveness} />
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-300">
                        {o.rebuttal}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {summary.citedSources.length > 0 && (
              <div className="glass-card md:col-span-3">
                <SectionHeader title={`Sources cited (${summary.citedSources.length})`} />
                <div className="flex flex-wrap gap-2 px-5 py-4">
                  {summary.citedSources.map((s, i) => (
                    <span
                      key={i}
                      className="pill border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-ink-700/60 px-5 py-3">
      <h3 className="text-sm font-semibold tracking-tight text-ink-100">{title}</h3>
    </div>
  );
}

function LeadCard({
  lead,
  intent,
}: {
  lead: CallSummary["lead"];
  intent: CallSummary["intent"];
}) {
  const rows: Array<[string, string | null]> = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Intent", intent],
    ["Requested service", lead.requestedService ?? null],
    ["Requested doctor", lead.requestedDoctor ?? null],
    ["Requested time", lead.requestedTimeWindow ?? null],
    ["Meeting booked", lead.meetingBookedAt],
    ["Budget signal", lead.budgetSignal],
    ["Timeline signal", lead.timelineSignal],
  ];
  return (
    <div className="glass-card">
      <SectionHeader title="Captured lead" />
      <dl className="grid grid-cols-1 gap-3 px-5 py-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <dt className="text-ink-400">{label}</dt>
            <dd
              className={cn(
                "text-right font-medium",
                value ? "text-ink-100" : "text-ink-600 italic"
              )}
            >
              {value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EffectivenessBadge({ level }: { level: "weak" | "good" | "strong" }) {
  const map = {
    weak: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    good: "border-gold-500/30 bg-gold-500/10 text-gold-300",
    strong: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  } as const;
  return <span className={cn("pill", map[level])}>{level}</span>;
}
