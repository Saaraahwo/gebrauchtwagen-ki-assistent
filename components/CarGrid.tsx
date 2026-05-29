import type { Car } from '@/lib/cars/types';
import { CarCard } from './CarCard';

export type SortKey = 'price-asc' | 'price-desc' | 'km-asc';

interface CarGridProps {
  cars: Car[];
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
}

export function CarGrid({ cars, sort, onSortChange }: CarGridProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[13px] text-bmw-gray-text">
          <strong className="text-bmw-dark font-semibold">{cars.length}</strong> Fahrzeuge gefunden
        </div>
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value as SortKey)}
          className="px-3 py-2 border border-bmw-gray-border rounded-sm text-[13px] bg-white text-bmw-gray-text"
        >
          <option value="price-asc">Sortierung: Preis aufsteigend</option>
          <option value="price-desc">Sortierung: Preis absteigend</option>
          <option value="km-asc">Sortierung: Kilometer aufsteigend</option>
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
