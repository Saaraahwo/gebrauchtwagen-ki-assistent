import { describe, it, expect } from 'vitest';
import { basisForMessage } from './chat-basis';

describe('basisForMessage', () => {
  it('price/negotiation → Marktvergleich', () => {
    expect(basisForMessage('Ist der Preis verhandelbar?')).toBe('Marktvergleich & Kostenschätzung');
  });
  it('running costs → Kostenschätzung', () => {
    expect(basisForMessage('Welche Jahreskosten kommen auf mich zu?')).toBe('Kostenschätzung');
  });
  it('"Was ist X" → Wissensdatenbank', () => {
    expect(basisForMessage('Was ist das M Sportpaket?')).toBe('Wissensdatenbank');
  });
  it('accident/damage → Schadens-Datenbank', () => {
    expect(basisForMessage('Ist der Unfall schlimm?')).toBe('Schadens-Datenbank & Fahrzeugdaten');
  });
  it('default → Fahrzeugdaten & Prüf-Erfahrung', () => {
    expect(basisForMessage('Wie ist der Motor?')).toBe('Fahrzeugdaten & Prüf-Erfahrung');
  });
});
