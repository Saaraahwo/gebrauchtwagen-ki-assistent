import { describe, it, expect } from 'vitest';
import { lookupEquipmentAnswer, isEquipmentQuestion } from './equipment-store';
import { EQUIPMENT, explainCarEquipment } from './equipment-knowledge';
import type { Car } from './types';

const car: Car = {
  id: 1, name: 'BMW M5', price: 80000, km: 60000, yearBuilt: 2021,
  owners: 1, maintenanceRecords: 8, accidents: [],
  subtitle: 'Competition Limousine',
  features: ['M Fahrwerk Professional', 'Head-Up Display', 'Harman Kardon'],
};

describe('isEquipmentQuestion', () => {
  it('recognises "was ist / was bedeutet" definition questions', () => {
    expect(isEquipmentQuestion('Was ist ein M Fahrwerk Professional?')).toBe(true);
    expect(isEquipmentQuestion('Was bedeutet xDrive?')).toBe(true);
  });
  it('ignores presence / condition questions', () => {
    expect(isEquipmentQuestion('Hat das Auto xDrive?')).toBe(false);
    expect(isEquipmentQuestion('Ist das Fahrwerk in Ordnung?')).toBe(false);
  });
});

describe('lookupEquipmentAnswer', () => {
  it('answers the M Fahrwerk Professional question specifically (not generic Fahrwerk)', () => {
    const a = lookupEquipmentAnswer('Was ist ein M Fahrwerk Professional?');
    expect(a).not.toBeNull();
    expect(a!.term).toBe('M Fahrwerk Professional');
    expect(a!.answer).toMatch(/sportlichste Fahrwerksstufe|adaptiv/i);
  });

  it('prefers the specific term over the generic one (Professional vs plain M Fahrwerk)', () => {
    const specific = lookupEquipmentAnswer('Was ist M Fahrwerk Professional?');
    const generic = lookupEquipmentAnswer('Was ist das adaptive M Fahrwerk?');
    expect(specific!.term).toBe('M Fahrwerk Professional');
    expect(generic!.term).toBe('Adaptives M Fahrwerk');
  });

  it('answers other equipment: xDrive, Head-Up, Keramikbremse, M Sportpaket', () => {
    expect(lookupEquipmentAnswer('Was bedeutet xDrive?')!.term).toMatch(/xDrive/);
    expect(lookupEquipmentAnswer('Was ist ein Head-Up Display?')!.term).toBe('Head-Up Display');
    expect(lookupEquipmentAnswer('Was ist die Keramikbremse?')!.term).toMatch(/Keramik/);
    expect(lookupEquipmentAnswer('Was ist das M Sportpaket?')!.term).toBe('M Sportpaket');
  });

  it('appends whether THIS car has the feature when a car is given', () => {
    const has = lookupEquipmentAnswer('Was ist M Fahrwerk Professional?', car);
    expect(has!.answer).toMatch(/✓ vorhanden/);
    const hasnt = lookupEquipmentAnswer('Was ist ein Panorama-Glasdach?', car);
    expect(hasnt!.answer).toMatch(/nicht in der Ausstattungsliste/);
  });

  it('returns null for non-definition questions', () => {
    expect(lookupEquipmentAnswer('Hat es xDrive?')).toBeNull();
    expect(lookupEquipmentAnswer('Wie ist der Preis?')).toBeNull();
  });

  it('explainCarEquipment returns explanations for the car\'s own equipment', () => {
    const ex = explainCarEquipment(car);
    const terms = ex.map(e => e.term);
    expect(terms).toContain('M Fahrwerk Professional');
    expect(terms).toContain('Head-Up Display');
    expect(terms).toContain('Competition'); // from subtitle
    // does NOT include equipment the car lacks
    expect(terms).not.toContain('Panorama-Glasdach');
    // each carries its full answer
    expect(ex.every(e => e.answer.length > 40)).toBe(true);
  });

  it('every equipment entry has a non-trivial answer', () => {
    for (const e of EQUIPMENT) {
      expect(e.answer.length).toBeGreaterThan(40);
      expect(e.term).toBeTruthy();
      // pattern compiles as a valid regex
      expect(() => new RegExp(e.pattern, 'i')).not.toThrow();
    }
  });
});
