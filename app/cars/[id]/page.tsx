import { readFileSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import type { Car } from '@/lib/cars/types';
import { Header } from '@/components/Header';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CarDetail } from '@/components/CarDetail';
import { ChatWidget } from '@/components/ChatWidget';

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const carId = parseInt(id, 10);
  if (Number.isNaN(carId)) notFound();

  const cars: Car[] = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
  );
  const car = cars.find(c => c.id === carId);
  if (!car) notFound();

  return (
    <>
      <Header />
      <Breadcrumb
        items={[
          { label: 'Startseite', href: '/' },
          { label: 'Gebrauchtwagen', href: '/' },
          { label: car.name },
        ]}
      />
      <main className="max-w-layout mx-auto px-6 py-6 space-y-6">
        <CarDetail car={car} />
        <ChatWidget car={car} />
      </main>
    </>
  );
}
