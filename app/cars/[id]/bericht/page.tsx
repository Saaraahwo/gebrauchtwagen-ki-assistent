import { readFileSync } from 'fs';
import { join } from 'path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Car } from '@/lib/cars/types';
import { VehicleReport } from '@/components/VehicleReport';
import { PrintButton } from '@/components/PrintButton';

export default async function ReportPage({
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
    <div className="max-w-3xl mx-auto p-6">
      <div className="no-print flex justify-between items-center mb-4">
        <Link href={`/cars/${car.id}`} className="text-sm text-bmw-blue hover:underline">← Zurück zum Fahrzeug</Link>
        <PrintButton />
      </div>
      <VehicleReport car={car} />
    </div>
  );
}
