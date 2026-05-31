import type { Car } from './types';

export interface HuStatus {
  label: string;
  state: 'gueltig' | 'abgelaufen' | 'baldFaellig' | 'unbekannt';
}

/** HU is valid through the end of its "MM.YYYY" month. */
export function huStatus(hu: string | undefined, now: Date = new Date()): HuStatus {
  if (!hu) return { label: 'HU: keine Angabe', state: 'unbekannt' };
  const m = hu.match(/^(\d{2})\.(\d{4})$/);
  if (!m) return { label: `HU: ${hu}`, state: 'unbekannt' };
  const month = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  // new Date(year, month, 0) → last day of `month` (month treated 1-based here).
  const due = new Date(year, month, 0, 23, 59, 59, 999);
  if (due < now) return { label: `HU abgelaufen (${hu})`, state: 'abgelaufen' };
  const soon = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
  if (due <= soon) return { label: `HU bald fällig (${hu})`, state: 'baldFaellig' };
  return { label: `HU gültig bis ${hu}`, state: 'gueltig' };
}

export interface ServiceStatus {
  label: string;
  state: 'vollstaendig' | 'teilweise' | 'keine';
}

export function serviceStatus(car: Car, now: Date = new Date()): ServiceStatus {
  if (car.maintenanceRecords === 0) {
    return { label: 'Keine Servicehistorie hinterlegt', state: 'keine' };
  }
  const age = Math.max(1, now.getFullYear() - car.yearBuilt);
  const expected = age * 2; // ~2 services per year
  if (car.maintenanceRecords >= expected * 0.8) {
    return { label: `Scheckheft vollständig (${car.maintenanceRecords} Einträge)`, state: 'vollstaendig' };
  }
  return { label: `Servicehistorie teilweise (${car.maintenanceRecords} Einträge)`, state: 'teilweise' };
}

export interface AccidentDisclosure {
  type: string;
  date: string;
  damage: string;
  repaired: boolean;
  repainted: boolean;
  repairCost?: number;
}

export interface Disclosure {
  accidentFree: boolean;
  accidents: AccidentDisclosure[];
  service: ServiceStatus;
  hu: HuStatus;
  owners: number;
  emission?: string;
}

export function buildDisclosure(car: Car, now: Date = new Date()): Disclosure {
  const accidents: AccidentDisclosure[] = (car.accidents ?? []).map(a => ({
    type: a.type,
    date: a.date,
    damage: a.damage,
    repaired: a.repaired ?? true,
    repainted: /umlackier|lackier/i.test(a.damage ?? ''),
    repairCost: a.repairCost,
  }));
  return {
    accidentFree: accidents.length === 0,
    accidents,
    service: serviceStatus(car, now),
    hu: huStatus(car.hu, now),
    owners: car.owners,
    emission: car.emission,
  };
}
