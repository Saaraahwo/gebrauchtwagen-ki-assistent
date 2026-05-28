import { NextResponse, type NextRequest } from 'next/server';
import { signToken } from '@/lib/auth/jwt';
import { sellers, DEMO_PASSWORD } from '@/lib/auth/sellers';
import { COOKIE_NAME } from '@/lib/auth/require-seller';

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email und Password erforderlich' }, { status: 400 });
  }

  const seller = sellers[email];
  // Plain-text password comparison preserved from MVP (see lib/auth/sellers.ts).
  if (!seller || password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = signToken({ sellerId: seller.id, email: seller.email });
  const res = NextResponse.json({
    success: true,
    seller: { id: seller.id, email: seller.email, name: seller.name },
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
