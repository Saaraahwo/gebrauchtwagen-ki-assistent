import { describe, it, expect } from 'vitest';
import { detectAuffaelligkeiten } from './anomaly-detection';
import type { Car } from './types';

const baseCar: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 1, maintenanceRecords: 10, features: [], accidents: [],
};

describe('detectAuffaelligkeiten', () => {
  it('flags laser headlights for type-approval check', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, features: ['Laser-Scheinwerfer'] });
    expect(a.some(x => x.flag === 'SCHEINWERFER_ZULASSUNG')).toBe(true);
  });

  it('flags xenon retrofit for type-approval check', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, features: ['Xenon-Nachrüstung'] });
    expect(a.some(x => x.flag === 'SCHEINWERFER_ZULASSUNG')).toBe(true);
  });

  it('does NOT flag standard LED headlights', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, features: ['LED-Scheinwerfer'] });
    expect(a.some(x => x.flag === 'SCHEINWERFER_ZULASSUNG')).toBe(false);
  });

  it('flags notable age (>=10) as gereifte Technik', () => {
    const old = new Date().getFullYear() - 10;
    const a = detectAuffaelligkeiten({ ...baseCar, yearBuilt: old, km: 90000 });
    expect(a.some(x => x.flag === 'FAHRZEUGALTER')).toBe(true);
  });

  it('does not double-flag age when already an experienced (old + high-km) vehicle', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, yearBuilt: 2010, km: 300000 });
    expect(a.some(x => x.flag === 'ERFAHRENES FAHRZEUG')).toBe(true);
    expect(a.some(x => x.flag === 'FAHRZEUGALTER')).toBe(false);
  });

  it('flags the BMW 116i special pink color', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, color: 'Lipstick Rosa (Sonderfarbe Individual)' });
    expect(a.some(x => x.flag === 'SONDERFARBE')).toBe(true);
  });

  it('flags Euro 5 emission risk', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, emission: 'Euro 5' });
    expect(a.some(x => x.flag === 'FAHRVERBOT_RISIKO')).toBe(true);
  });

  it('flags M-car with many owners', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, name: 'BMW M3', owners: 4 });
    expect(a.some(x => x.flag === 'SPORTLICHE NUTZUNGSHISTORIE')).toBe(true);
  });

  it('flags exchange motor', () => {
    const a = detectAuffaelligkeiten({
      ...baseCar,
      accidents: [{ type: 'Motorschaden', damage: 'Austauschmotor', damageKey: 'motor', date: '2023' }],
    });
    expect(a.some(x => x.flag === 'AUSTAUSCHMOTOR')).toBe(true);
  });

  it('flags high repair-to-price ratio', () => {
    const a = detectAuffaelligkeiten({
      ...baseCar, price: 10000,
      accidents: [{ type: 'X', damage: 'Y', repairCost: 5000, date: '2023' }],
    });
    expect(a.some(x => x.flag === 'QUALITÄTSINVESTITION')).toBe(true);
  });

  it('flags missing service history on old car', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, maintenanceRecords: 0, yearBuilt: 2018 });
    expect(a.some(x => x.flag === 'SERVICEHISTORIE ANFRAGEN')).toBe(true);
  });

  it('flags very old high-mileage car', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, yearBuilt: 2010, km: 300000 });
    expect(a.some(x => x.flag === 'ERFAHRENES FAHRZEUG')).toBe(true);
  });

  it('flags unusual color', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, color: 'rosa' });
    expect(a.some(x => x.flag === 'SONDERFARBE')).toBe(true);
  });

  it('returns empty array for clean car', () => {
    expect(detectAuffaelligkeiten(baseCar)).toEqual([]);
  });
});
