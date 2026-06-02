import { describe, it, expect } from 'vitest';
import { huStatus, serviceStatus, buildDisclosure, disclosureChecklist } from './disclosure';
import type { Car } from './types';

const NOW = new Date(2026, 4, 31); // 31 May 2026 (month is 0-based)

const baseCar: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 2, maintenanceRecords: 12, features: [], accidents: [],
  emission: 'Euro 6', hu: '03.2027',
};

describe('huStatus', () => {
  it('reports a future HU as valid', () => {
    const s = huStatus('03.2027', NOW);
    expect(s.state).toBe('gueltig');
    expect(s.label).toMatch(/gültig bis 03\.2027/);
  });
  it('reports a past HU as expired', () => {
    const s = huStatus('06.2025', NOW);
    expect(s.state).toBe('abgelaufen');
    expect(s.label).toMatch(/HU abgelaufen \(06\.2025\)/);
  });
  it('reports an HU within ~2 months as soon-due', () => {
    const s = huStatus('06.2026', NOW); // ~1 month out
    expect(s.state).toBe('baldFaellig');
  });
  it('handles missing / unparseable values', () => {
    expect(huStatus(undefined, NOW).state).toBe('unbekannt');
    expect(huStatus('demnächst', NOW).state).toBe('unbekannt');
  });
});

describe('serviceStatus', () => {
  it('flags zero service entries plainly', () => {
    const s = serviceStatus({ ...baseCar, maintenanceRecords: 0 }, NOW);
    expect(s.state).toBe('keine');
    expect(s.label).toBe('Keine Servicehistorie hinterlegt');
  });
  it('calls a well-serviced car complete', () => {
    const s = serviceStatus({ ...baseCar, yearBuilt: 2018, maintenanceRecords: 14 }, NOW);
    expect(s.state).toBe('vollstaendig');
  });
  it('calls a thin history partial', () => {
    const s = serviceStatus({ ...baseCar, yearBuilt: 2014, maintenanceRecords: 4 }, NOW);
    expect(s.state).toBe('teilweise');
  });
});

describe('buildDisclosure', () => {
  it('marks an accident-free car', () => {
    const d = buildDisclosure(baseCar, NOW);
    expect(d.accidentFree).toBe(true);
    expect(d.accidents).toEqual([]);
  });
  it('surfaces accident facts incl. repainted + repaired', () => {
    const d = buildDisclosure({
      ...baseCar,
      accidents: [{ type: 'Heckschaden', damage: 'Stoßfänger umlackiert', damageKey: 'heck', repairCost: 3800, date: '2021-09-03', repaired: true }],
    }, NOW);
    expect(d.accidentFree).toBe(false);
    expect(d.accidents[0].repainted).toBe(true);
    expect(d.accidents[0].repaired).toBe(true);
    expect(d.accidents[0].repairCost).toBe(3800);
  });
  it('defaults repaired to true when the field is absent', () => {
    const d = buildDisclosure({
      ...baseCar,
      accidents: [{ type: 'Lackschaden', damage: 'Kratzer', date: '2022' }],
    }, NOW);
    expect(d.accidents[0].repaired).toBe(true);
    expect(d.accidents[0].repainted).toBe(false);
  });
});

describe('disclosureChecklist', () => {
  it('marks all items ok for a clean, complete, valid-HU car', () => {
    const items = disclosureChecklist({ ...baseCar, maintenanceRecords: 14, hu: '03.2027', erstzulassung: '03.2018', accidents: [] }, NOW);
    expect(items.every(i => i.ok)).toBe(true);
  });
  it('flags an expired HU', () => {
    const items = disclosureChecklist({ ...baseCar, hu: '06.2025' }, NOW);
    expect(items.find(i => i.item === 'HU gültig')!.ok).toBe(false);
  });
  it('flags missing service history', () => {
    const items = disclosureChecklist({ ...baseCar, maintenanceRecords: 0 }, NOW);
    expect(items.find(i => i.item === 'Servicehistorie hinterlegt')!.ok).toBe(false);
  });
  it('flags an accident without a documented repair cost', () => {
    const items = disclosureChecklist({
      ...baseCar,
      accidents: [{ type: 'Lackschaden', damage: 'Kratzer', date: '2022' }],
    }, NOW);
    expect(items.find(i => i.item === 'Unfälle dokumentiert')!.ok).toBe(false);
  });
});
