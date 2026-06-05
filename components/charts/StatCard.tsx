export function StatCard({
  label,
  value,
  iconBg,
  dotColor,
  shadowColor,
}: {
  label: string;
  value: string;
  iconBg: string;
  dotColor: string;
  shadowColor: string;
}) {
  return (
    <div
      className="bg-white"
      style={{ borderRadius: 14, padding: 16, boxShadow: `0 4px 20px ${shadowColor}` }}
    >
      <div
        className="flex items-center justify-center mb-2.5"
        style={{ width: 34, height: 34, background: iconBg, borderRadius: 9 }}
      >
        <div style={{ width: 14, height: 14, background: dotColor, borderRadius: 3 }} />
      </div>
      <div
        className="font-extrabold leading-none"
        style={{ color: '#1e293b', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </div>
      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>{label}</div>
    </div>
  );
}
