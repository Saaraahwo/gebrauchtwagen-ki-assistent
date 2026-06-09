import type { Car } from '@/lib/cars/types';
import { SCHADEN_DB, getSchadenFolgen } from '@/lib/cars/damage-db';
import { detectAuffaelligkeiten } from '@/lib/cars/anomaly-detection';
import { buildWarrantyNote } from '@/lib/cars/buyer-guide';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** BMW-warranty solution block, appended to accident/repair-cost answers (empty when not applicable). */
function warrantyBlock(car: Car): string {
  const w = buildWarrantyNote(car);
  if (!w) return '';
  return `\n\n**Reparaturkosten absichern**\n${w.text}\nQuelle: ${w.source}`;
}

export function generateDemoChatResponse(
  carData: Car,
  messages: ChatMessage[],
  userMessage: string,
): string {
  const age = new Date().getFullYear() - carData.yearBuilt;
  const kmPerYear = Math.round(carData.km / Math.max(1, age));
  const hasAccidents = (carData.accidents || []).length > 0;
  const r = (pattern: string) => new RegExp(pattern, 'i').test(userMessage);

  // ── Paket-Erklärungen (was ist X, was bedeutet X, erkläre X) ──
  if (r('was ist|was bedeutet|was bringt|erkläre|erkläre mir|was umfasst|was enthält|was bietet|was beinhaltet')) {
    const features = carData.features || [];
    const hasPkg = (pat: string) => features.some(f => new RegExp(pat, 'i').test(f));

    if (r('m.?sport|sportpaket|sport.paket')) {
      const hasIt = hasPkg('m.?sport|sportpaket');
      return `**M Sportpaket – ${carData.name}**\n\n` +
        (hasIt ? `Dieses Fahrzeug **hat das M Sportpaket**. Es umfasst:\n` : `Dieses Fahrzeug hat das M Sportpaket **nicht** in der Ausstattungsliste.\n\nZur Info, was das M Sportpaket bietet:\n`) +
        `• Sportliches Exterieur: M-Frontstoßfänger, Seitenschweller, M-Heckstoßfänger\n` +
        `• M-Lederlenkrad mit Schaltwippen (je nach Modell)\n` +
        `• Tiefergelegtes Sportfahrwerk (ca. 10 mm)\n` +
        `• 18" M-Leichtmetallfelgen (oder größer)\n` +
        `• Schwarze Hochglanz-Zierleisten\n` +
        `• Sport-Sitze mit M-Stickerei\n\n` +
        `**Beim Kauf:** Das M Sportpaket erhöht den Wiederverkaufswert um ca. 5–10 %. Beim Weiterverkauf unbedingt hervorheben.`;
    }

    if (r('advantage|advantage.paket')) {
      const hasIt = hasPkg('advantage');
      return `**Advantage Paket – ${carData.name}**\n\n` +
        (hasIt ? `Dieses Fahrzeug **hat das Advantage Paket**. Es umfasst:\n` : `Dieses Fahrzeug hat das Advantage Paket nicht.\n\nZur Info:\n`) +
        `• Komfortzugang (schlüsselloses Öffnen)\n` +
        `• Park Distance Control (PDC) hinten\n` +
        `• Sitzheizung vorne\n` +
        `• LED-Scheinwerfer\n\n` +
        `Gutes Einstiegspaket für Alltagskomfort.`;
    }

    if (r('luxury|luxury.line')) {
      return `**Luxury Line – ${carData.name}**\n\n` +
        `Luxury Line ist BMWs Komfort-Linie:\n` +
        `• Chrom-Zierrahmen an Fenstern und Nieren\n` +
        `• Hochwertigere Leder-/Stoff-Kombination innen\n` +
        `• Aluminium-Zierleisten\n` +
        `• Dezentere Optik als M Sportpaket — eher für Komfort-Käufer\n\n` +
        `**Beim Kauf:** Luxury Line spricht eine andere Käufergruppe an als M-Paket. Beide Varianten sind gut wiederverkäuflich.`;
    }

    if (r('xdrive|allrad')) {
      return `**xDrive (Allradantrieb) – ${carData.name}**\n\n` +
        `xDrive ist BMWs intelligentes Allradsystem:\n` +
        `• Verteilt Antriebskraft zwischen Vorder- und Hinterachse in Millisekunden\n` +
        `• Bessere Traktion bei Nässe, Schnee und Kurven\n` +
        `• Ca. 5–10 % höherer Verbrauch als Hinterradantrieb\n\n` +
        `**Beim Kauf:** xDrive erhöht den Wert um ca. 1.500–3.000 € gegenüber Heckantrieb. Prüfen Sie, ob xDrive auf dem Typenschild steht (nicht nur im Inserat behauptet wird).`;
    }

    if (r('navi|navigation|navi.business|navi.professional')) {
      const hasNavi = hasPkg('navi');
      return `**Navigation – ${carData.name}**\n\n` +
        (hasNavi ? `Dieses Fahrzeug **hat ein Navigationssystem**.\n\n` : `Kein Navigationssystem in der Ausstattungsliste.\n\n`) +
        `BMW bietet zwei Navi-Varianten:\n` +
        `• **Navi Business** (einfacher): Online-Kartendienst, Basisnavigation\n` +
        `• **Navi Professional** (premium): Echtzeit-Traffic, 3D-Karten, Remote-Software-Update\n\n` +
        `Karten-Updates: ca. 150–300 € alle 3 Jahre, oder über BMW ConnectedDrive kostenfrei (je nach Modell).`;
    }

    if (r('laser.*scheinwer|scheinwer|led')) {
      const hasLaser = hasPkg('laser');
      const hasLed = hasPkg('led');
      return `**Scheinwerfer – ${carData.name}**\n\n` +
        (hasLaser ? `Dieses Fahrzeug hat **Laser-Scheinwerfer** — das ist BMWs Top-Option.\n` : hasLed ? `Dieses Fahrzeug hat **LED-Scheinwerfer**.\n` : `Keine LED/Laser-Scheinwerfer in der Ausstattungsliste.\n`) +
        `\n**Unterschied:**\n` +
        `• Halogen: 60–120 m Reichweite, günstig im Tausch\n` +
        `• LED: 150–200 m, energieeffizienter, kein Tausch nötig\n` +
        `• Laser: 600 m Reichweite, nur bei Highspeed aktiv\n\n` +
        `**Beim Kauf:** Laser-Scheinwerfer erhöhen den Wert erheblich (ca. 2.000–4.000 €). In AT/CH gibt es Zulassungsauflagen.`;
    }
  }

  // ── BMW Garantie: ist eine Reparatur / ein Schaden abgedeckt? ──
  if (r('garantie|gewährleist|abgedeckt|abgesichert')) {
    const COVERAGE: { match: string; label: string; covered: 'ja' | 'nein' | 'teilweise'; note: string }[] = [
      { match: 'rost|durchrost|korrosion', label: 'Durchrostung', covered: 'teilweise',
        note: 'Durchrostung von innen läuft über die separate BMW Durchrostungsgarantie (Werksstandard, mehrere Jahre ab Erstzulassung) – nicht über die Gebrauchtwagengarantie.' },
      { match: 'unfall|lack|kratzer|delle|beule|steinschlag|glasbruch|\\bscheibe\\b|karosserie|parkrempler', label: 'Unfall- bzw. Karosserieschaden', covered: 'nein',
        note: 'Unfall- und Lack-/Karosserieschäden sind keine Garantiefälle. Dafür ist die Kfz-Versicherung (Teil-/Vollkasko) zuständig; bei bereits vorhandenen Mängeln greift die gesetzliche Gewährleistung des Händlers.' },
      { match: 'bremsbel|bremsscheib|\\bbremse|reifen|kupplung|wischer|zündkerze|glühkerze|luftfilter|ölwechsel|inspektion|batterie|verschleiß|scheibenwischer', label: 'Verschleiß-/Wartungsteil', covered: 'nein',
        note: 'Verschleiß- und Wartungsteile (z. B. Bremsen, Reifen, Kupplung, Wischer, Batterie, Filter) sind von der Garantie ausgenommen – das sind normale Unterhaltskosten.' },
      { match: 'motor|getriebe|steuerkette|turbo|einspritz|wasserpumpe|lichtmaschine|anlasser|antrieb|differential|kardan', label: 'Motor-/Getriebe-/Antriebsdefekt', covered: 'ja',
        note: 'Mechanische Defekte an Motor, Getriebe und Antrieb sind über die BMW Gebrauchtwagengarantie (Premium Selection) abgedeckt – Material und Arbeit zu 100 %, ohne Selbstbeteiligung.' },
      { match: 'elektr|elektronik|steuergerät|sensor|navigation|display|fensterheber|zentralverriegel|klimaanlage|klimakompressor|bordcomputer|infotainment', label: 'Elektrik-/Elektronikdefekt', covered: 'ja',
        note: 'Elektrische und elektronische Bauteile sind über die BMW Gebrauchtwagengarantie abgedeckt – Material und Arbeit zu 100 %, ohne Selbstbeteiligung.' },
    ];
    const hit = COVERAGE.find(c => new RegExp(c.match, 'i').test(userMessage));
    const eligible = age <= 12 && carData.km <= 200000;
    let body: string;
    if (hit) {
      const mark = hit.covered === 'ja' ? '✓ **Ja, abgedeckt.**'
        : hit.covered === 'nein' ? '✗ **Nein, nicht abgedeckt.**'
        : '➖ **Teilweise – über eine andere Garantie.**';
      body = `**${hit.label}:** ${mark}\n${hit.note}`;
    } else {
      body = `Das hängt vom Bauteil ab:\n` +
        `✓ Abgedeckt: mechanische und elektronische Defekte (z. B. Motor, Getriebe, Elektrik).\n` +
        `✗ Nicht abgedeckt: Verschleißteile (Bremsen, Reifen, Kupplung …) sowie Unfall- und Lackschäden.\n` +
        `Nennen Sie das konkrete Bauteil oder den Schaden, dann sage ich Ihnen, ob es ein Garantiefall ist.`;
    }
    let reply = `**BMW Garantie – ist die Reparatur abgedeckt?**\n\n${body}\n\n` +
      `Rahmen: BMW Premium Selection – 24 Monate, 100 % Material + Arbeit, ohne Selbstbeteiligung` +
      (eligible ? '.' : ` (gilt bis 12 Jahre / 200.000 km – Förderfähigkeit dieses Fahrzeugs bitte prüfen).`);
    if (hasAccidents) {
      reply += `\n\nZu diesem Fahrzeug (${carData.accidents.map(a => a.type).join(', ')}): Der bereits reparierte Schaden selbst ist kein Garantiefall – künftige mechanische/elektronische Defekte dagegen schon.`;
    }
    reply += `\n\nQuelle: BMW Premium Selection Garantie (bmw.de)`;
    return reply;
  }

  // ── Ausstattung & Features (vor allen anderen, da Begriffe wie "sitz" sonst zu früh matchen) ──
  if (r('ausstatt|sportpaket|m.sport|hat.*navi|gibt.*navi|navi.*vorhand|sitzheiz|hat.*sitzheiz|hat.*leder|hat.*pano|hat.*laser|hat.*kamera|hat.*parkassist|hat.*standheiz|hat.*harman|hat.*bang|hat.*bowers|hat.*tempomat|hat.*head.up|hat.*fahrassist|hat.*ambient|hat.*soft.close|hat.*bluetooth|hat.*usb|welche.*features|was.*drin|was.*ausgestattet|wie.*ausgestattet|vorhanden|ausstattungliste|was.*hat.*auto')) {
    const features = carData.features || [];
    const polster = carData.polster || '–';
    const interior = carData.interiorColor || '–';
    const checks: [string, string][] = [
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
      ['m.?sport|sportpaket', 'M Sportpaket'],
    ];
    const found: string[] = [], notFound: string[] = [];
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

  // ── Umlackierung / Farbwechsel: Kosten (vor der allgemeinen Farb-Antwort) ──
  if (r('umlackier|neulackier|lackieren|andere farbe|farbe ?wechsel|umfärb') || (r('farbe') && r('kost|teuer|preis|wie ?viel|wieviel|was kostet|was würde'))) {
    const db = SCHADEN_DB.lack;
    return `**Umlackierung / andere Farbe – Kosten – ${carData.name}**\n\n` +
      `Einzelnes Teil (Motorhaube, Kotflügel, Tür): **800–3.500 €**.\n` +
      `Komplette Neulackierung (ganzes Fahrzeug): **3.500–9.000 €** beim Fachbetrieb.\n` +
      `Echter Farbwechsel (mit Türfalzen, Kanten und Motorraum): am oberen Ende bzw. darüber.\n\n` +
      `**Worauf achten:** Schichtdicke messen (Original < 120 μm, nachlackiert > 180 μm), Farbabweichung im Schräglicht prüfen.\n` +
      `**Wertverlust:** ${db.preisAbzug} bei nachweisbarer Umlackierung.\n` +
      `**Tipp:** ${db.adacTipp}`;
  }

  // ── Farbe & Exterieur ──
  if (r('farbe|außenfarbe|lackier|exterieur|color')) {
    return `**Exterieur – ${carData.name}**\n\nAußenfarbe: ${carData.color || '–'}\nPolster: ${carData.polster || '–'} · Innenfarbe: ${carData.interiorColor || '–'}\n\n${(carData.color||'').toLowerCase().includes('individual')||(carData.color||'').toLowerCase().includes('sonder') ? 'Sonderfarbe: Beim Weiterverkauf etwas mehr Verhandlungszeit einplanen – aber für Liebhaber sehr attraktiv.' : 'Standardfarbe – gute Wiederverkäuflichkeit.'}`;
  }

  // ── Fahrzeugalter: Was bedeutet ein älteres Auto für mich? ──
  // (not a tyre/wheel-age question — those defer to the Reifen branch)
  if (r('\\balte?s?\\b|\\balter\\b|\\bälter|baujahr|gereift|veraltet|fahrzeugalter|jahre alt|zu alt') && !r('reifen|felgen')) {
    return `**Fahrzeugalter – ${carData.name} (${carData.yearBuilt}, ${age} Jahre)**\n\n` +
      `Was ein höheres Alter für Sie bedeutet:\n` +
      `• Verschleißteile altern mit: Gummis, Dichtungen, Schläuche, Stoßdämpfer und Batterie sind eher fällig.\n` +
      `• Elektronik/Sensoren können vereinzelt Aussetzer haben – Fehlerspeicher auslesen lassen (ca. 25–30 €).\n` +
      `• Rost prüfen: Schweller, Radläufe, Türunterkanten und Unterboden.\n` +
      `• Positiv: Ersatzteile sind gut verfügbar und meist günstig, der stärkste Wertverlust ist längst vorbei.\n\n` +
      (carData.maintenanceRecords ? `Mit ${carData.maintenanceRecords} Service-Einträgen ist die Historie ${carData.maintenanceRecords >= age ? 'solide' : 'nur teilweise'} dokumentiert.\n\n` : '') +
      `Empfehlung: Ein kurzer Vorab-Check (ADAC/Werkstatt, 100–180 €) gibt Sicherheit. Für dieses Alter sind über die ersten 2 Jahre ca. 1.000–2.500 € Wartung üblich – gut planbar.`;
  }

  // ── Unfall: Käuferstrategie / Verhandlung ──
  if (r('umgang|wie soll ich|was tun|strategie|ratschlag|vorgehen|wie gehe ich|was mache ich')) {
    if (!hasAccidents) {
      return `Der ${carData.name} hat keine bekannte Unfallhistorie.\n\nEmpfehlung: Lackschichtdicke messen lassen (unter 120 μm = original). Bei der Probefahrt auf ungewöhnliche Geräusche und ungleichmäßige Spaltmaße achten.`;
    }
    const acc = carData.accidents[0];
    const totalRepair = carData.accidents.reduce((s, a) => s + (a.repairCost || 0), 0);
    const repairStr = totalRepair > 0 ? `${totalRepair.toLocaleString('de-DE')} €` : 'dokumentiert';
    const discountMin = totalRepair > 0 ? Math.max(500, Math.round(totalRepair * 0.8 / 100) * 100) : 1000;
    const damageChecks: Partial<Record<string, string>> = {
      heck: 'Kofferraumklappe auf Spaltmaße, PDC-Sensoren testen, Stoßfänger und Dichtungen prüfen',
      front: 'Kühlergrill, Scheinwerfer, Achsverhalten bei Geradeausfahrt, Kühlwasserstand',
      seite: 'Türen öffnen/schließen, Windgeräusche bei Fahrt, Spaltmaße Kotflügel und A-Säule',
      motor: 'Motorraum auf Ölflecken, Kaltstart, Kompression und Steuerkette testen lassen',
      struktur: 'Achsvermessung zwingend, Karosserievermessung beim Fachbetrieb',
    };
    const checkTip = (acc.damageKey && damageChecks[acc.damageKey as string]) ?? 'Spaltmaße, Lackbild und reparierte Stellen auf Unregelmäßigkeiten prüfen';
    return `**So gehst du mit dem Unfallschaden um**\n\n` +
      `Dieser ${carData.name} hat **${carData.accidents.length} Unfall${carData.accidents.length > 1 ? 'schäden' : ''}** (Reparatur: ${repairStr}). So gehst du vor:\n\n` +
      `**1. Dokumente verlangen**\n` +
      `• Original-Reparaturrechnung vom Betrieb\n` +
      `• Fotos vor/nach der Reparatur\n` +
      `• DEKRA-Gutachten, falls vorhanden\n\n` +
      `**2. Preisverhandlung**\n` +
      `Unfallwagen verlieren **10–20 %** Marktwert. Sage: „Der Schaden mindert den Wiederverkaufswert — ich erwarte einen Abzug von mind. ${discountMin.toLocaleString('de-DE')} €."\n\n` +
      `**3. Vor Ort prüfen**\n` +
      `• ${checkTip}\n` +
      `• Lackschichtdicke messen: über 180 μm deutet auf Umlackierung hin\n\n` +
      `**4. Gutachten empfohlen**\n` +
      `DEKRA/TÜV für 200–400 € — lohnt sich bei diesem Preis.\n\n` +
      `💡 Ein dokumentierter Schaden ist ehrlicher als ein unreportierter. Mit Rechnung und Gutachten bist du auf der sicheren Seite.` +
      warrantyBlock(carData);
  }

  // ── Unfall & Schäden ──
  if (r('unfall|schaden|reparatur|langzeit')) {
    if (!hasAccidents) return `Der ${carData.name} hat keine bekannte Unfallhistorie.\n\nEmpfehlung: Lackschichtdicke messen lassen (unter 120 μm = Original). Bei der Probefahrt auf ungewöhnliche Geräusche und ungleichmäßige Spaltmaße achten.`;
    const folgen = getSchadenFolgen(carData.accidents);
    let reply = `**Unfallhistorie – ${carData.name}**\n\n`;
    (folgen || []).forEach(({ acc, db }) => {
      reply += `${acc.type} · ${acc.date}`;
      if (acc.repairCost) reply += ` · Reparatur: ${acc.repairCost.toLocaleString('de-DE')} €`;
      reply += `\n${acc.damage}\n`;
      if (db) reply += `\nWas prüfen: ${db.kurzfristig}\nLangfristig: ${db.langfristig}\nHinweis: ${db.adacTipp}\n`;
      reply += '\n';
    });
    return reply.trim() + warrantyBlock(carData);
  }

  // ── Karosserie & Lack ──
  if (r('karosserie|lack|spaltmaß|beul|umlackier|schichtdicke|lackdicke')) {
    // Alles rund um Umlackierung (mit oder ohne Kostenfrage)
    if (r('umlackier|neulackier')) {
      const db = SCHADEN_DB.lack;
      const withCost = r('teuer|kost|preis|wie viel|wieviel|was kostet|was würde');
      return `**Umlackierung – ${withCost ? 'Kosten & Hinweise' : 'Was ist das & was kostet es?'}**\n\n` +
        `Eine **Umlackierung** bedeutet, dass ein oder mehrere Karosserieteile des Autos neu lackiert wurden — entweder nach einem Unfall, um Kratzer zu beheben, oder um die Farbe zu ändern.\n\n` +
        `**Kosten:**\n` +
        `• Einzelnes Panel (Motorhaube, Kotflügel): **800–3.500 €**\n` +
        `• Ganzes Fahrzeug beim Fachbetrieb: **3.500–9.000 €**\n\n` +
        `**So erkennt man eine Umlackierung:**\n` +
        `• Lackschichtdicke messen (Leihgerät ~10 €): Original BMW unter 120 μm, nach Umlackierung über 180 μm\n` +
        `• Im Schräglicht auf Farbabweichungen prüfen — billige Umlackierungen sehen je nach Winkel anders aus\n` +
        `• Gummidichtungen an Türen auf Lacknebel prüfen\n\n` +
        `**Wertverlust:** ${db.preisAbzug} bei nachgewiesener Umlackierung.\n` +
        `💡 ${db.adacTipp}`;
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
    const flags: string[] = [];
    const notes: string[] = [];
    if (hasAccidents) flags.push(`${carData.accidents.length} Unfall (–10–20 %)`);
    if (carData.owners > Math.ceil(age / 3)) flags.push(`${carData.owners} Vorbesitzer (–5–10 %)`);
    if (!carData.maintenanceRecords) flags.push('keine Servicenachweise (–8 %)');
    if (carData.km > age * 18000) flags.push('überdurchschnittliche Laufleistung (–5 %)');
    if (['Euro 5', 'Euro 4', 'Euro 3'].includes(carData.emission || ''))
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
  if (r('auffällig|besonderheit|scheinwerfer|laser|fahrverbot|emission|plakette|euro')) {
    const auff = detectAuffaelligkeiten(carData);
    if (!auff.length) return `Beim ${carData.name} (${carData.yearBuilt}, ${carData.km.toLocaleString('de-DE')} km) wurden keine besonderen Auffälligkeiten erkannt.`;
    let reply = `**Hinweise zum ${carData.name}**\n\n`;
    auff.forEach(a => {
      reply += `**${a.title}**\n`;
      reply += `${a.detail}\n`;
      if (a.flag === 'FAHRVERBOT_RISIKO') {
        reply += `Lösung: Eine grüne Feinstaubplakette kostet ca. 10 € und deckt viele Städte ab. Für Fahrverbotszonen gibt es Tagespässe ab 12 €. Für die meisten Fahrten bleibt das Fahrzeug alltagstauglich.\n`;
      } else {
        reply += `${a.tip}\n`;
      }
      reply += '\n';
    });
    return reply.trim();
  }

  // ── Jahreskosten ──
  if (r('jahreskosten|unterhalt|laufende kosten|kosten.*jahr|wie viel.*kostet')) {
    const cons = parseFloat((carData.consumption || '7').replace(',', '.'));
    const fuelP = carData.fuel === 'Diesel' ? 1.75 : carData.fuel === 'Elektro' ? 0.35 : 1.85;
    const fuel = Math.round(cons * 15000 / 100 * fuelP);
    const kw = parseInt(carData.enginePower || '100') || 100;
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
    const checks: [string, string][] = [
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
    const found: string[] = [];
    const notFound: string[] = [];
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
      `Zu welchem Bereich möchten Sie genauere Kosteninformationen?` +
      warrantyBlock(carData);
  }

  // ── Default: freie Fragen ──
  const topics = ['Kilometerstand', 'Preis & Verhandlung', 'Motor', 'Getriebe', 'Bremsen', 'Fahrwerk', 'Innenraum', 'Elektronik', 'Servicehistorie', 'Probefahrt', 'Karosserie & Lack', 'Umlackierungskosten', 'Jahreskosten'];
  return `**${carData.name} (${carData.yearBuilt}, ${carData.km.toLocaleString('de-DE')} km)**\n\n` +
    `Ich beantworte gerne Ihre Fragen zu diesem Fahrzeug. Zum Beispiel:\n` +
    topics.map(t => `· ${t}`).join('\n') +
    `\n\nOder fragen Sie direkt: z. B. „Wie teuer ist eine Umlackierung?", „Wie ist der Kilometerstand zu bewerten?" oder „Was sollte ich bei der Probefahrt achten?"`;
}
