'use client';

import { useMemo, useState } from 'react';
import type { Car } from '@/lib/cars/types';
import { FilterSidebar, type FilterState } from './FilterSidebar';
import { CarGrid } from './CarGrid';

interface CarBrowserProps {
  cars: Car[];
}

const EMPTY: FilterState = {};

export function CarBrowser({ cars }: CarBrowserProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY);

  const filtered = useMemo(() => cars.filter(c => {
    if (filters.priceMin !== undefined && c.price < filters.priceMin) return false;
    if (filters.priceMax !== undefined && c.price > filters.priceMax) return false;
    if (filters.kmMax !== undefined && c.km > filters.kmMax) return false;
    if (filters.yearMin !== undefined && c.yearBuilt < filters.yearMin) return false;
    if (filters.fuel?.length && !filters.fuel.includes(c.fuel ?? '')) return false;
    if (filters.transmission?.length && !filters.transmission.includes(c.transmission ?? '')) return false;
    return true;
  }), [cars, filters]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[264px_1fr] gap-6">
      <FilterSidebar
        value={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY)}
      />
      <CarGrid cars={filtered} />
    </div>
  );
}
