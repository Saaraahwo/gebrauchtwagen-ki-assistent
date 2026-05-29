import type { Car } from './types';
import { runRulesEngine } from './rules-engine';
import { detectAuffaelligkeiten } from './anomaly-detection';

export interface LabelCount {
  label: string;
  count: number;
}

export interface InventoryStats {
  total: number;
  avgPrice: number;
  avgKm: number;
  avgAge: number;
  priceBuckets: LabelCount[];
  fuelMix: LabelCount[];
  emissionMix: LabelCount[];
  condition: { red: number; orange: number; green: number };
  topAnomalies: { flag: string; title: string; count: number }[];
}

// Friendly, stable labels per anomaly flag (anomaly titles vary per car).
const ANOMALY_LABELS: Record<string, string> = {
  SCHEINWERFER_ZULASSUNG: 'Scheinwerfer-Zulassung',
  FAHRVERBOT_RISIKO: 'Umweltzone (Euro 5/4/3)',
  'SPORTLICHE NUTZUNGSHISTORIE': 'M-Modell – sportliche Nutzung',
  AUSTAUSCHMOTOR: 'Austauschmotor',
  'QUALITÄTSINVESTITION': 'Umfangreich repariert',
  'SERVICEHISTORIE ANFRAGEN': 'Servicehistorie offen',
  'ERFAHRENES FAHRZEUG': 'Hohe Laufleistung + Alter',
  FAHRZEUGALTER: 'Gereifte Technik (Alter)',
  SONDERFARBE: 'Sonderfarbe',
};

/** Classify a car by its worst rules-engine finding. */
export function carCondition(car: Car): 'red' | 'orange' | 'green' {
  const f = runRulesEngine(car);
  if (f.red.length > 0) return 'red';
  if (f.orange.length > 0) return 'orange';
  return 'green';
}

export function computeInventoryStats(cars: Car[]): InventoryStats {
  const total = cars.length;
  const year = new Date().getFullYear();
  const sum = (fn: (c: Car) => number) => cars.reduce((s, c) => s + fn(c), 0);
  const avg = (fn: (c: Car) => number) => (total ? Math.round(sum(fn) / total) : 0);

  const priceBuckets: LabelCount[] = [
    { label: 'unter 10.000 €', count: cars.filter(c => c.price < 10000).length },
    { label: '10–25.000 €', count: cars.filter(c => c.price >= 10000 && c.price < 25000).length },
    { label: '25–50.000 €', count: cars.filter(c => c.price >= 25000 && c.price < 50000).length },
    { label: 'über 50.000 €', count: cars.filter(c => c.price >= 50000).length },
  ];

  const mix = (fn: (c: Car) => string): LabelCount[] => {
    const m = new Map<string, number>();
    for (const c of cars) {
      const k = fn(c) || '—';
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const condition = { red: 0, orange: 0, green: 0 };
  for (const c of cars) condition[carCondition(c)]++;

  const anomCount = new Map<string, number>();
  for (const c of cars) {
    for (const a of detectAuffaelligkeiten(c)) {
      anomCount.set(a.flag, (anomCount.get(a.flag) ?? 0) + 1);
    }
  }
  const topAnomalies = [...anomCount.entries()]
    .map(([flag, count]) => ({ flag, title: ANOMALY_LABELS[flag] ?? flag, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    avgPrice: avg(c => c.price),
    avgKm: avg(c => c.km),
    avgAge: avg(c => year - c.yearBuilt),
    priceBuckets,
    fuelMix: mix(c => c.fuel || '—'),
    emissionMix: mix(c => c.emission || '—'),
    condition,
    topAnomalies,
  };
}
