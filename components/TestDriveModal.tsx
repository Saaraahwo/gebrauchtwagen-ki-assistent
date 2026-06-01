'use client';

import { useState } from 'react';
import type { Car } from '@/lib/cars/types';

export function TestDriveModal({ car, onClose }: { car: Car; onClose: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [state, setState] = useState<'form' | 'sending' | 'done' | 'error'>('form');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/cars/test-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId: car.id, carName: car.name, name, phone, preferredDate: date }),
      });
      if (!res.ok) throw new Error();
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-md rounded-sm shadow-2xl">
        <div className="border-b border-bmw-gray-border px-5 py-4 flex justify-between items-center">
          <h2 className="text-base font-bold">Probefahrt anfragen — {car.name}</h2>
          <button onClick={onClose} className="text-bmw-gray-muted hover:text-bmw-dark text-xl leading-none px-1">✕</button>
        </div>
        <div className="p-5">
          {state === 'done' ? (
            <div className="text-sm">
              <p className="font-semibold mb-1">Anfrage gesendet.</p>
              <p className="text-bmw-gray-text">Die BMW Niederlassung meldet sich zur Terminbestätigung bei Ihnen.</p>
              <button onClick={onClose} className="mt-4 px-5 py-2 bg-bmw-blue text-white text-sm rounded-sm">Schließen</button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              {state === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2 text-xs">Senden fehlgeschlagen. Bitte erneut versuchen.</div>
              )}
              <label className="text-xs text-bmw-gray-muted">Name
                <input required value={name} onChange={e => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-bmw-gray-border rounded-sm text-sm" />
              </label>
              <label className="text-xs text-bmw-gray-muted">Telefon
                <input required value={phone} onChange={e => setPhone(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-bmw-gray-border rounded-sm text-sm" />
              </label>
              <label className="text-xs text-bmw-gray-muted">Wunschtermin
                <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={e => setDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-bmw-gray-border rounded-sm text-sm" />
              </label>
              <button type="submit" disabled={state === 'sending'}
                className="mt-1 py-2.5 bg-bmw-blue text-white font-semibold text-sm rounded-sm disabled:opacity-50">
                {state === 'sending' ? 'Senden…' : 'Probefahrt anfragen'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
