'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SellerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@carcheck.de');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sellers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login fehlgeschlagen');
      }
      router.push('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-md mx-auto bg-white border border-bmw-gray-border p-8 space-y-4 mt-12"
    >
      <h1 className="text-2xl font-bold">Verkäufer-Login</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>
      )}
      <div>
        <label className="block text-xs uppercase tracking-wide text-bmw-gray-muted mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-bmw-gray-border rounded-sm text-sm"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-bmw-gray-muted mb-1">
          Passwort
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-bmw-gray-border rounded-sm text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-bmw-blue text-white font-semibold rounded-sm disabled:opacity-50"
      >
        {loading ? 'Anmelden…' : 'Anmelden'}
      </button>
      <p className="text-xs text-bmw-gray-muted text-center">
        Demo: demo@carcheck.de / demo123
      </p>
    </form>
  );
}
