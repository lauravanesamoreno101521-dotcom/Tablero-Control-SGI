// Datos y utilidades del módulo Ambiental > Consumo servicios públicos.
// La información base fue extraída de "CONSOLIDADO SERVICIOS PUBLICOS 2025-2026.xlsx"
// (hojas "consolidado 2025" / "Consolidado 2026" para el detalle por sede y mes, y
// "Indicadores 2025" / "Indicadores 2026" para el número de administrativos usado en
// el cálculo de consumo por empleado).

import rawRecords from './publicServicesRecordsData.json';
import rawEmployeeCounts from './publicServicesEmployeeCountsData.json';

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

export type PublicServiceEmployeeCount = {
  year: number;
  month: number;
  adminEmployees: number;
};

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

export const PUBLIC_SERVICE_EMPLOYEE_COUNTS: PublicServiceEmployeeCount[] = rawEmployeeCounts as PublicServiceEmployeeCount[];

export const getPublicServiceAdminEmployees = (year: number, month: number): number | null => {
  const match = PUBLIC_SERVICE_EMPLOYEE_COUNTS.find((row) => row.year === year && row.month === month);
  return match ? match.adminEmployees : null;
};
