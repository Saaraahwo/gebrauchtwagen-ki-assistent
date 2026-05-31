import type { Car } from './types';

export interface FeatureExplanation {
  term: string;
  description: string;
}

interface GlossaryEntry {
  match: RegExp;
  term: string;
  description: string;
}

// Plain-language explanations for BMW trim/package/equipment jargon a buyer may
// not know. Obvious items (Bluetooth, USB, PDC, Tempomat …) are intentionally
// skipped. Matched against the car's subtitle and feature list.
const GLOSSARY: GlossaryEntry[] = [
  // Lines & packages
  { match: /m.?sport|sportpaket/i, term: 'M Sportpaket', description: 'Sportlich abgestimmtes Paket: strafferes Fahrwerk, M Aerodynamik, Sportsitze, M Lenkrad und größere Räder. Steigert Optik und Wiederverkaufswert.' },
  { match: /competition/i, term: 'Competition', description: 'Leistungsgesteigerte Top-Version der M-Modelle: mehr PS, strafferes Fahrwerk und spezifische Optik.' },
  { match: /shadow edition/i, term: 'Shadow Edition', description: 'Optikpaket mit abgedunkelten Chrom- und Zierelementen (Niere, Scheinwerfer, Endrohre) für einen dezent-sportlichen Auftritt.' },
  { match: /luxury line/i, term: 'Luxury Line', description: 'Komfort- und Eleganz-Linie mit hochwertigen Materialien und dezenter Chromoptik statt Sport-Look.' },
  { match: /urban line/i, term: 'Urban Line', description: 'Stadt-orientierte Ausstattungslinie mit eigener, schlichter Optik – alltagstauglich.' },
  { match: /advantage/i, term: 'Advantage Paket', description: 'Preis-Leistungs-Paket mit den wichtigsten Komfort-Extras (z. B. Klimaautomatik, PDC, Tempomat).' },
  { match: /premium paket/i, term: 'Premium Paket', description: 'Umfangreiches Komfort- und Technikpaket (z. B. Leder, Navigation, erweiterte Assistenz).' },
  // Drivetrain & body
  { match: /xdrive/i, term: 'xDrive (Allrad)', description: 'BMWs intelligenter Allradantrieb für mehr Traktion bei Nässe und Schnee. Werterhöhend gegenüber Heckantrieb (ca. 1.500–3.000 €).' },
  { match: /touring/i, term: 'Touring (Kombi)', description: 'Kombi-Karosserie mit großem, variablem Kofferraum – die familien- und transporttaugliche Variante.' },
  { match: /cabrio/i, term: 'Cabriolet', description: 'Offene Variante mit Verdeck. Saisonfahrzeug – Verdeckfunktion und Dichtungen unbedingt prüfen.' },
  { match: /steptronic|automatik/i, term: 'Steptronic (Automatik)', description: 'BMWs Automatikgetriebe mit manueller Schaltoption – komfortabel und ruckfrei.' },
  // Tech & comfort
  { match: /head-?up/i, term: 'Head-Up Display', description: 'Blendet Tempo, Navigation und Assistenz-Hinweise in die Windschutzscheibe ein – der Blick bleibt auf der Straße.' },
  { match: /laser/i, term: 'Laserlicht', description: 'BMW Laserlicht mit sehr großer Fernlicht-Reichweite. In AT/CH gelten strengere Zulassungsregeln (siehe Besonderheiten).' },
  { match: /adaptiv.*led|led.*adaptiv|adaptiver led/i, term: 'Adaptive LED-Scheinwerfer', description: 'Mitlenkendes, automatisch angepasstes LED-Licht für bessere Sicht in Kurven und bei Gegenverkehr.' },
  { match: /driving assistant|parking assistant|parkassistent/i, term: 'Assistenzsysteme', description: 'Fahr-/Parkassistenz: u. a. Spurhaltung, Abstandstempomat, Notbrems- und Parkassistent (Professional = erweiterter Umfang).' },
  { match: /nacht-?sicht/i, term: 'Nacht-Sicht-Assistent', description: 'Wärmebildkamera, die Personen und Tiere bei Dunkelheit frühzeitig erkennt.' },
  { match: /panorama|glasdach/i, term: 'Panorama-Glasdach', description: 'Großes Glasdach für mehr Licht im Innenraum. Dichtungen und Funktion auf Undichtigkeit prüfen.' },
  { match: /harman/i, term: 'Harman Kardon Sound', description: 'Premium-Soundsystem – deutlich besserer Klang als die Serienanlage.' },
  { match: /bang ?& ?olufsen|bowers ?& ?wilkins/i, term: 'High-End-Soundsystem', description: 'Soundsystem der Spitzenklasse (teure Aufpreis-Option) – ein echtes Ausstattungs-Highlight.' },
  { match: /fond entertainment/i, term: 'Fond Entertainment', description: 'Bildschirme und Unterhaltung für die Rücksitze – ideal für Familien und lange Fahrten.' },
  { match: /keramik/i, term: 'M Carbon Keramikbremse', description: 'Hochleistungs-Keramikbremse, extrem standfest. Ersatz ist teuer – Zustand der Scheiben prüfen.' },
  { match: /carbonpaket/i, term: 'Carbonpaket', description: 'Karbon-Zierteile außen/innen für sportliche Optik und etwas Gewichtsersparnis.' },
  { match: /m fahrwerk|adaptives fahrwerk/i, term: 'Adaptives M Fahrwerk', description: 'Elektronisch geregeltes Sportfahrwerk – per Knopfdruck zwischen komfortabel und straff wählbar.' },
  { match: /komfortzugang/i, term: 'Komfortzugang', description: 'Schlüsselloses Öffnen und Starten (Keyless).' },
  { match: /standheizung/i, term: 'Standheizung', description: 'Heizt den Innenraum vor dem Losfahren vor – im Winter besonders wertvoll.' },
  { match: /ambiente/i, term: 'Ambientebeleuchtung', description: 'Stimmungsbeleuchtung im Innenraum in mehreren Farben.' },
  { match: /leder/i, term: 'Lederausstattung', description: 'Hochwertige Lederausstattung (z. B. Dakota). Auf Risse und Verschleiß an Fahrersitz/Lenkrad prüfen.' },
  { match: /navi/i, term: 'Werksnavigation', description: 'Eingebautes Navigationssystem (Professional = größerer Bildschirm und mehr Funktionen als Business).' },
];

export function explainCarFeatures(car: Car): FeatureExplanation[] {
  const parts = [car.subtitle ?? '', ...(car.features ?? [])];
  const out: FeatureExplanation[] = [];
  const seen = new Set<string>();
  for (const entry of GLOSSARY) {
    if (seen.has(entry.term)) continue;
    if (parts.some(p => entry.match.test(p))) {
      seen.add(entry.term);
      out.push({ term: entry.term, description: entry.description });
    }
  }
  return out;
}
