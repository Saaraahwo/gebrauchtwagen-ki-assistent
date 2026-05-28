import type { Car, Findings } from './types';

export function runRulesEngine(carData: Car): Findings {
  const findings: Findings = {
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
  const suspiciousPrices: Record<string, number> = {
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
