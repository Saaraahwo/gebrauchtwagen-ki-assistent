# Technische Daten & Wissensdatenbank — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add BMW-style technical specs to all 12 cars, display them on the detail page, and pre-seed a per-car SQLite knowledge base so the chat answers spec questions directly without calling Claude.

**Architecture:** `CarSpecs` extends the `Car` type and is stored in `cars.json`. A new `lib/questions/knowledge.ts` module owns the `car_knowledge` SQLite table (separate from `questions`) and auto-seeds ~19 Q&A pairs per car at startup. The chat route checks this table first (keyword match) before falling through to Claude.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, sql.js (WASM SQLite — same as `lib/questions/log.ts`), Vitest

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `lib/cars/types.ts` | Add `CarSpecs` interface + `specs?` on `Car` |
| Modify | `data/cars.json` | Add `specs` object to all 12 cars |
| **Create** | `lib/questions/knowledge.ts` | `car_knowledge` table, auto-seed, `findKnowledgeAnswer` |
| **Create** | `lib/questions/knowledge.test.ts` | Tests for `findKnowledgeAnswer` |
| Modify | `lib/cars/anomaly-detection.ts` | Two new spec-triggered anomaly checks |
| Modify | `lib/cars/anomaly-detection.test.ts` | Tests for new checks |
| **Create** | `components/TechSpecs.tsx` | BMW-style spec panels (server component) |
| Modify | `app/cars/[id]/page.tsx` | Render `<TechSpecs>` below `<CarDetail>` |
| Modify | `app/api/cars/chat/route.ts` | Pre-check `findKnowledgeAnswer` before Claude |

---

## Task 1: Add `CarSpecs` type

**Files:**
- Modify: `lib/cars/types.ts`

- [ ] **Step 1: Add the interface and field**

Open `lib/cars/types.ts`. After the `Accident` interface and before the `Car` interface, insert:

```typescript
export interface CarSpecs {
  displacement: string;
  cylinders: number;
  powerKw: number;
  powerPs: number;
  torque: number;
  acceleration: number;
  topSpeed: number;
  consumptionCity: string;
  consumptionHighway: string;
  consumptionCombined: string;
  co2: number;
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  weight: number;
  payload: number;
  bootVolume: number;
  bootVolumeMax?: number;
  tankVolume: number;
  tireSize: string;
}
```

Then add `specs?: CarSpecs;` to the `Car` interface after the `description?` field.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/cars/types.ts
git commit -m "feat: add CarSpecs interface to Car type"
```

---

## Task 2: Add specs to `cars.json`

**Files:**
- Modify: `data/cars.json`

- [ ] **Step 1: Add `specs` to all 12 cars**

Add the `specs` key to each car object. Use the values below exactly.

**id 1 — BMW 118i (2019, 103 kW, Benzin, 8-Gang, Frontantrieb)**
```json
"specs": {
  "displacement": "1.499 ccm", "cylinders": 3,
  "powerKw": 103, "powerPs": 140, "torque": 220,
  "acceleration": 8.5, "topSpeed": 220,
  "consumptionCity": "7,4 l/100km", "consumptionHighway": "5,3 l/100km", "consumptionCombined": "6,2 l/100km",
  "co2": 141,
  "length": 4319, "width": 1799, "height": 1434, "wheelbase": 2670,
  "weight": 1365, "payload": 485, "bootVolume": 360, "tankVolume": 40, "tireSize": "225/40 R18"
}
```

**id 2 — BMW 320d (2017, 140 kW, Diesel, 8-Gang, Allrad)**
```json
"specs": {
  "displacement": "1.995 ccm", "cylinders": 4,
  "powerKw": 140, "powerPs": 190, "torque": 400,
  "acceleration": 7.1, "topSpeed": 235,
  "consumptionCity": "6,0 l/100km", "consumptionHighway": "4,4 l/100km", "consumptionCombined": "5,1 l/100km",
  "co2": 134,
  "length": 4633, "width": 1811, "height": 1429, "wheelbase": 2851,
  "weight": 1625, "payload": 545, "bootVolume": 480, "tankVolume": 59, "tireSize": "225/45 R17"
}
```

**id 3 — BMW 520d Touring (2018, 140 kW, Diesel, 8-Gang, Heckantrieb)**
```json
"specs": {
  "displacement": "1.995 ccm", "cylinders": 4,
  "powerKw": 140, "powerPs": 190, "torque": 400,
  "acceleration": 7.4, "topSpeed": 232,
  "consumptionCity": "6,2 l/100km", "consumptionHighway": "4,7 l/100km", "consumptionCombined": "5,3 l/100km",
  "co2": 139,
  "length": 4936, "width": 1868, "height": 1498, "wheelbase": 2975,
  "weight": 1720, "payload": 560, "bootVolume": 570, "bootVolumeMax": 1700, "tankVolume": 66, "tireSize": "225/55 R17"
}
```

**id 4 — BMW M3 Competition (2021, 375 kW, Benzin, 8-Gang M, Allrad)**
```json
"specs": {
  "displacement": "2.993 ccm", "cylinders": 6,
  "powerKw": 375, "powerPs": 510, "torque": 650,
  "acceleration": 3.5, "topSpeed": 290,
  "consumptionCity": "13,2 l/100km", "consumptionHighway": "7,9 l/100km", "consumptionCombined": "10,9 l/100km",
  "co2": 248,
  "length": 4794, "width": 1903, "height": 1433, "wheelbase": 2851,
  "weight": 1730, "payload": 470, "bootVolume": 480, "tankVolume": 59, "tireSize": "275/35 R19"
}
```

**id 5 — BMW X5 xDrive30d (2021, 210 kW, Diesel, 8-Gang, Allrad)**
```json
"specs": {
  "displacement": "2.993 ccm", "cylinders": 6,
  "powerKw": 210, "powerPs": 286, "torque": 650,
  "acceleration": 6.1, "topSpeed": 235,
  "consumptionCity": "8,4 l/100km", "consumptionHighway": "6,3 l/100km", "consumptionCombined": "7,2 l/100km",
  "co2": 190,
  "length": 4922, "width": 2004, "height": 1745, "wheelbase": 2975,
  "weight": 2100, "payload": 640, "bootVolume": 650, "bootVolumeMax": 1870, "tankVolume": 83, "tireSize": "255/50 R20"
}
```

**id 6 — BMW 118i Advantage (2018, 103 kW, Benzin, 6-Gang manuell, Heckantrieb)**
```json
"specs": {
  "displacement": "1.499 ccm", "cylinders": 3,
  "powerKw": 103, "powerPs": 140, "torque": 220,
  "acceleration": 8.7, "topSpeed": 218,
  "consumptionCity": "7,5 l/100km", "consumptionHighway": "5,5 l/100km", "consumptionCombined": "6,4 l/100km",
  "co2": 146,
  "length": 4319, "width": 1799, "height": 1434, "wheelbase": 2670,
  "weight": 1335, "payload": 465, "bootVolume": 360, "tankVolume": 40, "tireSize": "205/55 R16"
}
```

**id 7 — BMW 750i xDrive (2011, 300 kW, Benzin, 8-Gang, Allrad)**
```json
"specs": {
  "displacement": "4.395 ccm", "cylinders": 8,
  "powerKw": 300, "powerPs": 408, "torque": 600,
  "acceleration": 5.0, "topSpeed": 250,
  "consumptionCity": "15,4 l/100km", "consumptionHighway": "8,9 l/100km", "consumptionCombined": "11,8 l/100km",
  "co2": 275,
  "length": 5212, "width": 1902, "height": 1479, "wheelbase": 3070,
  "weight": 2095, "payload": 535, "bootVolume": 500, "tankVolume": 82, "tireSize": "245/45 R19"
}
```

**id 8 — BMW 430i Cabriolet (2022, 185 kW, Benzin, 8-Gang, Allrad)**
```json
"specs": {
  "displacement": "1.998 ccm", "cylinders": 4,
  "powerKw": 185, "powerPs": 252, "torque": 400,
  "acceleration": 5.8, "topSpeed": 250,
  "consumptionCity": "9,5 l/100km", "consumptionHighway": "6,5 l/100km", "consumptionCombined": "7,8 l/100km",
  "co2": 177,
  "length": 4775, "width": 1826, "height": 1399, "wheelbase": 2811,
  "weight": 1760, "payload": 390, "bootVolume": 300, "tankVolume": 59, "tireSize": "245/35 R19"
}
```

**id 9 — BMW X3 xDrive20i (2017, 135 kW, Benzin, 8-Gang, Allrad)**
```json
"specs": {
  "displacement": "1.998 ccm", "cylinders": 4,
  "powerKw": 135, "powerPs": 184, "torque": 290,
  "acceleration": 7.4, "topSpeed": 210,
  "consumptionCity": "8,8 l/100km", "consumptionHighway": "6,4 l/100km", "consumptionCombined": "7,4 l/100km",
  "co2": 168,
  "length": 4716, "width": 1891, "height": 1673, "wheelbase": 2864,
  "weight": 1740, "payload": 565, "bootVolume": 550, "bootVolumeMax": 1600, "tankVolume": 67, "tireSize": "245/45 R18"
}
```

**id 10 — BMW M5 Competition (2018, 460 kW, Benzin, 8-Gang M, Allrad)**
```json
"specs": {
  "displacement": "4.395 ccm", "cylinders": 8,
  "powerKw": 460, "powerPs": 625, "torque": 750,
  "acceleration": 3.3, "topSpeed": 305,
  "consumptionCity": "13,3 l/100km", "consumptionHighway": "7,7 l/100km", "consumptionCombined": "10,5 l/100km",
  "co2": 239,
  "length": 4962, "width": 1903, "height": 1459, "wheelbase": 2975,
  "weight": 1880, "payload": 490, "bootVolume": 530, "tankVolume": 68, "tireSize": "275/35 R20"
}
```

**id 11 — BMW 218i Active Tourer (2023, 100 kW, Benzin, Steptronic, Frontantrieb)**
```json
"specs": {
  "displacement": "1.499 ccm", "cylinders": 3,
  "powerKw": 100, "powerPs": 136, "torque": 230,
  "acceleration": 9.1, "topSpeed": 210,
  "consumptionCity": "7,6 l/100km", "consumptionHighway": "5,5 l/100km", "consumptionCombined": "6,4 l/100km",
  "co2": 146,
  "length": 4358, "width": 1845, "height": 1576, "wheelbase": 2670,
  "weight": 1480, "payload": 510, "bootVolume": 468, "bootVolumeMax": 1405, "tankVolume": 50, "tireSize": "225/45 R17"
}
```

**id 12 — BMW 116i Urban Line (2014, 100 kW, Benzin, 6-Gang manuell, Heckantrieb)**
```json
"specs": {
  "displacement": "1.598 ccm", "cylinders": 4,
  "powerKw": 100, "powerPs": 136, "torque": 220,
  "acceleration": 9.3, "topSpeed": 215,
  "consumptionCity": "7,6 l/100km", "consumptionHighway": "5,6 l/100km", "consumptionCombined": "6,5 l/100km",
  "co2": 149,
  "length": 4324, "width": 1765, "height": 1421, "wheelbase": 2690,
  "weight": 1290, "payload": 460, "bootVolume": 360, "tankVolume": 52, "tireSize": "205/55 R16"
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('data/cars.json','utf8')); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add data/cars.json
git commit -m "feat: add technical specs to all 12 cars"
```

---

## Task 3: Create `lib/questions/knowledge.ts`

**Files:**
- Create: `lib/questions/knowledge.ts`
- Create: `lib/questions/knowledge.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `lib/questions/knowledge.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { findKnowledgeAnswer, _resetKnowledge, _seedForTest } from './knowledge';

beforeEach(() => {
  _resetKnowledge();
});

describe('findKnowledgeAnswer', () => {
  it('returns null when no knowledge is seeded', () => {
    expect(findKnowledgeAnswer(99, 'Wie viel PS hat das Auto?')).toBeNull();
  });

  it('returns null when message matches no category', () => {
    _seedForTest(1, [
      { question: 'Wie viel PS?', answer: '140 PS', category: 'motor' },
    ]);
    expect(findKnowledgeAnswer(1, 'Was ist heute das Datum?')).toBeNull();
  });

  it('returns a motor answer when message contains "ps"', () => {
    _seedForTest(1, [
      { question: 'Wie viel PS hat das Auto?', answer: '140 PS (103 kW).', category: 'motor' },
    ]);
    const result = findKnowledgeAnswer(1, 'Wie viel PS hat der BMW?');
    expect(result).not.toBeNull();
    expect(result!.answer).toBe('140 PS (103 kW).');
    expect(result!.category).toBe('motor');
  });

  it('returns a consumption answer when message contains "verbrauch"', () => {
    _seedForTest(1, [
      { question: 'Wie viel verbraucht das Auto?', answer: 'Kombiniert 6,2 l/100km.', category: 'consumption' },
    ]);
    const result = findKnowledgeAnswer(1, 'Wie viel verbraucht der BMW 118i?');
    expect(result).not.toBeNull();
    expect(result!.category).toBe('consumption');
  });

  it('returns a dimensions answer when message contains "kofferraum"', () => {
    _seedForTest(1, [
      { question: 'Wie groß ist der Kofferraum?', answer: '360 Liter.', category: 'dimensions' },
    ]);
    const result = findKnowledgeAnswer(1, 'Wie groß ist der Kofferraum?');
    expect(result).not.toBeNull();
    expect(result!.category).toBe('dimensions');
  });

  it('returns null for a different car id even when knowledge exists for another', () => {
    _seedForTest(1, [
      { question: 'Wie viel PS?', answer: '140 PS', category: 'motor' },
    ]);
    expect(findKnowledgeAnswer(2, 'Wie viel PS hat das Auto?')).toBeNull();
  });

  it('motor category takes priority over general when both keywords present', () => {
    _seedForTest(1, [
      { question: 'Wie viel PS?', answer: '140 PS', category: 'motor' },
      { question: 'Wie alt?', answer: '2019', category: 'general' },
    ]);
    // "motor" keyword triggers motor category before general
    const result = findKnowledgeAnswer(1, 'Was ist die Motorleistung in PS?');
    expect(result!.category).toBe('motor');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- lib/questions/knowledge.test.ts
```

Expected: FAIL — `findKnowledgeAnswer` not found.

- [ ] **Step 3: Create `lib/questions/knowledge.ts`**

```typescript
import initSqlJs, { type Database } from 'sql.js';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Car } from '@/lib/cars/types';

const isTest = !!process.env.VITEST;
const DB_PATH = join(process.cwd(), 'data', 'knowledge.db');

const SQL = await initSqlJs({
  locateFile: (file: string) => join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
});

const db: Database = !isTest && existsSync(DB_PATH)
  ? new SQL.Database(readFileSync(DB_PATH))
  : new SQL.Database();

db.run(`CREATE TABLE IF NOT EXISTS car_knowledge (
  car_id   INTEGER NOT NULL,
  question TEXT    NOT NULL,
  answer   TEXT    NOT NULL,
  category TEXT    NOT NULL
)`);

function persist(): void {
  if (isTest) return;
  try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.tmp`;
    writeFileSync(tmp, Buffer.from(db.export()));
    renameSync(tmp, DB_PATH);
  } catch (err) {
    console.error('Failed to persist knowledge db:', err);
  }
}

function generateQA(car: Car): { question: string; answer: string; category: string }[] {
  const s = car.specs;
  if (!s) return [];
  const n = car.name;
  const qa: { question: string; answer: string; category: string }[] = [];

  // motor
  qa.push({ category: 'motor', question: `Wie viel PS hat der ${n}?`, answer: `Der ${n} hat ${s.powerPs} PS (${s.powerKw} kW) bei ${s.displacement} Hubraum und ${s.torque} Nm Drehmoment.` });
  qa.push({ category: 'motor', question: `Wie viele Zylinder hat der Motor?`, answer: `Der Motor des ${n} hat ${s.cylinders} Zylinder.` });
  qa.push({ category: 'motor', question: `Welches Getriebe hat der ${n}?`, answer: car.transmission ? `Der ${n} ist mit ${car.transmission} ausgestattet.` : 'Keine Getriebeangabe vorhanden.' });
  qa.push({ category: 'motor', question: `Welcher Antrieb ist verbaut?`, answer: car.drive ? `Der ${n} hat ${car.drive}.` : 'Keine Antriebsangabe vorhanden.' });

  // performance
  qa.push({ category: 'performance', question: `Wie schnell ist der ${n}?`, answer: `Der ${n} beschleunigt in ${s.acceleration} Sekunden von 0 auf 100 km/h und erreicht ${s.topSpeed} km/h Höchstgeschwindigkeit.` });
  qa.push({ category: 'performance', question: `Was ist die Höchstgeschwindigkeit?`, answer: `Die Höchstgeschwindigkeit des ${n} beträgt ${s.topSpeed} km/h.` });

  // consumption
  qa.push({ category: 'consumption', question: `Wie viel verbraucht der ${n}?`, answer: `Der ${n} verbraucht kombiniert ${s.consumptionCombined} (WLTP), innerorts ${s.consumptionCity} und außerorts ${s.consumptionHighway}.` });
  qa.push({ category: 'consumption', question: `Wie viel CO₂ stößt der ${n} aus?`, answer: `Der ${n} stößt ${s.co2} g/km CO₂ aus (kombiniert, WLTP).` });
  qa.push({ category: 'consumption', question: `Wie groß ist der Tank?`, answer: `Der Tank des ${n} fasst ${s.tankVolume} Liter.` });

  // dimensions
  qa.push({ category: 'dimensions', question: `Wie groß ist der Kofferraum des ${n}?`, answer: s.bootVolumeMax ? `Der Kofferraum fasst ${s.bootVolume} Liter, erweiterbar auf ${s.bootVolumeMax} Liter.` : `Der Kofferraum fasst ${s.bootVolume} Liter.` });
  qa.push({ category: 'dimensions', question: `Wie groß ist der ${n}?`, answer: `Der ${n} ist ${s.length} mm lang, ${s.width} mm breit und ${s.height} mm hoch. Radstand: ${s.wheelbase} mm.` });
  qa.push({ category: 'dimensions', question: `Wie schwer ist der ${n}?`, answer: `Leergewicht ${s.weight} kg, Zuladung ${s.payload} kg.` });
  qa.push({ category: 'dimensions', question: `Welche Reifengröße hat der ${n}?`, answer: `Der ${n} ist mit Reifen der Größe ${s.tireSize} ausgestattet.` });

  // general
  qa.push({ category: 'general', question: `Wie viele Sitze hat der ${n}?`, answer: `Der ${n} hat ${car.seats ?? 5} Sitze und ${car.doors ?? 4} Türen.` });
  qa.push({ category: 'general', question: `Welche Schadstoffklasse hat der ${n}?`, answer: car.emission ? `Der ${n} entspricht der Schadstoffklasse ${car.emission}.` : 'Keine Angabe.' });
  qa.push({ category: 'general', question: `Was kostet der ${n}?`, answer: `Der ${n} wird für ${car.price.toLocaleString('de-DE')} € angeboten.` });
  qa.push({ category: 'general', question: `Wie alt ist der ${n}?`, answer: `Erstzulassung ${car.erstzulassung ?? car.yearBuilt} (Baujahr ${car.yearBuilt}).` });
  qa.push({ category: 'general', question: `Wie viele Kilometer hat der ${n}?`, answer: `Der ${n} hat ${car.km.toLocaleString('de-DE')} km Laufleistung.` });
  if (car.hu) qa.push({ category: 'general', question: `Wann ist die nächste HU?`, answer: `Die Hauptuntersuchung (HU) ist gültig bis ${car.hu}.` });

  return qa;
}

function isSeeded(carId: number): boolean {
  const stmt = db.prepare('SELECT COUNT(*) AS n FROM car_knowledge WHERE car_id = ?');
  stmt.bind([carId]);
  stmt.step();
  const n = Number(stmt.getAsObject().n);
  stmt.free();
  return n > 0;
}

export function seedCarKnowledge(car: Car): void {
  if (!car.specs || isSeeded(car.id)) return;
  const qa = generateQA(car);
  for (const { question, answer, category } of qa) {
    db.run(
      'INSERT INTO car_knowledge (car_id, question, answer, category) VALUES (?, ?, ?, ?)',
      [car.id, question, answer, category],
    );
  }
  persist();
}

const CATEGORIES: { category: string; keywords: string[] }[] = [
  { category: 'motor',       keywords: ['ps', 'kw', 'motor', 'hubraum', 'leistung', 'zylinder', 'drehmoment', 'getriebe', 'antrieb'] },
  { category: 'performance', keywords: ['schnell', 'tempo', 'beschleunig', 'höchst', 'vmax', '0-100', 'sprint'] },
  { category: 'consumption', keywords: ['verbrauch', 'liter', 'sprit', 'kraftstoff', 'co2', 'co₂', 'tank', 'sparsam'] },
  { category: 'dimensions',  keywords: ['kofferraum', 'platz', 'groß', 'länge', 'breite', 'höhe', 'gewicht', 'maße', 'reifen', 'radstand', 'zuladung'] },
  { category: 'general',     keywords: ['sitze', 'türen', 'hu', 'hauptuntersuchung', 'kilometer', 'preis', 'alter', 'baujahr', 'schadstoff'] },
];

export function findKnowledgeAnswer(
  carId: number,
  message: string,
): { question: string; answer: string; category: string } | null {
  const m = message.toLowerCase();

  let matchedCategory: string | null = null;
  for (const { category, keywords } of CATEGORIES) {
    if (keywords.some(k => m.includes(k))) {
      matchedCategory = category;
      break;
    }
  }
  if (!matchedCategory) return null;

  const stmt = db.prepare(
    'SELECT question, answer, category FROM car_knowledge WHERE car_id = ? AND category = ? ORDER BY rowid ASC',
  );
  stmt.bind([carId, matchedCategory]);
  const rows: { question: string; answer: string; category: string }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({ question: String(row.question), answer: String(row.answer), category: String(row.category) });
  }
  stmt.free();

  if (rows.length === 0) return null;

  // Secondary match: prefer the row whose stored question shares a word with the user message
  const best =
    rows.find(r =>
      r.question
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
        .some(w => m.includes(w)),
    ) ?? rows[0];

  return best;
}

// Auto-seed all cars with specs at module load (skipped in test environment)
if (!isTest) {
  try {
    const carsRaw: Car[] = JSON.parse(
      readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
    );
    for (const car of carsRaw) {
      seedCarKnowledge(car);
    }
  } catch (err) {
    console.error('Failed to seed car knowledge:', err);
  }
}

// Test helpers — do not call from production code
export function _resetKnowledge(): void {
  db.run('DELETE FROM car_knowledge');
}

export function _seedForTest(
  carId: number,
  rows: { question: string; answer: string; category: string }[],
): void {
  for (const { question, answer, category } of rows) {
    db.run(
      'INSERT INTO car_knowledge (car_id, question, answer, category) VALUES (?, ?, ?, ?)',
      [carId, question, answer, category],
    );
  }
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm run test:run -- lib/questions/knowledge.test.ts
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/questions/knowledge.ts lib/questions/knowledge.test.ts
git commit -m "feat: add car_knowledge table with auto-seed and findKnowledgeAnswer"
```

---

## Task 4: Spec-triggered anomaly checks

**Files:**
- Modify: `lib/cars/anomaly-detection.ts`
- Modify: `lib/cars/anomaly-detection.test.ts`

- [ ] **Step 1: Write failing tests**

Open `lib/cars/anomaly-detection.test.ts` and add these test cases at the end of the existing `describe` block (adjust import if needed):

```typescript
describe('spec-triggered anomalies', () => {
  const baseCarWithSpecs = {
    id: 99, name: 'BMW Test', price: 20000, km: 50000, yearBuilt: 2020,
    owners: 1, maintenanceRecords: 5, features: [], accidents: [],
    transmission: '8-Gang', fuel: 'Benzin', emission: 'Euro 6d',
    consumption: '7,0 l/100km', drive: 'Heckantrieb',
  };

  it('flags HOHER_VERBRAUCH when consumptionCombined > 9.0', () => {
    const car = {
      ...baseCarWithSpecs,
      specs: {
        displacement: '4.4 ccm', cylinders: 8, powerKw: 300, powerPs: 408, torque: 600,
        acceleration: 5.0, topSpeed: 250,
        consumptionCity: '15,4 l/100km', consumptionHighway: '8,9 l/100km',
        consumptionCombined: '11,8 l/100km',
        co2: 170, length: 5000, width: 1900, height: 1500, wheelbase: 3000,
        weight: 2000, payload: 500, bootVolume: 500, tankVolume: 80, tireSize: '245/45 R19',
      },
    };
    const result = detectAuffaelligkeiten(car as any);
    expect(result.some(a => a.flag === 'HOHER_VERBRAUCH')).toBe(true);
  });

  it('does NOT flag HOHER_VERBRAUCH when consumptionCombined <= 9.0', () => {
    const car = {
      ...baseCarWithSpecs,
      specs: {
        displacement: '2.0 ccm', cylinders: 4, powerKw: 135, powerPs: 184, torque: 290,
        acceleration: 7.4, topSpeed: 210,
        consumptionCity: '8,8 l/100km', consumptionHighway: '6,4 l/100km',
        consumptionCombined: '7,4 l/100km',
        co2: 168, length: 4700, width: 1890, height: 1670, wheelbase: 2860,
        weight: 1740, payload: 560, bootVolume: 550, tankVolume: 67, tireSize: '245/45 R18',
      },
    };
    const result = detectAuffaelligkeiten(car as any);
    expect(result.some(a => a.flag === 'HOHER_VERBRAUCH')).toBe(false);
  });

  it('flags CO2_EMISSIONEN when co2 > 180', () => {
    const car = {
      ...baseCarWithSpecs,
      specs: {
        displacement: '4.4 ccm', cylinders: 8, powerKw: 300, powerPs: 408, torque: 600,
        acceleration: 5.0, topSpeed: 250,
        consumptionCity: '8,4 l/100km', consumptionHighway: '6,3 l/100km',
        consumptionCombined: '7,2 l/100km',
        co2: 190, length: 4900, width: 2000, height: 1740, wheelbase: 2970,
        weight: 2100, payload: 640, bootVolume: 650, tankVolume: 83, tireSize: '255/50 R20',
      },
    };
    const result = detectAuffaelligkeiten(car as any);
    expect(result.some(a => a.flag === 'CO2_EMISSIONEN')).toBe(true);
  });

  it('does NOT flag CO2_EMISSIONEN when co2 <= 180', () => {
    const car = {
      ...baseCarWithSpecs,
      specs: {
        displacement: '2.0 ccm', cylinders: 4, powerKw: 140, powerPs: 190, torque: 400,
        acceleration: 7.1, topSpeed: 235,
        consumptionCity: '6,0 l/100km', consumptionHighway: '4,4 l/100km',
        consumptionCombined: '5,1 l/100km',
        co2: 134, length: 4630, width: 1810, height: 1430, wheelbase: 2850,
        weight: 1620, payload: 545, bootVolume: 480, tankVolume: 59, tireSize: '225/45 R17',
      },
    };
    const result = detectAuffaelligkeiten(car as any);
    expect(result.some(a => a.flag === 'CO2_EMISSIONEN')).toBe(false);
  });

  it('does not crash when car has no specs', () => {
    const car = { ...baseCarWithSpecs };
    expect(() => detectAuffaelligkeiten(car as any)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- lib/cars/anomaly-detection.test.ts
```

Expected: the 5 new tests FAIL (flags not returned yet).

- [ ] **Step 3: Add the two checks to `lib/cars/anomaly-detection.ts`**

At the end of `detectAuffaelligkeiten`, before `return auff;`, add:

```typescript
  // Spec-triggered: high fuel consumption
  // consumptionCombined uses German locale ("6,2 l/100km") so replace comma before parsing
  if (car.specs && parseFloat(car.specs.consumptionCombined.replace(',', '.')) > 9.0) {
    auff.push({
      flag: 'HOHER_VERBRAUCH',
      title: `Hoher Kraftstoffverbrauch — ${car.specs.consumptionCombined} kombiniert`,
      detail: `Der kombinierte WLTP-Verbrauch von ${car.specs.consumptionCombined} liegt deutlich über dem Durchschnitt vergleichbarer Fahrzeuge. Kraftstoffkosten bei 15.000 km/Jahr und aktuellem Preis von ca. 1,80 €/l: rund ${Math.round(parseFloat(car.specs.consumptionCombined) * 15000 / 100 * 1.8).toLocaleString('de-DE')} € pro Jahr.`,
      tip: 'Fahrverhalten und regelmäßige Reifendruckkontrolle können den Verbrauch um bis zu 10 % reduzieren.',
      severity: 'info',
    });
  }

  // Spec-triggered: high CO₂
  if (car.specs && car.specs.co2 > 180) {
    auff.push({
      flag: 'CO2_EMISSIONEN',
      title: `CO₂-Emissionen ${car.specs.co2} g/km — über EU-Richtwert`,
      detail: `Mit ${car.specs.co2} g/km liegt dieses Fahrzeug über dem EU-Richtwert von 180 g/km. In manchen Kommunen können höhere Parkgebühren oder Umweltzonen-Regelungen gelten. Für Vielfahrer lohnt ein Vergleich mit verbrauchsärmeren Alternativen.`,
      tip: 'CO₂-abhängige Kfz-Steuer prüfen — bei hohen Emissionen kann die Jahressteuer deutlich steigen.',
      severity: 'info',
    });
  }
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
npm run test:run -- lib/cars/anomaly-detection.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cars/anomaly-detection.ts lib/cars/anomaly-detection.test.ts
git commit -m "feat: add spec-triggered anomaly checks for high consumption and CO2"
```

---

## Task 5: Create `TechSpecs` component

**Files:**
- Create: `components/TechSpecs.tsx`

- [ ] **Step 1: Create the component**

```typescript
import type { Car } from '@/lib/cars/types';

export function TechSpecs({ car }: { car: Car }) {
  if (!car.specs) return null;
  const s = car.specs;

  return (
    <section className="max-w-layout mx-auto px-6 py-8 border-t border-bmw-gray-border">
      <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest mb-5">
        Technische Daten
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SpecPanel title="Motor &amp; Antrieb">
          <SpecRow label="Motorart"       value={car.fuel ?? '—'} />
          <SpecRow label="Hubraum"        value={s.displacement} />
          <SpecRow label="Zylinder"       value={String(s.cylinders)} />
          <SpecRow label="Leistung"       value={`${s.powerPs} PS (${s.powerKw} kW)`} />
          <SpecRow label="Drehmoment"     value={`${s.torque} Nm`} />
          <SpecRow label="Getriebe"       value={car.transmission ?? '—'} />
          <SpecRow label="Antrieb"        value={car.drive ?? '—'} />
        </SpecPanel>

        <SpecPanel title="Fahrleistung">
          <SpecRow label="0–100 km/h"     value={`${s.acceleration} s`} />
          <SpecRow label="Höchstgeschw."  value={`${s.topSpeed} km/h`} />
        </SpecPanel>

        <SpecPanel title="Verbrauch &amp; Umwelt">
          <SpecRow label="Kombiniert"     value={s.consumptionCombined} />
          <SpecRow label="Innerorts"      value={s.consumptionCity} />
          <SpecRow label="Außerorts"      value={s.consumptionHighway} />
          <SpecRow label="CO₂ (komb.)"   value={`${s.co2} g/km`} />
          <SpecRow label="Schadstoffkl." value={car.emission ?? '—'} />
        </SpecPanel>

        <SpecPanel title="Maße &amp; Gewichte">
          <SpecRow label="Länge"          value={`${s.length.toLocaleString('de-DE')} mm`} />
          <SpecRow label="Breite"         value={`${s.width.toLocaleString('de-DE')} mm`} />
          <SpecRow label="Höhe"           value={`${s.height.toLocaleString('de-DE')} mm`} />
          <SpecRow label="Radstand"       value={`${s.wheelbase.toLocaleString('de-DE')} mm`} />
          <SpecRow label="Leergewicht"    value={`${s.weight.toLocaleString('de-DE')} kg`} />
          <SpecRow label="Zuladung"       value={`${s.payload} kg`} />
          <SpecRow
            label="Kofferraum"
            value={s.bootVolumeMax ? `${s.bootVolume}–${s.bootVolumeMax} l` : `${s.bootVolume} l`}
          />
          <SpecRow label="Tankinhalt"     value={`${s.tankVolume} l`} />
          <SpecRow label="Bereifung"      value={s.tireSize} />
          <SpecRow label="Türen / Sitze"  value={`${car.doors ?? '—'} / ${car.seats ?? '—'}`} />
        </SpecPanel>
      </div>
    </section>
  );
}

function SpecPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-bmw-gray-border">
      <div className="bg-bmw-gray-bg border-b border-bmw-gray-border px-4 py-2">
        <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest">
          {title}
        </div>
      </div>
      <table className="w-full text-xs">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-bmw-gray-border last:border-0">
      <td className="px-4 py-2 text-bmw-gray-muted w-36 align-top">{label}</td>
      <td className="px-4 py-2 font-medium text-bmw-dark">{value}</td>
    </tr>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/TechSpecs.tsx
git commit -m "feat: add TechSpecs component with BMW-style spec panels"
```

---

## Task 6: Render TechSpecs on the car detail page

**Files:**
- Modify: `app/cars/[id]/page.tsx`

- [ ] **Step 1: Add the import and render**

Open `app/cars/[id]/page.tsx`. Add the import:

```typescript
import { TechSpecs } from '@/components/TechSpecs';
```

Then in the return, add `<TechSpecs car={car} />` between `<CarDetail>` and `<Footer>`:

```tsx
return (
  <>
    <Header />
    <Breadcrumb
      items={[
        { label: 'Startseite', href: '/' },
        { label: 'Gebrauchtwagen', href: '/' },
        { label: car.name },
      ]}
    />
    <CarDetail car={car} />
    <TechSpecs car={car} />
    <Footer />
    <ChatWidget car={car} />
  </>
);
```

- [ ] **Step 2: Start the dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000/cars/1` in a browser. Below the main car detail content you should see a "Technische Daten" section with four panels: Motor & Antrieb, Fahrleistung, Verbrauch & Umwelt, Maße & Gewichte. All rows should be populated with the specs from Task 2.

- [ ] **Step 3: Commit**

```bash
git add app/cars/[id]/page.tsx
git commit -m "feat: render TechSpecs on car detail page"
```

---

## Task 7: Chat route pre-checks knowledge base

**Files:**
- Modify: `app/api/cars/chat/route.ts`

- [ ] **Step 1: Update the route**

Open `app/api/cars/chat/route.ts`. Add the import at the top:

```typescript
import { findKnowledgeAnswer } from '@/lib/questions/knowledge';
```

Then in the `POST` handler, add the knowledge pre-check before the `chatWithClaude` call. Replace:

```typescript
  const { reply, model, basis } = await chatWithClaude(carData, messages, message);
  if (carData.id) logQuestion(carData.id, carData.name, message, reply);
  return NextResponse.json({ reply, model, basis });
```

with:

```typescript
  // Check pre-seeded knowledge base first
  const knowledge = findKnowledgeAnswer(carData.id, message);
  if (knowledge) {
    if (carData.id) logQuestion(carData.id, carData.name, message, knowledge.answer);
    return NextResponse.json({ reply: knowledge.answer, basis: 'Technische Fahrzeugdaten', model: 'Wissensdatenbank' });
  }

  const { reply, model, basis } = await chatWithClaude(carData, messages, message);
  if (carData.id) logQuestion(carData.id, carData.name, message, reply);
  return NextResponse.json({ reply, model, basis });
```

- [ ] **Step 2: Test manually**

Ensure dev server is running (`npm run dev`). Open any car detail page, open the chat, and ask:

- `"Wie viel PS hat das Auto?"` → should answer immediately with the PS value, basis shows `"Technische Fahrzeugdaten · Quelle: Wissensdatenbank"`
- `"Wie viel verbraucht der X?"` → should return the consumption answer
- `"Ist der Preis verhandelbar?"` → should fall through to Claude (basis shows normal label)

- [ ] **Step 3: Run the full test suite**

```bash
npm run test:run
```

Expected: all existing tests still PASS, plus the new tests from Tasks 3 and 4.

- [ ] **Step 4: Commit**

```bash
git add app/api/cars/chat/route.ts
git commit -m "feat: chat route checks car knowledge base before calling Claude"
```

---

## Done

All 7 tasks complete. The feature delivers:
- Full BMW-style spec tables on every car detail page
- High consumption / CO₂ anomaly flags in the analysis popup for 4 cars (M3, M5, 750i, X5)
- ~19 Q&A pairs per car in `car_knowledge` SQLite table, seeded at startup
- Chat answers spec questions instantly from the knowledge base with basis label `"Technische Fahrzeugdaten"`
