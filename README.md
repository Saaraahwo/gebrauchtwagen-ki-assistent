# Gebrauchtwagen KI-Kaufassistent

Ein KI-gestützter Kaufassistent für gebrauchte BMW — als Fallstudie im OEM-Kontext.
Leitidee: **Transparenz, die verkauft.**

Next.js (App Router) · TypeScript · Tailwind · Vitest. Läuft vollständig im **Demo-Modus**
ohne API-Key (deterministische Fallbacks); mit `ANTHROPIC_API_KEY` werden Analyse- und
Chat-Antworten live von Claude erzeugt.

## Warum wir das bauen

Der Gebrauchtwagenkauf ist ein **Vertrauensproblem**: Der Käufer fürchtet versteckte Mängel
und glaubt dem Verkäufer erst einmal nicht. Dieses Misstrauen macht Verhandlungen zäh,
drückt den Preis und kostet Stammkunden.

Unsere Idee dreht das um: Der Assistent zeigt **aktiv auch das, was nicht perfekt ist** —
sachlich, mit Quelle und immer mit einer Lösung. Wer auch die Schwächen offen nennt, dem
glaubt man die Stärken. Der Käufer entscheidet ohne Restzweifel und kommt wieder.
**Transparenz wird so vom Risiko zum stärksten Verkaufsargument.**

## Konzept

Eine Datenbasis, zwei Oberflächen: derselbe geprüfte Faktenkern — einmal für den Käufer
aufbereitet, einmal als Verkaufshilfe für das Autohaus.

<p align="center">
  <img src="presentation/concept-diagram.png" alt="Datenquellen → KI-Assistent (belegt, mit Quelle) → Käufer-Ansicht und Verkäufer-Cockpit" width="820">
</p>

## Wie es funktioniert

Jede Aussage steht auf Daten, nicht auf Bauchgefühl. Eine **Regel-Engine** prüft die
Fahrzeugdaten, erkennt Auffälligkeiten und liefert die passende Quelle; die **KI** formuliert
daraus verständliche Antworten. So kann nichts „erfunden" werden — jeder Satz ist auf eine
Quelle zurückführbar (z. B. Fahrzeugdaten, ADAC, WLTP, Marktvergleich, Schadens-Datenbank).

## Was der Assistent kann

- **KI-Chat mit Quellen** — Jede Chat-Antwort nennt ihre Grundlage und Quelle
  (z. B. *Technische Fahrzeugdaten · Wissensdatenbank*, *Marktvergleich*,
  *Schadens-Datenbank*). Modellspezifisch und nachprüfbar statt generisch.
- **KI-Fahrzeug-Check mit allen Highlights + Erklärungen** — Ein Klick zeigt alle
  Besonderheiten des Autos: Prüfpunkte, Schäden im Detail (mit Folgekosten & ADAC-Tipp),
  Ausstattung erklärt, Preis-Ampel/Marktwert und eine Kauf-Checkliste — jede Angabe mit Quelle.
- **Garantien erklärt** — Bei Unfall- oder Reparaturkosten-Risiko wird die passende
  BMW-Garantie als Lösung erklärt: BMW Premium Selection (24 Monate, 100 % Material + Arbeit,
  ohne Selbstbeteiligung) bzw. Anschlussgarantie — mit Quelle ([bmw.de](https://www.bmw.de/de/mehr-bmw/bmw-gebrauchte/garantie.html)).

### KI-Fahrzeug-Check mit Garantie-Hinweis

Ein Klick zeigt alle Besonderheiten des Fahrzeugs — jede mit Quelle — und erklärt bei
Reparaturkosten-Risiko die passende BMW-Garantie als Lösung. Genau diese Kombination aus
offener Information und konkreter Absicherung schafft Vertrauen.

<p align="center">
  <img src="presentation/fahrzeugcheck-garantie.png" alt="KI-Fahrzeug-Check mit Highlights und hervorgehobenem BMW-Garantie-Hinweis" width="600">
</p>

## Zwei Seiten, ein Assistent

- **Käufer-Seite** (Fahrzeugseite): Fahrzeug-Check mit Stärken/Mängeln & Quellen,
  Preis-Ampel, ehrlicher KI-Chat, Probefahrt-Anfrage.
- **Verkäufer-Cockpit** (Dashboard): Verkaufsargumente, Einwand-Behandlung,
  echte Kundenfragen + FAQ-Export, Probefahrt-Drehbuch, Flotten-Übersicht.

## Demo

### Käufer-Seite

Hier ist die Käufer-Seite — ▶ aufs Bild klicken zum Abspielen:

[![Käufer-Seite — Demo-Video](presentation/poster-kaeufer.png)](presentation/kaeufer-seite.mp4)

### Verkäufer-Seite

Hier ist die Verkäufer-Seite — ▶ aufs Bild klicken zum Abspielen:

[![Verkäufer-Seite — Demo-Video](presentation/poster-verkaeufer.png)](presentation/verkaeufer-seite.mp4)

## Schnellstart

```bash
npm install
npm run dev      # http://localhost:3000
```

Optional für Live-KI: `.env.example` nach `.env.local` kopieren und `ANTHROPIC_API_KEY`
eintragen. Ohne Key läuft alles im Demo-Modus.

**Verkäufer-Demo-Login:** `demo@carcheck.de` / `demo123` → `/dashboard`

```bash
npm run build        # Produktions-Build
npm run test:run     # Tests (Vitest) einmalig ausführen
npm run lint         # ESLint
```

## Architektur (Kurz)

- `app/` — Routen (App Router): `app/*/page.tsx` Seiten, `app/api/*/route.ts` HTTP-Handler.
- `components/` — React-Komponenten (Fahrzeug-Check, Chat, Dashboard, Charts …).
- `lib/cars/` — Domänenlogik: Regel-Engine, Anomalie-Erkennung, Preisrechner,
  Schaden-DB, Verkaufs-Intelligenz, BMW-Garantie-Hinweis.
- `lib/ai/` — Claude-Client + deterministische Demo-Fallbacks.
- `lib/auth/` — JWT-Login für Verkäufer.
- `data/cars.json` — Fahrzeug-Datensatz.

Details und Konventionen: siehe [`CLAUDE.md`](CLAUDE.md).
