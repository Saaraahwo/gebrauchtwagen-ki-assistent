# Transparency Demo — Slice 2 Implementation Plan (Printable Fahrzeugbericht)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A clean, print-optimized per-car **"Fahrzeugbericht"** the buyer can print or save as PDF — a strong demo moment and a leave-behind, composed entirely from existing, already-tested deterministic functions.

**Architecture:** A new server route `app/cars/[id]/bericht/page.tsx` loads the car (same `readFileSync(data/cars.json)` pattern as the detail page) and renders a presentational `components/VehicleReport.tsx` plus a tiny client `components/PrintButton.tsx` (`window.print()`). A `@media print` block in `globals.css` hides interactive chrome. The report reuses `buildDisclosure`, `buildDamageDetails`, `buildBuyerChecklist`, `explainCarFeatures`, and `calcPreisAmpel` — all pure, no new business logic.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4. (No PDF library — the browser's print-to-PDF produces the file.)

**Spec:** `docs/superpowers/specs/2026-05-31-transparency-demo-improvements-design.md` (Slice 2). Slice 1 already shipped.

**Conventions:**
- No `Co-Authored-By` trailer in commits.
- **Wording discipline:** plain facts only — never claim transparency, no "Risiko". Accidents stated factually.
- This slice is presentational; it adds no new pure logic, so verification is **build + runtime rendering checks**, not new unit tests. The composed functions are already unit-tested.
- Windows + OneDrive: if `npm run build` fails with `EPERM` on `.next`, run `taskkill //F //IM node.exe` then `rm -rf .next` and rebuild.

**Reused interfaces (already implemented, do not redefine):**
- `buildDisclosure(car): { accidentFree, accidents: [{type,date,damage,repaired,repainted,repairCost?}], service: {label,state}, hu: {label,state}, owners, emission? }` — `@/lib/cars/disclosure`
- `buildDamageDetails(accidents): [{type,date,repairCost?,damage,name,kurzfristig,langfristig,pruefung,kosten,adacTipp}]` — `@/lib/cars/buyer-guide`
- `buildBuyerChecklist(car): string[]` — `@/lib/cars/buyer-guide`
- `explainCarFeatures(car): [{term, description}]` — `@/lib/cars/feature-glossary`
- `calcPreisAmpel(car): {status,label,expected,diff}` — `@/lib/cars/price-calculator`

All five are **pure** (no sql.js / fs / server-only deps), safe in a server component.

---

### Task 1: PrintButton (client)

**Files:**
- Create: `components/PrintButton.tsx`

- [ ] **Step 1: Create the component**

`components/PrintButton.tsx`:
```tsx
'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-bmw-blue text-white text-sm font-semibold rounded-sm hover:bg-blue-700"
    >
      Bericht drucken / als PDF speichern
    </button>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/PrintButton.tsx
git commit -m "Add PrintButton (window.print) for the vehicle report"
```

---

### Task 2: VehicleReport component (presentational)

**Files:**
- Create: `components/VehicleReport.tsx`

- [ ] **Step 1: Create the component**

`components/VehicleReport.tsx`:
```tsx
import type { Car } from '@/lib/cars/types';
import { buildDisclosure } from '@/lib/cars/disclosure';
import { buildDamageDetails, buildBuyerChecklist } from '@/lib/cars/buyer-guide';
import { explainCarFeatures } from '@/lib/cars/feature-glossary';
import { calcPreisAmpel } from '@/lib/cars/price-calculator';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 break-inside-avoid">
      <h2 className="text-sm font-bold border-b border-bmw-gray-border pb-1 mb-2">{title}</h2>
      {children}
    </section>
  );
}

export function VehicleReport({ car }: { car: Car }) {
  const disclosure = buildDisclosure(car);
  const damageDetails = buildDamageDetails(car.accidents);
  const checklist = buildBuyerChecklist(car);
  const equipment = explainCarFeatures(car);
  const preis = calcPreisAmpel(car);
  const fahrzeugNr = `BMW-GW-${String(car.id).padStart(3, '0')}`;
  const stand = new Date().toLocaleDateString('de-DE');

  return (
    <article className="bg-white text-bmw-dark text-sm leading-relaxed">
      <header className="border-b-2 border-bmw-dark pb-3 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-bmw-gray-muted">BMW Niederlassung Braunschweig</div>
            <h1 className="text-xl font-bold mt-1">Fahrzeugbericht — {car.name}</h1>
            {car.subtitle && <div className="text-xs text-bmw-gray-text">{car.subtitle}</div>}
          </div>
          <div className="text-right text-[11px] text-bmw-gray-muted">
            <div>Fahrzeug-Nr. {fahrzeugNr}</div>
            <div>Stand: {stand}</div>
          </div>
        </div>
        <div className="mt-2 text-lg font-bold">
          {car.price.toLocaleString('de-DE')} €
          <span className="text-xs font-normal text-bmw-gray-text"> · Marktwert ca. {preis.expected.toLocaleString('de-DE')} € · {preis.label}</span>
        </div>
      </header>

      <Section title="Zustand & Historie">
        {disclosure.accidentFree ? (
          <p>Unfallfrei – keine Schäden dokumentiert.</p>
        ) : (
          <ul className="space-y-1">
            {disclosure.accidents.map((a, i) => (
              <li key={i}>
                <strong>{a.type}</strong> · {a.date} — {a.damage}
                {' · '}{a.repaired ? 'Fachgerecht repariert' : 'Nicht repariert'}
                {a.repainted ? ' · umlackiert' : ''}
                {typeof a.repairCost === 'number' ? ` · ${a.repairCost.toLocaleString('de-DE')} €` : ''}
              </li>
            ))}
          </ul>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
          <dt className="text-bmw-gray-muted">Servicehistorie</dt><dd>{disclosure.service.label}</dd>
          <dt className="text-bmw-gray-muted">Hauptuntersuchung</dt><dd>{disclosure.hu.label}</dd>
          <dt className="text-bmw-gray-muted">Vorbesitzer</dt><dd>{disclosure.owners}</dd>
          {disclosure.emission && (<><dt className="text-bmw-gray-muted">Abgasnorm</dt><dd>{disclosure.emission}</dd></>)}
        </dl>
      </Section>

      {damageDetails.length > 0 && (
        <Section title="Schäden im Detail">
          <div className="space-y-2">
            {damageDetails.map((d, i) => (
              <div key={i} className="border border-bmw-gray-border p-2 break-inside-avoid">
                <div className="font-semibold">
                  {d.name} · {d.date}
                  {typeof d.repairCost === 'number' ? ` · ${d.repairCost.toLocaleString('de-DE')} €` : ''}
                </div>
                <div className="text-xs mt-1"><strong>Jetzt prüfen:</strong> {d.pruefung}</div>
                <div className="text-xs"><strong>Langfristig:</strong> {d.langfristig}</div>
                <div className="text-xs"><strong>Typische Folgekosten:</strong> {d.kosten}</div>
                <div className="text-xs"><strong>ADAC-Tipp:</strong> {d.adacTipp}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Technische Daten">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-bmw-gray-muted">Kilometerstand</dt><dd>{car.km.toLocaleString('de-DE')} km</dd>
          {car.erstzulassung && (<><dt className="text-bmw-gray-muted">Erstzulassung</dt><dd>{car.erstzulassung}</dd></>)}
          <dt className="text-bmw-gray-muted">Baujahr</dt><dd>{car.yearBuilt}</dd>
          {car.fuel && (<><dt className="text-bmw-gray-muted">Kraftstoff</dt><dd>{car.fuel}</dd></>)}
          {car.transmission && (<><dt className="text-bmw-gray-muted">Getriebe</dt><dd>{car.transmission}</dd></>)}
          {car.enginePower && (<><dt className="text-bmw-gray-muted">Leistung</dt><dd>{car.enginePower}</dd></>)}
          {car.drive && (<><dt className="text-bmw-gray-muted">Antrieb</dt><dd>{car.drive}</dd></>)}
          {car.consumption && (<><dt className="text-bmw-gray-muted">Verbrauch</dt><dd>{car.consumption} l/100km</dd></>)}
          {car.color && (<><dt className="text-bmw-gray-muted">Farbe</dt><dd>{car.color}</dd></>)}
          {car.polster && (<><dt className="text-bmw-gray-muted">Polster</dt><dd>{car.polster}</dd></>)}
        </dl>
      </Section>

      {car.features.length > 0 && (
        <Section title="Ausstattung">
          <ul className="grid grid-cols-2 gap-y-0.5 text-xs">
            {car.features.map(f => <li key={f}>· {f}</li>)}
          </ul>
          {equipment.length > 0 && (
            <div className="mt-2 space-y-1">
              {equipment.map((e, i) => (
                <div key={i} className="text-xs"><strong>{e.term}:</strong> {e.description}</div>
              ))}
            </div>
          )}
        </Section>
      )}

      {checklist.length > 0 && (
        <Section title="Checkliste für den Kauf">
          <ul className="space-y-0.5 text-xs">
            {checklist.map((c, i) => <li key={i}>☐ {c}</li>)}
          </ul>
        </Section>
      )}

      <footer className="mt-4 pt-3 border-t border-bmw-gray-border text-[10px] text-bmw-gray-muted">
        Stand: {stand}. Fahrzeugfotos sind Symbolfotos. Alle Angaben ohne Gewähr.
      </footer>
    </article>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors. (If a reused import name is wrong, fix the import to match the "Reused interfaces" list at the top of this plan.)

- [ ] **Step 3: Commit**

```bash
git add components/VehicleReport.tsx
git commit -m "Add VehicleReport — print-friendly per-car report body"
```

---

### Task 3: The /cars/[id]/bericht route

**Files:**
- Create: `app/cars/[id]/bericht/page.tsx`

- [ ] **Step 1: Create the page**

`app/cars/[id]/bericht/page.tsx`:
```tsx
import { readFileSync } from 'fs';
import { join } from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Car } from '@/lib/cars/types';
import { VehicleReport } from '@/components/VehicleReport';
import { PrintButton } from '@/components/PrintButton';

export default async function ReportPage({
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
    <div className="max-w-3xl mx-auto p-6">
      <div className="no-print flex justify-between items-center mb-4">
        <Link href={`/cars/${car.id}`} className="text-sm text-bmw-blue hover:underline">← Zurück zum Fahrzeug</Link>
        <PrintButton />
      </div>
      <VehicleReport car={car} />
    </div>
  );
}
```

- [ ] **Step 2: Build and smoke-test the report**

```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
echo "--- car 3 (520d, Heckschaden) report sections ---"
curl -s http://localhost:3000/cars/3/bericht | grep -o "Fahrzeugbericht\|Heckschaden\|Schäden im Detail\|Technische Daten\|Checkliste für den Kauf\|Bericht drucken" | sort -u
echo "--- car 1 (118i, unfallfrei) has no 'Schäden im Detail' section ---"
curl -s http://localhost:3000/cars/1/bericht | grep -c "Schäden im Detail"
echo "--- invalid id 999 -> 404 ---"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/cars/999/bericht
taskkill //F //IM node.exe 2>/dev/null | head -1
```
Expected: car 3 prints `Fahrzeugbericht`, `Heckschaden`, `Schäden im Detail`, `Technische Daten`, `Checkliste für den Kauf`, `Bericht drucken`; car 1 prints `0` (no damage section); id 999 returns `404`.

- [ ] **Step 3: Commit**

```bash
git add app/cars/[id]/bericht/
git commit -m "Add /cars/[id]/bericht printable report route"
```

---

### Task 4: Print stylesheet

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append a print block to globals.css**

At the **end** of `app/globals.css`, add:
```css
@media print {
  .no-print { display: none !important; }
  body { background: #ffffff; }
  /* Avoid the gallery/dark areas bleeding ink; the report is plain on white. */
  a { color: inherit; text-decoration: none; }
}
```

- [ ] **Step 2: Verify the rule is present and the build still works**

```bash
grep -n "@media print" app/globals.css
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build 2>&1 | tail -3; echo "build exit: ${PIPESTATUS[0]}"
```
Expected: the `@media print` line is found; build exit 0.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "Add @media print rules for the vehicle report"
```

---

### Task 5: Link to the report from the detail page and the Fahrzeug-Check modal

**Files:**
- Modify: `components/CarDetail.tsx`
- Modify: `components/AnalysisPanel.tsx`

- [ ] **Step 1: Add a "Fahrzeugbericht" link in the CarDetail sidebar**

In `components/CarDetail.tsx`, find the sidebar buttons block that contains the "Probefahrt vereinbaren" button (it ends with that `</button>`). Immediately after that closing `</button>`, add:
```tsx
            <a
              href={`/cars/${car.id}/bericht`}
              className="block w-full mt-2 py-2.5 text-center border border-bmw-gray-border text-sm rounded-sm hover:bg-bmw-gray-bg text-bmw-dark transition-colors"
            >
              Fahrzeugbericht ansehen
            </a>
```
(A plain `<a>` is intentional — the report is a print/standalone page; a full navigation is fine.)

- [ ] **Step 2: Add a "Fahrzeugbericht" link in the AnalysisPanel footer**

In `components/AnalysisPanel.tsx`, the footer is:
```tsx
        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-bmw-gray-border px-5 py-3 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm border border-bmw-gray-border hover:bg-bmw-gray-bg rounded-sm transition-colors"
          >
            Schließen
          </button>
        </div>
```
Replace it with (adds a left-aligned report link next to the Schließen button):
```tsx
        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-bmw-gray-border px-5 py-3 flex justify-between items-center">
          <a href={`/cars/${car.id}/bericht`} className="text-sm text-bmw-blue hover:underline">
            Fahrzeugbericht ansehen
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm border border-bmw-gray-border hover:bg-bmw-gray-bg rounded-sm transition-colors"
          >
            Schließen
          </button>
        </div>
```

- [ ] **Step 3: Build and smoke-test the link**

```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
echo "--- detail page links to the report ---"
curl -s http://localhost:3000/cars/3 | grep -o 'href="/cars/3/bericht"' | head -1
taskkill //F //IM node.exe 2>/dev/null | head -1
```
Expected: `href="/cars/3/bericht"` is present in the detail page HTML.

- [ ] **Step 4: Commit**

```bash
git add components/CarDetail.tsx components/AnalysisPanel.tsx
git commit -m "Link to the Fahrzeugbericht from the detail page and Fahrzeug-Check modal"
```

---

### Task 6: Slice 2 verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck + full test suite (no regressions)**

```bash
npx tsc --noEmit && echo "tsc OK"
npm run test:run 2>&1 | grep -E "Test Files|Tests" | tail -2
```
Expected: tsc clean; all existing tests still pass (count unchanged — this slice adds no unit tests).

- [ ] **Step 2: Production build**

```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build 2>&1 | tail -4; echo "build exit: ${PIPESTATUS[0]}"
```
Expected: build exit 0; the route list includes `/cars/[id]/bericht`.

- [ ] **Step 3: End-to-end report walkthrough**

```bash
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
echo "=== accident car (10=M5, Motorschaden/Austauschmotor) full report ==="
curl -s http://localhost:3000/cars/10/bericht | grep -o "Fahrzeugbericht — BMW M5\|Austauschmotor\|Schäden im Detail\|Checkliste für den Kauf\|BMW Niederlassung Braunschweig\|Bericht drucken" | sort -u
echo "=== clean car (1) report omits damage section ==="
curl -s http://localhost:3000/cars/1/bericht | grep -c "Schäden im Detail"
echo "=== print rule present ==="
grep -c "@media print" app/globals.css
taskkill //F //IM node.exe 2>/dev/null | head -1
git status --short
```
Expected: car 10 shows the report header (Braunschweig), `Austauschmotor`, `Schäden im Detail`, `Checkliste für den Kauf`, `Bericht drucken`; car 1 prints `0`; the print rule count is ≥ 1; working tree clean.

Slice 2 is complete. Slice 3 (feature-aware Probefahrt-Drehbuch with Braunschweig routes + seller analytics) and Slice 4 (polish) will be planned separately.
