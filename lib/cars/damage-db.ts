import type { Accident, DamageInfo, DamageKey } from './types';

export const SCHADEN_DB: Record<DamageKey, DamageInfo> = {
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

export function detectDamageKey(text: string): DamageKey {
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

export interface DamageFolge {
  acc: Accident;
  db: DamageInfo | null;
  key: DamageKey | 'unbekannt';
}

export function getSchadenFolgen(accidents: Accident[] | undefined): DamageFolge[] | null {
  if (!accidents || accidents.length === 0) return null;
  const results: DamageFolge[] = [];
  accidents.forEach(acc => {
    const key = acc.damageKey || detectDamageKey(acc.type + ' ' + (acc.damage || ''));
    const db = SCHADEN_DB[key as DamageKey] ?? null;
    if (db) {
      results.push({ acc, db, key });
    } else {
      results.push({ acc, db: null, key: 'unbekannt' });
    }
  });
  return results;
}
