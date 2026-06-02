# Technische Daten & Wissensdatenbank

**Date:** 2026-06-02
**Status:** Approved

## Goal

Add comprehensive BMW-style technical specs to each car and pre-populate a per-car knowledge base in SQLite so the chat can answer spec questions directly without calling Claude.

## Scope

- Extend `Car` type and `cars.json` with a `specs` object for all 10 cars
- New `TechSpecs` component on the car detail page (`/cars/[id]`)
- Two new spec-triggered anomaly flags in the analysis popup
- New `car_knowledge` SQLite table with ~20 pre-seeded Q&A pairs per car
- Chat route checks `car_knowledge` before falling through to Claude

Out of scope: realistic/accurate BMW specs (plausible placeholder values are fine), changes to the dashboard, changes to the `questions` table.

---

## Section 1 — Data Model

### `CarSpecs` interface (`lib/cars/types.ts`)

```ts
export interface CarSpecs {
  // Motor
  displacement: string;       // e.g. "1.998 ccm"
  cylinders: number;          // e.g. 4
  powerKw: number;            // e.g. 135
  powerPs: number;            // e.g. 184
  torque: number;             // Nm, e.g. 290

  // Performance
  acceleration: number;       // 0–100 km/h in seconds, e.g. 7.3
  topSpeed: number;           // km/h, e.g. 225

  // Consumption (WLTP)
  consumptionCity: string;    // e.g. "8.2 l/100km"
  consumptionHighway: string; // e.g. "5.8 l/100km"
  consumptionCombined: string;// e.g. "6.7 l/100km"
  co2: number;                // g/km, e.g. 152

  // Dimensions & weights
  length: number;             // mm, e.g. 4709
  width: number;              // mm, e.g. 1827
  height: number;             // mm, e.g. 1442
  wheelbase: number;          // mm, e.g. 2851
  weight: number;             // kg, e.g. 1545
  payload: number;            // kg, e.g. 550
  bootVolume: number;         // liters, e.g. 480
  bootVolumeMax?: number;     // liters with rear seats folded, e.g. 1600
  tankVolume: number;         // liters, e.g. 59
  tireSize: string;           // e.g. "225/45 R18"
}
```

`Car` gets an optional field: `specs?: CarSpecs`

Values are plausible but not required to be factory-accurate.

### `car_knowledge` table (`lib/questions/knowledge.ts`)

```sql
CREATE TABLE IF NOT EXISTS car_knowledge (
  car_id   INTEGER NOT NULL,
  question TEXT    NOT NULL,
  answer   TEXT    NOT NULL,
  category TEXT    NOT NULL
)
```

Categories: `motor` | `performance` | `consumption` | `dimensions` | `general`

### Auto-seeding

At module load, `knowledge.ts` iterates over all cars that have `specs`. For each car where `SELECT COUNT(*) FROM car_knowledge WHERE car_id = ?` returns 0, it inserts ~20 Q&A pairs generated from the spec values.

**Q&A pairs generated per car (~20 total):**

| Category | Example question | Example answer |
|---|---|---|
| motor | Wie viel PS hat der [name]? | Der [name] hat [ps] PS ([kw] kW) mit [displacement] Hubraum und [torque] Nm Drehmoment. |
| motor | Wie viele Zylinder hat der Motor? | Der Motor hat [cylinders] Zylinder. |
| motor | Welches Getriebe hat das Auto? | [transmission] |
| motor | Was für ein Antrieb ist verbaut? | [drive] |
| performance | Wie schnell ist der [name]? | Der [name] beschleunigt in [acceleration] Sekunden von 0 auf 100 km/h und erreicht [topSpeed] km/h Höchstgeschwindigkeit. |
| performance | Was ist die Höchstgeschwindigkeit? | [topSpeed] km/h |
| consumption | Wie viel verbraucht der [name]? | Kombiniert [combined] (WLTP), innerorts [city], außerorts [highway]. |
| consumption | Wie viel CO₂ stößt das Auto aus? | [co2] g/km (kombiniert, WLTP). |
| consumption | Wie groß ist der Tank? | Der Tank fasst [tankVolume] Liter. |
| dimensions | Wie groß ist der Kofferraum? | [bootVolume] Liter, erweiterbar auf [bootVolumeMax] Liter (wenn vorhanden). |
| dimensions | Wie lang ist das Auto? | [length] mm lang, [width] mm breit, [height] mm hoch. |
| dimensions | Wie schwer ist der [name]? | Leergewicht [weight] kg, Zuladung [payload] kg. |
| dimensions | Welche Reifengröße hat das Auto? | [tireSize] |
| dimensions | Wie lang ist der Radstand? | [wheelbase] mm |
| general | Wie viele Sitze hat das Auto? | [seats] Sitze auf [doors] Türen. |
| general | Welche Schadstoffklasse hat das Auto? | [emission] |
| general | Was kostet das Auto? | Der Listenpreis beträgt [price] €. |
| general | Wie alt ist das Auto? | Erstzulassung [erstzulassung], Baujahr [yearBuilt]. |
| general | Wie viele Kilometer hat das Auto? | [km] km Laufleistung. |
| general | Wann ist die nächste HU? | HU bis [hu] (falls vorhanden). |

---

## Section 2 — Frontend

### `TechSpecs` component (`components/TechSpecs.tsx`)

New client-side component rendered inside `<CarDetail>` below existing content. Only rendered when `car.specs` exists.

Layout: 2-column grid of spec panels, each panel has a heading and a definition table. Matches the professional BMW-style inline data presentation.

**Panels:**
1. Motor & Antrieb — motorart (derived from `fuel`), displacement, cylinders, powerKw/powerPs, torque, transmission, drive
2. Fahrleistung — acceleration (0–100), topSpeed
3. Verbrauch & Umwelt — consumptionCombined, consumptionCity, consumptionHighway, co2, emission
4. Maße & Gewichte — length, width, height, wheelbase, weight, payload, bootVolume (+bootVolumeMax), tankVolume, tireSize, doors, seats

### Analysis popup additions (`lib/cars/anomaly-detection.ts`)

Two new checks using `car.specs` (only run when specs are present):

- `parseFloat(consumptionCombined) > 9.0` → anomaly flag `HOHER_VERBRAUCH`, severity `info` (string parsed to float, e.g. `"9.4 l/100km"` → `9.4`)
- `co2 > 180 g/km` → anomaly flag `CO2_EMISSIONEN`, severity `info`

These slot into the existing `auffaelligkeiten` array — no UI changes needed.

---

## Section 3 — Chat Integration

### `findKnowledgeAnswer(carId, message)` (`lib/questions/knowledge.ts`)

Keyword-based lookup. Checks message (lowercased) against category keyword sets:

| Category | Keywords |
|---|---|
| motor | ps, kw, motor, hubraum, leistung, zylinder, drehmoment, getriebe, antrieb |
| performance | schnell, tempo, beschleunig, höchst, vmax, 0-100, sprint |
| consumption | verbrauch, liter, sprit, kraftstoff, co2, tank, sparsam |
| dimensions | kofferraum, platz, groß, länge, breite, höhe, gewicht, maße, reifen, radstand |
| general | sitze, türen, hu, hauptuntersuchung, baujahr, km, kilometer, preis, kosten |

Categories are checked in priority order: `motor` → `performance` → `consumption` → `dimensions` → `general`. First matching category wins. Returns all Q&A rows for that `(carId, category)`. If multiple rows match, returns the most relevant one (first by rowid). If no category matches, returns `null` and the chat falls through to Claude.

### Chat route change (`app/api/cars/chat/route.ts`)

```
const knowledge = findKnowledgeAnswer(carData.id, message); // synchronous
if (knowledge) {
  logQuestion(carData.id, carData.name, message, knowledge.answer);
  return { reply: knowledge.answer, basis: 'Technische Fahrzeugdaten', model: 'Wissensdatenbank' };
}
// else: existing Claude call unchanged
```

The `basis` field in the chat widget shows `"Technische Fahrzeugdaten"` for knowledge-sourced answers instead of the generic `basisForMessage()` label.

---

## Files Changed

| File | Change |
|---|---|
| `lib/cars/types.ts` | Add `CarSpecs` interface, add `specs?: CarSpecs` to `Car` |
| `data/cars.json` | Add `specs` object to all 10 cars |
| `lib/questions/knowledge.ts` | New file: `car_knowledge` table, seeding, `findKnowledgeAnswer` |
| `lib/cars/anomaly-detection.ts` | Two new spec-triggered anomaly checks |
| `components/TechSpecs.tsx` | New component: BMW-style spec panels |
| `components/CarDetail.tsx` | Import and render `<TechSpecs car={car} />` |
| `app/api/cars/chat/route.ts` | Pre-check `findKnowledgeAnswer` before Claude call |

No changes to: dashboard, `questions` table, `log.ts`, `AnalysisPanel.tsx` (anomalies flow in automatically).
