import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Car } from '@/lib/cars/types';

const cars: Car[] = JSON.parse(
  readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
);

export function GET() {
  return NextResponse.json(cars);
}
