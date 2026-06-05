export function ConditionBar({ red, orange, green }: { red: number; orange: number; green: number }) {
  const total = Math.max(1, red + orange + green);
  const pct = (n: number) => (n / total) * 100;

  const segments = [
    { count: green,  gradient: 'linear-gradient(90deg,#059669,#34d399)' },
    { count: orange, gradient: 'linear-gradient(90deg,#d97706,#fbbf24)' },
    { count: red,    gradient: 'linear-gradient(90deg,#dc2626,#f87171)' },
  ].filter(s => s.count > 0);

  const tiles = [
    { count: green,  color: '#059669', bg: '#f0fdf4', label: 'Gut' },
    { count: orange, color: '#d97706', bg: '#fffbeb', label: 'Hinweise' },
    { count: red,    color: '#dc2626', bg: '#fef2f2', label: 'Kritisch' },
  ];

  return (
    <div>
      <div
        className="flex overflow-hidden"
        style={{ height: 18, borderRadius: 20, gap: 2, marginBottom: 12 }}
      >
        {segments.map((s, i) => (
          <div
            key={i}
            style={{
              width: `${pct(s.count)}%`,
              background: s.gradient,
              borderRadius:
                segments.length === 1
                  ? 20
                  : i === 0
                  ? '20px 0 0 20px'
                  : i === segments.length - 1
                  ? '0 20px 20px 0'
                  : 0,
              transition: 'width 0.6s ease',
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {tiles.map(t => (
          <div key={t.label} style={{ background: t.bg, borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div
              className="font-extrabold leading-none"
              style={{ color: t.color, fontSize: 18, fontVariantNumeric: 'tabular-nums' }}
            >
              {t.count}
            </div>
            <div style={{ color: t.color, fontSize: 9, marginTop: 2 }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
