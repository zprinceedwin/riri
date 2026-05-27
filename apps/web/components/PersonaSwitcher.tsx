"use client";

import { cn } from "@/lib/cn";
import type { Persona, PersonaId } from "@stratton/shared";

export function PersonaSwitcher({
  personas,
  value,
  onChange,
  disabled,
}: {
  personas: Persona[];
  value: PersonaId;
  onChange: (id: PersonaId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-ink-700/60 bg-ink-900/40 p-1.5">
      {personas.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.id)}
            className={cn(
              "group flex flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition-all",
              active
                ? "bg-gradient-to-br from-gold-500/15 to-gold-700/10 ring-1 ring-gold-500/50"
                : "hover:bg-ink-800/60",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{p.avatarEmoji ?? "👤"}</span>
              <span
                className={cn(
                  "text-sm font-semibold tracking-tight",
                  active ? "text-gold-300" : "text-ink-100"
                )}
              >
                {p.displayName}
              </span>
            </div>
            <span className="line-clamp-2 text-[11px] leading-snug text-ink-400">
              {p.shortDescription}
            </span>
          </button>
        );
      })}
    </div>
  );
}
