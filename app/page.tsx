import { readFileSync } from 'fs';
import { join } from 'path';
import type { Car } from '@/lib/cars/types';
import { Header } from '@/components/Header';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CarBrowser } from '@/components/CarBrowser';
import { ValueProp } from '@/components/ValueProp';

export default function HomePage() {
  const cars: Car[] = JSON.parse(
    readFileSync(join(process.cwd(), 'data', 'cars.json'), 'utf8'),
  );

  return (
    <>
      <Header />
      <Breadcrumb
        items={[
          { label: 'Startseite', href: '/' },
          { label: 'Gebrauchtwagen' },
        ]}
      />
      <main className="max-w-layout mx-auto px-6 py-6">
        <ValueProp />
        <CarBrowser cars={cars} />
      </main>
    </>
  );
}
