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
