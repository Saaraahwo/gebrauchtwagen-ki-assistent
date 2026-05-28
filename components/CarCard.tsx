'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Car } from '@/lib/cars/types';
import { CarSVG } from './CarSVG';

function svgType(name: string): 'sedan' | 'suv' | 'cabrio' {
  if (/X[0-9]|iX/i.test(name)) return 'suv';
  if (/Cabriolet|Z4/i.test(name)) return 'cabrio';
  return 'sedan';
}

export function CarCard({ car }: { car: Car }) {
  const [imgError, setImgError] = useState(false);
  const hasAccidents = (car.accidents?.length ?? 0) > 0;

  return (
    <Link
      href={`/cars/${car.id}`}
      className="bg-white border border-bmw-gray-border block hover:shadow-lg transition-shadow"
    >
      <div className="relative h-[190px] overflow-hidden">
        {car.imgExterior && !imgError ? (
          <img
            src={car.imgExterior}
            alt={car.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-4"
            style={{
              background: `linear-gradient(135deg, ${car.colorHex ?? '#e5e5e5'}20, ${car.colorHex ?? '#e5e5e5'}50)`,
            }}
          >
            <CarSVG color={car.colorHex} type={svgType(car.name)} />
          </div>
        )}
        <span className={`absolute top-2.5 left-2.5 text-white text-[10px] font-bold px-2 py-0.5 tracking-wide ${car.badge ? 'bg-flag-green' : 'bg-bmw-blue'}`}>
          {car.badge ?? 'GEBRAUCHTWAGEN'}
        </span>
        {hasAccidents && (
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-flag-red border border-white/60" />
        )}
      </div>
      <div className="px-3.5 pt-3.5">
        <div className="text-[10px] text-bmw-gray-muted uppercase tracking-wider mb-1">BMW Niederlassung</div>
        <div className="text-sm font-bold text-bmw-dark leading-tight">{car.name}</div>
        {car.subtitle && <div className="text-xs text-bmw-gray-text mt-0.5">{car.subtitle}</div>}
        <div className="text-xl font-bold text-bmw-dark mt-2.5">
          {car.price.toLocaleString('de-DE')} <span className="text-xs font-normal text-bmw-gray-muted">€</span>
        </div>
      </div>
      <div className="px-3.5 py-3 text-xs text-bmw-gray-text border-t border-gray-100 mt-3 flex justify-between">
        <span>{car.km.toLocaleString('de-DE')} km</span>
        <span>EZ {car.erstzulassung ?? car.yearBuilt}</span>
        <span>{car.enginePower ?? ''}</span>
      </div>
    </Link>
  );
}
