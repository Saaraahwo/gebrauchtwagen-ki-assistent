import { NextResponse, type NextRequest } from 'next/server';
import { requireSellerFromRequest, AuthError } from '@/lib/auth/require-seller';

const FAQ_TEXT = `
GEBRAUCHTWAGEN-VERKÄUFER FAQ PACK
==================================

1. UNFALLWAGEN - LACKSCHÄDEN
Frage: "Hat das Auto jemals Unfallschaden gehabt?"
Antwort: "Das Auto hatte einen kleinen Unfall hinten mit Lackschaden. Das wurde von einer zertifizierten Werkstatt repariert und die Farbe wurde angepasst. Alle Rechnungen sind vorhanden."
Langzeitfolgen: Wenn professionell gemacht, kein Problem. Wenn schlecht, kann Rost entstehen.

2. UNFALLWAGEN - MOTORSCHADEN
Frage: "War der Motor jemals defekt?"
Antwort: "Der Motor wurde ausgetauscht und wir haben einen zertifizierten Austauschmotor mit 12 Monaten Garantie eingebaut."
Langzeitfolgen: Sollte zuverlässig sein. Wichtig: Rechnung des Tausches prüfen.

3. UNFALLWAGEN - STRUKTURSCHADEN
Frage: "Wurde die A-Säule beschädigt?"
Antwort: "Ja, es gab einen Strukturschaden der repariert wurde. Das Auto hat die Hauptuntersuchung bestanden."
Warnung: Strukturschäden sind kritisch für Sicherheit. Zweite Inspektion empfohlen.

4. HOHER KILOMETERSTAND
Frage: "Das Auto hat viele Kilometer..."
Antwort: "Das Auto wurde viel gefahren, aber alle Services wurden durchgeführt. Die Verschleißteile wurden regelmäßig ausgetauscht."
Tipp: Fordern Sie die komplette Servicehistorie an.

5. ZU VIELE BESITZER
Frage: "Warum gab es so viele Besitzer?"
Antwort: "Das ist ein beliebtes Modell. Alle Besitzer haben das Auto gut gepflegt."
Hinweis: Das ist verdächtig. Höchstens 1-2 Besitzer pro 3 Jahre ist normal.

6. ALTE FAHRZEUGE
Frage: "Das Auto ist ja schon recht alt..."
Antwort: "Ja, es ist älter. Aber es wurde gut gepflegt und alle großen Arbeiten wurden gemacht."
Tipp: Besondere Inspektion auf Rost und Elektrik durchführen.

7. KOMISCHE AUSSTATTUNG
Frage: "Diese Scheinwerfer - sind die legal?"
Antwort: "Die Scheinwerfer sind TÜV-geprüft und zugelassen."
Hinweis: Prüfen Sie das genau. Bunte Scheinwerfer sind oft nicht legal.

8. FEHLENDE SERVICEHISTORIE
Frage: "Wo sind die Serviceunterlagen?"
Antwort: "Das Auto wurde bei einem privaten Mechaniker gewartet."
Warnung: Das ist problematisch. Sie haben keinen Nachweis. Fordern Sie wenigstens Fotos/Rechnungen.

9. VERDÄCHTIG NIEDRIGER PREIS
Frage: "Warum ist der Preis so niedrig?"
Antwort: "Wir brauchen schnell Platz und haben einen fairen Preis gesetzt."
Hinweis: Billigpreise für teurere Autos = versteckte Mängel. Intensive Prüfung.

10. ALLGEMEINE FRAGEN
Frage: "Können Sie eine Inspektion machen?"
Antwort: "Ja, gerne. Der TÜV kann eine Untersuchung durchführen."

Frage: "Garantie?"
Antwort: "Privatverkauf = keine Garantie. Der Zustand ist wie besichtigt."

Frage: "Kann ich das Auto Probe fahren?"
Antwort: "Ja, mit gültigem Führerschein und Versicherung."
  `;

export async function GET(req: NextRequest) {
  try {
    requireSellerFromRequest(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    throw e;
  }

  return new NextResponse(FAQ_TEXT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="FAQ-Pack.txt"',
    },
  });
}
