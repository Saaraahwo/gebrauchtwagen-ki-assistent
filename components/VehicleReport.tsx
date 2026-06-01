import type { Car } from '@/lib/cars/types';
import { buildDisclosure } from '@/lib/cars/disclosure';
import { buildDamageDetails, buildBuyerChecklist } from '@/lib/cars/buyer-guide';
import { explainCarFeatures } from '@/lib/cars/feature-glossary';
import { calcPreisAmpel } from '@/lib/cars/price-calculator';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 break-inside-avoid">
      <h2 className="text-sm font-bold border-b border-bmw-gray-border pb-1 mb-2">{title}</h2>
      {children}
    </section>
  );
}

export function VehicleReport({ car }: { car: Car }) {
  const disclosure = buildDisclosure(car);
  const damageDetails = buildDamageDetails(car.accidents);
  const checklist = buildBuyerChecklist(car);
  const equipment = explainCarFeatures(car);
  const preis = calcPreisAmpel(car);
  const fahrzeugNr = `BMW-GW-${String(car.id).padStart(3, '0')}`;
  const stand = new Date().toLocaleDateString('de-DE');

  return (
    <article className="bg-white text-bmw-dark text-sm leading-relaxed">
      <header className="border-b-2 border-bmw-dark pb-3 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-bmw-gray-muted">BMW Niederlassung Braunschweig</div>
            <h1 className="text-xl font-bold mt-1">Fahrzeugbericht — {car.name}</h1>
            {car.subtitle && <div className="text-xs text-bmw-gray-text">{car.subtitle}</div>}
          </div>
          <div className="text-right text-[11px] text-bmw-gray-muted">
            <div>Fahrzeug-Nr. {fahrzeugNr}</div>
            <div>Stand: {stand}</div>
          </div>
        </div>
        <div className="mt-2 text-lg font-bold">
          {car.price.toLocaleString('de-DE')} €
          <span className="text-xs font-normal text-bmw-gray-text"> · Marktwert ca. {preis.expected.toLocaleString('de-DE')} € · {preis.label}</span>
        </div>
      </header>

      <Section title="Zustand & Historie">
        {disclosure.accidentFree ? (
          <p>Unfallfrei – keine Schäden dokumentiert.</p>
        ) : (
          <ul className="space-y-1">
            {disclosure.accidents.map((a, i) => (
              <li key={i}>
                <strong>{a.type}</strong> · {a.date} — {a.damage}
                {' · '}{a.repaired ? 'Fachgerecht repariert' : 'Nicht repariert'}
                {a.repainted ? ' · umlackiert' : ''}
                {typeof a.repairCost === 'number' ? ` · ${a.repairCost.toLocaleString('de-DE')} €` : ''}
              </li>
            ))}
          </ul>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
          <dt className="text-bmw-gray-muted">Servicehistorie</dt><dd>{disclosure.service.label}</dd>
          <dt className="text-bmw-gray-muted">Hauptuntersuchung</dt><dd>{disclosure.hu.label}</dd>
          <dt className="text-bmw-gray-muted">Vorbesitzer</dt><dd>{disclosure.owners}</dd>
          {disclosure.emission && (<><dt className="text-bmw-gray-muted">Abgasnorm</dt><dd>{disclosure.emission}</dd></>)}
        </dl>
      </Section>

      {damageDetails.length > 0 && (
        <Section title="Schäden im Detail">
          <div className="space-y-2">
            {damageDetails.map((d, i) => (
              <div key={i} className="border border-bmw-gray-border p-2 break-inside-avoid">
                <div className="font-semibold">
                  {d.name} · {d.date}
                  {typeof d.repairCost === 'number' ? ` · ${d.repairCost.toLocaleString('de-DE')} €` : ''}
                </div>
                <div className="text-xs mt-1"><strong>Jetzt prüfen:</strong> {d.pruefung}</div>
                <div className="text-xs"><strong>Langfristig:</strong> {d.langfristig}</div>
                <div className="text-xs"><strong>Typische Folgekosten:</strong> {d.kosten}</div>
                <div className="text-xs"><strong>ADAC-Tipp:</strong> {d.adacTipp}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Technische Daten">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-bmw-gray-muted">Kilometerstand</dt><dd>{car.km.toLocaleString('de-DE')} km</dd>
          {car.erstzulassung && (<><dt className="text-bmw-gray-muted">Erstzulassung</dt><dd>{car.erstzulassung}</dd></>)}
          <dt className="text-bmw-gray-muted">Baujahr</dt><dd>{car.yearBuilt}</dd>
          {car.fuel && (<><dt className="text-bmw-gray-muted">Kraftstoff</dt><dd>{car.fuel}</dd></>)}
          {car.transmission && (<><dt className="text-bmw-gray-muted">Getriebe</dt><dd>{car.transmission}</dd></>)}
          {car.enginePower && (<><dt className="text-bmw-gray-muted">Leistung</dt><dd>{car.enginePower}</dd></>)}
          {car.drive && (<><dt className="text-bmw-gray-muted">Antrieb</dt><dd>{car.drive}</dd></>)}
          {car.consumption && (<><dt className="text-bmw-gray-muted">Verbrauch</dt><dd>{car.consumption} l/100km</dd></>)}
          {car.color && (<><dt className="text-bmw-gray-muted">Farbe</dt><dd>{car.color}</dd></>)}
          {car.polster && (<><dt className="text-bmw-gray-muted">Polster</dt><dd>{car.polster}</dd></>)}
        </dl>
      </Section>

      {car.features.length > 0 && (
        <Section title="Ausstattung">
          <ul className="grid grid-cols-2 gap-y-0.5 text-xs">
            {car.features.map(f => <li key={f}>· {f}</li>)}
          </ul>
          {equipment.length > 0 && (
            <div className="mt-2 space-y-1">
              {equipment.map((e, i) => (
                <div key={i} className="text-xs"><strong>{e.term}:</strong> {e.description}</div>
              ))}
            </div>
          )}
        </Section>
      )}

      {checklist.length > 0 && (
        <Section title="Checkliste für den Kauf">
          <ul className="space-y-0.5 text-xs">
            {checklist.map((c, i) => <li key={i}>☐ {c}</li>)}
          </ul>
        </Section>
      )}

      <footer className="mt-4 pt-3 border-t border-bmw-gray-border text-[10px] text-bmw-gray-muted">
        Stand: {stand}. Fahrzeugfotos sind Symbolfotos. Alle Angaben ohne Gewähr.
      </footer>
    </article>
  );
}
