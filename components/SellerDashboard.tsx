'use client';

import { useState, useRef, useEffect } from 'react';
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
  chatQuestions?: { question: string; answer: string; ts: string }[];
}

interface Props {
  sellerName: string;
  stats: InventoryStats;
  cars: CarIntel[];
  topQuestions: { question: string; count: number; carName: string }[];
  bookings: { carId: number; carName: string; name: string; phone: string; preferredDate: string; ts: string }[];
}

type View = 'overview' | 'vehicles' | 'questions' | 'bookings';

const FONT = "'IBM Plex Sans', 'Inter', Arial, sans-serif";
const GRADIENT = 'linear-gradient(135deg, #1c69d4, #7c3aed)';

const STATUS = {
  red:    { label: 'Kritisch', bg: '#fef2f2', color: '#ef4444' },
  orange: { label: 'Hinweise', bg: '#fffbeb', color: '#d97706' },
  green:  { label: 'Gut',      bg: '#f0fdf4', color: '#16a34a' },
} as const;

// Coloured series for the bar charts (fuel / emissions), cycled by index.
const SERIES = [
  { dot: '#1c69d4', grad: 'linear-gradient(90deg,#1c69d4,#3b82f6)' },
  { dot: '#7c3aed', grad: 'linear-gradient(90deg,#7c3aed,#a78bfa)' },
  { dot: '#0891b2', grad: 'linear-gradient(90deg,#0891b2,#06b6d4)' },
  { dot: '#059669', grad: 'linear-gradient(90deg,#059669,#34d399)' },
  { dot: '#d97706', grad: 'linear-gradient(90deg,#d97706,#fbbf24)' },
  { dot: '#dc2626', grad: 'linear-gradient(90deg,#dc2626,#f87171)' },
];

// Coloured rank/per-car tiles, cycled by index.
const RANK = [
  { bg: '#eff6ff', color: '#1c69d4' },
  { bg: '#f5f3ff', color: '#7c3aed' },
  { bg: '#ecfeff', color: '#0891b2' },
  { bg: '#fffbeb', color: '#d97706' },
];

const NAV: { key: View; label: string }[] = [
  { key: 'overview',  label: 'Übersicht' },
  { key: 'vehicles',  label: 'Fahrzeuge' },
  { key: 'questions', label: 'Kundenfragen' },
  { key: 'bookings',  label: 'Probefahrten' },
];

function luminance(hex: string): number {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function darken(hex: string, f = 0.5): string {
  const m = hex.replace('#', '');
  const r = Math.round(parseInt(m.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(m.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(m.slice(4, 6), 16) * f);
  return `rgb(${r},${g},${b})`;
}

function headerGradient(hex?: string): string {
  if (hex && /^#[0-9a-fA-F]{6}$/.test(hex) && luminance(hex) < 0.6) {
    return `linear-gradient(135deg, ${darken(hex)}, ${hex})`;
  }
  return 'linear-gradient(135deg, #0d3c6e, #1c69d4)';
}

export function SellerDashboard({ sellerName, stats, cars, topQuestions, bookings }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>('overview');
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

  return (
    <div style={{ fontFamily: FONT, background: '#f4f6fb', minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0"
        style={{ width: 200, background: '#fff', boxShadow: '2px 0 16px rgba(0,0,0,0.07)', padding: '18px 12px' }}
      >
        <div className="flex items-center gap-2 mb-6 px-1">
          <div
            className="shrink-0"
            style={{ width: 34, height: 34, background: GRADIENT, borderRadius: 10, boxShadow: '0 4px 12px rgba(28,105,212,0.35)' }}
          />
          <div>
            <div className="font-extrabold leading-tight" style={{ color: '#1e293b', fontSize: 12 }}>BMW</div>
            <div style={{ color: '#94a3b8', fontSize: 9 }}>Verkäufer-Portal</div>
          </div>
        </div>

        <div
          className="px-2 mb-1 font-semibold uppercase"
          style={{ color: '#cbd5e1', fontSize: 8, letterSpacing: '0.1em' }}
        >
          Menü
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(item => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className="flex items-center gap-2.5 text-left transition-colors"
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: active ? '#f0f4ff' : 'transparent',
                  borderLeft: active ? '3px solid #1c69d4' : '3px solid transparent',
                }}
              >
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 14, height: 14, background: active ? '#dbeafe' : '#f1f5f9', borderRadius: 4 }}
                >
                  <span style={{ width: 6, height: 6, background: active ? '#1c69d4' : '#cbd5e1', borderRadius: 1 }} />
                </span>
                <span style={{ fontSize: 11, color: active ? '#1c69d4' : '#94a3b8', fontWeight: active ? 600 : 400 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-3.5 flex items-center gap-2" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div className="shrink-0" style={{ width: 28, height: 28, background: GRADIENT, borderRadius: '50%' }} />
          <div>
            <div className="font-semibold" style={{ color: '#1e293b', fontSize: 10 }}>{sellerName}</div>
            <button onClick={logout} style={{ color: '#ef4444', fontSize: 9 }} className="hover:underline">
              Abmelden
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto" style={{ padding: '22px 24px' }}>
        {view === 'overview' && (
          <OverviewView stats={stats} cars={cars} onDeleteData={deleteData} />
        )}
        {view === 'vehicles' && (
          <VehiclesView cars={cars} openId={openId} setOpenId={setOpenId} />
        )}
        {view === 'questions' && (
          <QuestionsView topQuestions={topQuestions} />
        )}
        {view === 'bookings' && (
          <BookingsView bookings={bookings} />
        )}
      </main>
    </div>
  );
}

/* ---------- Shared bits ---------- */

function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center" style={{ marginBottom: 18 }}>
      <div>
        <div className="font-extrabold" style={{ color: '#1e293b', fontSize: 18 }}>{title}</div>
        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{subtitle}</div>
      </div>
      {actions && <div className="flex gap-2 items-center">{actions}</div>}
    </div>
  );
}

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white ${className}`}
      style={{ borderRadius: 14, padding: 16, boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}
    >
      {title && (
        <div className="font-bold" style={{ color: '#1e293b', fontSize: 12, marginBottom: 12 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 14px', fontSize: 11, color: '#64748b', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      className="hover:bg-slate-50 transition-colors"
    >
      {children}
    </button>
  );
}

function GradientLink({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      download
      style={{ background: GRADIENT, borderRadius: 8, padding: '7px 14px', fontSize: 11, color: '#fff', fontWeight: 600, boxShadow: '0 4px 12px rgba(28,105,212,0.3)' }}
      className="hover:opacity-90 transition-opacity"
    >
      {children}
    </a>
  );
}

/* ---------- Overview ---------- */

function OverviewView({ stats, cars, onDeleteData }: { stats: InventoryStats; cars: CarIntel[]; onDeleteData: () => void }) {
  const priceMax = Math.max(...stats.priceBuckets.map(b => b.count), 1);
  const fuelMax = Math.max(...stats.fuelMix.map(b => b.count), 1);
  const emissionMax = Math.max(...stats.emissionMix.map(b => b.count), 1);

  return (
    <>
      <PageHeader
        title="Übersicht"
        subtitle={`BMW Niederlassung · Alle ${cars.length} Fahrzeuge aktiv`}
        actions={
          <>
            <GhostButton onClick={onDeleteData}>Daten löschen</GhostButton>
            <GradientLink href="/api/sellers/faq-pack">FAQ exportieren</GradientLink>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 16 }}>
        <StatCard
          label="Fahrzeuge gesamt"
          value={String(stats.total)}
          iconBg="#eff6ff" dotColor="#1c69d4" shadowColor="rgba(28,105,212,0.10)"
        />
        <StatCard
          label="Durchschnittspreis"
          value={`${stats.avgPrice.toLocaleString('de-DE')} €`}
          iconBg="#f5f3ff" dotColor="#7c3aed" shadowColor="rgba(124,58,237,0.10)"
        />
        <StatCard
          label="Ø Kilometer"
          value={stats.avgKm.toLocaleString('de-DE')}
          iconBg="#ecfeff" dotColor="#06b6d4" shadowColor="rgba(6,182,212,0.10)"
        />
        <StatCard
          label="Ø Fahrzeugalter"
          value={`${stats.avgAge} Jahre`}
          iconBg="#fffbeb" dotColor="#f59e0b" shadowColor="rgba(245,158,11,0.10)"
        />
      </div>

      {/* Row 2: price + fleet health */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3" style={{ marginBottom: 12 }}>
        <Card title="Preisverteilung">
          <div className="flex flex-col gap-2">
            {stats.priceBuckets.map((b, i) => (
              <BarRow
                key={b.label}
                label={b.label}
                count={b.count}
                max={priceMax}
                gradient={SERIES[i % SERIES.length].grad}
                labelWidth={92}
              />
            ))}
          </div>
        </Card>
        <Card title="Flottengesundheit">
          <ConditionBar red={stats.condition.red} orange={stats.condition.orange} green={stats.condition.green} />
        </Card>
      </div>

      {/* Row 3: fuel + emissions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ marginBottom: 12 }}>
        <Card title="Kraftstoffmix">
          <div className="flex flex-col gap-2">
            {stats.fuelMix.map((b, i) => (
              <BarRow
                key={b.label}
                label={b.label}
                count={b.count}
                max={fuelMax}
                gradient={SERIES[i % SERIES.length].grad}
                dot={SERIES[i % SERIES.length].dot}
                labelWidth={64}
              />
            ))}
          </div>
        </Card>
        <Card title="Abgasnormen">
          <div className="flex flex-col gap-2">
            {stats.emissionMix.map((b, i) => (
              <BarRow
                key={b.label}
                label={b.label}
                count={b.count}
                max={emissionMax}
                gradient={SERIES[i % SERIES.length].grad}
                dot={SERIES[i % SERIES.length].dot}
                labelWidth={64}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Anomalies */}
      <Card title="Häufigste Auffälligkeiten in der Flotte">
        {stats.topAnomalies.length ? (
          <div className="flex flex-col gap-2">
            {stats.topAnomalies.map((a, i) => (
              <BarRow
                key={a.flag}
                label={a.title}
                count={a.count}
                max={Math.max(...stats.topAnomalies.map(x => x.count), 1)}
                gradient={SERIES[i % SERIES.length].grad}
                labelWidth={200}
              />
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8', fontSize: 11 }}>Keine Auffälligkeiten erfasst.</p>
        )}
      </Card>
    </>
  );
}

/* ---------- Vehicles ---------- */

function VehiclesView({ cars, openId, setOpenId }: { cars: CarIntel[]; openId: number | null; setOpenId: (id: number | null) => void }) {
  const selected = cars.find(c => c.car.id === openId);
  const briefingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openId !== null) {
      briefingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [openId]);

  return (
    <>
      <PageHeader title="Fahrzeuge" subtitle={`${cars.length} Fahrzeuge · Verkaufs-Briefing`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {cars.map(({ car, condition }) => {
          const s = STATUS[condition];
          const ps = car.specs ? `${car.specs.powerPs} PS` : car.enginePower;
          const year = car.erstzulassung ?? String(car.yearBuilt);
          const open = openId === car.id;
          return (
            <button
              key={car.id}
              onClick={() => setOpenId(open ? null : car.id)}
              className="text-left bg-white overflow-hidden transition-shadow hover:shadow-lg"
              style={{ borderRadius: 14, boxShadow: open ? '0 8px 24px rgba(28,105,212,0.18)' : '0 4px 18px rgba(0,0,0,0.07)', outline: open ? '2px solid #1c69d4' : 'none' }}
            >
              <div
                className="relative flex items-center justify-center"
                style={{ height: 80, background: headerGradient(car.colorHex) }}
              >
                <span
                  className="font-extrabold uppercase"
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}
                >
                  {car.name}
                </span>
                <span
                  className="absolute font-bold"
                  style={{ top: 8, right: 8, background: s.bg, color: s.color, fontSize: 8, padding: '2px 8px', borderRadius: 20 }}
                >
                  {s.label}
                </span>
                {car.badge && (
                  <span
                    className="absolute font-bold"
                    style={{ top: 8, left: 8, background: '#fbbf24', color: '#fff', fontSize: 8, padding: '2px 8px', borderRadius: 20 }}
                  >
                    {car.badge}
                  </span>
                )}
              </div>
              <div style={{ padding: 12 }}>
                <div className="font-bold" style={{ color: '#1e293b', fontSize: 12 }}>{car.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 1 }}>
                  {car.km.toLocaleString('de-DE')} km · {year}
                </div>
                <div className="flex justify-between items-center" style={{ marginTop: 10 }}>
                  <div className="font-extrabold" style={{ color: '#1c69d4', fontSize: 15 }}>
                    {car.price.toLocaleString('de-DE')} €
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 9 }}>{ps ? `${ps} · ` : ''}{car.fuel}</div>
                </div>
                <div className="flex gap-1.5" style={{ marginTop: 10 }}>
                  <span style={{ background: '#eff6ff', color: '#1c69d4', fontSize: 8, fontWeight: 600, padding: '2px 7px', borderRadius: 5 }}>
                    {car.owners} {car.owners === 1 ? 'Besitzer' : 'Besitzer'}
                  </span>
                  <span style={{ background: '#f0fdf4', color: '#16a34a', fontSize: 8, fontWeight: 600, padding: '2px 7px', borderRadius: 5 }}>
                    {car.maintenanceRecords} Service
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div ref={briefingRef} style={{ marginTop: 14, scrollMarginTop: 16 }}>
          <CarBriefing intel={selected} onClose={() => setOpenId(null)} />
        </div>
      )}
    </>
  );
}

function CarBriefing({ intel, onClose }: { intel: CarIntel; onClose: () => void }) {
  const { car, intelligence, disclosure, chatQuestions } = intel;
  return (
    <div className="bg-white" style={{ borderRadius: 14, padding: 20, boxShadow: '0 4px 18px rgba(0,0,0,0.08)' }}>
      <div className="flex justify-between items-start" style={{ marginBottom: 16 }}>
        <div>
          <div className="font-extrabold" style={{ color: '#1e293b', fontSize: 16 }}>{car.name}</div>
          {car.subtitle && <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{car.subtitle}</div>}
        </div>
        <button onClick={onClose} style={{ color: '#94a3b8', fontSize: 11 }} className="hover:text-slate-600">
          Schließen ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <IntelSection title="Starke Verkaufsargumente" items={intelligence.strengths}         color="#16a34a" />
        <IntelSection title="Kaufhemmnisse"            items={intelligence.concerns}          color="#d97706" />
        <IntelSection title="Erwartete Kundenfragen"   items={intelligence.customerQuestions} color="#1c69d4" />
        <ChatSection questions={chatQuestions ?? []} />
      </div>

      {/* Test drive */}
      <div className="border-t" style={{ borderColor: '#f1f5f9', paddingTop: 20, marginTop: 20 }}>
        <div className="font-semibold uppercase" style={{ color: '#1c69d4', fontSize: 10, letterSpacing: '0.12em', marginBottom: 4 }}>
          Probefahrt-Drehbuch
        </div>
        <div className="font-semibold" style={{ color: '#1e293b', fontSize: 13, marginBottom: 8 }}>
          {intelligence.testDrive.headline}
        </div>
        <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
          {intelligence.testDrive.route.description}{' '}
          <a href={intelligence.testDrive.route.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1c69d4' }} className="hover:underline">
            Route in Google Maps
          </a>
          <span style={{ color: '#94a3b8' }}> · Beispielroute</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            {intelligence.testDrive.legs.map((leg, i) => (
              <div key={i}>
                <div className="font-semibold" style={{ color: '#334155', fontSize: 11, marginBottom: 4 }}>{leg.leg}</div>
                <ul className="space-y-0.5">
                  {leg.actions.map((a, j) => (
                    <li key={j} className="flex gap-2 items-start" style={{ color: '#64748b', fontSize: 11 }}>
                      <span className="shrink-0" style={{ color: '#cbd5e1', marginTop: 2 }}>—</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {intelligence.testDrive.featureDemos.length > 0 && (
            <div>
              <div className="font-semibold" style={{ color: '#334155', fontSize: 11, marginBottom: 8 }}>
                Ausstattung demonstrieren
              </div>
              <div className="space-y-1.5">
                {intelligence.testDrive.featureDemos.map((f, i) => (
                  <div key={i} style={{ fontSize: 11 }}>
                    <span className="font-semibold" style={{ color: '#475569' }}>{f.feature}:</span>{' '}
                    <span style={{ color: '#64748b' }}>{f.when}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disclosure */}
      {disclosure.some(d => !d.ok) && (
        <div className="border-t" style={{ borderColor: '#f1f5f9', paddingTop: 16, marginTop: 16 }}>
          <div className="font-semibold uppercase" style={{ color: '#d97706', fontSize: 10, letterSpacing: '0.12em', marginBottom: 8 }}>
            Offene Pflichtangaben
          </div>
          <div className="space-y-1">
            {disclosure.filter(d => !d.ok).map((d, i) => (
              <div key={i} className="flex gap-2 items-start" style={{ color: '#64748b', fontSize: 11 }}>
                <span className="shrink-0" style={{ color: '#fca5a5' }}>✗</span>
                <span>{d.item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Equipment */}
      {intelligence.equipment.length > 0 && (
        <div className="border-t" style={{ borderColor: '#f1f5f9', paddingTop: 16, marginTop: 16 }}>
          <div className="font-semibold uppercase" style={{ color: '#1c69d4', fontSize: 10, letterSpacing: '0.12em', marginBottom: 12 }}>
            Ausstattung — Kundenantworten
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {intelligence.equipment.map((e, i) => (
              <div key={i}>
                <div className="font-semibold" style={{ color: '#334155', fontSize: 11, marginBottom: 2 }}>{e.term}</div>
                <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.6 }}>{e.answer}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Questions ---------- */

function QuestionsView({ topQuestions }: { topQuestions: { question: string; count: number; carName: string }[] }) {
  const perCar = Object.values(
    topQuestions.reduce<Record<string, { carName: string; count: number }>>((acc, q) => {
      acc[q.carName] = acc[q.carName] ?? { carName: q.carName, count: 0 };
      acc[q.carName].count += q.count;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  const totalQuestions = topQuestions.reduce((s, q) => s + q.count, 0);

  return (
    <>
      <PageHeader
        title="Kundenfragen"
        subtitle={`${totalQuestions} ${totalQuestions === 1 ? 'Frage' : 'Fragen'} erfasst`}
        actions={<GradientLink href="/api/sellers/faq-pack">FAQ Export</GradientLink>}
      />

      <div className="flex flex-col gap-3">
        <Card title="Häufigste Fragen">
          {topQuestions.length ? (
            <div className="flex flex-col">
              {topQuestions.map((q, i) => {
                const c = RANK[i % RANK.length];
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2.5"
                    style={{ padding: '8px 0', borderBottom: i < topQuestions.length - 1 ? '1px solid #f8fafc' : 'none' }}
                  >
                    <div
                      className="flex items-center justify-center shrink-0 font-extrabold"
                      style={{ width: 18, height: 18, background: c.bg, color: c.color, borderRadius: 5, fontSize: 9 }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ color: '#1e293b', fontSize: 12, fontWeight: 500 }}>{q.question}</div>
                      <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 1 }}>{q.carName}</div>
                    </div>
                    <div
                      className="shrink-0 font-bold"
                      style={{ background: c.bg, color: c.color, fontSize: 10, padding: '2px 8px', borderRadius: 20 }}
                    >
                      {q.count}×
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: 11 }}>Noch keine Fragen erfasst.</p>
          )}
        </Card>

        {perCar.length > 0 && (
          <Card title="Fragen pro Fahrzeug">
            <div className="flex flex-wrap gap-1.5">
              {perCar.map((p, i) => {
                const c = RANK[i % RANK.length];
                return (
                  <div
                    key={p.carName}
                    className="text-center"
                    style={{ background: c.bg, borderRadius: 8, padding: '6px 10px', minWidth: 72 }}
                  >
                    <div className="font-extrabold" style={{ color: c.color, fontSize: 13 }}>{p.count}</div>
                    <div style={{ color: '#64748b', fontSize: 9, marginTop: 1 }}>{p.carName}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

/* ---------- Bookings ---------- */

function BookingsView({ bookings }: { bookings: Props['bookings'] }) {
  return (
    <>
      <PageHeader title="Probefahrten" subtitle="Eingehende Anfragen" />

      {bookings.length === 0 ? (
        <Card>
          <div className="text-center" style={{ padding: '16px 0' }}>
            <div
              className="flex items-center justify-center"
              style={{ width: 40, height: 40, background: '#f1f5f9', borderRadius: 10, margin: '0 auto 10px' }}
            >
              <div style={{ width: 16, height: 16, background: '#cbd5e1', borderRadius: 3 }} />
            </div>
            <div className="font-semibold" style={{ color: '#1e293b', fontSize: 12, marginBottom: 3 }}>Keine Anfragen</div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>
              Probefahrt-Anfragen erscheinen hier, sobald Kunden das Formular ausfüllen.
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bookings.map((b, i) => (
            <Card key={i}>
              <div className="flex items-center gap-2.5" style={{ marginBottom: 10 }}>
                <div className="shrink-0" style={{ width: 30, height: 30, background: GRADIENT, borderRadius: 8 }} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold" style={{ color: '#1e293b', fontSize: 12 }}>{b.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: 10 }}>{b.phone}</div>
                </div>
                <div
                  className="font-bold shrink-0"
                  style={{ background: '#f0fdf4', color: '#16a34a', fontSize: 8, padding: '2px 8px', borderRadius: 20 }}
                >
                  Neu
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span style={{ background: '#eff6ff', color: '#1c69d4', fontSize: 9, fontWeight: 500, padding: '4px 8px', borderRadius: 6 }}>
                  {b.carName}
                </span>
                <span style={{ background: '#f8fafc', color: '#64748b', fontSize: 9, padding: '4px 8px', borderRadius: 6 }}>
                  Wunsch: {b.preferredDate}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------- Briefing sub-sections ---------- */

function IntelSection({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="shrink-0" style={{ width: 2, height: 14, background: color }} />
        <div className="font-semibold uppercase" style={{ color, fontSize: 10, letterSpacing: '0.1em' }}>{title}</div>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 items-start" style={{ color: '#64748b', fontSize: 12 }}>
            <span className="shrink-0" style={{ color: '#cbd5e1', marginTop: 2 }}>—</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChatSection({ questions }: { questions: { question: string; answer: string; ts: string }[] }) {
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setOpenIdx(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="shrink-0" style={{ width: 2, height: 14, background: '#64748b' }} />
        <div className="font-semibold uppercase" style={{ color: '#64748b', fontSize: 10, letterSpacing: '0.1em' }}>
          Fragen der Kunden zum Auto
        </div>
      </div>
      {questions.length > 0 ? (
        <div className="space-y-1.5">
          {questions.map((q, i) => {
            const open = openIdx.has(i);
            return (
              <div key={i} style={{ borderLeft: `2px solid ${open ? '#1c69d4' : '#e2e8f0'}` }}>
                <button onClick={() => toggle(i)} className="w-full text-left flex items-start justify-between gap-2" style={{ paddingLeft: 10, paddingTop: 2, paddingBottom: 2 }}>
                  <div className="font-semibold" style={{ color: '#475569', fontSize: 11 }}>{q.question}</div>
                  <div className="shrink-0 font-medium whitespace-nowrap" style={{ color: open ? '#1c69d4' : '#94a3b8', fontSize: 9, marginTop: 2 }}>
                    {open ? 'Antwort schließen ▲' : 'Antwort vom KI-Chat ▼'}
                  </div>
                </button>
                {open && (
                  <div style={{ paddingLeft: 10, paddingBottom: 6, color: '#94a3b8', fontSize: 11, lineHeight: 1.6 }}>
                    {q.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: '#cbd5e1', fontSize: 12 }}>Keine Chat-Fragen zu diesem Fahrzeug.</p>
      )}
    </div>
  );
}
