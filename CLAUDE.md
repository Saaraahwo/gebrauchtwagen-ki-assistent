# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                 # install deps
npm run dev                 # start dev server on http://localhost:3000
npm run build               # production build
npm start                   # serve production build
npm test                    # vitest watch mode
npm run test:run            # vitest one-shot
npm run lint                # eslint
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:
- `ANTHROPIC_API_KEY` — required for live Claude analysis (without it, the app runs in demo mode)
- `JWT_SECRET` — used for seller authentication cookies
- `PORT` — defaults to 3000

Next.js loads `.env.local` automatically (no `dotenv` needed).

Seller demo account: `demo@carcheck.de` / `demo123`

## Architecture

Next.js App Router app with TypeScript and Tailwind. Server and client live in one repo.

**Directory layout:**
- `app/` — routes (App Router). `app/api/*/route.ts` are HTTP handlers, `app/*/page.tsx` are pages.
- `components/` — reusable React components (mix of server and `"use client"`).
- `lib/cars/` — domain logic: types, rules engine, damage DB, anomaly detection, price calculator.
- `lib/ai/` — Claude client + demo fallbacks for analysis and chat.
- `lib/auth/` — JWT helpers, seller store, `require-seller` middleware.
- `lib/questions/` — in-memory question log.
- `data/cars.json` — static car dataset (10 cars).

**Data flow:**
- Server components (e.g., `app/page.tsx`) read `data/cars.json` directly.
- Client components (`AnalysisPanel`, `ChatWidget`) POST to route handlers in `app/api/cars/*`.
- Route handlers are thin: parse → call `lib/*` → return JSON.
- Claude calls live in `lib/ai/*` and always fall back to deterministic demo functions if `ANTHROPIC_API_KEY` is missing or the call errors.

## Key Design Notes

- **Demo mode**: Fully functional without an API key. `lib/ai/claude-client.ts` exports `hasApiKey`; every Claude call checks it and falls back to `generateDemoAnalysis` / `generateDemoChatResponse`.
- **Auth**: JWT in an HTTP-only cookie `seller_token`. `lib/auth/require-seller.ts` provides `requireSellerFromRequest()` for route handlers and `getSellerFromCookies()` for server components.
- **Plain-text demo password**: `sellers.passwordHash` is misleadingly named — it's a placeholder. Login compares against the literal `'demo123'` in `lib/auth/sellers.ts`. Intentional for MVP demos.
- **Question log persistence**: `lib/questions/log.ts` stores the chat question log in `data/questions.db` via **sql.js** (WASM SQLite — no native build toolchain). WASM init uses top-level await so the exported functions stay synchronous. Tests use an in-memory DB (`VITEST`). `sql.js` is in `serverExternalPackages` (next.config). The DB file is gitignored.
- **In-memory state**: Seller data is still in-memory and resets on restart (no DB).
- **Article numbers**: `articleNr()` always generates `BMW-GW-XXX` regardless of brand.
- **Model**: `claude-sonnet-4-6` for both analysis and chat (`lib/ai/claude-client.ts`).

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/cars` | None | All 10 cars |
| POST | `/api/cars/analyze` | None | Full analysis (rules + anomalies + price + AI) |
| POST | `/api/cars/chat` | None | Multi-turn car Q&A |
| POST | `/api/cars/log-question` | None | Log a chat question |
| GET | `/api/cars/questions/[id]` | None | Question history + FAQ |
| POST | `/api/sellers/login` | None | Sets `seller_token` cookie |
| POST | `/api/sellers/logout` | None | Clears cookie |
| GET | `/api/sellers/dashboard` | Cookie | Seller stats + training material |
| GET | `/api/sellers/faq-pack` | Cookie | FAQ as `.txt` download |

## Testing

Vitest. Unit tests for `lib/cars/*` (rules engine, damage DB, anomaly detection, price calculator) and `lib/ai/*` (demo analysis, demo chat). Run with `npm test` or `npm run test:run`.

## Deployment

```bash
# Docker
docker build -t car-ai .
docker run -e ANTHROPIC_API_KEY="sk-ant-..." -p 3000:3000 car-ai

# Fly.io
fly launch
fly secrets set ANTHROPIC_API_KEY="sk-ant-..."
fly deploy
```

Health check: `GET /api/cars`.
