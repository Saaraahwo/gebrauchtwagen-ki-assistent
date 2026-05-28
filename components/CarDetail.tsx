import type { Car } from '@/lib/cars/types';

interface CarDetailProps {
  car: Car;
}

export function CarDetail({ car }: CarDetailProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* LEFT: gallery placeholder + specs + features + accidents */}
      <div className="space-y-6">
        <div className="bg-white border border-bmw-gray-border aspect-[16/10] flex items-center justify-center text-bmw-gray-muted">
          {car.name}
        </div>

        <section className="bg-white border border-bmw-gray-border p-6">
          <h2 className="text-lg font-bold mb-4">Technische Daten</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-bmw-gray-muted">Kilometerstand</dt>
            <dd>{car.km.toLocaleString('de-DE')} km</dd>
            <dt className="text-bmw-gray-muted">Baujahr</dt>
            <dd>{car.yearBuilt}</dd>
            <dt className="text-bmw-gray-muted">Vorbesitzer</dt>
            <dd>{car.owners}</dd>
            <dt className="text-bmw-gray-muted">Service-Einträge</dt>
            <dd>{car.maintenanceRecords}</dd>
            {car.fuel && (
              <>
                <dt className="text-bmw-gray-muted">Kraftstoff</dt>
                <dd>{car.fuel}</dd>
              </>
            )}
            {car.transmission && (
              <>
                <dt className="text-bmw-gray-muted">Getriebe</dt>
                <dd>{car.transmission}</dd>
              </>
            )}
            {car.enginePower && (
              <>
                <dt className="text-bmw-gray-muted">Leistung</dt>
                <dd>{car.enginePower}</dd>
              </>
            )}
            {car.consumption && (
              <>
                <dt className="text-bmw-gray-muted">Verbrauch</dt>
                <dd>{car.consumption} l/100km</dd>
              </>
            )}
            {car.emission && (
              <>
                <dt className="text-bmw-gray-muted">Abgasnorm</dt>
                <dd>{car.emission}</dd>
              </>
            )}
            {car.color && (
              <>
                <dt className="text-bmw-gray-muted">Farbe</dt>
                <dd>{car.color}</dd>
              </>
            )}
          </dl>
        </section>

        {car.features.length > 0 && (
          <section className="bg-white border border-bmw-gray-border p-6">
            <h2 className="text-lg font-bold mb-4">Ausstattung</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm">
              {car.features.map(f => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
          </section>
        )}

        {car.accidents.length > 0 && (
          <section className="bg-white border border-bmw-gray-border p-6">
            <h2 className="text-lg font-bold mb-4">Schadenshistorie</h2>
            <ul className="space-y-3 text-sm">
              {car.accidents.map((a, i) => (
                <li key={i} className="border-l-4 border-flag-orange pl-3">
                  <div className="font-semibold">{a.type} · {a.date}</div>
                  <div className="text-bmw-gray-text">{a.damage}</div>
                  {a.repairCost && (
                    <div className="text-xs text-bmw-gray-muted">
                      Reparaturkosten: {a.repairCost.toLocaleString('de-DE')} €
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* RIGHT: price sidebar */}
      <aside className="space-y-4">
        <div className="bg-white border border-bmw-gray-border p-6 sticky top-4">
          <div className="text-3xl font-bold text-bmw-dark">
            {car.price.toLocaleString('de-DE')} €
          </div>
          <div className="text-xs text-bmw-gray-muted mt-1">
            {car.km.toLocaleString('de-DE')} km · EZ {car.yearBuilt}
          </div>
        </div>
      </aside>
    </div>
  );
}
