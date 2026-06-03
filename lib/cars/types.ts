export type DamageKey =
  | 'lack' | 'heck' | 'front' | 'motor' | 'struktur'
  | 'getriebe' | 'seite' | 'glas';

export interface Accident {
  type: string;
  damage: string;
  damageKey?: DamageKey;
  repairCost?: number;
  date: string;
  repaired?: boolean;
}

export interface CarSpecs {
  displacement: string;
  cylinders: number;
  powerKw: number;
  powerPs: number;
  torque: number;
  acceleration: number;
  topSpeed: number;
  consumptionCity: string;
  consumptionHighway: string;
  consumptionCombined: string;
  co2: number;
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  weight: number;
  payload: number;
  bootVolume: number;
  bootVolumeMax?: number;
  tankVolume: number;
  tireSize: string;
}

export interface Car {
  id: number;
  name: string;
  subtitle?: string;
  price: number;
  km: number;
  yearBuilt: number;
  owners: number;
  maintenanceRecords: number;
  features: string[];
  accidents: Accident[];
  color?: string;
  enginePower?: string;
  fuel?: string;
  transmission?: string;
  emission?: string;
  consumption?: string;
  featureGroups?: Record<string, string[]>;
  polster?: string;
  interiorColor?: string;
  colorHex?: string;
  imgExterior?: string;
  imgInterior?: string;
  erstzulassung?: string;
  drive?: string;
  hu?: string;
  doors?: number;
  seats?: number;
  badge?: string | null;
  description?: string;
  specs?: CarSpecs;
}

export type Severity = 'red' | 'orange' | 'green';

export interface Finding {
  flag: string;
  message: string;
  severity: Severity;
  tip: string;
}

export interface Findings {
  red: Finding[];
  orange: Finding[];
  green: Finding[];
}

export type AnomalySeverity = 'info' | 'warning' | 'critical';

export interface Anomaly {
  flag: string;
  title: string;
  detail: string;
  tip: string;
  severity: AnomalySeverity;
}

export interface PriceAmpel {
  status: 'gut' | 'normal';
  label: string;
  expected: number;
  diff: number;
}

export interface DamageInfo {
  name: string;
  risiko: 'niedrig' | 'mittel' | 'hoch' | 'kritisch';
  kurzfristig: string;
  mittelfristig: string;
  langfristig: string;
  pruefung: string;
  kosten: string;
  preisAbzug: string;
  adacTipp: string;
}
