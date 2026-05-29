import { describe, it, expect } from 'vitest';
import {
  buildSalesIntelligence,
  buildStrengths,
  buildConcerns,
  buildCustomerQuestions,
  buildTestDrive,
} from './sales-intelligence';
import type { Car } from './types';

const base: Car = {
  id: 500, name: 'BMW 320i', price: 25000, km: 70000, yearBuilt: 2020,
  owners: 1, maintenanceRecords: 12, features: [], accidents: [],
  fuel: 'Benzin', transmission: 'Automatik', enginePower: '135 kW (184 PS)',
};

describe('buildTestDrive', () => {
  it('performance tour for an M model', () => {
    const plan = buildTestDrive({ ...base, id: 501, name: 'BMW M5', enginePower: '460 kW (625 PS)' });
    expect(plan.headline).toBe('Performance zeigen');
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it('family tour for an X model', () => {
    const plan = buildTestDrive({ ...base, id: 502, name: 'BMW X5', subtitle: 'xDrive30d', enginePower: '210 kW (286 PS)' });
    expect(plan.headline).toBe('Familientauglichkeit');
  });

  it('open-air tour for a Cabriolet', () => {
    const plan = buildTestDrive({ ...base, id: 503, name: 'BMW 430i', subtitle: 'Cabriolet', enginePower: '180 kW (245 PS)' });
    expect(plan.headline).toBe('Offenes Fahrerlebnis');
  });

  it('efficiency tour for a plain diesel', () => {
    const plan = buildTestDrive({ ...base, id: 504, name: 'BMW 318d', fuel: 'Diesel', enginePower: '110 kW (150 PS)', features: [] });
    expect(plan.headline).toBe('Effizienz beweisen');
  });

  it('comfort tour when luxury features present', () => {
    const plan = buildTestDrive({ ...base, id: 505, name: 'BMW 520i', features: ['Lederausstattung', 'Head-Up Display'], fuel: 'Benzin' });
    expect(plan.headline).toBe('Komfort erleben');
  });

  it('falls back to an allround tour', () => {
    const plan = buildTestDrive({ ...base, id: 506, name: 'BMW 318i', fuel: 'Benzin', features: [], enginePower: '100 kW (136 PS)' });
    expect(plan.headline).toBe('Solide Allround-Probefahrt');
  });
});

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
  it('returns all four sections', () => {
    const intel = buildSalesIntelligence(base);
    expect(intel.strengths.length).toBeGreaterThan(0);
    expect(intel.concerns.length).toBeGreaterThan(0);
    expect(intel.customerQuestions.length).toBeGreaterThan(0);
    expect(intel.testDrive.steps.length).toBeGreaterThan(0);
  });
});
