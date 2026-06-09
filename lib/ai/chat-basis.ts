/** Deterministic label for the source a chat answer is grounded in. First match wins. */
export function basisForMessage(message: string): string {
  const m = message.toLowerCase();
  if (/garantie|gewährleist|abgedeckt|abgesichert/.test(m)) return 'BMW Garantie-Bedingungen';
  if (/preis|\bwert\b|markt|verhandl|rabatt|teuer|günstig|nachlass|angebot/.test(m)) return 'Marktvergleich & Kostenschätzung';
  if (/kost|unterhalt|jahreskosten|verbrauch/.test(m)) return 'Kostenschätzung';
  if (/was ist|was bedeutet|was hei(ß|ss)t|erklär|wofür|wozu/.test(m)) return 'Wissensdatenbank';
  if (/unfall|schaden|reparatur|lack|umlackier/.test(m)) return 'Schadens-Datenbank & Fahrzeugdaten';
  return 'Fahrzeugdaten & Prüf-Erfahrung';
}
