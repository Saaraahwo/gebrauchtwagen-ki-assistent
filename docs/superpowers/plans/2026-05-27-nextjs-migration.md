# Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Gebrauchtwagen KI-Assistent from single-file Express + CDN React (`server.js` 1211 lines + `public/index.html` 1638 lines) to a Next.js App Router app with TypeScript, Tailwind, and domain-grouped `lib/` modules.

**Architecture:** Next.js 14+ App Router. Server components render the buyer/seller shells and read data files directly. Client components handle interactive analysis/chat. Route handlers in `app/api/*/route.ts` are thin wrappers calling pure functions in `lib/cars`, `lib/ai`, `lib/auth`, `lib/questions`. Demo mode (no `ANTHROPIC_API_KEY`) is the fallback contract for every Claude call.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Vitest, `@anthropic-ai/sdk`, `jsonwebtoken`.

**Spec:** `docs/superpowers/specs/2026-05-27-nextjs-migration-design.md` — read first.

**Source files to port from:**
- `server.js` (1211 lines) — all backend logic
- `public/index.html` (1638 lines) — React + inline CSS frontend
- `10-example-cars.json` — car dataset
- Spec section "What this migration does NOT change" lists the contract: car shape, rules engine logic, damage DB content, Claude prompts, demo credentials, plain-text password compare, in-memory state, `BMW-GW-XXX` article number format, `claude-sonnet-4-6` model.

**Commit convention:** No `Co-Authored-By` trailer. Plain commit messages only (user preference, see `memory/feedback_commit_messages.md`).

---

## Phase 1 — Scaffold

### Task 1: Branch and remove old files

**Files:**
- Delete: `server.js`, `public/`, `10-example-cars.json`
- Keep: `Dockerfile`, `README.md`, `QUICK_START.md`, `.env.example`, `CLAUDE.md`, `docs/`, `node_modules/` (will be replaced)

- [ ] **Step 1: Create migration branch**

```bash
git checkout -b nextjs-migration
git status   # confirm clean
```

- [ ] **Step 2: Read source files into memory before deleting**

Before deleting `server.js`, `public/index.html`, and `10-example-cars.json`, confirm you have access to them via `git show master:server.js`, etc. They will live in git history. You will reference them throughout the migration.

```bash
git show master:server.js | head -5
git show master:public/index.html | head -5
git show master:10-example-cars.json | head -5
```

Expected: each shows the first 5 lines of the respective file.

- [ ] **Step 3: Delete old source files**

```bash
rm server.js
rm -rf public/
rm 10-example-cars.json
rm package.json package-lock.json
rm -rf node_modules/
```

Note: `package.json` is removed too so `create-next-app` in Task 2 can scaffold a fresh one cleanly. The new package.json will have entirely different dependencies.

- [ ] **Step 4: Commit deletion**

```bash
git add -A
git commit -m "Remove pre-migration Express + CDN React sources"
```

---

### Task 2: Initialize Next.js project

**Files:**
- Create: `package.json` (replaced), `tsconfig.json`, `next.config.mjs`, `next-env.d.ts`, `app/layout.tsx` (stub), `app/page.tsx` (stub), `app/globals.css`, `postcss.config.mjs`, `tailwind.config.ts`, `.gitignore` (Next.js additions)

- [ ] **Step 1: Run create-next-app non-interactively**

From repo root:

```bash
npx --yes create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias "@/*" --eslint --use-npm --no-turbopack
```

Answer "Yes" to overwrite existing files (Dockerfile, README.md, etc. — we'll merge by hand).

- [ ] **Step 2: Restore non-Next files we want to keep**

`create-next-app` may have overwritten our preserved files. Restore them from master:

```bash
git checkout master -- Dockerfile README.md QUICK_START.md .env.example CLAUDE.md docs/
```

Verify:
```bash
ls Dockerfile README.md .env.example CLAUDE.md
ls docs/superpowers/specs/ docs/superpowers/plans/
```

- [ ] **Step 3: Verify Next.js scaffold builds**

```bash
npm run build
```

Expected: builds without errors, generates `.next/`. Warnings about empty pages are OK.

- [ ] **Step 4: Commit scaffold**

```bash
git add -A
git commit -m "Scaffold Next.js project with TypeScript, Tailwind, App Router"
```

---

### Task 3: Add backend dependencies and Vitest

**Files:**
- Modify: `package.json` (add deps + scripts)
- Create: `vitest.config.ts`

- [ ] **Step 1: Install runtime deps**

```bash
npm install jsonwebtoken @anthropic-ai/sdk
npm install -D @types/jsonwebtoken vitest @vitest/ui happy-dom
```

- [ ] **Step 2: Create Vitest config**

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 3: Add test scripts to package.json**

Modify the `scripts` section of `package.json`:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

- [ ] **Step 4: Smoke-test Vitest**

Create `lib/_smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
describe('smoke', () => {
  it('runs', () => { expect(1 + 1).toBe(2); });
});
```

Run:
```bash
npm run test:run
```

Expected: 1 test passes.

Then delete the smoke file:
```bash
rm lib/_smoke.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add jsonwebtoken, anthropic SDK, and Vitest"
```

---

### Task 4: Move car data and create data types

**Files:**
- Create: `data/cars.json` (from master's `10-example-cars.json`)

- [ ] **Step 1: Restore car JSON into new location**

```bash
mkdir -p data
git show master:10-example-cars.json > data/cars.json
```

Verify:
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('data/cars.json','utf8')).length)"
```

Expected output: `10`

- [ ] **Step 2: Commit**

```bash
git add data/cars.json
git commit -m "Move car dataset to data/cars.json"
```

---

## Phase 2 — Port lib/cars (domain logic)

### Task 5: Define car and finding types

**Files:**
- Create: `lib/cars/types.ts`

- [ ] **Step 1: Create types file**

`lib/cars/types.ts`:
```typescript
export type DamageKey =
  | 'lack' | 'heck' | 'front' | 'motor' | 'struktur'
  | 'getriebe' | 'seite' | 'glas';

export interface Accident {
  type: string;
  damage: string;
  damageKey?: DamageKey;
  repairCost?: number;
  date: string;
}

export interface Car {
  id: number;
  name: string;
  subtitle?: string;
  price: number;
  km: number;
  yearBuilt: number;
  owners: number;
  maintenanceRecords: number;
  features: string[];
  accidents: Accident[];
  color?: string;
  enginePower?: string;
  fuel?: string;
  transmission?: string;
  emission?: string;
  consumption?: string;
  featureGroups?: Record<string, string[]>;
  polster?: string;
  interiorColor?: string;
}

export type Severity = 'red' | 'orange' | 'green';

export interface Finding {
  flag: string;
  message: string;
  severity: Severity;
  tip: string;
}

export interface Findings {
  red: Finding[];
  orange: Finding[];
  green: Finding[];
}

export type AnomalySeverity = 'info' | 'warning' | 'critical';

export interface Anomaly {
  flag: string;
  title: string;
  detail: string;
  tip: string;
  severity: AnomalySeverity;
}

export interface PriceAmpel {
  status: 'gut' | 'normal';
  label: string;
  expected: number;
  diff: number;
}

export interface DamageInfo {
  name: string;
  risiko: 'niedrig' | 'mittel' | 'hoch' | 'kritisch';
  kurzfristig: string;
  mittelfristig: string;
  langfristig: string;
  pruefung: string;
  kosten: string;
  preisAbzug: string;
  adacTipp: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/cars/types.ts
git commit -m "Add car and finding types"
```

---

### Task 6: Port rules engine

**Files:**
- Create: `lib/cars/rules-engine.ts`, `lib/cars/rules-engine.test.ts`
- Source: master `server.js:48-150` (`runRulesEngine`)

- [ ] **Step 1: Write failing tests**

`lib/cars/rules-engine.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { runRulesEngine } from './rules-engine';
import type { Car } from './types';

const baseCar: Car = {
  id: 1, name: 'BMW 118i', price: 18000, km: 60000, yearBuilt: 2019,
  owners: 2, maintenanceRecords: 8, features: [], accidents: [],
};

describe('runRulesEngine', () => {
  it('flags too many owners as red', () => {
    const f = runRulesEngine({ ...baseCar, owners: 6 });
    expect(f.red.some(x => x.flag === 'BESITZERHISTORIE')).toBe(true);
  });

  it('flags missing service records as orange', () => {
    const f = runRulesEngine({ ...baseCar, maintenanceRecords: 0, yearBuilt: 2015 });
    expect(f.orange.some(x => x.flag === 'SERVICEHISTORIE')).toBe(true);
  });

  it('flags high mileage as orange', () => {
    const f = runRulesEngine({ ...baseCar, km: 300000, yearBuilt: 2020 });
    expect(f.orange.some(x => x.flag === 'LAUFLEISTUNG')).toBe(true);
  });

  it('flags old car as orange', () => {
    const f = runRulesEngine({ ...baseCar, yearBuilt: 2005 });
    expect(f.orange.some(x => x.flag === 'FAHRZEUGALTER')).toBe(true);
  });

  it('flags accidents as red', () => {
    const f = runRulesEngine({
      ...baseCar,
      accidents: [{ type: 'Heckschaden', damage: 'Lack', date: '2022-03' }],
    });
    expect(f.red.some(x => x.flag === 'TRANSPARENTE UNFALLHISTORIE')).toBe(true);
  });

  it('flags rosa headlights as red', () => {
    const f = runRulesEngine({ ...baseCar, features: ['rosa Scheinwerfer'] });
    expect(f.red.some(x => x.flag === 'INDIVIDUALISIERUNG')).toBe(true);
  });

  it('flags suspiciously cheap Porsche as red', () => {
    const f = runRulesEngine({ ...baseCar, name: 'Porsche Cayman', price: 15000 });
    expect(f.red.some(x => x.flag === 'ATTRAKTIVES ANGEBOT')).toBe(true);
  });

  it('returns green for a clean car', () => {
    const f = runRulesEngine(baseCar);
    expect(f.red.length).toBe(0);
    expect(f.green.some(x => x.flag === 'GUTER ZUSTAND')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- lib/cars/rules-engine
```

Expected: 8 failing tests, "Cannot find module './rules-engine'".

- [ ] **Step 3: Port `runRulesEngine`**

`lib/cars/rules-engine.ts`:
```typescript
import type { Car, Findings } from './types';

export function runRulesEngine(carData: Car): Findings {
  const findings: Findings = { red: [], orange: [], green: [] };
  // Port from master server.js:48-150 verbatim:
  // - Rule 1: owners > 4 → red BESITZERHISTORIE
  // - Rule 2: maintenanceRecords < maxExpectedServices * 0.5 → orange SERVICEHISTORIE
  // - Rule 3: kmRatio > 1.5 → orange LAUFLEISTUNG
  // - Rule 4: age > 12 → orange FAHRZEUGALTER
  // - Rule 5: each accident → red TRANSPARENTE UNFALLHISTORIE
  // - Rule 6: feature includes 'rosa' → red INDIVIDUALISIERUNG
  // - Rule 7: suspiciousPrices map + price < min*0.5 → red ATTRAKTIVES ANGEBOT
  // - Rule 8: if no red and <=1 orange → green GUTER ZUSTAND
  // Preserve all message strings, tips, and conditions exactly.
  return findings;
}
```

Implementation requirement: copy the function body from `git show master:server.js | sed -n '48,150p'` and translate to TypeScript. All string literals, field names, and conditions must match the source exactly.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- lib/cars/rules-engine
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/cars/rules-engine.ts lib/cars/rules-engine.test.ts
git commit -m "Port rules engine to lib/cars/rules-engine.ts"
```

---

### Task 7: Port damage database and damage matcher

**Files:**
- Create: `lib/cars/damage-db.ts`, `lib/cars/damage-db.test.ts`
- Source: master `server.js:152-270` (`SCHADEN_DB`, `getSchadenFolgen`, `detectDamageKey`)

- [ ] **Step 1: Write failing tests**

`lib/cars/damage-db.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { SCHADEN_DB, getSchadenFolgen, detectDamageKey } from './damage-db';

describe('SCHADEN_DB', () => {
  it('has all 8 damage types', () => {
    expect(Object.keys(SCHADEN_DB).sort()).toEqual(
      ['front', 'getriebe', 'glas', 'heck', 'lack', 'motor', 'seite', 'struktur']
    );
  });

  it('each entry has required fields', () => {
    for (const key of Object.keys(SCHADEN_DB)) {
      const e = SCHADEN_DB[key as keyof typeof SCHADEN_DB];
      expect(e.name).toBeTruthy();
      expect(e.kurzfristig).toBeTruthy();
      expect(e.mittelfristig).toBeTruthy();
      expect(e.langfristig).toBeTruthy();
      expect(e.adacTipp).toBeTruthy();
    }
  });
});

describe('detectDamageKey', () => {
  it.each([
    ['Lackschaden vorne', 'lack'],
    ['Heckschaden klein', 'heck'],
    ['Frontschaden Kühler', 'front'],
    ['Motorschaden', 'motor'],
    ['A-Säule beschädigt', 'struktur'],
    ['Getriebeschaden', 'getriebe'],
    ['Tür eingedrückt', 'seite'],
    ['Windschutzscheibe gebrochen', 'glas'],
  ])('matches "%s" → "%s"', (text, expected) => {
    expect(detectDamageKey(text)).toBe(expected);
  });
});

describe('getSchadenFolgen', () => {
  it('returns null for no accidents', () => {
    expect(getSchadenFolgen(undefined)).toBeNull();
    expect(getSchadenFolgen([])).toBeNull();
  });

  it('matches damageKey to SCHADEN_DB entry', () => {
    const r = getSchadenFolgen([{ type: 'X', damage: 'Y', damageKey: 'motor', date: '2022' }]);
    expect(r).not.toBeNull();
    expect(r![0].key).toBe('motor');
    expect(r![0].db?.name).toContain('Motor');
  });

  it('falls back to text-based detection', () => {
    const r = getSchadenFolgen([{ type: 'Lackschaden', damage: 'Kotflügel', date: '2022' }]);
    expect(r![0].key).toBe('lack');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- lib/cars/damage-db
```

Expected: failing with "Cannot find module".

- [ ] **Step 3: Port damage database**

`lib/cars/damage-db.ts`:
```typescript
import type { Accident, DamageInfo, DamageKey } from './types';

export const SCHADEN_DB: Record<DamageKey, DamageInfo> = {
  // Port verbatim from master server.js:153-242
  // Each key: lack, heck, front, motor, struktur, getriebe, seite, glas
  // Preserve all string content exactly (it's research-backed customer-facing content).
} as Record<DamageKey, DamageInfo>;

export function detectDamageKey(text: string): DamageKey {
  // Port from master server.js:259-270
  // Lowercase + substring checks in this order:
  // 'lack'/'umlackier' → lack
  // 'heck' && !'scheib' → heck
  // 'front'/'kühler'/'motorhaube' → front
  // 'motor' → motor
  // 'struktur'/'säule'/'rahmen'/'karosserie' → struktur
  // 'getriebe' → getriebe
  // 'seite'/'tür'/'kotflügel'/'schweller' → seite
  // 'scheib'/'glas'/'windschutz' → glas
  // default → lack
  return 'lack';
}

export interface DamageFolge {
  acc: Accident;
  db: DamageInfo | null;
  key: DamageKey | 'unbekannt';
}

export function getSchadenFolgen(accidents: Accident[] | undefined): DamageFolge[] | null {
  // Port from master server.js:244-257
  if (!accidents || accidents.length === 0) return null;
  const results: DamageFolge[] = [];
  for (const acc of accidents) {
    const key = (acc.damageKey ?? detectDamageKey(acc.type + ' ' + (acc.damage || ''))) as DamageKey;
    const db = SCHADEN_DB[key] ?? null;
    results.push(db ? { acc, db, key } : { acc, db: null, key: 'unbekannt' });
  }
  return results;
}
```

Implementation requirement: copy all 8 SCHADEN_DB entries from `git show master:server.js | sed -n '153,242p'` verbatim. Each entry has 9 fields. Do not paraphrase the customer-facing strings.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- lib/cars/damage-db
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/cars/damage-db.ts lib/cars/damage-db.test.ts
git commit -m "Port damage database and detector"
```

---

### Task 8: Port anomaly detection

**Files:**
- Create: `lib/cars/anomaly-detection.ts`, `lib/cars/anomaly-detection.test.ts`
- Source: master `server.js:273-377` (`detectAuffaelligkeiten`)

- [ ] **Step 1: Write failing tests**

`lib/cars/anomaly-detection.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { detectAuffaelligkeiten } from './anomaly-detection';
import type { Car } from './types';

const baseCar: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 1, maintenanceRecords: 10, features: [], accidents: [],
};

describe('detectAuffaelligkeiten', () => {
  it('flags Laser-Scheinwerfer', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, features: ['Laser-Scheinwerfer'] });
    expect(a.some(x => x.flag === 'LASER_SCHEINWERFER')).toBe(true);
  });

  it('flags Euro 5 emission risk', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, emission: 'Euro 5' });
    expect(a.some(x => x.flag === 'FAHRVERBOT_RISIKO')).toBe(true);
  });

  it('flags M-car with many owners', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, name: 'BMW M3', owners: 4 });
    expect(a.some(x => x.flag === 'SPORTLICHE NUTZUNGSHISTORIE')).toBe(true);
  });

  it('flags exchange motor', () => {
    const a = detectAuffaelligkeiten({
      ...baseCar,
      accidents: [{ type: 'Motorschaden', damage: 'Austauschmotor', damageKey: 'motor', date: '2023' }],
    });
    expect(a.some(x => x.flag === 'AUSTAUSCHMOTOR')).toBe(true);
  });

  it('flags high repair-to-price ratio', () => {
    const a = detectAuffaelligkeiten({
      ...baseCar, price: 10000,
      accidents: [{ type: 'X', damage: 'Y', repairCost: 5000, date: '2023' }],
    });
    expect(a.some(x => x.flag === 'QUALITÄTSINVESTITION')).toBe(true);
  });

  it('flags missing service history on old car', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, maintenanceRecords: 0, yearBuilt: 2018 });
    expect(a.some(x => x.flag === 'SERVICEHISTORIE ANFRAGEN')).toBe(true);
  });

  it('flags very old high-mileage car', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, yearBuilt: 2010, km: 300000 });
    expect(a.some(x => x.flag === 'ERFAHRENES FAHRZEUG')).toBe(true);
  });

  it('flags unusual color', () => {
    const a = detectAuffaelligkeiten({ ...baseCar, color: 'rosa' });
    expect(a.some(x => x.flag === 'SONDERFARBE')).toBe(true);
  });

  it('returns empty array for clean car', () => {
    expect(detectAuffaelligkeiten(baseCar)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- lib/cars/anomaly-detection
```

- [ ] **Step 3: Port `detectAuffaelligkeiten`**

`lib/cars/anomaly-detection.ts`:
```typescript
import type { Car, Anomaly } from './types';

export function detectAuffaelligkeiten(car: Car): Anomaly[] {
  // Port from master server.js:273-377 verbatim.
  // 8 detection rules in order:
  // 1. Laser headlights → LASER_SCHEINWERFER (severity 'info')
  // 2. Euro 3/4/5 → FAHRVERBOT_RISIKO (severity 'warning')
  // 3. M-car regex + owners >= 3 → SPORTLICHE NUTZUNGSHISTORIE (severity 'warning')
  // 4. Motor swap detection → AUSTAUSCHMOTOR (severity 'critical')
  // 5. totalRepair > price * 0.35 → QUALITÄTSINVESTITION (severity 'warning')
  // 6. maintenanceRecords === 0 && age > 2 → SERVICEHISTORIE ANFRAGEN (severity 'critical')
  // 7. age >= 12 && km > 250000 → ERFAHRENES FAHRZEUG (severity 'warning')
  // 8. unusual color terms → SONDERFARBE (severity 'info')
  // Preserve all strings exactly; they are customer-facing.
  return [];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- lib/cars/anomaly-detection
```

- [ ] **Step 5: Commit**

```bash
git add lib/cars/anomaly-detection.ts lib/cars/anomaly-detection.test.ts
git commit -m "Port anomaly detection to lib/cars/anomaly-detection.ts"
```

---

### Task 9: Port price calculator

**Files:**
- Create: `lib/cars/price-calculator.ts`, `lib/cars/price-calculator.test.ts`
- Source: master `server.js:380-410` (`calcPreisAmpel`)

- [ ] **Step 1: Write failing tests**

`lib/cars/price-calculator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calcPreisAmpel } from './price-calculator';
import type { Car } from './types';

const baseCar: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 1, maintenanceRecords: 10, features: [], accidents: [],
};

describe('calcPreisAmpel', () => {
  it('returns required fields', () => {
    const p = calcPreisAmpel(baseCar);
    expect(p).toHaveProperty('status');
    expect(p).toHaveProperty('label');
    expect(p).toHaveProperty('expected');
    expect(p).toHaveProperty('diff');
    expect(typeof p.expected).toBe('number');
  });

  it('expected value reflects accident penalty (×0.88)', () => {
    const clean = calcPreisAmpel(baseCar).expected;
    const wrecked = calcPreisAmpel({
      ...baseCar,
      accidents: [{ type: 'X', damage: 'Y', date: '2022' }],
    }).expected;
    expect(wrecked).toBeLessThan(clean);
  });

  it('flags significantly underpriced as "gut"', () => {
    const p = calcPreisAmpel({ ...baseCar, price: 5000 });
    expect(p.status).toBe('gut');
    expect(p.label).toMatch(/unter Marktwert/);
  });

  it('handles unknown model with default base 35000', () => {
    const p = calcPreisAmpel({ ...baseCar, name: 'Unknown Brand' });
    expect(p.expected).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- lib/cars/price-calculator
```

- [ ] **Step 3: Port `calcPreisAmpel`**

`lib/cars/price-calculator.ts`:
```typescript
import type { Car, PriceAmpel } from './types';

export function calcPreisAmpel(car: Car): PriceAmpel {
  // Port from master server.js:380-410 verbatim.
  // - refs map of model substrings to base prices
  // - depreciation curve: 0.85 first year, 0.90 next 4, 0.92 after, capped at 15y
  // - km penalty: (km - age*13000) * 0.06
  // - accident penalty: × 0.88
  // - owners > 2 penalty: × 0.96
  // - no service penalty: × 0.93
  // - round to nearest 100, min 1000
  // - diff = (price - expected) / expected * 100, rounded
  // - status/label:
  //   diff <= -12 → 'gut', label "{abs(diff)}% unter Marktwert"
  //   diff >= 12  → 'normal', label 'Marktpreis – Verhandlungsspielraum möglich'
  //   else        → 'normal', label 'Marktwert (±12%)'
  return { status: 'normal', label: '', expected: 0, diff: 0 };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- lib/cars/price-calculator
```

- [ ] **Step 5: Commit**

```bash
git add lib/cars/price-calculator.ts lib/cars/price-calculator.test.ts
git commit -m "Port price calculator to lib/cars/price-calculator.ts"
```

---

## Phase 3 — Port lib/ai

### Task 10: Port demo analysis

**Files:**
- Create: `lib/ai/demo-analysis.ts`, `lib/ai/demo-analysis.test.ts`
- Source: master `server.js:775-851` (`generateDemoAnalysis`)

- [ ] **Step 1: Write failing tests**

`lib/ai/demo-analysis.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateDemoAnalysis } from './demo-analysis';
import type { Car, Findings } from '@/lib/cars/types';

const car: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 1, maintenanceRecords: 10, features: [], accidents: [],
};
const findings: Findings = { red: [], orange: [], green: [] };

describe('generateDemoAnalysis', () => {
  it('returns a non-empty string', () => {
    const a = generateDemoAnalysis(car, findings);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(100);
  });

  it('includes the demo-mode footer', () => {
    expect(generateDemoAnalysis(car, findings)).toContain('Demo-Modus');
  });

  it('includes accident analysis when accidents present', () => {
    const withAcc: Car = {
      ...car,
      accidents: [{ type: 'Heckschaden', damage: 'Lack', damageKey: 'heck', repairCost: 1500, date: '2022' }],
    };
    const a = generateDemoAnalysis(withAcc, findings);
    expect(a).toMatch(/UNFALLSCHÄDEN/i);
    expect(a).toContain('1.500');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- lib/ai/demo-analysis
```

- [ ] **Step 3: Port `generateDemoAnalysis`**

`lib/ai/demo-analysis.ts`:
```typescript
import type { Car, Findings } from '@/lib/cars/types';
import { getSchadenFolgen } from '@/lib/cars/damage-db';

export function generateDemoAnalysis(carData: Car, findings: Findings): string {
  // Port verbatim from master server.js:775-851.
  // Returns a multi-line string with:
  // - Header (42 dashes)
  // - SCHRITT 1: FAHRZEUGWERTE (age, km, owners, service)
  // - SCHRITT 2: UNFALLSCHÄDEN & LANGZEITFOLGEN (if accidents) - uses getSchadenFolgen
  // - SCHRITT 3: REPARATURPLAN 12 MONATE
  // - TOP 5 FRAGEN AN DEN VERKÄUFER
  // - FAZIT (varies by findings.red.length)
  // - "[Demo-Modus – ...]" footer
  // Preserve all formatting, emojis, and string content exactly.
  return '';
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- lib/ai/demo-analysis
```

- [ ] **Step 5: Commit**

```bash
git add lib/ai/demo-analysis.ts lib/ai/demo-analysis.test.ts
git commit -m "Port demo analysis to lib/ai/demo-analysis.ts"
```

---

### Task 11: Port demo chat

**Files:**
- Create: `lib/ai/demo-chat.ts`, `lib/ai/demo-chat.test.ts`
- Source: master `server.js:413-772` (`generateDemoChatResponse`)

- [ ] **Step 1: Write failing tests**

`lib/ai/demo-chat.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateDemoChatResponse } from './demo-chat';
import type { Car } from '@/lib/cars/types';

const car: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 2, maintenanceRecords: 10, features: ['Navi', 'Sitzheizung'], accidents: [],
  enginePower: '135 kW', fuel: 'Benzin', transmission: 'Automatik',
  emission: 'Euro 6', consumption: '7.5', color: 'Alpinweiß', polster: 'Leder',
  interiorColor: 'Schwarz',
};

describe('generateDemoChatResponse', () => {
  it('returns ausstattung info for "ausstattung" question', () => {
    const r = generateDemoChatResponse(car, [], 'Was ist alles drin?');
    expect(r).toMatch(/Ausstattung/i);
    expect(r).toContain('Navi');
  });

  it('returns motor info for motor question', () => {
    const r = generateDemoChatResponse(car, [], 'Wie ist der Motor?');
    expect(r).toMatch(/Motor/);
  });

  it('returns brakes info for "bremse" question', () => {
    const r = generateDemoChatResponse(car, [], 'Sind die Bremsen ok?');
    expect(r).toMatch(/Bremse/);
  });

  it('returns price evaluation for price question', () => {
    const r = generateDemoChatResponse(car, [], 'Wie ist der Preis?');
    expect(r).toMatch(/Preis/i);
  });

  it('returns default topic list for unmatched question', () => {
    const r = generateDemoChatResponse(car, [], 'asdfqwerty');
    expect(r).toMatch(/Kilometerstand/);
    expect(r).toMatch(/Motor/);
  });

  it('handles accident-related questions when no accidents', () => {
    const r = generateDemoChatResponse(car, [], 'Hatte er einen Unfall?');
    expect(r).toMatch(/keine bekannte Unfallhistorie/i);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- lib/ai/demo-chat
```

- [ ] **Step 3: Port `generateDemoChatResponse`**

`lib/ai/demo-chat.ts`:
```typescript
import type { Car } from '@/lib/cars/types';
import { SCHADEN_DB, getSchadenFolgen } from '@/lib/cars/damage-db';
import { detectAuffaelligkeiten } from '@/lib/cars/anomaly-detection';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function generateDemoChatResponse(
  carData: Car,
  messages: ChatMessage[],
  userMessage: string,
): string {
  // Port verbatim from master server.js:413-772.
  // Pattern: regex helper r(pattern) → match userMessage case-insensitive.
  // Branches in this exact order (later branches are matched only if earlier ones miss):
  //   1. ausstatt/navi/sitzheiz/... → Ausstattungscheck (specific match first)
  //   2. farbe/außenfarbe/exterieur → Exterieur
  //   3. unfall/schaden/reparatur → Unfallhistorie
  //   4. karosserie/lack/spaltmaß → Karosserie & Lack (with umlackier cost sub-branch)
  //   5. scheib/dichtung/glas → Scheiben & Dichtungen
  //   6. motor/motorraum/öl → Motor
  //   7. getriebe/kupplung → Getriebe
  //   8. bremse → Bremsen
  //   9. fahrwerk/lenkung → Fahrwerk & Lenkung
  //   10. reifen/felgen → Reifen & Felgen
  //   11. innenraum/polster/sitz → Innenraum
  //   12. elektron/elektrik → Elektronik
  //   13. service/wartung/heft → Servicehistorie
  //   14. km/kilometer → Kilometerstand
  //   15. preis/wert/marktwert → Preiseinschätzung
  //   16. vorbesitzer/besitzer/hand → Vorbesitzer
  //   17. adac/tüv/dekra → Prüfungen vor dem Kauf
  //   18. auffällig/scheinwerfer/emission → Hinweise (calls detectAuffaelligkeiten)
  //   19. jahreskosten/unterhalt → Jahreskosten
  //   20. probefahrt/testfahrt → Probefahrt
  //   21. pflege/vorbeug/rost → Pflege & Vorsorge
  //   22. worauf/achten/prüfen → Wichtigste Prüfpunkte (catch-all)
  //   23. ausstatt (general, catch-all) → Ausstattung
  //   24. kost/teuer → Kosten & Preise
  //   25. default → topic list + invitation
  // Preserve all string content, formatting, and emojis exactly.
  return '';
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- lib/ai/demo-chat
```

- [ ] **Step 5: Commit**

```bash
git add lib/ai/demo-chat.ts lib/ai/demo-chat.test.ts
git commit -m "Port demo chat response generator"
```

---

### Task 12: Create Claude client singleton

**Files:**
- Create: `lib/ai/claude-client.ts`

- [ ] **Step 1: Write the client module**

`lib/ai/claude-client.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const placeholderPattern = /HIER-DEINEN-KEY/;

export const hasApiKey =
  !!apiKey && apiKey.length > 0 && !placeholderPattern.test(apiKey);

export const client: Anthropic | null = hasApiKey ? new Anthropic() : null;

export const CLAUDE_MODEL = 'claude-sonnet-4-6';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/ai/claude-client.ts
git commit -m "Add Claude client singleton with hasApiKey check"
```

---

### Task 13: Port analysis service with demo fallback

**Files:**
- Create: `lib/ai/analysis.ts`, `lib/ai/analysis.test.ts`
- Source: master `server.js:853-921` (`analyzeCarWithClaude`)

- [ ] **Step 1: Write failing tests**

`lib/ai/analysis.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Car, Findings } from '@/lib/cars/types';

// Force demo mode by mocking the claude-client module
vi.mock('./claude-client', () => ({
  hasApiKey: false,
  client: null,
  CLAUDE_MODEL: 'claude-sonnet-4-6',
}));

const car: Car = {
  id: 1, name: 'BMW 320i', price: 25000, km: 80000, yearBuilt: 2018,
  owners: 1, maintenanceRecords: 10, features: ['Navi'], accidents: [],
  enginePower: '135 kW', fuel: 'Benzin', color: 'Schwarz', transmission: 'Automatik',
};
const findings: Findings = { red: [], orange: [], green: [] };

describe('analyzeCarWithClaude (demo mode)', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns demo analysis when no API key set', async () => {
    const { analyzeCarWithClaude } = await import('./analysis');
    const result = await analyzeCarWithClaude(car, findings);
    expect(result.model).toBe('demo-mode');
    expect(typeof result.analysis).toBe('string');
    expect(result.analysis).toContain('Demo-Modus');
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
});
```

Note on testing: testing the real Claude call requires a network and key. Per the spec, only the demo-mode path is tested. The fallback-on-error path is verified by reading code.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- lib/ai/analysis
```

- [ ] **Step 3: Port `analyzeCarWithClaude`**

`lib/ai/analysis.ts`:
```typescript
import type { Car, Findings } from '@/lib/cars/types';
import { client, hasApiKey, CLAUDE_MODEL } from './claude-client';
import { generateDemoAnalysis } from './demo-analysis';

export interface AnalysisResult {
  analysis: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

const SYSTEM_PROMPT = `Du bist ein Gebrauchtwagen-Experte mit 15 Jahren Erfahrung. Du analysierst Fahrzeuge transparent und denkst laut nach.

Deine Aufgabe:
1. Erkläre jeden Wert des Autos und was er bedeutet
2. Vergleiche mit Standard-Werten (z.B. normale km/Jahr: 12000)
3. Identifiziere Anomalien
4. Bei Unfallwagen: Berechne langfristige Folgen
5. Erstelle einen Reparaturplan für nächste 12 Monate
6. Top 5 Fragen, die der Käufer stellen sollte

Format: Strukturiert, transparent, ehrlich.`;

function buildUserPrompt(car: Car, findings: Findings): string {
  // Port from master server.js:876-895 verbatim.
  return '';
}

export async function analyzeCarWithClaude(
  carData: Car,
  findings: Findings,
): Promise<AnalysisResult> {
  if (!hasApiKey || !client) {
    return {
      analysis: generateDemoAnalysis(carData, findings),
      model: 'demo-mode',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  try {
    const msg = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(carData, findings) }],
    });
    const textBlock = msg.content[0];
    const analysis = textBlock.type === 'text' ? textBlock.text : '';
    return {
      analysis,
      model: CLAUDE_MODEL,
      usage: {
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
      },
    };
  } catch (err) {
    console.error('Claude API error, falling back to demo:', err);
    return {
      analysis: generateDemoAnalysis(carData, findings),
      model: 'demo-mode (API Fehler)',
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}
```

Implementation: port `buildUserPrompt` body from master `server.js:876-895` verbatim.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- lib/ai/analysis
```

- [ ] **Step 5: Commit**

```bash
git add lib/ai/analysis.ts lib/ai/analysis.test.ts
git commit -m "Port Claude analysis service with demo fallback"
```

---

### Task 14: Port chat service with demo fallback

**Files:**
- Create: `lib/ai/chat.ts`
- Source: master `server.js:1140-1181` (`/api/cars/chat` handler body — extract the service logic)

- [ ] **Step 1: Write the chat service**

`lib/ai/chat.ts`:
```typescript
import type { Car } from '@/lib/cars/types';
import { client, hasApiKey, CLAUDE_MODEL } from './claude-client';
import { generateDemoChatResponse, type ChatMessage } from './demo-chat';

export interface ChatResult {
  reply: string;
  model: string;
}

function buildSystemPrompt(car: Car): string {
  // Port from master server.js:1152-1159 verbatim.
  return `Du bist ein erfahrener Gebrauchtwagen-Experte (15 Jahre Erfahrung, ADAC-zertifiziert).
Du berätst Käufer zu folgendem Fahrzeug:
- ${car.name} ${car.subtitle ?? ''}, Baujahr ${car.yearBuilt}
- Preis: ${car.price} €, ${car.km} km, ${car.owners} Vorbesitzer
- Unfälle: ${car.accidents?.length > 0 ? car.accidents.map(a => a.type + ': ' + a.damage).join(' | ') : 'keine bekannt'}
- Service-Einträge: ${car.maintenanceRecords}

Antworte präzise, auf Deutsch, mit konkreten Zahlen und Kosten. Nutze Markdown-Formatierung (**, •). Max. 200 Wörter pro Antwort.`;
}

export async function chatWithClaude(
  carData: Car,
  messages: ChatMessage[],
  userMessage: string,
): Promise<ChatResult> {
  if (!hasApiKey || !client) {
    return {
      reply: generateDemoChatResponse(carData, messages, userMessage),
      model: 'demo-mode',
    };
  }

  try {
    const chatMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: buildSystemPrompt(carData),
      messages: chatMessages,
    });
    const block = response.content[0];
    const reply = block.type === 'text' ? block.text : '';
    return { reply, model: CLAUDE_MODEL };
  } catch {
    return {
      reply: generateDemoChatResponse(carData, messages, userMessage),
      model: 'demo-mode (API Fehler)',
    };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/ai/chat.ts
git commit -m "Port Claude chat service with demo fallback"
```

---

## Phase 4 — Auth and question log

### Task 15: Port JWT helpers, sellers store, and require-seller middleware

**Files:**
- Create: `lib/auth/jwt.ts`, `lib/auth/sellers.ts`, `lib/auth/require-seller.ts`
- Source: master `server.js:9` (JWT_SECRET default), `:26-33` (sellers), `:924-952` (login), `:1001-1015` (verifyToken)

- [ ] **Step 1: Create JWT helper**

`lib/auth/jwt.ts`:
```typescript
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';

export interface SellerPayload {
  sellerId: string;
  email: string;
}

export function signToken(payload: SellerPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyTokenString(token: string): SellerPayload {
  return jwt.verify(token, JWT_SECRET) as SellerPayload;
}
```

- [ ] **Step 2: Create sellers store**

`lib/auth/sellers.ts`:
```typescript
export interface Seller {
  id: string;
  email: string;
  // Misleadingly named in MVP: actually contains a placeholder, NOT a hash.
  // Password comparison happens against the literal string 'demo123' in the
  // login route. Do not "fix" this — it preserves demo behavior.
  passwordHash: string;
  name: string;
}

export const DEMO_PASSWORD = 'demo123';

export const sellers: Record<string, Seller> = {
  'demo@carcheck.de': {
    id: 'seller-1',
    email: 'demo@carcheck.de',
    passwordHash: 'hashed-password-demo',
    name: 'Max Müller',
  },
};
```

- [ ] **Step 3: Create require-seller helper**

`lib/auth/require-seller.ts`:
```typescript
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyTokenString, type SellerPayload } from './jwt';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const COOKIE_NAME = 'seller_token';

export function requireSellerFromRequest(req: NextRequest): SellerPayload {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) throw new AuthError('No token');
  try {
    return verifyTokenString(token);
  } catch {
    throw new AuthError('Invalid token');
  }
}

export async function getSellerFromCookies(): Promise<SellerPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyTokenString(token);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/auth/
git commit -m "Add JWT helpers, sellers store, and require-seller middleware"
```

---

### Task 16: Port question log

**Files:**
- Create: `lib/questions/log.ts`, `lib/questions/log.test.ts`
- Source: master `server.js:35-45` and `:1192-1204`

- [ ] **Step 1: Write failing tests**

`lib/questions/log.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { articleNr, logQuestion, getQuestionsForCar, _resetLog } from './log';

describe('articleNr', () => {
  it('formats car id to BMW-GW-XXX', () => {
    expect(articleNr(1)).toBe('BMW-GW-001');
    expect(articleNr(42)).toBe('BMW-GW-042');
    expect(articleNr(123)).toBe('BMW-GW-123');
  });
});

describe('logQuestion + getQuestionsForCar', () => {
  beforeEach(() => { _resetLog(); });

  it('stores and retrieves a question', () => {
    logQuestion(1, 'BMW 320i', 'Welcher Motor?', 'Benziner');
    const out = getQuestionsForCar(1);
    expect(out.articleNr).toBe('BMW-GW-001');
    expect(out.logs.length).toBe(1);
    expect(out.logs[0].question).toBe('Welcher Motor?');
  });

  it('builds FAQ sorted by count', () => {
    logQuestion(1, 'BMW', 'Wie viele km?', 'A1');
    logQuestion(1, 'BMW', 'Wie viele km?', 'A1');
    logQuestion(1, 'BMW', 'Hat es Unfälle?', 'A2');
    const { faq } = getQuestionsForCar(1);
    expect(faq[0].count).toBe(2);
    expect(faq[0].question).toBe('Wie viele km?');
    expect(faq[1].count).toBe(1);
  });

  it('returns empty for unknown car', () => {
    const out = getQuestionsForCar(999);
    expect(out.logs).toEqual([]);
    expect(out.faq).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- lib/questions/log
```

- [ ] **Step 3: Implement question log**

`lib/questions/log.ts`:
```typescript
export interface QuestionEntry {
  articleNr: string;
  carName: string;
  question: string;
  answer: string;
  ts: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
  count: number;
}

const log: Record<number, QuestionEntry[]> = {};

export function articleNr(carId: number): string {
  return `BMW-GW-${String(carId).padStart(3, '0')}`;
}

export function logQuestion(
  carId: number,
  carName: string,
  question: string,
  answer: string,
): void {
  if (!log[carId]) log[carId] = [];
  log[carId].push({
    articleNr: articleNr(carId),
    carName,
    question,
    answer,
    ts: new Date().toISOString(),
  });
}

export function getQuestionsForCar(carId: number): {
  articleNr: string;
  logs: QuestionEntry[];
  faq: FaqEntry[];
} {
  const logs = log[carId] || [];
  const counts: Record<string, FaqEntry> = {};
  for (const entry of logs) {
    const key = entry.question.toLowerCase().trim();
    if (!counts[key]) {
      counts[key] = { question: entry.question, answer: entry.answer, count: 0 };
    }
    counts[key].count++;
  }
  const faq = Object.values(counts).sort((a, b) => b.count - a.count);
  return { articleNr: articleNr(carId), logs, faq };
}

// Test helper — do not call from production code.
export function _resetLog(): void {
  for (const k of Object.keys(log)) delete log[Number(k)];
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- lib/questions/log
```

- [ ] **Step 5: Commit**

```bash
git add lib/questions/
git commit -m "Port question log + article number formatting"
```

---

## Phase 5 — API routes (thin wrappers)

### Task 17: GET /api/cars

**Files:**
- Create: `app/api/cars/route.ts`

- [ ] **Step 1: Implement the route**

`app/api/cars/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Car } from '@/lib/cars/types';

const cars: Car[] = JSON.parse(
  readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
);

export function GET() {
  return NextResponse.json(cars);
}
```

- [ ] **Step 2: Smoke-test**

In one terminal:
```bash
npm run dev
```

In another:
```bash
curl http://localhost:3000/api/cars | head -c 200
```

Expected: JSON array starts with `[{"id":1,"name":"BMW...`.

Stop the dev server (Ctrl+C).

- [ ] **Step 3: Commit**

```bash
git add app/api/cars/route.ts
git commit -m "Add GET /api/cars route handler"
```

---

### Task 18: POST /api/cars/analyze

**Files:**
- Create: `app/api/cars/analyze/route.ts`

- [ ] **Step 1: Implement the route**

`app/api/cars/analyze/route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { runRulesEngine } from '@/lib/cars/rules-engine';
import { detectAuffaelligkeiten } from '@/lib/cars/anomaly-detection';
import { calcPreisAmpel } from '@/lib/cars/price-calculator';
import { analyzeCarWithClaude } from '@/lib/ai/analysis';
import type { Car } from '@/lib/cars/types';

export async function POST(req: NextRequest) {
  let carData: Car;
  try {
    carData = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!carData?.name || typeof carData.price !== 'number' || typeof carData.km !== 'number') {
    return NextResponse.json({ error: 'Fehlende Auto-Daten' }, { status: 400 });
  }

  const findings = runRulesEngine(carData);
  const auffaelligkeiten = detectAuffaelligkeiten(carData);
  const preisAmpel = calcPreisAmpel(carData);
  const aiAnalysis = await analyzeCarWithClaude(carData, findings);

  return NextResponse.json({
    success: true,
    analysis: {
      carData,
      findings,
      auffaelligkeiten,
      preisAmpel,
      aiAnalysis,
      timestamp: new Date().toISOString(),
    },
  });
}
```

- [ ] **Step 2: Smoke-test**

```bash
npm run dev &
sleep 5
curl -X POST http://localhost:3000/api/cars/analyze \
  -H "Content-Type: application/json" \
  -d '{"id":1,"name":"BMW 320i","price":25000,"km":80000,"yearBuilt":2018,"owners":2,"maintenanceRecords":8,"features":[],"accidents":[]}' \
  | head -c 300
kill %1 2>/dev/null || true
```

Expected: JSON with `success: true`, `analysis: { findings, auffaelligkeiten, preisAmpel, aiAnalysis }`.

- [ ] **Step 3: Commit**

```bash
git add app/api/cars/analyze/
git commit -m "Add POST /api/cars/analyze route handler"
```

---

### Task 19: POST /api/cars/chat

**Files:**
- Create: `app/api/cars/chat/route.ts`

- [ ] **Step 1: Implement the route**

`app/api/cars/chat/route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { chatWithClaude } from '@/lib/ai/chat';
import { logQuestion } from '@/lib/questions/log';
import type { Car } from '@/lib/cars/types';
import type { ChatMessage } from '@/lib/ai/demo-chat';

interface ChatRequest {
  carData: Car;
  messages?: ChatMessage[];
  message: string;
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { carData, messages = [], message } = body;
  if (!carData || !message) {
    return NextResponse.json({ error: 'carData und message erforderlich' }, { status: 400 });
  }

  const { reply, model } = await chatWithClaude(carData, messages, message);
  if (carData.id) logQuestion(carData.id, carData.name, message, reply);
  return NextResponse.json({ reply, model });
}
```

- [ ] **Step 2: Smoke-test**

```bash
npm run dev &
sleep 5
curl -X POST http://localhost:3000/api/cars/chat \
  -H "Content-Type: application/json" \
  -d '{"carData":{"id":1,"name":"BMW 320i","price":25000,"km":80000,"yearBuilt":2018,"owners":2,"maintenanceRecords":8,"features":[],"accidents":[]},"message":"Wie ist der Motor?"}' \
  | head -c 200
kill %1 2>/dev/null || true
```

Expected: `{"reply":"**Motor – BMW 320i ...","model":"demo-mode"}`.

- [ ] **Step 3: Commit**

```bash
git add app/api/cars/chat/
git commit -m "Add POST /api/cars/chat route handler"
```

---

### Task 20: log-question and questions/[id] routes

**Files:**
- Create: `app/api/cars/log-question/route.ts`, `app/api/cars/questions/[id]/route.ts`

- [ ] **Step 1: Implement log-question**

`app/api/cars/log-question/route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { logQuestion, articleNr } from '@/lib/questions/log';

export async function POST(req: NextRequest) {
  let body: { carId?: number; carName?: string; question?: string; answer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { carId, carName, question, answer } = body;
  if (!carId || !question) {
    return NextResponse.json({ error: 'carId und question erforderlich' }, { status: 400 });
  }
  logQuestion(carId, carName || '–', question, answer || '–');
  return NextResponse.json({ ok: true, articleNr: articleNr(carId) });
}
```

- [ ] **Step 2: Implement questions/[id]**

`app/api/cars/questions/[id]/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { getQuestionsForCar } from '@/lib/questions/log';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const carId = parseInt(id, 10);
  if (Number.isNaN(carId)) {
    return NextResponse.json({ error: 'Invalid car id' }, { status: 400 });
  }
  return NextResponse.json(getQuestionsForCar(carId));
}
```

- [ ] **Step 3: Smoke-test both**

```bash
npm run dev &
sleep 5
curl -X POST http://localhost:3000/api/cars/log-question \
  -H "Content-Type: application/json" \
  -d '{"carId":1,"carName":"BMW 320i","question":"Test","answer":"Antwort"}'
curl http://localhost:3000/api/cars/questions/1
kill %1 2>/dev/null || true
```

Expected: first call returns `{"ok":true,"articleNr":"BMW-GW-001"}`; second returns the logged question. Note: in-memory state, so this only works if both calls hit the same dev server instance.

- [ ] **Step 4: Commit**

```bash
git add app/api/cars/log-question/ app/api/cars/questions/
git commit -m "Add log-question and questions/[id] route handlers"
```

---

### Task 21: Seller login + logout

**Files:**
- Create: `app/api/sellers/login/route.ts`, `app/api/sellers/logout/route.ts`

- [ ] **Step 1: Implement login**

`app/api/sellers/login/route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { signToken } from '@/lib/auth/jwt';
import { sellers, DEMO_PASSWORD } from '@/lib/auth/sellers';
import { COOKIE_NAME } from '@/lib/auth/require-seller';

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email und Password erforderlich' }, { status: 400 });
  }

  const seller = sellers[email];
  // Plain-text password comparison preserved from MVP (see lib/auth/sellers.ts).
  if (!seller || password !== DEMO_PASSWORD) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = signToken({ sellerId: seller.id, email: seller.email });
  const res = NextResponse.json({
    success: true,
    seller: { id: seller.id, email: seller.email, name: seller.name },
  });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
```

- [ ] **Step 2: Implement logout**

`app/api/sellers/logout/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth/require-seller';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
```

- [ ] **Step 3: Smoke-test login + cookie**

```bash
npm run dev &
sleep 5
curl -i -X POST http://localhost:3000/api/sellers/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@carcheck.de","password":"demo123"}' \
  | grep -E "Set-Cookie|success"
kill %1 2>/dev/null || true
```

Expected: response includes `Set-Cookie: seller_token=...; HttpOnly` and JSON `{"success":true,...}`.

- [ ] **Step 4: Commit**

```bash
git add app/api/sellers/login/ app/api/sellers/logout/
git commit -m "Add seller login (cookie-based) and logout routes"
```

---

### Task 22: Seller dashboard route

**Files:**
- Create: `app/api/sellers/dashboard/route.ts`
- Source: master `server.js:1017-1070` (`/api/sellers/dashboard` handler)

- [ ] **Step 1: Implement the route**

`app/api/sellers/dashboard/route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { requireSellerFromRequest, AuthError } from '@/lib/auth/require-seller';

export async function GET(req: NextRequest) {
  let seller;
  try {
    seller = requireSellerFromRequest(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  // Port dashboard data verbatim from master server.js:1019-1067.
  const dashboardData = {
    sellerInfo: { email: seller.email, name: 'Max Müller' },
    statistics: {
      carsAnalyzed: 47,
      commonAnomalies: [
        { type: 'Too many owners', count: 12 },
        { type: 'Low maintenance history', count: 8 },
        { type: 'High mileage', count: 15 },
      ],
    },
    trainingData: {
      // ... port verbatim from server.js:1033-1062
    },
    faqPack: {
      downloadUrl: '/api/sellers/faq-pack',
      format: 'PDF mit allen Standardfragen und Antworten',
    },
  };

  return NextResponse.json(dashboardData);
}
```

Implementation: copy the full `trainingData` object verbatim from `git show master:server.js | sed -n '1033,1062p'`.

- [ ] **Step 2: Smoke-test (with cookie)**

```bash
npm run dev &
sleep 5
# Login and capture cookie:
curl -c /tmp/cookies.txt -X POST http://localhost:3000/api/sellers/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@carcheck.de","password":"demo123"}' > /dev/null
# Use cookie:
curl -b /tmp/cookies.txt http://localhost:3000/api/sellers/dashboard | head -c 200
kill %1 2>/dev/null || true
```

Expected: JSON with `sellerInfo`, `statistics`, `trainingData`, `faqPack`.

- [ ] **Step 3: Verify 401 without cookie**

```bash
curl -i http://localhost:3000/api/sellers/dashboard 2>&1 | grep "401"
```

Expected: shows `HTTP/1.1 401 Unauthorized`.

- [ ] **Step 4: Commit**

```bash
git add app/api/sellers/dashboard/
git commit -m "Add GET /api/sellers/dashboard (cookie-auth) route handler"
```

---

### Task 23: Seller FAQ pack route

**Files:**
- Create: `app/api/sellers/faq-pack/route.ts`
- Source: master `server.js:1072-1137` (`/api/sellers/faq-pack` handler with FAQ text)

- [ ] **Step 1: Implement the route**

`app/api/sellers/faq-pack/route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { requireSellerFromRequest, AuthError } from '@/lib/auth/require-seller';

const FAQ_TEXT = `
GEBRAUCHTWAGEN-VERKÄUFER FAQ PACK
==================================

1. UNFALLWAGEN - LACKSCHÄDEN
... [PORT FULL TEXT VERBATIM FROM master server.js:1074-1132]
`;

export async function GET(req: NextRequest) {
  try {
    requireSellerFromRequest(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  return new NextResponse(FAQ_TEXT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="FAQ-Pack.txt"',
    },
  });
}
```

Implementation requirement: copy the full FAQ_TEXT content verbatim from `git show master:server.js | sed -n '1074,1132p'`.

- [ ] **Step 2: Smoke-test**

```bash
npm run dev &
sleep 5
curl -c /tmp/cookies.txt -X POST http://localhost:3000/api/sellers/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@carcheck.de","password":"demo123"}' > /dev/null
curl -b /tmp/cookies.txt http://localhost:3000/api/sellers/faq-pack | head -10
kill %1 2>/dev/null || true
```

Expected: text starts with `GEBRAUCHTWAGEN-VERKÄUFER FAQ PACK`.

- [ ] **Step 3: Commit**

```bash
git add app/api/sellers/faq-pack/
git commit -m "Add GET /api/sellers/faq-pack route handler"
```

---

## Phase 6 — UI foundation

### Task 24: Tailwind config + root layout + globals

**Files:**
- Modify: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`
- Source: master `public/index.html:11-13` (font import), `:17-99` (header/breadcrumb CSS for design tokens)

- [ ] **Step 1: Configure Tailwind with BMW design tokens**

`tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bmw: {
          blue: '#1c69d4',
          dark: '#1c1c1c',
          gray: {
            border: '#e0e0e0',
            text: '#555555',
            muted: '#888888',
            bg: '#f5f5f5',
          },
        },
        flag: {
          red: '#dc2626',
          orange: '#f59e0b',
          green: '#16a34a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        layout: '1400px',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Update globals.css**

`app/globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-bmw-gray-bg text-bmw-dark font-sans text-sm;
  }
}
```

- [ ] **Step 3: Update root layout**

`app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BMW Gebrauchtwagensuche',
  description: 'Transparente Gebrauchtwagenanalyse mit KI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.ts app/globals.css app/layout.tsx
git commit -m "Configure Tailwind with BMW design tokens"
```

---

### Task 25: Global error boundary

**Files:**
- Create: `app/error.tsx`

- [ ] **Step 1: Create error.tsx**

`app/error.tsx`:
```typescript
'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-bold text-bmw-dark">Etwas ist schiefgelaufen</h2>
        <p className="text-bmw-gray-text">Bitte versuchen Sie es erneut.</p>
        <button
          onClick={reset}
          className="px-5 py-2 bg-bmw-blue text-white rounded-sm hover:bg-blue-700"
        >
          Neu versuchen
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/error.tsx
git commit -m "Add global error boundary"
```

---

## Phase 7 — UI components

For each UI task: open `git show master:public/index.html | sed -n 'START,ENDp'` for the source HTML/JSX/CSS reference, then rewrite as a TSX component with Tailwind classes. Visual parity is the goal — match layout, colors, spacing, typography. Use `tailwind.config.ts` design tokens (`bmw-blue`, `bmw-dark`, etc.) instead of arbitrary values.

### Task 26: Header and Breadcrumb components

**Files:**
- Create: `components/Header.tsx`, `components/Breadcrumb.tsx`
- Source: master `public/index.html:17-43` (CSS) and the React JSX rendering header (search index.html for `top-bar`, `main-header`, `breadcrumb`)

- [ ] **Step 1: Create Header**

`components/Header.tsx`:
```typescript
export function Header() {
  return (
    <>
      {/* Top bar: dark, right-aligned links */}
      <div className="bg-bmw-dark h-9 flex items-center justify-end px-6 gap-5">
        <a href="#" className="text-xs text-gray-400 hover:text-white">Verkäufer-Login</a>
      </div>
      {/* Main header: BMW logo + nav */}
      <header className="bg-white border-b border-bmw-gray-border">
        <div className="max-w-layout mx-auto px-6 h-16 flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full border-2 border-bmw-dark flex items-center justify-center text-[9px] font-black"
              style={{
                background:
                  'conic-gradient(#1c69d4 0deg 90deg, #fff 90deg 180deg, #1c69d4 180deg 270deg, #fff 270deg 360deg)',
              }}
            >
              BMW
            </div>
            <h1 className="text-xl font-light tracking-tight">
              BMW <span className="font-bold">Gebrauchtwagen</span>
            </h1>
          </div>
          <nav className="ml-auto flex gap-6">
            <a href="#" className="text-[13px] text-bmw-gray-text font-medium hover:text-bmw-blue">Modelle</a>
            <a href="#" className="text-[13px] text-bmw-gray-text font-medium hover:text-bmw-blue">Service</a>
          </nav>
        </div>
      </header>
    </>
  );
}
```

- [ ] **Step 2: Create Breadcrumb**

`components/Breadcrumb.tsx`:
```typescript
interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="bg-white border-b border-gray-200 py-3 px-6">
      <div className="max-w-layout mx-auto flex items-center gap-2 text-xs text-bmw-gray-muted">
        {items.map((it, i) => (
          <span key={i}>
            {it.href ? (
              <a href={it.href} className="text-bmw-blue hover:underline">{it.label}</a>
            ) : (
              <span>{it.label}</span>
            )}
            {i < items.length - 1 && <span className="mx-1">›</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Header.tsx components/Breadcrumb.tsx
git commit -m "Add Header and Breadcrumb components"
```

---

### Task 27: FilterSidebar component

**Files:**
- Create: `components/FilterSidebar.tsx`
- Source: master `public/index.html:51-72` (CSS) + the JSX rendering filter sections (search for `filter-section`, `filter-checkbox`, `f-chip`, `range-input`)

- [ ] **Step 1: Read filter section structure from source**

```bash
git show master:public/index.html | grep -n "filter-section\|sidebar-title" | head -20
```

- [ ] **Step 2: Create FilterSidebar**

`components/FilterSidebar.tsx`:
```typescript
'use client';

import { useState } from 'react';

export interface FilterState {
  priceMin?: number;
  priceMax?: number;
  kmMax?: number;
  yearMin?: number;
  fuel?: string[];
  transmission?: string[];
}

interface FilterSidebarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}

export function FilterSidebar({ value, onChange, onReset }: FilterSidebarProps) {
  // Structure (one collapsible section per filter group):
  // - Preis (range inputs: min, max)
  // - Kilometerstand (range: max)
  // - Baujahr (range: min)
  // - Kraftstoff (checkbox chips: Benzin, Diesel, Elektro, Hybrid)
  // - Getriebe (checkbox chips: Schaltgetriebe, Automatik)
  // - Reset button at bottom
  //
  // Each section: collapsible header (chevron rotates 180deg when open),
  // body with padding and top border.
  //
  // Port the visual structure from master public/index.html, using:
  //   .filter-section → border border-bmw-gray-border bg-white mb-0.5
  //   .filter-section-header → px-4 py-3.5 flex justify-between cursor-pointer font-semibold
  //   .filter-checkbox → flex items-center gap-2.5 py-1.5 text-[13px]
  //   .f-chip → px-3 py-1 border rounded-full text-xs cursor-pointer
  //   .f-chip.on → bg-bmw-blue text-white border-bmw-blue
  //   .range-input → flex-1 px-2.5 py-2 border rounded-sm text-xs bg-gray-50
  return (
    <aside className="space-y-0.5">
      <div className="text-[11px] font-bold text-bmw-gray-muted tracking-widest uppercase mb-3">
        Filter
      </div>
      {/* Filter sections here — see structure comment above */}
      <div className="mt-3">
        <button
          onClick={onReset}
          className="w-full py-2.5 bg-gray-100 border border-bmw-gray-border rounded-sm text-xs text-bmw-gray-text font-medium hover:bg-gray-200"
        >
          Filter zurücksetzen
        </button>
      </div>
    </aside>
  );
}
```

Implementation requirement: build out the full set of collapsible sections matching the source layout in `public/index.html`. Each section toggles open/closed via local state. The `value`/`onChange` interface lets the parent control filter state.

- [ ] **Step 3: Commit**

```bash
git add components/FilterSidebar.tsx
git commit -m "Add FilterSidebar component"
```

---

### Task 28: CarCard and CarGrid components

**Files:**
- Create: `components/CarCard.tsx`, `components/CarGrid.tsx`
- Source: master `public/index.html:74-100` (CSS) + JSX rendering cards (search for `car-card`, `card-img`, `card-body`)

- [ ] **Step 1: Create CarCard**

`components/CarCard.tsx`:
```typescript
import Link from 'next/link';
import type { Car } from '@/lib/cars/types';

interface CarCardProps {
  car: Car;
}

export function CarCard({ car }: CarCardProps) {
  const hasAccidents = (car.accidents?.length ?? 0) > 0;
  const dealerLabel = 'BMW Niederlassung';

  return (
    <Link
      href={`/cars/${car.id}`}
      className="bg-white border border-bmw-gray-border block hover:shadow-lg transition-shadow"
    >
      <div className="relative h-[190px] overflow-hidden bg-gray-100 flex items-center justify-center">
        {/* Car image placeholder (the original uses SVG illustrations) */}
        <span className="text-gray-400 text-xs">{car.name}</span>
        <span className="absolute top-2.5 left-2.5 bg-bmw-blue text-white text-[10px] font-bold px-2 py-0.5 tracking-wide">
          GEBRAUCHTWAGEN
        </span>
        {/* Risk dots overlay (top-right) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1">
          {hasAccidents && <span className="w-2.5 h-2.5 rounded-full bg-flag-red border border-white/60" />}
        </div>
      </div>
      <div className="px-3.5 pt-3.5">
        <div className="text-[10px] text-bmw-gray-muted uppercase tracking-wider mb-1">{dealerLabel}</div>
        <div className="text-sm font-bold text-bmw-dark leading-tight">{car.name}</div>
        {car.subtitle && <div className="text-xs text-bmw-gray-text mt-0.5">{car.subtitle}</div>}
        <div className="text-xl font-bold text-bmw-dark mt-2.5">
          {car.price.toLocaleString('de-DE')} <span className="text-xs font-normal text-bmw-gray-muted">€</span>
        </div>
      </div>
      <div className="px-3.5 py-3 text-xs text-bmw-gray-text border-t border-gray-100 mt-3 flex justify-between">
        <span>{car.km.toLocaleString('de-DE')} km</span>
        <span>EZ {car.yearBuilt}</span>
        <span>{car.enginePower ?? ''}</span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create CarGrid**

`components/CarGrid.tsx`:
```typescript
import type { Car } from '@/lib/cars/types';
import { CarCard } from './CarCard';

interface CarGridProps {
  cars: Car[];
}

export function CarGrid({ cars }: CarGridProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px] text-bmw-gray-text">
          <strong className="text-bmw-dark font-semibold">{cars.length}</strong> Fahrzeuge gefunden
        </div>
        <select className="px-3 py-2 border border-bmw-gray-border rounded-sm text-[13px] bg-white text-bmw-gray-text">
          <option>Sortierung: Preis aufsteigend</option>
          <option>Sortierung: Preis absteigend</option>
          <option>Sortierung: Kilometer aufsteigend</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cars.map(c => <CarCard key={c.id} car={c} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/CarCard.tsx components/CarGrid.tsx
git commit -m "Add CarCard and CarGrid components"
```

---

### Task 29: CarDetail component

**Files:**
- Create: `components/CarDetail.tsx`
- Source: master `public/index.html` — the car detail view (search for `car-detail`, `detail-spec`, `detail-feature`)

- [ ] **Step 1: Locate detail JSX in source**

```bash
git show master:public/index.html | grep -n "detail-\|gallery\|spec-row" | head -20
```

- [ ] **Step 2: Create CarDetail**

`components/CarDetail.tsx`:
```typescript
import type { Car } from '@/lib/cars/types';

interface CarDetailProps {
  car: Car;
}

export function CarDetail({ car }: CarDetailProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* LEFT: gallery placeholder + specs + features */}
      <div className="space-y-6">
        <div className="bg-white border border-bmw-gray-border aspect-[16/10] flex items-center justify-center text-bmw-gray-muted">
          {car.name}
        </div>

        <section className="bg-white border border-bmw-gray-border p-6">
          <h2 className="text-lg font-bold mb-4">Technische Daten</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-bmw-gray-muted">Kilometerstand</dt>
            <dd>{car.km.toLocaleString('de-DE')} km</dd>
            <dt className="text-bmw-gray-muted">Baujahr</dt>
            <dd>{car.yearBuilt}</dd>
            <dt className="text-bmw-gray-muted">Vorbesitzer</dt>
            <dd>{car.owners}</dd>
            <dt className="text-bmw-gray-muted">Service-Einträge</dt>
            <dd>{car.maintenanceRecords}</dd>
            {car.fuel && (<><dt className="text-bmw-gray-muted">Kraftstoff</dt><dd>{car.fuel}</dd></>)}
            {car.transmission && (<><dt className="text-bmw-gray-muted">Getriebe</dt><dd>{car.transmission}</dd></>)}
            {car.enginePower && (<><dt className="text-bmw-gray-muted">Leistung</dt><dd>{car.enginePower}</dd></>)}
            {car.consumption && (<><dt className="text-bmw-gray-muted">Verbrauch</dt><dd>{car.consumption} l/100km</dd></>)}
            {car.emission && (<><dt className="text-bmw-gray-muted">Abgasnorm</dt><dd>{car.emission}</dd></>)}
            {car.color && (<><dt className="text-bmw-gray-muted">Farbe</dt><dd>{car.color}</dd></>)}
          </dl>
        </section>

        {car.features.length > 0 && (
          <section className="bg-white border border-bmw-gray-border p-6">
            <h2 className="text-lg font-bold mb-4">Ausstattung</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm">
              {car.features.map(f => <li key={f}>· {f}</li>)}
            </ul>
          </section>
        )}

        {car.accidents.length > 0 && (
          <section className="bg-white border border-bmw-gray-border p-6">
            <h2 className="text-lg font-bold mb-4">Schadenshistorie</h2>
            <ul className="space-y-3 text-sm">
              {car.accidents.map((a, i) => (
                <li key={i} className="border-l-4 border-flag-orange pl-3">
                  <div className="font-semibold">{a.type} · {a.date}</div>
                  <div className="text-bmw-gray-text">{a.damage}</div>
                  {a.repairCost && (
                    <div className="text-xs text-bmw-gray-muted">
                      Reparaturkosten: {a.repairCost.toLocaleString('de-DE')} €
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* RIGHT: price + analyze panel slot */}
      <aside className="space-y-4">
        <div className="bg-white border border-bmw-gray-border p-6 sticky top-4">
          <div className="text-3xl font-bold text-bmw-dark">{car.price.toLocaleString('de-DE')} €</div>
          <div className="text-xs text-bmw-gray-muted mt-1">
            {car.km.toLocaleString('de-DE')} km · EZ {car.yearBuilt}
          </div>
        </div>
      </aside>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/CarDetail.tsx
git commit -m "Add CarDetail component"
```

---

### Task 30: AnalysisPanel component (calls /api/cars/analyze)

**Files:**
- Create: `components/AnalysisPanel.tsx`
- Source: master `public/index.html` — search for analysis rendering (red/orange/green flags, AI analysis pre-block)

- [ ] **Step 1: Create AnalysisPanel**

`components/AnalysisPanel.tsx`:
```typescript
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
    return <div className="bg-white border border-bmw-gray-border p-6 text-center text-bmw-gray-text">Analysiere…</div>;
  }
  if (state.kind === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        {state.message}
        <button onClick={runAnalysis} className="ml-3 underline">Erneut versuchen</button>
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
              <li key={i}><strong>{f.flag}:</strong> {f.message}<div className="text-xs text-bmw-gray-muted">{f.tip}</div></li>
            ))}
          </ul>
        </section>
      )}
      {findings.orange.length > 0 && (
        <section className="bg-white border-l-4 border-flag-orange p-4">
          <h3 className="font-bold mb-2">🟠 Hinweise</h3>
          <ul className="space-y-2 text-sm">
            {findings.orange.map((f, i) => (
              <li key={i}><strong>{f.flag}:</strong> {f.message}<div className="text-xs text-bmw-gray-muted">{f.tip}</div></li>
            ))}
          </ul>
        </section>
      )}
      {findings.green.length > 0 && (
        <section className="bg-white border-l-4 border-flag-green p-4">
          <h3 className="font-bold mb-2">🟢 Positiv</h3>
          <ul className="space-y-1 text-sm">{findings.green.map((f, i) => <li key={i}>{f.message}</li>)}</ul>
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
        <p className="text-sm">{preisAmpel.label} (Marktwert ca. {preisAmpel.expected.toLocaleString('de-DE')} €)</p>
      </section>
      <section className="bg-white border border-bmw-gray-border p-4">
        <h3 className="font-bold mb-2">🧠 KI-Analyse</h3>
        <pre className="whitespace-pre-wrap text-xs font-mono text-bmw-dark">{aiAnalysis.analysis}</pre>
        <p className="text-[10px] text-bmw-gray-muted mt-2">Model: {aiAnalysis.model}</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AnalysisPanel.tsx
git commit -m "Add AnalysisPanel client component"
```

---

### Task 31: ChatWidget component

**Files:**
- Create: `components/ChatWidget.tsx`
- Source: master `public/index.html` — search for chat input + message list

- [ ] **Step 1: Create ChatWidget**

`components/ChatWidget.tsx`:
```typescript
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
          <div
            key={i}
            className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}
          >
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
        {loading && <div className="text-xs text-bmw-gray-muted">Antwort wird geschrieben…</div>}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/ChatWidget.tsx
git commit -m "Add ChatWidget client component"
```

---

### Task 32: SellerLogin and SellerDashboard components

**Files:**
- Create: `components/SellerLogin.tsx`, `components/SellerDashboard.tsx`
- Source: master `public/index.html` — search for `seller-login`, `seller-dashboard`

- [ ] **Step 1: Create SellerLogin**

`components/SellerLogin.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SellerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@carcheck.de');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sellers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login fehlgeschlagen');
      }
      router.push('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md mx-auto bg-white border border-bmw-gray-border p-8 space-y-4 mt-12">
      <h1 className="text-2xl font-bold">Verkäufer-Login</h1>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</div>}
      <div>
        <label className="block text-xs uppercase tracking-wide text-bmw-gray-muted mb-1">Email</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full px-3 py-2 border border-bmw-gray-border rounded-sm text-sm"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wide text-bmw-gray-muted mb-1">Passwort</label>
        <input
          type="password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full px-3 py-2 border border-bmw-gray-border rounded-sm text-sm"
        />
      </div>
      <button
        type="submit" disabled={loading}
        className="w-full py-3 bg-bmw-blue text-white font-semibold rounded-sm disabled:opacity-50"
      >
        {loading ? 'Anmelden…' : 'Anmelden'}
      </button>
      <p className="text-xs text-bmw-gray-muted text-center">
        Demo: demo@carcheck.de / demo123
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Create SellerDashboard**

`components/SellerDashboard.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardData {
  sellerInfo: { email: string; name: string };
  statistics: { carsAnalyzed: number; commonAnomalies: { type: string; count: number }[] };
  trainingData: Record<string, { title: string; questions: string[]; answers?: Record<string, string> }>;
  faqPack: { downloadUrl: string; format: string };
}

export function SellerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/sellers/dashboard')
      .then(r => { if (r.status === 401) { router.push('/login'); return null; } return r.json(); })
      .then(setData);
  }, [router]);

  async function logout() {
    await fetch('/api/sellers/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!data) return <div className="p-8 text-bmw-gray-muted">Lade…</div>;

  return (
    <div className="max-w-layout mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Verkäufer-Dashboard</h1>
        <button onClick={logout} className="text-sm text-bmw-blue hover:underline">Abmelden</button>
      </div>

      <section className="bg-white border border-bmw-gray-border p-6">
        <h2 className="font-bold mb-3">Statistik</h2>
        <p className="text-sm">Autos analysiert: <strong>{data.statistics.carsAnalyzed}</strong></p>
        <ul className="mt-3 space-y-1 text-sm">
          {data.statistics.commonAnomalies.map(a => (
            <li key={a.type}>· {a.type}: {a.count}</li>
          ))}
        </ul>
      </section>

      <section className="bg-white border border-bmw-gray-border p-6">
        <h2 className="font-bold mb-3">Schulung</h2>
        {Object.entries(data.trainingData).map(([key, td]) => (
          <div key={key} className="mb-4">
            <h3 className="text-sm font-semibold">{td.title}</h3>
            <ul className="text-xs text-bmw-gray-text mt-1 space-y-1">
              {td.questions.map((q, i) => <li key={i}>· {q}</li>)}
            </ul>
          </div>
        ))}
      </section>

      <section className="bg-white border border-bmw-gray-border p-6">
        <h2 className="font-bold mb-3">FAQ-Pack</h2>
        <a
          href={data.faqPack.downloadUrl}
          className="inline-block px-4 py-2 bg-bmw-blue text-white text-sm rounded-sm"
          download
        >
          FAQ-Pack herunterladen
        </a>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/SellerLogin.tsx components/SellerDashboard.tsx
git commit -m "Add SellerLogin and SellerDashboard components"
```

---

## Phase 8 — Pages

### Task 33: Buyer landing page (car grid)

**Files:**
- Create: `app/page.tsx`
- Modify: `app/page.tsx` (Next.js default replaced)

- [ ] **Step 1: Create a client wrapper that owns filter state**

Filtering is interactive, so the grid + sidebar live together in a client component. Create `components/CarBrowser.tsx`:

```typescript
'use client';

import { useMemo, useState } from 'react';
import type { Car } from '@/lib/cars/types';
import { FilterSidebar, type FilterState } from './FilterSidebar';
import { CarGrid } from './CarGrid';

interface CarBrowserProps {
  cars: Car[];
}

const EMPTY: FilterState = {};

export function CarBrowser({ cars }: CarBrowserProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY);

  const filtered = useMemo(() => cars.filter(c => {
    if (filters.priceMin !== undefined && c.price < filters.priceMin) return false;
    if (filters.priceMax !== undefined && c.price > filters.priceMax) return false;
    if (filters.kmMax !== undefined && c.km > filters.kmMax) return false;
    if (filters.yearMin !== undefined && c.yearBuilt < filters.yearMin) return false;
    if (filters.fuel?.length && !filters.fuel.includes(c.fuel ?? '')) return false;
    if (filters.transmission?.length && !filters.transmission.includes(c.transmission ?? '')) return false;
    return true;
  }), [cars, filters]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[264px_1fr] gap-6">
      <FilterSidebar value={filters} onChange={setFilters} onReset={() => setFilters(EMPTY)} />
      <CarGrid cars={filtered} />
    </div>
  );
}
```

- [ ] **Step 2: Implement the landing page**

`app/page.tsx`:
```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Car } from '@/lib/cars/types';
import { Header } from '@/components/Header';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CarBrowser } from '@/components/CarBrowser';

export default function HomePage() {
  const cars: Car[] = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
  );

  return (
    <>
      <Header />
      <Breadcrumb items={[
        { label: 'Startseite', href: '/' },
        { label: 'Gebrauchtwagen' },
      ]} />
      <main className="max-w-layout mx-auto px-6 py-6">
        <CarBrowser cars={cars} />
      </main>
    </>
  );
}
```

- [ ] **Step 3: Smoke-test**

```bash
npm run dev
```

Open http://localhost:3000 in a browser. Expected: BMW header, breadcrumb, FilterSidebar on left, 10 car cards on right. Adjusting a filter (e.g., price max) should narrow the list.

Stop server.

- [ ] **Step 4: Commit**

```bash
git add components/CarBrowser.tsx app/page.tsx
git commit -m "Add buyer landing page with car grid and filters"
```

---

### Task 34: Buyer detail page

**Files:**
- Create: `app/cars/[id]/page.tsx`

- [ ] **Step 1: Implement detail page**

`app/cars/[id]/page.tsx`:
```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import type { Car } from '@/lib/cars/types';
import { Header } from '@/components/Header';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CarDetail } from '@/components/CarDetail';
import { AnalysisPanel } from '@/components/AnalysisPanel';
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
      <main className="max-w-layout mx-auto px-6 py-6 space-y-6">
        <CarDetail car={car} />
        <AnalysisPanel car={car} />
        <ChatWidget car={car} />
      </main>
    </>
  );
}
```

- [ ] **Step 2: Smoke-test**

Start dev, click a car on the landing page. Expected: detail view shows specs, accidents (if any), "KI-Analyse starten" button, chat widget. Click "KI-Analyse" — analysis appears.

- [ ] **Step 3: Commit**

```bash
git add app/cars/
git commit -m "Add buyer car detail page"
```

---

### Task 35: Seller login page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Implement login page**

`app/login/page.tsx`:
```typescript
import { Header } from '@/components/Header';
import { SellerLogin } from '@/components/SellerLogin';

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="max-w-layout mx-auto px-6">
        <SellerLogin />
      </main>
    </>
  );
}
```

- [ ] **Step 2: Smoke-test**

Open http://localhost:3000/login. Login with demo credentials → should redirect to /dashboard.

- [ ] **Step 3: Commit**

```bash
git add app/login/
git commit -m "Add seller login page"
```

---

### Task 36: Seller dashboard page

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Implement dashboard page**

`app/dashboard/page.tsx`:
```typescript
import { redirect } from 'next/navigation';
import { getSellerFromCookies } from '@/lib/auth/require-seller';
import { Header } from '@/components/Header';
import { SellerDashboard } from '@/components/SellerDashboard';

export default async function DashboardPage() {
  const seller = await getSellerFromCookies();
  if (!seller) redirect('/login');

  return (
    <>
      <Header />
      <SellerDashboard />
    </>
  );
}
```

- [ ] **Step 2: Smoke-test**

- Without cookie: GET /dashboard → redirects to /login
- After login: shows dashboard with statistics, training data, FAQ-Pack download button
- Click "FAQ-Pack herunterladen" → downloads FAQ-Pack.txt

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/
git commit -m "Add seller dashboard page with auth guard"
```

---

## Phase 9 — Cleanup

### Task 37: Update Dockerfile for Next.js

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Rewrite Dockerfile**

`Dockerfile`:
```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/data ./data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/cars', (r) => { if (r.statusCode !== 200) process.exit(1) })"
CMD ["npm", "start"]
```

Note: port changed from 5000 to 3000 (Next.js default).

- [ ] **Step 2: Build and run image locally**

```bash
docker build -t car-ai-next .
docker run --rm -d --name car-ai-test -p 3000:3000 car-ai-next
sleep 8
curl -s http://localhost:3000/api/cars | head -c 100
docker stop car-ai-test
```

Expected: JSON cars array.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "Update Dockerfile for Next.js (multi-stage, port 3000)"
```

---

### Task 38: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rewrite CLAUDE.md**

Replace contents with:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                 # install deps
npm run dev                 # start dev server on http://localhost:3000
npm run build               # production build
npm start                   # serve production build
npm test                    # vitest watch mode
npm run test:run            # vitest one-shot
npm run lint                # next lint
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:
- `ANTHROPIC_API_KEY` — required for live Claude analysis (without it, the app runs in demo mode)
- `JWT_SECRET` — used for seller authentication cookies
- `PORT` — defaults to 3000

Next.js loads `.env.local` automatically (no `dotenv` needed).

Seller demo account: `demo@carcheck.de` / `demo123`

## Architecture

Next.js App Router app with TypeScript and Tailwind. Server and client live in one repo.

**Directory layout:**
- `app/` — routes (App Router). `app/api/*/route.ts` are HTTP handlers, `app/*/page.tsx` are pages.
- `components/` — reusable React components (mix of server and `"use client"`).
- `lib/cars/` — domain logic: types, rules engine, damage DB, anomaly detection, price calculator.
- `lib/ai/` — Claude client + demo fallbacks for analysis and chat.
- `lib/auth/` — JWT helpers, seller store, `require-seller` middleware.
- `lib/questions/` — in-memory question log.
- `data/cars.json` — static car dataset (10 cars).

**Data flow:**
- Server components (e.g., `app/page.tsx`) read `data/cars.json` directly.
- Client components (`AnalysisPanel`, `ChatWidget`) POST to route handlers in `app/api/cars/*`.
- Route handlers are thin: parse → call `lib/*` → return JSON.
- Claude calls live in `lib/ai/*` and always fall back to deterministic demo functions if `ANTHROPIC_API_KEY` is missing or the call errors.

## Key Design Notes

- **Demo mode**: Fully functional without an API key. `lib/ai/claude-client.ts` exports `hasApiKey`; every Claude call checks it and falls back to `generateDemoAnalysis` / `generateDemoChatResponse`.
- **Auth**: JWT in an HTTP-only cookie `seller_token`. `lib/auth/require-seller.ts` provides `requireSellerFromRequest()` for route handlers and `getSellerFromCookies()` for server components.
- **Plain-text demo password**: `sellers.passwordHash` is misleadingly named — it's a placeholder. Login compares against the literal `'demo123'` in `lib/auth/sellers.ts`. Intentional for MVP demos.
- **In-memory state**: `questionLog` and seller data are lost on server restart. No database.
- **Article numbers**: `articleNr()` always generates `BMW-GW-XXX` regardless of brand.
- **Model**: `claude-sonnet-4-6` for both analysis and chat (`lib/ai/claude-client.ts`).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cars` | None | All 10 cars |
| POST | `/api/cars/analyze` | None | Full analysis (rules + anomalies + price + AI) |
| POST | `/api/cars/chat` | None | Multi-turn car Q&A |
| POST | `/api/cars/log-question` | None | Log a chat question |
| GET | `/api/cars/questions/[id]` | None | Question history + FAQ |
| POST | `/api/sellers/login` | None | Sets `seller_token` cookie |
| POST | `/api/sellers/logout` | None | Clears cookie |
| GET | `/api/sellers/dashboard` | Cookie | Seller stats + training material |
| GET | `/api/sellers/faq-pack` | Cookie | FAQ as `.txt` download |

## Testing

Vitest. Unit tests for `lib/cars/*` (rules engine, damage DB, anomaly detection, price calculator) and `lib/ai/*` (demo analysis, demo chat). Run with `npm test` or `npm run test:run`.

## Deployment

```bash
# Docker
docker build -t car-ai .
docker run -e ANTHROPIC_API_KEY="sk-ant-..." -p 3000:3000 car-ai

# Fly.io
fly launch
fly secrets set ANTHROPIC_API_KEY="sk-ant-..."
fly deploy
```

Health check: `GET /api/cars`.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Update CLAUDE.md for Next.js architecture"
```

---

### Task 39: Final smoke test and merge

**Files:**
- No file changes.

- [ ] **Step 1: Full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: builds without errors. Warnings about unused exports are OK; type errors are not.

- [ ] **Step 3: Manual browser walkthrough**

```bash
npm start &
sleep 3
```

Open http://localhost:3000 and click through:
- Landing page shows 10 cars
- Click car #1 (BMW 118i) → detail page → "KI-Analyse" → demo analysis renders
- Click car #7 (Audi A6 rosa Scheinwerfer) → analysis shows red "INDIVIDUALISIERUNG" flag
- Click car #10 (Porsche) → analysis shows red "ATTRAKTIVES ANGEBOT" flag
- Open chat on any car, ask "Wie ist der Motor?" → reply renders
- Navigate to /login, login with demo@carcheck.de / demo123 → redirected to /dashboard
- Click "FAQ-Pack herunterladen" → downloads FAQ-Pack.txt
- Logout → back to /login

Stop:
```bash
kill %1 2>/dev/null || true
```

- [ ] **Step 4: Verify Docker build still works**

```bash
docker build -t car-ai-next-final .
docker run --rm -d --name final-check -p 3001:3000 car-ai-next-final
sleep 8
curl -s http://localhost:3001/api/cars | head -c 100
docker stop final-check
```

- [ ] **Step 5: Merge to master**

```bash
git checkout master
git merge --no-ff nextjs-migration -m "Merge Next.js migration"
git branch -d nextjs-migration
```

- [ ] **Step 6: Verify post-merge**

```bash
npm ci
npm run test:run
npm run build
```

All green.

---

## Done

Migration complete. The app now runs on Next.js App Router with TypeScript, Tailwind, and a clean domain-grouped `lib/` structure. Demo mode, JWT auth, and all business logic are preserved bit-for-bit. The dev server runs on port 3000 (changed from 5000).
