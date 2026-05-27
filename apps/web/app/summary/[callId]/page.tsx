"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CallSummary } from "@stratton/shared";
import { BrandMark } from "@/components/Brand";
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
        <span className="pill border-gold-500/30 bg-gold-500/10 text-gold-300">Post-call analysis</span>
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <ScoreCard score={summary.qualificationScore} reasoning={summary.qualificationReasoning} />

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

          <LeadCard lead={summary.lead} />

          <div className="glass-card md:col-span-2">
            <SectionHeader title="Objections handled" />
            <div className="divide-y divide-ink-700/40">
              {summary.objectionsHandled.length === 0 ? (
                <p className="px-5 py-4 text-sm text-ink-400">No major objections in this call.</p>
              ) : (
                summary.objectionsHandled.map((o, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-ink-100">"{o.objection}"</div>
                      <EffectivenessBadge level={o.effectiveness} />
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{o.rebuttal}</p>
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

function ScoreCard({ score, reasoning }: { score: number; reasoning: string }) {
  const color =
    score >= 75 ? "text-emerald-300" : score >= 50 ? "text-gold-400" : "text-rose-300";
  const ring =
    score >= 75
      ? "ring-emerald-500/40"
      : score >= 50
        ? "ring-gold-500/40"
        : "ring-rose-500/40";
  return (
    <div className={cn("glass-card flex flex-col items-center justify-center gap-3 py-8 ring-1", ring)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        Qualification
      </span>
      <div className={cn("font-display text-6xl font-bold leading-none", color)}>
        {score}
      </div>
      <span className="text-[11px] uppercase tracking-wider text-ink-500">/ 100</span>
      <p className="mx-6 mt-2 text-center text-xs leading-relaxed text-ink-300">{reasoning}</p>
    </div>
  );
}

function LeadCard({ lead }: { lead: CallSummary["lead"] }) {
  const rows: Array<[string, string | null]> = [
    ["Name", lead.name],
    ["Company", lead.company],
    ["Role", lead.role],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Budget signal", lead.budgetSignal],
    ["Timeline signal", lead.timelineSignal],
    ["Meeting booked", lead.meetingBookedAt],
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
