import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-bmw-gray-border mt-8 py-4">
      <div className="max-w-layout mx-auto px-6 flex flex-wrap gap-4 text-[11px] text-bmw-gray-muted">
        <span>BMW Niederlassung Braunschweig — Demo</span>
        <Link href="/datenschutz" className="text-bmw-blue hover:underline">Datenschutz</Link>
      </div>
    </footer>
  );
}
