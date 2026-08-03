// Datos y utilidades del módulo Ambiental > CO2 por kilometraje.
// La información base fue extraída de "FT-GEI-A-016 V2_Consumo combustible Vs
// Kilometros recorridos CO2.xls" (hojas Consolidado_2024/2025/2026), agregada a
// nivel placa + año + mes + combustible para conservar la precisión del cálculo
// de CO2 (que depende del factor de emisión por tipo de combustible) sin
// necesidad de guardar cada evento de tanqueo individual.
// Los factores de emisión (kg CO2 / litro) provienen de la hoja "Parametros".
// ELECTRICO se define en 0 (vehículo eléctrico, sin combustión). GASOELECTRICO
// (híbrido) usa el factor de GAS - GASOLINA como aproximación conservadora.

import rawRecords from './co2KilometrajeData.json';
import emissionFactors from './co2EmissionFactorsData.json';

export type Co2KilometrajeRecord = {
  id: string;
  placa: string;
  year: number;
  month: number; // 1-12
  combustible: string;
  claseVehiculo: string;
  ciudad: string;
  kilometraje: number;
  galones: number;
  litros: number;
};

export const CO2_MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export const CO2_EMISSION_FACTORS: Record<string, number> = emissionFactors as Record<string, number>;

export const CO2_FUEL_OPTIONS = Object.keys(CO2_EMISSION_FACTORS);

// 1 árbol adulto compensa en promedio ~21 kg de CO2 al año (referencia usada en
// la hoja GRAFICA del Excel de origen para el indicador "árboles a compensar").
export const CO2_KG_PER_TREE = 21;

export const normalizeCo2Fuel = (raw: string): string => {
  const s = String(raw || '').trim().toUpperCase();
  if (s.includes('DIESEL') || s.includes('ACPM')) return 'ACPM - DIESEL';
  if (s.includes('EXTRA')) return 'GASOLINA EXTRA';
  if (s.includes('CORRIENTE')) return 'GASOLINA CORRIENTE';
  if (s.includes('GNC') || s.includes('GAS NATURAL')) return 'GNC (Gas Natural Comprimido)';
  if (s === 'GASOLEC' || s.includes('GAS - GASOLINA') || s.includes('GAS/GASOLINA')) return 'GAS - GASOLINA';
  if (s.includes('GASOELECTRICO')) return 'GASOELECTRICO (HIBRIDO)';
  if (s.includes('ELECTRICO')) return 'ELECTRICO';
  if (s.includes('GASOLINA')) return 'GASOLINA CORRIENTE';
  return s || 'SIN DATO';
};

export const normalizeCo2Placa = (value: string) => value.trim().toUpperCase();

const stripAccents = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Unifica variantes de una misma clase de vehículo que solo difieren en tildes (p. ej.
// "CAMION" vs "CAMIÓN"), dejando siempre la forma con tilde como canónica. No toca otras
// clases (como "CAMION DC ESTACA") que son legítimamente distintas.
export const normalizeClaseVehiculo = (raw: string): string => {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return 'SIN CLASE';
  if (stripAccents(s) === 'CAMION') return 'CAMIÓN';
  return s;
};

// CO2 emitido (kg) = litros consumidos x factor de emisión del combustible.
export const computeCo2Kg = (litros: number, combustible: string): number => {
  const factor = CO2_EMISSION_FACTORS[combustible];
  if (typeof factor !== 'number') return 0;
  return litros * factor;
};

export const computeCo2TreesToOffset = (co2Kg: number): number => co2Kg / CO2_KG_PER_TREE;

const seedRecords: Co2KilometrajeRecord[] = (rawRecords as Omit<Co2KilometrajeRecord, 'id'>[]).map((row, index) => ({
  ...row,
  placa: normalizeCo2Placa(row.placa),
  combustible: normalizeCo2Fuel(row.combustible),
  claseVehiculo: normalizeClaseVehiculo(row.claseVehiculo),
  id: `co2-seed-${index + 1}`
}));

export const INITIAL_CO2_KILOMETRAJE_RECORDS: Co2KilometrajeRecord[] = seedRecords;
