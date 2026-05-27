"use client";

import { useEffect, useMemo, useState } from "react";
import type { Booking, Contact, Service } from "@riri/shared";
import { cn } from "@/lib/cn";
import { listBookings, listContacts, listServices } from "@/lib/api";

type ColumnKey = "new" | "qualified" | "booked" | "completed";

interface PipelineCard {
  key: string;
  contactName: string;
  serviceLabel: string;
  valuePhp: number;
  /** ISO of last meaningful event, used for sorting + NEW pill. */
  ts: number;
  isNew: boolean;
}

const COLUMN_META: Record<ColumnKey, { label: string; accent: string }> = {
  new: { label: "New", accent: "border-sky-500/30 text-sky-200 bg-sky-500/10" },
  qualified: {
    label: "Qualified",
    accent: "border-violet-500/30 text-violet-200 bg-violet-500/10",
  },
  booked: {
    label: "Booked",
    accent: "border-gold-500/40 text-gold-200 bg-gold-500/10",
  },
  completed: {
    label: "Completed",
    accent: "border-emerald-500/30 text-emerald-200 bg-emerald-500/10",
  },
};

export function PipelineBoard({ pollMs = 7000 }: { pollMs?: number }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [cs, bs, ss] = await Promise.all([
          listContacts().catch(() => []),
          listBookings().catch(() => []),
          listServices().catch(() => []),
        ]);
        setContacts(cs);
        setBookings(bs);
        setServices(ss);
      } catch (err) {
        console.warn("pipeline load failed", err);
      }
    };
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  const columns = useMemo(() => {
    return buildColumns({ contacts, bookings, services });
  }, [contacts, bookings, services]);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          <h3 className="text-sm font-semibold tracking-tight text-ink-100">
            Pipeline
          </h3>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
          {contacts.length} contacts · {bookings.length} bookings
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(COLUMN_META) as ColumnKey[]).map((key) => (
          <Column key={key} colKey={key} cards={columns[key]} />
        ))}
      </div>
    </div>
  );
}

function Column({ colKey, cards }: { colKey: ColumnKey; cards: PipelineCard[] }) {
  const meta = COLUMN_META[colKey];
  const total = cards.reduce((acc, c) => acc + c.valuePhp, 0);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ink-700/60 bg-ink-900/50 p-3">
      <div className="flex items-center justify-between">
        <span className={cn("pill text-[10px] tracking-[0.18em]", meta.accent)}>
          {meta.label}
        </span>
        <span className="text-[11px] text-ink-400">
          {cards.length} · ₱{total.toLocaleString("en-PH")}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {cards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-700/50 px-3 py-4 text-center text-[11px] text-ink-500">
            Empty
          </div>
        ) : (
          cards.map((card) => <Card key={card.key} card={card} />)
        )}
      </div>
    </div>
  );
}

function Card({ card }: { card: PipelineCard }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-ink-900/70 px-3 py-2.5 transition-colors hover:border-ink-600",
        card.isNew
          ? "border-gold-500/40 shadow-lg shadow-gold-700/15 animate-scale-in"
          : "border-ink-700/60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-ink-100">
            {card.contactName}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-ink-400">
            {card.serviceLabel}
          </div>
        </div>
        {card.isNew && (
          <span className="pill border-gold-500/40 bg-gold-500/15 text-[9px] text-gold-300">
            NEW
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-ink-500">
          Value
        </span>
        <span className="text-xs font-semibold text-gold-300">
          ₱{card.valuePhp.toLocaleString("en-PH")}
        </span>
      </div>
    </div>
  );
}

function buildColumns(args: {
  contacts: Contact[];
  bookings: Booking[];
  services: Service[];
}): Record<ColumnKey, PipelineCard[]> {
  const { contacts, bookings, services } = args;
  const newestBookingTs = Math.max(
    ...bookings.map((b) => Date.parse(b.createdAt) || 0),
    0
  );
  const newestContactTs = Math.max(...contacts.map((c) => c.lastSeenAt), 0);

  const serviceById = new Map(services.map((s) => [s.id, s]));
  const out: Record<ColumnKey, PipelineCard[]> = {
    new: [],
    qualified: [],
    booked: [],
    completed: [],
  };

  // Bookings drive booked + completed columns.
  for (const b of bookings) {
    const svc = serviceById.get(b.serviceId);
    const valuePhp = svc ? svc.priceCents / 100 : 0;
    const card: PipelineCard = {
      key: `bk-${b.id}`,
      contactName: b.contact.name,
      serviceLabel: svc?.name ?? b.serviceId,
      valuePhp,
      ts: Date.parse(b.createdAt) || 0,
      isNew:
        b.status === "confirmed" &&
        Date.parse(b.createdAt) === newestBookingTs &&
        newestBookingTs > 0,
    };
    if (b.status === "completed") out.completed.push(card);
    else if (b.status === "confirmed") out.booked.push(card);
  }

  // Contacts without bookings go into New / Qualified by tag heuristic.
  for (const c of contacts) {
    if (c.totalBookings > 0) continue;
    const isQualified = c.tags.includes("consultation-pending") || c.tags.includes("returning");
    const card: PipelineCard = {
      key: `ct-${c.id}`,
      contactName: c.name ?? c.phone ?? "Unknown caller",
      serviceLabel: c.notes ?? c.tags.join(", "),
      valuePhp: 0,
      ts: c.lastSeenAt,
      isNew: c.lastSeenAt === newestContactTs && newestContactTs > 0,
    };
    if (isQualified) out.qualified.push(card);
    else out.new.push(card);
  }

  for (const key of Object.keys(out) as ColumnKey[]) {
    out[key].sort((a, b) => b.ts - a.ts);
  }
  return out;
}
