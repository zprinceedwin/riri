"use client";

import { useEffect, useState } from "react";
import type { Handoff, HandoffReason } from "@riri/shared";
import { cn } from "@/lib/cn";
import { listHandoffs, resolveHandoff } from "@/lib/api";

interface PendingHandoffPanelProps {
  active?: boolean;
  pollMs?: number;
}

const REASON_LABEL: Record<HandoffReason, string> = {
  explicit_human: "Asked for human",
  low_comprehension: "Low comprehension",
  negative_sentiment: "Frustrated caller",
  out_of_scope: "Out of scope",
  complex_case: "Medical / complex",
};

const REASON_ACCENT: Record<HandoffReason, string> = {
  explicit_human: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  low_comprehension: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  negative_sentiment: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  out_of_scope: "border-ink-700 bg-ink-800/60 text-ink-200",
  complex_case: "border-violet-500/40 bg-violet-500/10 text-violet-200",
};

export function PendingHandoffPanel({ active = false, pollMs = 5000 }: PendingHandoffPanelProps) {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const list = await listHandoffs();
      setHandoffs(list);
    } catch (err) {
      console.warn("listHandoffs failed", err);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [active, pollMs]);

  const resolve = async (id: string) => {
    setBusyId(id);
    try {
      await resolveHandoff(id);
      setHandoffs((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.warn("resolve failed", err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              handoffs.length > 0 ? "bg-rose-400 animate-pulse" : "bg-ink-500"
            )}
          />
          <h3 className="text-sm font-semibold tracking-tight text-ink-100">
            Pending handoffs
          </h3>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
          {handoffs.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {handoffs.length === 0 ? (
          <p className="pt-4 text-center text-xs leading-relaxed text-ink-400">
            No escalations right now. Sofia is handling the queue.
          </p>
        ) : (
          handoffs.map((h) => (
            <div
              key={h.id}
              className="animate-scale-in rounded-lg border border-ink-700/60 bg-ink-900/60 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "pill text-[10px] tracking-[0.14em]",
                      REASON_ACCENT[h.reason]
                    )}
                  >
                    {REASON_LABEL[h.reason]}
                  </span>
                  <div className="mt-2 truncate font-mono text-[11px] text-ink-400">
                    {h.callId.slice(0, 12)}
                  </div>
                  {h.note && (
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-200">
                      {h.note}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busyId === h.id}
                  onClick={() => resolve(h.id)}
                  className="shrink-0 rounded-md border border-ink-700 bg-ink-900/60 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-ink-200 hover:border-ink-600 hover:bg-ink-800 disabled:opacity-50"
                >
                  {busyId === h.id ? "..." : "Resolved"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
