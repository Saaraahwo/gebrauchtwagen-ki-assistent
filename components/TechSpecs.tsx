import type { Car } from '@/lib/cars/types';

export function TechSpecs({ car }: { car: Car }) {
  if (!car.specs) return null;
  const s = car.specs;

  return (
    <section className="max-w-layout mx-auto px-6 py-8 border-t border-bmw-gray-border">
      <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest mb-5">
        Technische Daten
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SpecPanel title="Motor &amp; Antrieb">
          <SpecRow label="Motorart"       value={car.fuel ?? '—'} />
          <SpecRow label="Hubraum"        value={s.displacement} />
          <SpecRow label="Zylinder"       value={String(s.cylinders)} />
          <SpecRow label="Leistung"       value={`${s.powerPs} PS (${s.powerKw} kW)`} />
          <SpecRow label="Drehmoment"     value={`${s.torque} Nm`} />
          <SpecRow label="Getriebe"       value={car.transmission ?? '—'} />
          <SpecRow label="Antrieb"        value={car.drive ?? '—'} />
        </SpecPanel>

        <SpecPanel title="Fahrleistung">
          <SpecRow label="0–100 km/h"     value={`${s.acceleration} s`} />
          <SpecRow label="Höchstgeschw."  value={`${s.topSpeed} km/h`} />
        </SpecPanel>

        <SpecPanel title="Verbrauch &amp; Umwelt">
          <SpecRow label="Kombiniert"     value={s.consumptionCombined} />
          <SpecRow label="Innerorts"      value={s.consumptionCity} />
          <SpecRow label="Außerorts"      value={s.consumptionHighway} />
          <SpecRow label="CO₂ (komb.)"   value={`${s.co2} g/km`} />
          <SpecRow label="Schadstoffkl." value={car.emission ?? '—'} />
        </SpecPanel>

        <SpecPanel title="Maße &amp; Gewichte">
          <SpecRow label="Länge"          value={`${s.length.toLocaleString('de-DE')} mm`} />
          <SpecRow label="Breite"         value={`${s.width.toLocaleString('de-DE')} mm`} />
          <SpecRow label="Höhe"           value={`${s.height.toLocaleString('de-DE')} mm`} />
          <SpecRow label="Radstand"       value={`${s.wheelbase.toLocaleString('de-DE')} mm`} />
          <SpecRow label="Leergewicht"    value={`${s.weight.toLocaleString('de-DE')} kg`} />
          <SpecRow label="Zuladung"       value={`${s.payload} kg`} />
          <SpecRow
            label="Kofferraum"
            value={s.bootVolumeMax ? `${s.bootVolume}–${s.bootVolumeMax} l` : `${s.bootVolume} l`}
          />
          <SpecRow label="Tankinhalt"     value={`${s.tankVolume} l`} />
          <SpecRow label="Bereifung"      value={s.tireSize} />
          <SpecRow label="Türen / Sitze"  value={`${car.doors ?? '—'} / ${car.seats ?? '—'}`} />
        </SpecPanel>
      </div>
    </section>
  );
}

function SpecPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-bmw-gray-border">
      <div className="bg-bmw-gray-bg border-b border-bmw-gray-border px-4 py-2">
        <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest">
          {title}
        </div>
      </div>
      <table className="w-full text-xs">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-bmw-gray-border last:border-0">
      <td className="px-4 py-2 text-bmw-gray-muted w-36 align-top">{label}</td>
      <td className="px-4 py-2 font-medium text-bmw-dark">{value}</td>
    </tr>
  );
}
