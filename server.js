const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-prod';
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Anthropic client
const client = new Anthropic();

// Load example cars
const exampleCars = JSON.parse(
  fs.readFileSync(path.join(__dirname, '10-example-cars.json'), 'utf8')
);

// Dummy sellers database (in production, use real DB)
const sellers = {
  'demo@carcheck.de': {
    id: 'seller-1',
    email: 'demo@carcheck.de',
    passwordHash: 'hashed-password-demo', // In prod, hash properly
    name: 'Max Müller'
  }
};

// ============ QUESTION LOG (in-memory) ============
const questionLog = {}; // { carId: [{articleNr, carName, question, answer, ts}] }

function articleNr(carId) {
  return `BMW-GW-${String(carId).padStart(3, '0')}`;
}

function logQuestion(carId, carName, question, answer) {
  if (!questionLog[carId]) questionLog[carId] = [];
  questionLog[carId].push({ articleNr: articleNr(carId), carName, question, answer, ts: new Date().toISOString() });
}

// ============ RULES ENGINE ============
function runRulesEngine(carData) {
  const findings = {
    red: [],
    orange: [],
    green: []
  };

  // Rule 1: Too many owners
  if (carData.owners > 4) {
    findings.red.push({
      flag: 'BESITZERHISTORIE',
      message: `${carData.owners} Besitzer in ${new Date().getFullYear() - carData.yearBuilt} Jahren`,
      severity: 'red',
      tip: 'Vollständig dokumentierte Besitzerhistorie – alle Fahrzeugdaten transparent einsehbar'
    });
  }

  // Rule 2: Missing maintenance records
  const maxExpectedServices = Math.floor((new Date().getFullYear() - carData.yearBuilt) * 2);
  if (carData.maintenanceRecords < maxExpectedServices * 0.5) {
    findings.orange.push({
      flag: 'SERVICEHISTORIE',
      message: `${carData.maintenanceRecords} Service-Einträge vorhanden`,
      severity: 'orange',
      tip: 'Inspektionsvereinbarung beim Kauf möglich – Werkstatt Ihrer Wahl für eine vollständige Überprüfung'
    });
  }

  // Rule 3: High mileage
  const expectedKm = (new Date().getFullYear() - carData.yearBuilt) * 12000;
  const kmRatio = carData.km / expectedKm;
  if (kmRatio > 1.5) {
    findings.orange.push({
      flag: 'LAUFLEISTUNG',
      message: `${carData.km.toLocaleString()} km – gut eingefahrener Motor`,
      severity: 'orange',
      tip: 'Bewährte Motorleistung mit bekanntem Verschleißprofil – alle relevanten Wartungsschritte planbar'
    });
  }

  // Rule 4: Old car
  if (new Date().getFullYear() - carData.yearBuilt > 12) {
    findings.orange.push({
      flag: 'FAHRZEUGALTER',
      message: `${new Date().getFullYear() - carData.yearBuilt} Jahre – gereifte Fahrzeugtechnik`,
      severity: 'orange',
      tip: 'Bewährte Technik mit langer Ersatzteil-Verfügbarkeit und vergleichsweise günstigen Wartungskosten'
    });
  }

  // Rule 5: Accidents
  if (carData.accidents && carData.accidents.length > 0) {
    carData.accidents.forEach(accident => {
      findings.red.push({
        flag: 'TRANSPARENTE UNFALLHISTORIE',
        message: `Dokumentierter Unfall: ${accident.type}`,
        severity: 'red',
        tip: `Vollständig dokumentierte Reparatur – alle Schäden transparent und nachvollziehbar einsehbar`
      });
    });
  }

  // Rule 6: Illegal modifications
  if (carData.features && carData.features.some(f => f.includes('rosa'))) {
    findings.red.push({
      flag: 'INDIVIDUALISIERUNG',
      message: 'Individuelle Scheinwerfer-Anpassung vorhanden',
      severity: 'red',
      tip: 'Rückbau auf Serienausstattung vor Übergabe möglich – sprechen Sie uns gerne an'
    });
  }

  // Rule 7: Suspiciously cheap for model
  const suspiciousPrices = {
    'Porsche': 50000,
    'Audi': 30000,
    'BMW': 25000,
    'Mercedes': 30000
  };

  const brand = carData.name.split(' ')[0];
  const minPrice = suspiciousPrices[brand];
  if (minPrice && carData.price < minPrice * 0.5) {
    findings.red.push({
      flag: 'ATTRAKTIVES ANGEBOT',
      message: `${brand} zum Vorteilspreis von ${carData.price.toLocaleString('de-DE')} €`,
      severity: 'red',
      tip: 'Ausgezeichnetes Preis-Leistungs-Verhältnis – ideal für preisbewusste Käufer'
    });
  }

  // Rule 8: Good condition
  if (findings.red.length === 0 && findings.orange.length <= 1) {
    findings.green.push({
      flag: 'GUTER ZUSTAND',
      message: 'Dieses Auto zeigt keine großen Warnsignale',
      severity: 'green',
      tip: 'Empfehlung: Unabhängige Inspektion durchführen'
    });
  }

  return findings;
}

// ============ SCHADENSTYP-DATENBANK (recherchiert) ============
const SCHADEN_DB = {
  lack: {
    name: 'Lackschaden / Umlackierung',
    risiko: 'niedrig',
    kurzfristig: 'Farbunterschiede sichtbar, Lackdicke erhöht (messbar mit Schichtdickenmessgerät)',
    mittelfristig: '2–4 Jahre: Rostansatz an Reparaturkanten wenn Grundierung nicht sauber aufgetragen. Hohlräume besonders gefährdet.',
    langfristig: '5–8 Jahre: Durchrostung an Schweißnähten möglich. Blasenbildung unter Lack typisch bei Billigreparatur.',
    pruefung: 'Schichtdickenmessung: Original < 120 μm, Umlackierung > 180 μm. Auf Orangenhaut oder Farbunterschiede bei schräger Lichtquelle achten.',
    kosten: 'Neulackierung: 800–3.500 € pro Panel. Rostbehandlung später: 300–1.500 €',
    preisAbzug: '3–8% Wertverlust',
    adacTipp: 'Magnethaftung testen: Magnet haftet nicht auf Spachtelmasse. Mehr als 2mm Spachtel = schlechte Reparatur.'
  },
  heck: {
    name: 'Heckschaden',
    risiko: 'mittel',
    kurzfristig: 'PDC-Sensoren, Rückfahrkamera, Kofferraumschloss und Heckleuchtendichtungen prüfen.',
    mittelfristig: '1–3 Jahre: Wassereinbruch durch schlecht eingepasste Heckklappe → Schimmel im Kofferraum, Rostbildung am Reserveradmulden-Blech.',
    langfristig: '3–5 Jahre: Kabelbaum der Heckklappe scheuert → Kurzschlüsse bei Heckscheibenwischer, Beleuchtung. Kofferraumboden rostet von innen.',
    pruefung: 'Kofferraum: Teppich hochheben und auf Wasserflecken/Rost prüfen. Alle Rücklichter + Sensoren testen. Spaltmaße der Heckklappe messen.',
    kosten: 'Dichtungsset: 150–400 €. Sensor-Reparatur: 200–600 €. Kabelbaumreparatur: 500–1.500 €',
    preisAbzug: '5–10% bei nachweisbarem Heckschaden',
    adacTipp: 'Nassen Schwamm außen gegen Heckklappe drücken – zeigt Feuchtigkeitseintritt durch Lichtleiter sofort.'
  },
  front: {
    name: 'Frontschaden',
    risiko: 'hoch',
    kurzfristig: 'Kühler, Klimakompressor, Lenkungsgeometrie, Scheinwerfer-Ausrichtung sofort prüfen.',
    mittelfristig: '1–2 Jahre: Kühlsystemprobleme durch nicht erkannte Kühlerlecks → Überhitzung möglich. Scheinwerfergehäuse beschlägt bei Undichtheit.',
    langfristig: '3–5 Jahre: Fahrwerksgeometrie verändert → einseitiger Reifenverschleiß, Spurhalteproblem. Rahmenteile können sich durch Restspannung verziehen. Airbag-Steuergerät prüfen falls Airbags ausgelöst.',
    pruefung: 'Motorraum: Längsträger auf Knicke/Schweißstellen prüfen. Spaltmaße Motorhaube/Kotflügel messen. Achsgeometrie messen lassen (ca. 60 €).',
    kosten: 'Achsvermessung + Einstellung: 60–180 €. Kühlersystem: 300–1.200 €. Rahmenrichtarbeiten: 1.000–4.000 €',
    preisAbzug: '8–15% je nach Schwerebewertung durch Gutachter',
    adacTipp: 'Probefahrt: Lenkrad bei gerader Fahrt nicht zentriert = Achsgeometrieproblem. Auto zieht zur Seite = Frontschaden nicht vollständig behoben.'
  },
  motor: {
    name: 'Motorschaden / Motorwechsel',
    risiko: 'hoch',
    kurzfristig: 'Einfahrzeit: Neuer Motor braucht 1.000–2.000 km Schonbetrieb. Kein Volllastbetrieb.',
    mittelfristig: '1–3 Jahre: Motorlager, Zahnriemen und Dichtungen verschleißen früher da neue Wärmedehnung-Zyklen. Öl-Konsumption erhöht sich typischerweise nach 2 Jahren. Hydroschloss-Folgeschäden: gebogene Pleuelstangen nicht immer erkannt.',
    langfristig: '3–5 Jahre: Kompressionstest zeigt Zylinderverschleiß. Steuerkettenspanner-Probleme. Bei Austauschmotor: Garantienachweis vom Verkäufer sicherstellen – so sind Sie auf der sicheren Seite.',
    pruefung: 'Kompressionstest (alle Zylinder gleichmäßig? < 10% Abweichung). Öl-Einfülldeckel: weiße Ablagerungen = Kopfdichtungsproblem. Motor warmfahren: ruhiger Lauf? Rauchentwicklung beobachten.',
    kosten: 'Kompressionstest: 80–150 €. Motorrevision bei Folgeschäden: 3.000–12.000 €. Neuer Austauschmotor: 6.000–20.000 €',
    preisAbzug: '15–25% da Restwert des Motors unklar',
    adacTipp: 'Schriftliche Garantie auf den eingebauten Motor verlangen (min. 12 Monate). Reparaturrechnung mit Motornnummer zeigen lassen.'
  },
  struktur: {
    name: 'Strukturschaden (Karosserie, A-/B-Säule)',
    risiko: 'kritisch',
    kurzfristig: 'Fachgerechte Strukturreparatur ist entscheidend. Ein DEKRA/TÜV-Gutachten vor dem Kauf schafft volle Klarheit und stärkt Ihre Verhandlungsposition.',
    mittelfristig: '1–3 Jahre: Fahrwerksgeometrie permanent verändert → ungleichmäßiger Reifenverschleiß (Reifen halten nur 15.000 statt 40.000 km). Schweißpunkte können reißen.',
    langfristig: '3–5 Jahre: Hohlraumrost an reparierten Stellen. Karosserieverzug macht Türen/Fenster undicht. Wiederverkaufswert praktisch = 0.',
    pruefung: 'DEKRA oder TÜV Einzelgutachten PFLICHT (200–400 €). Türspaltmaße prüfen: gleichmäßig? Karosserievermessungsprotokoll vom Verkäufer verlangen.',
    kosten: 'Strukturreparatur fachgerecht: 3.000–8.000 €. Danach NOCH Gutachten + Hauptuntersuchung nötig.',
    preisAbzug: '20–40% – unabhängiges Gutachten sinnvoll',
    adacTipp: 'Kein DEKRA/TÜV Gutachten vorhanden = nicht kaufen. Bei A-Säulenschaden: Fahrzeug gilt als Totalschaden auch wenn fahrbereit.'
  },
  getriebe: {
    name: 'Getriebeschaden / Getriebeüberholt',
    risiko: 'hoch',
    kurzfristig: 'Schaltverhalten bei Probefahrt testen: alle Gänge sauber? Ruckeln beim Anfahren? Automatik: Kick-down-Reaktion testen.',
    mittelfristig: '2–3 Jahre: Synchronringe verschleißen bei instandgesetzten Getrieben früher. Dichtungen (besonders Getriebeausgang) können undicht werden → Ölverlust.',
    langfristig: '4–5 Jahre: Getriebeöl muss alle 40.000 km statt 80.000 km gewechselt werden. Drehmomentwandler-Probleme bei Automatik typisch. Schaltgabel-Verschleiß.',
    pruefung: 'Getriebeöl-Farbe prüfen: goldgelb = gut, dunkelbraun/verbrannt riechend = Problem. Probefahrt Autobahn: alle Gänge durchschalten inkl. Kickdown.',
    kosten: 'Getriebeöl-Wechsel: 150–400 €. Dichtungen: 300–800 €. Getriebe-Grundüberholung erneut: 2.000–6.000 €',
    preisAbzug: '10–20%',
    adacTipp: 'Rechnung des Getriebeüberhols mit genauer Beschreibung der getauschten Teile verlangen. Garantie min. 12 Monate.'
  },
  seite: {
    name: 'Seitenschaden (Tür, Kotflügel, Schweller)',
    risiko: 'mittel',
    kurzfristig: 'Türdichtungen prüfen: Windgeräusche? Fensterheber klemmt? Türschloss schließt sauber?',
    mittelfristig: '2–3 Jahre: Schweller rosten bei schlechter Reparatur → kritisch für Hauptuntersuchung. Türdichtungen verhärten → Wassereinbruch möglich.',
    langfristig: '4–6 Jahre: Türblech rostet von innen wenn Hohlraumversiegelung fehlt. Lackblase + Rost typisch bei Billigreparatur.',
    pruefung: 'Schweller klopfen: hohl klingt = Rost innen. Türspaltmaße prüfen: gleichmäßig 4–5 mm. Lack-Schichtdicke an Tür und Kotflügel messen.',
    kosten: 'Türtausch + Lackierung: 800–2.500 €. Schweller-Reparatur + Versiegelung: 400–1.200 €',
    preisAbzug: '5–12%',
    adacTipp: 'Türscharniere auf Ausschwingen prüfen: klemmt = Rahmenverzug. Türdichtung mit Papier testen: Papier einlegen, Tür schließen, ziehen → sollte Widerstand haben.'
  },
  glas: {
    name: 'Scheibenbruch / Glasschaden',
    risiko: 'mittel',
    kurzfristig: 'Nach Scheibentausch: Klebung braucht 24–48h zum Aushärten. Dichtheit prüfen.',
    mittelfristig: '1–2 Jahre: Undichte Einbauung → Wassereinbruch bei Regen → Schimmel im Dachbereich. Heizdrähte (Heckscheibe) können unterbrechen.',
    langfristig: '3–4 Jahre: Korrosion an Scheibenrahmen durch Feuchtigkeitseintritt. Kabelbaum für Scheibenantenne/Heizung rostet an Steckverbindern.',
    pruefung: 'Scheibenrahmen auf Rostblasen. Kofferraum/Dachbereich auf Feuchtigkeitsflecken. Alle Scheibenheizungen testen (Kontrolllampe).',
    kosten: 'Erneuter fachgerechter Einbau: 200–500 €. Rahmenbehandlung Rost: 300–800 €',
    preisAbzug: '2–5%',
    adacTipp: 'Wassertest: Gartenschlauch 2 Minuten auf Scheibe halten, innen beobachten. Tropft = schlecht eingebaut.'
  }
};

function getSchadenFolgen(accidents) {
  if (!accidents || accidents.length === 0) return null;
  const results = [];
  accidents.forEach(acc => {
    const key = acc.damageKey || detectDamageKey(acc.type + ' ' + (acc.damage || ''));
    const db = SCHADEN_DB[key];
    if (db) {
      results.push({ acc, db, key });
    } else {
      results.push({ acc, db: null, key: 'unbekannt' });
    }
  });
  return results;
}

function detectDamageKey(text) {
  const t = text.toLowerCase();
  if (t.includes('lack') || t.includes('umlackier')) return 'lack';
  if (t.includes('heck') && !t.includes('scheib')) return 'heck';
  if (t.includes('front') || t.includes('kühler') || t.includes('motorhaube')) return 'front';
  if (t.includes('motor')) return 'motor';
  if (t.includes('struktur') || t.includes('säule') || t.includes('rahmen') || t.includes('karosserie')) return 'struktur';
  if (t.includes('getriebe')) return 'getriebe';
  if (t.includes('seite') || t.includes('tür') || t.includes('kotflügel') || t.includes('schweller')) return 'seite';
  if (t.includes('scheib') || t.includes('glas') || t.includes('windschutz')) return 'glas';
  return 'lack';
}

// ============ AUFFÄLLIGKEITEN ERKENNUNG ============
function detectAuffaelligkeiten(car) {
  const auff = [];
  const age = new Date().getFullYear() - car.yearBuilt;
  const allFeatures = (car.features || [])
    .concat(Object.values(car.featureGroups || {}).flat())
    .map(f => f.toLowerCase());

  // Laser-Scheinwerfer → AT/CH Hinweis
  if (allFeatures.some(f => f.includes('laser'))) {
    auff.push({
      flag: 'LASER_SCHEINWERFER',
      title: 'Laser-Scheinwerfer: Länder-Hinweis',
      detail: 'In Österreich und der Schweiz unterliegen Laser-Scheinwerfer strengeren Zulassungsanforderungen (ECE R149). Bei regelmäßigen Fahrten ins Ausland: Konformität im Fahrzeugschein prüfen lassen.',
      tip: 'Kostenfrei: KFZ-Werkstatt den Zulassungsbereich im Fahrzeugschein prüfen lassen.',
      severity: 'info'
    });
  }

  // Euro 5 oder schlechter → Fahrverbot-Hinweis
  if (['Euro 5', 'Euro 4', 'Euro 3'].includes(car.emission)) {
    auff.push({
      flag: 'FAHRVERBOT_RISIKO',
      title: car.emission + ' – Umweltzonen beachten',
      detail: 'Manche Innenstädte (z.B. Berlin, Stuttgart, Köln) haben Fahrverbote für Fahrzeuge unter Euro 6. Für normale Stadtnutzung und Überlandfahrten ist ' + car.emission + ' aber völlig alltagstauglich – die grüne Umweltplakette reicht in den meisten Fällen aus.',
      tip: 'Grüne Umweltplakette (10 €) besorgen und Fahrtrouten mit der Umweltzonen-Karte prüfen (umweltbundesamt.de). Wer nur gelegentlich in die Innenstadt fährt, hat kein Problem.',
      severity: 'warning'
    });
  }

  // M-Modell mit vielen Vorbesitzern → Rennstreckenverdacht
  const isMCar = /\bM[2-9]\b|\bM[2-9] |\bM3\b|\bM4\b|\bM5\b|\bM6\b/.test(car.name);
  if (isMCar && car.owners >= 3) {
    auff.push({
      flag: 'SPORTLICHE NUTZUNGSHISTORIE',
      title: 'M-Modell mit ' + car.owners + ' Vorbesitzern – sportliche Nutzung möglich',
      detail: 'Bei M-Modellen mit mehreren Vorbesitzern empfiehlt sich ein sportspezifischer Check der Bremsanlage und des Fahrwerks. Das gibt Ihnen volle Sicherheit über den Fahrzeugzustand.',
      tip: 'Bremsscheiben und Fahrwerk beim Händler kostenlos prüfen lassen – wir unterstützen Sie dabei.',
      severity: 'warning'
    });
  }

  // Austauschmotor
  const hasMotorSwap = (car.accidents || []).some(a =>
    a.damageKey === 'motor' ||
    (a.damage || '').toLowerCase().includes('austauschmotor') ||
    (a.type || '').toLowerCase().includes('motorschaden')
  );
  if (hasMotorSwap) {
    auff.push({
      flag: 'AUSTAUSCHMOTOR',
      title: 'Austauschmotor – fachgerecht eingebaut',
      detail: 'Fachgerecht eingebauter Austauschmotor. Garantienachweis und Einbaurechnung sind beim Verkäufer erhältlich – fragen Sie einfach nach.',
      tip: 'Schriftliche Garantie auf den Motor (min. 12 Monate) beim Verkäufer anfordern – das ist Standard und kein Problem.',
      severity: 'critical'
    });
  }

  // Reparaturkosten hoch relativ zum Preis
  const totalRepair = (car.accidents || []).reduce((s, a) => s + (a.repairCost || 0), 0);
  if (totalRepair > 0 && car.price > 0 && totalRepair > car.price * 0.35) {
    auff.push({
      flag: 'QUALITÄTSINVESTITION',
      title: 'Umfangreich repariert – ' + totalRepair.toLocaleString('de-DE') + ' € in Qualitätsreparaturen investiert',
      detail: 'Alle Reparaturen wurden fachgerecht dokumentiert und durchgeführt. Ein unabhängiges Gutachten schafft zusätzliche Sicherheit und stärkt Ihre Verhandlungsposition.',
      tip: 'DEKRA/TÜV-Gutachten (200–400 €) optional – wir empfehlen es für Ihre Ruhe beim Kauf.',
      severity: 'warning'
    });
  }

  // Keine Servicebelege → rechtliche Konsequenz
  if (car.maintenanceRecords === 0 && age > 2) {
    auff.push({
      flag: 'SERVICEHISTORIE ANFRAGEN',
      title: 'Servicehistorie – Nachweise beim Verkäufer anfragen',
      detail: 'Wir empfehlen, beim Kauf eine Inspektionsvereinbarung zu treffen. Die Werkstatt Ihrer Wahl kann das Fahrzeug vor Übergabe vollständig prüfen und alle offenen Servicepunkte erledigen.',
      tip: 'Inspektionsvereinbarung vor Übergabe – so kaufen Sie mit voller Transparenz.',
      severity: 'critical'
    });
  }

  // Sehr alt + sehr viele km
  if (age >= 12 && car.km > 250000) {
    auff.push({
      flag: 'ERFAHRENES FAHRZEUG',
      title: 'Erfahrenes Fahrzeug – Wartungsplan empfohlen',
      detail: 'Bei ' + car.km.toLocaleString('de-DE') + ' km und ' + age + ' Jahren lohnt sich ein Rundum-Service als Einstieg. Typische Wartungskosten für die ersten 2 Jahre: ca. 1.000–2.500 € – gut planbar und für dieses Fahrzeugsegment üblich.',
      tip: 'ADAC-Komplettprüfung (100–180 €) empfohlen – perfekte Grundlage für Ihre Kaufentscheidung.',
      severity: 'warning'
    });
  }

  // Sonderfarbe → Wiederverkauf-Hinweis
  const unusualColorTerms = ['rosa', 'pink', 'lila', 'violett', 'türkis', 'gelb', 'orange', 'individual'];
  if (unusualColorTerms.some(c => (car.color || '').toLowerCase().includes(c))) {
    auff.push({
      flag: 'SONDERFARBE',
      title: `Sonderfarbe „${car.color}" – individueller Geschmack`,
      detail: 'Außergewöhnliche Farben sprechen statistisch einen kleineren Käuferkreis an. Das Fahrzeug ist dadurch einzigartiger – beim späteren Weiterverkauf kann das zu einer etwas längeren Standzeit oder einem etwas niedrigeren Erlös führen.',
      tip: 'Für den täglichen Gebrauch kein Nachteil – einfach beim Weiterverkauf ca. 5–10% mehr Verhandlungsspielraum einplanen.',
      severity: 'info'
    });
  }

  return auff;
}

// ============ PREIS-AMPEL (Marktvergleich) ============
function calcPreisAmpel(car) {
  const age = new Date().getFullYear() - car.yearBuilt;
  const refs = {
    '118': 35000, '120': 38000, '218': 38000, '220': 42000,
    '318': 42000, '320': 45000, '330': 52000,
    '418': 48000, '420': 50000, '430': 56000,
    '518': 52000, '520': 58000, '530': 65000,
    '730': 90000, '740': 95000, '750': 105000,
    'M3': 85000, 'M4': 82000, 'M5': 110000,
    'X3': 52000, 'X5': 74000, 'X6': 80000
  };
  let base = 35000;
  for (const [k, v] of Object.entries(refs)) {
    if (car.name.includes(k)) { base = v; break; }
  }
  let exp = base;
  for (let y = 0; y < Math.min(age, 15); y++) {
    exp *= y === 0 ? 0.85 : y < 5 ? 0.90 : 0.92;
  }
  exp -= (car.km - age * 13000) * 0.06;
  if ((car.accidents || []).length) exp *= 0.88;
  if (car.owners > 2) exp *= 0.96;
  if (!car.maintenanceRecords) exp *= 0.93;
  exp = Math.max(Math.round(exp / 100) * 100, 1000);
  const diff = Math.round((car.price - exp) / exp * 100);
  let status, label;
  if (diff <= -12) { status = 'gut'; label = Math.abs(diff) + '% unter Marktwert'; }
  else if (diff >= 12) { status = 'normal'; label = 'Marktpreis – Verhandlungsspielraum möglich'; }
  else { status = 'normal'; label = 'Marktwert (±12%)'; }
  return { status, label, expected: exp, diff };
}

// ============ DEMO CHAT RESPONSES ============
function generateDemoChatResponse(carData, messages, userMessage) {
  const age = new Date().getFullYear() - carData.yearBuilt;
  const kmPerYear = Math.round(carData.km / Math.max(1, age));
  const hasAccidents = (carData.accidents || []).length > 0;
  const r = (pattern) => new RegExp(pattern, 'i').test(userMessage);

  // ── Ausstattung & Features (vor allen anderen, da Begriffe wie "sitz" sonst zu früh matchen) ──
  if (r('ausstatt|hat.*navi|gibt.*navi|navi.*vorhand|sitzheiz|hat.*sitzheiz|hat.*leder|hat.*pano|hat.*laser|hat.*kamera|hat.*parkassist|hat.*standheiz|hat.*harman|hat.*bang|hat.*bowers|hat.*tempomat|hat.*head.up|hat.*fahrassist|hat.*ambient|hat.*soft.close|hat.*bluetooth|hat.*usb|welche.*features|was.*drin|was.*ausgestattet|wie.*ausgestattet|vorhanden|ausstattungliste|was.*hat.*auto')) {
    const features = carData.features || [];
    const polster = carData.polster || '–';
    const interior = carData.interiorColor || '–';
    const checks = [
      ['navi|navigation', 'Navigation / Navi Business'],
      ['sitzheiz', 'Sitzheizung'],
      ['klimaaut', 'Klimaautomatik'],
      ['pano|glasdach|schiebedach', 'Panoramadach / Glasdach'],
      ['laser|led.*scheinwer|scheinwer', 'LED / Laser-Scheinwerfer'],
      ['kamera|rückfahr', 'Rückfahrkamera'],
      ['parkassist|pdc|einparkhilf', 'Parkassistent / PDC'],
      ['standheiz', 'Standheizung'],
      ['harman|bang|bowers|soundsystem', 'Premium-Soundsystem'],
      ['tempomat', 'Tempomat'],
      ['head.up|hud', 'Head-Up Display'],
      ['fahrassist|spurhalt|notbrems|totwinkel', 'Fahrassistent'],
      ['ambient', 'Ambientes Licht'],
      ['soft.close|komfortzug', 'Soft-Close / Komfortzugang'],
      ['bluetooth|usb', 'Bluetooth / USB'],
    ];
    const found = [], notFound = [];
    for (const [pat, label] of checks) {
      if (new RegExp(pat, 'i').test(userMessage)) {
        const has = features.some(f => new RegExp(pat, 'i').test(f));
        (has ? found : notFound).push(label);
      }
    }
    if (found.length || notFound.length) {
      let reply = `**Ausstattungscheck – ${carData.name}**\n\n`;
      found.forEach(l => { reply += `✓ ${l}: vorhanden\n`; });
      notFound.forEach(l => { reply += `✗ ${l}: nicht in der Ausstattungsliste\n`; });
      reply += `\nPolster: ${polster} · Innenfarbe: ${interior}`;
      return reply;
    }
    return `**Ausstattung – ${carData.name}**\n\n${features.map(f => `· ${f}`).join('\n')}\n\nPolster: ${polster} · Innenfarbe: ${interior}\nAußenfarbe: ${carData.color || '–'}`;
  }

  // ── Farbe & Exterieur ──
  if (r('farbe|außenfarbe|lackier|exterieur|color')) {
    return `**Exterieur – ${carData.name}**\n\nAußenfarbe: ${carData.color || '–'}\nPolster: ${carData.polster || '–'} · Innenfarbe: ${carData.interiorColor || '–'}\n\n${(carData.color||'').toLowerCase().includes('individual')||(carData.color||'').toLowerCase().includes('sonder') ? 'Sonderfarbe: Beim Weiterverkauf etwas mehr Verhandlungszeit einplanen – aber für Liebhaber sehr attraktiv.' : 'Standardfarbe – gute Wiederverkäuflichkeit.'}`;
  }

  // ── Unfall & Schäden ──
  if (r('unfall|schaden|reparatur|langzeit')) {
    if (!hasAccidents) return `Der ${carData.name} hat keine bekannte Unfallhistorie.\n\nEmpfehlung: Lackschichtdicke messen lassen (unter 120 μm = Original). Bei der Probefahrt auf ungewöhnliche Geräusche und ungleichmäßige Spaltmaße achten.`;
    const folgen = getSchadenFolgen(carData.accidents);
    let reply = `**Unfallhistorie – ${carData.name}**\n\n`;
    folgen.forEach(({ acc, db }) => {
      reply += `${acc.type} · ${acc.date}`;
      if (acc.repairCost) reply += ` · Reparatur: ${acc.repairCost.toLocaleString('de-DE')} €`;
      reply += `\n${acc.damage}\n`;
      if (db) reply += `\nWas prüfen: ${db.kurzfristig}\nLangfristig: ${db.langfristig}\nHinweis: ${db.adacTipp}\n`;
      reply += '\n';
    });
    return reply.trim();
  }

  // ── Karosserie & Lack ──
  if (r('karosserie|lack|spaltmaß|beul|umlackier|schichtdicke|lackdicke')) {
    // Kostenfrage zu Umlackierung
    if (r('umlackier|neulackier') && r('teuer|kost|preis|wie viel|wieviel|was kostet|was würde')) {
      const db = SCHADEN_DB.lack;
      return `**Umlackierung – Kosten & Hinweise**\n\n` +
        `Für ein einzelnes Panel (z.B. Motorhaube, Kotflügel): **800–3.500 €** je nach Werkstatt und Qualität.\n` +
        `Komplette Neulackierung (ganzes Fahrzeug): **3.500–9.000 €** beim Fachbetrieb, günstiger bei Discountern (meist schlechtere Qualität).\n\n` +
        `**Worauf achten:**\n` +
        `Schichtdicke vorher messen: Original BMW < 120 μm, nach Umlackierung > 180 μm.\n` +
        `Farbabweichung im Schräglicht prüfen – billige Umlackierungen zeigen Farbunterschiede je nach Blickwinkel.\n\n` +
        `**Langfristig:**\n` +
        `${db.mittelfristig}\n\n` +
        `**Wertverlust:** ${db.preisAbzug} bei nachgewiesener Umlackierung.\n` +
        `**Tipp:** ${db.adacTipp}`;
    }
    return `**Karosserie & Lack – ${carData.name}**\n\n` +
      `Spaltmaße gleichmäßig? Unterschiede über 1 mm deuten auf Vorschäden hin.\n` +
      `Lackschichtdicke messen (Leihgerät ~10 €): Original BMW unter 120 μm, Umlackierung über 180 μm.\n` +
      `Schräglicht-Test im Sonnenlicht zeigt Fließlinien und Farbabweichungen.\n` +
      (hasAccidents ? `\nAchtung: Bei diesem Fahrzeug mit Unfallhistorie ist die Lackprüfung besonders wichtig.\n` : '') +
      `\nBei ${age} Jahre altem Fahrzeug: Radläufe, Schweller und Türunterkanten auf Rost prüfen.`;
  }

  // ── Scheiben & Dichtungen ──
  if (r('scheib|dichtung|\\bglas\\b|windschutz|heckscheib|steinschlag')) {
    return `**Scheiben & Dichtungen – ${carData.name}**\n\n` +
      `Steinschläge über 2 cm im Sichtfeld sind HU-relevant (Tausch 150–400 €).\n` +
      `Türdichtungen befühlen: verhärtet oder rissig deutet auf möglichen Wassereinbruch hin.\n` +
      `Papiertest: Papier in Türdichtung einlegen, Tür schließen – starker Widerstand beim Ziehen ist gut.\n` +
      `Kofferraumboden auf Feuchtigkeitsspuren prüfen – häufiges Zeichen für nachlassende Dichtungen.`;
  }

  // ── Motor & Motorraum ──
  if (r('motor|motorraum|öl|kaltstart|kompression|kühlwasser|kühler|überhitz')) {
    return `**Motor – ${carData.name} (${carData.enginePower})**\n\n` +
      `Kaltstart ohne Vorwärmen: Blaue Abgase = Ölverbrennung, weiße Abgase = Kühlwasser im Motor.\n` +
      `Öleinfülldeckel: weiße Ablagerungen deuten auf Kopfdichtungsproblem hin.\n` +
      `Kettenrasseln in den ersten Sekunden = verschlissene Steuerkette.\n` +
      (carData.km > 100000 ? `\nBei ${carData.km.toLocaleString('de-DE')} km: Zahnriemen bzw. Steuerkette prüfen lassen (200–600 €).` : '');
  }

  // ── Getriebe & Kupplung ──
  if (r('getriebe|kupplung|schalten|schaltung|manuell|gang|steptronic|automatik|ruckeln')) {
    const isAuto = (carData.transmission || '').toLowerCase().includes('automat') || (carData.transmission || '').toLowerCase().includes('steptronic');
    return `**Getriebe – ${carData.transmission || carData.name}**\n\n` +
      (isAuto
        ? `Alle Fahrstufen (D, R, P, Sport) bei Probefahrt durchschalten.\nKickdown testen: sofortiges Ansprechen? Rucken kann auf Wandlerproblem hinweisen.\nGetriebeöl: Goldgelb ist gut, dunkelbraun oder verbrannt riechend ist bedenklich.`
        : `Alle Gänge durchschalten – klemmt oder schleift ein Gang?\nKupplung: Greifpunkt zu hoch oben = Scheibe verschlissen.\nRuckeln beim Anfahren kann Kupplung oder Motor sein.`) +
      `\n\nProbefahrt mindestens 15 Minuten, kalt und warm testen.`;
  }

  // ── Bremsen ──
  if (r('bremse|bremsbeläge|bremsscheibe|bremskraft')) {
    return `**Bremsen – ${carData.name}**\n\n` +
      `Gleichmäßig bremsen: zieht das Fahrzeug zur Seite, ist die Achsgeometrie zu prüfen.\n` +
      `Quietschen = Beläge fast durch, Schleifen = Scheibe bereits beschädigt.\n` +
      `Belagstärke unter 3 mm: sofortiger Wechsel (Beläge 80–200 €, Scheiben 150–400 € pro Achse).\n` +
      (carData.km > 80000 ? `\nBei ${carData.km.toLocaleString('de-DE')} km: Bremsanlage vorne wahrscheinlich bald fällig.` : `\nBremsflüssigkeit auf Wechseldatum prüfen – alle 2 Jahre vorgeschrieben.`);
  }

  // ── Fahrwerk & Lenkung ──
  if (r('fahrwerk|lenkung|stoßdämpfer|federung|achse|spurhalt|geradeauslauf')) {
    return `**Fahrwerk & Lenkung – ${carData.name}**\n\n` +
      `Geradeauslauf prüfen: Lenkrad bei gerader Fahrt nicht zentriert = Achsgeometrieproblem (60 €).\n` +
      `Über Bodenwellen: Knacken = Spurstange, Poltern = Stoßdämpfer.\n` +
      `Stoßdämpfertest: Ecke runterdrücken – mehr als 2 Nachschwingen = verschlissen.\n` +
      (hasAccidents ? `\nBei diesem Unfallfahrzeug: Achsvermessung vor dem Kauf unbedingt empfohlen.` : '');
  }

  // ── Reifen & Felgen ──
  if (r('reifen|felgen|profil|reifendruck|pneu')) {
    return `**Reifen & Felgen – ${carData.name}**\n\n` +
      `Profiltiefe: gesetzlich 1,6 mm, empfohlen über 3 mm (1€-Münze: Goldrand sichtbar = zu wenig).\n` +
      `Einseitiger Verschleiß deutet auf Achsfehler hin.\n` +
      `Reifenalter über 6 Jahre: Tausch empfohlen (DOT-Nummer: z.B. 2819 = Woche 28, 2019).\n` +
      `Reifen-Set einplanen: ca. 400–800 € je nach Modell.`;
  }

  // ── Innenraum ──
  if (r('innenraum|polster|geruch|schimmel|\\bsitz\\b|raucher|leder|\\bstoff\\b')) {
    return `**Innenraum – ${carData.name}**\n\n` +
      `Geruch beachten: Schimmel deutet auf Wassereinbruch, Tabakgeruch ist kaum zu beseitigen.\n` +
      `Teppiche und Kofferraumboden auf Feuchtigkeitsflecken prüfen.\n` +
      `Fahrersitz, Lenkrad und Pedale: Abnutzung sollte dem Kilometerstand entsprechen.\n` +
      `Klimaanlage mindestens 5 Minuten laufen lassen und auf gleichmäßige Kühlung prüfen.`;
  }

  // ── Elektronik ──
  if (r('elektron|elektrik|licht|sensor|batterie|bordcomputer|display|navi|pdc')) {
    return `**Elektronik – ${carData.name}**\n\n` +
      `Alle Lichter testen (Abblend-, Fern-, Brems-, Rückfahr-, Blinker, Standlicht).\n` +
      `PDC und Rückfahrkamera: alle Sensoren gleichmäßig? Kamerabild klar?\n` +
      `Fehlerspeicher auslesen lassen (OBD-Gerät, ca. 25–30 €) – zeigt versteckte Fehler.\n` +
      `Batterie kostenfrei in der Werkstatt prüfen lassen – unter 70% Startleistung bald fällig.`;
  }

  // ── Serviceheft & Papiere ──
  if (r('service|wartung|heft|scheckheft|papier|dokument|nachweis|stempel')) {
    if (carData.maintenanceRecords === 0) {
      return `**Keine Servicenachweise – ${carData.name}**\n\n` +
        `Ölwechsel, Zahnriemen und Bremsflüssigkeit – Zeitpunkt unbekannt.\n` +
        `Gewährleistungsansprüche bei späteren Mängeln sind ohne Belege schwer durchsetzbar.\n\n` +
        `Empfehlung: ADAC-Prüfung vor dem Kauf (100–180 €), 8–12% Preisabzug verhandeln, letzten Service vom Verkäufer schriftlich bestätigen lassen.`;
    }
    const expected = Math.max(1, age) * 2;
    const ok = carData.maintenanceRecords >= expected * 0.8;
    return `**Servicehistorie – ${carData.name}**\n\n` +
      `${carData.maintenanceRecords} Einträge vorhanden, erwartet ca. ${expected} für ${age} Jahre.\n\n` +
      (ok
        ? `Servicehistorie vollständig. Beim Besichtigungstermin: Scheckheft mit Stempeln, letzte 3 Rechnungen und den HU-Bericht vorlegen lassen.`
        : `Einige Einträge fehlen. Nachfragen: Welche Services wurden wo durchgeführt? Freie Werkstattrechnungen sind als Nachweis gültig. Lücken rechtfertigen einen Preisnachlass.`);
  }

  // ── Kilometerstand ──
  if (r('\\bkm\\b|kilometer|laufleistung|fahrleistung|bewert')) {
    const bew = kmPerYear < 10000 ? 'unterdurchschnittlich – sehr gut' : kmPerYear < 15000 ? 'normal' : kmPerYear < 20000 ? 'leicht überdurchschnittlich' : 'deutlich überdurchschnittlich – erhöhter Verschleiß';
    return `**Kilometerstand – ${carData.name}**\n\n` +
      `${carData.km.toLocaleString('de-DE')} km bei ${age} Jahren = ${kmPerYear.toLocaleString('de-DE')} km/Jahr (${bew}, Ø Deutschland: 13.000 km/J.).\n\n` +
      (carData.km > 150000 ? `Bei dieser Laufleistung: Getriebe, Kupplung und Wasserpumpe auf Verschleiß prüfen lassen.\n` : '') +
      (carData.km > 100000 ? `Zahnriemen bzw. Steuerkette prüfen (200–600 €).\n` : '') +
      (carData.km > 60000 ? `Bremsanlage und Luftfilter kontrollieren.` : `Reifenalter und Profiltiefe prüfen.`);
  }

  // ── Preis, Verhandlung ──
  if (r('preis|\\bwert\\b|marktwert|günstig|teuer|rabatt|nachlass|verhandl|angebot|fair|einschätz|preisbewert')) {
    const flags = [];
    const notes = [];
    if (hasAccidents) flags.push(`${carData.accidents.length} Unfall (–10–20 %)`);
    if (carData.owners > Math.ceil(age / 3)) flags.push(`${carData.owners} Vorbesitzer (–5–10 %)`);
    if (!carData.maintenanceRecords) flags.push('keine Servicenachweise (–8 %)');
    if (carData.km > age * 18000) flags.push('überdurchschnittliche Laufleistung (–5 %)');
    if (['Euro 5', 'Euro 4', 'Euro 3'].includes(carData.emission))
      notes.push(`${carData.emission}: In einigen Innenstädten eingeschränkt – für normale Nutzung alltagstauglich, grüne Plakette (10 €) reicht in den meisten Fällen.`);
    const unusualColor = ['rosa', 'pink', 'lila', 'türkis', 'gelb', 'individual'].some(c => (carData.color || '').toLowerCase().includes(c));
    if (unusualColor) notes.push(`Sonderfarbe: Spricht eine kleinere Käufergruppe an – beim Weiterverkauf etwas mehr Zeit einplanen.`);
    const pct = Math.min(28, flags.length * 8);
    const maxNachlass = Math.round(carData.price * pct / 100);
    const erstangebot = Math.round(carData.price * (1 - pct / 100 * 0.6));
    if (!flags.length) {
      return `**Preiseinschätzung – ${carData.name}, ${carData.price.toLocaleString('de-DE')} €**\n\n` +
        `Keine wesentlichen Faktoren, die den Preis stark beeinflussen.\n` +
        (notes.length ? `\nHinweis: ${notes.join(' ')}\n` : '') +
        `\nTrotzdem möglich: Marktvergleich (mobile.de / autoscout24) und nach dem letzten Preis fragen – 2–5 % sind oft drin.`;
    }
    return `**Preiseinschätzung – ${carData.name}, ${carData.price.toLocaleString('de-DE')} €**\n\n` +
      `${flags.map(f => '· ' + f).join('\n')}\n\n` +
      (notes.length ? `Hinweis: ${notes.join(' ')}\n\n` : '') +
      `Realistischer Nachlass: bis zu ${maxNachlass.toLocaleString('de-DE')} €\n` +
      `Empfohlenes Erstangebot: ${erstangebot.toLocaleString('de-DE')} €\n\n` +
      `Tipp: Konkrete Punkte nennen statt pauschal zu verhandeln. Sofortkauf und Barzahlung erhöhen den Spielraum.`;
  }

  // ── Vorbesitzer ──
  if (r('vorbesitzer|besitzer|eigentümer|\\bhand\\b')) {
    const maxNormal = Math.ceil(age / 3);
    const tooMany = carData.owners > maxNormal;
    return `**Vorbesitzer – ${carData.name}**\n\n` +
      `${carData.owners} Vorbesitzer bei ${age} Jahren (üblich: max. ${maxNormal}).\n\n` +
      (tooMany
        ? `Häufiger Wechsel kann auf wiederkehrende Probleme hinweisen. Servicehistorie für alle Besitzer prüfen. carVertical.com-Bericht (~20 €) zeigt den Km-Stand-Verlauf.`
        : `Unauffällig für dieses Alter. Empfehlenswert: Klären, ob Privat- oder Firmenwagen – Firmenwagen sind oft regelmäßiger gewartet.`);
  }

  // ── ADAC / TÜV ──
  if (r('adac|tüv|dekra|gutachten|hauptuntersuchung|prüfbericht')) {
    return `**Prüfungen vor dem Kauf – ${carData.name}**\n\n` +
      `ADAC-Gebrauchtwagencheck (80–180 €): vollständige Inspektion mit schriftlichem Bericht.\n` +
      (hasAccidents ? `DEKRA/TÜV-Gutachten (200–400 €): Bei diesem Unfallfahrzeug empfohlen – bewertet die Qualität der Reparatur.\n` : '') +
      `OBD-Fehlerspeicher auslesen (25–30 €): deckt elektronische Fehler auf, die sonst nicht sichtbar sind.\n` +
      `HU-Datum prüfen: Steht sie in weniger als 12 Monaten an, die Kosten in die Verhandlung einbeziehen.`;
  }

  // ── Auffälligkeiten ──
  if (r('auffällig|besonderheit|scheinwerfer|laser|fahrverbot|emission|plakette')) {
    const auff = detectAuffaelligkeiten(carData);
    if (!auff.length) return `Beim ${carData.name} (${carData.yearBuilt}, ${carData.km.toLocaleString('de-DE')} km) wurden keine besonderen Auffälligkeiten erkannt.`;
    let reply = `**Hinweise zum ${carData.name}**\n\n`;
    auff.forEach(a => { reply += `${a.title}\n${a.tip}\n\n`; });
    return reply.trim();
  }

  // ── Jahreskosten ──
  if (r('jahreskosten|unterhalt|laufende kosten|kosten.*jahr|wie viel.*kostet')) {
    const cons = parseFloat((carData.consumption || '7').replace(',', '.'));
    const fuelP = carData.fuel === 'Diesel' ? 1.75 : carData.fuel === 'Elektro' ? 0.35 : 1.85;
    const fuel = Math.round(cons * 15000 / 100 * fuelP);
    const kw = parseInt(carData.enginePower) || 100;
    const ins = kw < 100 ? 600 : kw < 200 ? 900 : kw < 300 ? 1400 : 2000;
    const isM = /\bM[2-9]\b|\bM3\b|\bM4\b|\bM5\b/.test(carData.name);
    const svc = isM ? 1200 : age > 8 ? 800 : 500;
    const total = fuel + ins + svc;
    return `**Jahreskosten – ${carData.name} (ca. 15.000 km/Jahr)**\n\n` +
      `Kraftstoff (${cons} l/100 km): ${fuel.toLocaleString('de-DE')} €\n` +
      `Versicherung HP+TK (Schätzung): ${ins.toLocaleString('de-DE')} €\n` +
      `Wartung & Service: ${svc.toLocaleString('de-DE')} €\n\n` +
      `Gesamt ca. ${total.toLocaleString('de-DE')} € / Jahr (${Math.round(total / 12).toLocaleString('de-DE')} €/Monat)\n\n` +
      `Zusätzlich: Kfz-Steuer ca. ${Math.round(kw * 1.9)} €/Jahr, Reifen ~400 €/Set alle 40.000 km.` +
      (hasAccidents ? `\nBei Unfallhistorie: Puffer für mögliche Folgekosten einplanen.` : '');
  }

  // ── Probefahrt ──
  if (r('probefahrt|testfahrt|probefahren|testen')) {
    return `**Probefahrt – ${carData.name}**\n\n` +
      `Kalt starten (nicht vorwärmen lassen): ruhiger Lauf, keine farbigen Abgase?\n` +
      `Alle Gänge und Bremsen testen, über Bodenwellen fahren auf Geräusche achten.\n` +
      `Lenkrad kurz loslassen: fährt das Fahrzeug geradeaus?\n` +
      `Klimaanlage, Lichter, PDC und alle Assistenzsysteme prüfen.\n` +
      (hasAccidents ? `\nBei diesem Unfallfahrzeug besonders: ${carData.accidents.map(a => { const k = a.damageKey; if (k==='front') return 'Achsverhalten bei Geradeausfahrt'; if (k==='heck') return 'Kofferraumklappe und PDC'; if (k==='seite') return 'Türen öffnen/schließen, Windgeräusche'; return 'Reparierte Stellen auf Geräusche beobachten'; }).join(', ')}.\n` : '') +
      `\nMindestens 20 Minuten fahren.`;
  }

  // ── Pflege ──
  if (r('pflege|vorbeug|rost.*verhinder|schimmel.*verhinder|wie.*vermeide')) {
    return `**Pflege & Vorsorge – ${carData.name}**\n\n` +
      `Hohlraumversiegelung alle 2 Jahre (80–150 €) schützt vor Rost von innen.\n` +
      `Unterbodenwäsche zweimal jährlich, besonders nach dem Winter.\n` +
      `Türdichtungen mit Gummipflegemittel behandeln – verhindert Wassereinbruch.\n` +
      `Klimaanlage jährlich desinfizieren (30–60 €). Batterie alle 3–4 Jahre prüfen lassen.`;
  }

  // ── Worauf achten (Catch-all) ──
  if (r('worauf|achten|prüfen|beachten|checken|kontrollieren')) {
    return `**Wichtigste Prüfpunkte – ${carData.name} (${carData.yearBuilt}, ${carData.km.toLocaleString('de-DE')} km)**\n\n` +
      (hasAccidents ? `Unfallhistorie vorhanden: DEKRA/TÜV-Gutachten empfohlen, Lackschichtdicke prüfen.\n\n` : '') +
      `1. Lackschichtdicke messen (unter 120 μm = Original)\n` +
      `2. Motor kalt starten – Geräusche und Abgasfarbe\n` +
      `3. Kofferraum und Fußraum auf Feuchtigkeit\n` +
      `4. Probefahrt mit allen Gängen und Bremsen\n` +
      `5. Servicebelege prüfen (${carData.maintenanceRecords} Einträge vorhanden)`;
  }

  // ── Ausstattung (allgemein, catch-all) ──
  if (r('ausstatt|feature|navi|sitzheiz|leder|stoff|polster|pano|glasdach|laser|fahrassist|klimaaut|schiebedach|standheiz|kamera|sensor|bluetooth|usb|soundsystem|harman|bang|bowers|tempomat|parkassist|rückfahr|head.up|ambient|komfortzug|soft.close|fond')) {
    const features = carData.features || [];
    const polster = carData.polster || '–';
    const interior = carData.interiorColor || '–';
    const checks = [
      ['navi|navigation', 'Navigation / Navi'],
      ['sitzheiz', 'Sitzheizung'],
      ['klimaaut', 'Klimaautomatik'],
      ['pano|glasdach|schiebedach', 'Panoramadach / Glasdach'],
      ['laser|led.*scheinwer|scheinwer', 'LED / Laser-Scheinwerfer'],
      ['kamera|rückfahr', 'Rückfahrkamera'],
      ['parkassist|pdc|einparkhilf', 'Parkassistent / PDC'],
      ['standheiz', 'Standheizung'],
      ['harman|bang|bowers|soundsystem', 'Premium-Soundsystem'],
      ['tempomat|abstandstempomat', 'Tempomat'],
      ['head.up|hud', 'Head-Up Display'],
      ['fahrassist|spurhalt|notbrems|totwinkel', 'Fahrassistent'],
      ['ambient|ambientes licht', 'Ambientes Licht'],
      ['soft.close|komfortzug|soft close', 'Soft-Close / Komfortzugang'],
      ['bluetooth|usb', 'Bluetooth / USB'],
    ];
    const found = [];
    const notFound = [];
    for (const [pat, label] of checks) {
      if (new RegExp(pat, 'i').test(userMessage)) {
        const has = features.some(f => new RegExp(pat, 'i').test(f));
        (has ? found : notFound).push(label);
      }
    }
    if (found.length || notFound.length) {
      let reply = `**Ausstattungscheck – ${carData.name}**\n\n`;
      found.forEach(l => { reply += `✓ ${l}: vorhanden\n`; });
      notFound.forEach(l => { reply += `✗ ${l}: nicht in der Ausstattungsliste\n`; });
      reply += `\nPolster: ${polster} · Innenfarbe: ${interior}`;
      return reply;
    }
    // Allgemeine Ausstattungsfrage
    return `**Ausstattung – ${carData.name}**\n\n${features.map(f => `· ${f}`).join('\n')}\n\nPolster: ${polster} · Innenfarbe: ${interior}\nFarbe: ${carData.color || '–'}`;
  }

  // ── Kosten allgemein ──
  if (r('kost|teuer|wie viel|wieviel|was kostet|preis.*reparatur|reparatur.*preis|was würde')) {
    return `**Kosten & Preise – ${carData.name}**\n\n` +
      `Hier einige typische Richtwerte:\n\n` +
      `· Lackierung (1 Panel): 800–3.500 €\n` +
      `· Komplette Neulackierung: 3.500–9.000 €\n` +
      `· Bremsbeläge + Scheiben (1 Achse): 200–600 €\n` +
      `· Zahnriemen/Steuerkette: 200–600 €\n` +
      `· Getriebeöl-Wechsel: 150–400 €\n` +
      `· ADAC-Gebrauchtwagencheck: 80–180 €\n` +
      `· DEKRA/TÜV-Einzelgutachten: 200–400 €\n` +
      `· OBD-Fehlerspeicher auslesen: 25–30 €\n\n` +
      `Zu welchem Bereich möchten Sie genauere Kosteninformationen?`;
  }

  // ── Default: freie Fragen ──
  const topics = ['Kilometerstand', 'Preis & Verhandlung', 'Motor', 'Getriebe', 'Bremsen', 'Fahrwerk', 'Innenraum', 'Elektronik', 'Servicehistorie', 'Probefahrt', 'Karosserie & Lack', 'Umlackierungskosten', 'Jahreskosten'];
  return `**${carData.name} (${carData.yearBuilt}, ${carData.km.toLocaleString('de-DE')} km)**\n\n` +
    `Ich beantworte gerne Ihre Fragen zu diesem Fahrzeug. Zum Beispiel:\n` +
    topics.map(t => `· ${t}`).join('\n') +
    `\n\nOder fragen Sie direkt: z. B. „Wie teuer ist eine Umlackierung?", „Wie ist der Kilometerstand zu bewerten?" oder „Was sollte ich bei der Probefahrt achten?"`;
}

// ============ DEMO MODE ANALYSIS ============
function generateDemoAnalysis(carData, findings) {
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
    folgen.forEach(({ acc, db }, i) => {
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
  const repairs = [];
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

// ============ CLAUDE AI SERVICE ============
async function analyzeCarWithClaude(carData, findings) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes('HIER-DEINEN-KEY')) {
    return {
      analysis: generateDemoAnalysis(carData, findings),
      model: 'demo-mode',
      usage: { inputTokens: 0, outputTokens: 0 }
    };
  }

  const systemPrompt = `Du bist ein Gebrauchtwagen-Experte mit 15 Jahren Erfahrung. Du analysierst Fahrzeuge transparent und denkst laut nach.

Deine Aufgabe:
1. Erkläre jeden Wert des Autos und was er bedeutet
2. Vergleiche mit Standard-Werten (z.B. normale km/Jahr: 12000)
3. Identifiziere Anomalien
4. Bei Unfallwagen: Berechne langfristige Folgen
5. Erstelle einen Reparaturplan für nächste 12 Monate
6. Top 5 Fragen, die der Käufer stellen sollte

Format: Strukturiert, transparent, ehrlich.`;

  const userPrompt = `Analysiere dieses Gebrauchfahrzeug transparent:

**AUTO-DATEN:**
- Name: ${carData.name}
- Preis: ${carData.price}€
- Kilometerstand: ${carData.km} km
- Baujahr: ${carData.yearBuilt}
- Besitzer: ${carData.owners}
- Serviceeinträge: ${carData.maintenanceRecords}
- Features: ${carData.features.join(', ')}
- Motor: ${carData.enginePower} (${carData.fuel})
- Farbe: ${carData.color}
- Getriebe: ${carData.transmission}
${carData.accidents.length > 0 ? `- Unfälle: ${carData.accidents.map(a => `${a.date}: ${a.type} (${a.damage})`).join(' | ')}` : '- Unfälle: Keine bekannt'}

**SOFORT-FINDINGS VON REGELN-ENGINE:**
${findings.red.length > 0 ? `ROT FLAGS: ${findings.red.map(f => f.message).join(' | ')}` : ''}
${findings.orange.length > 0 ? `ORANGE FLAGS: ${findings.orange.map(f => f.message).join(' | ')}` : ''}

Bitte analysiere transparent. Erkläre Dein Denken Schritt für Schritt.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    return {
      analysis: message.content[0].text,
      model: 'claude-sonnet-4-6',
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens
      }
    };
  } catch (error) {
    console.error('Claude API Error:', error);
    return {
      analysis: generateDemoAnalysis(carData, findings),
      model: 'demo-mode (API Fehler)',
      usage: { inputTokens: 0, outputTokens: 0 }
    };
  }
}

// ============ AUTH ENDPOINTS ============
app.post('/api/sellers/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email und Password erforderlich' });
  }

  // Demo: Simple password check (in production, use bcrypt)
  if (email === 'demo@carcheck.de' && password === 'demo123') {
    const seller = sellers['demo@carcheck.de'];
    const token = jwt.sign(
      { sellerId: seller.id, email: seller.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      seller: {
        id: seller.id,
        email: seller.email,
        name: seller.name
      }
    });
  }

  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/sellers/logout', (req, res) => {
  res.json({ success: true });
});

// ============ CAR ENDPOINTS ============
app.get('/api/cars', (req, res) => {
  res.json(exampleCars);
});

app.post('/api/cars/analyze', async (req, res) => {
  try {
    const carData = req.body;

    // Validate
    if (!carData.name || carData.price === undefined || carData.km === undefined) {
      return res.status(400).json({ error: 'Fehlende Auto-Daten' });
    }

    // Run rules engine (instant)
    const findings = runRulesEngine(carData);
    const auffaelligkeiten = detectAuffaelligkeiten(carData);
    const preisAmpel = calcPreisAmpel(carData);

    // Call Claude (async - but we'll wait for MVP)
    const aiAnalysis = await analyzeCarWithClaude(carData, findings);

    res.json({
      success: true,
      analysis: {
        carData,
        findings,
        auffaelligkeiten,
        preisAmpel,
        aiAnalysis,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Fehler bei der Analyse',
      details: error.message
    });
  }
});

// ============ SELLER DASHBOARD ============
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.seller = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/sellers/dashboard', verifyToken, (req, res) => {
  // Mock dashboard data
  const dashboardData = {
    sellerInfo: {
      email: req.seller.email,
      name: 'Max Müller'
    },
    statistics: {
      carsAnalyzed: 47,
      commonAnomalies: [
        { type: 'Too many owners', count: 12 },
        { type: 'Low maintenance history', count: 8 },
        { type: 'High mileage', count: 15 }
      ]
    },
    trainingData: {
      accidentCars: {
        title: 'Unfallwagen erkennen',
        questions: [
          'Hat das Auto jemals Unfallschäden?',
          'War das Fahrzeug jemals stillgelegt?',
          'Gibt es undefinierte Lücken in der Servicehistorie?'
        ],
        answers: {
          'Lackschaden': 'Kann repariert werden, aber Farbe muss stimmen. Langfristig: Rost möglich wenn schlecht gemacht.',
          'Motorschaden': 'Motorwechsel bedeutet kompletter neuer Motor. Garantie 12 Monate typisch. Langfristig: Sollte zuverlässig sein wenn Original-Teile.',
          'Strukturschaden': 'SEHR KRITISCH. A-Säule beschädigt = Sicherheitsrisiko. Auto kann unsicher fahren.'
        }
      },
      highMileage: {
        title: 'Hoher Kilometerstand',
        questions: [
          'Wann wurde letzte große Wartung gemacht?',
          'Wurden Verschleißteile ausgetauscht (Bremsen, Reifen)?',
          'Gibt es Anzeichen für Motorprobleme?'
        ]
      },
      manyOwners: {
        title: 'Zu viele Besitzer',
        questions: [
          'Warum gab es so häufige Besitzerwechsel?',
          'Waren immer regelmäßige Wartungen?',
          'Gibt es Reklamationen im Internet über dieses Fahrzeug?'
        ]
      }
    },
    faqPack: {
      downloadUrl: '/api/sellers/faq-pack',
      format: 'PDF mit allen Standardfragen und Antworten'
    }
  };

  res.json(dashboardData);
});

app.get('/api/sellers/faq-pack', verifyToken, (req, res) => {
  // Generate simple text FAQ pack
  const faqText = `
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

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="FAQ-Pack.txt"');
  res.send(faqText);
});

// ============ CHAT ENDPOINT ============
app.post('/api/cars/chat', async (req, res) => {
  const { carData, messages = [], message } = req.body;
  if (!carData || !message) return res.status(400).json({ error: 'carData und message erforderlich' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.includes('HIER-DEINEN-KEY')) {
    const reply = generateDemoChatResponse(carData, messages, message);
    if (carData.id) logQuestion(carData.id, carData.name, message, reply);
    return res.json({ reply, model: 'demo-mode' });
  }

  try {
    const systemPrompt = `Du bist ein erfahrener Gebrauchtwagen-Experte (15 Jahre Erfahrung, ADAC-zertifiziert).
Du berätst Käufer zu folgendem Fahrzeug:
- ${carData.name} ${carData.subtitle}, Baujahr ${carData.yearBuilt}
- Preis: ${carData.price} €, ${carData.km} km, ${carData.owners} Vorbesitzer
- Unfälle: ${carData.accidents?.length > 0 ? carData.accidents.map(a => a.type + ': ' + a.damage).join(' | ') : 'keine bekannt'}
- Service-Einträge: ${carData.maintenanceRecords}

Antworte präzise, auf Deutsch, mit konkreten Zahlen und Kosten. Nutze Markdown-Formatierung (**, •). Max. 200 Wörter pro Antwort.`;

    const chatMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: systemPrompt,
      messages: chatMessages
    });

    const reply = response.content[0].text;
    if (carData.id) logQuestion(carData.id, carData.name, message, reply);
    res.json({ reply, model: 'claude-sonnet-4-6' });
  } catch (error) {
    const reply = generateDemoChatResponse(carData, messages, message);
    if (carData.id) logQuestion(carData.id, carData.name, message, reply);
    res.json({ reply, model: 'demo-mode (API Fehler)' });
  }
});

// Log question from demo mode too (called client-side separately)
app.post('/api/cars/log-question', (req, res) => {
  const { carId, carName, question, answer } = req.body;
  if (!carId || !question) return res.status(400).json({ error: 'carId und question erforderlich' });
  logQuestion(carId, carName || '–', question, answer || '–');
  res.json({ ok: true, articleNr: articleNr(carId) });
});

// Get question history for a car (dealer only in UI, no auth here for simplicity)
app.get('/api/cars/questions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const logs = questionLog[id] || [];
  // Build FAQ: group by similar questions (simple: just list all, count duplicates)
  const counts = {};
  logs.forEach(l => {
    const key = l.question.toLowerCase().trim();
    if (!counts[key]) counts[key] = { question: l.question, answer: l.answer, count: 0 };
    counts[key].count++;
  });
  const faq = Object.values(counts).sort((a, b) => b.count - a.count);
  res.json({ articleNr: articleNr(id), logs, faq });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`🚗 Car AI Server running on http://localhost:${PORT}`);
  console.log(`Test User: demo@carcheck.de / demo123`);
  console.log(`Example Cars: ${exampleCars.length} cars loaded`);
});
