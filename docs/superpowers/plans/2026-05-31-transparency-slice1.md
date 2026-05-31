# Transparency Demo — Slice 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface every car's trust-critical facts (accidents, HU status, service status) **inline** on the detail page, label stock photos honestly, show price-in-market context, rename "KI-Analyse" → "Fahrzeug-Check", and wire the "Probefahrt vereinbaren" button to a persisted booking.

**Architecture:** A new pure, tested `lib/cars/disclosure.ts` derives the disclosure summary (HU/service status, accident facts) deterministically. `CarDetail` (client) renders it inline. A new sql.js store `lib/bookings/store.ts` (same atomic-write pattern as `lib/questions/log.ts`) persists test-drive requests via a thin `POST /api/cars/test-drive` route; a `TestDriveModal` collects them.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, Vitest, sql.js (WASM SQLite).

**Spec:** `docs/superpowers/specs/2026-05-31-transparency-demo-improvements-design.md` (Slice 1). Slices 2–4 get their own plans after this lands.

**Conventions:**
- No `Co-Authored-By` trailer in commits (see `memory/feedback_commit_messages.md`).
- **Wording discipline:** plain facts only — never claim transparency, no "Risiko", no marketing labels. Accidents framed factually ("Fachgerecht repariert"), expired HU stated plainly ("HU abgelaufen").
- Windows + OneDrive: a stale `.next` can throw `EPERM` on build. If `npm run build` fails with EPERM on `.next`, run `taskkill //F //IM node.exe` then `rm -rf .next` and rebuild.
- Tests live next to source; `vitest.config.ts` includes `lib/**/*.test.ts` and `app/**/*.test.ts`. sql.js stores use an in-memory DB when `process.env.VITEST` is set.

---

### Task 1: Add `repaired` to the Accident type

**Files:**
- Modify: `lib/cars/types.ts:5-11`

- [ ] **Step 1: Add the optional field**

In `lib/cars/types.ts`, change the `Accident` interface to:
```typescript
export interface Accident {
  type: string;
  damage: string;
  damageKey?: DamageKey;
  repairCost?: number;
  date: string;
  repaired?: boolean;
}
```
(The dataset already carries `"repaired": true`; the type just didn't declare it.)

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/cars/types.ts
git commit -m "types: declare Accident.repaired"
```

---

### Task 2: Disclosure helpers (huStatus, serviceStatus, buildDisclosure)

**Files:**
- Create: `lib/cars/disclosure.ts`
- Create: `lib/cars/disclosure.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/cars/disclosure.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { huStatus, serviceStatus, buildDisclosure } from './disclosure';
import type { Car } from './types';

const NOW = new Date(2026, 4, 31); // 31 May 2026 (month is 0-based)

const baseCar: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 2, maintenanceRecords: 12, features: [], accidents: [],
  emission: 'Euro 6', hu: '03.2027',
};

describe('huStatus', () => {
  it('reports a future HU as valid', () => {
    const s = huStatus('03.2027', NOW);
    expect(s.state).toBe('gueltig');
    expect(s.label).toMatch(/gültig bis 03\.2027/);
  });
  it('reports a past HU as expired', () => {
    const s = huStatus('06.2025', NOW);
    expect(s.state).toBe('abgelaufen');
    expect(s.label).toMatch(/HU abgelaufen \(06\.2025\)/);
  });
  it('reports an HU within ~2 months as soon-due', () => {
    const s = huStatus('06.2026', NOW); // ~1 month out
    expect(s.state).toBe('baldFaellig');
  });
  it('handles missing / unparseable values', () => {
    expect(huStatus(undefined, NOW).state).toBe('unbekannt');
    expect(huStatus('demnächst', NOW).state).toBe('unbekannt');
  });
});

describe('serviceStatus', () => {
  it('flags zero service entries plainly', () => {
    const s = serviceStatus({ ...baseCar, maintenanceRecords: 0 }, NOW);
    expect(s.state).toBe('keine');
    expect(s.label).toBe('Keine Servicehistorie hinterlegt');
  });
  it('calls a well-serviced car complete', () => {
    const s = serviceStatus({ ...baseCar, yearBuilt: 2018, maintenanceRecords: 14 }, NOW);
    expect(s.state).toBe('vollstaendig');
  });
  it('calls a thin history partial', () => {
    const s = serviceStatus({ ...baseCar, yearBuilt: 2014, maintenanceRecords: 4 }, NOW);
    expect(s.state).toBe('teilweise');
  });
});

describe('buildDisclosure', () => {
  it('marks an accident-free car', () => {
    const d = buildDisclosure(baseCar, NOW);
    expect(d.accidentFree).toBe(true);
    expect(d.accidents).toEqual([]);
  });
  it('surfaces accident facts incl. repainted + repaired', () => {
    const d = buildDisclosure({
      ...baseCar,
      accidents: [{ type: 'Heckschaden', damage: 'Stoßfänger umlackiert', damageKey: 'heck', repairCost: 3800, date: '2021-09-03', repaired: true }],
    }, NOW);
    expect(d.accidentFree).toBe(false);
    expect(d.accidents[0].repainted).toBe(true);
    expect(d.accidents[0].repaired).toBe(true);
    expect(d.accidents[0].repairCost).toBe(3800);
  });
  it('defaults repaired to true when the field is absent', () => {
    const d = buildDisclosure({
      ...baseCar,
      accidents: [{ type: 'Lackschaden', damage: 'Kratzer', date: '2022' }],
    }, NOW);
    expect(d.accidents[0].repaired).toBe(true);
    expect(d.accidents[0].repainted).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm run test:run -- lib/cars/disclosure`
Expected: FAIL — "Cannot find module './disclosure'".

- [ ] **Step 3: Implement `disclosure.ts`**

`lib/cars/disclosure.ts`:
```typescript
import type { Car } from './types';

export interface HuStatus {
  label: string;
  state: 'gueltig' | 'abgelaufen' | 'baldFaellig' | 'unbekannt';
}

/** HU is valid through the end of its "MM.YYYY" month. */
export function huStatus(hu: string | undefined, now: Date = new Date()): HuStatus {
  if (!hu) return { label: 'HU: keine Angabe', state: 'unbekannt' };
  const m = hu.match(/^(\d{2})\.(\d{4})$/);
  if (!m) return { label: `HU: ${hu}`, state: 'unbekannt' };
  const month = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  // new Date(year, month, 0) → last day of `month` (month treated 1-based here).
  const due = new Date(year, month, 0, 23, 59, 59, 999);
  if (due < now) return { label: `HU abgelaufen (${hu})`, state: 'abgelaufen' };
  const soon = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
  if (due <= soon) return { label: `HU bald fällig (${hu})`, state: 'baldFaellig' };
  return { label: `HU gültig bis ${hu}`, state: 'gueltig' };
}

export interface ServiceStatus {
  label: string;
  state: 'vollstaendig' | 'teilweise' | 'keine';
}

export function serviceStatus(car: Car, now: Date = new Date()): ServiceStatus {
  if (car.maintenanceRecords === 0) {
    return { label: 'Keine Servicehistorie hinterlegt', state: 'keine' };
  }
  const age = Math.max(1, now.getFullYear() - car.yearBuilt);
  const expected = age * 2; // ~2 services per year
  if (car.maintenanceRecords >= expected * 0.8) {
    return { label: `Scheckheft vollständig (${car.maintenanceRecords} Einträge)`, state: 'vollstaendig' };
  }
  return { label: `Servicehistorie teilweise (${car.maintenanceRecords} Einträge)`, state: 'teilweise' };
}

export interface AccidentDisclosure {
  type: string;
  date: string;
  damage: string;
  repaired: boolean;
  repainted: boolean;
  repairCost?: number;
}

export interface Disclosure {
  accidentFree: boolean;
  accidents: AccidentDisclosure[];
  service: ServiceStatus;
  hu: HuStatus;
  owners: number;
  emission?: string;
}

export function buildDisclosure(car: Car, now: Date = new Date()): Disclosure {
  const accidents: AccidentDisclosure[] = (car.accidents ?? []).map(a => ({
    type: a.type,
    date: a.date,
    damage: a.damage,
    repaired: a.repaired ?? true,
    repainted: /umlackier|lackier/i.test(a.damage ?? ''),
    repairCost: a.repairCost,
  }));
  return {
    accidentFree: accidents.length === 0,
    accidents,
    service: serviceStatus(car, now),
    hu: huStatus(car.hu, now),
    owners: car.owners,
    emission: car.emission,
  };
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm run test:run -- lib/cars/disclosure`
Expected: PASS (all ~10 tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/cars/disclosure.ts lib/cars/disclosure.test.ts
git commit -m "Add disclosure helpers: huStatus, serviceStatus, buildDisclosure"
```

---

### Task 3: Inline "Zustand & Historie" panel in CarDetail

**Files:**
- Modify: `components/CarDetail.tsx`

- [ ] **Step 1: Import the helper and compute disclosure**

At the top of `components/CarDetail.tsx`, add to the imports:
```typescript
import { buildDisclosure } from '@/lib/cars/disclosure';
```
Inside `CarDetail`, right after `const [showAnalysis, setShowAnalysis] = useState(false);`, add:
```typescript
  const disclosure = buildDisclosure(car);
```
(`buildDisclosure` is pure — safe to call in this client component.)

- [ ] **Step 2: Render the panel between the Title card and the Tech specs**

In `components/CarDetail.tsx`, find the closing `</div>` of the Title card (the block that ends right before `{/* Tech specs */}`) and insert this block immediately before the `{/* Tech specs */}` comment:
```tsx
          {/* Zustand & Historie — trust-critical facts, inline (no popup needed) */}
          <div className="bg-white border border-bmw-gray-border p-4">
            <h2 className="text-sm font-bold mb-3">Zustand & Historie</h2>
            <div className="flex flex-col gap-2 text-xs">
              {disclosure.accidentFree ? (
                <div className="flex justify-between gap-3">
                  <span className="text-bmw-gray-muted">Unfälle</span>
                  <span className="font-medium text-right">Unfallfrei – keine Schäden dokumentiert</span>
                </div>
              ) : (
                disclosure.accidents.map((a, i) => (
                  <div key={i} className="border-l-2 border-bmw-blue pl-3 py-1 bg-bmw-gray-bg">
                    <div className="font-semibold">{a.type} · {a.date}</div>
                    <div className="text-bmw-gray-text mt-0.5">{a.damage}</div>
                    <div className="text-bmw-gray-muted mt-0.5">
                      {a.repaired ? 'Fachgerecht repariert' : 'Nicht repariert'}
                      {a.repainted ? ' · umlackiert' : ''}
                      {typeof a.repairCost === 'number' ? ` · ${a.repairCost.toLocaleString('de-DE')} €` : ''}
                    </div>
                  </div>
                ))
              )}
              <div className="flex justify-between gap-3">
                <span className="text-bmw-gray-muted">Servicehistorie</span>
                <span className="font-medium text-right">{disclosure.service.label}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-bmw-gray-muted">Hauptuntersuchung</span>
                <span className="font-medium text-right">{disclosure.hu.label}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-bmw-gray-muted">Vorbesitzer</span>
                <span className="font-medium text-right">{disclosure.owners}</span>
              </div>
              {disclosure.emission && (
                <div className="flex justify-between gap-3">
                  <span className="text-bmw-gray-muted">Abgasnorm</span>
                  <span className="font-medium text-right">{disclosure.emission}</span>
                </div>
              )}
            </div>
          </div>
```

- [ ] **Step 3: Build and smoke-test inline disclosure**

```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
echo "--- car 3 (520d, Heckschaden) should show accident inline ---"
curl -s http://localhost:3000/cars/3 | grep -o "Zustand & Historie\|Heckschaden\|Fachgerecht repariert\|HU abgelaufen\|Scheckheft vollständig" | sort -u
echo "--- car 1 (118i) should show Unfallfrei ---"
curl -s http://localhost:3000/cars/1 | grep -o "Unfallfrei" | head -1
taskkill //F //IM node.exe 2>/dev/null | head -1
```
Expected: car 3 output includes `Zustand & Historie`, `Heckschaden`, `Fachgerecht repariert`, and an HU/service line; car 1 shows `Unfallfrei`.

- [ ] **Step 4: Commit**

```bash
git add components/CarDetail.tsx
git commit -m "CarDetail: inline Zustand & Historie disclosure panel"
```

---

### Task 4: Symbolfoto label, price-in-market line, and rename to Fahrzeug-Check

**Files:**
- Modify: `components/CarDetail.tsx`
- Modify: `components/AnalysisPanel.tsx`

- [ ] **Step 1: Import the price calculator in CarDetail**

In `components/CarDetail.tsx` imports, add:
```typescript
import { calcPreisAmpel } from '@/lib/cars/price-calculator';
```
After the `const disclosure = buildDisclosure(car);` line, add:
```typescript
  const preis = calcPreisAmpel(car);
```

- [ ] **Step 2: Add the "Symbolfoto" tag to the gallery**

In `components/CarDetail.tsx`, inside the gallery `<div className="relative h-[340px] ...">`, immediately after the opening tag (before the `{currentUrl && !hasImgError ? (` expression), add:
```tsx
        <span className="absolute top-3 left-3 z-10 bg-black/55 text-white text-[10px] px-2 py-1 rounded-full">Symbolfoto</span>
```

- [ ] **Step 3: Add the price-in-market line under the price**

In `components/CarDetail.tsx`, find the sidebar price block:
```tsx
            <div className="text-xs text-bmw-gray-muted mt-1">
              {car.km.toLocaleString('de-DE')} km · EZ {car.erstzulassung ?? car.yearBuilt}
            </div>
```
Add directly after that closing `</div>`:
```tsx
            <div className="text-xs text-bmw-gray-text mt-1">
              Marktwert ca. {preis.expected.toLocaleString('de-DE')} € · {preis.label}
            </div>
```

- [ ] **Step 4: Rename the button to "Fahrzeug-Check"**

In `components/CarDetail.tsx`, change the analysis button label:
```tsx
              🤖 KI-Analyse starten
```
to:
```tsx
              Fahrzeug-Check öffnen
```

- [ ] **Step 5: Rename the modal title in AnalysisPanel**

In `components/AnalysisPanel.tsx`, change:
```tsx
            <h2 className="text-base font-bold">KI-Analyse — {car.name}</h2>
```
to:
```tsx
            <h2 className="text-base font-bold">Fahrzeug-Check — {car.name}</h2>
```

- [ ] **Step 6: Build and smoke-test**

```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
curl -s http://localhost:3000/cars/2 | grep -o "Symbolfoto\|Marktwert ca\.\|Fahrzeug-Check öffnen" | sort -u
taskkill //F //IM node.exe 2>/dev/null | head -1
```
Expected: all three strings present. No "KI-Analyse" remains: `curl -s http://localhost:3000/cars/2 | grep -c "KI-Analyse"` should print `0` (run the server again or fold into the same check).

- [ ] **Step 7: Commit**

```bash
git add components/CarDetail.tsx components/AnalysisPanel.tsx
git commit -m "CarDetail: Symbolfoto label, price-in-market line, rename KI-Analyse to Fahrzeug-Check"
```

---

### Task 5: Bookings store (sql.js)

**Files:**
- Create: `lib/bookings/store.ts`
- Create: `lib/bookings/store.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Write the failing tests**

`lib/bookings/store.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { addBooking, getBookings, _resetBookings } from './store';

describe('bookings store', () => {
  beforeEach(() => { _resetBookings(); });

  it('stores and returns a booking with a timestamp', () => {
    addBooking({ carId: 1, carName: 'BMW 320i', name: 'Max Mustermann', phone: '0151 1234', preferredDate: '2026-06-10' });
    const all = getBookings();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Max Mustermann');
    expect(all[0].carId).toBe(1);
    expect(all[0].ts).toBeTruthy();
  });

  it('returns newest first', () => {
    addBooking({ carId: 1, carName: 'A', name: 'Erst', phone: '1', preferredDate: 'x' });
    addBooking({ carId: 2, carName: 'B', name: 'Zweit', phone: '2', preferredDate: 'y' });
    expect(getBookings()[0].name).toBe('Zweit');
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npm run test:run -- lib/bookings/store`
Expected: FAIL — "Cannot find module './store'".

- [ ] **Step 3: Implement the store (mirrors `lib/questions/log.ts`)**

`lib/bookings/store.ts`:
```typescript
import initSqlJs, { type Database } from 'sql.js';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface Booking {
  carId: number;
  carName: string;
  name: string;
  phone: string;
  preferredDate: string;
  ts: string;
}

const isTest = !!process.env.VITEST;
const DB_PATH = join(process.cwd(), 'data', 'bookings.db');

const SQL = await initSqlJs({
  locateFile: (file: string) => join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
});

const db: Database = !isTest && existsSync(DB_PATH)
  ? new SQL.Database(readFileSync(DB_PATH))
  : new SQL.Database();

db.run(`CREATE TABLE IF NOT EXISTS bookings (
  car_id         INTEGER NOT NULL,
  car_name       TEXT    NOT NULL,
  name           TEXT    NOT NULL,
  phone          TEXT    NOT NULL,
  preferred_date TEXT    NOT NULL,
  ts             TEXT    NOT NULL
)`);

function persist(): void {
  if (isTest) return;
  try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.tmp`;
    writeFileSync(tmp, Buffer.from(db.export()));
    renameSync(tmp, DB_PATH);
  } catch (err) {
    console.error('Failed to persist bookings:', err);
  }
}

export function addBooking(b: Omit<Booking, 'ts'>): Booking {
  const ts = new Date().toISOString();
  db.run(
    'INSERT INTO bookings (car_id, car_name, name, phone, preferred_date, ts) VALUES (?, ?, ?, ?, ?, ?)',
    [b.carId, b.carName, b.name, b.phone, b.preferredDate, ts],
  );
  persist();
  return { ...b, ts };
}

export function getBookings(): Booking[] {
  const res = db.exec('SELECT car_id, car_name, name, phone, preferred_date, ts FROM bookings ORDER BY rowid DESC');
  if (!res.length) return [];
  return res[0].values.map(r => ({
    carId: Number(r[0]),
    carName: String(r[1]),
    name: String(r[2]),
    phone: String(r[3]),
    preferredDate: String(r[4]),
    ts: String(r[5]),
  }));
}

// Test helper — clears all rows. Do not call from production code.
export function _resetBookings(): void {
  db.run('DELETE FROM bookings');
  persist();
}
```

- [ ] **Step 4: Gitignore the DB file**

In `.gitignore`, after the equipment.db lines, add:
```
# persisted test-drive bookings (sql.js sqlite file)
/data/bookings.db
/data/bookings.db.tmp
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npm run test:run -- lib/bookings/store`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/bookings/store.ts lib/bookings/store.test.ts .gitignore
git commit -m "Add sql.js bookings store for test-drive requests"
```

---

### Task 6: POST /api/cars/test-drive route

**Files:**
- Create: `app/api/cars/test-drive/route.ts`
- Create: `app/api/cars/test-drive/route.test.ts`

- [ ] **Step 1: Write the failing test**

`app/api/cars/test-drive/route.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

function req(body: unknown) {
  return new NextRequest('http://localhost/api/cars/test-drive', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/cars/test-drive', () => {
  it('rejects a request missing name/phone', async () => {
    const res = await POST(req({ carId: 1 }));
    expect(res.status).toBe(400);
  });

  it('accepts a valid request and returns the stored booking', async () => {
    const res = await POST(req({ carId: 3, carName: 'BMW 520d', name: 'Erika', phone: '0151 9', preferredDate: '2026-06-12' }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.booking.name).toBe('Erika');
    expect(data.booking.ts).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm run test:run -- app/api/cars/test-drive`
Expected: FAIL — "Cannot find module './route'".

- [ ] **Step 3: Implement the route**

`app/api/cars/test-drive/route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { addBooking } from '@/lib/bookings/store';

interface TestDriveBody {
  carId?: number;
  carName?: string;
  name?: string;
  phone?: string;
  preferredDate?: string;
}

export async function POST(req: NextRequest) {
  let body: TestDriveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { carId, carName, name, phone, preferredDate } = body;
  if (typeof carId !== 'number' || !name || !phone) {
    return NextResponse.json({ error: 'carId, name und phone erforderlich' }, { status: 400 });
  }
  const booking = addBooking({
    carId,
    carName: carName || '–',
    name,
    phone,
    preferredDate: preferredDate || '–',
  });
  return NextResponse.json({ ok: true, booking }, { status: 201 });
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm run test:run -- app/api/cars/test-drive`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/cars/test-drive/
git commit -m "Add POST /api/cars/test-drive route"
```

---

### Task 7: TestDriveModal + wire the "Probefahrt vereinbaren" button

**Files:**
- Create: `components/TestDriveModal.tsx`
- Modify: `components/CarDetail.tsx`

- [ ] **Step 1: Create the modal**

`components/TestDriveModal.tsx`:
```tsx
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
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
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
```

- [ ] **Step 2: Wire it into CarDetail**

In `components/CarDetail.tsx`, add the import:
```typescript
import { TestDriveModal } from './TestDriveModal';
```
Add state next to the other `useState` hooks:
```typescript
  const [showBooking, setShowBooking] = useState(false);
```
Change the dead button:
```tsx
            <button className="w-full mt-2 py-2.5 border border-bmw-gray-border text-sm rounded-sm hover:bg-bmw-gray-bg text-bmw-dark transition-colors">
              Probefahrt vereinbaren
            </button>
```
to:
```tsx
            <button
              onClick={() => setShowBooking(true)}
              className="w-full mt-2 py-2.5 border border-bmw-gray-border text-sm rounded-sm hover:bg-bmw-gray-bg text-bmw-dark transition-colors"
            >
              Probefahrt vereinbaren
            </button>
```
Add the modal render next to the existing analysis modal (after `{showAnalysis && <AnalysisPanel ... />}`):
```tsx
      {showBooking && <TestDriveModal car={car} onClose={() => setShowBooking(false)} />}
```

- [ ] **Step 3: Build and smoke-test the booking round-trip**

```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null; rm -f data/bookings.db data/bookings.db.tmp
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
curl -s -X POST http://localhost:3000/api/cars/test-drive -H 'Content-Type: application/json' \
  -d '{"carId":3,"carName":"BMW 520d","name":"Testkunde","phone":"0151 000","preferredDate":"2026-06-15"}' \
  -w "\nHTTP:%{http_code}\n"
echo "  bookings.db: $(ls -la data/bookings.db 2>/dev/null | awk '{print $5}') bytes"
curl -s http://localhost:3000/cars/3 | grep -o "Probefahrt vereinbaren" | head -1
taskkill //F //IM node.exe 2>/dev/null | head -1
```
Expected: POST returns `HTTP:201` with `{"ok":true,...}`, `bookings.db` exists (>0 bytes), detail page shows the button.

- [ ] **Step 4: Commit**

```bash
git add components/TestDriveModal.tsx components/CarDetail.tsx
git commit -m "Wire Probefahrt vereinbaren button to a persisted booking via TestDriveModal"
```

---

### Task 8: Slice 1 verification

**Files:** none (verification only).

- [ ] **Step 1: Full test suite + typecheck**

```bash
npx tsc --noEmit && echo "tsc OK"
npm run test:run 2>&1 | tail -4
```
Expected: tsc clean; all tests pass (previous count + the new disclosure/bookings/test-drive tests).

- [ ] **Step 2: Production build**

```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build 2>&1 | tail -4; echo "build exit: ${PIPESTATUS[0]}"
```
Expected: build exit 0.

- [ ] **Step 3: End-to-end runtime walkthrough**

```bash
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
echo "=== accident car (3) inline disclosure ==="
curl -s http://localhost:3000/cars/3 | grep -o "Zustand & Historie\|Heckschaden\|Fachgerecht repariert\|Symbolfoto\|Marktwert ca\.\|Fahrzeug-Check öffnen" | sort -u
echo "=== expired-HU car (7=10.2024) shows abgelaufen ==="
curl -s http://localhost:3000/cars/7 | grep -o "HU abgelaufen" | head -1
echo "=== no-service car (6) shows keine ==="
curl -s http://localhost:3000/cars/6 | grep -o "Keine Servicehistorie hinterlegt" | head -1
echo "=== no 'KI-Analyse' text remains ==="
curl -s http://localhost:3000/cars/1 | grep -c "KI-Analyse"
taskkill //F //IM node.exe 2>/dev/null | head -1
```
Expected: car 3 shows all disclosure/label strings; car 7 shows `HU abgelaufen`; car 6 shows `Keine Servicehistorie hinterlegt`; the `KI-Analyse` count prints `0`.

- [ ] **Step 4: Clean up local DB artifacts (gitignored, but tidy)**

```bash
rm -f data/bookings.db data/bookings.db.tmp
git status --short
```
Expected: working tree clean (no tracked changes).

Slice 1 is complete. Slices 2 (printable Fahrzeugbericht), 3 (feature-aware Probefahrt-Drehbuch + seller analytics), and 4 (polish) will be planned separately once this is reviewed and merged.
