import type { Accident, Car, DamageInfo } from './types';
import { getSchadenFolgen } from './damage-db';

/** Per-accident detail surfaced to the BUYER (not just the seller) for transparency. */
export interface DamageDetail {
  type: string;
  date: string;
  repairCost?: number;
  damage: string;
  name: string;
  kurzfristig: string;
  langfristig: string;
  pruefung: string;
  kosten: string;
  adacTipp: string;
}

export function buildDamageDetails(accidents: Accident[] | undefined): DamageDetail[] {
  const folgen = getSchadenFolgen(accidents);
  if (!folgen) return [];
  const out: DamageDetail[] = [];
  for (const { acc, db } of folgen) {
    if (!db) continue;
    const info: DamageInfo = db;
    out.push({
      type: acc.type,
      date: acc.date,
      repairCost: acc.repairCost,
      damage: acc.damage,
      name: info.name,
      kurzfristig: info.kurzfristig,
      langfristig: info.langfristig,
      pruefung: info.pruefung,
      kosten: info.kosten,
      adacTipp: info.adacTipp,
    });
  }
  return out;
}

export interface WarrantyNote {
  text: string;
  source: string;
}

/**
 * Solution-oriented note for the buyer: future mechanical/electrical repair costs
 * can be hedged with a BMW used-car warranty. Surfaced when the car has an accident
 * history or an elevated future-cost profile (high mileage / older car).
 *
 * Honesty note: a warranty covers FUTURE defects, not the existing accident repair —
 * the wording deliberately scopes it to "Folgekosten an Mechanik und Elektrik".
 * Facts per BMW Premium Selection (bmw.de): 24 months, 100% parts + labour, no
 * deductible, transferable; eligible up to 12 years / 200,000 km; extendable via
 * BMW Repair Inclusive (Anschlussgarantie) to 10 years / 150,000 km.
 */
export function buildWarrantyNote(car: Car): WarrantyNote | null {
  const hasAccidents = (car.accidents || []).length > 0;
  const age = new Date().getFullYear() - car.yearBuilt;
  const highMileage = car.km > Math.max(1, age) * 15000;
  if (!hasAccidents && !highMileage && age < 6) return null;

  const eligible = age <= 12 && car.km <= 200000;
  let text =
    'Aber: Mögliche Folgekosten an Mechanik und Elektrik lassen sich absichern. ' +
    'Die BMW Gebrauchtwagengarantie (BMW Premium Selection) deckt 24 Monate alle ' +
    'mechanischen und elektronischen Teile zu 100 % ab – Material und Arbeit, ohne ' +
    'Selbstbeteiligung, und ist auf den nächsten Besitzer übertragbar. Verlängerbar ' +
    'über eine Anschlussgarantie (BMW Repair Inclusive) bis 10 Jahre bzw. 150.000 km.';
  if (!eligible) {
    text +=
      ' Hinweis: BMW Premium Selection gilt bis 12 Jahre / 200.000 km – die ' +
      'Förderfähigkeit dieses Fahrzeugs bitte beim BMW Partner prüfen.';
  }
  return { text, source: 'BMW Premium Selection Garantie (bmw.de)' };
}

/** Actionable checklist the buyer can take to the dealer / inspection. */
export function buildBuyerChecklist(car: Car): string[] {
  const out: string[] = [];
  const age = new Date().getFullYear() - car.yearBuilt;

  const folgen = getSchadenFolgen(car.accidents);
  if (folgen) {
    for (const { db } of folgen) {
      if (db) out.push(`${db.name}: ${db.pruefung}`);
    }
    out.push('Unabhängiges Gutachten (DEKRA/TÜV) zur Reparaturqualität einholen');
  }

  if (car.maintenanceRecords < age) {
    out.push('Vollständiges Scheckheft und Servicebelege zeigen lassen');
  }
  if (car.km > Math.max(1, age) * 13000) {
    out.push('Verschleißteile prüfen (Bremsen, Reifen, Steuerkette/Zahnriemen)');
  }
  if (car.owners > 3) {
    out.push('Grund für die häufigen Besitzerwechsel erfragen');
  }

  out.push('Probefahrt: Kaltstart, alle Gänge, Bremsen und Geradeauslauf testen');
  out.push('FIN und Fahrzeugpapiere mit dem Fahrzeug abgleichen');
  out.push('HU-Termin und letzten Servicestand schriftlich bestätigen lassen');
  return [...new Set(out)];
}
