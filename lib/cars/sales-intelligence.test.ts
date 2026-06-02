import { describe, it, expect } from 'vitest';
import {
  buildSalesIntelligence,
  buildStrengths,
  buildConcerns,
  buildCustomerQuestions,
} from './sales-intelligence';
import type { Car } from './types';

const base: Car = {
  id: 500, name: 'BMW 320i', price: 25000, km: 70000, yearBuilt: 2020,
  owners: 1, maintenanceRecords: 12, features: [], accidents: [],
  fuel: 'Benzin', transmission: 'Automatik', enginePower: '135 kW (184 PS)',
};

describe('buildStrengths', () => {
  it('names a powerful engine as a strength', () => {
    const s = buildStrengths({ ...base, id: 510, name: 'BMW M3', enginePower: '375 kW (510 PS)' });
    expect(s.some(x => x.includes('Motorisierung'))).toBe(true);
  });

  it('credits an unfallfrei, well-serviced car', () => {
    const s = buildStrengths(base);
    expect(s.some(x => x.includes('Unfallfrei'))).toBe(true);
    expect(s.some(x => x.includes('Servicehistorie'))).toBe(true);
  });
});

describe('buildConcerns', () => {
  it('frames an accident as a concern with mitigation', () => {
    const c = buildConcerns({
      ...base, id: 511,
      accidents: [{ type: 'Frontschaden', damage: 'Kühler', date: '2022' }],
    });
    expect(c.some(x => x.toLowerCase().includes('reparatur'))).toBe(true);
  });

  it('flags the 116i Sonderfarbe as something to position', () => {
    const c = buildConcerns({ ...base, id: 512, color: 'Lipstick Rosa (Sonderfarbe Individual)' });
    expect(c.some(x => x.includes('Sonderfarbe'))).toBe(true);
  });

  it('maps the M-model sport-use anomaly to readable text (no raw flag leaks)', () => {
    const c = buildConcerns({ ...base, id: 515, name: 'BMW M5', owners: 4, enginePower: '460 kW (625 PS)' });
    expect(c.some(x => x.toLowerCase().includes('sportliche nutzung'))).toBe(true);
    // No concern should be a raw ALL-CAPS flag token (catches any unmapped flag).
    expect(c.every(x => !/^[A-ZÄÖÜ_ ]{6,}$/.test(x))).toBe(true);
  });
});

describe('buildCustomerQuestions', () => {
  it('always includes the price and test-drive basics', () => {
    const q = buildCustomerQuestions({ ...base, id: 513 });
    expect(q).toContain('Ist der Preis verhandelbar?');
    expect(q).toContain('Kann ich eine Probefahrt machen?');
  });

  it('asks about resale for a special color', () => {
    const q = buildCustomerQuestions({ ...base, id: 514, color: 'Lipstick Rosa (Sonderfarbe Individual)' });
    expect(q.some(x => x.includes('Sonderfarbe'))).toBe(true);
  });
});

describe('buildSalesIntelligence', () => {
  it('returns all sections incl. equipment explanations', () => {
    const intel = buildSalesIntelligence({ ...base, subtitle: 'xDrive Luxury Line', features: ['Head-Up Display'] });
    expect(intel.strengths.length).toBeGreaterThan(0);
    expect(intel.concerns.length).toBeGreaterThan(0);
    expect(intel.customerQuestions.length).toBeGreaterThan(0);
    expect(intel.testDrive.legs.length).toBeGreaterThan(0);
    expect(intel.equipment.map(e => e.term)).toContain('Head-Up Display');
  });
});
