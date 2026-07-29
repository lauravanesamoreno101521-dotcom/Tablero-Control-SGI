// Datos y utilidades del módulo Ambiental > Consumo servicios públicos.
// La información base fue extraída de "CONSOLIDADO SERVICIOS PUBLICOS 2025-2026.xlsx"
// (hojas "consolidado 2025" / "Consolidado 2026" para el detalle por sede y mes, y
// "Indicadores 2025" / "Indicadores 2026" para los insumos mensuales de indicadores:
// agua/energía totales de la empresa y número de personas administrativas/activas).

import rawRecords from './publicServicesRecordsData.json';
import rawIndicatorInputs from './publicServicesIndicatorInputsData.json';

export type PublicServiceRecord = {
  id: string;
  year: number;
  month: number; // 1-12
  sede: string;
  energyValue: number;
  energyKwh: number;
  waterValue: number;
  waterAcueducto: number;
  waterAlcantarillado: number;
  totalWater: number;
  totalInvoice: number;
  note: string;
};

// Insumos mensuales (a nivel empresa, no por sede) tal como se cargan en la hoja
// "Indicadores 2025/2026" del Excel: consumo total de agua/energía del mes y número de
// personas administrativas / personal activo total. A partir de estos 6 valores se calculan
// los 8 indicadores derivados con exactamente las mismas fórmulas del Excel (ver
// computePublicServiceIndicatorRatios).
export type PublicServiceIndicatorRecord = {
  id: string;
  year: number;
  month: number; // 1-12
  waterM3: number;
  energyKwh: number;
  waterValue: number;
  energyValue: number;
  adminEmployees: number;
  totalEmployees: number;
};

export type PublicServiceIndicatorRatios = {
  waterPerAdminM3: number | null;
  waterPerTotalM3: number | null;
  energyPerAdminKwh: number | null;
  energyPerTotalKwh: number | null;
  waterPerAdminValue: number | null;
  waterPerTotalValue: number | null;
  energyPerAdminValue: number | null;
  energyPerTotalValue: number | null;
};

const divideOrNull = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? numerator / denominator : null;

// Mismas fórmulas de la hoja "Indicadores": cada indicador es el consumo total del mes
// dividido entre el número de personas (administrativas o personal activo total).
export const computePublicServiceIndicatorRatios = (
  record: Pick<PublicServiceIndicatorRecord, 'waterM3' | 'energyKwh' | 'waterValue' | 'energyValue' | 'adminEmployees' | 'totalEmployees'>
): PublicServiceIndicatorRatios => ({
  waterPerAdminM3: divideOrNull(record.waterM3, record.adminEmployees),
  waterPerTotalM3: divideOrNull(record.waterM3, record.totalEmployees),
  energyPerAdminKwh: divideOrNull(record.energyKwh, record.adminEmployees),
  energyPerTotalKwh: divideOrNull(record.energyKwh, record.totalEmployees),
  waterPerAdminValue: divideOrNull(record.waterValue, record.adminEmployees),
  waterPerTotalValue: divideOrNull(record.waterValue, record.totalEmployees),
  energyPerAdminValue: divideOrNull(record.energyValue, record.adminEmployees),
  energyPerTotalValue: divideOrNull(record.energyValue, record.totalEmployees)
});

// Metas definidas en la hoja "METAS" del Excel de origen.
export const PUBLIC_SERVICES_TARGETS = {
  energyPerEmployeeKwh: 100,
  waterPerEmployeeM3: 3.4
};

export const PUBLIC_SERVICES_MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export const normalizePublicServiceSede = (value: string) => value.trim().toUpperCase();

const seedRecords: PublicServiceRecord[] = (rawRecords as Omit<PublicServiceRecord, 'id'>[]).map((row, index) => ({
  ...row,
  sede: normalizePublicServiceSede(row.sede),
  id: `psr-seed-${index + 1}`
}));

export const INITIAL_PUBLIC_SERVICE_RECORDS: PublicServiceRecord[] = seedRecords;

export const INITIAL_PUBLIC_SERVICE_INDICATOR_RECORDS: PublicServiceIndicatorRecord[] = (
  rawIndicatorInputs as Omit<PublicServiceIndicatorRecord, 'id'>[]
).map((row, index) => ({
  ...row,
  id: `psi-seed-${index + 1}`
}));
