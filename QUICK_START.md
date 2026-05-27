# ⚡ Quick Start - 3 Minuten bis zur Demo

## 1️⃣ API-Key holen (2 Min)

Gehe auf: https://console.anthropic.com/keys
- Registriere dich (kostenlos)
- Erstelle einen neuen API Key
- Kopiere ihn

## 2️⃣ .env erstellen (1 Min)

Erstelle eine Datei `.env` im Projekt-Root:

```env
ANTHROPIC_API_KEY=sk-ant-XXXXX-paste-your-key-here
PORT=5000
NODE_ENV=development
JWT_SECRET=dev-secret-change-in-production
```

## 3️⃣ Installieren & Starten (1 Min)

```bash
# Dependencies installieren
npm install

# Server starten
npm start
```

🎉 **Server läuft jetzt auf: http://localhost:5000**

---

## 👥 Was du jetzt testen kannst

### Käufer-Seite (Keine Auth)
1. Öffne http://localhost:5000
2. Klicke auf eines der 10 Beispiel-Autos
3. Klick: "🤖 KI-Analyse starten"
4. Siehe:
   - 🔴 Rote Flags (sofort!)
   - 🟠 Orange Warnings (sofort!)
   - 🧠 KI-Analyse (Claude denkt transparent vor...)

**Versuche diese:**
- **Car #1 (BMW)**: Normal, sollte grün sein
- **Car #3 (Mercedes)**: Unfallwagen mit Lackschaden
- **Car #4 (Audi)**: Motorschaden (gerade getauscht!)
- **Car #7 (Audi)**: Rosa Scheinwerfer = ILLEGAL
- **Car #10 (Porsche)**: Verdächtig billig für ein Porsche

### Verkäufer-Seite (mit Login)
1. Klick: "Verkäufer-Login"
2. Email: `demo@carcheck.de`
3. Password: `demo123`
4. Sehe:
   - 📊 Statistiken (wie viele Autos analysiert)
   - 🎓 Schulungs-Material (Fragen & Antworten)
   - 📥 FAQ-Pack zum Downloaden

---

## 🤖 Was die KI macht (Transparent)

Wenn du auf "KI-Analyse" klickst:

**Die Claude API wird mit folgendem Prompt aufgerufen:**

```
Du bist ein Gebrauchtwagen-Experte mit 15 Jahren Erfahrung.

DEINE AUFGABEN:
1. Erkläre jeden Wert des Autos
2. Vergleiche mit Standard-Werten (z.B. 12.000 km/Jahr)
3. Identifiziere Anomalien
4. Bei Unfallwagen: Berechne langfristige Folgen
5. Erstelle Reparaturplan für nächste 12 Monate
6. Top 5 Fragen für Käufer
7. Erkläre alles transparent, Schritt-für-Schritt
```

**Die KI antwortet dann:**
- 💭 Zeigt ihr Denken (transparent!)
- 🔍 Analysiert Lackschaden → Rost-Risiko
- 🔧 Plant Reparaturen: z.B. "Motorlager in 2-3 Jahren kaputt"
- ❓ Stellt Top 5 Fragen die Käufer fragen sollten

---

## 📊 Die 10 Beispiel-Autos

| # | Auto | Problem | Flags |
|---|------|---------|-------|
| 1 | BMW 118i | Keine | 🟢 Green |
| 2 | VW Golf | Hohes km | 🟠 Orange |
| 3 | Mercedes | Unfallschaden (Lack) | 🔴 Red |
| 4 | Audi A4 | Motor-Schaden | 🔴 Red |
| 5 | Opel Corsa | 6 Besitzer! | 🔴 Red |
| 6 | BMW 320i | 15 Jahre alt + 300k km | 🟠 Orange |
| 7 | Audi A6 | Rosa Scheinwerfer ⚠️ | 🔴 Red |
| 8 | Renault | Keine Service-History | 🟠 Orange |
| 9 | Skoda | Unfall + viele Besitzer | 🔴 Red |
| 10 | Porsche | Verdächtig billig | 🔴 Red |

---

## 🔧 Wenn etwas nicht funktioniert

### Error: "ANTHROPIC_API_KEY nicht gesetzt"
```bash
# Überprüfe .env Datei:
cat .env
# Sollte zeigen:
# ANTHROPIC_API_KEY=sk-ant-...
```

### Error: "Cannot GET /api/cars"
```bash
# Backend läuft nicht. Starte neu:
npm start
# Sollte zeigen:
# 🚗 Car AI Server running on http://localhost:5000
```

### Error: "CORS error" (beim Frontend)
Der Backend-Server läuft nicht oder auf anderer Port.
```bash
# Überprüfe:
curl http://localhost:5000/api/cars
# Sollte JSON-Liste mit 10 Autos zurückgeben
```

### API gibt 500 Error
Schaue in die Console wo `npm start` läuft.
Wahrscheinlich: API-Key ungültig oder Quote erreicht.

---

## 🚀 Nächste Schritte

### Lokal erweitern:
```bash
# Neue Autos hinzufügen:
nano 10-example-cars.json

# Server-Code ändern:
nano server.js

# Auto-Reload mit nodemon:
npm install -D nodemon
npm run dev
```

### Deployment:
```bash
# Mit Fly.io (kostenlos):
npm install -g flyctl
fly launch
fly secrets set ANTHROPIC_API_KEY="sk-ant-..."
fly deploy
```

### Testen in Production:
```bash
# Wenn deployed auf fly.io:
https://your-app.fly.dev
```

---

## 📞 Fragen?

- **Code-Fehler?** Schaue in den Terminal wo `npm start` läuft
- **API-Fehler?** Überprüfe `ANTHROPIC_API_KEY` in `.env`
- **UI-Bug?** Öffne Browser DevTools (F12)

---

**Ready? Los geht's!** 🎉

```bash
npm start
```

Dann öffne: **http://localhost:5000**
