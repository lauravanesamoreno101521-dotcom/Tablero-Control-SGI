import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excelFile = fs
  .readdirSync(root)
  .find((name) => name.toLowerCase().includes('accidentalidad') && name.endsWith('.xlsx'));

if (!excelFile) {
  throw new Error('No se encontró el archivo de Accidentalidad (.xlsx).');
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

const bdSheet = workbook.Sheets['bd_AT_SV_IT_2026'];
const bdRows = XLSX.utils.sheet_to_json(bdSheet, { defval: '' });
const bdRecords = bdRows.map((row, index) => {
  const eventDate = parseExcelDate(row['FECHA REAL DEL EVENTO']);
  const reportDate = parseExcelDate(row['Fecha del reporte']);
  return {
    id: `acc-${index + 1}`,
    reportDate: reportDate?.iso ?? '',
    reportDateLabel: reportDate?.label ?? '',
    eventDate: eventDate?.iso ?? '',
    eventDateLabel: eventDate?.label ?? '',
    month: eventDate?.month ?? 0,
    year: eventDate?.year ?? 2026,
    manager: String(row['Jefe directo responsable del reporte'] ?? '').trim(),
    cedula: String(row['Cedula del Empleado que presenta el accidente o la novedad'] ?? '').trim(),
    employeeName: String(row['Nombre de Empleado que presenta el accidente o la novedad'] ?? '').trim(),
    plate: String(row['Placa del vehículo (si es administrativo colocar NO APLICA)'] ?? '').trim(),
    client: String(row['Contrato o cliente'] ?? '').trim(),
    duringService: String(row['Los hechos ocurrieron durante la prestación del servicio'] ?? '').trim(),
    characteristic: String(row['CARACTERISTICA\r\n  (AT Accidente de Trabajo, IT Incidente de trabajo,  SVS Siniestro vial Simple, SVL Siniestro vial con lesionado menor a 30 dias de incapacidad, SVG Siniestro vial Grave con lesionado mayor a 30 días, SVF Siniestro vial Fatal, SVA Siniestro vial con afectación Ambiental, FM Falla mecánica)'] ?? row['CARACTERISTICA'] ?? '').trim(),
    severity: String(row['CLASIFICACION SEGÚN NIVEL DE GRAVEDAD POR DAÑOS Y LESIONADOS\r\n (GRAVE, MODERADO, LEVE)'] ?? '').trim(),
    lossLevel: String(row['DESCRIPCIÓN DEL NIVEL DE PERDIDA'] ?? '').trim(),
    contractType: String(row['TIPO DE CONTRATACIÓN'] ?? '').trim(),
    linkType: String(row['TIPO DE VINCULACIÓN'] ?? '').trim(),
    role: String(row['CARGO DEL TRABAJADOR'] ?? '').trim(),
    basicCause: String(row['CAUSAS BÁSICA'] ?? '').trim(),
    immediateCause: String(row['CAUSAS INMEDIATA'] ?? '').trim(),
    riskDescription: String(row['DESCRIPCION DEL RIESGO'] ?? '').trim()
  };
}).filter((row) => row.eventDateLabel || row.cedula || row.employeeName);

const informeByYear = {};
for (const sheetName of workbook.SheetNames) {
  const match = sheetName.match(/^FT-GEI-SO-017-(\d{4})$/);
  if (!match) continue;
  const year = match[1];
  informeByYear[year] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
}

fs.writeFileSync(path.join(root, 'src', 'accidentalidadBdData.json'), JSON.stringify(bdRecords, null, 2));
fs.writeFileSync(path.join(root, 'src', 'accidentalidadInformeData.json'), JSON.stringify(informeByYear, null, 2));

console.log(`Importados ${bdRecords.length} registros BD accidentalidad.`);
console.log(`Informes FT-GEI-SO-017: ${Object.keys(informeByYear).join(', ')}`);
