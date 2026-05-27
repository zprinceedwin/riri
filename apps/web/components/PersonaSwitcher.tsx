"use client";

import { cn } from "@/lib/cn";
import type { Persona, PersonaId } from "@riri/shared";

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
  // Stable persona order: Sofia first (V0 default), then Jordan + Mike as the
  // persona-engine demo alternates.
  const ordered = [...personas].sort((a, b) => order(a.id) - order(b.id));
  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-ink-700/60 bg-ink-900/40 p-1.5">
      {ordered.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p.id)}
            className={cn(
              "group flex flex-col items-start gap-1 rounded-lg px-2.5 py-2 text-left transition-all",
              active
                ? "bg-gradient-to-br from-gold-500/15 to-gold-700/10 ring-1 ring-gold-500/50"
                : "hover:bg-ink-800/60",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">{p.avatarEmoji ?? "👤"}</span>
              <span
                className={cn(
                  "text-xs font-semibold tracking-tight",
                  active ? "text-gold-300" : "text-ink-100"
                )}
              >
                {p.displayName}
              </span>
            </div>
            <span className="line-clamp-3 text-[10px] leading-snug text-ink-400">
              {p.shortDescription}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function order(id: PersonaId): number {
  if (id === "sofia") return 0;
  if (id === "jordan") return 1;
  return 2;
}
