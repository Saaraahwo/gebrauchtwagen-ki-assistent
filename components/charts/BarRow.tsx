export function BarRow({
  label,
  count,
  max,
  gradient = 'linear-gradient(90deg,#1c69d4,#7c3aed)',
  dot,
  labelWidth = 80,
}: {
  label: string;
  count: number;
  max: number;
  gradient?: string;
  dot?: string;
  labelWidth?: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      {dot && (
        <div
          className="shrink-0"
          style={{ width: 8, height: 8, borderRadius: '50%', background: dot }}
        />
      )}
      <div
        className="shrink-0 truncate"
        style={{ width: labelWidth, fontSize: 11, color: '#64748b' }}
        title={label}
      >
        {label}
      </div>
      <div
        className="flex-1 overflow-hidden"
        style={{ background: '#f1f5f9', borderRadius: 6, height: 9 }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: gradient,
            borderRadius: 6,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <div
        className="text-right shrink-0"
        style={{ width: 18, fontSize: 11, fontWeight: 700, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}
      >
        {count}
      </div>
    </div>
  );
}
