import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from './route';
import { signToken } from '@/lib/auth/jwt';
import { logQuestion, getQuestionsForCar } from '@/lib/questions/log';
import { addBooking, getBookings } from '@/lib/bookings/store';

function reqWithCookie(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.cookie = `seller_token=${token}`;
  return new NextRequest('http://localhost/api/sellers/data', { method: 'DELETE', headers });
}

describe('DELETE /api/sellers/data', () => {
  it('rejects without a cookie', async () => {
    const res = await DELETE(reqWithCookie());
    expect(res.status).toBe(401);
  });

  it('clears questions and bookings for an authenticated seller', async () => {
    logQuestion(1, 'BMW 320i', 'Testfrage?', 'A');
    addBooking({ carId: 1, carName: 'BMW 320i', name: 'Max', phone: '0151', preferredDate: '2026-06-10' });
    const token = signToken({ sellerId: 'seller-1', email: 'demo@carcheck.de' });
    const res = await DELETE(reqWithCookie(token));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(getQuestionsForCar(1).logs).toHaveLength(0);
    expect(getBookings()).toHaveLength(0);
  });
});
