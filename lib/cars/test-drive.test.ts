import { describe, it, expect } from 'vitest';
import { buildTestDrive, routeProfile, featureDemos, DEALER_CITY } from './test-drive';
import type { Car } from './types';

const base: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 70000, yearBuilt: 2020,
  owners: 1, maintenanceRecords: 12, features: [], accidents: [],
  fuel: 'Benzin', enginePower: '135 kW (184 PS)',
};

describe('routeProfile', () => {
  it('performance for an M model', () => {
    expect(routeProfile({ ...base, name: 'BMW M5', enginePower: '460 kW (625 PS)' })).toBe('performance');
  });
  it('familie for an X model', () => {
    expect(routeProfile({ ...base, name: 'BMW X5', subtitle: 'xDrive30d' })).toBe('familie');
  });
  it('cabrio for a Cabriolet', () => {
    expect(routeProfile({ ...base, name: 'BMW 430i', subtitle: 'Cabriolet' })).toBe('cabrio');
  });
  it('effizienz for a plain diesel', () => {
    expect(routeProfile({ ...base, name: 'BMW 318d', fuel: 'Diesel', features: [] })).toBe('effizienz');
  });
  it('komfort when luxury features present', () => {
    expect(routeProfile({ ...base, name: 'BMW 520i', features: ['Lederausstattung', 'Head-Up Display'] })).toBe('komfort');
  });
  it('allround fallback', () => {
    expect(routeProfile({ ...base, name: 'BMW 318i', features: [], enginePower: '100 kW (136 PS)' })).toBe('allround');
  });
});

describe('buildTestDrive', () => {
  it('keeps the expected German headline per profile', () => {
    expect(buildTestDrive({ ...base, name: 'BMW M5', enginePower: '460 kW (625 PS)' }).headline).toBe('Performance zeigen');
    expect(buildTestDrive({ ...base, name: 'BMW X5', subtitle: 'xDrive30d' }).headline).toBe('Familientauglichkeit');
    expect(buildTestDrive({ ...base, name: 'BMW 430i', subtitle: 'Cabriolet' }).headline).toBe('Offenes Fahrerlebnis');
  });
  it('provides a concrete route anchored in Braunschweig with a valid maps URL', () => {
    const plan = buildTestDrive({ ...base, name: 'BMW M5', enginePower: '460 kW (625 PS)' });
    expect(plan.route.description.length).toBeGreaterThan(0);
    expect(plan.route.mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\//);
    expect(decodeURIComponent(plan.route.mapsUrl)).toContain(DEALER_CITY);
    expect(plan.legs.length).toBeGreaterThan(0);
    expect(plan.legs[0].actions.length).toBeGreaterThan(0);
  });
});

describe('featureDemos', () => {
  it('maps the car\'s actual features to a demo moment', () => {
    const d = featureDemos({ ...base, features: ['Parkassistent', 'Harman Kardon', 'Head-Up Display'] });
    const feats = d.map(x => x.feature);
    expect(feats).toContain('Parkassistent');
    expect(feats).toContain('Soundsystem');
    expect(feats).toContain('Head-Up Display');
    expect(d.every(x => x.when.length > 0)).toBe(true);
  });
  it('returns nothing for a car without demo-worthy features', () => {
    expect(featureDemos({ ...base, features: ['Bluetooth', 'USB-Anschluss'] })).toEqual([]);
  });
});
