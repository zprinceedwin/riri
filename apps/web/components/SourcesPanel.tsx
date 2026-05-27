"use client";

export interface CitedSource {
  id: string;
  title: string;
  source?: string;
}

export function SourcesPanel({ sources }: { sources: CitedSource[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-semibold tracking-tight text-ink-100">
            Photographic memory
          </h3>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
          {sources.length} cited
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {sources.length === 0 ? (
          <p className="pt-6 text-center text-sm text-ink-400">
            Sources retrieved from Couchbase will appear here as the agent speaks.
          </p>
        ) : (
          sources.map((s) => (
            <div
              key={s.id}
              className="animate-scale-in rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5"
            >
              <div className="text-xs font-semibold text-emerald-200">{s.title}</div>
              {s.source && (
                <div className="mt-0.5 text-[11px] text-ink-400">{s.source}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
