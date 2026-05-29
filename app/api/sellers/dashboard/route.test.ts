import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { signToken } from '@/lib/auth/jwt';

function reqWithCookie(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.cookie = `seller_token=${token}`;
  return new NextRequest('http://localhost/api/sellers/dashboard', { headers });
}

describe('GET /api/sellers/dashboard', () => {
  it('returns 401 without a cookie', async () => {
    const res = await GET(reqWithCookie());
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid token', async () => {
    const res = await GET(reqWithCookie('not-a-valid-jwt'));
    expect(res.status).toBe(401);
  });

  it('returns inventory stats and per-car intelligence', async () => {
    const token = signToken({ sellerId: 'seller-1', email: 'demo@carcheck.de' });
    const res = await GET(reqWithCookie(token));
    expect(res.status).toBe(200);

    const data = await res.json();
    // Name resolved from the store, not a hardcoded literal.
    expect(data.sellerInfo.email).toBe('demo@carcheck.de');
    expect(data.sellerInfo.name).toBe('Max Müller');
    // Aggregate stats present and consistent with the dataset.
    expect(data.stats.total).toBe(data.cars.length);
    expect(data.stats.total).toBeGreaterThan(0);
    expect(Array.isArray(data.stats.priceBuckets)).toBe(true);
    // Each car carries its sales intelligence.
    const first = data.cars[0];
    expect(first.car).toBeTruthy();
    expect(Array.isArray(first.intelligence.strengths)).toBe(true);
    expect(first.intelligence.testDrive.headline).toBeTruthy();
    expect(['red', 'orange', 'green']).toContain(first.condition);
    expect(data.faqPack.downloadUrl).toBe('/api/sellers/faq-pack');
  });
});
