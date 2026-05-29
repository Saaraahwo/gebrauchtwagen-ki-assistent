import { describe, it, expect } from 'vitest';
import { assessRisk, findingLabel } from './risk';
import type { Findings, PriceAmpel } from './types';

const noFindings: Findings = { red: [], orange: [], green: [] };
const fairPrice: PriceAmpel = { status: 'normal', label: '', expected: 25000, diff: 0 };
const red = (flag: string) => ({ flag, message: '', severity: 'red' as const, tip: '' });
const orange = (flag: string) => ({ flag, message: '', severity: 'orange' as const, tip: '' });

describe('findingLabel', () => {
  it('maps marketing flags to honest labels', () => {
    expect(findingLabel('TRANSPARENTE UNFALLHISTORIE')).toBe('Unfallschaden');
    expect(findingLabel('ATTRAKTIVES ANGEBOT')).toBe('Auffällig niedriger Preis');
    expect(findingLabel('BESITZERHISTORIE')).toBe('Viele Vorbesitzer');
  });
  it('falls back to the raw flag when unmapped', () => {
    expect(findingLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});

describe('assessRisk', () => {
  it('niedrig for a clean, fairly-priced car', () => {
    const r = assessRisk(noFindings, fairPrice);
    expect(r.level).toBe('niedrig');
  });

  it('hoch for two or more red findings', () => {
    const f: Findings = { red: [red('TRANSPARENTE UNFALLHISTORIE'), red('BESITZERHISTORIE')], orange: [], green: [] };
    const r = assessRisk(f, fairPrice);
    expect(r.level).toBe('hoch');
    expect(r.reasons).toContain('Unfallschaden');
    expect(r.reasons).toContain('Viele Vorbesitzer');
  });

  it('hoch when price is far below market even without red findings', () => {
    const cheap: PriceAmpel = { status: 'gut', label: '', expected: 12000, diff: -45 };
    const r = assessRisk(noFindings, cheap);
    expect(r.level).toBe('hoch');
    expect(r.reasons.some(x => x.includes('unter Marktwert'))).toBe(true);
  });

  it('mittel for a single red finding', () => {
    const f: Findings = { red: [red('TRANSPARENTE UNFALLHISTORIE')], orange: [], green: [] };
    expect(assessRisk(f, fairPrice).level).toBe('mittel');
  });

  it('mittel for two or more orange findings', () => {
    const f: Findings = { red: [], orange: [orange('LAUFLEISTUNG'), orange('FAHRZEUGALTER')], green: [] };
    expect(assessRisk(f, fairPrice).level).toBe('mittel');
  });

  it('always provides a headline and at least one reason', () => {
    const r = assessRisk(noFindings, fairPrice);
    expect(r.headline).toBeTruthy();
    expect(r.reasons.length).toBeGreaterThan(0);
  });
});
