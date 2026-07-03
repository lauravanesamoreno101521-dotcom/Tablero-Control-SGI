import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excelFile = fs
  .readdirSync(root)
  .find(
    (name) =>
      name.toLowerCase().includes('medicina') &&
      name.toLowerCase().includes('examenes') &&
      name.endsWith('.xlsx')
  );

if (!excelFile) {
  throw new Error('No se encontró el archivo de Medicina del trabajo (.xlsx).');
}

const workbook = XLSX.readFile(path.join(root, excelFile));
const sheet = workbook.Sheets['Tablero control'];
if (!sheet) {
  throw new Error('No se encontró la hoja "Tablero control".');
}

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

const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
const records = rows
  .map((row, index) => {
    const entryDate = parseExcelDate(row['F.INGRESO']);
    const examDate = parseExcelDate(row['FECHA EXAMENES']);
    const expiryDate = parseExcelDate(row['FECHA DE VENCIMIENTO']);
    const postIncap = row['POSTINCAPACIDAD'];
    const postIncapDate = parseExcelDate(postIncap);
    const postIncapText = postIncapDate
      ? postIncapDate.label
      : String(postIncap ?? '').trim();

    return {
      id: `med-${index + 1}`,
      documento: String(row['DOCUMENTO'] ?? '').trim(),
      employeeName: String(row['NOMBRE COMPLETO '] ?? row['NOMBRE COMPLETO'] ?? '').trim(),
      city: String(row['CIUDAD'] ?? '').trim(),
      role: String(row['CARGO'] ?? '').trim(),
      entryDate: entryDate?.iso ?? '',
      entryDateLabel: entryDate?.label ?? '',
      contract: String(row['CONTRATO'] ?? '').trim(),
      linkType: String(row['VINCULACIÓN'] ?? row['VINCULACION'] ?? '').trim(),
      examDate: examDate?.iso ?? '',
      examDateLabel: examDate?.label ?? '',
      examMonth: examDate?.month ?? 0,
      examYear: examDate?.year ?? 0,
      examStatus: String(row['ESTADO EXAMEN'] ?? '').trim(),
      postIncapacidad: postIncapText,
      ips: String(row['IPS'] ?? '').trim(),
      cost: Number(row['COSTOS']) || 0,
      periodicYears: Number(row['TIEMPO PARA EXAMENES PERIODICOS EN AÑOS']) || 1,
      expiryDate: expiryDate?.iso ?? '',
      expiryDateLabel: expiryDate?.label ?? '',
      expiryMonth: expiryDate?.month ?? 0,
      expiryYear: expiryDate?.year ?? 0
    };
  })
  .filter((row) => row.documento || row.employeeName);

fs.writeFileSync(
  path.join(root, 'src', 'medicinaTrabajoBdData.json'),
  JSON.stringify(records, null, 2)
);

console.log(`Importados ${records.length} registros desde "${excelFile}".`);
