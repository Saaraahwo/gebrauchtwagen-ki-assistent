import { NextResponse, type NextRequest } from 'next/server';
import { logQuestion, articleNr } from '@/lib/questions/log';

export async function POST(req: NextRequest) {
  let body: { carId?: number; carName?: string; question?: string; answer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { carId, carName, question, answer } = body;
  if (!carId || !question) {
    return NextResponse.json({ error: 'carId und question erforderlich' }, { status: 400 });
  }
  logQuestion(carId, carName || '–', question, answer || '–');
  return NextResponse.json({ ok: true, articleNr: articleNr(carId) });
}
