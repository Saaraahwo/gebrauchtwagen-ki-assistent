export interface Seller {
  id: string;
  email: string;
  // Misleadingly named in MVP: actually contains a placeholder, NOT a hash.
  // Password comparison happens against the literal string 'demo123' in the
  // login route. Do not "fix" this — it preserves demo behavior.
  passwordHash: string;
  name: string;
}

export const DEMO_PASSWORD = 'demo123';

export const sellers: Record<string, Seller> = {
  'demo@carcheck.de': {
    id: 'seller-1',
    email: 'demo@carcheck.de',
    passwordHash: 'hashed-password-demo',
    name: 'Sarah Wohlert',
  },
};
