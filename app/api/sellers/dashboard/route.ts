import { NextResponse, type NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Car } from '@/lib/cars/types';
import { requireSellerFromRequest, AuthError } from '@/lib/auth/require-seller';
import { sellers } from '@/lib/auth/sellers';
import { computeInventoryStats, carCondition } from '@/lib/cars/inventory-stats';
import { buildSalesIntelligence } from '@/lib/cars/sales-intelligence';

const cars: Car[] = JSON.parse(
  readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
);

export async function GET(req: NextRequest) {
  let seller;
  try {
    seller = requireSellerFromRequest(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  const stats = computeInventoryStats(cars);
  const carIntel = cars.map(car => ({
    car,
    intelligence: buildSalesIntelligence(car),
    condition: carCondition(car),
  }));

  return NextResponse.json({
    sellerInfo: {
      email: seller.email,
      name: sellers[seller.email]?.name ?? seller.email,
    },
    stats,
    cars: carIntel,
    faqPack: { downloadUrl: '/api/sellers/faq-pack', format: 'TXT' },
  });
}
