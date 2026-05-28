import { describe, it, expect } from 'vitest';
import { runRulesEngine } from './rules-engine';
import type { Car } from './types';

const baseCar: Car = {
  id: 1, name: 'BMW 118i', price: 18000, km: 60000, yearBuilt: 2019,
  owners: 2, maintenanceRecords: 8, features: [], accidents: [],
};

describe('runRulesEngine', () => {
  it('flags too many owners as red', () => {
    const f = runRulesEngine({ ...baseCar, owners: 6 });
    expect(f.red.some(x => x.flag === 'BESITZERHISTORIE')).toBe(true);
  });

  it('flags missing service records as orange', () => {
    const f = runRulesEngine({ ...baseCar, maintenanceRecords: 0, yearBuilt: 2015 });
    expect(f.orange.some(x => x.flag === 'SERVICEHISTORIE')).toBe(true);
  });

  it('flags high mileage as orange', () => {
    const f = runRulesEngine({ ...baseCar, km: 300000, yearBuilt: 2020 });
    expect(f.orange.some(x => x.flag === 'LAUFLEISTUNG')).toBe(true);
  });

  it('flags old car as orange', () => {
    const f = runRulesEngine({ ...baseCar, yearBuilt: 2005 });
    expect(f.orange.some(x => x.flag === 'FAHRZEUGALTER')).toBe(true);
  });

  it('flags accidents as red', () => {
    const f = runRulesEngine({
      ...baseCar,
      accidents: [{ type: 'Heckschaden', damage: 'Lack', date: '2022-03' }],
    });
    expect(f.red.some(x => x.flag === 'TRANSPARENTE UNFALLHISTORIE')).toBe(true);
  });

  it('flags rosa headlights as red', () => {
    const f = runRulesEngine({ ...baseCar, features: ['rosa Scheinwerfer'] });
    expect(f.red.some(x => x.flag === 'INDIVIDUALISIERUNG')).toBe(true);
  });

  it('flags suspiciously cheap Porsche as red', () => {
    const f = runRulesEngine({ ...baseCar, name: 'Porsche Cayman', price: 15000 });
    expect(f.red.some(x => x.flag === 'ATTRAKTIVES ANGEBOT')).toBe(true);
  });

  it('returns green for a clean car', () => {
    const f = runRulesEngine(baseCar);
    expect(f.red.length).toBe(0);
    expect(f.green.some(x => x.flag === 'GUTER ZUSTAND')).toBe(true);
  });
});
