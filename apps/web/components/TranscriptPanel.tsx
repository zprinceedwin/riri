"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface TranscriptItem {
  role: "user" | "assistant";
  text: string;
  ts: number;
  turnId?: number;
  partial?: boolean;
}

export function TranscriptPanel({ turns }: { turns: TranscriptItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
          <h3 className="text-sm font-semibold tracking-tight text-ink-100">Live transcript</h3>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
          {turns.length} turn{turns.length === 1 ? "" : "s"}
        </span>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4 scroll-smooth"
      >
        {turns.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="max-w-xs text-sm leading-relaxed text-ink-400">
              Press the call button to start. The conversation will appear here in real time.
            </p>
          </div>
        ) : (
          turns.map((t, i) => (
            <div
              key={`${t.turnId ?? i}-${t.role}-${i}`}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                t.role === "assistant"
                  ? "ml-0 border border-gold-500/20 bg-gold-500/10 text-gold-50"
                  : "ml-auto border border-ink-700/60 bg-ink-800/80 text-ink-100",
                t.partial && "opacity-70"
              )}
            >
              <div
                className={cn(
                  "mb-1 text-[10px] font-semibold uppercase tracking-wider",
                  t.role === "assistant" ? "text-gold-400" : "text-ink-400"
                )}
              >
                {t.role === "assistant" ? "Agent" : "Prospect"}
              </div>
              {t.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
