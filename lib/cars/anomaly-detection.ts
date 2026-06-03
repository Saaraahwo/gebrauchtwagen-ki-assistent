import type { Car, Anomaly } from './types';

export function detectAuffaelligkeiten(car: Car): Anomaly[] {
  const auff: Anomaly[] = [];
  const age = new Date().getFullYear() - car.yearBuilt;
  const allFeatures = (car.features || [])
    .concat(Object.values(car.featureGroups || {}).flat())
    .map(f => f.toLowerCase());

  // Scheinwerfer-Zulassung: Laser/Xenon/Nachrüst/getönt/farbig → Eintragung & ECE prüfen.
  // Serien-LED/Halogen löst NICHT aus.
  const specialLightTerms = ['laser', 'xenon', 'nachrüst', 'nachruest', 'getönt', 'getoent', 'tuning'];
  const hasColoredLight = allFeatures.some(f =>
    /(scheinwerfer|licht|leuchte)/.test(f) && /(rosa|pink|farb|getönt|getoent|blau|rot)/.test(f)
  );
  const hasSpecialLight =
    allFeatures.some(f => specialLightTerms.some(t => f.includes(t))) || hasColoredLight;
  if (hasSpecialLight) {
    auff.push({
      flag: 'SCHEINWERFER_ZULASSUNG',
      title: 'Scheinwerfer – Zulassung prüfen',
      detail: 'Spezielle oder nachgerüstete Scheinwerfer (Laser, Xenon-Nachrüstung, getönte/farbige Scheinwerfer) müssen im Fahrzeugschein eingetragen und typzugelassen sein (StVZO/ECE). Laser-Scheinwerfer unterliegen in Österreich und der Schweiz strengeren Anforderungen (ECE R149). Serien-LED oder Halogen ist unproblematisch.',
      tip: 'Kostenfrei: KFZ-Werkstatt prüfen lassen, ob die Scheinwerfer typzugelassen und im Fahrzeugschein eingetragen sind.',
      severity: 'info'
    });
  }

  // Euro 5 oder schlechter → Fahrverbot-Hinweis
  if (['Euro 5', 'Euro 4', 'Euro 3'].includes(car.emission || '')) {
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

  // Fahrzeugalter – gereifte Technik (nur wenn nicht schon als "erfahrenes Fahrzeug" markiert)
  const isExperienced = age >= 12 && car.km > 250000;
  if (age >= 10 && !isExperienced) {
    auff.push({
      flag: 'FAHRZEUGALTER',
      title: `${age} Jahre – gereifte Technik`,
      detail: 'In diesem Alter lohnt ein Blick auf Verschleißteile (Gummis, Dichtungen, Elektronik) sowie Rost an Schwellern und Radläufen. Ersatzteile sind gut verfügbar und die Wartung ist gut planbar.',
      tip: 'Kurzer Vorab-Check (ADAC/Werkstatt, ca. 100–180 €) gibt Sicherheit.',
      severity: 'info'
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

  // Spec-triggered: high fuel consumption
  // consumptionCombined uses German locale ("6,2 l/100km") so replace comma before parsing
  if (car.specs && parseFloat(car.specs.consumptionCombined.replace(',', '.')) > 9.0) {
    auff.push({
      flag: 'HOHER_VERBRAUCH',
      title: `Hoher Kraftstoffverbrauch — ${car.specs.consumptionCombined} kombiniert`,
      detail: `Der kombinierte WLTP-Verbrauch von ${car.specs.consumptionCombined} liegt deutlich über dem Durchschnitt vergleichbarer Fahrzeuge. Kraftstoffkosten bei 15.000 km/Jahr und aktuellem Preis von ca. 1,80 €/l: rund ${Math.round(parseFloat(car.specs.consumptionCombined.replace(',', '.')) * 15000 / 100 * 1.8).toLocaleString('de-DE')} € pro Jahr.`,
      tip: 'Fahrverhalten und regelmäßige Reifendruckkontrolle können den Verbrauch um bis zu 10 % reduzieren.',
      severity: 'info',
    });
  }

  // Spec-triggered: high CO₂
  if (car.specs && car.specs.co2 > 180) {
    auff.push({
      flag: 'CO2_EMISSIONEN',
      title: `CO₂-Emissionen ${car.specs.co2} g/km — über EU-Richtwert`,
      detail: `Mit ${car.specs.co2} g/km liegt dieses Fahrzeug über dem EU-Richtwert von 180 g/km. In manchen Kommunen können höhere Parkgebühren oder Umweltzonen-Regelungen gelten. Für Vielfahrer lohnt ein Vergleich mit verbrauchsärmeren Alternativen.`,
      tip: 'CO₂-abhängige Kfz-Steuer prüfen — bei hohen Emissionen kann die Jahressteuer deutlich steigen.',
      severity: 'info',
    });
  }

  return auff;
}
