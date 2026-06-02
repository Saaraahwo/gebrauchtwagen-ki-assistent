import initSqlJs, { type Database } from 'sql.js';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface QuestionEntry {
  articleNr: string;
  carName: string;
  question: string;
  answer: string;
  ts: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
  count: number;
}

// In tests we keep the DB purely in memory (no file load/persist) so runs stay
// hermetic. In dev/prod the question log is persisted to data/questions.db and
// survives server restarts.
const isTest = !!process.env.VITEST;
const DB_PATH = join(process.cwd(), 'data', 'questions.db');

// sql.js is WASM and initialises asynchronously. Top-level await runs it once at
// module load, which lets the exported functions stay synchronous — so callers
// (and downstream sales-intelligence/dashboard code) need no changes.
const SQL = await initSqlJs({
  locateFile: (file: string) => join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
});

const db: Database = !isTest && existsSync(DB_PATH)
  ? new SQL.Database(readFileSync(DB_PATH))
  : new SQL.Database();

db.run(`CREATE TABLE IF NOT EXISTS questions (
  car_id   INTEGER NOT NULL,
  car_name TEXT    NOT NULL,
  question TEXT    NOT NULL,
  answer   TEXT    NOT NULL,
  ts       TEXT    NOT NULL
)`);

function persist(): void {
  if (isTest) return;
  // Atomic write: serialise to a temp file, then rename over the real DB so a
  // crash mid-write can never leave a half-written (corrupt) questions.db.
  // renameSync replaces the destination on both POSIX and Windows (libuv sets
  // MOVEFILE_REPLACE_EXISTING). A transient FS/sync lock is logged, not thrown,
  // so it never 500s the request — the data still lives in the in-memory DB.
  try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.tmp`;
    writeFileSync(tmp, Buffer.from(db.export()));
    renameSync(tmp, DB_PATH);
  } catch (err) {
    console.error('Failed to persist question log:', err);
  }
}

export function articleNr(carId: number): string {
  return `BMW-GW-${String(carId).padStart(3, '0')}`;
}

export function logQuestion(
  carId: number,
  carName: string,
  question: string,
  answer: string,
): void {
  db.run(
    'INSERT INTO questions (car_id, car_name, question, answer, ts) VALUES (?, ?, ?, ?, ?)',
    [carId, carName, question, answer, new Date().toISOString()],
  );
  persist();
}

export function getQuestionsForCar(carId: number): {
  articleNr: string;
  logs: QuestionEntry[];
  faq: FaqEntry[];
} {
  const stmt = db.prepare(
    'SELECT car_id, car_name, question, answer, ts FROM questions WHERE car_id = ? ORDER BY rowid ASC',
  );
  stmt.bind([carId]);
  const logs: QuestionEntry[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    logs.push({
      articleNr: articleNr(Number(row.car_id)),
      carName: String(row.car_name),
      question: String(row.question),
      answer: String(row.answer),
      ts: String(row.ts),
    });
  }
  stmt.free();

  const counts: Record<string, FaqEntry> = {};
  for (const entry of logs) {
    const key = entry.question.toLowerCase().trim();
    if (!counts[key]) {
      counts[key] = { question: entry.question, answer: entry.answer, count: 0 };
    }
    counts[key].count++;
  }
  const faq = Object.values(counts).sort((a, b) => b.count - a.count);
  return { articleNr: articleNr(carId), logs, faq };
}

export function getTopQuestions(limit = 8): { question: string; count: number }[] {
  const stmt = db.prepare(
    'SELECT question, COUNT(*) AS c FROM questions GROUP BY lower(trim(question)) ORDER BY c DESC, question ASC LIMIT ?',
  );
  stmt.bind([limit]);
  const out: { question: string; count: number }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    out.push({ question: String(row.question), count: Number(row.c) });
  }
  stmt.free();
  return out;
}

// Test helper — clears all rows. Do not call from production code.
export function _resetLog(): void {
  db.run('DELETE FROM questions');
  persist();
}
