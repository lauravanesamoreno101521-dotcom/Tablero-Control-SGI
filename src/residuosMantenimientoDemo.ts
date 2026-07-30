// Datos y utilidades del módulo Ambiental > Residuos de mantenimiento.
// La información base fue extraída de "Residuos Mantenimiento_RESPEL_2023_2024_2025_2026.xlsx":
// - Hoja "REPORTE 2025": registro detallado por entrega de residuo (gestor, empresa, corriente,
//   manejo, cantidad), formato que también usa la carga masiva de Excel.
// - Hoja "EMPRESTUR 2024": tabla dinámica residuo x mes, transpuesta a un registro por
//   residuo/mes conservando el total mensual (sin detalle de gestor/manejo por evento, por lo
//   que esos campos quedan en "Sin dato histórico" para los años 2023 y 2024).
// - Hoja "REPORTE 2023": registro detallado por entrega, con nombres de residuo unificados a
//   los mismos usados en 2025 (p. ej. "Aceite" -> "Aceites") para que los indicadores por tipo
//   de residuo sumen correctamente entre años.

import rawRecords from './residuosMantenimientoData.json';

export type ResiduoRecord = {
  id: string;
  year: number;
  month: number; // 1-12
  gestor: string;
  empresa: string;
  residuo: string;
  corriente: string;
  descripcion: string;
  estadoMateria: string;
  unidad: string; // KILOS | GALONES | UNIDADES
  manejo: string;
  cantidad: number;
};

export const RESIDUOS_MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export const RESIDUOS_UNIDAD_OPTIONS = ['KILOS', 'GALONES', 'UNIDADES'];

export const normalizeResiduoUnidad = (raw: string): string => {
  const s = String(raw || '').trim().toUpperCase();
  if (s.includes('GAL')) return 'GALONES';
  if (s.includes('KIL') || s === 'KG') return 'KILOS';
  if (s.includes('UNID')) return 'UNIDADES';
  return s || 'KILOS';
};

// "Aprovechado" agrupa los manejos que representan un residuo que se recupera/recicla en vez de
// ir a disposición final, igual que en la columna MANEJO del Excel de origen.
export const isResiduoAprovechado = (manejo: string): boolean =>
  /aprovecha|reciclaje|posconsumo/i.test(manejo);

const seedRecords: ResiduoRecord[] = (rawRecords as Omit<ResiduoRecord, 'id'>[]).map((row, index) => ({
  ...row,
  unidad: normalizeResiduoUnidad(row.unidad),
  id: `res-seed-${index + 1}`
}));

export const INITIAL_RESIDUOS_MANTENIMIENTO_RECORDS: ResiduoRecord[] = seedRecords;
