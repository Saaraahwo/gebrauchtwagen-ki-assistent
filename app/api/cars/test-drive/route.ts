import { NextResponse, type NextRequest } from 'next/server';
import { addBooking } from '@/lib/bookings/store';

interface TestDriveBody {
  carId?: number;
  carName?: string;
  name?: string;
  phone?: string;
  preferredDate?: string;
}

export async function POST(req: NextRequest) {
  let body: TestDriveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { carId, carName, name, phone, preferredDate } = body;
  if (typeof carId !== 'number' || !name || !phone) {
    return NextResponse.json({ error: 'carId, name und phone erforderlich' }, { status: 400 });
  }
  const booking = addBooking({
    carId,
    carName: carName || '–',
    name,
    phone,
    preferredDate: preferredDate || '–',
  });
  return NextResponse.json({ ok: true, booking }, { status: 201 });
}
