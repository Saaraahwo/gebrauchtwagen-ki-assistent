# Gebrauchtwagen KI-Kaufassistent

Ein KI-gestützter Kaufassistent für gebrauchte BMW — als Fallstudie im OEM-Kontext.
Leitidee: **Transparenz, die verkauft.** Der Assistent zeigt Käufern offen auch die
Schwächen eines Fahrzeugs (mit Quelle) und gibt Verkäufern ein fertiges Verkaufs-Briefing.
Jede Aussage ist regelbasiert hergeleitet und mit einer Quelle belegt — keine Halluzination.

Next.js (App Router) · TypeScript · Tailwind · Vitest. Läuft vollständig im **Demo-Modus**
ohne API-Key (deterministische Fallbacks); mit `ANTHROPIC_API_KEY` werden die Analyse- und
Chat-Antworten live von Claude erzeugt.

## Zwei Seiten, ein Assistent

- **Käufer-Seite** (Fahrzeugseite): Fahrzeug-Check mit Stärken/Mängeln & Quellen,
  Preis-Ampel, ehrlicher KI-Chat, Probefahrt-Anfrage.
- **Verkäufer-Cockpit** (Dashboard): Verkaufsargumente, Einwand-Behandlung,
  echte Kundenfragen + FAQ-Export, Probefahrt-Drehbuch, Flotten-Übersicht.

## Schnellstart

```bash
npm install
npm run dev      # http://localhost:3000
```

Optional für Live-KI: `.env.example` nach `.env.local` kopieren und `ANTHROPIC_API_KEY`
eintragen. Ohne Key läuft alles im Demo-Modus.

**Verkäufer-Demo-Login:** `demo@carcheck.de` / `demo123` → `/dashboard`

### Weitere Befehle

```bash
npm run build        # Produktions-Build
npm run test:run     # Tests (Vitest) einmalig ausführen
npm run lint         # ESLint
```

## Präsentation

Im Ordner [`presentation/`](presentation/) liegt die Konzept-Präsentation:

- **[`presentation/index.html`](presentation/index.html)** — Übersichtsseite mit den
  beiden Demo-Videos (Käufer-Seite & Verkäufer-Seite) und Link zum Foliendeck.
- **[`presentation/part2-app-concept.html`](presentation/part2-app-concept.html)** —
  das Foliendeck (Pfeiltasten blättern, `N` = Notizen, `F` = Vollbild, `P` = PDF).
- **`presentation/*.mp4`** — Bildschirmaufnahmen der Käufer- und Verkäufer-Seite
  (per **Git LFS** versioniert — `git lfs install` vor dem Klonen ausführen).

> Hinweis: Die Videos werden über Git LFS gespeichert. Nach dem Klonen ggf.
> `git lfs pull` ausführen, damit die `.mp4`-Dateien vollständig geladen werden.

## Architektur (Kurz)

- `app/` — Routen (App Router): `app/*/page.tsx` Seiten, `app/api/*/route.ts` HTTP-Handler.
- `components/` — React-Komponenten (Fahrzeug-Check, Chat, Dashboard, Charts …).
- `lib/cars/` — Domänenlogik: Regel-Engine, Anomalie-Erkennung, Preisrechner,
  Schaden-DB, Verkaufs-Intelligenz, BMW-Garantie-Hinweis.
- `lib/ai/` — Claude-Client + deterministische Demo-Fallbacks.
- `lib/auth/` — JWT-Login für Verkäufer.
- `data/cars.json` — Fahrzeug-Datensatz.

Details und Konventionen: siehe [`CLAUDE.md`](CLAUDE.md).
