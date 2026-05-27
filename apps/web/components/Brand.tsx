export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-gold-500 to-gold-700 shadow-lg shadow-gold-700/30">
        <span className="font-display text-base font-bold tracking-tight text-ink-950">S</span>
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-base font-semibold tracking-tight text-ink-50">
          Stratton
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-400">
          AI Sales Closer
        </span>
      </div>
    </div>
  );
}
