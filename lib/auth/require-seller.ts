import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyTokenString, type SellerPayload } from './jwt';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const COOKIE_NAME = 'seller_token';

export function requireSellerFromRequest(req: NextRequest): SellerPayload {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) throw new AuthError('No token');
  try {
    return verifyTokenString(token);
  } catch {
    throw new AuthError('Invalid token');
  }
}

export async function getSellerFromCookies(): Promise<SellerPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyTokenString(token);
  } catch {
    return null;
  }
}
