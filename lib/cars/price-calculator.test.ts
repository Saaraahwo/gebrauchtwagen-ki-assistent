import { describe, it, expect } from 'vitest';
import { calcPreisAmpel } from './price-calculator';
import type { Car } from './types';

const baseCar: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 1, maintenanceRecords: 10, features: [], accidents: [],
};

describe('calcPreisAmpel', () => {
  it('returns required fields', () => {
    const p = calcPreisAmpel(baseCar);
    expect(p).toHaveProperty('status');
    expect(p).toHaveProperty('label');
    expect(p).toHaveProperty('expected');
    expect(p).toHaveProperty('diff');
    expect(typeof p.expected).toBe('number');
  });

  it('expected value reflects accident penalty (×0.88)', () => {
    const clean = calcPreisAmpel(baseCar).expected;
    const wrecked = calcPreisAmpel({
      ...baseCar,
      accidents: [{ type: 'X', damage: 'Y', date: '2022' }],
    }).expected;
    expect(wrecked).toBeLessThan(clean);
  });

  it('flags significantly underpriced as "gut"', () => {
    const p = calcPreisAmpel({ ...baseCar, price: 5000 });
    expect(p.status).toBe('gut');
    expect(p.label).toMatch(/unter Marktwert/);
  });

  it('handles unknown model with default base 35000', () => {
    const p = calcPreisAmpel({ ...baseCar, name: 'Unknown Brand' });
    expect(p.expected).toBeGreaterThan(0);
  });
});
