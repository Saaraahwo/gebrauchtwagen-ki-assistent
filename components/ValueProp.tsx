const POINTS = [
  { t: 'Schäden, Historie & Kosten offen einsehbar', s: 'Direkt am Fahrzeug — nicht versteckt.' },
  { t: 'Jede Chat-Antwort mit Grundlage', s: 'Sie sehen, worauf sie beruht.' },
  { t: 'Regelbasiert statt erfunden', s: 'Angaben aus Fahrzeugdaten und Wissensdatenbank.' },
];

export function ValueProp() {
  return (
    <section className="bg-white border border-bmw-gray-border mb-6">
      <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest px-4 pt-3">So funktioniert's</div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-bmw-gray-border">
        {POINTS.map((p, i) => (
          <div key={i} className="p-4">
            <div className="text-xs font-semibold">{p.t}</div>
            <div className="text-[11px] text-bmw-gray-text mt-0.5">{p.s}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
