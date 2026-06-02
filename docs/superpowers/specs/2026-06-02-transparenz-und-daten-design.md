# Transparenz & Daten — Design

**Date:** 2026-06-02
**Status:** Draft — awaiting user review
**Branch:** nextjs-migration

## Goal

Close three transparency gaps found in an audit of the BMW used-car platform, all aligned with the project's ethics framing (*Unternehmensethik*) and the "transparency demonstrated, not proclaimed" principle:

1. **Communicate the value proposition** — make visible (factually) why this is not a normal chatbot.
2. **Show the basis of every answer** — the chat and the Fahrzeug-Check disclose *on what* each answer is grounded (and the chat finally shows the engine/model label).
3. **Data transparency & control** — disclose what is stored, get consent for personal data, and let the dealer delete stored data.

## Guiding decisions (from brainstorming)

| Decision | Choice |
|----------|--------|
| Consent model | Passive **notice** in the chat; a **required consent checkbox** + `/datenschutz` page on the booking form (it captures personal data: name + phone). |
| Data deletion | Seller-side **"Daten löschen"** button on the dashboard, clearing the questions + bookings stores. |
| Wording | Plain facts that describe the *mechanism*. **Never** "wir sind transparent" or any virtue slogan. |
| Scope | Demo on the 12-car dataset; deterministic/rule-based; SQLite via sql.js. |

---

## Part 1 — Make the UVP visible (factual)

A small **"So funktioniert's"** strip on the landing page, between the `Header`/`Breadcrumb` and the car grid, with three *mechanism* statements (not virtue claims):

- **Schäden, Historie & Kosten offen einsehbar** — direkt am Fahrzeug, nicht versteckt.
- **Jede Chat-Antwort mit Grundlage** — Sie sehen, worauf sie beruht.
- **Regelbasiert statt erfunden** — Angaben aus Fahrzeugdaten und Wissensdatenbank.

A one-line echo in the chat header: *"Antworten regelbasiert — mit Grundlage."*

**Files:**
- Create `components/ValueProp.tsx` (presentational, 3 factual points).
- Modify `app/page.tsx` to render `<ValueProp />` above `<CarBrowser />`.
- Modify `components/ChatWidget.tsx` header line (one factual sentence).

---

## Part 2 — Show the basis of every answer

### 2.1 The chat returns a `basis`
`lib/ai/chat.ts` currently returns `{ reply, model }`. Extend `ChatResult` to `{ reply, model, basis }`.

A new pure helper `lib/ai/chat-basis.ts` classifies the question into a basis label (deterministic, regex on the message — mirrors the demo-chat branch families):
```ts
export function basisForMessage(message: string): string
```
Mapping (first match wins):
- price/value/negotiation (`preis|wert|markt|verhandl|rabatt|teuer|günstig`) → **"Marktvergleich & Kostenschätzung"**
- running costs (`kosten|unterhalt|jahreskosten|verbrauch`) → **"Kostenschätzung"**
- "Was ist/bedeutet X" equipment (`was ist|was bedeutet|was heißt|erklär|wofür|wozu`) → **"Wissensdatenbank"**
- accident/damage (`unfall|schaden|reparatur|lack|umlackier`) → **"Schadens-Datenbank & Fahrzeugdaten"**
- default → **"Fahrzeugdaten & Prüf-Erfahrung"**

In `chatWithClaude`:
- The equipment-knowledge-base branch (already first) returns `basis: 'Wissensdatenbank'`, `model: 'wissensdatenbank'`.
- The demo branch returns `basis: basisForMessage(userMessage)`, `model: 'demo-mode'` (or `'demo-mode (API Fehler)'`).
- The live-Claude branch returns `basis: 'KI-Modell'`, `model: CLAUDE_MODEL`.

`app/api/cars/chat/route.ts` passes `basis` through in the JSON (`{ reply, model, basis }`).

### 2.2 ChatWidget shows basis + model per answer
`components/ChatWidget.tsx`: the assistant message type gains `basis?: string; model?: string`. Under each assistant reply, render a small muted line:
> `Grundlage: {basis} · Quelle: {model}`

(Only on assistant messages that carry them.)

### 2.3 Fahrzeug-Check popup shows a basis line
`components/AnalysisPanel.tsx`: next to the existing `Modell: {aiAnalysis.model}` line in the "Vollständige Analyse" block, add:
> `Grundlage: Fahrzeugdaten, Regelprüfung & Marktvergleich`

(Static — the analysis is always built from the rules engine + anomalies + price + damage DB.)

**Files (Part 2):**
- Create `lib/ai/chat-basis.ts` (+ test)
- Modify `lib/ai/chat.ts` (`ChatResult` + the three return paths)
- Modify `app/api/cars/chat/route.ts` (pass `basis`)
- Modify `components/ChatWidget.tsx` (message type + render)
- Modify `components/AnalysisPanel.tsx` (basis line)

---

## Part 3 — Data transparency & control

### 3.1 Chat notice (passive)
`components/ChatWidget.tsx`: a small muted line near the input:
> *"Ihre Fragen werden gespeichert, um Antworten zu verbessern. Details: [Datenschutz](/datenschutz)."*

### 3.2 Booking consent (required)
`components/TestDriveModal.tsx`: add a required consent checkbox above the submit button:
> ☐ *"Ich willige ein, dass Name und Telefonnummer zur Terminvereinbarung gespeichert werden. ([Datenschutz](/datenschutz))"*

The submit button is `disabled` until the box is checked (in addition to the existing `sending` state). No new field is stored — consent is a client-side gate.

### 3.3 `/datenschutz` page
Create `app/datenschutz/page.tsx` (server component) — a plain, factual page listing exactly what is stored:
- **Chat-Fragen:** Frage, Antwort, Zeitpunkt, Fahrzeug-Nr. — *keine Kontaktdaten.*
- **Probefahrt-Anfragen:** Name, Telefon, Wunschtermin, Fahrzeug.
- **Speicherort:** lokal beim Händler in einer Datei (SQLite, Demo). *Keine Weitergabe an Dritte.*
- **Zweck:** Beantwortung von Fragen / Terminvereinbarung; Auswertung häufiger Fragen.
- **Löschung:** Der Händler kann die gespeicherten Daten jederzeit löschen.
- A "Zurück" link. Linked from a global footer.

### 3.4 Global footer
Create `components/Footer.tsx` with a single factual line + a `/datenschutz` link, rendered on the buyer pages (landing + detail) and the datenschutz page itself. (Keep it minimal — one row.)

### 3.5 Seller "Daten löschen"
- `lib/questions/log.ts`: add a production-safe `export function clearQuestions(): void` (deletes all rows + persists). (Keep the existing `_resetLog` test helper as-is.)
- `lib/bookings/store.ts`: add `export function clearBookings(): void` (same).
- Create `app/api/sellers/data/route.ts` — `DELETE` (auth-gated via `requireSellerFromRequest`; 401 without cookie). On success calls `clearQuestions()` + `clearBookings()`, returns `{ ok: true }`.
- `components/SellerDashboard.tsx`: a **"Gespeicherte Daten löschen"** button (header area) that confirms, calls `DELETE /api/sellers/data`, and on success clears the on-screen `topQuestions`/`bookings` (simplest: `window.location.reload()` after the call).

**Files (Part 3):**
- Modify `components/ChatWidget.tsx` (notice)
- Modify `components/TestDriveModal.tsx` (consent checkbox)
- Create `app/datenschutz/page.tsx`
- Create `components/Footer.tsx`; modify `app/page.tsx` + `app/cars/[id]/page.tsx` to render it
- Modify `lib/questions/log.ts` (`clearQuestions`) + `lib/bookings/store.ts` (`clearBookings`)
- Create `app/api/sellers/data/route.ts` (+ test)
- Modify `components/SellerDashboard.tsx` (delete button)

---

## Testing
- `chat-basis.test.ts`: each mapping (price → Marktvergleich, "Was ist X" → Wissensdatenbank, Unfall → Schadens-Datenbank, default).
- `lib/questions/log.test.ts` + `lib/bookings/store.test.ts`: `clearQuestions`/`clearBookings` empty the store.
- `app/api/sellers/data/route.test.ts`: 401 without cookie; 200 + stores cleared with a valid token.
- UI parts (ValueProp, notices, consent gate, datenschutz page, footer, delete button) verified via build + runtime rendering checks.

## Wording rules (apply everywhere)
- Describe the mechanism; never claim transparency as a slogan. No "wir sind transparent", no "Risiko".
- Data notices are plain and specific about *what* is stored and *why*.

## Out of scope
- Real auth/identity for buyers (no per-buyer data deletion — deletion is dealer-wide).
- Cookie banners / analytics consent (no third-party tracking exists).
- Encryption at rest, real hosting, real GDPR processes (this is a local demo).

## Open questions
None.
