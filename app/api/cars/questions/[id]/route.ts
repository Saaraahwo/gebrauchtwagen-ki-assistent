import { NextResponse } from 'next/server';
import { getQuestionsForCar } from '@/lib/questions/log';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const carId = parseInt(id, 10);
  if (Number.isNaN(carId)) {
    return NextResponse.json({ error: 'Invalid car id' }, { status: 400 });
  }
  return NextResponse.json(getQuestionsForCar(carId));
}
