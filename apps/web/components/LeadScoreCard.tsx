"use client";

import type { CallSummary } from "@riri/shared";
import { cn } from "@/lib/cn";

interface LeadScoreCardProps {
  score: number;
  reasoning: string;
  objectionsHandled: CallSummary["objectionsHandled"];
}

export function LeadScoreCard({ score, reasoning, objectionsHandled }: LeadScoreCardProps) {
  const tier =
    score >= 75 ? "emerald" : score >= 40 ? "gold" : "rose";
  const ringClass =
    tier === "emerald"
      ? "ring-emerald-500/40 shadow-emerald-700/20"
      : tier === "gold"
        ? "ring-gold-500/50 shadow-gold-700/30"
        : "ring-rose-500/40 shadow-rose-700/20";
  const colorClass =
    tier === "emerald" ? "text-emerald-300" : tier === "gold" ? "text-gold-300" : "text-rose-300";

  const topObjections = [...objectionsHandled]
    .sort((a, b) => effectivenessWeight(b.effectiveness) - effectivenessWeight(a.effectiveness))
    .slice(0, 3);

  return (
    <div className={cn("glass-card relative overflow-hidden p-6 ring-2 shadow-2xl", ringClass)}>
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-8">
        <ScoreRing score={score} tier={tier} colorClass={colorClass} />
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Lead score
          </div>
          <h2 className={cn("mt-1 font-display text-3xl font-bold leading-tight", colorClass)}>
            {tierLabel(tier)}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-200">{reasoning}</p>
        </div>
      </div>

      {topObjections.length > 0 && (
        <div className="mt-6 border-t border-ink-700/60 pt-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Top objections handled
          </div>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {topObjections.map((o, i) => (
              <li
                key={i}
                className="rounded-lg border border-ink-700/60 bg-ink-900/60 p-3 text-xs"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-ink-500">
                    Objection {i + 1}
                  </span>
                  <EffPill level={o.effectiveness} />
                </div>
                <div className="font-medium text-ink-100">&ldquo;{truncate(o.objection, 60)}&rdquo;</div>
                <div className="mt-1 text-ink-400">{truncate(o.rebuttal, 80)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScoreRing({
  score,
  tier,
  colorClass,
}: {
  score: number;
  tier: "emerald" | "gold" | "rose";
  colorClass: string;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const dashStroke = (pct / 100) * 282.74;
  const dashColor =
    tier === "emerald" ? "#34d399" : tier === "gold" ? "#f4c352" : "#fb7185";
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={dashColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="282.74"
          strokeDashoffset={282.74 - dashStroke}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display text-4xl font-bold leading-none", colorClass)}>
          {Math.round(pct)}
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-500">
          / 100
        </span>
      </div>
    </div>
  );
}

function EffPill({ level }: { level: "weak" | "good" | "strong" }) {
  const map = {
    weak: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    good: "border-gold-500/30 bg-gold-500/10 text-gold-300",
    strong: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  } as const;
  return <span className={cn("pill text-[9px]", map[level])}>{level}</span>;
}

function tierLabel(tier: "emerald" | "gold" | "rose"): string {
  if (tier === "emerald") return "Hot lead";
  if (tier === "gold") return "Warm lead";
  return "Cold lead";
}

function effectivenessWeight(e: "weak" | "good" | "strong"): number {
  if (e === "strong") return 2;
  if (e === "good") return 1;
  return 0;
}

function truncate(text: string, n: number): string {
  return text.length <= n ? text : `${text.slice(0, n - 1)}…`;
}
