import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excelFile = fs.readdirSync(root).find((name) => name.includes('CONSOLIDADO') && name.includes('PARTICIP'));
if (!excelFile) {
  throw new Error('No se encontró 6. CONSOLIDADO PARTICIPACIÓN 2026.xlsx');
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
  if (!Number.isFinite(serial)) return null;
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

const formatExcelTime = (value) => {
  const decimal = Number(value);
  if (!Number.isFinite(decimal)) return '';
  const totalMinutes = Math.round(decimal * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const bdSheet = workbook.Sheets['BD PARTICIPANTES'];
const bdRows = XLSX.utils.sheet_to_json(bdSheet, { defval: '' });
const participants = bdRows.map((row, index) => {
  const parsedDate = parseExcelDate(row['FECHA']);
  const monthRaw = Number(row['MES']);
  const month = Number.isFinite(monthRaw) && monthRaw > 0 ? monthRaw : parsedDate?.month ?? 0;
  const year = parsedDate?.year ?? 2026;

  return {
    'CÉDULA PARTICIPANTES': String(row['CÉDULA PARTICIPANTES'] ?? '').trim(),
    'PUNTAJE DE EVALUACIÓN': Number(row['PUNTAJE DE EVALUACIÓN']) || 0,
    CLIENTE: String(row.CLIENTE ?? '').trim(),
    'TEMA Y/O CONTENIDO': String(row['TEMA Y/O CONTENIDO'] ?? '').trim(),
    FECHA: parsedDate?.label ?? '',
    MES: month,
    AÑO: year,
    'HORA EN QUE SE REALIZA LA FORMACIÓN': formatExcelTime(row['HORA EN QUE SE REALIZA LA FORMACIÓN']),
    'MODALIDA DE LA FORMACIÓN': String(row['MODALIDA DE LA FORMACIÓN '] ?? row['MODALIDA DE LA FORMACIÓN'] ?? '').trim(),
    'TIEMPO TOTAL DE FORMACIÓN POR PERSONA': Number(row['TIEMPO TOTAL DE FORMACIÓN POR PERSONA']) || 0
  };
}).filter((row) => row['CÉDULA PARTICIPANTES'] && row.MES > 0);

const indicadoresSheet = workbook.Sheets.INDICADORES;
const indicadoresRows = XLSX.utils.sheet_to_json(indicadoresSheet, { header: 1, defval: '' });

fs.writeFileSync(path.join(root, 'src', 'formacionBdData.json'), JSON.stringify(participants, null, 2));
fs.writeFileSync(path.join(root, 'src', 'formacionInformeData.json'), JSON.stringify({ '2026': indicadoresRows }, null, 2));

console.log(`Importados ${participants.length} registros de participantes.`);
console.log(`Indicadores: ${indicadoresRows.length} filas.`);
