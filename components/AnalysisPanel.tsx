'use client';

import { useEffect, useState } from 'react';
import type { Car, Findings, Anomaly, PriceAmpel } from '@/lib/cars/types';
import type { DamageDetail } from '@/lib/cars/buyer-guide';
import type { FeatureExplanation } from '@/lib/cars/feature-glossary';

interface AnalysisData {
  carData: Car;
  findings: Findings;
  auffaelligkeiten: Anomaly[];
  preisAmpel: PriceAmpel;
  damageDetails: DamageDetail[];
  checklist: string[];
  featureExplanations: FeatureExplanation[];
  aiAnalysis: { analysis: string; model: string };
}

interface AnalysisPanelProps {
  car: Car;
  onClose: () => void;
}

export function AnalysisPanel({ car, onClose }: AnalysisPanelProps) {
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ready'; data: AnalysisData }
  >({ kind: 'loading' });

  useEffect(() => {
    fetch('/api/cars/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(car),
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(json => setState({ kind: 'ready', data: json.analysis }))
      .catch(e => setState({ kind: 'error', message: String(e) }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allFindings = state.kind === 'ready'
    ? [...state.data.findings.red, ...state.data.findings.orange, ...state.data.findings.green]
    : [];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-sm shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-bmw-gray-border px-5 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-base font-bold">Fahrzeug-Check — {car.name}</h2>
            {car.subtitle && <div className="text-xs text-bmw-gray-muted mt-0.5">{car.subtitle} · {car.price.toLocaleString('de-DE')} €</div>}
          </div>
          <button onClick={onClose} className="text-bmw-gray-muted hover:text-bmw-dark text-xl leading-none px-1 ml-4">✕</button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-5 flex-1">

          {state.kind === 'loading' && (
            <div className="text-center py-10 text-bmw-gray-muted text-sm">Analysiere…</div>
          )}

          {state.kind === 'error' && (
            <div className="border border-bmw-gray-border p-4 text-sm text-bmw-gray-text">{state.message}</div>
          )}

          {state.kind === 'ready' && (
            <>
              {/* Besonderheiten & Atypisches — the highlights for THIS car (first) */}
              <div>
                <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest mb-2">Besonderheiten &amp; Atypisches</div>
                {state.data.auffaelligkeiten.length === 0 ? (
                  <div className="text-xs text-bmw-gray-text bg-bmw-gray-bg border border-bmw-gray-border p-3">
                    Keine Besonderheiten erkannt — ein unauffälliges, marktübliches Fahrzeug.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {state.data.auffaelligkeiten.map((a, i) => (
                      <div key={i} className="border-l-2 border-bmw-blue pl-3 py-1 bg-bmw-gray-bg">
                        <div className="text-xs font-semibold">{a.title}</div>
                        <div className="text-xs text-bmw-gray-text mt-0.5">{a.detail}</div>
                        {a.tip && <div className="text-[11px] text-bmw-gray-muted mt-1">{a.tip}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary bar */}
              <div className="bg-bmw-gray-bg border border-bmw-gray-border flex divide-x divide-bmw-gray-border">
                {car.accidents.length > 0 && (
                  <div className="flex-1 text-center py-2.5 px-2">
                    <div className="text-base font-bold">{car.accidents.length}</div>
                    <div className="text-[9px] text-bmw-gray-muted uppercase tracking-wide mt-0.5">Unfall</div>
                  </div>
                )}
                <div className="flex-1 text-center py-2.5 px-2">
                  <div className="text-base font-bold">{car.km.toLocaleString('de-DE')}</div>
                  <div className="text-[9px] text-bmw-gray-muted uppercase tracking-wide mt-0.5">km</div>
                </div>
                <div className="flex-1 text-center py-2.5 px-2">
                  <div className="text-base font-bold">{car.owners}</div>
                  <div className="text-[9px] text-bmw-gray-muted uppercase tracking-wide mt-0.5">Vorbesitzer</div>
                </div>
                <div className="flex-1 text-center py-2.5 px-2">
                  <div className="text-base font-bold">{state.data.preisAmpel.expected.toLocaleString('de-DE')} €</div>
                  <div className="text-[9px] text-bmw-gray-muted uppercase tracking-wide mt-0.5">Marktwert</div>
                </div>
                <div className="flex-1 text-center py-2.5 px-2">
                  <div className="text-base font-bold">
                    {state.data.preisAmpel.diff > 0 ? '+' : ''}{state.data.preisAmpel.diff}%
                  </div>
                  <div className="text-[9px] text-bmw-gray-muted uppercase tracking-wide mt-0.5">Preisposition</div>
                </div>
              </div>

              {/* Findings — neutral, thin blue border only */}
              {allFindings.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest mb-2">Prüfpunkte</div>
                  <div className="flex flex-col gap-2">
                    {allFindings.map((f, i) => (
                      <div key={i} className="border-l-2 border-bmw-blue pl-3 py-1 bg-bmw-gray-bg">
                        <div className="text-xs font-semibold">{f.flag}</div>
                        <div className="text-xs text-bmw-gray-text mt-0.5">{f.message}</div>
                        {f.tip && <div className="text-[11px] text-bmw-gray-muted mt-1">{f.tip}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ausstattung erklärt — what the equipment/package terms mean */}
              {state.data.featureExplanations.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest mb-2">Ausstattung erklärt</div>
                  <div className="flex flex-col gap-2">
                    {state.data.featureExplanations.map((f, i) => (
                      <div key={i} className="border-l-2 border-bmw-blue pl-3 py-1 bg-bmw-gray-bg">
                        <div className="text-xs font-semibold">{f.term}</div>
                        <div className="text-xs text-bmw-gray-text mt-0.5">{f.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schäden im Detail — full transparency for the buyer */}
              {state.data.damageDetails.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest mb-2">Schäden im Detail</div>
                  <div className="flex flex-col gap-3">
                    {state.data.damageDetails.map((d, i) => (
                      <div key={i} className="border border-bmw-gray-border p-3">
                        <div className="text-xs font-bold">
                          {d.name} · {d.date}
                          {typeof d.repairCost === 'number' && (
                            <span className="text-bmw-gray-muted font-normal"> · Reparatur: {d.repairCost.toLocaleString('de-DE')} €</span>
                          )}
                        </div>
                        <dl className="mt-2 space-y-1 text-[11px] text-bmw-gray-text">
                          <div><dt className="inline font-semibold">Jetzt prüfen: </dt><dd className="inline">{d.pruefung}</dd></div>
                          <div><dt className="inline font-semibold">Langfristig: </dt><dd className="inline">{d.langfristig}</dd></div>
                          <div><dt className="inline font-semibold">Typische Folgekosten: </dt><dd className="inline">{d.kosten}</dd></div>
                          <div><dt className="inline font-semibold">ADAC-Tipp: </dt><dd className="inline">{d.adacTipp}</dd></div>
                        </dl>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checkliste für den Kauf — buyer takes this to the dealer */}
              {state.data.checklist.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest mb-2">Checkliste für den Kauf</div>
                  <ul className="bg-bmw-gray-bg border border-bmw-gray-border p-3 space-y-1.5 text-xs text-bmw-gray-text">
                    {state.data.checklist.map((c, i) => (
                      <li key={i} className="flex gap-2"><span className="text-bmw-blue">☐</span><span>{c}</span></li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full AI text */}
              <div>
                <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest mb-2">Vollständige Analyse</div>
                <div className="bg-bmw-gray-bg border border-bmw-gray-border p-4">
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-bmw-dark font-sans">
                    {state.data.aiAnalysis.analysis}
                  </pre>
                  <p className="text-[10px] text-bmw-gray-muted mt-3">Modell: {state.data.aiAnalysis.model}</p>
                </div>
              </div>

              {/* Chat nudge */}
              <div className="bg-blue-50 border border-blue-200 p-3 flex gap-3 items-start">
                <span className="text-lg flex-shrink-0">💬</span>
                <p className="text-xs text-bmw-gray-text leading-relaxed">
                  Noch Fragen zum Fahrzeug?{' '}
                  <strong className="text-bmw-blue">Nutzen Sie den Chat</strong> — unser KI-Assistent
                  beantwortet alles zu Motor, Unfall, Kosten und Verhandlung. Einfach auf das Chat-Symbol klicken.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-bmw-gray-border px-5 py-3 flex justify-between items-center">
          <a href={`/cars/${car.id}/bericht`} className="text-sm text-bmw-blue hover:underline">
            Fahrzeugbericht ansehen
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm border border-bmw-gray-border hover:bg-bmw-gray-bg rounded-sm transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
