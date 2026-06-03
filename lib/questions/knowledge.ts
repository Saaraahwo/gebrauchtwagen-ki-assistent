import initSqlJs, { type Database } from 'sql.js';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { Car } from '@/lib/cars/types';

const isTest = !!process.env.VITEST;
const DB_PATH = join(process.cwd(), 'data', 'knowledge.db');

const SQL = await initSqlJs({
  locateFile: (file: string) => join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
});

const db: Database = !isTest && existsSync(DB_PATH)
  ? new SQL.Database(readFileSync(DB_PATH))
  : new SQL.Database();

db.run(`CREATE TABLE IF NOT EXISTS car_knowledge (
  car_id   INTEGER NOT NULL,
  question TEXT    NOT NULL,
  answer   TEXT    NOT NULL,
  category TEXT    NOT NULL
)`);

function persist(): void {
  if (isTest) return;
  try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.tmp`;
    writeFileSync(tmp, Buffer.from(db.export()));
    renameSync(tmp, DB_PATH);
  } catch (err) {
    console.error('Failed to persist knowledge db:', err);
  }
}

function generateQA(car: Car): { question: string; answer: string; category: string }[] {
  const s = car.specs;
  if (!s) return [];
  const n = car.name;
  const qa: { question: string; answer: string; category: string }[] = [];

  // motor
  qa.push({ category: 'motor', question: `Wie viel PS hat der ${n}?`, answer: `Der ${n} hat ${s.powerPs} PS (${s.powerKw} kW) bei ${s.displacement} Hubraum und ${s.torque} Nm Drehmoment.` });
  qa.push({ category: 'motor', question: `Wie viele Zylinder hat der Motor?`, answer: `Der Motor des ${n} hat ${s.cylinders} Zylinder.` });
  qa.push({ category: 'motor', question: `Welches Getriebe hat der ${n}?`, answer: car.transmission ? `Der ${n} ist mit ${car.transmission} ausgestattet.` : 'Keine Getriebeangabe vorhanden.' });
  qa.push({ category: 'motor', question: `Welcher Antrieb ist verbaut?`, answer: car.drive ? `Der ${n} hat ${car.drive}.` : 'Keine Antriebsangabe vorhanden.' });

  // performance
  qa.push({ category: 'performance', question: `Wie schnell ist der ${n}?`, answer: `Der ${n} beschleunigt in ${s.acceleration} Sekunden von 0 auf 100 km/h und erreicht ${s.topSpeed} km/h Höchstgeschwindigkeit.` });
  qa.push({ category: 'performance', question: `Was ist die Höchstgeschwindigkeit?`, answer: `Die Höchstgeschwindigkeit des ${n} beträgt ${s.topSpeed} km/h.` });

  // consumption
  qa.push({ category: 'consumption', question: `Wie viel verbraucht der ${n}?`, answer: `Der ${n} verbraucht kombiniert ${s.consumptionCombined} (WLTP), innerorts ${s.consumptionCity} und außerorts ${s.consumptionHighway}.` });
  qa.push({ category: 'consumption', question: `Wie viel CO₂ stößt der ${n} aus?`, answer: `Der ${n} stößt ${s.co2} g/km CO₂ aus (kombiniert, WLTP).` });
  qa.push({ category: 'consumption', question: `Wie groß ist der Tank?`, answer: `Der Tank des ${n} fasst ${s.tankVolume} Liter.` });

  // dimensions
  qa.push({ category: 'dimensions', question: `Wie groß ist der Kofferraum des ${n}?`, answer: s.bootVolumeMax ? `Der Kofferraum fasst ${s.bootVolume} Liter, erweiterbar auf ${s.bootVolumeMax} Liter.` : `Der Kofferraum fasst ${s.bootVolume} Liter.` });
  qa.push({ category: 'dimensions', question: `Wie groß ist der ${n}?`, answer: `Der ${n} ist ${s.length} mm lang, ${s.width} mm breit und ${s.height} mm hoch. Radstand: ${s.wheelbase} mm.` });
  qa.push({ category: 'dimensions', question: `Wie schwer ist der ${n}?`, answer: `Leergewicht ${s.weight} kg, Zuladung ${s.payload} kg.` });
  qa.push({ category: 'dimensions', question: `Welche Reifengröße hat der ${n}?`, answer: `Der ${n} ist mit Reifen der Größe ${s.tireSize} ausgestattet.` });

  // general
  qa.push({ category: 'general', question: `Wie viele Sitze hat der ${n}?`, answer: `Der ${n} hat ${car.seats ?? 5} Sitze und ${car.doors ?? 4} Türen.` });
  qa.push({ category: 'general', question: `Welche Schadstoffklasse hat der ${n}?`, answer: car.emission ? `Der ${n} entspricht der Schadstoffklasse ${car.emission}.` : 'Keine Angabe.' });
  qa.push({ category: 'general', question: `Was kostet der ${n}?`, answer: `Der ${n} wird für ${car.price.toLocaleString('de-DE')} € angeboten.` });
  qa.push({ category: 'general', question: `Wie alt ist der ${n}?`, answer: `Erstzulassung ${car.erstzulassung ?? car.yearBuilt} (Baujahr ${car.yearBuilt}).` });
  qa.push({ category: 'general', question: `Wie viele Kilometer hat der ${n}?`, answer: `Der ${n} hat ${car.km.toLocaleString('de-DE')} km Laufleistung.` });
  if (car.hu) qa.push({ category: 'general', question: `Wann ist die nächste HU?`, answer: `Die Hauptuntersuchung (HU) ist gültig bis ${car.hu}.` });

  return qa;
}

function isSeeded(carId: number): boolean {
  const stmt = db.prepare('SELECT COUNT(*) AS n FROM car_knowledge WHERE car_id = ?');
  stmt.bind([carId]);
  stmt.step();
  const n = Number(stmt.getAsObject().n);
  stmt.free();
  return n > 0;
}

export function seedCarKnowledge(car: Car): void {
  if (!car.specs || isSeeded(car.id)) return;
  const qa = generateQA(car);
  for (const { question, answer, category } of qa) {
    db.run(
      'INSERT INTO car_knowledge (car_id, question, answer, category) VALUES (?, ?, ?, ?)',
      [car.id, question, answer, category],
    );
  }
  persist();
}

const CATEGORIES: { category: string; keywords: string[] }[] = [
  { category: 'motor',       keywords: ['ps', 'kw', 'motor', 'hubraum', 'leistung', 'zylinder', 'drehmoment', 'getriebe', 'antrieb'] },
  { category: 'performance', keywords: ['schnell', 'tempo', 'beschleunig', 'höchst', 'vmax', '0-100', 'sprint'] },
  { category: 'consumption', keywords: ['verbrauch', 'liter', 'sprit', 'kraftstoff', 'co2', 'co₂', 'tank', 'sparsam'] },
  { category: 'dimensions',  keywords: ['kofferraum', 'platz', 'groß', 'länge', 'breite', 'höhe', 'gewicht', 'maße', 'reifen', 'radstand', 'zuladung'] },
  { category: 'general',     keywords: ['sitze', 'türen', 'hu', 'hauptuntersuchung', 'kilometer', 'preis', 'alter', 'baujahr', 'schadstoff'] },
];

export function findKnowledgeAnswer(
  carId: number,
  message: string,
): { question: string; answer: string; category: string } | null {
  const m = message.toLowerCase();

  let matchedCategory: string | null = null;
  for (const { category, keywords } of CATEGORIES) {
    if (keywords.some(k => m.includes(k))) {
      matchedCategory = category;
      break;
    }
  }
  if (!matchedCategory) return null;

  const stmt = db.prepare(
    'SELECT question, answer, category FROM car_knowledge WHERE car_id = ? AND category = ? ORDER BY rowid ASC',
  );
  stmt.bind([carId, matchedCategory]);
  const rows: { question: string; answer: string; category: string }[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push({ question: String(row.question), answer: String(row.answer), category: String(row.category) });
  }
  stmt.free();

  if (rows.length === 0) return null;

  // Secondary match: prefer the row whose stored question shares a word with the user message
  const best =
    rows.find(r =>
      r.question
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
        .some(w => m.includes(w)),
    ) ?? rows[0];

  return best;
}

// Auto-seed all cars with specs at module load (skipped in test environment)
if (!isTest) {
  try {
    const carsRaw: Car[] = JSON.parse(
      readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
    );
    for (const car of carsRaw) {
      seedCarKnowledge(car);
    }
  } catch (err) {
    console.error('Failed to seed car knowledge:', err);
  }
}

// Test helpers — do not call from production code
export function _resetKnowledge(): void {
  db.run('DELETE FROM car_knowledge');
}

export function _seedForTest(
  carId: number,
  rows: { question: string; answer: string; category: string }[],
): void {
  for (const { question, answer, category } of rows) {
    db.run(
      'INSERT INTO car_knowledge (car_id, question, answer, category) VALUES (?, ?, ?, ?)',
      [carId, question, answer, category],
    );
  }
}
