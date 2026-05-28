import type { Car, Findings } from '@/lib/cars/types';
import { client, hasApiKey, CLAUDE_MODEL } from './claude-client';
import { generateDemoAnalysis } from './demo-analysis';

export interface AnalysisResult {
  analysis: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

const SYSTEM_PROMPT = `Du bist ein Gebrauchtwagen-Experte mit 15 Jahren Erfahrung. Du analysierst Fahrzeuge transparent und denkst laut nach.

Deine Aufgabe:
1. Erkläre jeden Wert des Autos und was er bedeutet
2. Vergleiche mit Standard-Werten (z.B. normale km/Jahr: 12000)
3. Identifiziere Anomalien
4. Bei Unfallwagen: Berechne langfristige Folgen
5. Erstelle einen Reparaturplan für nächste 12 Monate
6. Top 5 Fragen, die der Käufer stellen sollte

Format: Strukturiert, transparent, ehrlich.`;

function buildUserPrompt(car: Car, findings: Findings): string {
  return `Analysiere dieses Gebrauchfahrzeug transparent:

**AUTO-DATEN:**
- Name: ${car.name}
- Preis: ${car.price}€
- Kilometerstand: ${car.km} km
- Baujahr: ${car.yearBuilt}
- Besitzer: ${car.owners}
- Serviceeinträge: ${car.maintenanceRecords}
- Features: ${car.features.join(', ')}
- Motor: ${car.enginePower} (${car.fuel})
- Farbe: ${car.color}
- Getriebe: ${car.transmission}
${car.accidents.length > 0 ? `- Unfälle: ${car.accidents.map((a) => `${a.date}: ${a.type} (${a.damage})`).join(' | ')}` : '- Unfälle: Keine bekannt'}

**SOFORT-FINDINGS VON REGELN-ENGINE:**
${findings.red.length > 0 ? `ROT FLAGS: ${findings.red.map((f) => f.message).join(' | ')}` : ''}
${findings.orange.length > 0 ? `ORANGE FLAGS: ${findings.orange.map((f) => f.message).join(' | ')}` : ''}

Bitte analysiere transparent. Erkläre Dein Denken Schritt für Schritt.`;
}

export async function analyzeCarWithClaude(
  carData: Car,
  findings: Findings,
): Promise<AnalysisResult> {
  if (!hasApiKey || !client) {
    return {
      analysis: generateDemoAnalysis(carData, findings),
      model: 'demo-mode',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  try {
    const msg = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(carData, findings) }],
    });
    const textBlock = msg.content[0];
    const analysis = textBlock.type === 'text' ? textBlock.text : '';
    return {
      analysis,
      model: CLAUDE_MODEL,
      usage: {
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
      },
    };
  } catch (err) {
    console.error('Claude API error, falling back to demo:', err);
    return {
      analysis: generateDemoAnalysis(carData, findings),
      model: 'demo-mode (API Fehler)',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}
