# Transparenz & Daten — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Communicate the value proposition factually, show the basis of every chat/analysis answer, and make data storage transparent (notice + booking consent + `/datenschutz` page + seller-side deletion).

**Architecture:** A pure `lib/ai/chat-basis.ts` classifies each question into a basis label; `chat.ts`/the chat route carry `basis` through to the `ChatWidget`. New presentational pieces (`ValueProp`, `Footer`, `/datenschutz`) and a consent checkbox in `TestDriveModal`. Production-safe `clearQuestions()`/`clearBookings()` back an auth-gated `DELETE /api/sellers/data` driven by a dashboard button.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, Vitest, sql.js.

**Spec:** `docs/superpowers/specs/2026-06-02-transparenz-und-daten-design.md`. Slices 1–3 already shipped.

**Conventions:**
- No `Co-Authored-By` trailer. **Wording:** plain facts, describe the mechanism — never "wir sind transparent"/"Risiko".
- Windows + OneDrive: if `npm run build` fails with `EPERM` on `.next`, run `taskkill //F //IM node.exe`, `rm -rf .next`, rebuild.

---

### Task 1: basisForMessage classifier

**Files:** Create `lib/ai/chat-basis.ts`, `lib/ai/chat-basis.test.ts`.

- [ ] **Step 1: Write the failing tests** — `lib/ai/chat-basis.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { basisForMessage } from './chat-basis';

describe('basisForMessage', () => {
  it('price/negotiation → Marktvergleich', () => {
    expect(basisForMessage('Ist der Preis verhandelbar?')).toBe('Marktvergleich & Kostenschätzung');
  });
  it('running costs → Kostenschätzung', () => {
    expect(basisForMessage('Welche Jahreskosten kommen auf mich zu?')).toBe('Kostenschätzung');
  });
  it('"Was ist X" → Wissensdatenbank', () => {
    expect(basisForMessage('Was ist das M Sportpaket?')).toBe('Wissensdatenbank');
  });
  it('accident/damage → Schadens-Datenbank', () => {
    expect(basisForMessage('Ist der Unfall schlimm?')).toBe('Schadens-Datenbank & Fahrzeugdaten');
  });
  it('default → Fahrzeugdaten & Prüf-Erfahrung', () => {
    expect(basisForMessage('Wie ist der Motor?')).toBe('Fahrzeugdaten & Prüf-Erfahrung');
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

Run: `npm run test:run -- lib/ai/chat-basis` → expect "Cannot find module './chat-basis'".

- [ ] **Step 3: Implement `lib/ai/chat-basis.ts`**
```typescript
/** Deterministic label for the source a chat answer is grounded in. First match wins. */
export function basisForMessage(message: string): string {
  const m = message.toLowerCase();
  if (/preis|\bwert\b|markt|verhandl|rabatt|teuer|günstig|nachlass|angebot/.test(m)) return 'Marktvergleich & Kostenschätzung';
  if (/kost|unterhalt|jahreskosten|verbrauch/.test(m)) return 'Kostenschätzung';
  if (/was ist|was bedeutet|was hei(ß|ss)t|erklär|wofür|wozu/.test(m)) return 'Wissensdatenbank';
  if (/unfall|schaden|reparatur|lack|umlackier/.test(m)) return 'Schadens-Datenbank & Fahrzeugdaten';
  return 'Fahrzeugdaten & Prüf-Erfahrung';
}
```

- [ ] **Step 4: Run, confirm PASS**

Run: `npm run test:run -- lib/ai/chat-basis` → expect 5 green.

- [ ] **Step 5: Commit**
```bash
git add lib/ai/chat-basis.ts lib/ai/chat-basis.test.ts
git commit -m "Add basisForMessage: deterministic answer-basis classifier"
```

---

### Task 2: Carry `basis` through chat.ts and the chat route

**Files:** Modify `lib/ai/chat.ts`, `app/api/cars/chat/route.ts`.

- [ ] **Step 1: Update `lib/ai/chat.ts`**
- Add the import:
```typescript
import { basisForMessage } from './chat-basis';
```
- Change `ChatResult`:
```typescript
export interface ChatResult {
  reply: string;
  model: string;
  basis: string;
}
```
- Update the three return statements in `chatWithClaude`:
  - equipment branch:
```typescript
    return { reply: `**${equipment.term}**\n\n${equipment.answer}`, model: 'wissensdatenbank', basis: 'Wissensdatenbank' };
```
  - no-key demo branch:
```typescript
    return {
      reply: generateDemoChatResponse(carData, messages, userMessage),
      model: 'demo-mode',
      basis: basisForMessage(userMessage),
    };
```
  - live-Claude success branch:
```typescript
    return { reply, model: CLAUDE_MODEL, basis: 'KI-Modell' };
```
  - catch (API-Fehler) branch:
```typescript
    return {
      reply: generateDemoChatResponse(carData, messages, userMessage),
      model: 'demo-mode (API Fehler)',
      basis: basisForMessage(userMessage),
    };
```

- [ ] **Step 2: Update `app/api/cars/chat/route.ts`**
Change the call + response:
```typescript
  const { reply, model, basis } = await chatWithClaude(carData, messages, message);
  if (carData.id) logQuestion(carData.id, carData.name, message, reply);
  return NextResponse.json({ reply, model, basis });
```

- [ ] **Step 3: Typecheck + smoke-test**
```bash
npx tsc --noEmit && echo "tsc OK"
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
curl -s -X POST http://localhost:3000/api/cars/chat -H 'Content-Type: application/json' -d '{"carData":{"id":1,"name":"BMW 118i","price":16900,"km":47800,"yearBuilt":2019,"owners":1,"maintenanceRecords":10,"features":[],"accidents":[]},"message":"Ist der Preis verhandelbar?"}' | grep -o '"basis":"[^"]*"\|"model":"[^"]*"'
taskkill //F //IM node.exe 2>/dev/null | head -1
```
Expected: tsc OK; build 0; the response contains `"model":"demo-mode"` and `"basis":"Marktvergleich & Kostenschätzung"`.

- [ ] **Step 4: Commit**
```bash
git add lib/ai/chat.ts app/api/cars/chat/route.ts
git commit -m "chat: return and expose the answer basis"
```

---

### Task 3: ChatWidget — show basis/model, storage notice, header echo

**Files:** Modify `components/ChatWidget.tsx`.

- [ ] **Step 1: Extend the message type and send()**
- Change the `ChatMessage` interface:
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  basis?: string;
  model?: string;
}
```
- In `send()`, change the success push to carry basis/model:
```typescript
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.reply, basis: data.basis, model: data.model }]);
```

- [ ] **Step 2: Header echo**
Change the header `<h3>` line:
```tsx
            <h3 className="text-sm font-bold">💬 Fragen zum Fahrzeug</h3>
```
to:
```tsx
            <div>
              <h3 className="text-sm font-bold">💬 Fragen zum Fahrzeug</h3>
              <p className="text-[10px] text-white/80 mt-0.5">Antworten regelbasiert — mit Grundlage.</p>
            </div>
```

- [ ] **Step 3: Render basis/model under each assistant answer**
Change the assistant bubble block:
```tsx
              <div key={i} className={m.role === 'user' ? 'self-end' : 'self-start max-w-[88%]'}>
                <div className={
                  m.role === 'user'
                    ? 'bg-bmw-blue text-white rounded-[14px_14px_2px_14px] px-3 py-2 text-xs max-w-[85%]'
                    : 'bg-white border border-gray-200 rounded-[2px_14px_14px_14px] px-3 py-2 text-xs shadow-sm leading-relaxed'
                }>
                  {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                </div>
              </div>
```
to:
```tsx
              <div key={i} className={m.role === 'user' ? 'self-end' : 'self-start max-w-[88%]'}>
                <div className={
                  m.role === 'user'
                    ? 'bg-bmw-blue text-white rounded-[14px_14px_2px_14px] px-3 py-2 text-xs max-w-[85%]'
                    : 'bg-white border border-gray-200 rounded-[2px_14px_14px_14px] px-3 py-2 text-xs shadow-sm leading-relaxed'
                }>
                  {m.role === 'assistant' ? renderMarkdown(m.content) : m.content}
                </div>
                {m.role === 'assistant' && m.basis && (
                  <p className="text-[9px] text-bmw-gray-muted mt-0.5 pl-1">Grundlage: {m.basis}{m.model ? ` · Quelle: ${m.model}` : ''}</p>
                )}
              </div>
```

- [ ] **Step 4: Storage notice under the input**
Change the input `<form>` block — wrap it so a notice line sits below it. Replace:
```tsx
          {/* Input */}
          <form onSubmit={send} className="border-t border-bmw-gray-border p-2 flex gap-2 bg-white flex-shrink-0">
```
with:
```tsx
          {/* Input */}
          <div className="border-t border-bmw-gray-border bg-white flex-shrink-0">
          <form onSubmit={send} className="p-2 flex gap-2">
```
and AFTER the closing `</form>` (which is followed by `</div>` for the popup), insert the notice + an extra closing `</div>`:
```tsx
          </form>
          <p className="px-3 pb-2 text-[9px] text-bmw-gray-muted">
            Ihre Fragen werden gespeichert, um Antworten zu verbessern. Details: <a href="/datenschutz" className="text-bmw-blue underline">Datenschutz</a>.
          </p>
          </div>
```
(Net: the `<form>` is now wrapped in a `<div>` that also contains the notice; ensure the wrapping `<div>` is closed.)

- [ ] **Step 5: Build + smoke-test**
```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
curl -s http://localhost:3000/cars/1 | grep -o "Antworten regelbasiert\|Ihre Fragen werden gespeichert" | sort -u
taskkill //F //IM node.exe 2>/dev/null | head -1
```
Expected: build 0; both strings present in the detail page HTML (the ChatWidget renders within it).

- [ ] **Step 6: Commit**
```bash
git add components/ChatWidget.tsx
git commit -m "ChatWidget: show answer basis/source, storage notice, factual header line"
```

---

### Task 4: Fahrzeug-Check basis line

**Files:** Modify `components/AnalysisPanel.tsx`.

- [ ] **Step 1: Add a basis line next to the model label**
Find:
```tsx
                  <p className="text-[10px] text-bmw-gray-muted mt-3">Modell: {state.data.aiAnalysis.model}</p>
```
Replace with:
```tsx
                  <p className="text-[10px] text-bmw-gray-muted mt-3">Grundlage: Fahrzeugdaten, Regelprüfung &amp; Marktvergleich · Quelle: {state.data.aiAnalysis.model}</p>
```

- [ ] **Step 2: Build check**
```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build 2>&1 | tail -3; echo "build exit: ${PIPESTATUS[0]}"
```
Expected: build exit 0.

- [ ] **Step 3: Commit**
```bash
git add components/AnalysisPanel.tsx
git commit -m "Fahrzeug-Check: show the analysis basis next to the source"
```

---

### Task 5: ValueProp strip on the landing page

**Files:** Create `components/ValueProp.tsx`; modify `app/page.tsx`.

- [ ] **Step 1: Create `components/ValueProp.tsx`**
```tsx
const POINTS = [
  { t: 'Schäden, Historie & Kosten offen einsehbar', s: 'Direkt am Fahrzeug — nicht versteckt.' },
  { t: 'Jede Chat-Antwort mit Grundlage', s: 'Sie sehen, worauf sie beruht.' },
  { t: 'Regelbasiert statt erfunden', s: 'Angaben aus Fahrzeugdaten und Wissensdatenbank.' },
];

export function ValueProp() {
  return (
    <section className="bg-white border border-bmw-gray-border mb-6">
      <div className="text-[10px] font-bold text-bmw-gray-muted uppercase tracking-widest px-4 pt-3">So funktioniert's</div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-bmw-gray-border">
        {POINTS.map((p, i) => (
          <div key={i} className="p-4">
            <div className="text-xs font-semibold">{p.t}</div>
            <div className="text-[11px] text-bmw-gray-text mt-0.5">{p.s}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Render it on the landing page**
In `app/page.tsx`, add the import:
```typescript
import { ValueProp } from '@/components/ValueProp';
```
Change the `<main>` block:
```tsx
      <main className="max-w-layout mx-auto px-6 py-6">
        <CarBrowser cars={cars} />
      </main>
```
to:
```tsx
      <main className="max-w-layout mx-auto px-6 py-6">
        <ValueProp />
        <CarBrowser cars={cars} />
      </main>
```

- [ ] **Step 3: Build + smoke-test**
```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
curl -s http://localhost:3000/ | grep -o "So funktioniert\|Jede Chat-Antwort mit Grundlage\|Regelbasiert statt erfunden" | sort -u
taskkill //F //IM node.exe 2>/dev/null | head -1
```
Expected: build 0; the three strings present on the landing page.

- [ ] **Step 4: Commit**
```bash
git add components/ValueProp.tsx app/page.tsx
git commit -m "Add factual ValueProp strip on the landing page"
```

---

### Task 6: Booking consent checkbox

**Files:** Modify `components/TestDriveModal.tsx`.

- [ ] **Step 1: Add consent state**
Near the other `useState` hooks in `TestDriveModal`, add:
```typescript
  const [consent, setConsent] = useState(false);
```

- [ ] **Step 2: Add the checkbox above the submit button**
Find the submit button:
```tsx
              <button type="submit" disabled={state === 'sending'}
                className="mt-1 py-2.5 bg-bmw-blue text-white font-semibold text-sm rounded-sm disabled:opacity-50">
                {state === 'sending' ? 'Senden…' : 'Probefahrt anfragen'}
              </button>
```
Insert this BEFORE that button:
```tsx
              <label className="flex items-start gap-2 text-[11px] text-bmw-gray-text">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />
                <span>Ich willige ein, dass Name und Telefonnummer zur Terminvereinbarung gespeichert werden. (<a href="/datenschutz" className="text-bmw-blue underline">Datenschutz</a>)</span>
              </label>
```
And change the button's `disabled` to also require consent:
```tsx
              <button type="submit" disabled={state === 'sending' || !consent}
                className="mt-1 py-2.5 bg-bmw-blue text-white font-semibold text-sm rounded-sm disabled:opacity-50">
                {state === 'sending' ? 'Senden…' : 'Probefahrt anfragen'}
              </button>
```

- [ ] **Step 3: Build check**
```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build 2>&1 | tail -3; echo "build exit: ${PIPESTATUS[0]}"
```
Expected: build exit 0.

- [ ] **Step 4: Commit**
```bash
git add components/TestDriveModal.tsx
git commit -m "TestDriveModal: required consent checkbox for personal data"
```

---

### Task 7: /datenschutz page + global Footer

**Files:** Create `app/datenschutz/page.tsx`, `components/Footer.tsx`; modify `app/page.tsx`, `app/cars/[id]/page.tsx`.

- [ ] **Step 1: Create `components/Footer.tsx`**
```tsx
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-bmw-gray-border mt-8 py-4">
      <div className="max-w-layout mx-auto px-6 flex flex-wrap gap-4 text-[11px] text-bmw-gray-muted">
        <span>BMW Niederlassung Braunschweig — Demo</span>
        <Link href="/datenschutz" className="text-bmw-blue hover:underline">Datenschutz</Link>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Create `app/datenschutz/page.tsx`**
```tsx
import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 text-sm leading-relaxed">
      <Link href="/" className="text-sm text-bmw-blue hover:underline">← Zurück</Link>
      <h1 className="text-xl font-bold mt-3 mb-4">Datenschutz — welche Daten wir speichern</h1>

      <section className="mb-4">
        <h2 className="text-sm font-bold mb-1">Chat-Fragen</h2>
        <p className="text-bmw-gray-text">Gespeichert werden: die gestellte Frage, die Antwort, der Zeitpunkt und die Fahrzeug-Nr. — <strong>keine Kontaktdaten</strong>. Zweck: Beantwortung Ihrer Fragen und Auswertung häufiger Fragen.</p>
      </section>

      <section className="mb-4">
        <h2 className="text-sm font-bold mb-1">Probefahrt-Anfragen</h2>
        <p className="text-bmw-gray-text">Gespeichert werden: Name, Telefonnummer, Wunschtermin und das Fahrzeug. Zweck: Terminvereinbarung. Die Eingabe erfolgt freiwillig und nur mit Ihrer Einwilligung.</p>
      </section>

      <section className="mb-4">
        <h2 className="text-sm font-bold mb-1">Speicherort & Weitergabe</h2>
        <p className="text-bmw-gray-text">Die Daten werden lokal beim Händler in einer Datei (SQLite) gespeichert (Demo-Umgebung). <strong>Keine Weitergabe an Dritte.</strong></p>
      </section>

      <section className="mb-4">
        <h2 className="text-sm font-bold mb-1">Löschung</h2>
        <p className="text-bmw-gray-text">Der Händler kann die gespeicherten Chat-Fragen und Probefahrt-Anfragen jederzeit vollständig löschen.</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Render the Footer on the buyer pages**
In `app/page.tsx`: add `import { Footer } from '@/components/Footer';` and add `<Footer />` after the closing `</main>`.
In `app/cars/[id]/page.tsx`: add `import { Footer } from '@/components/Footer';` and add `<Footer />` after `<CarDetail car={car} />` (before `<ChatWidget car={car} />`).

- [ ] **Step 4: Build + smoke-test**
```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
echo "--- datenschutz page ---"; curl -s http://localhost:3000/datenschutz | grep -o "welche Daten wir speichern\|keine Kontaktdaten\|Keine Weitergabe an Dritte" | sort -u
echo "--- footer link on landing ---"; curl -s http://localhost:3000/ | grep -o 'href="/datenschutz"' | head -1
taskkill //F //IM node.exe 2>/dev/null | head -1
```
Expected: build 0; datenschutz page shows its headings; the landing page has a `/datenschutz` link.

- [ ] **Step 5: Commit**
```bash
git add app/datenschutz/ components/Footer.tsx app/page.tsx 'app/cars/[id]/page.tsx'
git commit -m "Add /datenschutz page and global footer link"
```

---

### Task 8: clear functions + auth-gated DELETE /api/sellers/data

**Files:** Modify `lib/questions/log.ts`, `lib/bookings/store.ts`; create `app/api/sellers/data/route.ts`, `app/api/sellers/data/route.test.ts`.

- [ ] **Step 1: Add production-safe clear functions**
In `lib/questions/log.ts`, add (e.g. just before `_resetLog`):
```typescript
export function clearQuestions(): void {
  db.run('DELETE FROM questions');
  persist();
}
```
In `lib/bookings/store.ts`, add (e.g. just before `_resetBookings`):
```typescript
export function clearBookings(): void {
  db.run('DELETE FROM bookings');
  persist();
}
```

- [ ] **Step 2: Write the failing route test** — `app/api/sellers/data/route.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from './route';
import { signToken } from '@/lib/auth/jwt';
import { logQuestion, getQuestionsForCar } from '@/lib/questions/log';
import { addBooking, getBookings } from '@/lib/bookings/store';

function reqWithCookie(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.cookie = `seller_token=${token}`;
  return new NextRequest('http://localhost/api/sellers/data', { method: 'DELETE', headers });
}

describe('DELETE /api/sellers/data', () => {
  it('rejects without a cookie', async () => {
    const res = await DELETE(reqWithCookie());
    expect(res.status).toBe(401);
  });

  it('clears questions and bookings for an authenticated seller', async () => {
    logQuestion(1, 'BMW 320i', 'Testfrage?', 'A');
    addBooking({ carId: 1, carName: 'BMW 320i', name: 'Max', phone: '0151', preferredDate: '2026-06-10' });
    const token = signToken({ sellerId: 'seller-1', email: 'demo@carcheck.de' });
    const res = await DELETE(reqWithCookie(token));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(getQuestionsForCar(1).logs).toHaveLength(0);
    expect(getBookings()).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run, confirm FAIL**

Run: `npm run test:run -- app/api/sellers/data` → expect "Cannot find module './route'".

- [ ] **Step 4: Implement `app/api/sellers/data/route.ts`**
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { requireSellerFromRequest, AuthError } from '@/lib/auth/require-seller';
import { clearQuestions } from '@/lib/questions/log';
import { clearBookings } from '@/lib/bookings/store';

export async function DELETE(req: NextRequest) {
  try {
    requireSellerFromRequest(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }
  clearQuestions();
  clearBookings();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run, confirm PASS**

Run: `npm run test:run -- app/api/sellers/data lib/questions/log lib/bookings/store` → expect green.

- [ ] **Step 6: Commit**
```bash
git add lib/questions/log.ts lib/bookings/store.ts app/api/sellers/data/
git commit -m "Add clearQuestions/clearBookings + auth-gated DELETE /api/sellers/data"
```

---

### Task 9: Dashboard "Daten löschen" button

**Files:** Modify `components/SellerDashboard.tsx`.

- [ ] **Step 1: Add a delete handler**
Inside `SellerDashboard`, near the existing `logout` function, add:
```typescript
  async function deleteData() {
    if (!confirm('Alle gespeicherten Chat-Fragen und Probefahrt-Anfragen löschen?')) return;
    const res = await fetch('/api/sellers/data', { method: 'DELETE' });
    if (res.ok) window.location.reload();
  }
```

- [ ] **Step 2: Add the button to the header's right-side group**
The dashboard header has a right-side group with the FAQ-Pack link and the "Abmelden" button. Add this button into that group (e.g. before "Abmelden"):
```tsx
          <button onClick={deleteData} className="text-sm text-flag-orange hover:underline">
            Daten löschen
          </button>
```
(Read the file to place it in the existing right-side flex container alongside the FAQ-Pack link and Abmelden button.)

- [ ] **Step 3: Build + smoke-test**
```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null; rm -f data/questions.db data/questions.db.tmp data/bookings.db data/bookings.db.tmp
npm run build > /tmp/b.log 2>&1; echo "build: $?"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
curl -s -c /tmp/ck.txt -X POST http://localhost:3000/api/sellers/login -H 'Content-Type: application/json' -d '{"email":"demo@carcheck.de","password":"demo123"}' -o /dev/null
echo "--- button present ---"; curl -s -b /tmp/ck.txt http://localhost:3000/dashboard | grep -o "Daten löschen" | head -1
echo "--- DELETE works (expect ok:true), no-auth 401 ---"
curl -s -b /tmp/ck.txt -X DELETE http://localhost:3000/api/sellers/data
echo ""; curl -s -o /dev/null -w "no-auth: %{http_code}\n" -X DELETE http://localhost:3000/api/sellers/data
taskkill //F //IM node.exe 2>/dev/null | head -1
rm -f data/questions.db data/questions.db.tmp data/bookings.db data/bookings.db.tmp
```
Expected: build 0; "Daten löschen" present on the dashboard; the authed DELETE returns `{"ok":true}`; the no-auth DELETE returns `401`.

- [ ] **Step 4: Commit**
```bash
git add components/SellerDashboard.tsx
git commit -m "Dashboard: Daten löschen button (clears stored questions + bookings)"
```

---

### Task 10: Slice verification

**Files:** none.

- [ ] **Step 1: tsc + full test suite**
```bash
npx tsc --noEmit && echo "tsc OK"
npm run test:run 2>&1 | grep -E "Test Files|Tests" | tail -2
```
Expected: tsc clean; all tests pass (previous count + chat-basis 5 + data-route 2).

- [ ] **Step 2: Production build + end-to-end walkthrough**
```bash
taskkill //F //IM node.exe 2>/dev/null | head -1 || true
sleep 2; rm -rf .next 2>/dev/null; rm -f data/questions.db data/questions.db.tmp data/bookings.db data/bookings.db.tmp
npm run build 2>&1 | tail -3; echo "build exit: ${PIPESTATUS[0]}"
(npm start >/tmp/s.log 2>&1 &)
until curl -s -o /dev/null http://localhost:3000/api/cars 2>/dev/null; do sleep 2; done
echo "=== UVP on landing ==="; curl -s http://localhost:3000/ | grep -o "So funktioniert\|Regelbasiert statt erfunden\|href=\"/datenschutz\"" | sort -u
echo "=== chat returns basis ==="; curl -s -X POST http://localhost:3000/api/cars/chat -H 'Content-Type: application/json' -d '{"carData":{"id":1,"name":"BMW 118i","price":16900,"km":47800,"yearBuilt":2019,"owners":1,"maintenanceRecords":10,"features":[],"accidents":[]},"message":"Was ist das M Sportpaket?"}' | grep -o '"basis":"[^"]*"'
echo "=== datenschutz page ==="; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/datenschutz
echo "=== detail page: chat notice + footer ==="; curl -s http://localhost:3000/cars/1 | grep -o "Ihre Fragen werden gespeichert\|href=\"/datenschutz\"" | sort -u
taskkill //F //IM node.exe 2>/dev/null | head -1
rm -f data/questions.db data/questions.db.tmp data/bookings.db data/bookings.db.tmp
git status --short
```
Expected: build exit 0; landing shows the UVP strings + a `/datenschutz` link; the chat response includes `"basis":"Wissensdatenbank"`; `/datenschutz` returns `200`; the detail page shows the chat storage notice + a `/datenschutz` link; working tree clean.

This completes the Transparenz & Daten slice.
