import { NextResponse, type NextRequest } from 'next/server';
import { chatWithClaude } from '@/lib/ai/chat';
import { logQuestion } from '@/lib/questions/log';
import { findKnowledgeAnswer } from '@/lib/questions/knowledge';
import type { Car } from '@/lib/cars/types';
import type { ChatMessage } from '@/lib/ai/demo-chat';

interface ChatRequest {
  carData: Car;
  messages?: ChatMessage[];
  message: string;
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { carData, messages = [], message } = body;
  if (!carData || !message) {
    return NextResponse.json({ error: 'carData und message erforderlich' }, { status: 400 });
  }

  // Warranty-coverage questions must reach the chat logic, not the spec knowledge
  // base (e.g. "Motorschaden … von der Garantie abgedeckt?" must not return PS specs).
  const isWarranty = /garantie|gewährleist|abgedeckt|abgesichert/i.test(message);

  // Check pre-seeded knowledge base first
  const knowledge = isWarranty ? null : findKnowledgeAnswer(carData.id, message);
  if (knowledge) {
    if (carData.id) logQuestion(carData.id, carData.name, message, knowledge.answer);
    return NextResponse.json({ reply: knowledge.answer, basis: 'Technische Fahrzeugdaten', model: 'Wissensdatenbank' });
  }

  const { reply, model, basis } = await chatWithClaude(carData, messages, message);
  if (carData.id) logQuestion(carData.id, carData.name, message, reply);
  return NextResponse.json({ reply, model, basis });
}
