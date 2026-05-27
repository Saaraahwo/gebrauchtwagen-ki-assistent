# 🚗 Gebrauchtwagen KI-Assistent - MVP Prototyp

Ein intelligentes System für transparente Gebrauchtwagen-Analysen mit KI-powered Transparenz und Verkäufer-Schulung.

## Features ✨

### Für Käufer 👥
- **Sofort-Findings**: Regel-basierte Analyse (Rote/Orange/Grüne Flags)
  - Zu viele Besitzer
  - Fehlende Wartungshistorie
  - Hoher Kilometerstand
  - Unfallschäden
  - Illegale Modifikationen
  - Verdächtig niedriger Preis

- **KI-Analyse (Claude)**: Transparente, Schritt-für-Schritt Analyse
  - Vergleicht Werte mit Internet-Standards
  - Erklärt Anomalien
  - Erstellt Reparaturplan
  - Top 5 Fragen für Käufer
  - Langzeitfolgen bei Unfällen

### Für Verkäufer 🏪
- **Login & Authentifizierung** (JWT)
- **Schulungs-Dashboard** mit:
  - Häufige Käufer-Fragen pro Auto-Typ
  - Best Practice Antworten
  - Tipps für schwierige Fragen
  - Analytics: Wie viele Autos analysiert, häufige Anomalien

- **FAQ-Pack Download**
  - Standardfragen & Antworten
  - Trainingsmaterial
  - Gesprächsleitfaden

### 10 Beispiel-Autos 🚙
1. BMW 118i - Gut gepflegt (Normal case)
2. VW Golf - Hohes Kilometerstand
3. Mercedes A-Klasse - Lackschaden
4. Audi A4 - Motorschaden (Motorwechsel)
5. Opel Corsa - Zu viele Besitzer
6. BMW 320i - Sehr alt & viele km
7. Audi A6 - Rosa Scheinwerfer (Illegal!)
8. Renault Clio - Keine Wartungshistorie
9. Skoda Octavia - Mehrere Probleme (Unfallwagen + viele Besitzer)
10. Porsche Cayman - Verdächtig billig

## Quick Start 🚀

### Voraussetzungen
- Node.js 18+
- npm
- Anthropic API Key (kostenlos testen auf https://console.anthropic.com)

### Installation

```bash
# 1. In das Projekt-Verzeichnis gehen
cd Unternehmensethik

# 2. Dependencies installieren
npm install

# 3. Environment-Datei erstellen
cp .env.example .env
# Bearbeite .env und füge deine ANTHROPIC_API_KEY ein

# 4. Server starten
npm start
# Oder mit Autoreload (benötigt nodemon):
npm run dev
```

### Lokales Testen
```bash
# Backend läuft auf: http://localhost:5000
# Frontend öffnen: http://localhost:5000

# Teste die API direkt:
curl http://localhost:5000/api/cars
```

## API Endpoints 🔌

### Öffentlich (Keine Auth)
```
GET /api/cars
  → Gibt alle 10 Beispiel-Autos zurück

POST /api/cars/analyze
  Body: { name, price, km, yearBuilt, owners, maintenanceRecords, features, accidents, ... }
  → Führt Sofort-Findings + KI-Analyse durch
```

### Verkäufer (mit JWT Token)
```
POST /api/sellers/login
  Body: { email, password }
  Demo: email: demo@carcheck.de, password: demo123
  → Gibt JWT Token zurück

GET /api/sellers/dashboard
  Header: Authorization: Bearer {token}
  → Dashboard-Daten mit Statistiken & Training-Material

GET /api/sellers/faq-pack
  Header: Authorization: Bearer {token}
  → FAQ-Pack als TXT Download
```

## Datenfluss 📊

```
Käufer wählt Auto
    ↓
Frontend sendet Auto-Daten an Backend
    ↓
Sofort-Findings: Regeln-Engine prüft lokal
    ↓
KI-Analyse: Claude API wird async aufgerufen
    ↓
Frontend zeigt:
  - Rote/Orange/Grüne Flags sofort
  - KI-Analyse wenn fertig
  - Transparente "Gedanken" der KI
```

## Architektur 🏗️

```
Frontend (React)
    ↓
Express Backend (Node.js)
    ├── Auth Service (JWT)
    ├── Rules Engine (Instant)
    ├── Car Analysis Service
    └── Claude AI Service
        ↓
    Anthropic API (Claude)
```

## Wichtige Dateien 📁

```
server.js                  → Express Backend, alle APIs
public/index.html         → React Frontend (alles in einer Datei)
10-example-cars.json      → 10 Beispiel-Autos mit Daten
package.json              → Dependencies
.env                      → Secrets (ANTHROPIC_API_KEY, JWT_SECRET)
```

## Seller Demo-Account 🔐

```
Email:    demo@carcheck.de
Password: demo123
```

Ändere das in production!

## Deployment 🚀

### Option 1: Fly.io (Einfach)
```bash
# Install Fly CLI: https://fly.io/docs/getting-started/installing-flyctl/

fly launch
fly secrets set ANTHROPIC_API_KEY="sk-ant-..."
fly deploy
```

### Option 2: Heroku
```bash
heroku create your-app-name
heroku config:set ANTHROPIC_API_KEY="sk-ant-..."
git push heroku main
```

### Option 3: Docker
```bash
docker build -t car-ai .
docker run -e ANTHROPIC_API_KEY="sk-ant-..." -p 5000:5000 car-ai
```

## Nächste Schritte 📈

### MVP (Jetzt) ✅
- [x] 10 Beispiel-Autos
- [x] Sofort-Findings (Regeln)
- [x] Claude KI-Integration
- [x] Seller-Login & Dashboard
- [x] FAQ-Pack

### Phase 2 (Optional)
- [ ] Datenbank (PostgreSQL statt In-Memory)
- [ ] Seller können eigene Autos hochladen
- [ ] Fotos/Bilder des Autos analysieren
- [ ] Export als PDF-Report
- [ ] Analytics-Dashboard
- [ ] Mobile App

### Phase 3 (Enterprise)
- [ ] Multi-Language Support
- [ ] TÜV/Inspektions-Integration
- [ ] Versicherungs-Partnerschaften
- [ ] Finanzierungsoptionen
- [ ] Blockchain für Fahrzeughistorie

## Fehlerbehebung 🔧

### "ANTHROPIC_API_KEY nicht gesetzt"
Stelle sicher, dass `.env` existiert und die API-Key richtig ist.

### "CORS Error"
Der Frontend versucht, den Backend zu erreichen. Stelle sicher:
- Backend läuft auf `http://localhost:5000`
- Frontend macht Requests an `http://localhost:5000`

### "JWT Token expired"
Seller muss sich erneut anmelden. Token ist 7 Tage gültig.

## Sicherheit ⚠️

**Für MVP (Dev):**
- JWT_SECRET ist hart codiert (OK für Demo)
- Passwort ist nicht gehashed (OK für Demo)
- CORS ist offen (OK für Localhost)

**Für Production:**
- Ändere `JWT_SECRET` in `.env`
- Verwende bcrypt für Passwort-Hashing
- Setze CORS_ORIGIN auf deine Domain
- Verwende HTTPS
- Rate-Limiting für API
- Input Validation

## Support & Kontakt 💬

Bei Fragen oder Bugs:
- Öffne ein GitHub Issue
- Kontaktiere: christinwoh@gmail.com

## Lizenz 📜

MIT - Frei verwendbar für kommerzielle & private Projekte

---

**Viel Erfolg mit dem Prototyp! 🎉**

Fragen? Schaue in den Code - ist auskommentiert und verständlich.
