import { describe, it, expect } from 'vitest';
import { generateDemoChatResponse } from './demo-chat';
import type { Car } from '@/lib/cars/types';

const car: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 2, maintenanceRecords: 10, features: ['Navi', 'Sitzheizung'], accidents: [],
  enginePower: '135 kW', fuel: 'Benzin', transmission: 'Automatik',
  emission: 'Euro 6', consumption: '7.5', color: 'Alpinweiß', polster: 'Leder',
  interiorColor: 'Schwarz',
};

describe('generateDemoChatResponse', () => {
  it('returns ausstattung info for "ausstattung" question', () => {
    const r = generateDemoChatResponse(car, [], 'Was ist alles drin?');
    expect(r).toMatch(/Ausstattung/i);
    expect(r).toContain('Navi');
  });

  it('returns motor info for motor question', () => {
    const r = generateDemoChatResponse(car, [], 'Wie ist der Motor?');
    expect(r).toMatch(/Motor/);
  });

  it('returns brakes info for "bremse" question', () => {
    const r = generateDemoChatResponse(car, [], 'Sind die Bremsen ok?');
    expect(r).toMatch(/Bremse/);
  });

  it('returns price evaluation for price question', () => {
    const r = generateDemoChatResponse(car, [], 'Wie ist der Preis?');
    expect(r).toMatch(/Preis/i);
  });

  it('returns default topic list for unmatched question', () => {
    const r = generateDemoChatResponse(car, [], 'asdfqwerty');
    expect(r).toMatch(/Kilometerstand/);
    expect(r).toMatch(/Motor/);
  });

  it('handles accident-related questions when no accidents', () => {
    const r = generateDemoChatResponse(car, [], 'Hatte er einen Unfall?');
    expect(r).toMatch(/keine bekannte Unfallhistorie/i);
  });
});
