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

  it('offers the BMW warranty solution (with source) for an accident-car repair-cost question', () => {
    const accidentCar: Car = {
      ...car,
      accidents: [{ type: 'Heckschaden', damage: 'Stoßstange', damageKey: 'heck', date: '2022', repairCost: 3000 }],
    };
    const r = generateDemoChatResponse(accidentCar, [], 'Welche Reparaturkosten kommen durch den Unfall auf mich zu?');
    expect(r).toMatch(/Premium Selection|Garantie/);
    expect(r).toMatch(/bmw\.de/);
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

  it('answers repaint COST (not the colour description) for "was kostet eine andere Farbe"', () => {
    const r = generateDemoChatResponse(car, [], 'Wie viel kostet eine andere Farbe? Umlackierung?');
    expect(r).toMatch(/Umlackierung/i);
    expect(r).toMatch(/€/);
    expect(r).not.toMatch(/^\*\*Exterieur/);
  });

  it('explains what an OLD car means for the buyer', () => {
    const r = generateDemoChatResponse(car, [], 'Das Auto ist alt, was bedeutet das für mich?');
    expect(r).toMatch(/Fahrzeugalter/);
    expect(r).toMatch(/Verschleißteile|Rost/);
    expect(r).not.toMatch(/Ich beantworte gerne Ihre Fragen/); // not the default fallback
  });

  it('routes a tyre-AGE question to the Reifen branch, not Fahrzeugalter', () => {
    const r = generateDemoChatResponse(car, [], 'Wie alt sind die Reifen?');
    expect(r).toMatch(/Reifen/);
    expect(r).not.toMatch(/^\*\*Fahrzeugalter/);
  });
});

const carWithAccident: Car = {
  ...car,
  accidents: [{ type: 'Heckschaden', damage: 'Stoßfänger', damageKey: 'heck', repairCost: 1500, date: '2022-06' }],
};

describe('negotiation branch', () => {
  it('returns 4-step action plan for "wie gehe ich mit dem Unfall um"', () => {
    const r = generateDemoChatResponse(carWithAccident, [], 'wie gehe ich mit dem Unfall um');
    expect(r).toMatch(/Dokumente verlangen/);
    expect(r).toMatch(/Preisverhandlung/);
    expect(r).toMatch(/Gutachten/);
  });

  it('returns action plan for "was tun beim Unfall"', () => {
    const r = generateDemoChatResponse(carWithAccident, [], 'was tun beim Unfall');
    expect(r).toMatch(/Dokumente verlangen/);
  });

  it('factual accident question returns facts, not action plan', () => {
    const r = generateDemoChatResponse(carWithAccident, [], 'Hatte er einen Unfall?');
    expect(r).toMatch(/Unfallhistorie|Heckschaden/i);
    expect(r).not.toMatch(/Dokumente verlangen/);
  });

  it('no accidents + negotiation trigger returns clean response', () => {
    const r = generateDemoChatResponse(car, [], 'wie gehe ich mit dem Unfall um');
    expect(r).toMatch(/keine bekannte Unfallhistorie|kein.*Unfall/i);
  });
});
