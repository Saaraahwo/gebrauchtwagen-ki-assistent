import initSqlJs, { type Database } from 'sql.js';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface Booking {
  carId: number;
  carName: string;
  name: string;
  phone: string;
  preferredDate: string;
  ts: string;
}

const isTest = !!process.env.VITEST;
const DB_PATH = join(process.cwd(), 'data', 'bookings.db');

const SQL = await initSqlJs({
  locateFile: (file: string) => join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
});

const db: Database = !isTest && existsSync(DB_PATH)
  ? new SQL.Database(readFileSync(DB_PATH))
  : new SQL.Database();

db.run(`CREATE TABLE IF NOT EXISTS bookings (
  car_id         INTEGER NOT NULL,
  car_name       TEXT    NOT NULL,
  name           TEXT    NOT NULL,
  phone          TEXT    NOT NULL,
  preferred_date TEXT    NOT NULL,
  ts             TEXT    NOT NULL
)`);

function persist(): void {
  if (isTest) return;
  try {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const tmp = `${DB_PATH}.tmp`;
    writeFileSync(tmp, Buffer.from(db.export()));
    renameSync(tmp, DB_PATH);
  } catch (err) {
    console.error('Failed to persist bookings:', err);
  }
}

export function addBooking(b: Omit<Booking, 'ts'>): Booking {
  const ts = new Date().toISOString();
  db.run(
    'INSERT INTO bookings (car_id, car_name, name, phone, preferred_date, ts) VALUES (?, ?, ?, ?, ?, ?)',
    [b.carId, b.carName, b.name, b.phone, b.preferredDate, ts],
  );
  persist();
  return { ...b, ts };
}

export function getBookings(): Booking[] {
  const res = db.exec('SELECT car_id, car_name, name, phone, preferred_date, ts FROM bookings ORDER BY rowid DESC');
  if (!res.length) return [];
  return res[0].values.map(r => ({
    carId: Number(r[0]),
    carName: String(r[1]),
    name: String(r[2]),
    phone: String(r[3]),
    preferredDate: String(r[4]),
    ts: String(r[5]),
  }));
}

// Test helper — clears all rows. Do not call from production code.
export function _resetBookings(): void {
  db.run('DELETE FROM bookings');
  persist();
}
