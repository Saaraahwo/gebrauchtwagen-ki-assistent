'use client';

import { useState } from 'react';
import type { Car } from '@/lib/cars/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWidgetProps {
  car: Car;
}

export function ChatWidget({ car }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/cars/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carData: car, messages, message: userMsg.content }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Fehler beim Senden.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white border border-bmw-gray-border flex flex-col h-[500px]">
      <div className="px-4 py-3 border-b border-bmw-gray-border font-semibold">
        Fragen zum Fahrzeug
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-bmw-gray-muted">
            Stellen Sie Fragen zu Motor, Wartung, Probefahrt, Preis usw.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}>
            <div
              className={`inline-block px-3 py-2 rounded ${
                m.role === 'user'
                  ? 'bg-bmw-blue text-white'
                  : 'bg-gray-100 text-bmw-dark whitespace-pre-wrap'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-bmw-gray-muted">Antwort wird geschrieben…</div>
        )}
      </div>
      <form onSubmit={send} className="border-t border-bmw-gray-border p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Frage stellen…"
          className="flex-1 px-3 py-2 border border-bmw-gray-border rounded-sm text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-bmw-blue text-white rounded-sm font-medium disabled:opacity-50"
        >
          Senden
        </button>
      </form>
    </section>
  );
}
