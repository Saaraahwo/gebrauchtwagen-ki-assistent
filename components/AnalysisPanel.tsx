'use client';

import { useState } from 'react';
import type { Car, Findings, Anomaly, PriceAmpel } from '@/lib/cars/types';

interface AnalysisResponse {
  success: true;
  analysis: {
    carData: Car;
    findings: Findings;
    auffaelligkeiten: Anomaly[];
    preisAmpel: PriceAmpel;
    aiAnalysis: { analysis: string; model: string };
    timestamp: string;
  };
}

interface AnalysisPanelProps {
  car: Car;
}

export function AnalysisPanel({ car }: AnalysisPanelProps) {
  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ready'; data: AnalysisResponse['analysis'] }
  >({ kind: 'idle' });

  async function runAnalysis() {
    setState({ kind: 'loading' });
    try {
      const res = await fetch('/api/cars/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(car),
      });
      if (!res.ok) throw new Error('Analyse fehlgeschlagen');
      const json: AnalysisResponse = await res.json();
      setState({ kind: 'ready', data: json.analysis });
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message });
    }
  }

  if (state.kind === 'idle') {
    return (
      <button
        onClick={runAnalysis}
        className="w-full py-3 bg-bmw-blue text-white font-semibold hover:bg-blue-700 rounded-sm"
      >
        🤖 KI-Analyse starten
      </button>
    );
  }
  if (state.kind === 'loading') {
    return (
      <div className="bg-white border border-bmw-gray-border p-6 text-center text-bmw-gray-text">
        Analysiere…
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        {state.message}
        <button onClick={runAnalysis} className="ml-3 underline">
          Erneut versuchen
        </button>
      </div>
    );
  }

  const { findings, auffaelligkeiten, preisAmpel, aiAnalysis } = state.data;
  return (
    <div className="space-y-4">
      {findings.red.length > 0 && (
        <section className="bg-white border-l-4 border-flag-red p-4">
          <h3 className="font-bold mb-2">🔴 Wichtige Punkte</h3>
          <ul className="space-y-2 text-sm">
            {findings.red.map((f, i) => (
              <li key={i}>
                <strong>{f.flag}:</strong> {f.message}
                <div className="text-xs text-bmw-gray-muted">{f.tip}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {findings.orange.length > 0 && (
        <section className="bg-white border-l-4 border-flag-orange p-4">
          <h3 className="font-bold mb-2">🟠 Hinweise</h3>
          <ul className="space-y-2 text-sm">
            {findings.orange.map((f, i) => (
              <li key={i}>
                <strong>{f.flag}:</strong> {f.message}
                <div className="text-xs text-bmw-gray-muted">{f.tip}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {findings.green.length > 0 && (
        <section className="bg-white border-l-4 border-flag-green p-4">
          <h3 className="font-bold mb-2">🟢 Positiv</h3>
          <ul className="space-y-1 text-sm">
            {findings.green.map((f, i) => (
              <li key={i}>{f.message}</li>
            ))}
          </ul>
        </section>
      )}
      {auffaelligkeiten.length > 0 && (
        <section className="bg-white border border-bmw-gray-border p-4">
          <h3 className="font-bold mb-2">Auffälligkeiten</h3>
          <ul className="space-y-3 text-sm">
            {auffaelligkeiten.map((a, i) => (
              <li key={i}>
                <strong>{a.title}</strong>
                <p className="text-bmw-gray-text">{a.detail}</p>
                <p className="text-xs text-bmw-blue mt-1">{a.tip}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="bg-white border border-bmw-gray-border p-4">
        <h3 className="font-bold mb-2">Marktpreisvergleich</h3>
        <p className="text-sm">
          {preisAmpel.label} (Marktwert ca. {preisAmpel.expected.toLocaleString('de-DE')} €)
        </p>
      </section>
      <section className="bg-white border border-bmw-gray-border p-4">
        <h3 className="font-bold mb-2">🧠 KI-Analyse</h3>
        <pre className="whitespace-pre-wrap text-xs font-mono text-bmw-dark">
          {aiAnalysis.analysis}
        </pre>
        <p className="text-[10px] text-bmw-gray-muted mt-2">Model: {aiAnalysis.model}</p>
      </section>
    </div>
  );
}
