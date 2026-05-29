export function ConditionBar({ red, orange, green }: { red: number; orange: number; green: number }) {
  const total = Math.max(1, red + orange + green);
  const seg = (n: number, cls: string, label: string) =>
    n > 0 ? <div className={cls} style={{ width: `${(n / total) * 100}%` }} title={`${label}: ${n}`} /> : null;
  return (
    <div>
      <div className="flex h-5 rounded-sm overflow-hidden border border-bmw-gray-border">
        {seg(green, 'bg-flag-green', 'Gut')}
        {seg(orange, 'bg-flag-orange', 'Hinweise')}
        {seg(red, 'bg-flag-red', 'Wichtige Punkte')}
      </div>
      <div className="flex gap-4 mt-2 text-[11px] text-bmw-gray-text">
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-flag-green" />Gut: {green}</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-flag-orange" />Hinweise: {orange}</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-flag-red" />Wichtig: {red}</span>
      </div>
    </div>
  );
}
