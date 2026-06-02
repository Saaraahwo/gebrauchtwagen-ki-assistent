import { NextResponse, type NextRequest } from 'next/server';
import { requireSellerFromRequest, AuthError } from '@/lib/auth/require-seller';
import { clearQuestions } from '@/lib/questions/log';
import { clearBookings } from '@/lib/bookings/store';

export async function DELETE(req: NextRequest) {
  try {
    requireSellerFromRequest(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }
  clearQuestions();
  clearBookings();
  return NextResponse.json({ ok: true });
}
