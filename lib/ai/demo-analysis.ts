import type { Car, Findings } from '@/lib/cars/types';
import { getSchadenFolgen } from '@/lib/cars/damage-db';

export function generateDemoAnalysis(carData: Car, findings: Findings): string {
  const age = new Date().getFullYear() - carData.yearBuilt;
  const expectedKm = age * 12000;
  const kmDiff = carData.km - expectedKm;
  const kmPerYear = Math.round(carData.km / age);
  const hasAccidents = carData.accidents && carData.accidents.length > 0;
  const totalRepairCost = hasAccidents
    ? carData.accidents.reduce((sum, a) => sum + (a.repairCost || 0), 0)
    : 0;

  let a = `TRANSPARENTE KI-ANALYSE\n`;
  a += `${'─'.repeat(42)}\n\n`;

  a += `SCHRITT 1: FAHRZEUGWERTE\n\n`;
  a += `Alter: ${age} Jahre → ${age <= 5 ? '✅ Neuwertig' : age <= 10 ? '🟡 Normal' : '🟡 Erfahrenes Fahrzeug – Inspektionscheck empfohlen'}\n`;
  a += `Km: ${carData.km.toLocaleString('de-DE')} (${kmPerYear.toLocaleString('de-DE')} km/J, Ø Deutschland: 13.000 km/J)\n`;
  a += `→ ${kmDiff > 30000 ? '🟡 Überdurchschnittlich – Wartungsplan empfehlenswert' : kmDiff > 0 ? '🟡 Leicht über Durchschnitt' : '✅ Unter Durchschnitt – gut'}\n`;
  a += `Vorbesitzer: ${carData.owners} → ${carData.owners > Math.ceil(age / 3) ? `🟡 Mehrere Besitzer (dokumentiert)` : '✅ Normal'}\n`;
  a += `Service: ${carData.maintenanceRecords} Einträge (erwartet ~${age * 2}) → ${carData.maintenanceRecords === 0 ? '🟡 Servicehistorie beim Verkäufer anfragen' : carData.maintenanceRecords < age ? '🟡 Teilweise vorhanden' : '✅ Vollständig'}\n\n`;

  if (hasAccidents) {
    a += `${'─'.repeat(42)}\n`;
    a += `SCHRITT 2: UNFALLSCHÄDEN & LANGZEITFOLGEN\n\n`;
    const folgen = getSchadenFolgen(carData.accidents);
    (folgen ?? []).forEach(({ acc, db }, i) => {
      a += `Unfall ${i + 1}: ${acc.type} (${acc.date})\n`;
      a += `Schaden: ${acc.damage}\n`;
      a += `Reparaturkosten damals: ${acc.repairCost ? acc.repairCost.toLocaleString('de-DE') + ' €' : 'unbekannt'}\n`;
      if (db) {
        a += `\n  ⏱ Kurzfristig:\n  ${db.kurzfristig}\n`;
        a += `\n  📅 In 2–3 Jahren:\n  ${db.mittelfristig}\n`;
        a += `\n  ⚠ Langfristig (5+ Jahre):\n  ${db.langfristig}\n`;
        a += `\n  🔍 Prüfung empfohlen:\n  ${db.pruefung}\n`;
        a += `\n  💡 ADAC-Tipp:\n  ${db.adacTipp}\n`;
        a += `\n  💶 Mögliche Folgekosten: ${db.kosten}\n`;
        a += `  📉 Wertverlust: ${db.preisAbzug}\n`;
      }
      a += '\n';
    });
    a += `Gesamte bisherige Reparaturkosten: ${totalRepairCost.toLocaleString('de-DE')} €\n\n`;
  }

  a += `${'─'.repeat(42)}\n`;
  a += `SCHRITT 3: REPARATURPLAN 12 MONATE\n\n`;
  const repairs: { item: string; cost: string; prio: string }[] = [];
  if (carData.maintenanceRecords === 0) repairs.push({ item: 'Komplettinspektion (fehlende Services aufholen)', cost: '300–700 €', prio: '⛔ SOFORT' });
  if (carData.km > 100000) repairs.push({ item: 'Zahnriemen/Steuerkette + Wasserpumpe prüfen', cost: '200–600 €', prio: '⚠ Hoch' });
  if (carData.km > 60000) repairs.push({ item: 'Bremsbeläge + -scheiben prüfen', cost: '200–600 €', prio: '🟡 Mittel' });
  if (age > 5) repairs.push({ item: 'Batterie prüfen (Lebensdauer ~5–7 J.)', cost: '80–180 €', prio: '🟡 Mittel' });
  if (age > 8) repairs.push({ item: 'Kühlwasser + Dichtungen prüfen', cost: '50–300 €', prio: '🟡 Mittel' });
  if (hasAccidents) repairs.push({ item: 'Gutachten Unfallreparatur (DEKRA/TÜV)', cost: '200–400 €', prio: '⚠ Empfohlen' });
  if (repairs.length === 0) repairs.push({ item: 'Reguläre Hauptuntersuchung (HU)', cost: '50–100 €', prio: '✅ Normal' });
  repairs.forEach(r => { a += `[${r.prio}] ${r.item} → ${r.cost}\n`; });

  a += `\n${'─'.repeat(42)}\n`;
  a += `TOP 5 FRAGEN AN DEN VERKÄUFER\n\n`;
  a += `1. Können Sie alle Wartungsrechnungen der letzten 3 Jahre vorlegen?\n`;
  if (hasAccidents) {
    a += `2. Von welcher Werkstatt wurde repariert, und gibt es Garantie auf die Reparatur?\n`;
    a += `3. Liegt ein DEKRA/TÜV-Gutachten über die Reparatur vor?\n`;
  } else {
    a += `2. Warum verkaufen Sie das Auto – gibt es bekannte technische Probleme?\n`;
    a += `3. War das Fahrzeug jemals in einen Unfall verwickelt, auch kleinere?\n`;
  }
  a += `4. Darf ich das Auto vor dem Kauf zu einem unabhängigen Kfz-Meister bringen?\n`;
  a += `5. Ist der Preis verhandelbar wenn der TÜV Mängel feststellt?\n`;

  a += `\n${'─'.repeat(42)}\n`;
  const rf = findings.red.length;
  a += rf >= 2 ? `💡 FAZIT: Einige Punkte zur Beachtung. Mit einem unabhängigen Check und gezielter Verhandlung ein gutes Angebot.\n`
    : rf === 1 ? `💡 FAZIT: Ein Punkt zur Klärung. Sprechen Sie den Verkäufer an – oft lässt sich der Preis entsprechend anpassen.\n`
    : findings.orange.length > 0 ? `✅ FAZIT: Überschaubarer Aufwand. Guter Kauf mit realistischer Kostenplanung.\n`
    : `✅ FAZIT: Solides Fahrzeug. Kurze Inspektion zur Bestätigung empfohlen.\n`;

  a += `\n[Demo-Modus – mit echtem Claude API Key wird die Analyse personalisierter]`;
  return a;
}
