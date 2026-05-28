import { describe, it, expect } from 'vitest';
import { SCHADEN_DB, getSchadenFolgen, detectDamageKey } from './damage-db';

describe('SCHADEN_DB', () => {
  it('has all 8 damage types', () => {
    expect(Object.keys(SCHADEN_DB).sort()).toEqual(
      ['front', 'getriebe', 'glas', 'heck', 'lack', 'motor', 'seite', 'struktur']
    );
  });

  it('each entry has required fields', () => {
    for (const key of Object.keys(SCHADEN_DB)) {
      const e = SCHADEN_DB[key as keyof typeof SCHADEN_DB];
      expect(e.name).toBeTruthy();
      expect(e.kurzfristig).toBeTruthy();
      expect(e.mittelfristig).toBeTruthy();
      expect(e.langfristig).toBeTruthy();
      expect(e.adacTipp).toBeTruthy();
    }
  });
});

describe('detectDamageKey', () => {
  it.each([
    ['Lackschaden vorne', 'lack'],
    ['Heckschaden klein', 'heck'],
    ['Frontschaden Kühler', 'front'],
    ['Motorschaden', 'motor'],
    ['A-Säule beschädigt', 'struktur'],
    ['Getriebeschaden', 'getriebe'],
    ['Tür eingedrückt', 'seite'],
    ['Windschutzscheibe gebrochen', 'glas'],
  ])('matches "%s" → "%s"', (text, expected) => {
    expect(detectDamageKey(text)).toBe(expected);
  });
});

describe('getSchadenFolgen', () => {
  it('returns null for no accidents', () => {
    expect(getSchadenFolgen(undefined)).toBeNull();
    expect(getSchadenFolgen([])).toBeNull();
  });

  it('matches damageKey to SCHADEN_DB entry', () => {
    const r = getSchadenFolgen([{ type: 'X', damage: 'Y', damageKey: 'motor', date: '2022' }]);
    expect(r).not.toBeNull();
    expect(r![0].key).toBe('motor');
    expect(r![0].db?.name).toContain('Motor');
  });

  it('falls back to text-based detection', () => {
    const r = getSchadenFolgen([{ type: 'Lackschaden', damage: 'Kotflügel', date: '2022' }]);
    expect(r![0].key).toBe('lack');
  });
});
