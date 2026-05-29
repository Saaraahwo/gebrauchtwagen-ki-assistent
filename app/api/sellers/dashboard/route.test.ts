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

  it('resolves the seller name from the store (not a hardcoded literal)', async () => {
    const token = signToken({ sellerId: 'seller-1', email: 'demo@carcheck.de' });
    const res = await GET(reqWithCookie(token));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.sellerInfo.email).toBe('demo@carcheck.de');
    // Name comes from sellers['demo@carcheck.de'].name via the store lookup.
    expect(data.sellerInfo.name).toBe('Max Müller');
    expect(data.statistics.carsAnalyzed).toBe(47);
    expect(data.faqPack.downloadUrl).toBe('/api/sellers/faq-pack');
  });
});
