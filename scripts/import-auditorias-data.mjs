import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excelFile = fs
  .readdirSync(root)
  .find((name) => name.toLowerCase().includes('auditorias') && name.endsWith('.xlsx'));

if (!excelFile) {
  throw new Error('No se encontró el archivo de Auditorías (.xlsx).');
}

const workbook = XLSX.readFile(path.join(root, excelFile));

const parseExcelDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      iso: value.toISOString().slice(0, 10),
      label: value.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      month: value.getMonth() + 1,
      year: value.getFullYear()
    };
  }
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial < 1) return null;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const date = new Date(excelEpoch.getTime() + Math.floor(serial) * 86400000);
  if (Number.isNaN(date.getTime())) return null;
  return {
    iso: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    label: date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    month: date.getMonth() + 1,
    year: date.getFullYear()
  };
};

const internaSheet = workbook.Sheets['CONSOLIDADO_AUDITORIA_INTERNA'];
const externaSheet = workbook.Sheets['CONSOLIDADO AUDITORIAS EXTERNAS'];

if (!internaSheet || !externaSheet) {
  throw new Error('No se encontraron las hojas CONSOLIDADO_AUDITORIA_INTERNA y CONSOLIDADO AUDITORIAS EXTERNAS.');
}

const internaRows = XLSX.utils.sheet_to_json(internaSheet, { defval: '' });
const externaRows = XLSX.utils.sheet_to_json(externaSheet, { defval: '' });

const internaRecords = internaRows
  .map((row, index) => {
    const eventDate = parseExcelDate(row['Fecha']);
    return {
      id: `aud-int-${index + 1}`,
      auditType: 'Interna',
      eventDate: eventDate?.iso ?? '',
      eventDateLabel: eventDate?.label ?? '',
      month: eventDate?.month ?? 0,
      year: eventDate?.year ?? 0,
      entity: String(row['Entidad'] ?? '').trim(),
      process: String(row['Proceso'] ?? '').trim(),
      actionType: String(row['Acción'] ?? row['Acci\u00f3n'] ?? '').trim(),
      openActions: Number(row['Total Acciones Abiertas'] ?? 0) || 0,
      closedActions: Number(row['Total Acciones Cerradas'] ?? 0) || 0
    };
  })
  .filter((row) => row.process || row.actionType);

const externaRecords = externaRows
  .map((row, index) => {
    const eventDate = parseExcelDate(row['Fecha']);
    return {
      id: `aud-ext-${index + 1}`,
      auditType: 'Externa',
      eventDate: eventDate?.iso ?? '',
      eventDateLabel: eventDate?.label ?? '',
      month: eventDate?.month ?? 0,
      year: eventDate?.year ?? 0,
      entity: String(row['Entidad'] ?? '').trim(),
      totalFindings: Number(row['# TOTAL DE HALLAZGOS'] ?? 0) || 0,
      closedFindings: Number(row['# TOTAL DE HALLAZGOS CERRADOS'] ?? 0) || 0,
      score: Number(row['PUNTAJE'] ?? 0) || 0
    };
  })
  .filter((row) => row.entity);

fs.writeFileSync(path.join(root, 'src', 'auditoriasInternaBdData.json'), JSON.stringify(internaRecords, null, 2));
fs.writeFileSync(path.join(root, 'src', 'auditoriasExternaBdData.json'), JSON.stringify(externaRecords, null, 2));

console.log(`Importadas ${internaRecords.length} filas internas y ${externaRecords.length} filas externas desde ${excelFile}`);
