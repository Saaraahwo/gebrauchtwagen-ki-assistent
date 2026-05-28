# UI & Chat Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real car photos with SVG fallback, redesign the detail page to BMW.de layout A with a neutral KI-Analyse modal, convert chat to a floating bubble popup with markdown rendering, and make all chat/analysis responses solution-oriented rather than scary.

**Architecture:** All changes are in `components/`, `lib/ai/`, and `lib/cars/types.ts`. No route handler changes. `CarDetail` owns the KI-Analyse modal state. `ChatWidget` is a standalone fixed-position bubble. `AnalysisPanel` is a modal component rendered from inside `CarDetail`.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4 (`bg-bmw-blue`, `text-bmw-gray-muted`, `border-bmw-gray-border` etc. from `globals.css @theme`), Vitest for the one testable unit change (`demo-chat.ts`).

**Commit convention:** No `Co-Authored-By` trailer.

---

## File map

| File | Change |
|------|--------|
| `data/cars.json` | Fix car #12 broken image URL |
| `lib/cars/types.ts` | Add 9 optional fields to `Car` |
| `components/CarSVG.tsx` | New — SVG sedan/suv/cabrio silhouette |
| `components/CarCard.tsx` | Real photo + SVG fallback + badge chip |
| `components/CarDetail.tsx` | Full rewrite — gallery + 2-col layout + KI modal trigger |
| `components/AnalysisPanel.tsx` | Convert to neutral modal popup |
| `components/ChatWidget.tsx` | Convert to floating bubble + popup + `renderMarkdown` |
| `app/cars/[id]/page.tsx` | Simplified — `CarDetail` + `ChatWidget` only |
| `lib/ai/demo-analysis.ts` | Remove SCHRITT headers, rewrite as natural paragraphs |
| `lib/ai/demo-chat.ts` | Add negotiation trigger; make responses solution-oriented |

---

## Phase 1 — Data and Types

### Task 1: Fix car #12 image + extend Car type

**Files:**
- Modify: `data/cars.json` (car id 12 only)
- Modify: `lib/cars/types.ts`

- [ ] **Step 1: Fix car #12 imgExterior in data/cars.json**

Find the entry with `"id": 12` and replace the broken local path:

```json
"imgExterior": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80&auto=format&fit=crop",
```

(The `colorHex` for car #12 is `#ffb3c6` — if the URL fails to load, the pink SVG fallback will display automatically.)

- [ ] **Step 2: Add optional fields to Car interface**

In `lib/cars/types.ts`, add these optional fields after `interiorColor`:

```typescript
  colorHex?: string;
  imgExterior?: string;
  imgInterior?: string;
  erstzulassung?: string;
  drive?: string;
  hu?: string;
  doors?: number;
  seats?: number;
  badge?: string;
  description?: string;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. All new fields are optional so existing test fixtures are unchanged.

- [ ] **Step 4: Run tests to confirm nothing broke**

```bash
npm run test:run
```

Expected: 48 tests pass.

- [ ] **Step 5: Commit**

```bash
git add data/cars.json lib/cars/types.ts
git commit -m "Extend Car type with image/detail fields, fix car #12 photo URL"
```

---

## Phase 2 — Components

### Task 2: CarSVG component

**Files:**
- Create: `components/CarSVG.tsx`

- [ ] **Step 1: Create the component**

`components/CarSVG.tsx`:
```typescript
interface CarSVGProps {
  color?: string;
  type?: 'sedan' | 'suv' | 'cabrio';
}

export function CarSVG({ color = '#2a4a7a', type = 'sedan' }: CarSVGProps) {
  const body = color;
  const glass = '#b3d4f0';
  const wheel = '#222';
  const rim = '#aaa';

  if (type === 'suv') return (
    <svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect x="30" y="80" width="300" height="68" rx="6" fill={body} />
      <path d="M 60 80 Q 70 38 120 34 L 260 34 Q 300 36 310 80 Z" fill={body} />
      <path d="M 72 78 Q 82 46 122 42 L 258 42 Q 292 44 300 78 Z" fill={glass} opacity="0.7" />
      <rect x="158" y="42" width="3" height="36" fill="#1a1a2a" opacity="0.4" />
      <rect x="26" y="90" width="14" height="28" rx="2" fill="#e53935" />
      <rect x="320" y="90" width="14" height="28" rx="2" fill="#fff9c4" />
      <ellipse cx="85" cy="148" rx="26" ry="26" fill={wheel} /><ellipse cx="85" cy="148" rx="15" ry="15" fill={rim} /><ellipse cx="85" cy="148" rx="5" ry="5" fill={wheel} />
      <ellipse cx="275" cy="148" rx="26" ry="26" fill={wheel} /><ellipse cx="275" cy="148" rx="15" ry="15" fill={rim} /><ellipse cx="275" cy="148" rx="5" ry="5" fill={wheel} />
    </svg>
  );

  if (type === 'cabrio') return (
    <svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect x="30" y="95" width="300" height="58" rx="6" fill={body} />
      <path d="M 80 95 Q 100 60 160 56 Q 220 52 270 95 Z" fill={body} />
      <path d="M 88 93 Q 106 64 160 62 Q 218 60 264 93 Z" fill={glass} opacity="0.6" />
      <rect x="26" y="104" width="12" height="22" rx="2" fill="#e53935" />
      <rect x="322" y="104" width="12" height="22" rx="2" fill="#fff9c4" />
      <ellipse cx="88" cy="153" rx="24" ry="24" fill={wheel} /><ellipse cx="88" cy="153" rx="13" ry="13" fill={rim} /><ellipse cx="88" cy="153" rx="5" ry="5" fill={wheel} />
      <ellipse cx="272" cy="153" rx="24" ry="24" fill={wheel} /><ellipse cx="272" cy="153" rx="13" ry="13" fill={rim} /><ellipse cx="272" cy="153" rx="5" ry="5" fill={wheel} />
    </svg>
  );

  return (
    <svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <rect x="22" y="95" width="316" height="58" rx="6" fill={body} />
      <path d="M 62 95 Q 80 52 138 46 L 230 46 Q 285 46 306 95 Z" fill={body} />
      <path d="M 74 93 Q 90 56 138 50 L 230 50 Q 278 50 296 93 Z" fill={glass} opacity="0.65" />
      <rect x="183" y="50" width="3" height="43" fill="#1a1a2a" opacity="0.35" />
      <rect x="18" y="104" width="14" height="24" rx="2" fill="#e53935" />
      <rect x="328" y="104" width="14" height="24" rx="2" fill="#fff9c4" />
      <ellipse cx="82" cy="153" rx="25" ry="25" fill={wheel} /><ellipse cx="82" cy="153" rx="14" ry="14" fill={rim} /><ellipse cx="82" cy="153" rx="5" ry="5" fill={wheel} />
      <ellipse cx="278" cy="153" rx="25" ry="25" fill={wheel} /><ellipse cx="278" cy="153" rx="14" ry="14" fill={rim} /><ellipse cx="278" cy="153" rx="5" ry="5" fill={wheel} />
    </svg>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/CarSVG.tsx
git commit -m "Add CarSVG component (sedan/suv/cabrio silhouettes)"
```

---

### Task 3: Update CarCard — real photos + badge + SVG fallback

**Files:**
- Modify: `components/CarCard.tsx`

- [ ] **Step 1: Rewrite CarCard.tsx**

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Car } from '@/lib/cars/types';
import { CarSVG } from './CarSVG';

function svgType(name: string): 'sedan' | 'suv' | 'cabrio' {
  if (/X[0-9]|iX/i.test(name)) return 'suv';
  if (/Cabriolet|Z4/i.test(name)) return 'cabrio';
  return 'sedan';
}

export function CarCard({ car }: { car: Car }) {
  const [imgError, setImgError] = useState(false);
  const hasAccidents = (car.accidents?.length ?? 0) > 0;

  return (
    <Link
      href={`/cars/${car.id}`}
      className="bg-white border border-bmw-gray-border block hover:shadow-lg transition-shadow"
    >
      <div className="relative h-[190px] overflow-hidden">
        {car.imgExterior && !imgError ? (
          <img
            src={car.imgExterior}
            alt={car.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-4"
            style={{
              background: `linear-gradient(135deg, ${car.colorHex ?? '#e5e5e5'}20, ${car.colorHex ?? '#e5e5e5'}50)`,
            }}
          >
            <CarSVG color={car.colorHex} type={svgType(car.name)} />
          </div>
        )}
        <span className={`absolute top-2.5 left-2.5 text-white text-[10px] font-bold px-2 py-0.5 tracking-wide ${car.badge ? 'bg-flag-green' : 'bg-bmw-blue'}`}>
          {car.badge ?? 'GEBRAUCHTWAGEN'}
        </span>
        {hasAccidents && (
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-flag-red border border-white/60" />
        )}
      </div>
      <div className="px-3.5 pt-3.5">
        <div className="text-[10px] text-bmw-gray-muted uppercase tracking-wider mb-1">BMW Niederlassung</div>
        <div className="text-sm font-bold text-bmw-dark leading-tight">{car.name}</div>
        {car.subtitle && <div className="text-xs text-bmw-gray-text mt-0.5">{car.subtitle}</div>}
        <div className="text-xl font-bold text-bmw-dark mt-2.5">
          {car.price.toLocaleString('de-DE')} <span className="text-xs font-normal text-bmw-gray-muted">€</span>
        </div>
      </div>
      <div className="px-3.5 py-3 text-xs text-bmw-gray-text border-t border-gray-100 mt-3 flex justify-between">
        <span>{car.km.toLocaleString('de-DE')} km</span>
        <span>EZ {car.erstzulassung ?? car.yearBuilt}</span>
        <span>{car.enginePower ?? ''}</span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/CarCard.tsx
git commit -m "CarCard: real photos, SVG color fallback, dynamic badge"
```

---

### Task 4: Rewrite CarDetail — BMW.de Layout A

**Files:**
- Modify: `components/CarDetail.tsx`

- [ ] **Step 1: Rewrite CarDetail.tsx**

```typescript
'use client';

import { useState } from 'react';
import type { Car } from '@/lib/cars/types';
import { CarSVG } from './CarSVG';
import { AnalysisPanel } from './AnalysisPanel';

function svgType(name: string): 'sedan' | 'suv' | 'cabrio' {
  if (/X[0-9]|iX/i.test(name)) return 'suv';
  if (/Cabriolet|Z4/i.test(name)) return 'cabrio';
  return 'sedan';
}

export function CarDetail({ car }: { car: Car }) {
  const [activeImg, setActiveImg] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [showAnalysis, setShowAnalysis] = useState(false);

  const slides = [
    { url: car.imgExterior, label: 'Exterieur' },
    { url: car.imgInterior, label: 'Interieur' },
  ].filter((s): s is { url: string; label: string } => !!s.url);

  const currentUrl = slides[activeImg]?.url;
  const hasImgError = imgErrors[activeImg];

  return (
    <>
      {/* Full-width gallery */}
      <div className="relative h-[340px] bg-bmw-dark overflow-hidden">
        {currentUrl && !hasImgError ? (
          <img
            src={currentUrl}
            alt={car.name}
            className="w-full h-full object-cover"
            onError={() => setImgErrors(e => ({ ...e, [activeImg]: true }))}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ background: `linear-gradient(135deg, ${car.colorHex ?? '#333'}20, ${car.colorHex ?? '#333'}50)` }}
          >
            <CarSVG color={car.colorHex} type={svgType(car.name)} />
          </div>
        )}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-12 h-8 overflow-hidden border-2 rounded-sm transition-colors ${i === activeImg ? 'border-bmw-blue' : 'border-white/40'}`}
              >
                <img src={s.url} alt={s.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {slides.length > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/55 text-white text-[10px] px-2 py-1 rounded-full">
            {slides[activeImg]?.label} {activeImg + 1} / {slides.length}
          </div>
        )}
      </div>

      {/* 2-col layout */}
      <div className="max-w-layout mx-auto px-6 py-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-4">

          {/* Title card */}
          <div className="bg-white border border-bmw-gray-border p-4">
            <div className="text-[9px] text-bmw-gray-muted uppercase tracking-wider mb-1">BMW Niederlassung</div>
            <h1 className="text-xl font-bold">{car.name}</h1>
            {car.subtitle && <div className="text-sm text-bmw-gray-text mt-0.5">{car.subtitle}</div>}
            <div className="flex flex-wrap gap-1.5 mt-3 items-center">
              <span className="bg-bmw-gray-bg border border-bmw-gray-border text-xs px-2 py-0.5 rounded-sm">{car.km.toLocaleString('de-DE')} km</span>
              <span className="bg-bmw-gray-bg border border-bmw-gray-border text-xs px-2 py-0.5 rounded-sm">EZ {car.erstzulassung ?? car.yearBuilt}</span>
              {car.enginePower && <span className="bg-bmw-gray-bg border border-bmw-gray-border text-xs px-2 py-0.5 rounded-sm">{car.enginePower}</span>}
              {car.fuel && <span className="bg-bmw-gray-bg border border-bmw-gray-border text-xs px-2 py-0.5 rounded-sm">{car.fuel}</span>}
              {car.colorHex && (
                <span className="w-3.5 h-3.5 rounded-full border border-black/20 inline-block flex-shrink-0" style={{ background: car.colorHex }} />
              )}
              {car.color && <span className="text-xs text-bmw-gray-text">{car.color}</span>}
              {car.badge && <span className="bg-flag-green text-white text-[9px] font-bold px-1.5 py-0.5 tracking-wide">{car.badge}</span>}
            </div>
            {car.accidents.length > 0 && (
              <div className="mt-2 text-xs text-bmw-gray-muted">
                {car.accidents.length} Unfall{car.accidents.length > 1 ? 'schäden' : ''} repariert
                {car.accidents.reduce((s, a) => s + (a.repairCost ?? 0), 0) > 0 &&
                  ` · Reparatur: ${car.accidents.reduce((s, a) => s + (a.repairCost ?? 0), 0).toLocaleString('de-DE')} €`}
              </div>
            )}
            {car.description && (
              <div className="mt-2.5 text-xs text-bmw-gray-text italic border-t border-bmw-gray-bg pt-2.5">{car.description}</div>
            )}
          </div>

          {/* Tech specs */}
          <div className="bg-white border border-bmw-gray-border p-4">
            <h2 className="text-sm font-bold mb-3">Technische Daten</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <dt className="text-bmw-gray-muted">Kilometerstand</dt><dd className="font-medium">{car.km.toLocaleString('de-DE')} km</dd>
              {car.erstzulassung && <><dt className="text-bmw-gray-muted">Erstzulassung</dt><dd className="font-medium">{car.erstzulassung}</dd></>}
              <dt className="text-bmw-gray-muted">Baujahr</dt><dd className="font-medium">{car.yearBuilt}</dd>
              <dt className="text-bmw-gray-muted">Vorbesitzer</dt><dd className="font-medium">{car.owners}</dd>
              <dt className="text-bmw-gray-muted">Service-Einträge</dt><dd className="font-medium">{car.maintenanceRecords}</dd>
              {car.hu && <><dt className="text-bmw-gray-muted">HU bis</dt><dd className="font-medium">{car.hu}</dd></>}
              {car.fuel && <><dt className="text-bmw-gray-muted">Kraftstoff</dt><dd className="font-medium">{car.fuel}</dd></>}
              {car.transmission && <><dt className="text-bmw-gray-muted">Getriebe</dt><dd className="font-medium">{car.transmission}</dd></>}
              {car.enginePower && <><dt className="text-bmw-gray-muted">Leistung</dt><dd className="font-medium">{car.enginePower}</dd></>}
              {car.drive && <><dt className="text-bmw-gray-muted">Antrieb</dt><dd className="font-medium">{car.drive}</dd></>}
              {car.consumption && <><dt className="text-bmw-gray-muted">Verbrauch</dt><dd className="font-medium">{car.consumption} l/100km</dd></>}
              {car.emission && <><dt className="text-bmw-gray-muted">Abgasnorm</dt><dd className="font-medium">{car.emission}</dd></>}
              {car.doors && <><dt className="text-bmw-gray-muted">Türen / Sitze</dt><dd className="font-medium">{car.doors} / {car.seats ?? '–'}</dd></>}
              {car.color && <><dt className="text-bmw-gray-muted">Farbe</dt><dd className="font-medium">{car.color}</dd></>}
              {car.polster && <><dt className="text-bmw-gray-muted">Polster</dt><dd className="font-medium">{car.polster}</dd></>}
              {car.interiorColor && <><dt className="text-bmw-gray-muted">Innenfarbe</dt><dd className="font-medium">{car.interiorColor}</dd></>}
            </dl>
          </div>

          {/* Features */}
          {car.features.length > 0 && (
            <div className="bg-white border border-bmw-gray-border p-4">
              <h2 className="text-sm font-bold mb-3">Ausstattung</h2>
              <ul className="grid grid-cols-2 gap-y-1 text-xs">
                {car.features.map(f => (
                  <li key={f} className="text-bmw-dark">
                    <span className="text-bmw-blue mr-1">·</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right sticky sidebar */}
        <div className="lg:sticky lg:top-4 flex flex-col gap-4">
          <div className="bg-white border border-bmw-gray-border p-4">
            <div className="text-2xl font-bold">{car.price.toLocaleString('de-DE')} €</div>
            <div className="text-xs text-bmw-gray-muted mt-1">
              {car.km.toLocaleString('de-DE')} km · EZ {car.erstzulassung ?? car.yearBuilt}
            </div>
            <button
              onClick={() => setShowAnalysis(true)}
              className="w-full mt-4 py-3 bg-bmw-blue text-white font-semibold text-sm hover:bg-blue-700 rounded-sm transition-colors"
            >
              🤖 KI-Analyse starten
            </button>
            <button className="w-full mt-2 py-2.5 border border-bmw-gray-border text-sm rounded-sm hover:bg-bmw-gray-bg text-bmw-dark transition-colors">
              Probefahrt vereinbaren
            </button>
          </div>
        </div>
      </div>

      {/* KI-Analyse modal — rendered from this component, controlled by local state */}
      {showAnalysis && <AnalysisPanel car={car} onClose={() => setShowAnalysis(false)} />}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/CarDetail.tsx
git commit -m "CarDetail: BMW.de layout A — gallery, title card, specs, sticky sidebar"
```

---

### Task 5: AnalysisPanel — neutral modal popup

**Files:**
- Modify: `components/AnalysisPanel.tsx`

- [ ] **Step 1: Rewrite AnalysisPanel.tsx**

```typescript
'use client';

import { useEffect, useState } from 'react';
import type { Car, Findings, Anomaly, PriceAmpel } from '@/lib/cars/types';

interface AnalysisData {
  carData: Car;
  findings: Findings;
  auffaelligkeiten: Anomaly[];
  preisAmpel: PriceAmpel;
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
            <h2 className="text-base font-bold">KI-Analyse — {car.name}</h2>
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
        <div className="sticky bottom-0 bg-white border-t border-bmw-gray-border px-5 py-3 text-right">
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/AnalysisPanel.tsx
git commit -m "AnalysisPanel: neutral modal popup — summary bar, blue-line findings, chat nudge"
```

---

### Task 6: ChatWidget — floating bubble + popup + renderMarkdown

**Files:**
- Modify: `components/ChatWidget.tsx`

- [ ] **Step 1: Rewrite ChatWidget.tsx**

```typescript
'use client';

import { useState } from 'react';
import type { Car } from '@/lib/cars/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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
      setMessages(m => [...m, { role: 'assistant', content: data.reply }]);
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
            <h3 className="text-sm font-bold">💬 Fragen zum Fahrzeug</h3>
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
              </div>
            ))}
            {loading && (
              <p className="text-xs text-bmw-gray-muted self-start pl-1">Schreibt…</p>
            )}
          </div>

          {/* Input */}
          <form onSubmit={send} className="border-t border-bmw-gray-border p-2 flex gap-2 bg-white flex-shrink-0">
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
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/ChatWidget.tsx
git commit -m "ChatWidget: floating bubble popup, renderMarkdown, bubble/chat toggle"
```

---

### Task 7: Simplify car detail page

**Files:**
- Modify: `app/cars/[id]/page.tsx`

- [ ] **Step 1: Rewrite the page**

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import type { Car } from '@/lib/cars/types';
import { Header } from '@/components/Header';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CarDetail } from '@/components/CarDetail';
import { ChatWidget } from '@/components/ChatWidget';

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const carId = parseInt(id, 10);
  if (Number.isNaN(carId)) notFound();

  const cars: Car[] = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
  );
  const car = cars.find(c => c.id === carId);
  if (!car) notFound();

  return (
    <>
      <Header />
      <Breadcrumb items={[
        { label: 'Startseite', href: '/' },
        { label: 'Gebrauchtwagen', href: '/' },
        { label: car.name },
      ]} />
      <CarDetail car={car} />
      <ChatWidget car={car} />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles and tests still pass**

```bash
npx tsc --noEmit && npm run test:run
```

Expected: no TS errors, 48 tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/cars/
git commit -m "Car detail page: simplified to CarDetail + ChatWidget floating bubble"
```

---

## Phase 3 — AI Content

### Task 8: Rewrite demo analysis — remove SCHRITT headers, natural prose

**Files:**
- Modify: `lib/ai/demo-analysis.ts`

- [ ] **Step 1: Update the test to match new output format**

In `lib/ai/demo-analysis.test.ts`, update the footer assertion since we're removing "Demo-Modus" label format slightly:

```typescript
it('returns a non-empty string', () => {
  const a = generateDemoAnalysis(car, findings);
  expect(typeof a).toBe('string');
  expect(a.length).toBeGreaterThan(100);
});

it('includes the demo-mode footer', () => {
  expect(generateDemoAnalysis(car, findings)).toContain('Demo-Modus');
});

it('does NOT contain SCHRITT headers', () => {
  const a = generateDemoAnalysis(car, findings);
  expect(a).not.toMatch(/SCHRITT \d/);
});

it('includes accident analysis when accidents present', () => {
  const withAcc: Car = {
    ...car,
    accidents: [{ type: 'Heckschaden', damage: 'Lack', damageKey: 'heck', repairCost: 1500, date: '2022' }],
  };
  const a = generateDemoAnalysis(withAcc, findings);
  expect(a).toMatch(/Heckschaden|Unfall/i);
  expect(a).toContain('1.500');
});
```

- [ ] **Step 2: Run tests — confirm the new assertion fails**

```bash
npm run test:run -- lib/ai/demo-analysis
```

Expected: "does NOT contain SCHRITT headers" fails.

- [ ] **Step 3: Rewrite generateDemoAnalysis**

Replace the entire body of `lib/ai/demo-analysis.ts`:

```typescript
import type { Car, Findings } from '@/lib/cars/types';
import { getSchadenFolgen } from '@/lib/cars/damage-db';

export function generateDemoAnalysis(carData: Car, findings: Findings): string {
  const age = new Date().getFullYear() - carData.yearBuilt;
  const expectedKm = age * 12000;
  const kmDiff = carData.km - expectedKm;
  const kmPerYear = Math.round(carData.km / age);
  const hasAccidents = carData.accidents && carData.accidents.length > 0;
  const totalRepairCost = hasAccidents
    ? carData.accidents.reduce((sum, a) => sum + (a.repairCost || 0), 0)
    : 0;

  const rf = findings.red.length;

  let a = '';

  // ── Fahrzeugwerte ──
  a += `Baujahr ${carData.yearBuilt}, ${age} Jahre alt. `;
  a += `Kilometerstand: ${carData.km.toLocaleString('de-DE')} km (${kmPerYear.toLocaleString('de-DE')} km/Jahr, Ø Deutschland: 13.000 km/Jahr). `;
  if (kmDiff > 30000) {
    a += `Leicht überdurchschnittliche Laufleistung — für einen gut gepflegten ${carData.fuel === 'Diesel' ? 'Diesel' : 'Benziner'} kein Problem, aber einen Wartungsplan einplanen.\n\n`;
  } else if (kmDiff > 0) {
    a += `Leicht über dem Schnitt, vollständig im normalen Bereich.\n\n`;
  } else {
    a += `Unterdurchschnittliche Laufleistung — sehr gut.\n\n`;
  }

  a += `Vorbesitzer: ${carData.owners}`;
  const maxNormal = Math.ceil(age / 3);
  a += carData.owners > maxNormal
    ? ` — für ${age} Jahre etwas häufiger gewechselt. Servicehistorie für alle Besitzphasen prüfen.\n`
    : ` — unauffällig für dieses Alter.\n`;

  a += `Service: ${carData.maintenanceRecords} Einträge (erwartet ca. ${age * 2})`;
  a += carData.maintenanceRecords === 0
    ? ` — Servicehistorie beim Verkäufer anfragen. Oft lassen sich fehlende Einträge per Werkstattrechnung nachweisen.\n\n`
    : carData.maintenanceRecords < age
    ? ` — teilweise vorhanden. Fehlende Einträge beim Verkäufer ansprechen.\n\n`
    : ` — vollständig. Gut.\n\n`;

  // ── Unfallschäden ──
  if (hasAccidents) {
    const folgen = getSchadenFolgen(carData.accidents);
    (folgen ?? []).forEach(({ acc, db }, i) => {
      a += `Unfall ${i + 1}: ${acc.type} (${acc.date}), Schaden: ${acc.damage}`;
      if (acc.repairCost) a += `, Reparaturkosten: ${acc.repairCost.toLocaleString('de-DE')} €`;
      a += '.\n';
      if (db) {
        a += `Kurzfristig: ${db.kurzfristig}\n`;
        a += `Langfristig: ${db.langfristig}\n`;
        a += `Empfehlung: ${db.adacTipp}\n`;
      }
      a += '\n';
    });
    if (totalRepairCost > 0) {
      a += `Bisherige Reparaturkosten gesamt: ${totalRepairCost.toLocaleString('de-DE')} €. `;
      a += `Ein dokumentierter Schaden ist ehrlicher als ein nicht gemeldeter — mit Originalrechnung und Gutachten sind Sie auf der sicheren Seite.\n\n`;
    }
  }

  // ── Wartungsausblick ──
  const repairs: string[] = [];
  if (carData.maintenanceRecords === 0) repairs.push('Komplettinspektion (fehlende Services aufholen): 300–700 €');
  if (carData.km > 100000) repairs.push('Zahnriemen/Steuerkette + Wasserpumpe prüfen: 200–600 €');
  if (carData.km > 60000) repairs.push('Bremsbeläge und -scheiben kontrollieren: 200–600 €');
  if (age > 5) repairs.push('Batterie prüfen (Lebensdauer 5–7 Jahre): 80–180 €');
  if (hasAccidents) repairs.push('Gutachten Unfallreparatur (DEKRA/TÜV): 200–400 €');
  if (repairs.length === 0) repairs.push('Reguläre Hauptuntersuchung: 50–100 €');

  a += `Geplante Kosten nächste 12 Monate:\n`;
  repairs.forEach(r => { a += `· ${r}\n`; });
  a += '\n';

  // ── Käuferfragen ──
  a += `Fragen, die Sie dem Verkäufer stellen sollten:\n`;
  a += `· Können Sie alle Wartungsrechnungen der letzten 3 Jahre vorlegen?\n`;
  if (hasAccidents) {
    a += `· Von welcher Werkstatt wurde repariert, und gibt es Garantie auf die Reparatur?\n`;
    a += `· Liegt ein DEKRA/TÜV-Gutachten über die Reparatur vor?\n`;
  } else {
    a += `· War das Fahrzeug jemals in einen Unfall verwickelt, auch kleinere?\n`;
  }
  a += `· Darf ich das Auto vor dem Kauf zu einem unabhängigen Kfz-Meister bringen?\n`;
  a += `· Ist der Preis verhandelbar, wenn der TÜV Mängel feststellt?\n\n`;

  // ── Fazit ──
  a += rf >= 2
    ? `Fazit: Einige Punkte zur Klärung. Mit einem unabhängigen Check und gezielter Verhandlung ein solides Angebot.\n`
    : rf === 1
    ? `Fazit: Ein Punkt zur Klärung. Sprechen Sie den Verkäufer an — oft lässt sich der Preis entsprechend anpassen.\n`
    : findings.orange.length > 0
    ? `Fazit: Überschaubarer Aufwand. Guter Kauf mit realistischer Kostenplanung.\n`
    : `Fazit: Solides Fahrzeug ohne wesentliche Auffälligkeiten. Kurze Inspektion zur Bestätigung empfohlen.\n`;

  a += `\n[Demo-Modus – mit echtem Claude API Key wird die Analyse personalisierter]`;
  return a;
}
```

- [ ] **Step 4: Run tests — all pass**

```bash
npm run test:run -- lib/ai/demo-analysis
```

Expected: 4 tests pass (including the new "no SCHRITT headers" assertion).

- [ ] **Step 5: Commit**

```bash
git add lib/ai/demo-analysis.ts lib/ai/demo-analysis.test.ts
git commit -m "demo-analysis: remove SCHRITT headers, rewrite as natural paragraphs"
```

---

### Task 9: Improve demo-chat — negotiation trigger + solution-oriented responses

**Files:**
- Modify: `lib/ai/demo-chat.ts`
- Modify: `lib/ai/demo-chat.test.ts`

- [ ] **Step 1: Write failing tests for the negotiation branch**

Add to `lib/ai/demo-chat.test.ts` after the existing tests:

```typescript
const carWithAccident: Car = {
  ...car,
  accidents: [{ type: 'Heckschaden', damage: 'Stoßfänger', damageKey: 'heck', repairCost: 1500, date: '2022-06' }],
};

describe('negotiation branch', () => {
  it('returns 4-step action plan for "wie gehe ich mit dem Unfall um"', () => {
    const r = generateDemoChatResponse(carWithAccident, [], 'wie gehe ich mit dem Unfall um');
    expect(r).toMatch(/Dokumente verlangen/);
    expect(r).toMatch(/Preisverhandlung/);
    expect(r).toMatch(/Gutachten/);
  });

  it('returns action plan for "was tun beim Unfall"', () => {
    const r = generateDemoChatResponse(carWithAccident, [], 'was tun beim Unfall');
    expect(r).toMatch(/Dokumente verlangen/);
  });

  it('factual accident question returns facts, not action plan', () => {
    const r = generateDemoChatResponse(carWithAccident, [], 'Hatte er einen Unfall?');
    expect(r).toMatch(/Unfallhistorie|Heckschaden/i);
    expect(r).not.toMatch(/Dokumente verlangen/);
  });

  it('no accidents + negotiation trigger returns clean response', () => {
    const r = generateDemoChatResponse(car, [], 'wie gehe ich mit dem Unfall um');
    expect(r).toMatch(/keine bekannte Unfallhistorie|kein.*Unfall/i);
  });
});
```

- [ ] **Step 2: Run tests — confirm 3 new tests fail**

```bash
npm run test:run -- lib/ai/demo-chat
```

Expected: existing 6 pass, 3 new fail.

- [ ] **Step 3: Add negotiation branch to demo-chat.ts**

Insert the following block in `lib/ai/demo-chat.ts` **before** the existing `// ── Unfall & Schäden ──` block (around line 64):

```typescript
  // ── Unfall: Käuferstrategie / Verhandlung ──
  if (r('umgang|wie soll ich|was tun|strategie|ratschlag|vorgehen|wie gehe ich|was mache ich')) {
    if (!hasAccidents) {
      return `Der ${carData.name} hat keine bekannte Unfallhistorie.\n\nEmpfehlung: Lackschichtdicke messen lassen (unter 120 μm = original). Bei der Probefahrt auf ungewöhnliche Geräusche und ungleichmäßige Spaltmaße achten.`;
    }
    const acc = carData.accidents[0];
    const totalRepair = carData.accidents.reduce((s, a) => s + (a.repairCost || 0), 0);
    const repairStr = totalRepair > 0 ? `${totalRepair.toLocaleString('de-DE')} €` : 'dokumentiert';
    const discountMin = totalRepair > 0 ? Math.max(500, Math.round(totalRepair * 0.8 / 100) * 100) : 1000;
    const damageChecks: Partial<Record<string, string>> = {
      heck: 'Kofferraumklappe auf Spaltmaße, PDC-Sensoren testen, Stoßfänger und Dichtungen prüfen',
      front: 'Kühlergrill, Scheinwerfer, Achsverhalten bei Geradeausfahrt, Kühlwasserstand',
      seite: 'Türen öffnen/schließen, Windgeräusche bei Fahrt, Spaltmaße Kotflügel und A-Säule',
      motor: 'Motorraum auf Ölflecken, Kaltstart, Kompression und Steuerkette testen lassen',
      struktur: 'Achsvermessung zwingend, Karosserievermessung beim Fachbetrieb',
    };
    const checkTip = (acc.damageKey && damageChecks[acc.damageKey]) ?? 'Spaltmaße, Lackbild und reparierte Stellen auf Unregelmäßigkeiten prüfen';
    return `**So gehst du mit dem Unfallschaden um**\n\n` +
      `Dieser ${carData.name} hat **${carData.accidents.length} Unfall${carData.accidents.length > 1 ? 'schäden' : ''}** (Reparatur: ${repairStr}). So gehst du vor:\n\n` +
      `**1. Dokumente verlangen**\n` +
      `• Original-Reparaturrechnung vom Betrieb\n` +
      `• Fotos vor/nach der Reparatur\n` +
      `• DEKRA-Gutachten, falls vorhanden\n\n` +
      `**2. Preisverhandlung**\n` +
      `Unfallwagen verlieren **10–20 %** Marktwert. Sage: „Der Schaden mindert den Wiederverkaufswert — ich erwarte einen Abzug von mind. ${discountMin.toLocaleString('de-DE')} €."\n\n` +
      `**3. Vor Ort prüfen**\n` +
      `• ${checkTip}\n` +
      `• Lackschichtdicke messen: über 180 μm deutet auf Umlackierung hin\n\n` +
      `**4. Gutachten empfohlen**\n` +
      `DEKRA/TÜV für 200–400 € — lohnt sich bei diesem Preis.\n\n` +
      `💡 Ein dokumentierter Schaden ist ehrlicher als ein unreportierter. Mit Rechnung und Gutachten bist du auf der sicheren Seite.`;
  }
```

- [ ] **Step 4: Make the emission/anomaly response more solution-oriented**

Find the `// ── Auffälligkeiten ──` block (around line 252) and update the response when anomalies are found:

```typescript
  // ── Auffälligkeiten ──
  if (r('auffällig|besonderheit|scheinwerfer|laser|fahrverbot|emission|plakette|euro')) {
    const auff = detectAuffaelligkeiten(carData);
    if (!auff.length) return `Beim ${carData.name} (${carData.yearBuilt}, ${carData.km.toLocaleString('de-DE')} km) wurden keine besonderen Auffälligkeiten erkannt.`;
    let reply = `**Hinweise zum ${carData.name}**\n\n`;
    auff.forEach(a => {
      reply += `**${a.title}**\n`;
      reply += `${a.detail}\n`;
      // Add solution-oriented tip
      if (a.flag === 'FAHRVERBOT_RISIKO') {
        reply += `Lösung: Eine grüne Feinstaubplakette kostet ca. 10 € und deckt viele Städte ab. Für Fahrverbotszonen gibt es Tagespässe ab 12 €. Für die meisten Fahrten bleibt das Fahrzeug alltagstauglich.\n`;
      } else {
        reply += `${a.tip}\n`;
      }
      reply += '\n';
    });
    return reply.trim();
  }
```

- [ ] **Step 5: Run tests — all pass**

```bash
npm run test:run -- lib/ai/demo-chat
```

Expected: 10 tests pass (6 existing + 4 new, including the "no accidents" negotiation case).

- [ ] **Step 6: Commit**

```bash
git add lib/ai/demo-chat.ts lib/ai/demo-chat.test.ts
git commit -m "demo-chat: add negotiation branch, solution-oriented emission response"
```

---

## Phase 4 — Final verification

### Task 10: Full test + build smoke check

- [ ] **Step 1: Full test suite**

```bash
npm run test:run
```

Expected: all tests pass (should be 52 now: 48 original + 1 new demo-analysis + 4 new demo-chat — adjust count if Vitest reports differently, but all green).

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: clean build, 13 routes registered, no TypeScript errors.

- [ ] **Step 3: Manual smoke test**

Start dev server:
```bash
npm run dev
```

Walk through (use http://localhost:3000 or whichever port is free):

| Check | Expected |
|-------|----------|
| Landing page | 12 cars with real photos; car #1 has green TOP badge; car #12 shows pink SVG or real photo |
| Click car #1 (BMW 118i, unfallfrei) | Full-width gallery, specs with all fields, no accident text in title |
| Click car #2 (BMW 320d, has accident) | "1 Unfall repariert · Reparatur: X €" in grey under subtitle |
| Click "KI-Analyse starten" | Modal opens; summary bar; neutral blue-line findings; prose analysis (no SCHRITT); chat nudge at bottom |
| Click ✕ or outside modal | Modal closes |
| Click 💬 bubble | Chat popup opens (340×480, blue header) |
| Type "wie teuer ist umlackieren ca." | Response with bold text rendered (not raw `**`) |
| Type "wie gehe ich mit dem Unfall um" (on accident car) | 4-step action plan with Dokumente/Verhandlung/Prüfen/Gutachten |
| Click ✕ in chat | Bubble reappears |
| Navigate to /login | Login form works |

- [ ] **Step 4: Commit if any last-minute fixes made**

```bash
git add -A
git commit -m "Final smoke-test fixes" # only if needed
```
