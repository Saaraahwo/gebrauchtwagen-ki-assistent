# KI-Check Atypical Highlights + Seller Dashboard — Design

**Date:** 2026-05-29
**Status:** Draft — awaiting user review
**Branch:** nextjs-migration

## Goal

Two related improvements to the working Next.js BMW used-car app (demo-mode, rule-based):

1. **KI-Check popup** must surface what is *atypical* for a car — special color, emission-zone restrictions, non-standard headlight approval, notable age — inside the analysis modal. The data is already computed by `detectAuffaelligkeiten` but the modal rework dropped the section that renders it.
2. **Seller dashboard** is replaced with a real tool: aggregate charts across the inventory plus per-car sales intelligence (strengths, why buyers hesitate, customer questions, test-drive coaching).

All content is **rule-based / deterministic** (the app has no live API key). All charts are **hand-rolled** (Tailwind + inline SVG, no library). The dashboard stays behind seller login.

## Decisions (from brainstorming)

| Decision | Choice |
|----------|--------|
| Per-car content source | Rule-based, derived from car data + existing findings/anomalies |
| Charts | Hand-rolled CSS/SVG, no dependency |
| AI | Not used (demo mode); deterministic only |
| Auth | Dashboard remains behind `getSellerFromCookies` / `requireSellerFromRequest` |

---

## Part 1 — KI-Check atypical highlights

### 1.1 Bug fix: render anomalies in the modal

`components/AnalysisPanel.tsx` fetches `/api/cars/analyze`, which returns `analysis.auffaelligkeiten` (the `Anomaly[]` from `detectAuffaelligkeiten`). The modal currently renders the summary bar, `findings` ("Prüfpunkte"), and the AI prose — but **never renders `auffaelligkeiten`**. That is why the 116i's "Lipstick Rosa" Sonderfarbe is computed and discarded.

**Fix:** add a **"Besonderheiten & Atypisches"** section to the modal that renders `state.data.auffaelligkeiten`. Placement: directly under the summary bar, above "Prüfpunkte" (atypical traits are the headline the seller/buyer wants first).

Each anomaly renders: `title` (bold), `detail` (body), `tip` (muted, prefixed appropriately). Severity drives a small left-border accent only — neutral, not alarmist, matching the existing tone:
- `info` → blue left border (`border-bmw-blue`)
- `warning` → amber left border (`border-flag-orange`)
- `critical` → red left border (`border-flag-red`)

If `auffaelligkeiten.length === 0`, the section renders a single neutral line: "Keine Besonderheiten erkannt — ein unauffälliges, marktübliches Fahrzeug." (so the block is never empty/confusing).

### 1.2 Expand `detectAuffaelligkeiten`

Keep all 8 existing rules unchanged (LASER_SCHEINWERFER, FAHRVERBOT_RISIKO, SPORTLICHE NUTZUNGSHISTORIE, AUSTAUSCHMOTOR, QUALITÄTSINVESTITION, SERVICEHISTORIE ANFRAGEN, ERFAHRENES FAHRZEUG, SONDERFARBE). Add two:

**New rule A — `SCHEINWERFER_ZULASSUNG` (generalized light-approval note).**
Currently only `laser` triggers a note. Generalize to also flag Xenon/retrofit/non-standard headlights, framed as a German type-approval (StVZO/ECE) check. Trigger when `allFeatures` contains any of: `laser`, `xenon`, `nachrüst`, `tuning`-light terms, or a color/`individual` headlight term. To avoid duplicating the existing laser rule, **replace** the laser rule with this generalized one (same `flag` semantics, broader trigger, severity `info`):
- title: `'Scheinwerfer — Zulassung prüfen'`
- detail: notes that special/retrofit headlights (Laser, Xenon-Nachrüstung, getönte/farbige Scheinwerfer) must be entered in the Fahrzeugschein and are subject to stricter approval in AT/CH (ECE R149 for laser); standard LED/Halogen is unproblematic.
- tip: free workshop check that the lights are type-approved and entered in the papers.
- Only fires for non-standard lights — a car with plain "LED-Scheinwerfer" does **not** trigger it (LED is standard). Match terms: `laser`, `xenon`, `nachrüst`, `getönt`, `rosa`/`pink`/colored + `scheinwerfer`/`licht`.

**New rule B — `FAHRZEUGALTER` (age note as a Besonderheit).**
The rules engine already flags age > 12 as an orange finding, but the user wants age called out in the *atypical* block too. Add an anomaly when `age >= 10` (and not already covered by `ERFAHRENES FAHRZEUG`, i.e. skip if `age >= 12 && km > 250000`):
- severity `info`
- title: `'${age} Jahre — gereifte Technik'`
- detail: at this age, watch wear items (Gummis/Dichtungen, Elektronik, Rost an Schwellern); parts availability is good and maintenance is plannable.
- tip: short pre-purchase inspection recommended.

**Ordering** in the returned array: lights → emission → M-track → exchange-engine → repair-ratio → missing-service → experienced-vehicle → age → color. (Atypical/legal first, resale/cosmetic last.)

### 1.3 Files touched (Part 1)
- `lib/cars/anomaly-detection.ts` — generalize laser rule to `SCHEINWERFER_ZULASSUNG`, add `FAHRZEUGALTER` age rule. Preserve existing strings for the unchanged rules.
- `lib/cars/anomaly-detection.test.ts` — extend tests: 116i color fires, plain-LED car does NOT trigger the light rule, xenon/laser DOES, age rule fires at age ≥ 10, no double-fire with ERFAHRENES.
- `components/AnalysisPanel.tsx` — add the "Besonderheiten & Atypisches" section with severity styling + empty-state line.

---

## Part 2 — Seller Dashboard

### 2.1 New logic modules (source of truth, unit-tested)

**`lib/cars/inventory-stats.ts`** — aggregate analysis over `Car[]`:
```ts
export interface InventoryStats {
  total: number;
  avgPrice: number;
  avgKm: number;
  avgAge: number;
  priceBuckets: { label: string; count: number }[];   // <10k, 10–25k, 25–50k, >50k
  fuelMix: { label: string; count: number }[];
  emissionMix: { label: string; count: number }[];
  condition: { red: number; orange: number; green: number }; // worst finding per car
  topAnomalies: { flag: string; title: string; count: number }[]; // most common across inventory
}
export function computeInventoryStats(cars: Car[]): InventoryStats;
```
`condition` classifies each car by its worst rules-engine finding (any red → red; else any orange → orange; else green). `topAnomalies` counts `detectAuffaelligkeiten` flags across all cars, sorted desc.

**`lib/cars/sales-intelligence.ts`** — per-car seller intelligence:
```ts
export interface SalesIntelligence {
  strengths: string[];          // what's genuinely good
  concerns: string[];           // why buyers hesitate (with how to address)
  customerQuestions: string[];  // representative questions for this car
  testDrive: { headline: string; steps: string[] }; // tailored coaching
}
export function buildSalesIntelligence(car: Car): SalesIntelligence;
```

**Strengths** — derived from positives:
- owners ≤ 2 → "Wenige Vorbesitzer ({n}) — durchgehende Historie"
- maintenanceRecords ≥ expected*0.8 → "Vollständige Servicehistorie ({n} Einträge)"
- km below expected-for-age → "Unterdurchschnittliche Laufleistung"
- price position from `calcPreisAmpel` is `gut` → "Attraktiv unter Marktwert"
- strong features present (Navi, Leder, Head-Up, Panorama, Harman/Bang, LED) → name them as highlights
- high power (≥ 250 PS) → "Souveräne Motorisierung"
- no accidents → "Unfallfrei"

**Concerns ("Warum Käufer zögern")** — derived from the car's red/orange findings + warning/critical anomalies, each phrased as a concern + how the seller addresses it (one line). E.g. accidents → "Unfallhistorie — mit Reparaturdoku und optionalem Gutachten entkräften"; Euro 5 → "Umweltzonen-Sorge — grüne Plakette + Routen erklären"; high km → "Hohe Laufleistung — Scheckheft und Verschleißteil-Nachweise zeigen".

**customerQuestions** — representative questions assembled from the car's profile (accidents → "Wurde der Schaden fachgerecht repariert?"; high km → "Wie ist der Wartungszustand bei der Laufleistung?"; Sonderfarbe → "Wie wirkt sich die Sonderfarbe auf den Wiederverkauf aus?"; always-on basics → "Ist der Preis verhandelbar?", "Kann ich eine Probefahrt machen?"). **Plus** any real questions from the in-memory `questionLog` for this car id (via `getQuestionsForCar`), merged in front if present.

**testDrive** — tailored coaching, first matching profile wins for the headline, steps accumulate:
- Cabriolet (name/subtitle includes "Cabrio") → headline "Offenes Fahrerlebnis", steps: top down, scenic/Landstraße route, highlight wind deflector/comfort
- High power (≥ 300 PS or M-model) → headline "Performance zeigen", steps: Autobahnauffahrt, kontrollierte Beschleunigung 80→160, Bremsverhalten, Sound
- Family/space (Touring, X-models, ≥ 5 seats + Navi/entertainment) → headline "Familientauglichkeit", steps: Entertainment/Navi aktivieren, Kofferraum + Platzangebot zeigen, ruhige Stadt-/Schulweg-Route, Parkassistent demonstrieren
- Luxury/comfort (Leder, Head-Up, Ambiente, Komfortzugang) → headline "Komfort erleben", steps: ruhige Boulevard-Route, Sitzkomfort/HUD/Ambiente vorführen
- Efficient diesel (fuel Diesel, low consumption) → headline "Effizienz beweisen", steps: längere Überlandroute, Verbrauchsanzeige zeigen
- Fallback → headline "Solide Allround-Probefahrt", steps: Mischung Stadt + Landstraße, alle Assistenz/Komfortfunktionen testen

### 2.2 Dashboard rendering

**Data wiring:** `app/dashboard/page.tsx` (server component, already auth-gated) loads `data/cars.json`, calls `computeInventoryStats(cars)` and `cars.map(buildSalesIntelligence)`, and passes the result to a client `SellerDashboard` component for rendering + expand/collapse interaction. `/api/sellers/dashboard` is updated to return `{ sellerInfo, stats, cars: [{ car, intelligence }] }` using the same lib functions, so the endpoint stays consistent and testable (the page does not need to fetch it, but the route remains the tested contract).

**`components/charts/` (hand-rolled, no deps):**
- `StatCard.tsx` — big number + label
- `BarRow.tsx` — labeled horizontal bar (width = value/max %), used for price buckets, fuel/emission mix, top anomalies
- `ConditionBar.tsx` — single stacked red/orange/green bar for inventory condition

**`components/SellerDashboard.tsx` (client)** — layout:
1. Header: "Verkäufer-Dashboard", seller name, logout, FAQ-pack download (keep existing)
2. **Überblick**: 4 StatCards (Fahrzeuge, Ø Preis, Ø km, Ø Alter), then Preisverteilung (BarRows), Zustand (ConditionBar), Kraftstoff + Abgasnorm (BarRows), Häufigste Auffälligkeiten (BarRows)
3. **Fahrzeuge**: expandable list — each row shows name/price/condition dot; expanding reveals the four intelligence blocks (Stärken, Warum Käufer zögern, Kundenfragen, Probefahrt-Empfehlung)

### 2.3 Files touched (Part 2)
- Create `lib/cars/inventory-stats.ts` + `.test.ts`
- Create `lib/cars/sales-intelligence.ts` + `.test.ts`
- Create `components/charts/StatCard.tsx`, `BarRow.tsx`, `ConditionBar.tsx`
- Rewrite `components/SellerDashboard.tsx`
- Update `app/dashboard/page.tsx` (compute via lib, pass props)
- Update `app/api/sellers/dashboard/route.ts` (new shape) + its test

---

## Testing

- `anomaly-detection.test.ts`: 116i color fires; plain LED does not trigger light rule; xenon/laser does; age rule fires ≥10 and doesn't double with ERFAHRENES.
- `inventory-stats.test.ts`: bucket counts, averages, condition classification, top-anomaly counting on the real `data/cars.json` (12 cars).
- `sales-intelligence.test.ts`: M3 → performance test-drive headline + power strength; X5/Touring → family headline; 116i → Sonderfarbe concern + question; accident car → concern phrased with mitigation; questions include always-on basics.
- `app/api/sellers/dashboard/route.test.ts`: 401 without cookie; with cookie returns `stats` + `cars` arrays of expected length (12) and the seller name resolved from the store.

## Out of scope
- No charting library, no live AI, no persistence (question log stays in-memory).
- Buyer-facing pages unchanged except the AnalysisPanel modal.
- No changes to rules-engine, price-calculator, damage-db logic (only consumed).

## Open questions
None.
