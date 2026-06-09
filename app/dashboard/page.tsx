import { readFileSync } from 'fs';
import { join } from 'path';
import { redirect } from 'next/navigation';
import type { Car } from '@/lib/cars/types';
import { getSellerFromCookies } from '@/lib/auth/require-seller';
import { sellers } from '@/lib/auth/sellers';
import { computeInventoryStats, carCondition } from '@/lib/cars/inventory-stats';
import { buildSalesIntelligence } from '@/lib/cars/sales-intelligence';
import { disclosureChecklist } from '@/lib/cars/disclosure';
import { getTopQuestions, getQuestionsForCar } from '@/lib/questions/log';
import { getBookings } from '@/lib/bookings/store';
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
    disclosure: disclosureChecklist(car),
    chatQuestions: getQuestionsForCar(car.id).logs,
  }));
  const topQuestions = getTopQuestions(8);
  const bookings = getBookings();
  const sellerName = sellers[seller.email]?.name ?? seller.email;

  return (
    <>
      <Header />
      <SellerDashboard
        sellerName={sellerName}
        stats={stats}
        cars={carIntel}
        topQuestions={topQuestions}
        bookings={bookings}
      />
    </>
  );
}
