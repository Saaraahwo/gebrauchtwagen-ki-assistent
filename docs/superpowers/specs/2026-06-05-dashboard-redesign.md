# Dashboard Redesign — Design Spec

**Date:** 2026-06-05
**Status:** Approved

## Goal

Replace the current Power BI-style single-scroll dashboard with a Dribbble-inspired light design: white sidebar navigation, 4 separate views, coloured icon KPI cards with shadows, card-grid for vehicles.

## Approved Mockups

All 4 sections approved via visual companion:
- Übersicht: KPI icon tiles + analytics charts
- Fahrzeuge: 3-column card grid
- Kundenfragen: ranked list with coloured badges
- Probefahrten: booking cards with empty state

---

## Design Tokens

| Token | Value |
|---|---|
| Canvas background | `#f4f6fb` |
| Sidebar / card background | `#ffffff` |
| Sidebar shadow | `box-shadow: 2px 0 16px rgba(0,0,0,0.07)` |
| Card shadow (default) | `box-shadow: 0 4px 18px rgba(0,0,0,0.07)` |
| Card shadow (coloured) | `box-shadow: 0 4px 20px rgba(<color>,0.10)` |
| Gradient (logo/buttons) | `linear-gradient(135deg, #1c69d4, #7c3aed)` |
| Card border-radius | `14px` |
| Icon tile border-radius | `9px` |
| Pill badge border-radius | `9999px` |
| Font | `'IBM Plex Sans'` (already in globals.css) |

### KPI Colour Palette

| KPI | Gradient | Icon bg | Shadow colour |
|---|---|---|---|
| Fahrzeuge | `#1c69d4 → #3b82f6` | `#eff6ff` | `rgba(28,105,212,0.10)` |
| Ø Preis | `#7c3aed → #a78bfa` | `#f5f3ff` | `rgba(124,58,237,0.10)` |
| Ø km | `#0891b2 → #06b6d4` | `#ecfeff` | `rgba(6,182,212,0.10)` |
| Ø Alter | `#d97706 → #fbbf24` | `#fffbeb` | `rgba(245,158,11,0.10)` |

### Status Pills

| Status | Background | Text colour |
|---|---|---|
| Gut | `#f0fdf4` | `#16a34a` |
| Hinweise | `#fffbeb` | `#d97706` |
| Kritisch | `#fef2f2` | `#ef4444` |

---

## Layout

### Sidebar (shared, always visible)

- Width: 180px, fixed left, full height
- White background, right shadow
- Logo: 34×34px gradient tile + "BMW / Verkäufer-Portal" text
- 4 nav items: Übersicht, Fahrzeuge, Kundenfragen, Probefahrten
- Active state: `background:#f0f4ff`, `border-left:3px solid #1c69d4`, text `#1c69d4 font-weight:600`
- Inactive: `color:#94a3b8`
- Bottom: avatar circle (gradient) + seller name + "Abmelden" in red
- Navigation is **React state** (`activeView` string), no URL routing changes

### Main area

- Padding: 22px 20px
- Page title (h1 16px bold) + subtitle (10px muted) + action buttons top right

---

## Section 1 — Übersicht

**Page header:** "Übersicht" + "Alle 12 Fahrzeuge aktiv" + [Daten löschen] [FAQ exportieren] buttons

**KPI row** (4 cards, equal width):
Each card: white, 14px radius, coloured box shadow. Inside: 32×32 icon tile, big number (22px bold), label (9px muted).

**Row 2** (2 columns, ratio 1.6:1):
- Preisverteilung: bar chart with gradient bars (blue→purple), each bar 10px height, label left, count right
- Flottengesundheit: pill-shaped stacked bar + 3 coloured stat tiles (Gut green, Hinweise amber, Kritisch red)

**Row 3** (2 equal columns):
- Kraftstoffmix: same bar chart style, coloured dots as legends
- Abgasnormen: same bar chart style

---

## Section 2 — Fahrzeuge

**Page header:** "Fahrzeuge" + count + search input + filter button

**Card grid:** 3 columns, gap 12px. Each card:
- Header area (80px tall): gradient background derived from car's `colorHex`, car name watermark text, status pill top-right, TOP badge top-left (if applicable)
- Body: car name (bold), subtitle line (km · year), price (14px bold blue), PS · fuel, badge chips row (Besitzer count, Service count)
- Hover: subtle shadow lift
- Click: expands to full briefing (Stärken, Kaufhemmnisse, Erwartete Fragen, Chat-Protokoll, Probefahrt-Skript, Ausstattung, Disclosure)

Expanded state renders below the card grid as a full-width panel (not a modal), replacing the current accordion.

---

## Section 3 — Kundenfragen

**Page header:** "Kundenfragen" + question count + [FAQ Export] gradient button

**Card 1 — Häufigste Fragen:**
Ranked list. Each row: coloured rank tile (1=blue, 2=purple, 3=cyan, 4=amber), question text + car name below, count pill (same colour as rank tile).

**Card 2 — Fragen pro Fahrzeug:**
Row of small coloured tiles, one per car that has questions. Shows count + car model abbreviation.

---

## Section 4 — Probefahrten

**Page header:** "Probefahrten" + booking count

**Empty state:** centred grey tile icon + "Keine Anfragen" + explanation text.

**Booking cards** (when present): avatar gradient circle + name + phone + [car badge] [date badge] + "Neu" pill.

---

## Files Changed

| File | Change |
|---|---|
| `components/SellerDashboard.tsx` | Full rewrite — sidebar + 4-view state machine |
| `components/charts/StatCard.tsx` | Rewrite as icon-tile KPI card |
| `components/charts/BarRow.tsx` | Rewrite with gradient bar + dot legend support |
| `components/charts/ConditionBar.tsx` | Rewrite as pill-shaped stacked bar + stat tiles |

No changes to data, API routes, or auth.
