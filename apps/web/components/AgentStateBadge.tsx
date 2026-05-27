"use client";

import { cn } from "@/lib/cn";
import type { AgentState } from "@/lib/agora";

const META: Record<AgentState, { label: string; dot: string; ring: string }> = {
  idle: { label: "Idle", dot: "bg-ink-400", ring: "ring-ink-500/30" },
  listening: { label: "Listening", dot: "bg-emerald-400 animate-pulse", ring: "ring-emerald-500/30" },
  thinking: { label: "Thinking", dot: "bg-sky-400 animate-pulse", ring: "ring-sky-500/30" },
  speaking: { label: "Speaking", dot: "bg-gold-400 animate-pulse", ring: "ring-gold-500/40" },
  silent: { label: "Silent", dot: "bg-ink-400", ring: "ring-ink-500/30" },
};

export function AgentStateBadge({ state }: { state: AgentState }) {
  const meta = META[state];
  return (
    <span
      className={cn(
        "pill border-ink-700 bg-ink-900/80 text-ink-100",
        `ring-1 ${meta.ring}`
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
