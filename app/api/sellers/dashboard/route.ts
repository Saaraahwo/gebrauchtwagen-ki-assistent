import { NextResponse, type NextRequest } from 'next/server';
import { requireSellerFromRequest, AuthError } from '@/lib/auth/require-seller';
import { sellers } from '@/lib/auth/sellers';

export async function GET(req: NextRequest) {
  let seller;
  try {
    seller = requireSellerFromRequest(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  // Dashboard data ported VERBATIM from master server.js:1019-1067.
  const dashboardData = {
    sellerInfo: {
      email: seller.email,
      name: sellers[seller.email]?.name ?? seller.email,
    },
    statistics: {
      carsAnalyzed: 47,
      commonAnomalies: [
        { type: 'Too many owners', count: 12 },
        { type: 'Low maintenance history', count: 8 },
        { type: 'High mileage', count: 15 },
      ],
    },
    trainingData: {
      accidentCars: {
        title: 'Unfallwagen erkennen',
        questions: [
          'Hat das Auto jemals Unfallschäden?',
          'War das Fahrzeug jemals stillgelegt?',
          'Gibt es undefinierte Lücken in der Servicehistorie?',
        ],
        answers: {
          'Lackschaden': 'Kann repariert werden, aber Farbe muss stimmen. Langfristig: Rost möglich wenn schlecht gemacht.',
          'Motorschaden': 'Motorwechsel bedeutet kompletter neuer Motor. Garantie 12 Monate typisch. Langfristig: Sollte zuverlässig sein wenn Original-Teile.',
          'Strukturschaden': 'SEHR KRITISCH. A-Säule beschädigt = Sicherheitsrisiko. Auto kann unsicher fahren.',
        },
      },
      highMileage: {
        title: 'Hoher Kilometerstand',
        questions: [
          'Wann wurde letzte große Wartung gemacht?',
          'Wurden Verschleißteile ausgetauscht (Bremsen, Reifen)?',
          'Gibt es Anzeichen für Motorprobleme?',
        ],
      },
      manyOwners: {
        title: 'Zu viele Besitzer',
        questions: [
          'Warum gab es so häufige Besitzerwechsel?',
          'Waren immer regelmäßige Wartungen?',
          'Gibt es Reklamationen im Internet über dieses Fahrzeug?',
        ],
      },
    },
    faqPack: {
      downloadUrl: '/api/sellers/faq-pack',
      format: 'PDF mit allen Standardfragen und Antworten',
    },
  };

  return NextResponse.json(dashboardData);
}
