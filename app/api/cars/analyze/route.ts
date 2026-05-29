import { NextResponse, type NextRequest } from 'next/server';
import { runRulesEngine } from '@/lib/cars/rules-engine';
import { detectAuffaelligkeiten } from '@/lib/cars/anomaly-detection';
import { calcPreisAmpel } from '@/lib/cars/price-calculator';
import { buildDamageDetails, buildBuyerChecklist } from '@/lib/cars/buyer-guide';
import { explainCarFeatures } from '@/lib/cars/feature-glossary';
import { analyzeCarWithClaude } from '@/lib/ai/analysis';
import type { Car } from '@/lib/cars/types';

export async function POST(req: NextRequest) {
  let carData: Car;
  try {
    carData = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!carData?.name || typeof carData.price !== 'number' || typeof carData.km !== 'number') {
    return NextResponse.json({ error: 'Fehlende Auto-Daten' }, { status: 400 });
  }

  const findings = runRulesEngine(carData);
  const auffaelligkeiten = detectAuffaelligkeiten(carData);
  const preisAmpel = calcPreisAmpel(carData);
  const damageDetails = buildDamageDetails(carData.accidents);
  const checklist = buildBuyerChecklist(carData);
  const featureExplanations = explainCarFeatures(carData);
  const aiAnalysis = await analyzeCarWithClaude(carData, findings);

  return NextResponse.json({
    success: true,
    analysis: {
      carData,
      findings,
      auffaelligkeiten,
      preisAmpel,
      damageDetails,
      checklist,
      featureExplanations,
      aiAnalysis,
      timestamp: new Date().toISOString(),
    },
  });
}
