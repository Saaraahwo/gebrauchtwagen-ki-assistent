import type { Car } from './types';

export interface EquipmentEntry {
  /** Display name of the equipment/term. */
  term: string;
  /** Regex source (matched case-insensitively) against the user's question and the car's features. */
  pattern: string;
  /** Conversational, buyer-oriented explanation. */
  answer: string;
}

// Canonical knowledge base for every Ausstattung item in the inventory.
// ORDER MATTERS: more specific entries come first so e.g. "M Fahrwerk Professional"
// is matched before the generic "M Fahrwerk", and "Keramikbremse" before "Carbon".
export const EQUIPMENT: EquipmentEntry[] = [
  // ── Fahrwerk / Performance ──
  {
    term: 'M Fahrwerk Professional',
    pattern: 'm fahrwerk professional',
    answer: 'Das M Fahrwerk Professional ist die sportlichste Fahrwerksstufe von BMW M. Es kombiniert ein adaptives, elektronisch geregeltes Dämpfersystem mit zusätzlicher Aktivlenkung und einem aktiven Sperrdifferenzial. Ergebnis: sehr präzises, agiles Handling auf der Landstraße und der Rennstrecke, bei Bedarf aber komfortabler im Alltagsmodus. Beim Kauf: Funktion der adaptiven Dämpfer auf der Probefahrt in „Comfort" und „Sport" testen – die Verstellung muss spürbar sein.',
  },
  {
    term: 'Adaptives M Fahrwerk',
    pattern: 'adaptives m fahrwerk|m fahrwerk(?! professional)|adaptives fahrwerk',
    answer: 'Das Adaptive M Fahrwerk ist ein elektronisch geregeltes Sportfahrwerk. Die Stoßdämpfer passen sich per Knopfdruck (Comfort/Sport) und automatisch an die Fahrsituation an – straffer beim sportlichen Fahren, komfortabler im Alltag. Beim Kauf: auf der Probefahrt zwischen den Modi umschalten, der Unterschied muss deutlich spürbar sein; Dämpfer dürfen nicht klappern oder ölen.',
  },
  {
    term: 'M Carbon Keramikbremse',
    pattern: 'keramik',
    answer: 'Die M Carbon Keramikbremse ist eine Hochleistungsbremse aus Carbon-Keramik. Sie ist extrem standfest (kaum Fading), leichter und langlebiger als Stahlbremsen – aber im Ersatz sehr teuer (mehrere Tausend Euro pro Achse). Beim Kauf: Scheiben auf Risse und Riefen prüfen lassen und nach dem Verschleißzustand fragen, da ein Tausch erheblich ins Geld geht.',
  },
  {
    term: 'M Carbon Sitze',
    pattern: 'm carbon sitze|carbon sitze',
    answer: 'M Carbon Schalensitze haben eine Sitzschale aus Carbon – sehr leicht, mit ausgeprägtem Seitenhalt für sportliches Fahren. Sehr begehrt und werterhaltend. Beim Kauf: Carbon-Schalen auf Kratzer/Risse prüfen und die Bequemlichkeit auf einer längeren Probefahrt testen (sie sind straffer als Komfortsitze).',
  },
  {
    term: 'Carbonpaket',
    pattern: 'carbonpaket',
    answer: 'Das Carbonpaket umfasst Zierteile aus Sichtcarbon (z. B. Spiegelkappen, Heckdiffusor, Interieurleisten). Es bringt sportliche Optik und etwas Gewichtsersparnis und ist bei M-Modellen werterhaltend. Beim Kauf: Carbonflächen auf Lackschäden, Steinschläge und Klarlack-Trübung prüfen – Reparaturen sind teuer.',
  },
  {
    term: "M Driver's Package",
    pattern: "m driver'?s? package",
    answer: 'Das M Driver’s Package hebt die elektronisch abgeregelte Höchstgeschwindigkeit an (oft von 250 auf 280–305 km/h) und beinhaltet meist ein Fahrertraining. Es signalisiert ein vollwertiges M-Modell und ist werterhaltend. Beim Kauf: Eintrag in den Papieren bzw. Nachweis verlangen.',
  },
  {
    term: 'M Sportpaket',
    pattern: 'm ?sport ?paket|m ?sport\\b',
    answer: 'Das M Sportpaket ist das sportliche Optik- und Fahrwerkspaket. Es umfasst typischerweise ein strafferes M Sportfahrwerk, M Aerodynamik (Stoßstangen, Schweller), Sportsitze, M Lederlenkrad, größere Räder und Dekoreinlagen. Es verbessert Optik und Handling und erhöht den Wiederverkaufswert um ca. 5–10 %. Beim Kauf: unbedingt hervorheben – M Sport ist sehr gefragt.',
  },
  {
    term: 'Competition',
    pattern: 'competition',
    answer: 'Competition ist die leistungsgesteigerte Top-Ausführung der M-Modelle: mehr PS, ein strafferes, spezifisch abgestimmtes Fahrwerk, sportlichere Auspuffanlage und eigene Optikdetails. Sehr begehrt und werterhaltend. Beim Kauf: weil Competition-Modelle oft sportlich bewegt werden, einen Check von Bremsen, Reifen und Fahrwerk einplanen.',
  },

  // ── Linien & Pakete ──
  {
    term: 'Shadow Edition',
    pattern: 'shadow edition',
    answer: 'Die Shadow Edition ist ein Optikpaket mit abgedunkelten Elementen – verdunkelte Niere, Scheinwerfer und Endrohre sowie schwarze Zierteile statt Chrom. Rein optisch, ohne technische Änderung, aber bei Käufern beliebt. Beim Kauf: ein reiner Ausstattungsvorteil, gut für die Vermarktung.',
  },
  {
    term: 'Luxury Line',
    pattern: 'luxury line',
    answer: 'Die Luxury Line ist BMWs Komfort- und Eleganzlinie. Sie setzt auf hochwertige Materialien, feinere Hölzer/Leder und dezente Chromakzente statt sportlicher Optik. Sie spricht eine andere Käufergruppe an als das M Sportpaket – beide sind gut wiederverkäuflich.',
  },
  {
    term: 'Urban Line',
    pattern: 'urban line',
    answer: 'Die Urban Line ist eine stadtorientierte Ausstattungslinie mit eigener, schlichter Optik (oft weiße/helle Akzente). Sie ist alltagstauglich und unaufgeregt. Beim Kauf: eine solide Basislinie ohne Aufpreis-Optik.',
  },
  {
    term: 'Advantage Paket',
    pattern: 'advantage',
    answer: 'Das Advantage Paket ist ein Preis-Leistungs-Paket mit den wichtigsten Komfort-Extras gebündelt – meist Klimaautomatik, PDC, Tempomat und Sitzheizung. Es macht das Fahrzeug alltagstauglich ausgestattet, ohne teure Einzeloptionen. Beim Kauf: deckt die Basics ab, gutes Gesamtpaket.',
  },
  {
    term: 'Premium Paket',
    pattern: 'premium paket',
    answer: 'Das Premium Paket bündelt hochwertige Komfort- und Technik-Optionen, je nach Modell z. B. Lederausstattung, erweiterte Navigation, Sitzheizung und Assistenzsysteme. Es hebt die Ausstattung deutlich an und ist werthaltig. Beim Kauf: genauen Inhalt im Fahrzeugschein/der Liste prüfen, da er je nach Baujahr variiert.',
  },

  // ── Antrieb & Getriebe ──
  {
    term: 'xDrive (Allradantrieb)',
    pattern: 'xdrive|allrad',
    answer: 'xDrive ist BMWs intelligenter Allradantrieb. Er verteilt die Kraft variabel zwischen Vorder- und Hinterachse und sorgt für mehr Traktion und Sicherheit bei Nässe, Schnee und sportlicher Fahrt. xDrive erhöht den Wert gegenüber Heckantrieb um ca. 1.500–3.000 €. Beim Kauf: prüfen, ob xDrive im Typenschild/Fahrzeugschein steht – nicht nur im Inserat behauptet.',
  },
  {
    term: 'Steptronic / Automatik',
    pattern: 'steptronic|automatik|wandlerautomat',
    answer: 'Die Steptronic ist BMWs Automatikgetriebe (meist 8-Gang-Wandlerautomatik) mit der Möglichkeit, manuell über Schaltwippen einzugreifen. Sie schaltet komfortabel und ruckfrei und ist gefragter als Handschaltung. Beim Kauf: auf der Probefahrt alle Fahrstufen, Kickdown und sanftes Anfahren testen; Getriebeöl-Service-Historie erfragen.',
  },

  // ── Karosserie ──
  {
    term: 'Touring (Kombi)',
    pattern: 'touring',
    answer: 'Touring ist die Kombi-Variante mit großem, variabel teilbarem Kofferraum und oft elektrischer Heckklappe. Die familien- und transporttauglichste Karosserieform. Beim Kauf: Funktion der (elektrischen) Heckklappe und den Zustand der Laderaumabdeckung prüfen.',
  },
  {
    term: 'Cabriolet',
    pattern: 'cabrio',
    answer: 'Das Cabriolet ist die offene Variante mit Stoff- oder Hardtop-Verdeck. Es ist eher ein Saison-/Schönwetterfahrzeug. Beim Kauf: Verdeckfunktion mehrfach öffnen/schließen, Dichtungen und Verdeckstoff auf Risse/Undichtigkeit prüfen und auf Wasserränder im Innenraum achten.',
  },

  // ── Licht ──
  {
    term: 'Laserlicht',
    pattern: 'laser',
    answer: 'BMW Laserlicht erzeugt ein extrem helles Fernlicht mit sehr großer Reichweite (bis ca. 600 m). Es ist eine teure Premium-Option. Hinweis: In Österreich und der Schweiz gelten strengere Zulassungsregeln (ECE R149) – bei Auslandsfahrten Eintrag im Fahrzeugschein prüfen. Beim Kauf: Funktion und Steinschläge der Scheinwerfer prüfen (Ersatz ist teuer).',
  },
  {
    term: 'Adaptive LED-Scheinwerfer',
    pattern: 'adaptiv.*led|led.*scheinwer|led-?scheinwer|adaptiver led',
    answer: 'Adaptive LED-Scheinwerfer passen das Licht automatisch an: mitlenkendes Kurvenlicht und blendfreies Fernlicht, das entgegenkommende Fahrzeuge ausspart. Das verbessert die Sicht und Sicherheit bei Nacht deutlich. Beim Kauf: alle Lichtfunktionen und das automatische Abblenden testen.',
  },

  // ── Assistenz ──
  {
    term: 'Driving Assistant Professional',
    pattern: 'driving assistant professional',
    answer: 'Der Driving Assistant Professional ist das umfangreichste Assistenzpaket: adaptiver Abstandstempomat mit Stop&Go, aktiver Spurhalte- und Lenkassistent, Stauassistent, Notbrems- und Ausweichassistent. Es entlastet besonders auf langen Strecken. Beim Kauf: Funktionen auf der Probefahrt testen und Kameras/Sensoren (Windschutzscheibe, Stoßfänger) auf Beschädigung prüfen.',
  },
  {
    term: 'Driving Assistant',
    pattern: 'driving assistant',
    answer: 'Der Driving Assistant ist das Fahrassistenzpaket mit u. a. Spurverlassens- und Auffahrwarnung, Notbremsassistent und Totwinkel-Warnung. Es erhöht die Sicherheit im Alltag. Beim Kauf: Warn- und Bremsfunktionen testen, Fehlermeldungen im Display ausschließen.',
  },
  {
    term: 'Park-/Einparkassistent (PDC)',
    pattern: 'parking assistant|parkassistent|einparkhilf|\\bpdc\\b',
    answer: 'Parkassistent/PDC unterstützt beim Einparken: Abstandssensoren (vorne/hinten) mit Warnton, oft mit Kamera und automatischer Lenkung in Parklücken. Beim Kauf: alle Sensoren auf gleichmäßiges Ansprechen prüfen (defekte Sensoren piepen dauerhaft) und das Kamerabild auf Klarheit kontrollieren.',
  },
  {
    term: 'Nacht-Sicht-Assistent',
    pattern: 'nacht-?sicht',
    answer: 'Der Nacht-Sicht-Assistent nutzt eine Wärmebildkamera, die Personen und Tiere im Dunkeln früher erkennt als das Scheinwerferlicht und im Display anzeigt – ein Sicherheitsplus bei Nachtfahrten über Land. Beim Kauf: Funktion und Kamerabild testen.',
  },

  // ── Komfort & Infotainment ──
  {
    term: 'Head-Up Display',
    pattern: 'head-?up|hud',
    answer: 'Das Head-Up Display blendet wichtige Infos (Tempo, Navigation, Assistenz, Verkehrszeichen) direkt in die Windschutzscheibe ein – der Blick bleibt auf der Straße. Ein beliebtes Komfort- und Sicherheits-Feature. Beim Kauf: auf Klarheit und korrekte Anzeige prüfen (Display darf nicht flackern).',
  },
  {
    term: 'Panorama-Glasdach',
    pattern: 'panorama|glasdach|schiebedach',
    answer: 'Das Panorama-Glasdach ist ein großflächiges, oft öffnendes Glasdach für mehr Licht und Raumgefühl. Beim Kauf: Öffnen/Schließen testen, Ablaufkanäle und Dichtungen auf Undichtigkeit prüfen (Wasserränder im Dachhimmel sind ein Warnsignal) und auf Knarzgeräusche achten.',
  },
  {
    term: 'Fond Entertainment',
    pattern: 'fond entertainment|rear seat entertainment',
    answer: 'Fond Entertainment sind Bildschirme und Medienanschlüsse für die Rücksitze – ideal für Familien und lange Fahrten. Eine teure Sonderausstattung. Beim Kauf: Bildschirme, Anschlüsse und Fernbedienung auf Funktion prüfen.',
  },
  {
    term: 'Harman Kardon Soundsystem',
    pattern: 'harman',
    answer: 'Harman Kardon ist ein Premium-Soundsystem mit mehr Lautsprechern und Verstärkerleistung als die Serienanlage – deutlich besserer Klang. Ein beliebtes Aufpreis-Feature. Beim Kauf: alle Lautsprecher auf Funktion (kein Knistern/Ausfall) prüfen.',
  },
  {
    term: 'High-End Soundsystem (Bang & Olufsen / Bowers & Wilkins)',
    pattern: 'bang ?& ?olufsen|bowers ?& ?wilkins|b ?& ?o\\b',
    answer: 'Bang & Olufsen bzw. Bowers & Wilkins sind High-End-Soundsysteme der Spitzenklasse – ein teures, hochwertiges Ausstattungs-Highlight mit exzellentem Klang. Beim Kauf: Funktion aller Lautsprecher prüfen; ein Defekt ist kostspielig zu beheben.',
  },
  {
    term: 'Komfortzugang (Keyless)',
    pattern: 'komfortzugang|keyless',
    answer: 'Der Komfortzugang erlaubt schlüsselloses Öffnen und Starten – der Schlüssel kann in der Tasche bleiben. Beim Kauf: Funktion an allen Türen und den Motorstart testen; Batterie im Schlüssel ggf. erneuern.',
  },
  {
    term: 'Soft-Close',
    pattern: 'soft.?close|komfortschließ',
    answer: 'Soft-Close zieht die Türen beim Schließen automatisch sanft und vollständig ins Schloss – komfortabel und hochwertig. Beim Kauf: an allen Türen testen; der Motor darf nicht hängen bleiben.',
  },
  {
    term: 'Standheizung',
    pattern: 'standheizung',
    answer: 'Die Standheizung heizt den Innenraum (und Motor) vor dem Losfahren auf – im Winter sehr komfortabel, kein Eiskratzen. Beim Kauf: Funktion per Fernbedienung/App testen; sie ist im Nachrüsten teuer, daher ein echter Pluspunkt.',
  },
  {
    term: 'Sitzheizung',
    pattern: 'sitzheizung',
    answer: 'Die Sitzheizung beheizt die Vordersitze (teils auch hinten) – ein beliebtes Komfort-Feature. Beim Kauf: alle Stufen auf Funktion prüfen (defekte Heizmatten sind teuer zu ersetzen).',
  },
  {
    term: 'Ambientebeleuchtung',
    pattern: 'ambiente',
    answer: 'Die Ambientebeleuchtung sorgt für stimmungsvolle Innenraumbeleuchtung in mehreren wählbaren Farben (Türen, Fußraum, Armaturen). Rein optischer Komfort. Beim Kauf: Funktion und Farbwechsel testen.',
  },
  {
    term: 'Lederausstattung',
    pattern: 'leder',
    answer: 'Eine Lederausstattung (z. B. Leder Dakota) ist hochwertig, pflegeleicht und werthaltiger als Stoff. Beim Kauf: Fahrersitzwange, Lenkrad und Sitzflächen auf Risse, Abrieb und Faltenbildung prüfen – stark abgenutztes Leder mindert den Wert und passt selten zum angegebenen Kilometerstand.',
  },
  {
    term: 'Navigation (Business / Professional)',
    pattern: 'navi|navigation',
    answer: 'Die Werksnavigation ist fest verbaut. „Business" ist die kleinere Variante, „Professional" bietet einen größeren Bildschirm, mehr Funktionen und bessere Grafik. Beim Kauf: Kartenstand prüfen und nachfragen, ob Karten-Updates verfügbar sind (ältere Systeme sind teils nicht mehr aktualisierbar).',
  },
  {
    term: 'Klimaautomatik',
    pattern: 'klimaaut|klimaanlage|4-?zonen|klimakomfort',
    answer: 'Die Klimaautomatik regelt die Temperatur automatisch; die 4-Zonen-Variante erlaubt getrennte Einstellungen für vorne und hinten links/rechts. Beim Kauf: Kühlleistung prüfen (zügiges Abkühlen) und das Datum des letzten Klimaservice erfragen (Kältemittel/Filter).',
  },
  {
    term: 'Widescreen / Live Cockpit',
    pattern: 'widescreen|live cockpit|digitales cockpit|kombiinstrument',
    answer: 'Das Widescreen-/digitale Cockpit kombiniert ein vollständig digitales Kombiinstrument mit großem, gebogenem Infotainment-Display. Modern und gut ablesbar. Beim Kauf: Display auf Pixelfehler, Flackern und Reaktion prüfen.',
  },
  {
    term: 'Wireless Charging',
    pattern: 'wireless charging|induktiv|kabellos.*lad',
    answer: 'Wireless Charging lädt kompatible Smartphones kabellos in einer Ablage. Praktischer Komfort. Beim Kauf: Ladefunktion mit einem passenden Handy testen.',
  },
  {
    term: 'Apple CarPlay',
    pattern: 'apple ?car ?play|carplay|android auto',
    answer: 'Apple CarPlay (bzw. Android Auto) spiegelt Smartphone-Apps wie Karten, Musik und Nachrichten auf den Bordbildschirm. Beim Kauf: Kopplung testen; bei älteren Modellen war CarPlay teils kostenpflichtig freizuschalten.',
  },
  {
    term: 'Aktivsitze',
    pattern: 'aktivsitz|massagesitz',
    answer: 'Aktivsitze bieten eine Massage-/Bewegungsfunktion für ermüdungsfreies Fahren auf langen Strecken – hoher Sitzkomfort. Beim Kauf: Massage- und Verstellfunktionen auf beiden Vordersitzen testen.',
  },
  {
    term: 'Anhängerkupplung',
    pattern: 'anhängerkupplung|\\bahk\\b|zugvorrichtung',
    answer: 'Eine Anhängerkupplung (oft schwenkbar/elektrisch) erlaubt Anhänger- und Fahrradträgerbetrieb. Beim Kauf: Funktion (Aus-/Einschwenken), Elektrik (13-poliger Stecker) und die zulässige Anhängelast in den Papieren prüfen.',
  },
  {
    term: 'Tempomat',
    pattern: 'tempomat|geschwindigkeitsregel',
    answer: 'Der Tempomat hält eine eingestellte Geschwindigkeit; die adaptive Variante (ACC) regelt zusätzlich den Abstand zum Vordermann automatisch. Beim Kauf: Funktion auf der Probefahrt testen.',
  },
  {
    term: 'Rückfahrkamera',
    pattern: 'rückfahrkamera|rückfahr|reversing camera',
    answer: 'Die Rückfahrkamera zeigt beim Rangieren den Bereich hinter dem Fahrzeug mit Hilfslinien. Beim Kauf: Bild auf Klarheit prüfen (beschlagene/blinde Kameras sind ein häufiger Mangel).',
  },
  {
    term: 'Leichtmetallfelgen',
    pattern: 'leichtmetallfelg|\\bfelg|\\d{2}\\s?(zoll|")',
    answer: 'Leichtmetallfelgen (z. B. 18–20 Zoll M-Felgen) verbessern Optik und ungefederte Massen. Größere Räder sehen sportlicher aus, machen die Reifen aber teurer und den Komfort etwas straffer. Beim Kauf: Felgen auf Bordsteinschäden, Schläge (Höhenschlag) und korrekte Reifengröße/-alter prüfen.',
  },
];

export interface EquipmentExplanation {
  term: string;
  answer: string;
}

/**
 * Returns the knowledge-base explanation for each equipment item THIS car has
 * (matched against its subtitle + features), specific terms before generic.
 * Pure (no DB) — used by the seller dashboard as a per-car cheat sheet.
 */
export function explainCarEquipment(car: Car): EquipmentExplanation[] {
  const parts = [car.subtitle ?? '', ...(car.features ?? [])];
  const out: EquipmentExplanation[] = [];
  const seen = new Set<string>();
  for (const entry of EQUIPMENT) {
    if (seen.has(entry.term)) continue;
    const re = new RegExp(entry.pattern, 'i');
    if (parts.some(p => re.test(p))) {
      seen.add(entry.term);
      out.push({ term: entry.term, answer: entry.answer });
    }
  }
  return out;
}
