# Transparency Demo Improvements — Design

**Date:** 2026-05-31
**Status:** Draft — awaiting user review
**Branch:** nextjs-migration

## Goal

Make the existing BMW used-car platform a compelling **demo to pitch to BMW dealers**, with **transparency** as the single differentiator. The product must *demonstrate* transparency by showing facts plainly at a glance — never by claiming it. The pitch: *radical, at-a-glance transparency on every car builds buyer trust, and trust closes deals with less haggling and fewer returns.*

## Guiding decisions (from brainstorming)

| Decision | Choice |
|----------|--------|
| North star | Transparency, **demonstrated not proclaimed** — no "wir sind transparent" / no trust-badge labels. Show the facts. |
| Target | A killer **demo** on the existing 12-car dataset. No multi-dealer infra, no real inventory import, no accounts/billing. |
| AI | Deterministic/rule-based by default (consistent, no hallucination — itself a transparency asset). A live-Claude flip stays available via API key but is not the demo default. |
| Photos | Keep the current stock images but label them **"Symbolfoto"** (honest disclosure that they are representative). Real photos arrive with real dealer inventory. |
| Wording discipline | Plain facts only: "Heckschaden, fachgerecht repariert, 3.800 €", "HU abgelaufen", "Keine Servicehistorie hinterlegt". No self-praise, no "Risiko", no marketing labels. |

## Current-state transparency review (baseline)

Genuinely transparent already: detail page shows km, EZ, owners, service-entry count, HU date, emission, full specs, full feature list, description; underlying accident data is honest (damage description, repair cost, `repaired`).

Gaps this design fixes:
1. **Accident specifics hidden behind the AI popup** — the detail page only shows "1 Unfall repariert", not *what* was damaged or its severity.
2. **Stock photos presented as the car** — undermines a transparency product.
3. **Expired HU / missing service shown as raw values** — no "abgelaufen" / "keine Historie" context.
4. **No disclosure of gaps** (what isn't known).
5. **Price stands alone** — market context only inside the popup.

---

## Slice 1 — Inline disclosure on the detail page (the headline) + review fixes

### 1.1 "Zustand & Historie" panel (new, inline on the detail page)
A new section in `CarDetail`'s left column (between Title card and Tech specs) that surfaces the trust-critical facts **without opening the popup**:

- **Unfälle:** if `car.accidents.length === 0` → "Unfallfrei – keine Schäden dokumentiert". Otherwise list each accident plainly: `type` · `date` · `damage` · "fachgerecht repariert" (from `repaired`) · `repairCost` €. Surface "umlackiert" when the damage text contains it.
- **Servicehistorie:** derived status — `vollständig` (records ≥ ~0.8× expected for age), `teilweise`, or **`Keine Servicehistorie hinterlegt`** (records 0). Show the entry count.
- **HU:** computed against today via a new helper `huStatus(hu)` → `gültig bis MM.YYYY` / **`HU abgelaufen (MM.YYYY)`** / `HU bald fällig (MM.YYYY)` (within 2 months).
- **Vorbesitzer:** count, with neutral context when high for the age.
- Each item is a plain fact line with a thin neutral accent (matching the existing grey/blue style). No score, no badge, no "transparent" label.

New deterministic helpers in `lib/cars/disclosure.ts` (pure, tested):
- `huStatus(hu?: string): { label: string; state: 'gueltig' | 'abgelaufen' | 'baldFaellig' | 'unbekannt' }`
- `serviceStatus(car): { label: string; state: 'vollstaendig' | 'teilweise' | 'keine' }`
- `buildDisclosure(car): { accidents, service, hu, owners, emission }` — a serializable summary the panel renders.

### 1.2 Symbolfoto label
Small "Symbolfoto" tag overlaid on the gallery in `CarDetail` (and any card image) so stock images are honestly marked.

### 1.3 Price-in-market line
Under the price in the sidebar, one neutral line from the existing `calcPreisAmpel`: e.g. "Marktwert ca. 21.000 € · {label}". Positive/neutral wording only (reuse existing labels; never "auffällig"/"Risiko").

### 1.4 Review fixes folded in
- **Rename "🤖 KI-Analyse" → "Fahrzeug-Check"** (button in `CarDetail`, modal title in `AnalysisPanel`). Drop the robot emoji. The deeper inspection content stays in the modal; the headline disclosures now also live inline (1.1).
- **Wire the dead "Probefahrt vereinbaren" button** → opens a lightweight `TestDriveModal` (name, Telefon, Wunschtermin) that POSTs to a new `POST /api/cars/test-drive` route, persists the request to SQLite (`bookings` table, sql.js — same pattern as the question log), and shows a confirmation. (The seller-facing list of requests is Slice 3.)

### 1.5 Files (Slice 1)
- Modify `lib/cars/types.ts` — add `repaired?: boolean` to `Accident` (the data already carries it; the type doesn't declare it yet)
- Create `lib/cars/disclosure.ts` (+ test)
- Modify `components/CarDetail.tsx` (history panel, Symbolfoto, price line, rename, wire booking button)
- Modify `components/AnalysisPanel.tsx` (modal title rename)
- Create `components/TestDriveModal.tsx`
- Create `app/api/cars/test-drive/route.ts`
- Create `lib/bookings/store.ts` (sql.js, `data/bookings.db`, gitignored) (+ test)

---

## Slice 2 — Printable "Fahrzeugbericht" per car

A clean, print-optimized transparency report the buyer takes home (and a strong demo moment / leave-behind).

- New route `app/cars/[id]/bericht/page.tsx` — server component that renders a print-friendly, single-column report: header (car, dealer, date), the full disclosure (history, every accident with detail, service/HU status), tech specs, features with the equipment explanations, the buyer checklist, and the price-in-market line.
- A **"Bericht drucken / als PDF speichern"** button (client) uses `window.print()` — no PDF dependency; the browser's print-to-PDF produces the file. A print stylesheet (`@media print`) hides nav/buttons.
- Linked from the detail page ("Fahrzeugbericht") and from the Fahrzeug-Check modal footer.

### Files (Slice 2)
- Create `app/cars/[id]/bericht/page.tsx`
- Create `components/VehicleReport.tsx` (shared render of the disclosure, reused by the report)
- Add print styles to `app/globals.css`
- Reuse `lib/cars/disclosure.ts`, `buildDamageDetails`, `buildBuyerChecklist`, `explainCarEquipment`

---

## Slice 3 — Seller dashboard: feature-aware test-drive guide + quick wins

### 3.1 Feature-aware Probefahrt-Drehbuch (upgrade to the test-drive guide)
Replace the generic test-drive steps with a concrete, **feature-driven** script tied to *this car's actual equipment*, with a **real route + map link**.

New richer shape in `lib/cars/sales-intelligence.ts`:
```ts
interface TestDrivePlan {
  headline: string;                                  // route profile (Performance/Familie/Komfort/Effizienz/Cabrio/Allround)
  route: { description: string; mapsUrl: string };   // concrete multi-leg route + Google Maps link
  legs: { leg: string; actions: string[] }[];        // leg-by-leg what to do
  featureDemos: { feature: string; when: string }[]; // THIS car's standout features → when to show each
}
```
- **Route + map:** a per-profile route template anchored to a configurable `DEALER_CITY` constant (default **"Braunschweig"**). `mapsUrl` is a Google Maps directions link seeded with the city + a profile-appropriate destination (e.g. an Autobahnauffahrt for Performance, a ruhige Wohngegend/Schulweg for Familie). Honest note in the UI: "Beispielroute – mit Händleradresse wird daraus die echte lokale Runde."
- **featureDemos:** map the car's *actual* features (matched via the equipment knowledge base) to a best demo moment. New `FEATURE_DEMO` mapping in `lib/cars/test-drive.ts`, e.g.:
  - Parking Assistant / PDC → "Beim Ein-/Ausparken automatisch einparken lassen"
  - Harman Kardon / Bang & Olufsen / Fond Entertainment → "Bei der Pause: Lieblingssong aufdrehen / Rücksitz-Screens zeigen"
  - Head-Up Display → "Auf der Autobahn – Infos im Blickfeld"
  - Driving Assistant (Professional) / adaptiver Tempomat → "Auf der Autobahn Abstandstempomat aktivieren"
  - Laserlicht → "(Dämmerung) Fernlicht-Reichweite zeigen"
  - Standheizung → "(Winter) vor der Fahrt vorheizen"
  - Komfortzugang → "Vor der Fahrt schlüssellos öffnen/starten"
  - Panorama-Glasdach → "Dach öffnen"
  - Ambientebeleuchtung → "Innenraumbeleuchtung bei Dämmerung"
  - Sitzheizung → "Sitzheizung einschalten"
  - Adaptives M Fahrwerk / M Fahrwerk Professional → "Sport-Modus auf der Landstraße"
  - xDrive → "Traktion in einer zügigen Kurve spüren"
- The dashboard renders the Drehbuch: headline, route (with "Route öffnen" link), legs, and the feature-demo list (only the features this car has).

### 3.2 Disclosure completeness per car (seller)
`lib/cars/disclosure.ts` gains `disclosureChecklist(car): { item: string; ok: boolean }[]` (real photos, service docs, HU valid, accident docs, owner history). The dashboard shows per-car gaps and an inventory summary ("3 Fahrzeuge mit abgelaufener HU", "1 Fahrzeug ohne Servicehistorie") — turning "be transparent" into a concrete dealer to-do.

### 3.3 Question analytics + Probefahrt requests
- Aggregate the persisted question log across the inventory → "Häufigste Kundenfragen (gesamt)" panel. New `getTopQuestions(limit)` in `lib/questions/log.ts`.
- Surface the Slice-1 Probefahrt requests (`bookings`) as a "Probefahrt-Anfragen" list on the dashboard.

### Files (Slice 3)
- Create `lib/cars/test-drive.ts` (route templates, maps URL, FEATURE_DEMO) (+ test); refactor `buildTestDrive` to use it
- Modify `lib/cars/sales-intelligence.ts` (richer `TestDrivePlan`)
- Modify `lib/cars/disclosure.ts` (`disclosureChecklist`)
- Modify `lib/questions/log.ts` (`getTopQuestions`)
- Modify `app/api/sellers/dashboard/route.ts` + `app/dashboard/page.tsx` (pass new data)
- Modify `components/SellerDashboard.tsx` (Drehbuch, completeness, analytics, bookings)

---

## Slice 4 — Light polish

- **Disclosure chips on car cards** (`CarCard`): factual chips so transparency shows in the grid — e.g. "Unfall: 1 · repariert", "Scheckheft: vollständig", "HU abgelaufen". From `buildDisclosure`. Replace the generic "GEBRAUCHTWAGEN" badge.
- **Factual landing tagline** in the header/hero — describes what the site does in plain terms (e.g. "Jedes Fahrzeug mit vollständiger Historie, Schäden und Kosten — offen einsehbar."). No self-praise.
- **Dashboard card sub-sections/tabs** — the expanded per-car card is long; group into tabs (Briefing / Ausstattung / Probefahrt) for readability.

### Files (Slice 4)
- Modify `components/CarCard.tsx`, `components/Header.tsx` (or landing), `components/SellerDashboard.tsx`

---

## Sequencing
1. **Slice 1** first — it *is* the pitch (inline disclosure + rename + booking).
2. **Slice 2** — the printable report (demo moment).
3. **Slice 3** — seller Drehbuch + analytics.
4. **Slice 4** — polish.

Each slice is independently demoable and shippable.

## Testing
- `disclosure.test.ts`: `huStatus` (gültig/abgelaufen/baldFällig against fixed "today"), `serviceStatus` (vollständig/teilweise/keine), `disclosureChecklist`.
- `test-drive.test.ts`: route profile selection, `mapsUrl` is a valid URL, `featureDemos` only lists features the car has and maps them to a `when`.
- `bookings/store.test.ts`: insert + read a test-drive request (in-memory under VITEST).
- `log.test.ts`: `getTopQuestions` aggregation.
- Route handler tests for `test-drive` (201/persist) and the updated dashboard shape.
- All new lib logic is pure/deterministic and unit-tested; sql.js stores follow the existing atomic-write + VITEST-in-memory pattern.

## Out of scope
- Multi-dealer/multi-tenant, accounts, billing, real inventory import.
- A real maps integration with live dealer coordinates (we use a configurable city + representative route; honestly labelled).
- Real photography (Symbolfoto label only).
- Live AI as the default (flip-on only).

## Wording rules (apply everywhere)
- Show facts; never claim transparency. No "wir sind transparent", no trust badges, no "Risiko".
- Accidents framed factually and solution-oriented ("fachgerecht repariert"), expired HU/missing service stated plainly without alarm.

## Open questions
None.
