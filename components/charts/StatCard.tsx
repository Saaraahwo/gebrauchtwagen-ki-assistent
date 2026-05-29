export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-bmw-gray-border p-4 text-center">
      <div className="text-2xl font-bold text-bmw-dark">{value}</div>
      <div className="text-[10px] text-bmw-gray-muted uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
