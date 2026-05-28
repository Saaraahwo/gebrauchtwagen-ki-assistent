import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

export interface SellerPayload {
  sellerId: string;
  email: string;
}

export function signToken(payload: SellerPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyTokenString(token: string): SellerPayload {
  return jwt.verify(token, JWT_SECRET) as SellerPayload;
}
