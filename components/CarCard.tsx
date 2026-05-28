import Link from 'next/link';
import type { Car } from '@/lib/cars/types';

interface CarCardProps {
  car: Car;
}

export function CarCard({ car }: CarCardProps) {
  const hasAccidents = (car.accidents?.length ?? 0) > 0;
  const dealerLabel = 'BMW Niederlassung';

  return (
    <Link
      href={`/cars/${car.id}`}
      className="bg-white border border-bmw-gray-border block hover:shadow-lg transition-shadow"
    >
      <div className="relative h-[190px] overflow-hidden bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400 text-xs">{car.name}</span>
        <span className="absolute top-2.5 left-2.5 bg-bmw-blue text-white text-[10px] font-bold px-2 py-0.5 tracking-wide">
          GEBRAUCHTWAGEN
        </span>
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1">
          {hasAccidents && (
            <span
              className="w-2.5 h-2.5 rounded-full bg-flag-red border border-white/60"
              title="Unfallhistorie"
            />
          )}
        </div>
      </div>
      <div className="px-3.5 pt-3.5">
        <div className="text-[10px] text-bmw-gray-muted uppercase tracking-wider mb-1">
          {dealerLabel}
        </div>
        <div className="text-sm font-bold text-bmw-dark leading-tight">{car.name}</div>
        {car.subtitle && (
          <div className="text-xs text-bmw-gray-text mt-0.5">{car.subtitle}</div>
        )}
        <div className="text-xl font-bold text-bmw-dark mt-2.5">
          {car.price.toLocaleString('de-DE')}{' '}
          <span className="text-xs font-normal text-bmw-gray-muted">€</span>
        </div>
      </div>
      <div className="px-3.5 py-3 text-xs text-bmw-gray-text border-t border-gray-100 mt-3 flex justify-between">
        <span>{car.km.toLocaleString('de-DE')} km</span>
        <span>EZ {car.yearBuilt}</span>
        <span>{car.enginePower ?? ''}</span>
      </div>
    </Link>
  );
}
