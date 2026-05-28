# UI & Chat Improvements Design

**Date:** 2026-05-28
**Branch:** nextjs-migration

## Goal

Three targeted improvements to the running Next.js app:
1. Real car photos and color swatches (currently showing grey placeholders)
2. Car detail page redesigned to BMW.de style with more data fields surfaced
3. Chat responses that render markdown and give actionable buyer advice

---

## 1. Car Images & Color Swatches

### Problem
`data/cars.json` already has `colorHex`, `imgExterior`, `imgInterior`, `badge`, `description`, `erstzulassung`, `hu`, `drive`, `doors`, `seats` — but none of these are in `lib/cars/types.ts` or used by any component.

### Changes

**`lib/cars/types.ts`** — add optional fields to `Car`:
```ts
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

**`components/CarSVG.tsx`** — new component ported from `master:public/index.html:430-492`. Renders an inline SVG car silhouette (sedan / suv / cabrio) in the car's `colorHex`. Used as fallback when the photo fails to load or is missing.

**`components/CarCard.tsx`** — replace the grey placeholder with:
- Real photo (`imgExterior`) filling the card image area (`object-fit: cover`)
- On error or missing: color-gradient background (`linear-gradient(135deg, {colorHex}20, {colorHex}40)`) + centered `<CarSVG>`
- `badge` chip ("TOP", "AKTIONSFAHRZEUG") shown as absolute overlay top-left if present
- Red accident dot overlay top-right (already there, keep it)

---

## 2. Car Detail Page — Layout A (final)

### Layout (confirmed by user)

```
┌──────────────────────────────────────────────────────┐
│  Full-width photo gallery (exterior/interior)         │
│  [Thumbnail strip bottom-left]    [Exterieur 1/2]    │
└──────────────────────────────────────────────────────┘
┌───────────────────────────────────┐ ┌───────────────┐
│ Title card                        │ │ Sticky right  │
│  Name, subtitle                   │ │  Price        │
│  chips: km · EZ · kW · fuel       │ │  Marktwert    │
│  color dot · badge                │ │  KI-Analyse → │
│  accident plain text (if any)     │ │    (popup)    │
│  description blurb                │ │  Probefahrt   │
├───────────────────────────────────┤ └───────────────┘
│ Technische Daten (dl 2-col grid)  │
│  + erstzulassung, drive, hu,      │
│    doors, seats, polster          │
├───────────────────────────────────┤
│ Ausstattung (2-col dot list)      │
└───────────────────────────────────┘

[💬 floating bubble, fixed bottom-right]
  → click opens chat popup (340×480px)
  → ✕ closes popup, bubble returns
```

### Accident display on detail page
If the car has accidents: show `"N Unfall repariert · Reparatur: X €"` as small grey text (`text-xs text-bmw-gray-muted`) directly under the subtitle in the title card. **No orange border, no separate Schadenshistorie section.** The KI-Analyse popup is the place where accidents get flagged in red.

### Components to modify

**`components/CarDetail.tsx`** — full rewrite:
- Full-width photo gallery: main image switches exterior/interior on thumbnail click; fallback to `<CarSVG>` with `colorHex` gradient background
- Title card: name, subtitle, chip row (km, EZ, kW, fuel), color dot, badge, accident plain text line (if any), description blurb
- Tech specs `<dl>` adds: `erstzulassung`, `drive`, `hu`, `doors`, `seats`, `polster`, `interiorColor`
- Features as 2-column dot list
- No Schadenshistorie section — accident info is in the title card as plain text only

**`components/AnalysisPanel.tsx`** — convert to a **modal popup**:
- Idle state: renders nothing (button is in the sidebar, not here)
- Button "🤖 KI-Analyse starten" lives in the price/sidebar card (`CarDetail` right column)
- On click: modal overlay appears with flags (red/orange/green) + full AI text + "Schließen" button
- Click outside or ✕ closes modal

**`components/ChatWidget.tsx`** — convert to a **floating bubble + popup**:
- Renders a fixed `position: fixed; bottom: 28px; right: 28px` blue circular button (💬) with a "?" badge
- On click: popup panel (340×480px, bottom-right above the bubble) opens; bubble hides
- Popup has blue header, scrollable message area with bubble styling, rounded input + send button
- ✕ closes popup, bubble reappears
- Chat message rendering uses the `renderMarkdown` helper (same as before)

**`app/cars/[id]/page.tsx`** — layout becomes:
```tsx
<>
  <Header />
  <Breadcrumb />
  <CarDetail car={car} />   // includes gallery + left col + right sticky col with KI button
  <ChatWidget car={car} />  // fixed floating bubble
</>
```
`AnalysisPanel` is rendered inside `CarDetail`'s right column and manages its own modal state.

---

## 3. KI-Analyse Popup — Content Style

### Analysis text format
`lib/ai/demo-analysis.ts` currently produces text with "SCHRITT 1:", "SCHRITT 2:", "SCHRITT 3:" headers. Remove these — rewrite as natural paragraphs (see mockup). The content stays but flows as readable prose, not a numbered procedure.

### `AnalysisPanel` popup structure (final)
1. **Header:** car name + subtitle + price
2. **Summary bar:** neutral number chips (Unfall count, km, Vorbesitzer, Marktwert, Preisposition)
3. **Prüfpunkte:** each finding as a card with thin bmw-blue left border, bold title, plain text, grey tip — **no red/orange/green backgrounds, no emoji symbols**
4. **Vollständige Analyse:** AI text in a light grey box, plain paragraphs, bullet points with `·`
5. **Chat nudge:** light blue box at bottom — "Noch Fragen? Nutzen Sie den Chat — unser KI-Assistent beantwortet alles zu Motor, Unfall, Kosten und Verhandlung."

---

## 4. Chat Improvements

### Problem A — Markdown not rendered
`ChatWidget.tsx` renders `{m.content}` as plain text. Responses use `**bold**`, `\n` line breaks, and `•` bullet points — these show as raw characters.

**Fix:** Add a `renderMarkdown(text: string): React.ReactNode[]` helper in `ChatWidget.tsx` that returns React elements — no `dangerouslySetInnerHTML`, no HTML strings. Parse the text into lines, then within each line split on `**...**` to produce alternating plain/`<strong>` spans. Return a `<>` fragment with `<br />` between lines. Lines starting with `•` get a small left indent via className. This is a whitelist-only renderer: only `**bold**` and line breaks are handled; all other characters are rendered as plain text nodes, so injected HTML or `<script>` tags are inert.

### Chat persona — solution-oriented, transparent, sales-friendly
Every chat response must follow this principle: **be honest about the issue, then immediately give a concrete solution or workaround**. Never just list problems. Examples:
- Euro 5 emission risk → "Kein Problem: eine Feinstaubplakette kostet ~10 € und deckt viele Städte ab. Für Fahrverbotszonen gibt es Tagespässe ab 12 €."
- High km → "150.000 km klingt viel, aber gut gepflegte Diesel laufen problemlos 300.000 km. Worauf du achten solltest: …"
- Accident → facts + "Der Schaden ist dokumentiert — das ist ehrlicher als ein unreportierter Schaden. Mit Rechnung und Gutachten bist du auf der sicheren Seite."
- Missing service record → "Frag nach dem Serviceheft. Wenn ein Eintrag fehlt, kann die Werkstatt oft die Rechnung nachliefern."

Goal: buyer feels informed and confident, not scared off.

### Problem B — Accident response is informational, not actionable

**Current:** Lists what damage occurred and what to physically check.

**Improved:** Adds a 4-step buyer action plan when the question is about handling/negotiating/dealing with the accident:

1. **Dokumente verlangen** — original repair invoice, photos, DEKRA report if available
2. **Preisverhandlung** — accident cars lose 10–20% market value; scripted sentence the buyer can say verbatim
3. **Vor Ort prüfen** — specific checks based on `damageKey` (heck → trunk lid/PDC, front → axle/cooling, seite → door gaps)
4. **Gutachten empfehlen** — DEKRA/TÜV for 200–400 €, always worth it on accident cars

**New trigger pattern** added to `lib/ai/demo-chat.ts` — before the existing `unfall|schaden` branch:
```
umgang|wie soll ich|was tun|strategie|ratschlag|vorgehen|wie gehe ich|was mache ich
```
When this + `unfall|schaden|reparatur` → fire the action-plan response.

The existing `unfall|schaden` branch (facts about what happened) stays for factual questions like "hatte er einen Unfall".

### Problem C — Response for `demo-chat` test `"Hatte er einen Unfall?"` on a car with no accidents
Current: returns correct "keine bekannte Unfallhistorie". No change needed.

---

## What does NOT change

- Route handlers, lib/ai/analysis.ts, lib/ai/demo-analysis.ts — untouched
- FilterSidebar, CarBrowser, CarGrid — untouched
- Header, Breadcrumb, SellerLogin, SellerDashboard — untouched
- All Vitest tests — the new Car fields are optional so existing test fixtures compile unchanged

---

## Files changed

| File | Change |
|------|--------|
| `data/cars.json` | Fix car #12 `imgExterior` (replace broken `/pink-car.avif` with real Unsplash URL) |
| `lib/cars/types.ts` | Add optional fields to `Car` interface |
| `components/CarSVG.tsx` | New — SVG car silhouette component |
| `components/CarCard.tsx` | Real photo + SVG fallback + badge |
| `components/CarDetail.tsx` | Full rewrite — gallery, title card, specs, right sidebar with KI button |
| `components/AnalysisPanel.tsx` | Modal popup — neutral style, no colors/symbols, chat nudge |
| `lib/ai/demo-analysis.ts` | Remove SCHRITT headers, rewrite as natural paragraphs |
| `app/cars/[id]/page.tsx` | Simplified — CarDetail + floating ChatWidget only |
| `components/ChatWidget.tsx` | Convert to floating bubble + popup; add `renderMarkdown` helper |
| `lib/ai/demo-chat.ts` | New negotiation trigger + improved accident action-plan response |

---

## Testing

- `npm run test:run` — must still pass (types.ts additions are optional, no existing test changes)
- Manual: open car #1 (BMW 118i, no accidents), car #3 (BMW 520d, check for accident), car #12 (BMW 116i, pink — verify real photo shows)
- Chat smoke: "wie teuer ist umlackieren ca." → cost breakdown; "wie gehe ich mit dem Unfall um" → 4-step plan; "hatte er einen Unfall?" → factual response
