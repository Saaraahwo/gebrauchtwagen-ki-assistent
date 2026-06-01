import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/cars/test-drive', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/cars/test-drive', () => {
  it('rejects a request missing name/phone', async () => {
    const res = await POST(req({ carId: 1 }));
    expect(res.status).toBe(400);
  });

  it('accepts a valid request and returns the stored booking', async () => {
    const res = await POST(req({ carId: 3, carName: 'BMW 520d', name: 'Erika', phone: '0151 9', preferredDate: '2026-06-12' }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.booking.name).toBe('Erika');
    expect(data.booking.ts).toBeTruthy();
  });
});
