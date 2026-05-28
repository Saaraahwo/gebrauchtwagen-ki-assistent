import type { Car } from '@/lib/cars/types';
import { CarCard } from './CarCard';

interface CarGridProps {
  cars: Car[];
}

export function CarGrid({ cars }: CarGridProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px] text-bmw-gray-text">
          <strong className="text-bmw-dark font-semibold">{cars.length}</strong> Fahrzeuge gefunden
        </div>
        <select className="px-3 py-2 border border-bmw-gray-border rounded-sm text-[13px] bg-white text-bmw-gray-text">
          <option>Sortierung: Preis aufsteigend</option>
          <option>Sortierung: Preis absteigend</option>
          <option>Sortierung: Kilometer aufsteigend</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cars.map(c => (
          <CarCard key={c.id} car={c} />
        ))}
      </div>
    </div>
  );
}
