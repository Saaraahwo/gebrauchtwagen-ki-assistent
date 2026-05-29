import { describe, it, expect } from 'vitest';
import { assessRisk } from './risk';
import type { Findings, PriceAmpel } from './types';

const noFindings: Findings = { red: [], orange: [], green: [] };
const fairPrice: PriceAmpel = { status: 'normal', label: '', expected: 25000, diff: 0 };
const red = (flag: string) => ({ flag, message: '', severity: 'red' as const, tip: '' });
const orange = (flag: string) => ({ flag, message: '', severity: 'orange' as const, tip: '' });

describe('assessRisk', () => {
  it('niedrig for a clean, fairly-priced car', () => {
    expect(assessRisk(noFindings, fairPrice).level).toBe('niedrig');
  });

  it('hoch for two or more red findings', () => {
    const f: Findings = { red: [red('TRANSPARENTE UNFALLHISTORIE'), red('BESITZERHISTORIE')], orange: [], green: [] };
    expect(assessRisk(f, fairPrice).level).toBe('hoch');
  });

  it('does not treat a low price as a risk on its own (good price is a perk)', () => {
    const cheap: PriceAmpel = { status: 'gut', label: '', expected: 12000, diff: -45 };
    expect(assessRisk(noFindings, cheap).level).toBe('niedrig');
  });

  it('the price finding (ATTRAKTIVES ANGEBOT) does not elevate the risk level', () => {
    const f: Findings = { red: [red('ATTRAKTIVES ANGEBOT')], orange: [], green: [] };
    const cheap: PriceAmpel = { status: 'gut', label: '', expected: 12000, diff: -50 };
    expect(assessRisk(f, cheap).level).toBe('niedrig');
  });

  it('mittel for a single (non-price) red finding', () => {
    const f: Findings = { red: [red('TRANSPARENTE UNFALLHISTORIE')], orange: [], green: [] };
    expect(assessRisk(f, fairPrice).level).toBe('mittel');
  });

  it('mittel for two or more orange findings', () => {
    const f: Findings = { red: [], orange: [orange('LAUFLEISTUNG'), orange('FAHRZEUGALTER')], green: [] };
    expect(assessRisk(f, fairPrice).level).toBe('mittel');
  });

  it('always provides a headline', () => {
    expect(assessRisk(noFindings, fairPrice).headline).toBeTruthy();
  });
});
