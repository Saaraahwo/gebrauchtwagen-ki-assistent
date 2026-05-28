'use client';

import { useState } from 'react';
import type { Car } from '@/lib/cars/types';
import { CarSVG } from './CarSVG';
import { AnalysisPanel } from './AnalysisPanel';

function svgType(name: string): 'sedan' | 'suv' | 'cabrio' {
  if (/X[0-9]|iX/i.test(name)) return 'suv';
  if (/Cabriolet|Z4/i.test(name)) return 'cabrio';
  return 'sedan';
}

export function CarDetail({ car }: { car: Car }) {
  const [activeImg, setActiveImg] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [showAnalysis, setShowAnalysis] = useState(false);

  const slides = [
    { url: car.imgExterior, label: 'Exterieur' },
    { url: car.imgInterior, label: 'Interieur' },
  ].filter((s): s is { url: string; label: string } => !!s.url);

  const currentUrl = slides[activeImg]?.url;
  const hasImgError = imgErrors[activeImg];

  return (
    <>
      {/* Full-width gallery */}
      <div className="relative h-[340px] bg-bmw-dark overflow-hidden">
        {currentUrl && !hasImgError ? (
          <img
            src={currentUrl}
            alt={car.name}
            className="w-full h-full object-cover"
            onError={() => setImgErrors(e => ({ ...e, [activeImg]: true }))}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center p-8"
            style={{ background: `linear-gradient(135deg, ${car.colorHex ?? '#333'}20, ${car.colorHex ?? '#333'}50)` }}
          >
            <CarSVG color={car.colorHex} type={svgType(car.name)} />
          </div>
        )}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-12 h-8 overflow-hidden border-2 rounded-sm transition-colors ${i === activeImg ? 'border-bmw-blue' : 'border-white/40'}`}
              >
                <img src={s.url} alt={s.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {slides.length > 0 && (
          <div className="absolute bottom-3 right-3 bg-black/55 text-white text-[10px] px-2 py-1 rounded-full">
            {slides[activeImg]?.label} {activeImg + 1} / {slides.length}
          </div>
        )}
      </div>

      {/* 2-col layout */}
      <div className="max-w-layout mx-auto px-6 py-5 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-4">

          {/* Title card */}
          <div className="bg-white border border-bmw-gray-border p-4">
            <div className="text-[9px] text-bmw-gray-muted uppercase tracking-wider mb-1">BMW Niederlassung</div>
            <h1 className="text-xl font-bold">{car.name}</h1>
            {car.subtitle && <div className="text-sm text-bmw-gray-text mt-0.5">{car.subtitle}</div>}
            <div className="flex flex-wrap gap-1.5 mt-3 items-center">
              <span className="bg-bmw-gray-bg border border-bmw-gray-border text-xs px-2 py-0.5 rounded-sm">{car.km.toLocaleString('de-DE')} km</span>
              <span className="bg-bmw-gray-bg border border-bmw-gray-border text-xs px-2 py-0.5 rounded-sm">EZ {car.erstzulassung ?? car.yearBuilt}</span>
              {car.enginePower && <span className="bg-bmw-gray-bg border border-bmw-gray-border text-xs px-2 py-0.5 rounded-sm">{car.enginePower}</span>}
              {car.fuel && <span className="bg-bmw-gray-bg border border-bmw-gray-border text-xs px-2 py-0.5 rounded-sm">{car.fuel}</span>}
              {car.colorHex && (
                <span className="w-3.5 h-3.5 rounded-full border border-black/20 inline-block flex-shrink-0" style={{ background: car.colorHex }} />
              )}
              {car.color && <span className="text-xs text-bmw-gray-text">{car.color}</span>}
              {car.badge && <span className="bg-flag-green text-white text-[9px] font-bold px-1.5 py-0.5 tracking-wide">{car.badge}</span>}
            </div>
            {car.accidents.length > 0 && (
              <div className="mt-2 text-xs text-bmw-gray-muted">
                {car.accidents.length} Unfall{car.accidents.length > 1 ? 'schäden' : ''} repariert
                {car.accidents.reduce((s, a) => s + (a.repairCost ?? 0), 0) > 0 &&
                  ` · Reparatur: ${car.accidents.reduce((s, a) => s + (a.repairCost ?? 0), 0).toLocaleString('de-DE')} €`}
              </div>
            )}
            {car.description && (
              <div className="mt-2.5 text-xs text-bmw-gray-text italic border-t border-bmw-gray-bg pt-2.5">{car.description}</div>
            )}
          </div>

          {/* Tech specs */}
          <div className="bg-white border border-bmw-gray-border p-4">
            <h2 className="text-sm font-bold mb-3">Technische Daten</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <dt className="text-bmw-gray-muted">Kilometerstand</dt><dd className="font-medium">{car.km.toLocaleString('de-DE')} km</dd>
              {car.erstzulassung && <><dt className="text-bmw-gray-muted">Erstzulassung</dt><dd className="font-medium">{car.erstzulassung}</dd></>}
              <dt className="text-bmw-gray-muted">Baujahr</dt><dd className="font-medium">{car.yearBuilt}</dd>
              <dt className="text-bmw-gray-muted">Vorbesitzer</dt><dd className="font-medium">{car.owners}</dd>
              <dt className="text-bmw-gray-muted">Service-Einträge</dt><dd className="font-medium">{car.maintenanceRecords}</dd>
              {car.hu && <><dt className="text-bmw-gray-muted">HU bis</dt><dd className="font-medium">{car.hu}</dd></>}
              {car.fuel && <><dt className="text-bmw-gray-muted">Kraftstoff</dt><dd className="font-medium">{car.fuel}</dd></>}
              {car.transmission && <><dt className="text-bmw-gray-muted">Getriebe</dt><dd className="font-medium">{car.transmission}</dd></>}
              {car.enginePower && <><dt className="text-bmw-gray-muted">Leistung</dt><dd className="font-medium">{car.enginePower}</dd></>}
              {car.drive && <><dt className="text-bmw-gray-muted">Antrieb</dt><dd className="font-medium">{car.drive}</dd></>}
              {car.consumption && <><dt className="text-bmw-gray-muted">Verbrauch</dt><dd className="font-medium">{car.consumption} l/100km</dd></>}
              {car.emission && <><dt className="text-bmw-gray-muted">Abgasnorm</dt><dd className="font-medium">{car.emission}</dd></>}
              {car.doors && <><dt className="text-bmw-gray-muted">Türen / Sitze</dt><dd className="font-medium">{car.doors} / {car.seats ?? '–'}</dd></>}
              {car.color && <><dt className="text-bmw-gray-muted">Farbe</dt><dd className="font-medium">{car.color}</dd></>}
              {car.polster && <><dt className="text-bmw-gray-muted">Polster</dt><dd className="font-medium">{car.polster}</dd></>}
              {car.interiorColor && <><dt className="text-bmw-gray-muted">Innenfarbe</dt><dd className="font-medium">{car.interiorColor}</dd></>}
            </dl>
          </div>

          {/* Features */}
          {car.features.length > 0 && (
            <div className="bg-white border border-bmw-gray-border p-4">
              <h2 className="text-sm font-bold mb-3">Ausstattung</h2>
              <ul className="grid grid-cols-2 gap-y-1 text-xs">
                {car.features.map(f => (
                  <li key={f} className="text-bmw-dark">
                    <span className="text-bmw-blue mr-1">·</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right sticky sidebar */}
        <div className="lg:sticky lg:top-4 flex flex-col gap-4">
          <div className="bg-white border border-bmw-gray-border p-4">
            <div className="text-2xl font-bold">{car.price.toLocaleString('de-DE')} €</div>
            <div className="text-xs text-bmw-gray-muted mt-1">
              {car.km.toLocaleString('de-DE')} km · EZ {car.erstzulassung ?? car.yearBuilt}
            </div>
            <button
              onClick={() => setShowAnalysis(true)}
              className="w-full mt-4 py-3 bg-bmw-blue text-white font-semibold text-sm hover:bg-blue-700 rounded-sm transition-colors"
            >
              🤖 KI-Analyse starten
            </button>
            <button className="w-full mt-2 py-2.5 border border-bmw-gray-border text-sm rounded-sm hover:bg-bmw-gray-bg text-bmw-dark transition-colors">
              Probefahrt vereinbaren
            </button>
          </div>
        </div>
      </div>

      {/* KI-Analyse modal — rendered from this component, controlled by local state */}
      {showAnalysis && <AnalysisPanel car={car} onClose={() => setShowAnalysis(false)} />}
    </>
  );
}
