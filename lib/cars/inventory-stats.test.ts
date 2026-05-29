import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { computeInventoryStats, carCondition } from './inventory-stats';
import type { Car } from './types';

const cars: Car[] = JSON.parse(
  readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
);

describe('computeInventoryStats', () => {
  const stats = computeInventoryStats(cars);

  it('counts every car', () => {
    expect(stats.total).toBe(cars.length);
  });

  it('price buckets sum to the total', () => {
    const sum = stats.priceBuckets.reduce((s, b) => s + b.count, 0);
    expect(sum).toBe(cars.length);
  });

  it('condition counts sum to the total', () => {
    const { red, orange, green } = stats.condition;
    expect(red + orange + green).toBe(cars.length);
  });

  it('computes positive averages', () => {
    expect(stats.avgPrice).toBeGreaterThan(0);
    expect(stats.avgKm).toBeGreaterThan(0);
    expect(stats.avgAge).toBeGreaterThan(0);
  });

  it('surfaces the Sonderfarbe anomaly from the inventory (BMW 116i)', () => {
    expect(stats.topAnomalies.some(a => a.flag === 'SONDERFARBE')).toBe(true);
  });

  it('fuel and emission mixes are non-empty and sorted desc', () => {
    expect(stats.fuelMix.length).toBeGreaterThan(0);
    expect(stats.emissionMix.length).toBeGreaterThan(0);
    const counts = stats.fuelMix.map(f => f.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });
});

describe('carCondition', () => {
  it('classifies a clean car as green', () => {
    const clean: Car = {
      id: 99, name: 'BMW 320i', price: 25000, km: 60000, yearBuilt: 2021,
      owners: 1, maintenanceRecords: 10, features: [], accidents: [],
    };
    expect(carCondition(clean)).toBe('green');
  });

  it('classifies an accident car as red', () => {
    const wrecked: Car = {
      id: 98, name: 'BMW 320i', price: 25000, km: 60000, yearBuilt: 2021,
      owners: 1, maintenanceRecords: 10, features: [],
      accidents: [{ type: 'Heckschaden', damage: 'Lack', date: '2022' }],
    };
    expect(carCondition(wrecked)).toBe('red');
  });
});
