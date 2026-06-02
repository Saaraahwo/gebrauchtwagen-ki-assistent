# Transparency Demo — Slice 3 Implementation Plan (Seller Drehbuch + Analytics)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the seller dashboard's test-drive guide into a concrete, **feature-aware Probefahrt-Drehbuch** (route profile + a real Braunschweig route + Google-Maps link + each of the car's actual features mapped to the best moment to show it), and add three seller analytics: per-car disclosure completeness, fleet-wide question analytics, and the test-drive booking requests.

**Architecture:** A new pure `lib/cars/test-drive.ts` owns the route profiles, the Braunschweig route templates, the maps-URL builder, and the feature→demo-moment mapping; it exports the richer `TestDrivePlan` and `buildTestDrive`. `sales-intelligence.ts` drops its old `buildTestDrive` and imports the new one. `disclosure.ts` gains `disclosureChecklist`. `lib/questions/log.ts` gains `getTopQuestions`. The dashboard server route/page pass the bookings + top questions; `SellerDashboard` renders the Drehbuch, completeness, analytics, and booking list.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, Vitest, sql.js.

**Spec:** `docs/superpowers/specs/2026-05-31-transparency-demo-improvements-design.md` (Slice 3). Slices 1–2 already shipped.

**Conventions:**
- No `Co-Authored-By` trailer. Plain-facts wording (no "Risiko"/no "wir sind transparent").
- Windows + OneDrive: if `npm run build` fails with `EPERM` on `.next`, run `taskkill //F //IM node.exe`, `rm -rf .next`, rebuild.
- sql.js stores already use VITEST-in-memory; `getBookings`/`getTopQuestions` are read helpers.

---

### Task 1: lib/cars/test-drive.ts (route profile, Braunschweig routes, maps URL, feature demos)

**Files:**
- Create: `lib/cars/test-drive.ts`
- Create: `lib/cars/test-drive.test.ts`

- [ ] **Step 1: Write the failing tests**

`lib/cars/test-drive.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildTestDrive, routeProfile, featureDemos, DEALER_CITY } from './test-drive';
import type { Car } from './types';

const base: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 70000, yearBuilt: 2020,
  owners: 1, maintenanceRecords: 12, features: [], accidents: [],
  fuel: 'Benzin', enginePower: '135 kW (184 PS)',
};

describe('routeProfile', () => {
  it('performance for an M model', () => {
    expect(routeProfile({ ...base, name: 'BMW M5', enginePower: '460 kW (625 PS)' })).toBe('performance');
  });
  it('familie for an X model', () => {
    expect(routeProfile({ ...base, name: 'BMW X5', subtitle: 'xDrive30d' })).toBe('familie');
  });
  it('cabrio for a Cabriolet', () => {
    expect(routeProfile({ ...base, name: 'BMW 430i', subtitle: 'Cabriolet' })).toBe('cabrio');
  });
  it('effizienz for a plain diesel', () => {
    expect(routeProfile({ ...base, name: 'BMW 318d', fuel: 'Diesel', features: [] })).toBe('effizienz');
  });
  it('komfort when luxury features present', () => {
    expect(routeProfile({ ...base, name: 'BMW 520i', features: ['Lederausstattung', 'Head-Up Display'] })).toBe('komfort');
  });
  it('allround fallback', () => {
    expect(routeProfile({ ...base, name: 'BMW 318i', features: [], enginePower: '100 kW (136 PS)' })).toBe('allround');
  });
});

describe('buildTestDrive', () => {
  it('keeps the expected German headline per profile', () => {
    expect(buildTestDrive({ ...base, name: 'BMW M5', enginePower: '460 kW (625 PS)' }).headline).toBe('Performance zeigen');
    expect(buildTestDrive({ ...base, name: 'BMW X5', subtitle: 'xDrive30d' }).headline).toBe('Familientauglichkeit');
    expect(buildTestDrive({ ...base, name: 'BMW 430i', subtitle: 'Cabriolet' }).headline).toBe('Offenes Fahrerlebnis');
  });
  it('provides a concrete route anchored in Braunschweig with a valid maps URL', () => {
    const plan = buildTestDrive({ ...base, name: 'BMW M5', enginePower: '460 kW (625 PS)' });
    expect(plan.route.description.length).toBeGreaterThan(0);
    expect(plan.route.mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\//);
    expect(decodeURIComponent(plan.route.mapsUrl)).toContain(DEALER_CITY);
    expect(plan.legs.length).toBeGreaterThan(0);
    expect(plan.legs[0].actions.length).toBeGreaterThan(0);
  });
});

describe('featureDemos', () => {
  it('maps the car\'s actual features to a demo moment', () => {
    const d = featureDemos({ ...base, features: ['Parkassistent', 'Harman Kardon', 'Head-Up Display'] });
    const feats = d.map(x => x.feature);
    expect(feats).toContain('Parkassistent');
    expect(feats).toContain('Soundsystem');
    expect(feats).toContain('Head-Up Display');
    expect(d.every(x => x.when.length > 0)).toBe(true);
  });
  it('returns nothing for a car without demo-worthy features', () => {
    expect(featureDemos({ ...base, features: ['Bluetooth', 'USB-Anschluss'] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm run test:run -- lib/cars/test-drive`
Expected: FAIL — "Cannot find module './test-drive'".

- [ ] **Step 3: Implement `lib/cars/test-drive.ts`**

```typescript
import type { Car } from './types';

export const DEALER_CITY = 'Braunschweig';

export type RouteProfile = 'performance' | 'familie' | 'komfort' | 'effizienz' | 'cabrio' | 'allround';

export interface TestDrivePlan {
  headline: string;
  route: { description: string; mapsUrl: string };
  legs: { leg: string; actions: string[] }[];
  featureDemos: { feature: string; when: string }[];
}

function ps(car: Car): number {
  const m = (car.enginePower || '').match(/(\d+)\s*PS/);
  return m ? parseInt(m[1], 10) : 0;
}
function isMModel(car: Car): boolean {
  return /\bM[2-8]\b/.test(car.name);
}

export function routeProfile(car: Car): RouteProfile {
  const name = (car.name + ' ' + (car.subtitle || '')).toLowerCase();
  const feat = (car.features || []).join(' ').toLowerCase();
  const seats = car.seats ?? 5;
  if (name.includes('cabrio')) return 'cabrio';
  if (isMModel(car) || ps(car) >= 300) return 'performance';
  if (/touring|tourer|\bx[1-7]\b/.test(name) || seats >= 7) return 'familie';
  if (/leder|head-up|ambiente|komfortzugang|panorama/.test(feat)) return 'komfort';
  if ((car.fuel || '').toLowerCase() === 'diesel') return 'effizienz';
  return 'allround';
}

interface RouteTemplate {
  headline: string;
  destination: string;
  description: string;
  legs: { leg: string; actions: string[] }[];
}

const ROUTES: Record<RouteProfile, RouteTemplate> = {
  performance: {
    headline: 'Performance zeigen',
    destination: 'A2 Anschlussstelle Braunschweig-Watenbüttel',
    description: 'Stadtausfahrt → A2-Auffahrt → Landstraße über den Elm zurück, ca. 25 Min',
    legs: [
      { leg: 'Stadt', actions: ['Souveränes Anfahren und Ansprechverhalten zeigen'] },
      { leg: 'Autobahn (A2)', actions: ['Kontrollierte Beschleunigung 80→160 km/h', 'Durchzug und Laufruhe demonstrieren'] },
      { leg: 'Landstraße / Elm', actions: ['Kurvenverhalten und Bremsen zeigen', 'Sport-Fahrmodus und Sound vorführen'] },
    ],
  },
  familie: {
    headline: 'Familientauglichkeit',
    destination: 'Braunschweig Innenstadt',
    description: 'Ruhige Wohngebiets- und Schulwegrunde durch Braunschweig, ca. 20 Min',
    legs: [
      { leg: 'Vor der Fahrt', actions: ['Navigation und Entertainment aktivieren', 'Kofferraum und Platzangebot zeigen'] },
      { leg: 'Wohngebiet / Schulweg', actions: ['Ruhige, vorausschauende Fahrweise', 'Komfort über Bodenwellen zeigen'] },
      { leg: 'Parken', actions: ['Parkassistent beim Einparken demonstrieren'] },
    ],
  },
  komfort: {
    headline: 'Komfort erleben',
    destination: 'Braunschweig Bürgerpark',
    description: 'Ruhige Boulevard-Runde am Bürgerpark, ca. 20 Min',
    legs: [
      { leg: 'Boulevard', actions: ['Sitzkomfort und niedriges Geräuschniveau zeigen', 'Head-Up Display und Ambiente vorführen'] },
      { leg: 'Landstraße', actions: ['Souveränes Gleiten bei mittlerem Tempo'] },
    ],
  },
  effizienz: {
    headline: 'Effizienz beweisen',
    destination: 'Wolfenbüttel',
    description: 'Überlandfahrt Braunschweig → Wolfenbüttel und zurück, ca. 30 Min',
    legs: [
      { leg: 'Überland', actions: ['Momentan- und Durchschnittsverbrauch im Bordcomputer zeigen', 'Laufruhe bei konstant 100 km/h'] },
    ],
  },
  cabrio: {
    headline: 'Offenes Fahrerlebnis',
    destination: 'Elm',
    description: 'Landstraßenrunde Richtung Elm, ca. 30 Min',
    legs: [
      { leg: 'Vor der Fahrt', actions: ['Verdeck öffnen'] },
      { leg: 'Landstraße / Elm', actions: ['Offenes Fahren genießen', 'Windschott und Komfort bei offener Fahrt zeigen'] },
    ],
  },
  allround: {
    headline: 'Solide Allround-Probefahrt',
    destination: 'Braunschweig Stadtrunde',
    description: 'Mischung aus Stadt und Landstraße rund um Braunschweig, ca. 20 Min',
    legs: [
      { leg: 'Stadt', actions: ['Anfahren, Bremsen und Wendigkeit zeigen'] },
      { leg: 'Landstraße', actions: ['Schaltverhalten und Geräusche prüfen', 'Assistenz- und Komfortfunktionen testen'] },
    ],
  },
};

function mapsUrl(destination: string): string {
  const origin = encodeURIComponent(DEALER_CITY);
  const dest = encodeURIComponent(`${destination}, ${DEALER_CITY}`);
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
}

// Maps a car's actual features to the best moment to show each on the test drive.
const FEATURE_DEMO: { match: string; feature: string; when: string }[] = [
  { match: 'parking assistant|parkassistent|einparkhilf|\\bpdc\\b', feature: 'Parkassistent', when: 'Beim Ein-/Ausparken automatisch einparken lassen' },
  { match: 'fond entertainment', feature: 'Fond Entertainment', when: 'Für Mitfahrer/Kinder die Rücksitz-Bildschirme starten' },
  { match: 'harman|bang ?& ?olufsen|bowers ?& ?wilkins', feature: 'Soundsystem', when: 'Bei der Pause: Lieblingssong aufdrehen' },
  { match: 'head-?up', feature: 'Head-Up Display', when: 'Auf der Autobahn – Infos im Blickfeld zeigen' },
  { match: 'driving assistant|abstandstempomat|adaptiver tempomat', feature: 'Fahrassistenz', when: 'Auf der Autobahn Abstandstempomat aktivieren' },
  { match: 'laser', feature: 'Laserlicht', when: '(Dämmerung) Fernlicht-Reichweite zeigen' },
  { match: 'standheizung', feature: 'Standheizung', when: '(Winter) vor der Fahrt vorheizen' },
  { match: 'komfortzugang', feature: 'Komfortzugang', when: 'Vor der Fahrt schlüssellos öffnen und starten' },
  { match: 'panorama|glasdach', feature: 'Panorama-Glasdach', when: 'Glasdach öffnen' },
  { match: 'ambiente', feature: 'Ambientebeleuchtung', when: '(Dämmerung) Ambientebeleuchtung zeigen' },
  { match: 'sitzheizung', feature: 'Sitzheizung', when: 'Sitzheizung einschalten' },
  { match: 'm fahrwerk|adaptives fahrwerk', feature: 'Adaptives Fahrwerk', when: 'Sport-Modus auf der Landstraße umschalten' },
  { match: 'xdrive', feature: 'xDrive', when: 'Traktion in einer zügigen Kurve spüren' },
  { match: 'wireless charging|induktiv', feature: 'Wireless Charging', when: 'Smartphone kabellos laden zeigen' },
];

export function featureDemos(car: Car): { feature: string; when: string }[] {
  const parts = [car.subtitle ?? '', ...(car.features ?? [])];
  const out: { feature: string; when: string }[] = [];
  const seen = new Set<string>();
  for (const e of FEATURE_DEMO) {
    if (seen.has(e.feature)) continue;
    const re = new RegExp(e.match, 'i');
    if (parts.some(p => re.test(p))) {
      seen.add(e.feature);
      out.push({ feature: e.feature, when: e.when });
    }
  }
  return out;
}

export function buildTestDrive(car: Car): TestDrivePlan {
  const profile = routeProfile(car);
  const t = ROUTES[profile];
  return {
    headline: t.headline,
    route: { description: t.description, mapsUrl: mapsUrl(t.destination) },
    legs: t.legs,
    featureDemos: featureDemos(car),
  };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm run test:run -- lib/cars/test-drive`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/cars/test-drive.ts lib/cars/test-drive.test.ts
git commit -m "Add feature-aware test-drive Drehbuch (Braunschweig routes + maps + feature demos)"
```

---

### Task 2: Refactor sales-intelligence to use the new test-drive module

**Files:**
- Modify: `lib/cars/sales-intelligence.ts`
- Modify: `lib/cars/sales-intelligence.test.ts`

- [ ] **Step 1: Point sales-intelligence at the new module**

In `lib/cars/sales-intelligence.ts`:
1. Remove the local `TestDrivePlan` interface (the `export interface TestDrivePlan { headline: string; steps: string[]; }` block).
2. Remove the entire local `export function buildTestDrive(car: Car): TestDrivePlan { ... }` function (the long block with all the `if (...) return { headline, steps }` branches).
3. Add this import near the other imports at the top:
```typescript
import { buildTestDrive, type TestDrivePlan } from './test-drive';
```
4. The `SalesIntelligence` interface keeps `testDrive: TestDrivePlan;` (now referring to the imported type) — no change to that line.
5. `buildSalesIntelligence` keeps calling `buildTestDrive(car)` — no change (it now resolves to the imported function).

(`ps` and `isMModel` in `sales-intelligence.ts` are still used by `buildStrengths`/`buildCustomerQuestions` — leave them.)

- [ ] **Step 2: Update the test file**

In `lib/cars/sales-intelligence.test.ts`:
1. In the import block at the top, remove `buildTestDrive,` from the list of names imported from `./sales-intelligence` (it now lives in `./test-drive` and is tested there).
2. Delete the entire `describe('buildTestDrive', () => { ... });` block (the one with the M5/X5/Cabriolet/diesel/luxury/fallback cases).
3. In the `describe('buildSalesIntelligence', ...)` block, change the line:
```typescript
    expect(intel.testDrive.steps.length).toBeGreaterThan(0);
```
to:
```typescript
    expect(intel.testDrive.legs.length).toBeGreaterThan(0);
```

- [ ] **Step 3: Run the affected tests**

Run: `npm run test:run -- lib/cars/sales-intelligence lib/cars/test-drive`
Expected: PASS — no `buildTestDrive`-from-sales-intelligence references remain; `buildSalesIntelligence` test checks `.legs`.

- [ ] **Step 4: Typecheck the whole project (catch consumers of the old shape)**

Run: `npx tsc --noEmit`
Expected: errors ONLY where the dashboard still reads `testDrive.steps` (fixed in Task 6). If tsc reports an error in `components/SellerDashboard.tsx` about `steps`, that is expected and handled in Task 6 — note it and proceed. There must be NO other errors.

- [ ] **Step 5: Commit**

```bash
git add lib/cars/sales-intelligence.ts lib/cars/sales-intelligence.test.ts
git commit -m "sales-intelligence: use the new feature-aware test-drive module"
```

---

### Task 3: disclosureChecklist (per-car completeness)

**Files:**
- Modify: `lib/cars/disclosure.ts`
- Modify: `lib/cars/disclosure.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/cars/disclosure.test.ts` (inside the file, after the existing tests — add a new import name and a new describe block):

Change the first import line to also import `disclosureChecklist`:
```typescript
import { huStatus, serviceStatus, buildDisclosure, disclosureChecklist } from './disclosure';
```
Add at the end of the file:
```typescript
describe('disclosureChecklist', () => {
  it('marks all items ok for a clean, complete, valid-HU car', () => {
    const items = disclosureChecklist({ ...baseCar, maintenanceRecords: 14, hu: '03.2027', erstzulassung: '03.2018', accidents: [] }, NOW);
    expect(items.every(i => i.ok)).toBe(true);
  });
  it('flags an expired HU', () => {
    const items = disclosureChecklist({ ...baseCar, hu: '06.2025' }, NOW);
    expect(items.find(i => i.item === 'HU gültig')!.ok).toBe(false);
  });
  it('flags missing service history', () => {
    const items = disclosureChecklist({ ...baseCar, maintenanceRecords: 0 }, NOW);
    expect(items.find(i => i.item === 'Servicehistorie hinterlegt')!.ok).toBe(false);
  });
  it('flags an accident without a documented repair cost', () => {
    const items = disclosureChecklist({
      ...baseCar,
      accidents: [{ type: 'Lackschaden', damage: 'Kratzer', date: '2022' }],
    }, NOW);
    expect(items.find(i => i.item === 'Unfälle dokumentiert')!.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm run test:run -- lib/cars/disclosure`
Expected: FAIL — `disclosureChecklist` is not exported.

- [ ] **Step 3: Implement `disclosureChecklist` in `lib/cars/disclosure.ts`**

Add at the end of `lib/cars/disclosure.ts`:
```typescript
export interface DisclosureItem {
  item: string;
  ok: boolean;
}

/** Per-car disclosure completeness — actionable gaps a dealer can close. */
export function disclosureChecklist(car: Car, now: Date = new Date()): DisclosureItem[] {
  const hu = huStatus(car.hu, now);
  const accidents = car.accidents ?? [];
  return [
    { item: 'HU gültig', ok: hu.state === 'gueltig' || hu.state === 'baldFaellig' },
    { item: 'Servicehistorie hinterlegt', ok: car.maintenanceRecords > 0 },
    { item: 'Unfälle dokumentiert', ok: accidents.every(a => typeof a.repairCost === 'number') },
    { item: 'Erstzulassung angegeben', ok: !!car.erstzulassung },
  ];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm run test:run -- lib/cars/disclosure`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cars/disclosure.ts lib/cars/disclosure.test.ts
git commit -m "disclosure: add per-car disclosureChecklist (completeness gaps)"
```

---

### Task 4: getTopQuestions (fleet-wide question analytics)

**Files:**
- Modify: `lib/questions/log.ts`
- Modify: `lib/questions/log.test.ts`

- [ ] **Step 1: Write the failing test**

In `lib/questions/log.test.ts`, change the import line to add `getTopQuestions`:
```typescript
import { articleNr, logQuestion, getQuestionsForCar, getTopQuestions, _resetLog } from './log';
```
Add at the end of the file:
```typescript
describe('getTopQuestions', () => {
  beforeEach(() => { _resetLog(); });

  it('aggregates the most frequent questions across all cars, newest count first', () => {
    logQuestion(1, 'BMW 320i', 'Wie viele km?', 'A');
    logQuestion(2, 'BMW X5', 'Wie viele km?', 'A');
    logQuestion(3, 'BMW M5', 'Hat es Unfälle?', 'B');
    const top = getTopQuestions(5);
    expect(top[0].question).toBe('Wie viele km?');
    expect(top[0].count).toBe(2);
    expect(top.some(q => q.question === 'Hat es Unfälle?')).toBe(true);
  });

  it('respects the limit', () => {
    logQuestion(1, 'A', 'Frage eins', 'x');
    logQuestion(1, 'A', 'Frage zwei', 'y');
    logQuestion(1, 'A', 'Frage drei', 'z');
    expect(getTopQuestions(2)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `npm run test:run -- lib/questions/log`
Expected: FAIL — `getTopQuestions` not exported.

- [ ] **Step 3: Implement `getTopQuestions` in `lib/questions/log.ts`**

Add before the `_resetLog` export:
```typescript
export function getTopQuestions(limit = 8): { question: string; count: number }[] {
  const stmt = db.prepare(
    'SELECT question, COUNT(*) AS c FROM questions GROUP BY lower(trim(question)) ORDER BY c DESC, question ASC LIMIT ?',
  );
  stmt.bind([limit]);
  const out: { question: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    out.push({ question: String(row.question), count: Number(row.c) });
  }
  stmt.free();
  return out;
}
```
(The existing `db` and the `questions` table — `car_id, car_name, question, answer, ts` — are already defined at the top of the file.)

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npm run test:run -- lib/questions/log`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/questions/log.ts lib/questions/log.test.ts
git commit -m "questions: add getTopQuestions fleet-wide aggregation"
```

---

### Task 5: Feed completeness, top questions, and bookings into the dashboard data

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/api/sellers/dashboard/route.ts`

- [ ] **Step 1: Update the dashboard page (server)**

`app/dashboard/page.tsx` — replace its body with:
```tsx
import { readFileSync } from 'fs';
import { join } from 'path';
import { redirect } from 'next/navigation';
import type { Car } from '@/lib/cars/types';
import { getSellerFromCookies } from '@/lib/auth/require-seller';
import { sellers } from '@/lib/auth/sellers';
import { computeInventoryStats, carCondition } from '@/lib/cars/inventory-stats';
import { buildSalesIntelligence } from '@/lib/cars/sales-intelligence';
import { disclosureChecklist } from '@/lib/cars/disclosure';
import { getTopQuestions } from '@/lib/questions/log';
import { getBookings } from '@/lib/bookings/store';
import { Header } from '@/components/Header';
import { SellerDashboard } from '@/components/SellerDashboard';

export default async function DashboardPage() {
  const seller = await getSellerFromCookies();
  if (!seller) redirect('/login');

  const cars: Car[] = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
  );
  const stats = computeInventoryStats(cars);
  const carIntel = cars.map(car => ({
    car,
    intelligence: buildSalesIntelligence(car),
    condition: carCondition(car),
    disclosure: disclosureChecklist(car),
  }));
  const topQuestions = getTopQuestions(8);
  const bookings = getBookings();
  const sellerName = sellers[seller.email]?.name ?? seller.email;

  return (
    <>
      <Header />
      <SellerDashboard
        sellerName={sellerName}
        stats={stats}
        cars={carIntel}
        topQuestions={topQuestions}
        bookings={bookings}
      />
    </>
  );
}
```

- [ ] **Step 2: Update the dashboard API route to the same shape**

In `app/api/sellers/dashboard/route.ts`:
- Add imports:
```typescript
import { disclosureChecklist } from '@/lib/cars/disclosure';
import { getTopQuestions } from '@/lib/questions/log';
import { getBookings } from '@/lib/bookings/store';
```
- Change the `carIntel` map to include `disclosure`:
```typescript
  const carIntel = cars.map(car => ({
    car,
    intelligence: buildSalesIntelligence(car),
    condition: carCondition(car),
    disclosure: disclosureChecklist(car),
  }));
```
- Change the `return NextResponse.json({ ... })` to add `topQuestions` and `bookings`:
```typescript
  return NextResponse.json({
    sellerInfo: {
      email: seller.email,
      name: sellers[seller.email]?.name ?? seller.email,
    },
    stats,
    cars: carIntel,
    topQuestions: getTopQuestions(8),
    bookings: getBookings(),
    faqPack: { downloadUrl: '/api/sellers/faq-pack', format: 'TXT' },
  });
```

- [ ] **Step 3: Typecheck (SellerDashboard prop errors expected until Task 6)**

Run: `npx tsc --noEmit`
Expected: errors ONLY in `components/SellerDashboard.tsx` (it doesn't yet accept `topQuestions`/`bookings`/`disclosure`, and still reads `testDrive.steps`). These are fixed in Task 6. No errors elsewhere.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx app/api/sellers/dashboard/route.ts
git commit -m "dashboard data: add per-car disclosure, top questions, and bookings"
```

---

### Task 6: Render the Drehbuch + analytics in SellerDashboard

**Files:**
- Modify: `components/SellerDashboard.tsx`

- [ ] **Step 1: Extend the types and props**

In `components/SellerDashboard.tsx`:
- Add imports near the top:
```typescript
import type { SalesIntelligence } from '@/lib/cars/sales-intelligence';
import type { DisclosureItem } from '@/lib/cars/disclosure';
```
(Keep the existing `import type { InventoryStats } from '@/lib/cars/inventory-stats';`. `SalesIntelligence` may already be imported — if so, do not duplicate.)
- Change the `CarIntel` interface to add `disclosure`:
```typescript
export interface CarIntel {
  car: Car;
  intelligence: SalesIntelligence;
  condition: 'red' | 'orange' | 'green';
  disclosure: DisclosureItem[];
}
```
- Change the `Props` interface to:
```typescript
interface Props {
  sellerName: string;
  stats: InventoryStats;
  cars: CarIntel[];
  topQuestions: { question: string; count: number }[];
  bookings: { carId: number; carName: string; name: string; phone: string; preferredDate: string; ts: string }[];
}
```
- Change the component signature to destructure the new props:
```typescript
export function SellerDashboard({ sellerName, stats, cars, topQuestions, bookings }: Props) {
```

- [ ] **Step 2: Replace the test-drive block with the feature-aware Drehbuch**

In `components/SellerDashboard.tsx`, find this block:
```tsx
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
```
Replace it with:
```tsx
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
```

- [ ] **Step 3: Add a per-car disclosure-completeness line in the expanded card**

In the same expanded-card grid (just before the `{intelligence.equipment.length > 0 && (` block that renders "Ausstattung erklärt"), insert:
```tsx
                    {disclosure.some(d => !d.ok) && (
                      <div className="md:col-span-2 border-t border-bmw-gray-border pt-3">
                        <div className="text-xs font-bold text-flag-orange mb-1">Offene Angaben (vor Veröffentlichung schließen)</div>
                        <ul className="text-[11px] text-bmw-gray-text space-y-0.5">
                          {disclosure.filter(d => !d.ok).map((d, i) => <li key={i}>✗ {d.item}</li>)}
                        </ul>
                      </div>
                    )}
```
(The per-car `disclosure` is available because the map callback destructures it — see Step 4.)

- [ ] **Step 4: Make the per-car map expose `disclosure`**

Find the cars map in `components/SellerDashboard.tsx`. It currently destructures like:
```tsx
          {cars.map(({ car, intelligence, condition }) => {
```
Change it to:
```tsx
          {cars.map(({ car, intelligence, condition, disclosure }) => {
```

- [ ] **Step 5: Add the two analytics panels (top questions + bookings) to the Überblick section**

In `components/SellerDashboard.tsx`, find the end of the "Überblick" `</section>` (the section containing the StatCards and charts). Immediately AFTER that `</section>`, insert a new section:
```tsx
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
```

- [ ] **Step 6: Typecheck + build + smoke-test**

```bash
npx tsc --noEmit && echo "tsc OK"
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null; rm -f data/bookings.db data/bookings.db.tmp data/questions.db data/questions.db.tmp
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
# Seed a question + a booking so the analytics panels have data
curl -s -X POST http://localhost:3000/api/cars/chat -H 'Content-Type: application/json' -d '{"carData":{"id":1,"name":"BMW 118i","price":16900,"km":47800,"yearBuilt":2019,"owners":1,"maintenanceRecords":10,"features":[],"accidents":[]},"message":"Was ist das M Sportpaket?"}' -o /dev/null
curl -s -X POST http://localhost:3000/api/cars/test-drive -H 'Content-Type: application/json' -d '{"carId":4,"carName":"BMW M3","name":"Demo Kunde","phone":"0151 5","preferredDate":"2026-06-20"}' -o /dev/null
# Log in and fetch the dashboard data
curl -s -c /tmp/ck.txt -X POST http://localhost:3000/api/sellers/login -H 'Content-Type: application/json' -d '{"email":"demo@carcheck.de","password":"demo123"}' -o /dev/null
echo "--- dashboard API: M3 drehbuch + analytics present ---"
curl -s -b /tmp/ck.txt http://localhost:3000/api/sellers/dashboard | node -e "let d='';process.stdin.on('data',x=>x&&(d+=x)).on('end',()=>{const r=JSON.parse(d);const m=r.cars.find(c=>c.car.id===4);console.log('headline:',m.intelligence.testDrive.headline);console.log('mapsUrl ok:',/google\.com\/maps\/dir/.test(m.intelligence.testDrive.route.mapsUrl));console.log('legs:',m.intelligence.testDrive.legs.length,'featureDemos:',m.intelligence.testDrive.featureDemos.map(f=>f.feature).join(', '));console.log('disclosure items:',m.disclosure.map(x=>x.item+'='+x.ok).join(', '));console.log('topQuestions:',r.topQuestions.length,'bookings:',r.bookings.length);})"
taskkill //F //IM node.exe 2>/dev/null | head -1
rm -f data/bookings.db data/bookings.db.tmp data/questions.db data/questions.db.tmp
```
Expected: tsc OK; build 0; the API prints the M3 headline (`Performance zeigen`), `mapsUrl ok: true`, legs ≥ 1, a non-empty `featureDemos` list (M3 has xDrive, Laserlicht, Harman → Soundsystem), a `disclosure items` line, `topQuestions: 1`, `bookings: 1`.

- [ ] **Step 7: Commit**

```bash
git add components/SellerDashboard.tsx
git commit -m "Dashboard: feature-aware Probefahrt-Drehbuch, disclosure gaps, question analytics, bookings"
```

---

### Task 7: Slice 3 verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck + full test suite**

```bash
npx tsc --noEmit && echo "tsc OK"
npm run test:run 2>&1 | grep -E "Test Files|Tests" | tail -2
```
Expected: tsc clean; all tests pass (previous count + new test-drive/disclosure/log tests; minus the moved buildTestDrive cases — net increase).

- [ ] **Step 2: Production build**

```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build 2>&1 | tail -4; echo "build exit: ${PIPESTATUS[0]}"
```
Expected: build exit 0.

- [ ] **Step 3: Dashboard page renders the new sections**

```bash
rm -f data/bookings.db data/bookings.db.tmp data/questions.db data/questions.db.tmp
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
curl -s -c /tmp/ck.txt -X POST http://localhost:3000/api/sellers/login -H 'Content-Type: application/json' -d '{"email":"demo@carcheck.de","password":"demo123"}' -o /dev/null
curl -s -b /tmp/ck.txt http://localhost:3000/dashboard | grep -o "Probefahrt-Drehbuch\|Häufigste Kundenfragen (gesamt)\|Probefahrt-Anfragen\|Route in Google Maps öffnen" | sort -u
taskkill //F //IM node.exe 2>/dev/null | head -1
rm -f data/bookings.db data/bookings.db.tmp data/questions.db data/questions.db.tmp
git status --short```
Expected: the page HTML contains `Probefahrt-Drehbuch`, `Häufigste Kundenfragen (gesamt)`, `Probefahrt-Anfragen`, and `Route in Google Maps öffnen` (the analytics sections render at the top; the Drehbuch strings appear once a car card is expanded, but the section headings on the page are sufficient here). Working tree clean.

Slice 3 is complete. Slice 4 (polish: card disclosure chips, landing tagline, dashboard tabs) is planned separately.
