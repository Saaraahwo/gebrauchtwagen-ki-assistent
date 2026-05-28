import { describe, it, expect } from 'vitest';
import { generateDemoAnalysis } from './demo-analysis';
import type { Car, Findings } from '@/lib/cars/types';

const car: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 1, maintenanceRecords: 10, features: [], accidents: [],
};
const findings: Findings = { red: [], orange: [], green: [] };

describe('generateDemoAnalysis', () => {
  it('returns a non-empty string', () => {
    const a = generateDemoAnalysis(car, findings);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(100);
  });

  it('includes the demo-mode footer', () => {
    expect(generateDemoAnalysis(car, findings)).toContain('Demo-Modus');
  });

  it('includes accident analysis when accidents present', () => {
    const withAcc: Car = {
      ...car,
      accidents: [{ type: 'Heckschaden', damage: 'Lack', damageKey: 'heck', repairCost: 1500, date: '2022' }],
    };
    const a = generateDemoAnalysis(withAcc, findings);
    expect(a).toMatch(/UNFALLSCHÄDEN/i);
    expect(a).toContain('1.500');
  });
});
