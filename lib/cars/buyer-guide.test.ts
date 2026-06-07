import { describe, it, expect } from 'vitest';
import { buildDamageDetails, buildBuyerChecklist, buildWarrantyNote } from './buyer-guide';
import type { Car } from './types';

const base: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 70000, yearBuilt: 2020,
  owners: 1, maintenanceRecords: 12, features: [], accidents: [],
};

describe('buildDamageDetails', () => {
  it('returns empty for a car with no accidents', () => {
    expect(buildDamageDetails(base.accidents)).toEqual([]);
  });

  it('surfaces inspection + long-term + cost detail per accident', () => {
    const details = buildDamageDetails([
      { type: 'Frontschaden', damage: 'Kühler beschädigt', damageKey: 'front', repairCost: 4200, date: '2022' },
    ]);
    expect(details).toHaveLength(1);
    const d = details[0];
    expect(d.name).toBeTruthy();
    expect(d.pruefung).toBeTruthy();
    expect(d.langfristig).toBeTruthy();
    expect(d.kosten).toBeTruthy();
    expect(d.adacTipp).toBeTruthy();
    expect(d.repairCost).toBe(4200);
  });
});

describe('buildBuyerChecklist', () => {
  it('always includes core inspection steps', () => {
    const list = buildBuyerChecklist(base);
    expect(list.some(x => x.includes('Probefahrt'))).toBe(true);
    expect(list.some(x => x.includes('FIN'))).toBe(true);
  });

  it('adds damage-specific checks and a Gutachten step for accident cars', () => {
    const list = buildBuyerChecklist({
      ...base,
      accidents: [{ type: 'Heckschaden', damage: 'Stoßstange', damageKey: 'heck', date: '2022' }],
    });
    expect(list.some(x => x.toLowerCase().includes('gutachten'))).toBe(true);
  });

  it('asks about frequent owner changes when owners are high', () => {
    const list = buildBuyerChecklist({ ...base, owners: 6 });
    expect(list.some(x => x.toLowerCase().includes('besitzerwechsel'))).toBe(true);
  });
});

describe('buildWarrantyNote', () => {
  it('returns null for a clean, low-mileage, newish car', () => {
    expect(buildWarrantyNote({ ...base, yearBuilt: new Date().getFullYear() - 2, km: 20000 })).toBeNull();
  });

  it('offers the BMW warranty as a solution for an accident car, with a source', () => {
    const note = buildWarrantyNote({
      ...base,
      accidents: [{ type: 'Frontschaden', damage: 'Kühler', damageKey: 'front', date: '2022' }],
    });
    expect(note).not.toBeNull();
    expect(note!.text).toMatch(/Garantie|Premium Selection/);
    expect(note!.source.toLowerCase()).toContain('bmw');
  });

  it('surfaces the note for high-mileage cars too', () => {
    const note = buildWarrantyNote({ ...base, yearBuilt: new Date().getFullYear() - 4, km: 140000 });
    expect(note).not.toBeNull();
  });

  it('adds an eligibility caveat when the car exceeds 12 years / 200k km', () => {
    const note = buildWarrantyNote({ ...base, yearBuilt: new Date().getFullYear() - 14, km: 230000 });
    expect(note).not.toBeNull();
    expect(note!.text).toMatch(/12 Jahre|200\.000 km/);
  });
});
