# Next.js Migration Design

**Date:** 2026-05-27
**Status:** Draft — awaiting user review

## Goal

Migrate the Gebrauchtwagen KI-Assistent MVP from its current single-file architecture (Express `server.js` + CDN React `public/index.html`) to a Next.js App Router project with a clean module structure. Server and client live in one codebase.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Type-safe car data schema, typed API responses, better IDE support |
| State persistence | Keep in-memory | Still an MVP; no real users; adding a DB is a separate decision |
| Routing | App Router | Default for new Next.js projects; better data-fetching patterns; where Next.js is headed |
| Styling | Tailwind CSS | Cleaner colocation with JSX; easier long-term maintenance |
| Auth | Custom JWT (ported from current) | One demo seller account; NextAuth would be overkill |

## Module structure

```
app/                          # Next.js App Router (routes + UI)
  api/cars/route.ts                       # GET /api/cars
  api/cars/analyze/route.ts               # POST /api/cars/analyze
  api/cars/chat/route.ts                  # POST /api/cars/chat
  api/cars/log-question/route.ts          # POST /api/cars/log-question
  api/cars/questions/[id]/route.ts        # GET /api/cars/questions/:id
  api/sellers/login/route.ts              # POST /api/sellers/login
  api/sellers/logout/route.ts             # POST /api/sellers/logout
  api/sellers/dashboard/route.ts          # GET /api/sellers/dashboard (auth)
  api/sellers/faq-pack/route.ts           # GET /api/sellers/faq-pack (auth)
  (buyer)/page.tsx                        # Buyer car grid + filters
  (buyer)/cars/[id]/page.tsx              # Car detail
  (seller)/login/page.tsx                 # Seller login form
  (seller)/dashboard/page.tsx             # Seller dashboard (auth)
  layout.tsx                              # Root layout
  globals.css                             # Tailwind directives + a few custom tokens
  error.tsx                               # Global error boundary

components/                   # Reusable UI components
  Header.tsx
  Breadcrumb.tsx
  FilterSidebar.tsx
  CarGrid.tsx
  CarCard.tsx
  CarDetail.tsx
  AnalysisPanel.tsx
  ChatWidget.tsx
  SellerLogin.tsx
  SellerDashboard.tsx

lib/
  cars/
    types.ts                              # Car, Finding, Accident, etc.
    rules-engine.ts                       # runRulesEngine
    damage-db.ts                          # SCHADEN_DB, getSchadenFolgen, detectDamageKey
    anomaly-detection.ts                  # detectAuffaelligkeiten
    price-calculator.ts                   # calcPreisAmpel
  ai/
    claude-client.ts                      # Singleton Anthropic client + hasApiKey
    analysis.ts                           # analyzeCarWithClaude (with demo fallback)
    chat.ts                               # chatWithClaude (with demo fallback)
    demo-analysis.ts                      # generateDemoAnalysis
    demo-chat.ts                          # generateDemoChatResponse
  auth/
    jwt.ts                                # sign + verify
    sellers.ts                            # In-memory sellers store
    require-seller.ts                     # Helper for protected route handlers
  questions/
    log.ts                                # questionLog + articleNr

data/
  cars.json                               # Moved from 10-example-cars.json
```

**Why domain-grouped lib:** Each `lib/*` folder reads like a small library you could lift out. Route handlers stay thin (parse request → call lib → return JSON). Types live with the code that owns them.

## Data flow

Three execution contexts, each with a clear job:

**Server Components** (default, no JS shipped to browser):
- `app/(buyer)/page.tsx` reads `data/cars.json` directly — no API call for initial render
- `app/(buyer)/cars/[id]/page.tsx` server-renders the detail shell
- `app/(seller)/dashboard/page.tsx` reads the JWT cookie via `cookies()` from `next/headers`, verifies it, redirects to `/login` if invalid

**Client Components** (`"use client"`):
- `FilterSidebar` — local filter state
- `AnalysisPanel` — POSTs to `/api/cars/analyze`
- `ChatWidget` — POSTs to `/api/cars/chat`, manages message history
- `SellerDashboard` — interactive parts of the dashboard

**Route Handlers** (`app/api/*/route.ts`):
- Port of the existing Express endpoints, 1:1
- Import from `lib/*`, return `NextResponse.json(...)`
- Only place that calls Claude (server-side; `ANTHROPIC_API_KEY` never reaches the browser)

**Key principle:** The rules engine, damage DB, and AI calls run only on the server. The client never imports `lib/cars/rules-engine.ts` directly.

### Concrete buyer flow

1. User visits `/` — server component reads `cars.json`, returns rendered HTML
2. User clicks a car — client navigates to `/cars/[id]`
3. Detail page renders synchronously; "Analyze" button is in a client component
4. Click triggers `fetch('/api/cars/analyze', { method: 'POST', body: carData })`
5. Route handler runs rules engine + anomaly detection + price + Claude call, returns JSON
6. Client component renders findings

## Demo mode fallback

The most important behavior to preserve: the app must work fully without an `ANTHROPIC_API_KEY`. Every Claude call must fall back to a deterministic demo function.

```typescript
// lib/ai/claude-client.ts
export const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
export const client = hasApiKey ? new Anthropic() : null;

// lib/ai/analysis.ts
export async function analyzeCarWithClaude(car: Car, findings: Findings) {
  if (!client) return generateDemoAnalysis(car, findings);
  try {
    const response = await client.messages.create({ ... });
    return parseAnalysis(response);
  } catch (err) {
    console.error('Claude API error, falling back to demo:', err);
    return generateDemoAnalysis(car, findings);
  }
}
```

**Two principles:**

1. **Demo fallback is the contract, not an exception path.** Demo functions return the same shape as the real Claude response. Route handlers don't know which one ran.
2. **Fail open.** If Claude errors mid-request, return demo content rather than a 500. Log the error server-side.

## Authentication

### Token storage: HTTP-only cookie (changed from localStorage)

`localStorage` is awkward in Next.js because server components can't read it. Storing the JWT in an HTTP-only cookie works on both server and client and is safer against XSS.

```typescript
// app/api/sellers/login/route.ts
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  const seller = sellers[email];
  if (!seller || password !== 'demo123') {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const token = signToken({ id: seller.id, email });
  const res = NextResponse.json({ ok: true, name: seller.name });
  res.cookies.set('seller_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return res;
}
```

Logout clears the cookie.

### Verification: per-route helper

```typescript
// lib/auth/require-seller.ts
export async function requireSeller(req: NextRequest) {
  const token = req.cookies.get('seller_token')?.value;
  if (!token) throw new AuthError('No token');
  try {
    return jwt.verify(token, JWT_SECRET) as SellerPayload;
  } catch {
    throw new AuthError('Invalid token');
  }
}
```

Server components verify the cookie via `cookies()` from `next/headers` and `redirect()` on failure.

### Preserved MVP behaviors

- Password comparison is still plain-text against the literal string `'demo123'` (the field is misleadingly named `passwordHash`). **Do not upgrade to bcrypt during this migration** — it would break the demo. Document as MVP-only.
- JWT secret defaults to a hardcoded dev value if `JWT_SECRET` is unset.
- 7-day token expiry.

## Error handling

**Route handler boundary** — validate input, map errors to HTTP status codes:

```typescript
export async function POST(req: NextRequest) {
  let car: Car;
  try { car = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!car?.name || typeof car.price !== 'number') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  const result = await analyzeCar(car);
  return NextResponse.json(result);
}
```

Lightweight validation only. No Zod schemas yet — this is an MVP, not a public API.

**Claude calls** — fail open (see demo mode section).

**UI boundary** — a single global `app/error.tsx`:

```typescript
'use client';
export default function Error({ error, reset }) {
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold">Etwas ist schiefgelaufen</h2>
      <button onClick={reset} className="mt-4 ...">Neu versuchen</button>
    </div>
  );
}
```

Client components that call `fetch` handle their own errors locally.

**Deliberately skipped:** Sentry, retry logic, global toast system, request-level logging beyond `console.error`.

## Testing

Vitest. Test what pays back; skip what doesn't.

**Unit tests for `lib/cars/*`** (~30–50 tests) — pure functions with clear inputs/outputs. Locks the domain behavior the AI prompt depends on.

**Smoke tests for route handlers** (~5–8 tests) — one per endpoint. Calls the handler with a mocked `NextRequest`, asserts shape of response. Catches wiring bugs.

**Demo-mode parity test** — one assertion that demo response shape matches real Claude response shape. Catches the bug where someone changes the prompt parser but forgets the demo fallback.

**Skipped:** E2E tests (Playwright), component snapshots, Claude API mocking, coverage thresholds.

**Commands:**
```bash
npm test           # Vitest watch
npm run test:run   # CI / one-shot
```

## Migration sequencing

Single branch `nextjs-migration`. Delete old files when their replacements are ready.

### Phase 1 — Scaffold
1. Branch `nextjs-migration`
2. Delete `server.js`, `public/`, `10-example-cars.json` (root); move car JSON to `data/cars.json`
3. Init Next.js: TypeScript + Tailwind + App Router (`npx create-next-app@latest`)
4. Add deps: `jsonwebtoken`, `@anthropic-ai/sdk`, `@types/jsonwebtoken`, `vitest`, `@types/node`
5. Verify: `npm run build` on empty scaffold succeeds

### Phase 2 — Port `lib/` with tests
6. `lib/cars/types.ts`
7. `lib/cars/rules-engine.ts` + tests
8. `lib/cars/damage-db.ts` + `detectDamageKey` + tests
9. `lib/cars/anomaly-detection.ts` + tests
10. `lib/cars/price-calculator.ts` + tests
11. `lib/ai/demo-analysis.ts` + `lib/ai/demo-chat.ts`
12. `lib/ai/claude-client.ts` + `lib/ai/analysis.ts` + `lib/ai/chat.ts`
13. `lib/auth/jwt.ts` + `lib/auth/sellers.ts` + `lib/auth/require-seller.ts`
14. `lib/questions/log.ts`

**Checkpoint:** `npm test` green.

### Phase 3 — Route handlers
15. All `app/api/*/route.ts` files (thin wrappers calling `lib/*`)

**Checkpoint:** `curl http://localhost:3000/api/cars` works; curl-check each endpoint.

### Phase 4 — UI
16. `app/layout.tsx`, `app/globals.css`, Tailwind config (BMW blue `#1c69d4`, dark `#1c1c1c` as custom colors)
17. Split `index.html` JSX into `components/` (per list above)
18. Convert inline CSS to Tailwind, component by component
19. `app/(buyer)/page.tsx`, `app/(buyer)/cars/[id]/page.tsx`
20. `app/(seller)/login/page.tsx`, `app/(seller)/dashboard/page.tsx`
21. `app/error.tsx`

**Checkpoint:** Every buyer + seller flow works in the browser; visually matches the old app.

### Phase 5 — Cleanup
22. Update `Dockerfile` (multi-stage Next.js build, healthcheck on `/api/cars`)
23. Update `package.json` scripts (`dev` = `next dev`, `start` = `next start`, `build` = `next build`, `test` = `vitest`)
24. Update `CLAUDE.md` for the new structure
25. Merge to `master`

### Verification at each checkpoint

- After Phase 2: `npm test` green
- After Phase 3: every endpoint returns expected JSON via curl
- After Phase 4: every buyer + seller flow works in browser
- Before merge: `npm run build` succeeds, all tests pass, Docker image builds and serves

### Estimated scope

- Phase 1–2: ~1 session (mechanical port + tests)
- Phase 3: ~1 session (route handlers are thin wrappers)
- Phase 4: ~2–3 sessions (styling rewrite is the biggest chunk)
- Phase 5: ~½ session (cleanup)

## What this migration does NOT change

- The 10 example cars and their data shape (`name`, `price`, `km`, `yearBuilt`, `owners`, `maintenanceRecords`, `features`, `accidents`, etc.)
- The rules engine logic (red/orange/green flags)
- The damage database content
- The Claude prompt (analysis + chat)
- The demo seller credentials (`demo@carcheck.de` / `demo123`)
- The plain-text password comparison (MVP-only, intentionally preserved)
- The in-memory state (`questionLog`, sellers)
- The `BMW-GW-XXX` article number format
- The model used (`claude-sonnet-4-6`)

## Open questions

None. All design questions resolved during brainstorming.
