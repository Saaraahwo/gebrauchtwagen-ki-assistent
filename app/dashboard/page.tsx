import { readFileSync } from 'fs';
import { join } from 'path';
import { redirect } from 'next/navigation';
import type { Car } from '@/lib/cars/types';
import { getSellerFromCookies } from '@/lib/auth/require-seller';
import { sellers } from '@/lib/auth/sellers';
import { computeInventoryStats, carCondition } from '@/lib/cars/inventory-stats';
import { buildSalesIntelligence } from '@/lib/cars/sales-intelligence';
import { Header } from '@/components/Header';
import { SellerDashboard } from '@/components/SellerDashboard';

export default async function DashboardPage() {
  const seller = await getSellerFromCookies();
  if (!seller) redirect('/login');

  const cars: Car[] = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
  );
  const stats = computeInventoryStats(cars);
  const carIntel = cars.map(car => ({
    car,
    intelligence: buildSalesIntelligence(car),
    condition: carCondition(car),
  }));
  const sellerName = sellers[seller.email]?.name ?? seller.email;

  return (
    <>
      <Header />
      <SellerDashboard sellerName={sellerName} stats={stats} cars={carIntel} />
    </>
  );
}
