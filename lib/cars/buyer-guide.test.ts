import { describe, it, expect } from 'vitest';
import { buildDamageDetails, buildBuyerChecklist } from './buyer-guide';
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
