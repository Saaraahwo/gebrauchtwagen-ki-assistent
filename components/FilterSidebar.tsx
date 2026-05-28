'use client';

import { useState } from 'react';

export interface FilterState {
  priceMin?: number;
  priceMax?: number;
  kmMax?: number;
  yearMin?: number;
  fuel?: string[];
  transmission?: string[];
}

interface FilterSidebarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}

export function FilterSidebar({ value, onChange, onReset }: FilterSidebarProps) {
  // Track which sections are open. All default to open for visibility.
  const [open, setOpen] = useState({
    price: true, km: true, year: true, fuel: true, transmission: true,
  });
  const toggle = (k: keyof typeof open) => setOpen(s => ({ ...s, [k]: !s[k] }));

  const setField = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    onChange({ ...value, [k]: v });

  const toggleChip = (key: 'fuel' | 'transmission', chip: string) => {
    const current = value[key] ?? [];
    const next = current.includes(chip)
      ? current.filter(c => c !== chip)
      : [...current, chip];
    setField(key, next.length ? next : undefined);
  };

  return (
    <aside className="space-y-0.5">
      <div className="text-[11px] font-bold text-bmw-gray-muted tracking-widest uppercase mb-3">
        Filter
      </div>

      {/* PREIS */}
      <Section title="Preis" open={open.price} onToggle={() => toggle('price')}>
        <div className="flex gap-2 pt-2.5">
          <input
            type="number"
            placeholder="von €"
            value={value.priceMin ?? ''}
            onChange={e => setField('priceMin', e.target.value ? Number(e.target.value) : undefined)}
            className="flex-1 px-2.5 py-2 border border-bmw-gray-border rounded-sm text-xs bg-gray-50"
          />
          <input
            type="number"
            placeholder="bis €"
            value={value.priceMax ?? ''}
            onChange={e => setField('priceMax', e.target.value ? Number(e.target.value) : undefined)}
            className="flex-1 px-2.5 py-2 border border-bmw-gray-border rounded-sm text-xs bg-gray-50"
          />
        </div>
      </Section>

      {/* KILOMETER */}
      <Section title="Kilometerstand" open={open.km} onToggle={() => toggle('km')}>
        <div className="flex gap-2 pt-2.5">
          <input
            type="number"
            placeholder="max km"
            value={value.kmMax ?? ''}
            onChange={e => setField('kmMax', e.target.value ? Number(e.target.value) : undefined)}
            className="flex-1 px-2.5 py-2 border border-bmw-gray-border rounded-sm text-xs bg-gray-50"
          />
        </div>
      </Section>

      {/* BAUJAHR */}
      <Section title="Baujahr" open={open.year} onToggle={() => toggle('year')}>
        <div className="flex gap-2 pt-2.5">
          <input
            type="number"
            placeholder="ab"
            value={value.yearMin ?? ''}
            onChange={e => setField('yearMin', e.target.value ? Number(e.target.value) : undefined)}
            className="flex-1 px-2.5 py-2 border border-bmw-gray-border rounded-sm text-xs bg-gray-50"
          />
        </div>
      </Section>

      {/* KRAFTSTOFF */}
      <Section title="Kraftstoff" open={open.fuel} onToggle={() => toggle('fuel')}>
        <div className="flex flex-wrap gap-1.5 pt-2.5">
          {['Benzin', 'Diesel', 'Elektro', 'Hybrid'].map(c => (
            <Chip key={c} on={(value.fuel ?? []).includes(c)} onClick={() => toggleChip('fuel', c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Section>

      {/* GETRIEBE */}
      <Section title="Getriebe" open={open.transmission} onToggle={() => toggle('transmission')}>
        <div className="flex flex-wrap gap-1.5 pt-2.5">
          {['Schaltgetriebe', 'Automatik'].map(c => (
            <Chip key={c} on={(value.transmission ?? []).includes(c)} onClick={() => toggleChip('transmission', c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Section>

      <div className="mt-3">
        <button
          onClick={onReset}
          className="w-full py-2.5 bg-gray-100 border border-bmw-gray-border rounded-sm text-xs text-bmw-gray-text font-medium hover:bg-gray-200"
        >
          Filter zurücksetzen
        </button>
      </div>
    </aside>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-bmw-gray-border bg-white">
      <div
        onClick={onToggle}
        className="px-4 py-3.5 flex justify-between items-center cursor-pointer text-[13px] font-semibold hover:bg-gray-50 select-none"
      >
        <span>{title}</span>
        <span className={`text-[10px] text-bmw-gray-muted transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </div>
      {open && <div className="px-4 pb-4 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 border rounded-full text-xs font-medium ${
        on
          ? 'bg-bmw-blue text-white border-bmw-blue'
          : 'bg-white text-bmw-gray-text border-bmw-gray-border hover:border-bmw-blue hover:text-bmw-blue'
      }`}
    >
      {children}
    </button>
  );
}
