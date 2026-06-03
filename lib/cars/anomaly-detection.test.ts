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

describe('spec-triggered anomalies', () => {
  const baseCarWithSpecs = {
    id: 99, name: 'BMW Test', price: 20000, km: 50000, yearBuilt: 2020,
    owners: 1, maintenanceRecords: 5, features: [], accidents: [],
    transmission: '8-Gang', fuel: 'Benzin', emission: 'Euro 6d',
    consumption: '7,0 l/100km', drive: 'Heckantrieb',
  };

  it('flags HOHER_VERBRAUCH when consumptionCombined > 9.0', () => {
    const car = {
      ...baseCarWithSpecs,
      specs: {
        displacement: '4.4 ccm', cylinders: 8, powerKw: 300, powerPs: 408, torque: 600,
        acceleration: 5.0, topSpeed: 250,
        consumptionCity: '15,4 l/100km', consumptionHighway: '8,9 l/100km',
        consumptionCombined: '11,8 l/100km',
        co2: 170, length: 5000, width: 1900, height: 1500, wheelbase: 3000,
        weight: 2000, payload: 500, bootVolume: 500, tankVolume: 80, tireSize: '245/45 R19',
      },
    };
    const result = detectAuffaelligkeiten(car as any);
    expect(result.some(a => a.flag === 'HOHER_VERBRAUCH')).toBe(true);
  });

  it('does NOT flag HOHER_VERBRAUCH when consumptionCombined <= 9.0', () => {
    const car = {
      ...baseCarWithSpecs,
      specs: {
        displacement: '2.0 ccm', cylinders: 4, powerKw: 135, powerPs: 184, torque: 290,
        acceleration: 7.4, topSpeed: 210,
        consumptionCity: '8,8 l/100km', consumptionHighway: '6,4 l/100km',
        consumptionCombined: '7,4 l/100km',
        co2: 168, length: 4700, width: 1890, height: 1670, wheelbase: 2860,
        weight: 1740, payload: 560, bootVolume: 550, tankVolume: 67, tireSize: '245/45 R18',
      },
    };
    const result = detectAuffaelligkeiten(car as any);
    expect(result.some(a => a.flag === 'HOHER_VERBRAUCH')).toBe(false);
  });

  it('flags CO2_EMISSIONEN when co2 > 180', () => {
    const car = {
      ...baseCarWithSpecs,
      specs: {
        displacement: '4.4 ccm', cylinders: 8, powerKw: 300, powerPs: 408, torque: 600,
        acceleration: 5.0, topSpeed: 250,
        consumptionCity: '8,4 l/100km', consumptionHighway: '6,3 l/100km',
        consumptionCombined: '7,2 l/100km',
        co2: 190, length: 4900, width: 2000, height: 1740, wheelbase: 2970,
        weight: 2100, payload: 640, bootVolume: 650, tankVolume: 83, tireSize: '255/50 R20',
      },
    };
    const result = detectAuffaelligkeiten(car as any);
    expect(result.some(a => a.flag === 'CO2_EMISSIONEN')).toBe(true);
  });

  it('does NOT flag CO2_EMISSIONEN when co2 <= 180', () => {
    const car = {
      ...baseCarWithSpecs,
      specs: {
        displacement: '2.0 ccm', cylinders: 4, powerKw: 140, powerPs: 190, torque: 400,
        acceleration: 7.1, topSpeed: 235,
        consumptionCity: '6,0 l/100km', consumptionHighway: '4,4 l/100km',
        consumptionCombined: '5,1 l/100km',
        co2: 134, length: 4630, width: 1810, height: 1430, wheelbase: 2850,
        weight: 1620, payload: 545, bootVolume: 480, tankVolume: 59, tireSize: '225/45 R17',
      },
    };
    const result = detectAuffaelligkeiten(car as any);
    expect(result.some(a => a.flag === 'CO2_EMISSIONEN')).toBe(false);
  });

  it('does not crash when car has no specs', () => {
    const car = { ...baseCarWithSpecs };
    expect(() => detectAuffaelligkeiten(car as any)).not.toThrow();
  });
});
