"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Doctor, Slot } from "@riri/shared";
import { cn } from "@/lib/cn";
import { listDoctors, listSlots } from "@/lib/api";

interface CalendarGridProps {
  /** When set, the grid polls /api/slots every `pollMs`. */
  active?: boolean;
  pollMs?: number;
  /** Flash this slot id when it appears as booked (post-booking confirmation). */
  highlightSlotId?: string;
}

const HOUR_START = 9;
const HOUR_END = 18;
const SLOT_MIN = 30;

export function CalendarGrid({ active = false, pollMs = 3000, highlightSlotId }: CalendarGridProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    listDoctors()
      .then((d) => mounted.current && setDoctors(d))
      .catch(() => undefined);
  }, []);

  const refresh = useMemo(
    () => async () => {
      const from = startOfDay(new Date()).toISOString();
      const to = new Date(
        startOfDay(new Date()).getTime() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      try {
        const data = await listSlots({ from, to });
        if (!mounted.current) return;
        setSlots(data);
        setError(null);
      } catch (err) {
        if (!mounted.current) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [active, pollMs, refresh]);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const timeRows = useMemo(() => {
    const rows: Array<{ hour: number; minute: number }> = [];
    for (let h = HOUR_START; h < HOUR_END; h++) {
      for (const m of [0, SLOT_MIN]) rows.push({ hour: h, minute: m });
    }
    return rows;
  }, []);

  // Index slots by day-key + time-key for O(1) cell lookup.
  const index = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots) {
      const d = new Date(slot.startsAt);
      const key = `${dayKey(d)}|${timeKey(d)}`;
      const arr = map.get(key) ?? [];
      arr.push(slot);
      map.set(key, arr);
    }
    return map;
  }, [slots]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
          <h3 className="text-sm font-semibold tracking-tight text-ink-100">
            Live calendar
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-400">
          <Legend swatch="bg-ink-700/60 border-ink-600/60" label="Open" />
          <Legend swatch="bg-gold-500/30 border-gold-500/60 animate-pulse" label="Held" />
          <Legend swatch="bg-gold-500/80 border-gold-400" label="Booked" />
          {error && <span className="text-rose-400">(stale)</span>}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-ink-900/95 backdrop-blur">
            <tr>
              <th className="w-14 border-b border-ink-700/60 px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider text-ink-500">
                Time
              </th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className="border-b border-l border-ink-700/60 px-2 py-1.5 text-left text-[10px] font-semibold tracking-tight text-ink-200"
                >
                  <div>{d.toLocaleDateString("en-PH", { weekday: "short" })}</div>
                  <div className="text-ink-500">
                    {d.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeRows.map((row) => (
              <tr key={`${row.hour}-${row.minute}`}>
                <td className="border-b border-ink-700/40 px-2 py-1 text-[10px] text-ink-500">
                  {formatTime(row.hour, row.minute)}
                </td>
                {days.map((d) => {
                  const cellDate = new Date(d);
                  cellDate.setHours(row.hour, row.minute, 0, 0);
                  const key = `${dayKey(cellDate)}|${timeKey(cellDate)}`;
                  const cellSlots = index.get(key) ?? [];
                  return (
                    <td
                      key={key}
                      className="border-b border-l border-ink-700/30 p-1 align-top"
                    >
                      <CellStack
                        slots={cellSlots}
                        doctors={doctors}
                        highlightSlotId={highlightSlotId}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && slots.length === 0 && (
          <div className="px-5 py-12 text-center text-xs text-ink-500">
            Loading slots from Couchbase Capella...
          </div>
        )}
      </div>
    </div>
  );
}

function CellStack({
  slots,
  doctors,
  highlightSlotId,
}: {
  slots: Slot[];
  doctors: Doctor[];
  highlightSlotId?: string;
}) {
  if (slots.length === 0) return <div className="h-3.5" />;
  return (
    <div className="flex flex-col gap-0.5">
      {slots.map((s) => (
        <Cell
          key={s.id}
          slot={s}
          doctor={doctors.find((d) => d.id === s.doctorId)}
          highlight={s.id === highlightSlotId}
        />
      ))}
    </div>
  );
}

function Cell({
  slot,
  doctor,
  highlight,
}: {
  slot: Slot;
  doctor?: Doctor;
  highlight: boolean;
}) {
  const base =
    "block w-full rounded-sm border px-1 py-0.5 text-[9px] font-medium leading-tight transition-colors";
  const status =
    slot.status === "booked"
      ? "border-gold-400/70 bg-gold-500/70 text-ink-950"
      : slot.status === "held"
        ? "border-gold-500/60 bg-gold-500/20 text-gold-200 animate-pulse"
        : "border-ink-700/60 bg-ink-800/40 text-ink-400 hover:bg-ink-800/80 hover:text-ink-200";
  const highlightCls = highlight ? "ring-2 ring-gold-300 animate-scale-in" : "";
  const tooltip =
    slot.status === "booked"
      ? `Booked${doctor ? ` — ${doctor.name}` : ""}`
      : slot.status === "held"
        ? "On hold (5 min)"
        : `Available${doctor ? ` — ${doctor.name}` : ""}`;
  return (
    <div className={cn(base, status, highlightCls)} title={tooltip}>
      {doctor ? doctor.name.replace("Dr. ", "Dr.\u00a0").split(" ")[1] ?? doctor.name : slot.doctorId}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-sm border", swatch)} />
      {label}
    </span>
  );
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function timeKey(d: Date): string {
  return `${d.getHours()}:${d.getMinutes()}`;
}

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${h12}:${`${minute}`.padStart(2, "0")} ${suffix}`;
}
