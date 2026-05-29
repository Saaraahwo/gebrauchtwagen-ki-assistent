import { describe, it, expect } from 'vitest';
import { explainCarFeatures } from './feature-glossary';
import type { Car } from './types';

const base: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 70000, yearBuilt: 2020,
  owners: 1, maintenanceRecords: 12, features: [], accidents: [],
};

const terms = (c: Car) => explainCarFeatures(c).map(e => e.term);

describe('explainCarFeatures', () => {
  it('explains M Sportpaket and xDrive from the subtitle', () => {
    const t = terms({ ...base, subtitle: 'xDrive30d M Sport Paket' });
    expect(t).toContain('M Sportpaket');
    expect(t).toContain('xDrive (Allrad)');
  });

  it('explains Luxury Line and xDrive together', () => {
    const t = terms({ ...base, subtitle: 'Limousine xDrive Luxury Line' });
    expect(t).toContain('Luxury Line');
    expect(t).toContain('xDrive (Allrad)');
  });

  it('deduplicates when a term appears in both subtitle and features', () => {
    const t = terms({ ...base, subtitle: '5-Türer M Sport Shadow Edition', features: ['M Sportpaket', 'Laser-Scheinwerfer'] });
    expect(t.filter(x => x === 'M Sportpaket')).toHaveLength(1);
    expect(t).toContain('Shadow Edition');
    expect(t).toContain('Laserlicht');
  });

  it('explains premium equipment from the feature list', () => {
    const t = terms({ ...base, features: ['Head-Up Display', 'Harman Kardon', 'Panorama-Glasdach'] });
    expect(t).toContain('Head-Up Display');
    expect(t).toContain('Harman Kardon Sound');
    expect(t).toContain('Panorama-Glasdach');
  });

  it('returns nothing for a car with no jargon', () => {
    expect(explainCarFeatures({ ...base, subtitle: 'Limousine', features: ['Bluetooth', 'USB-Anschluss', 'Tempomat'] })).toEqual([]);
  });
});
