import initSqlJs, { type Database } from 'sql.js';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Car } from './types';
import { EQUIPMENT } from './equipment-knowledge';

// Stored separately from questions.db so the two sql.js handles never write the
// same file. The equipment answers are seeded from EQUIPMENT on every startup
// (INSERT OR REPLACE), so editing the code list updates the stored answers.
const isTest = !!process.env.VITEST;
const DB_PATH = join(process.cwd(), 'data', 'equipment.db');

const SQL = await initSqlJs({
  locateFile: (file: string) => join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
});

const db: Database = !isTest && existsSync(DB_PATH)
  ? new SQL.Database(readFileSync(DB_PATH))
  : new SQL.Database();

db.run(`CREATE TABLE IF NOT EXISTS equipment (
  priority INTEGER NOT NULL,
  term     TEXT    PRIMARY KEY,
  pattern  TEXT    NOT NULL,
  answer   TEXT    NOT NULL
)`);

// Seed / refresh from the canonical code list.
const insert = db.prepare('INSERT OR REPLACE INTO equipment (priority, term, pattern, answer) VALUES (?, ?, ?, ?)');
EQUIPMENT.forEach((e, i) => insert.run([i, e.term, e.pattern, e.answer]));
insert.free();
persist();

function persist(): void {
  if (isTest) return;
  try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.tmp`;
    writeFileSync(tmp, Buffer.from(db.export()));
    renameSync(tmp, DB_PATH);
  } catch (err) {
    console.error('Failed to persist equipment DB:', err);
  }
}

// Only treat the message as an equipment-definition question when it actually
// asks what something IS — so we don't hijack presence checks ("hat es xDrive?")
// or condition questions ("ist das Fahrwerk ok?").
const EXPLAIN_INTENT = /(was ist|was sind|was bedeutet|was hei(ß|ss)t|was genau|wofür|wozu|erklär|erklaer|bedeutung|what is|sag mir was)/i;

export function isEquipmentQuestion(message: string): boolean {
  return EXPLAIN_INTENT.test(message);
}

export interface EquipmentAnswer {
  term: string;
  answer: string;
}

/**
 * Looks up an equipment explanation for an "was ist X" style question.
 * Returns null when the message is not a definition question or no term matches.
 * If a car is given, appends whether THIS vehicle has the feature.
 */
export function lookupEquipmentAnswer(message: string, car?: Car): EquipmentAnswer | null {
  if (!isEquipmentQuestion(message)) return null;

  const res = db.exec('SELECT term, pattern, answer FROM equipment ORDER BY priority ASC');
  if (!res.length) return null;

  for (const [term, pattern, answer] of res[0].values) {
    if (new RegExp(pattern as string, 'i').test(message)) {
      let full = answer as string;
      if (car) {
        const haystack = [car.subtitle ?? '', ...(car.features ?? [])].join(' ');
        const has = new RegExp(pattern as string, 'i').test(haystack);
        full += `\n\nDieses Fahrzeug (${car.name}): ${has ? '✓ vorhanden' : '✗ nicht in der Ausstattungsliste'}.`;
      }
      return { term: term as string, answer: full };
    }
  }
  return null;
}
