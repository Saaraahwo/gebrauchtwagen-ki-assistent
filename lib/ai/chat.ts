import type { Car } from '@/lib/cars/types';
import { client, hasApiKey, CLAUDE_MODEL } from './claude-client';
import { generateDemoChatResponse, type ChatMessage } from './demo-chat';
import { lookupEquipmentAnswer } from '@/lib/cars/equipment-store';

export interface ChatResult {
  reply: string;
  model: string;
}

function buildSystemPrompt(car: Car): string {
  return `Du bist ein erfahrener Gebrauchtwagen-Experte (15 Jahre Erfahrung, ADAC-zertifiziert).
Du berätst Käufer zu folgendem Fahrzeug:
- ${car.name} ${car.subtitle ?? ''}, Baujahr ${car.yearBuilt}
- Preis: ${car.price} €, ${car.km} km, ${car.owners} Vorbesitzer
- Unfälle: ${car.accidents && car.accidents.length > 0 ? car.accidents.map(a => a.type + ': ' + a.damage).join(' | ') : 'keine bekannt'}
- Service-Einträge: ${car.maintenanceRecords}

Antworte präzise, auf Deutsch, mit konkreten Zahlen und Kosten. Nutze Markdown-Formatierung (**, •). Max. 200 Wörter pro Antwort.`;
}

export async function chatWithClaude(
  carData: Car,
  messages: ChatMessage[],
  userMessage: string,
): Promise<ChatResult> {
  // "Was ist X?" equipment questions are answered from the SQLite knowledge base
  // first — deterministic and correct, regardless of whether a live key is set.
  const equipment = lookupEquipmentAnswer(userMessage, carData);
  if (equipment) {
    return { reply: `**${equipment.term}**\n\n${equipment.answer}`, model: 'wissensdatenbank' };
  }

  if (!hasApiKey || !client) {
    return {
      reply: generateDemoChatResponse(carData, messages, userMessage),
      model: 'demo-mode',
    };
  }

  try {
    const chatMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: buildSystemPrompt(carData),
      messages: chatMessages,
    });
    const block = response.content[0];
    const reply = block?.type === 'text' ? block.text : '';
    return { reply, model: CLAUDE_MODEL };
  } catch {
    return {
      reply: generateDemoChatResponse(carData, messages, userMessage),
      model: 'demo-mode (API Fehler)',
    };
  }
}
