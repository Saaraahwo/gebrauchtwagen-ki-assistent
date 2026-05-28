'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-xl font-bold text-bmw-dark">Etwas ist schiefgelaufen</h2>
        <p className="text-bmw-gray-text">Bitte versuchen Sie es erneut.</p>
        <button
          onClick={reset}
          className="px-5 py-2 bg-bmw-blue text-white rounded-sm hover:bg-blue-700"
        >
          Neu versuchen
        </button>
      </div>
    </div>
  );
}
