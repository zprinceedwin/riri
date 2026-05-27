"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Booking, Contact, Service } from "@riri/shared";
import { listBookings, listContacts, listServices } from "@/lib/api";

interface Stats {
  callsToday: number;
  bookingsToday: number;
  pipelinePhpToday: number;
  conversionPct: number;
}

export function StatsStrip({ pollMs = 8000 }: { pollMs?: number }) {
  const [stats, setStats] = useState<Stats>({
    callsToday: 0,
    bookingsToday: 0,
    pipelinePhpToday: 0,
    conversionPct: 0,
  });

  useEffect(() => {
    const load = async () => {
      const [contacts, bookings, services] = await Promise.all([
        listContacts().catch<Contact[]>(() => []),
        listBookings().catch<Booking[]>(() => []),
        listServices().catch<Service[]>(() => []),
      ]);
      setStats(computeStats(contacts, bookings, services));
    };
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Calls today" value={stats.callsToday} format="int" accent="sky" />
      <Stat label="Bookings today" value={stats.bookingsToday} format="int" accent="gold" />
      <Stat
        label="Pipeline ₱ today"
        value={stats.pipelinePhpToday}
        format="php"
        accent="emerald"
      />
      <Stat
        label="Conversion"
        value={stats.conversionPct}
        format="pct"
        accent="violet"
      />
    </div>
  );
}

type Accent = "gold" | "sky" | "emerald" | "violet";

function Stat({
  label,
  value,
  format,
  accent,
}: {
  label: string;
  value: number;
  format: "int" | "php" | "pct";
  accent: Accent;
}) {
  const display = useAnimatedNumber(value);
  const formatted = useMemo(() => formatValue(display, format), [display, format]);
  const ring = ACCENT_TO_RING[accent];
  return (
    <div className={`glass-card flex flex-col gap-1 p-4 ring-1 ${ring}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span className="font-display text-3xl font-bold leading-none text-ink-50">
        {formatted}
      </span>
    </div>
  );
}

const ACCENT_TO_RING: Record<Accent, string> = {
  gold: "ring-gold-500/30",
  sky: "ring-sky-500/20",
  emerald: "ring-emerald-500/20",
  violet: "ring-violet-500/20",
};

function useAnimatedNumber(target: number, durationMs = 600): number {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  const startRef = useRef<number>(0);
  useEffect(() => {
    fromRef.current = val;
    startRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // We intentionally only react to `target` changes -- the rest is private state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);
  return val;
}

function formatValue(val: number, fmt: "int" | "php" | "pct"): string {
  if (fmt === "int") return Math.round(val).toString();
  if (fmt === "php") return `₱${Math.round(val).toLocaleString("en-PH")}`;
  return `${Math.round(val)}%`;
}

function computeStats(
  contacts: Contact[],
  bookings: Booking[],
  services: Service[]
): Stats {
  const dayStart = startOfDay(new Date()).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const inToday = (ts: number) => ts >= dayStart && ts < dayEnd;

  const callsToday = contacts.filter((c) => inToday(c.lastSeenAt)).length;
  const bookingsToday = bookings.filter((b) => {
    const ts = Date.parse(b.createdAt);
    return Number.isFinite(ts) && inToday(ts);
  });

  const svc = new Map(services.map((s) => [s.id, s]));
  const pipelinePhpToday = bookingsToday.reduce((acc, b) => {
    const s = svc.get(b.serviceId);
    return acc + (s ? s.priceCents / 100 : 0);
  }, 0);

  const conversionPct =
    callsToday > 0
      ? Math.min(100, Math.round((bookingsToday.length / callsToday) * 100))
      : 0;

  return {
    callsToday,
    bookingsToday: bookingsToday.length,
    pipelinePhpToday,
    conversionPct,
  };
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
