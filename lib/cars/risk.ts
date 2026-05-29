import type { Findings, PriceAmpel } from './types';

export type RiskLevel = 'hoch' | 'mittel' | 'niedrig';

export interface RiskAssessment {
  level: RiskLevel;
  headline: string;
}

/**
 * Plain-language risk verdict for the buyer, derived from rules-engine findings.
 * A low price is a positive ("Guter Preis"), so the price finding does NOT count
 * toward the verdict. The original finding wording is kept everywhere it is shown.
 */
export function assessRisk(findings: Findings, _preisAmpel: PriceAmpel): RiskAssessment {
  const riskReds = findings.red.filter(f => f.flag !== 'ATTRAKTIVES ANGEBOT');
  const redCount = riskReds.length;

  let level: RiskLevel;
  if (redCount >= 2) level = 'hoch';
  else if (redCount === 1 || findings.orange.length >= 2) level = 'mittel';
  else level = 'niedrig';

  const headline =
    level === 'hoch'
      ? 'Erhöhtes Risiko – vor dem Kauf genau prüfen'
      : level === 'mittel'
        ? 'Solide mit Prüfpunkten – mit unabhängigem Check unbedenklich'
        : 'Unauffällig – keine größeren Warnsignale';

  return { level, headline };
}
