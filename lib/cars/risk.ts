import type { Findings, PriceAmpel } from './types';

export type RiskLevel = 'hoch' | 'mittel' | 'niedrig';

export interface RiskAssessment {
  level: RiskLevel;
  headline: string;
  reasons: string[];
}

// Honest, neutral customer-facing labels for the internal rules-engine flags.
// The flags themselves stay marketing-flavoured for the seller side; this maps
// them to plain language for the buyer's transparency view.
const FINDING_LABELS: Record<string, string> = {
  BESITZERHISTORIE: 'Viele Vorbesitzer',
  'TRANSPARENTE UNFALLHISTORIE': 'Unfallschaden',
  'ATTRAKTIVES ANGEBOT': 'Auffällig niedriger Preis',
  INDIVIDUALISIERUNG: 'Nicht-Serien-Modifikation',
  SERVICEHISTORIE: 'Lückenhafte Servicehistorie',
  LAUFLEISTUNG: 'Hohe Laufleistung',
  FAHRZEUGALTER: 'Höheres Fahrzeugalter',
  'GUTER ZUSTAND': 'Keine großen Warnsignale',
};

export function findingLabel(flag: string): string {
  return FINDING_LABELS[flag] ?? flag;
}

/** Plain-language risk verdict for the buyer, derived from rules-engine findings + price position. */
export function assessRisk(findings: Findings, preisAmpel: PriceAmpel): RiskAssessment {
  const reasons: string[] = [];
  for (const f of findings.red) reasons.push(findingLabel(f.flag));

  const suspiciousPrice = preisAmpel.diff <= -30;
  if (suspiciousPrice && !reasons.includes('Auffällig niedriger Preis')) {
    reasons.push('Preis deutlich unter Marktwert – Ursache klären');
  }

  const redCount = findings.red.length;
  let level: RiskLevel;
  if (suspiciousPrice || redCount >= 2) level = 'hoch';
  else if (redCount === 1 || findings.orange.length >= 2) level = 'mittel';
  else level = 'niedrig';

  const headline =
    level === 'hoch'
      ? 'Erhöhtes Risiko – vor dem Kauf genau prüfen'
      : level === 'mittel'
        ? 'Solide mit Prüfpunkten – mit unabhängigem Check unbedenklich'
        : 'Unauffällig – keine größeren Warnsignale';

  if (reasons.length === 0) reasons.push('Keine wesentlichen Warnsignale erkannt');
  return { level, headline, reasons: [...new Set(reasons)] };
}
