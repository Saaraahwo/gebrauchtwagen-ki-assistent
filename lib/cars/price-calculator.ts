import type { Car, PriceAmpel } from './types';

export function calcPreisAmpel(car: Car): PriceAmpel {
  const age = new Date().getFullYear() - car.yearBuilt;
  const refs = {
    '118': 35000, '120': 38000, '218': 38000, '220': 42000,
    '318': 42000, '320': 45000, '330': 52000,
    '418': 48000, '420': 50000, '430': 56000,
    '518': 52000, '520': 58000, '530': 65000,
    '730': 90000, '740': 95000, '750': 105000,
    'M3': 85000, 'M4': 82000, 'M5': 110000,
    'X3': 52000, 'X5': 74000, 'X6': 80000
  };
  let base = 35000;
  for (const [k, v] of Object.entries(refs)) {
    if (car.name.includes(k)) { base = v; break; }
  }
  let exp = base;
  for (let y = 0; y < Math.min(age, 15); y++) {
    exp *= y === 0 ? 0.85 : y < 5 ? 0.90 : 0.92;
  }
  exp -= (car.km - age * 13000) * 0.06;
  if ((car.accidents || []).length) exp *= 0.88;
  if (car.owners > 2) exp *= 0.96;
  if (!car.maintenanceRecords) exp *= 0.93;
  exp = Math.max(Math.round(exp / 100) * 100, 1000);
  const diff = Math.round((car.price - exp) / exp * 100);
  let status: 'gut' | 'normal';
  let label: string;
  if (diff <= -12) { status = 'gut'; label = Math.abs(diff) + '% unter Marktwert'; }
  else if (diff >= 12) { status = 'normal'; label = 'Marktpreis – Verhandlungsspielraum möglich'; }
  else { status = 'normal'; label = 'Marktwert (±12%)'; }
  return { status, label, expected: exp, diff };
}
