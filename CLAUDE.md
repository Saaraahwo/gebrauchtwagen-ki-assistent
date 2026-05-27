# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start server (production mode)
npm start

# Start with auto-reload (requires nodemon)
npm run dev
```

The server runs on `http://localhost:5000` (configurable via `PORT` env var).

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `ANTHROPIC_API_KEY` — required for live Claude analysis (without it, the app runs in demo mode)
- `JWT_SECRET` — used for seller authentication tokens
- `PORT` — defaults to 5000
- `CORS_ORIGIN` — defaults to open CORS (`*`); set to your domain in production

**Important**: `server.js` does not use `dotenv`. The `.env` file is not auto-loaded. To load it, either export vars in your shell (`export $(cat .env | xargs)`) or install and require dotenv.

Seller demo account: `demo@carcheck.de` / `demo123`

## Architecture

Single-file backend (`server.js`) + single-file frontend (`public/index.html`). No build step.

**server.js** contains all backend logic in one file:
- **Rules Engine** (`runRulesEngine`) — synchronous, pattern-based analysis producing red/orange/green flags
- **Damage DB** (`SCHADEN_DB`) — research-backed database of 8 damage types (lack, heck, front, motor, struktur, getriebe, seite, glas) with short/mid/long-term consequences, inspection tips, costs, and value loss
- **Anomaly Detection** (`detectAuffaelligkeiten`) — detects contextual flags like laser headlights in AT/CH, emission zone risks, M-car track use suspicion, exchange engines, high repair-to-price ratio
- **Price Traffic Light** (`calcPreisAmpel`) — market value estimation based on model, age, km, accidents, owners
- **Demo Chat** (`generateDemoChatResponse`) — regex-pattern-based chat fallback when no API key is present, covers ~20 topic areas
- **Demo Analysis** (`generateDemoAnalysis`) — structured offline analysis fallback
- **Claude AI Service** (`analyzeCarWithClaude`) — calls `claude-sonnet-4-6` for full analysis; falls back to demo mode if API key missing or on error
- **Chat Endpoint** (`/api/cars/chat`) — multi-turn conversation using Claude with demo fallback; logs questions in-memory via `questionLog`
- **Question Log** — in-memory `{ carId: [{articleNr, question, answer, ts}] }` structure; article numbers use format `BMW-GW-001`

**Data flow for car analysis:**
1. Frontend sends car data to `POST /api/cars/analyze`
2. Server runs rules engine + anomaly detection + price calculation synchronously
3. Claude API called (or demo fallback) for AI narrative
4. All results returned in one response

**Frontend** (`public/index.html`) is a self-contained React app (loaded via CDN) with no build tooling. It handles buyer car selection/analysis view and seller login/dashboard.

**Car data** (`10-example-cars.json`) is loaded at startup and serves as the static dataset for all 10 example vehicles. Each car has: `name`, `price`, `km`, `yearBuilt`, `owners`, `maintenanceRecords`, `features`, `accidents` (array with `type`, `damage`, `damageKey`, `repairCost`, `date`), `color`, `enginePower`, `fuel`, `transmission`, `emission`, `consumption`, `featureGroups`, `polster`, `interiorColor`.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cars` | None | All 10 example cars |
| POST | `/api/cars/analyze` | None | Full analysis (rules + AI) |
| POST | `/api/cars/chat` | None | Multi-turn car Q&A |
| POST | `/api/cars/log-question` | None | Log a chat question |
| GET | `/api/cars/questions/:id` | None | Question history + FAQ for a car |
| POST | `/api/sellers/login` | None | JWT login |
| POST | `/api/sellers/logout` | None | Logout (stateless) |
| GET | `/api/sellers/dashboard` | JWT | Seller stats + training material |
| GET | `/api/sellers/faq-pack` | JWT | Download FAQ as `.txt` |

## Key Design Notes

- **Demo mode**: The app is fully functional without an API key — all AI responses are replaced by deterministic rule-based output. This makes the app demonstrable without cost.
- **In-memory state**: `questionLog` and seller data are lost on server restart. No database.
- **JWT**: 7-day expiry, verified via `verifyToken` middleware. Secret defaults to a hardcoded dev value when `JWT_SECRET` is not set.
- **Model used**: `claude-sonnet-4-6` for both analysis and chat endpoints.
- **Seller auth**: Password comparison is plain-text string comparison (the field name `passwordHash` is misleading — no hashing is done in the MVP).
- **Article numbers**: `articleNr()` always generates `BMW-GW-XXX` format regardless of the actual car brand.

## Deployment

```bash
# Docker
docker build -t car-ai .
docker run -e ANTHROPIC_API_KEY="sk-ant-..." -p 5000:5000 car-ai

# Fly.io
fly launch
fly secrets set ANTHROPIC_API_KEY="sk-ant-..."
fly deploy

# Heroku
heroku create your-app-name
heroku config:set ANTHROPIC_API_KEY="sk-ant-..."
git push heroku main
```

The Docker image uses the `HEALTHCHECK` on `GET /api/cars` every 30 seconds.
