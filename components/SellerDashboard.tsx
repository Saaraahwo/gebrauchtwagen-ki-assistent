'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Car } from '@/lib/cars/types';
import type { InventoryStats } from '@/lib/cars/inventory-stats';
import type { SalesIntelligence } from '@/lib/cars/sales-intelligence';
import { StatCard } from './charts/StatCard';
import { BarRow } from './charts/BarRow';
import { ConditionBar } from './charts/ConditionBar';

export interface CarIntel {
  car: Car;
  intelligence: SalesIntelligence;
  condition: 'red' | 'orange' | 'green';
}

interface Props {
  sellerName: string;
  stats: InventoryStats;
  cars: CarIntel[];
}

const dot: Record<CarIntel['condition'], string> = {
  red: 'bg-flag-red',
  orange: 'bg-flag-orange',
  green: 'bg-flag-green',
};

export function SellerDashboard({ sellerName, stats, cars }: Props) {
  const router = useRouter();
  const [openId, setOpenId] = useState<number | null>(null);

  async function logout() {
    await fetch('/api/sellers/logout', { method: 'POST' });
    router.push('/login');
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

      {/* Fahrzeuge — Verkaufs-Briefing */}
      <section className="space-y-3">
        <h2 className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest">
          Fahrzeuge — Verkaufs-Briefing
        </h2>
        <div className="flex flex-col gap-2">
          {cars.map(({ car, intelligence, condition }) => {
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
                    <div>
                      <div className="text-xs font-bold text-bmw-blue mb-1">
                        🏁 Probefahrt: {intelligence.testDrive.headline}
                      </div>
                      <ol className="text-xs text-bmw-gray-text space-y-1 list-decimal list-inside">
                        {intelligence.testDrive.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                    </div>
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
