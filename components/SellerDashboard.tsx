'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Car } from '@/lib/cars/types';
import type { InventoryStats } from '@/lib/cars/inventory-stats';
import type { SalesIntelligence } from '@/lib/cars/sales-intelligence';
import type { DisclosureItem } from '@/lib/cars/disclosure';
import { StatCard } from './charts/StatCard';
import { BarRow } from './charts/BarRow';
import { ConditionBar } from './charts/ConditionBar';

export interface CarIntel {
  car: Car;
  intelligence: SalesIntelligence;
  condition: 'red' | 'orange' | 'green';
  disclosure: DisclosureItem[];
}

interface Props {
  sellerName: string;
  stats: InventoryStats;
  cars: CarIntel[];
  topQuestions: { question: string; count: number }[];
  bookings: { carId: number; carName: string; name: string; phone: string; preferredDate: string; ts: string }[];
}

const dot: Record<CarIntel['condition'], string> = {
  red: 'bg-flag-red',
  orange: 'bg-flag-orange',
  green: 'bg-flag-green',
};

export function SellerDashboard({ sellerName, stats, cars, topQuestions, bookings }: Props) {
  const router = useRouter();
  const [openId, setOpenId] = useState<number | null>(null);

  async function logout() {
    await fetch('/api/sellers/logout', { method: 'POST' });
    router.push('/login');
  }

  async function deleteData() {
    if (!confirm('Alle gespeicherten Chat-Fragen und Probefahrt-Anfragen löschen?')) return;
    const res = await fetch('/api/sellers/data', { method: 'DELETE' });
    if (res.ok) window.location.reload();
  }

  const max = (arr: { count: number }[]) => Math.max(...arr.map(x => x.count), 1);

  return (
    <div className="max-w-layout mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Verkäufer-Dashboard</h1>
          <p className="text-xs text-bmw-gray-muted mt-0.5">Angemeldet als {sellerName}</p>
        </div>
        <div className="flex items-center gap-4">
          <a href="/api/sellers/faq-pack" download className="text-sm text-bmw-blue hover:underline">
            FAQ-Pack
          </a>
          <button onClick={deleteData} className="text-sm text-flag-orange hover:underline">
            Daten löschen
          </button>
          <button onClick={logout} className="text-sm text-bmw-blue hover:underline">
            Abmelden
          </button>
        </div>
      </div>

      {/* Überblick */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest">Überblick</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Fahrzeuge" value={String(stats.total)} />
          <StatCard label="Ø Preis" value={`${stats.avgPrice.toLocaleString('de-DE')} €`} />
          <StatCard label="Ø Kilometer" value={stats.avgKm.toLocaleString('de-DE')} />
          <StatCard label="Ø Alter" value={`${stats.avgAge} J.`} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Panel title="Preisverteilung">
            {stats.priceBuckets.map(b => (
              <BarRow key={b.label} label={b.label} count={b.count} max={max(stats.priceBuckets)} />
            ))}
          </Panel>
          <Panel title="Zustand der Flotte">
            <ConditionBar red={stats.condition.red} orange={stats.condition.orange} green={stats.condition.green} />
          </Panel>
          <Panel title="Kraftstoff">
            {stats.fuelMix.map(b => (
              <BarRow key={b.label} label={b.label} count={b.count} max={max(stats.fuelMix)} />
            ))}
          </Panel>
          <Panel title="Abgasnorm">
            {stats.emissionMix.map(b => (
              <BarRow key={b.label} label={b.label} count={b.count} max={max(stats.emissionMix)} />
            ))}
          </Panel>
        </div>
        <Panel title="Häufigste Auffälligkeiten in der Flotte">
          {stats.topAnomalies.length ? (
            stats.topAnomalies.map(a => (
              <BarRow key={a.flag} label={a.title} count={a.count} max={max(stats.topAnomalies)} />
            ))
          ) : (
            <p className="text-xs text-bmw-gray-muted">Keine Auffälligkeiten in der Flotte.</p>
          )}
        </Panel>
      </section>

      {/* Kundeninteresse — questions + test-drive requests */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-bmw-gray-border p-4">
          <div className="text-xs font-semibold mb-3">Häufigste Kundenfragen (gesamt)</div>
          {topQuestions.length ? (
            <ul className="space-y-1 text-xs">
              {topQuestions.map((q, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-bmw-gray-text">{q.question}</span>
                  <span className="font-semibold">{q.count}×</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-bmw-gray-muted">Noch keine Fragen erfasst.</p>
          )}
        </div>
        <div className="bg-white border border-bmw-gray-border p-4">
          <div className="text-xs font-semibold mb-3">Probefahrt-Anfragen</div>
          {bookings.length ? (
            <ul className="space-y-1.5 text-xs">
              {bookings.map((b, i) => (
                <li key={i}>
                  <span className="font-semibold">{b.name}</span> · {b.phone} — {b.carName}
                  <span className="text-bmw-gray-muted"> · Wunsch: {b.preferredDate}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-bmw-gray-muted">Noch keine Probefahrt-Anfragen.</p>
          )}
        </div>
      </section>

      {/* Fahrzeuge — Verkaufs-Briefing */}
      <section className="space-y-3">
        <h2 className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest">
          Fahrzeuge — Verkaufs-Briefing
        </h2>
        <div className="flex flex-col gap-2">
          {cars.map(({ car, intelligence, condition, disclosure }) => {
            const open = openId === car.id;
            return (
              <div key={car.id} className="bg-white border border-bmw-gray-border">
                <button
                  onClick={() => setOpenId(open ? null : car.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bmw-gray-bg"
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot[condition]}`} />
                  <span className="font-semibold text-sm flex-1">
                    {car.name} <span className="text-bmw-gray-muted font-normal">{car.subtitle}</span>
                  </span>
                  <span className="text-sm font-bold">{car.price.toLocaleString('de-DE')} €</span>
                  <span className="text-bmw-gray-muted text-xs w-4 text-center">{open ? '▲' : '▼'}</span>
                </button>
                {open && (
                  <div className="border-t border-bmw-gray-border p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Block title="✓ Stärken" items={intelligence.strengths} accent="text-flag-green" />
                    <Block title="⚠ Warum Käufer zögern" items={intelligence.concerns} accent="text-flag-orange" />
                    <Block title="❓ Kundenfragen" items={intelligence.customerQuestions} accent="text-bmw-blue" />
                    <div className="md:col-span-2">
                      <div className="text-xs font-bold text-bmw-blue mb-1">
                        🏁 Probefahrt-Drehbuch: {intelligence.testDrive.headline}
                      </div>
                      <div className="text-[11px] text-bmw-gray-text mb-1">
                        {intelligence.testDrive.route.description}{' '}
                        <a href={intelligence.testDrive.route.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-bmw-blue hover:underline">Route in Google Maps öffnen</a>
                        <span className="text-bmw-gray-muted"> · Beispielroute, mit Händleradresse wird daraus die echte lokale Runde.</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2">
                        <div>
                          {intelligence.testDrive.legs.map((leg, i) => (
                            <div key={i} className="mb-1.5">
                              <div className="text-[11px] font-semibold">{leg.leg}</div>
                              <ul className="text-[11px] text-bmw-gray-text list-disc list-inside">
                                {leg.actions.map((a, j) => <li key={j}>{a}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                        {intelligence.testDrive.featureDemos.length > 0 && (
                          <div>
                            <div className="text-[11px] font-semibold mb-1">Diese Ausstattung vorführen:</div>
                            <ul className="text-[11px] text-bmw-gray-text space-y-0.5">
                              {intelligence.testDrive.featureDemos.map((f, i) => (
                                <li key={i}><strong>{f.feature}:</strong> {f.when}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {disclosure.some(d => !d.ok) && (
                      <div className="md:col-span-2 border-t border-bmw-gray-border pt-3">
                        <div className="text-xs font-bold text-flag-orange mb-1">Offene Angaben (vor Veröffentlichung schließen)</div>
                        <ul className="text-[11px] text-bmw-gray-text space-y-0.5">
                          {disclosure.filter(d => !d.ok).map((d, i) => <li key={i}>✗ {d.item}</li>)}
                        </ul>
                      </div>
                    )}

                    {intelligence.equipment.length > 0 && (
                      <div className="md:col-span-2 border-t border-bmw-gray-border pt-4">
                        <div className="text-xs font-bold text-bmw-blue mb-2">
                          🔧 Ausstattung erklärt — Kunden-Antworten
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3">
                          {intelligence.equipment.map((e, i) => (
                            <div key={i}>
                              <div className="text-xs font-semibold">{e.term}</div>
                              <div className="text-[11px] text-bmw-gray-text mt-0.5 leading-relaxed">{e.answer}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-bmw-gray-border p-4">
      <div className="text-xs font-semibold mb-3">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Block({ title, items, accent }: { title: string; items: string[]; accent: string }) {
  return (
    <div>
      <div className={`text-xs font-bold mb-1 ${accent}`}>{title}</div>
      <ul className="text-xs text-bmw-gray-text space-y-1">
        {items.map((it, i) => (
          <li key={i}>· {it}</li>
        ))}
      </ul>
    </div>
  );
}
