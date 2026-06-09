import type { Car } from './types';

export const DEALER_CITY = 'Braunschweig';

export type RouteProfile = 'performance' | 'familie' | 'komfort' | 'effizienz' | 'cabrio' | 'allround';

export interface TestDrivePlan {
  headline: string;
  route: { description: string; mapsUrl: string };
  legs: { leg: string; actions: string[] }[];
  featureDemos: { feature: string; when: string }[];
}

function ps(car: Car): number {
  const m = (car.enginePower || '').match(/(\d+)\s*PS/);
  return m ? parseInt(m[1], 10) : 0;
}

function isMModel(car: Car): boolean {
  return /\bM[2-8]\b/.test(car.name);
}

export function routeProfile(car: Car): RouteProfile {
  const name = (car.name + ' ' + (car.subtitle || '')).toLowerCase();
  const feat = (car.features || []).join(' ').toLowerCase();
  const seats = car.seats ?? 5;
  if (name.includes('cabrio')) return 'cabrio';
  if (isMModel(car) || ps(car) >= 300) return 'performance';
  if (/touring|tourer|\bx[1-7]\b/.test(name) || seats >= 7) return 'familie';
  if (/leder|head-up|ambiente|komfortzugang|panorama/.test(feat)) return 'komfort';
  if ((car.fuel || '').toLowerCase() === 'diesel') return 'effizienz';
  return 'allround';
}

interface RouteTemplate {
  headline: string;
  destination: string;
  description: string;
  legs: { leg: string; actions: string[] }[];
}

const ROUTES: Record<RouteProfile, RouteTemplate> = {
  performance: {
    headline: 'Performance zeigen',
    destination: 'A2 Anschlussstelle Braunschweig-Watenbüttel',
    description: 'Stadtausfahrt → A2-Auffahrt → Landstraße über den Elm zurück, ca. 25 Min',
    legs: [
      { leg: 'Stadt', actions: ['Souveränes Anfahren und Ansprechverhalten zeigen'] },
      { leg: 'Autobahn (A2)', actions: ['Kontrollierte Beschleunigung 80→160 km/h', 'Durchzug und Laufruhe demonstrieren'] },
      { leg: 'Landstraße / Elm', actions: ['Kurvenverhalten und Bremsen zeigen', 'Sport-Fahrmodus und Sound vorführen'] },
    ],
  },
  familie: {
    headline: 'Familientauglichkeit',
    destination: 'Braunschweig Innenstadt',
    description: 'Ruhige Wohngebiets- und Schulwegrunde durch Braunschweig, ca. 20 Min',
    legs: [
      { leg: 'Vor der Fahrt', actions: ['Navigation und Entertainment aktivieren', 'Kofferraum und Platzangebot zeigen'] },
      { leg: 'Wohngebiet / Schulweg', actions: ['Ruhige, vorausschauende Fahrweise', 'Komfort über Bodenwellen zeigen'] },
      { leg: 'Parken', actions: ['Parkassistent beim Einparken demonstrieren'] },
    ],
  },
  komfort: {
    headline: 'Komfort erleben',
    destination: 'Braunschweig Bürgerpark',
    description: 'Ruhige Boulevard-Runde am Bürgerpark, ca. 20 Min',
    legs: [
      { leg: 'Boulevard', actions: ['Sitzkomfort und niedriges Geräuschniveau zeigen', 'Head-Up Display und Ambiente vorführen'] },
      { leg: 'Landstraße', actions: ['Souveränes Gleiten bei mittlerem Tempo'] },
    ],
  },
  effizienz: {
    headline: 'Effizienz beweisen',
    destination: 'Wolfenbüttel',
    description: 'Überlandfahrt Braunschweig → Wolfenbüttel und zurück, ca. 30 Min',
    legs: [
      { leg: 'Überland', actions: ['Momentan- und Durchschnittsverbrauch im Bordcomputer zeigen', 'Laufruhe bei konstant 100 km/h'] },
    ],
  },
  cabrio: {
    headline: 'Offenes Fahrerlebnis',
    destination: 'Elm',
    description: 'Landstraßenrunde Richtung Elm, ca. 30 Min',
    legs: [
      { leg: 'Vor der Fahrt', actions: ['Verdeck öffnen'] },
      { leg: 'Landstraße / Elm', actions: ['Offenes Fahren genießen', 'Windschott und Komfort bei offener Fahrt zeigen'] },
    ],
  },
  allround: {
    headline: 'Solide Allround-Probefahrt',
    destination: 'Braunschweig Stadtrunde',
    description: 'Mischung aus Stadt und Landstraße rund um Braunschweig, ca. 20 Min',
    legs: [
      { leg: 'Stadt', actions: ['Anfahren, Bremsen und Wendigkeit zeigen'] },
      { leg: 'Landstraße', actions: ['Schaltverhalten und Geräusche prüfen', 'Assistenz- und Komfortfunktionen testen'] },
    ],
  },
};

/**
 * Feste Probefahrt-Beispielroute für ALLE Fahrzeuge:
 * VW Werk Wolfsburg → TU Braunschweig (über die A39).
 */
export const PROBEFAHRT_ROUTE = {
  description: 'VW Werk Wolfsburg → TU Braunschweig (über die A39), ca. 35 Min',
  mapsUrl:
    'https://www.google.com/maps/dir/' +
    'Wolfsburg+VW+WERK,+Heinrich-Nordhoff-Stra%C3%9Fe,+38440+Wolfsburg/' +
    'Technische+Universit%C3%A4t+Braunschweig,+Universit%C3%A4tspl.+2,+38106+Braunschweig-Nordstadt/',
};

const FEATURE_DEMO: { match: string; feature: string; when: string }[] = [
  { match: 'parking assistant|parkassistent|einparkhilf|\\bpdc\\b', feature: 'Parkassistent', when: 'Beim Ein-/Ausparken automatisch einparken lassen' },
  { match: 'fond entertainment', feature: 'Fond Entertainment', when: 'Für Mitfahrer/Kinder die Rücksitz-Bildschirme starten' },
  { match: 'harman|bang ?& ?olufsen|bowers ?& ?wilkins', feature: 'Soundsystem', when: 'Bei der Pause: Lieblingssong aufdrehen' },
  { match: 'head-?up', feature: 'Head-Up Display', when: 'Auf der Autobahn – Infos im Blickfeld zeigen' },
  { match: 'driving assistant|abstandstempomat|adaptiver tempomat', feature: 'Fahrassistenz', when: 'Auf der Autobahn Abstandstempomat aktivieren' },
  { match: 'laser', feature: 'Laserlicht', when: '(Dämmerung) Fernlicht-Reichweite zeigen' },
  { match: 'standheizung', feature: 'Standheizung', when: '(Winter) vor der Fahrt vorheizen' },
  { match: 'komfortzugang', feature: 'Komfortzugang', when: 'Vor der Fahrt schlüssellos öffnen und starten' },
  { match: 'panorama|glasdach', feature: 'Panorama-Glasdach', when: 'Glasdach öffnen' },
  { match: 'ambiente', feature: 'Ambientebeleuchtung', when: '(Dämmerung) Ambientebeleuchtung zeigen' },
  { match: 'sitzheizung', feature: 'Sitzheizung', when: 'Sitzheizung einschalten' },
  { match: 'm fahrwerk|adaptives fahrwerk', feature: 'Adaptives Fahrwerk', when: 'Sport-Modus auf der Landstraße umschalten' },
  { match: 'xdrive', feature: 'xDrive', when: 'Traktion in einer zügigen Kurve spüren' },
  { match: 'wireless charging|induktiv', feature: 'Wireless Charging', when: 'Smartphone kabellos laden zeigen' },
];

export function featureDemos(car: Car): { feature: string; when: string }[] {
  const parts = [car.subtitle ?? '', ...(car.features ?? [])];
  const out: { feature: string; when: string }[] = [];
  const seen = new Set<string>();
  for (const e of FEATURE_DEMO) {
    if (seen.has(e.feature)) continue;
    const re = new RegExp(e.match, 'i');
    if (parts.some(p => re.test(p))) {
      seen.add(e.feature);
      out.push({ feature: e.feature, when: e.when });
    }
  }
  return out;
}

export function buildTestDrive(car: Car): TestDrivePlan {
  const profile = routeProfile(car);
  const t = ROUTES[profile];
  return {
    headline: t.headline,
    route: { description: PROBEFAHRT_ROUTE.description, mapsUrl: PROBEFAHRT_ROUTE.mapsUrl },
    legs: t.legs,
    featureDemos: featureDemos(car),
  };
}
