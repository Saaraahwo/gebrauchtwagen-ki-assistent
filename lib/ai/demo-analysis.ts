import type { Car, Findings } from '@/lib/cars/types';
import { getSchadenFolgen } from '@/lib/cars/damage-db';

export function generateDemoAnalysis(carData: Car, findings: Findings): string {
  const age = new Date().getFullYear() - carData.yearBuilt;
  const expectedKm = age * 12000;
  const kmDiff = carData.km - expectedKm;
  const kmPerYear = Math.round(carData.km / Math.max(1, age));
  const hasAccidents = carData.accidents && carData.accidents.length > 0;
  const totalRepairCost = hasAccidents
    ? carData.accidents.reduce((sum, a) => sum + (a.repairCost || 0), 0)
    : 0;

  const rf = findings.red.length;

  let a = '';

  // ── Fahrzeugwerte ──
  a += `Baujahr ${carData.yearBuilt}, ${age} Jahre alt. `;
  a += `Kilometerstand: ${carData.km.toLocaleString('de-DE')} km (${kmPerYear.toLocaleString('de-DE')} km/Jahr, Ø Deutschland: 13.000 km/Jahr). `;
  if (kmDiff > 30000) {
    a += `Leicht überdurchschnittliche Laufleistung — für einen gut gepflegten ${carData.fuel === 'Diesel' ? 'Diesel' : 'Benziner'} kein Problem, aber einen Wartungsplan einplanen.\n\n`;
  } else if (kmDiff > 0) {
    a += `Leicht über dem Schnitt, vollständig im normalen Bereich.\n\n`;
  } else {
    a += `Unterdurchschnittliche Laufleistung — sehr gut.\n\n`;
  }

  a += `Vorbesitzer: ${carData.owners}`;
  const maxNormal = Math.ceil(age / 3);
  a += carData.owners > maxNormal
    ? ` — für ${age} Jahre etwas häufiger gewechselt. Servicehistorie für alle Besitzphasen prüfen.\n`
    : ` — unauffällig für dieses Alter.\n`;

  a += `Service: ${carData.maintenanceRecords} Einträge (erwartet ca. ${age * 2})`;
  a += carData.maintenanceRecords === 0
    ? ` — Servicehistorie beim Verkäufer anfragen. Oft lassen sich fehlende Einträge per Werkstattrechnung nachweisen.\n\n`
    : carData.maintenanceRecords < age
    ? ` — teilweise vorhanden. Fehlende Einträge beim Verkäufer ansprechen.\n\n`
    : ` — vollständig. Gut.\n\n`;

  // ── Unfallschäden ──
  if (hasAccidents) {
    a += `UNFALLSCHÄDEN\n\n`;
    const folgen = getSchadenFolgen(carData.accidents);
    (folgen ?? []).forEach(({ acc, db }, i) => {
      a += `Unfall ${i + 1}: ${acc.type} (${acc.date}), Schaden: ${acc.damage}`;
      if (acc.repairCost) a += `, Reparaturkosten: ${acc.repairCost.toLocaleString('de-DE')} €`;
      a += '.\n';
      if (db) {
        a += `Kurzfristig: ${db.kurzfristig}\n`;
        a += `Langfristig: ${db.langfristig}\n`;
        a += `Empfehlung: ${db.adacTipp}\n`;
      }
      a += '\n';
    });
    if (totalRepairCost > 0) {
      a += `Bisherige Reparaturkosten gesamt: ${totalRepairCost.toLocaleString('de-DE')} €. `;
      a += `Ein dokumentierter Schaden ist ehrlicher als ein nicht gemeldeter — mit Originalrechnung und Gutachten sind Sie auf der sicheren Seite.\n\n`;
    }
  }

  // ── Wartungsausblick ──
  const repairs: string[] = [];
  if (carData.maintenanceRecords === 0) repairs.push('Komplettinspektion (fehlende Services aufholen): 300–700 €');
  if (carData.km > 100000) repairs.push('Zahnriemen/Steuerkette + Wasserpumpe prüfen: 200–600 €');
  if (carData.km > 60000) repairs.push('Bremsbeläge und -scheiben kontrollieren: 200–600 €');
  if (age > 5) repairs.push('Batterie prüfen (Lebensdauer 5–7 Jahre): 80–180 €');
  if (hasAccidents) repairs.push('Gutachten Unfallreparatur (DEKRA/TÜV): 200–400 €');
  if (repairs.length === 0) repairs.push('Reguläre Hauptuntersuchung: 50–100 €');

  a += `Geplante Kosten nächste 12 Monate:\n`;
  repairs.forEach(r => { a += `· ${r}\n`; });
  a += '\n';

  // ── Käuferfragen ──
  a += `Fragen, die Sie dem Verkäufer stellen sollten:\n`;
  a += `· Können Sie alle Wartungsrechnungen der letzten 3 Jahre vorlegen?\n`;
  if (hasAccidents) {
    a += `· Von welcher Werkstatt wurde repariert, und gibt es Garantie auf die Reparatur?\n`;
    a += `· Liegt ein DEKRA/TÜV-Gutachten über die Reparatur vor?\n`;
  } else {
    a += `· War das Fahrzeug jemals in einen Unfall verwickelt, auch kleinere?\n`;
  }
  a += `· Darf ich das Auto vor dem Kauf zu einem unabhängigen Kfz-Meister bringen?\n`;
  a += `· Ist der Preis verhandelbar, wenn der TÜV Mängel feststellt?\n\n`;

  // ── Fazit ──
  a += rf >= 2
    ? `Fazit: Einige Punkte zur Klärung. Mit einem unabhängigen Check und gezielter Verhandlung ein solides Angebot.\n`
    : rf === 1
    ? `Fazit: Ein Punkt zur Klärung. Sprechen Sie den Verkäufer an — oft lässt sich der Preis entsprechend anpassen.\n`
    : findings.orange.length > 0
    ? `Fazit: Überschaubarer Aufwand. Guter Kauf mit realistischer Kostenplanung.\n`
    : `Fazit: Solides Fahrzeug ohne wesentliche Auffälligkeiten. Kurze Inspektion zur Bestätigung empfohlen.\n`;

  a += `\n[Demo-Modus – mit echtem Claude API Key wird die Analyse personalisierter]`;
  return a;
}
