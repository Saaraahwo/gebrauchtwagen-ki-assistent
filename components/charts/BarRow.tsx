export function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-44 shrink-0 text-bmw-gray-text truncate" title={label}>{label}</div>
      <div className="flex-1 bg-bmw-gray-bg h-4 rounded-sm overflow-hidden">
        <div className="h-full bg-bmw-blue" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-6 text-right font-semibold text-bmw-dark">{count}</div>
    </div>
  );
}
