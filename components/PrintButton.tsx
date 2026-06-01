'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-bmw-blue text-white text-sm font-semibold rounded-sm hover:bg-blue-700"
    >
      Bericht drucken / als PDF speichern
    </button>
  );
}
