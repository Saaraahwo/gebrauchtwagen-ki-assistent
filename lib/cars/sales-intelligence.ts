import type { Car } from './types';
import { runRulesEngine } from './rules-engine';
import { detectAuffaelligkeiten } from './anomaly-detection';
import { calcPreisAmpel } from './price-calculator';
import { getQuestionsForCar } from '@/lib/questions/log';
import { explainCarEquipment, type EquipmentExplanation } from './equipment-knowledge';
import { buildTestDrive, type TestDrivePlan } from './test-drive';

export interface SalesIntelligence {
  strengths: string[];
  concerns: string[];
  customerQuestions: string[];
  testDrive: TestDrivePlan;
  equipment: EquipmentExplanation[];
}

function ps(car: Car): number {
  const m = (car.enginePower || '').match(/(\d+)\s*PS/);
  return m ? parseInt(m[1], 10) : 0;
}

function isMModel(car: Car): boolean {
  return /\bM[2-8]\b/.test(car.name);
}

export function buildStrengths(car: Car): string[] {
  const out: string[] = [];
  const age = new Date().getFullYear() - car.yearBuilt;

  if (car.owners <= 2) out.push(`Wenige Vorbesitzer (${car.owners}) — durchgehende Historie`);

  const expectedServices = Math.floor(Math.max(1, age) * 2);
  if (car.maintenanceRecords >= expectedServices * 0.8) {
    out.push(`Vollständige Servicehistorie (${car.maintenanceRecords} Einträge)`);
  }

  const expectedKm = Math.max(1, age) * 13000;
  if (car.km < expectedKm * 0.9) out.push('Unterdurchschnittliche Laufleistung für das Alter');

  if (calcPreisAmpel(car).status === 'gut') out.push('Preislich attraktiv — unter Marktwert');

  if ((car.accidents || []).length === 0) out.push('Unfallfrei');

  const feat = (car.features || []).join(' ').toLowerCase();
  const highlights: [string, string][] = [
    ['navi', 'Navigation'],
    ['leder', 'Lederausstattung'],
    ['head-up', 'Head-Up Display'],
    ['panorama', 'Panoramadach'],
    ['harman', 'Harman/Kardon Sound'],
    ['bang', 'Bang & Olufsen Sound'],
    ['led', 'LED-Scheinwerfer'],
    ['ambiente', 'Ambientebeleuchtung'],
    ['komfortzugang', 'Komfortzugang'],
  ];
  const found = highlights.filter(([k]) => feat.includes(k)).map(([, l]) => l);
  if (found.length) out.push('Hochwertige Ausstattung: ' + found.slice(0, 4).join(', '));

  if (ps(car) >= 250) out.push(`Souveräne Motorisierung (${car.enginePower})`);

  if (out.length === 0) out.push('Solides, marktübliches Fahrzeug ohne Auffälligkeiten');
  return out;
}

function concernLine(flag: string): string {
  switch (flag) {
    case 'TRANSPARENTE UNFALLHISTORIE':
    case 'AUSTAUSCHMOTOR':
      return 'Unfall-/Reparaturhistorie — mit Reparaturrechnungen und optionalem DEKRA/TÜV-Gutachten entkräften';
    case 'QUALITÄTSINVESTITION':
      return 'Hohe Reparaturkosten — als fachgerechte Qualitätsinvestition mit Belegen darstellen';
    case 'BESITZERHISTORIE':
      return 'Mehrere Vorbesitzer — lückenlose Historie und Pflegezustand betonen';
    case 'LAUFLEISTUNG':
    case 'ERFAHRENES FAHRZEUG':
      return 'Hohe Laufleistung — Scheckheft und ausgetauschte Verschleißteile nachweisen';
    case 'SERVICEHISTORIE':
    case 'SERVICEHISTORIE ANFRAGEN':
      return 'Servicelücken — vorhandene Belege zeigen, Inspektion vor Übergabe anbieten';
    case 'FAHRZEUGALTER':
      return 'Fahrzeugalter — bewährte Technik und gute Ersatzteilverfügbarkeit hervorheben';
    case 'FAHRVERBOT_RISIKO':
      return 'Umweltzonen-Sorge — grüne Plakette und Alltagstauglichkeit erklären';
    case 'SONDERFARBE':
      return 'Sonderfarbe — als individuelles Alleinstellungsmerkmal positionieren';
    case 'SCHEINWERFER_ZULASSUNG':
      return 'Scheinwerfer-Zulassung — Eintragung im Fahrzeugschein nachweisen';
    case 'SPORTLICHE NUTZUNGSHISTORIE':
      return 'Sportliche Nutzung vermutet (M-Modell) — Bremsen/Fahrwerk-Check anbieten und Pflegezustand belegen';
    case 'ATTRAKTIVES ANGEBOT':
      return 'Sehr günstiger Preis weckt Skepsis — Zustand und Historie transparent zeigen';
    case 'INDIVIDUALISIERUNG':
      return 'Individualumbau — Rückbau auf Serienzustand anbieten';
    default:
      return flag;
  }
}

export function buildConcerns(car: Car): string[] {
  const out: string[] = [];
  const f = runRulesEngine(car);
  for (const finding of [...f.red, ...f.orange]) out.push(concernLine(finding.flag));
  // All anomalies are buyer-hesitation / positioning points (incl. special color, lights, age).
  for (const a of detectAuffaelligkeiten(car)) out.push(concernLine(a.flag));
  if (out.length === 0) out.push('Keine wesentlichen Einwände erwartet — Stärken selbstbewusst betonen');
  return [...new Set(out)];
}

export function buildCustomerQuestions(car: Car): string[] {
  const qs: string[] = [];

  // Real questions buyers actually asked (in-memory log), most frequent first.
  qs.push(...getQuestionsForCar(car.id).faq.map(f => f.question));

  const age = new Date().getFullYear() - car.yearBuilt;
  if ((car.accidents || []).length) {
    qs.push('Wurde der Unfallschaden fachgerecht repariert und gibt es Belege?');
  }
  if (car.km > Math.max(1, age) * 13000) {
    qs.push('Wie ist der Wartungszustand bei dieser Laufleistung?');
  }
  if (car.maintenanceRecords < age) qs.push('Ist das Scheckheft lückenlos gepflegt?');
  if (['Euro 5', 'Euro 4', 'Euro 3'].some(e => (car.emission || '').startsWith(e))) {
    qs.push('Darf ich mit dieser Abgasnorm in alle Umweltzonen fahren?');
  }
  if (['rosa', 'pink', 'individual', 'sonderfarbe'].some(t => (car.color || '').toLowerCase().includes(t))) {
    qs.push('Wie wirkt sich die Sonderfarbe auf den Wiederverkauf aus?');
  }
  if (isMModel(car) || ps(car) >= 300) {
    qs.push('Wurde das Fahrzeug auf der Rennstrecke bewegt?');
  }
  qs.push('Ist der Preis verhandelbar?');
  qs.push('Kann ich eine Probefahrt machen?');
  return [...new Set(qs)];
}

export function buildSalesIntelligence(car: Car): SalesIntelligence {
  return {
    strengths: buildStrengths(car),
    concerns: buildConcerns(car),
    customerQuestions: buildCustomerQuestions(car),
    testDrive: buildTestDrive(car),
    equipment: explainCarEquipment(car),
  };
}
