'use client';

import { useMemo, useState } from 'react';
import type { Car } from '@/lib/cars/types';
import { FilterSidebar, type FilterState } from './FilterSidebar';
import { CarGrid, type SortKey } from './CarGrid';

interface CarBrowserProps {
  cars: Car[];
}

const EMPTY: FilterState = {};

export function CarBrowser({ cars }: CarBrowserProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY);
  const [sort, setSort] = useState<SortKey>('price-asc');

  const visible = useMemo(() => {
    const filtered = cars.filter(c => {
      if (filters.priceMin !== undefined && c.price < filters.priceMin) return false;
      if (filters.priceMax !== undefined && c.price > filters.priceMax) return false;
      if (filters.kmMax !== undefined && c.km > filters.kmMax) return false;
      if (filters.yearMin !== undefined && c.yearBuilt < filters.yearMin) return false;
      if (filters.fuel?.length && !filters.fuel.includes(c.fuel ?? '')) return false;
      if (filters.transmission?.length && !filters.transmission.includes(c.transmission ?? '')) return false;
      return true;
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      return a.km - b.km; // km-asc
    });
    return sorted;
  }, [cars, filters, sort]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[264px_1fr] gap-6">
      <FilterSidebar
        value={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY)}
      />
      <CarGrid cars={visible} sort={sort} onSortChange={setSort} />
    </div>
  );
}
