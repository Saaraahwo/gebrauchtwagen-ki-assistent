'use client';

import { useState } from 'react';
import type { Car } from '@/lib/cars/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  basis?: string;
  model?: string;
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, i) => {
        if (line === '') return <br key={i} />;
        const parts = line.split(/\*\*(.+?)\*\*/g);
        const content = parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j}>{p}</strong> : p
        );
        return (
          <span key={i} className={`block${line.startsWith('•') ? ' pl-3' : ''}`}>
            {content}
          </span>
        );
      })}
    </>
  );
}

export function ChatWidget({ car }: { car: Car }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
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
      setMessages(m => [...m, { role: 'assistant', content: data.reply, basis: data.basis, model: data.model }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Fehler beim Senden.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Chat öffnen"
          className="fixed bottom-7 right-7 z-40 w-14 h-14 rounded-full bg-bmw-blue text-white shadow-xl hover:bg-blue-700 text-2xl flex items-center justify-center transition-transform hover:scale-105"
        >
          💬
        </button>
      )}

      {/* Chat popup */}
      {open && (
        <div className="fixed bottom-7 right-7 z-50 w-[340px] h-[480px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-bmw-gray-border">
          {/* Header */}
          <div className="bg-bmw-blue text-white px-4 py-3 flex justify-between items-center flex-shrink-0">
            <div>
              <h3 className="text-sm font-bold">💬 Fragen zum Fahrzeug</h3>
              <p className="text-[10px] text-white/80 mt-0.5">Antworten regelbasiert — mit Grundlage.</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-xs text-bmw-gray-muted text-center pt-6 px-4">
                Stellen Sie Fragen zu Motor, Preis, Unfall, Wartung…
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'self-end' : 'self-start max-w-[88%]'}>
                <div className={
                  m.role === 'user'
                    ? 'bg-bmw-blue text-white rounded-[14px_14px_2px_14px] px-3 py-2 text-xs max-w-[85%]'
                    : 'bg-white border border-gray-200 rounded-[2px_14px_14px_14px] px-3 py-2 text-xs shadow-sm leading-relaxed'
                }>
                  {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                </div>
                {m.role === 'assistant' && m.basis && (
                  <p className="text-[9px] text-bmw-gray-muted mt-0.5 pl-1">Grundlage: {m.basis}{m.model ? ` · Quelle: ${m.model}` : ''}</p>
                )}
              </div>
            ))}
            {loading && (
              <p className="text-xs text-bmw-gray-muted self-start pl-1">Schreibt…</p>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-bmw-gray-border bg-white flex-shrink-0">
            <form onSubmit={send} className="p-2 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Frage stellen…"
              className="flex-1 border border-bmw-gray-border rounded-full px-3 py-1.5 text-xs outline-none focus:border-bmw-blue bg-gray-50 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-8 h-8 rounded-full bg-bmw-blue text-white flex items-center justify-center text-sm disabled:opacity-50 flex-shrink-0 hover:bg-blue-700"
            >
              ➤
            </button>
            </form>
            <p className="px-3 pb-2 text-[9px] text-bmw-gray-muted">
              Ihre Fragen werden gespeichert, um Antworten zu verbessern. Details: <a href="/datenschutz" className="text-bmw-blue underline">Datenschutz</a>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
