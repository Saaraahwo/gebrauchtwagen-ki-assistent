'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardData {
  sellerInfo: { email: string; name: string };
  statistics: { carsAnalyzed: number; commonAnomalies: { type: string; count: number }[] };
  trainingData: Record<string, { title: string; questions: string[]; answers?: Record<string, string> }>;
  faqPack: { downloadUrl: string; format: string };
}

export function SellerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/sellers/dashboard')
      .then(r => {
        if (r.status === 401) {
          router.push('/login');
          return null;
        }
        return r.json();
      })
      .then(setData);
  }, [router]);

  async function logout() {
    await fetch('/api/sellers/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!data) return <div className="p-8 text-bmw-gray-muted">Lade…</div>;

  return (
    <div className="max-w-layout mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Verkäufer-Dashboard</h1>
        <button onClick={logout} className="text-sm text-bmw-blue hover:underline">
          Abmelden
        </button>
      </div>

      <section className="bg-white border border-bmw-gray-border p-6">
        <h2 className="font-bold mb-3">Statistik</h2>
        <p className="text-sm">
          Autos analysiert: <strong>{data.statistics.carsAnalyzed}</strong>
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {data.statistics.commonAnomalies.map(a => (
            <li key={a.type}>· {a.type}: {a.count}</li>
          ))}
        </ul>
      </section>

      <section className="bg-white border border-bmw-gray-border p-6">
        <h2 className="font-bold mb-3">Schulung</h2>
        {Object.entries(data.trainingData).map(([key, td]) => (
          <div key={key} className="mb-4">
            <h3 className="text-sm font-semibold">{td.title}</h3>
            <ul className="text-xs text-bmw-gray-text mt-1 space-y-1">
              {td.questions.map((q, i) => <li key={i}>· {q}</li>)}
            </ul>
          </div>
        ))}
      </section>

      <section className="bg-white border border-bmw-gray-border p-6">
        <h2 className="font-bold mb-3">FAQ-Pack</h2>
        <a
          href={data.faqPack.downloadUrl}
          className="inline-block px-4 py-2 bg-bmw-blue text-white text-sm rounded-sm"
          download
        >
          FAQ-Pack herunterladen
        </a>
      </section>
    </div>
  );
}
