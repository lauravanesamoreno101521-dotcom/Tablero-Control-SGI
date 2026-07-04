export const ACCIDENTALIDAD_INFORME_MONTH_LABELS = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC'
] as const;

export type AccidentalidadRecord = {
  id: string;
  reportDate: string;
  reportDateLabel: string;
  eventDate: string;
  eventDateLabel: string;
  month: number;
  year: number;
  manager: string;
  cedula: string;
  employeeName: string;
  plate: string;
  client: string;
  duringService: string;
  characteristic: string;
  severity: string;
  lossLevel: string;
  contractType: string;
  linkType: string;
  role: string;
  basicCause: string;
  immediateCause: string;
  riskDescription: string;
};

const toNumberOrZero = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/,/g, '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const getAccidentalidadInformeRows = (
  informeByYear: Record<string, unknown[][]>,
  year: number
): unknown[][] => {
  const rows = informeByYear[String(year)];
  return Array.isArray(rows) ? rows : [];
};

export const resolveAccidentalidadInformeYear = (
  yearFilter: string,
  availableYears: number[]
): number | null => {
  if (yearFilter) {
    const selected = Number(yearFilter);
    return availableYears.includes(selected) ? selected : null;
  }
  return availableYears[0] ?? null;
};

const findInformeRow = (rows: unknown[][], matcher: (label: string) => boolean): unknown[] | null => {
  for (let index = 4; index < rows.length; index += 1) {
    const row = rows[index];
    if (!Array.isArray(row)) continue;
    const label = normalizeText(row[0]);
    if (!label) continue;
    if (matcher(label)) return row;
  }
  return null;
};

export const getInformeMonthlyValues = (row: unknown[] | null): number[] => {
  if (!row) return Array.from({ length: 12 }, () => 0);
  return Array.from({ length: 12 }, (_, index) => toNumberOrZero(row[index + 1]));
};

export const getInformeTotalValue = (row: unknown[] | null): number => {
  if (!row) return 0;
  return toNumberOrZero(row[13] ?? row[12]);
};

export const getInformeMetric = (
  rows: unknown[][],
  matcher: (label: string) => boolean,
  monthIndex: number | null = null
): number => {
  const row = findInformeRow(rows, matcher);
  if (!row) return 0;
  if (monthIndex === null || monthIndex < 0 || monthIndex > 11) {
    return getInformeTotalValue(row);
  }
  return toNumberOrZero(row[monthIndex + 1]);
};

export type AccidentalidadIndicators = {
  sourceYear: number;
  hasInforme: boolean;
  totalEventsBd: number;
  laborIncidents: number;
  disablingAccidents: number;
  nonDisablingAccidents: number;
  laborRoadAccidents: number;
  nonLaborRoadAccidents: number;
  environmentalAccidents: number;
  lostDaysAl: number;
  lostDaysRoadLabor: number;
  lostDaysRoadNonLabor: number;
  workersMonth: number;
  hht: number;
  workFatalities: number;
  roadMortalDriver: number;
  roadMortalOther: number;
  roadGraveDriver: number;
  roadGraveOther: number;
  roadLeveDriver: number;
  roadLeveOther: number;
  roadSimpleCrash: number;
  frequencyIndex: number;
  severityIndex: number;
  ili: number;
  accidentRate: number;
  roadSeverityIndex: number;
  roadLaborRate: number;
  roadNonLaborRate: number;
  incidenceProportion: number;
  mortalityProportion: number;
  iliMeta: number;
};

const matchRoadMortalDriver = (label: string) =>
  label.includes('siniestros viales mortal') && label.includes('conductor');

const matchRoadMortalOther = (label: string) =>
  label.includes('siniestros viales mortal') && label.includes('otro actor');

const matchRoadGraveDriver = (label: string) =>
  label.includes('siniestros viales grave') && label.includes('conductor');

const matchRoadGraveOther = (label: string) =>
  label.includes('siniestros viales grave') && label.includes('otro actor');

const matchRoadLeveDriver = (label: string) =>
  label.includes('siniestros viales leve') && label.includes('conductor');

const matchRoadLeveOther = (label: string) =>
  label.includes('siniestros viales leve') && label.includes('otro actor');

export type AccidentalidadBdEventsFilter = {
  yearFilter: string;
  startDate: string;
  endDate: string;
};

const parseAccidentalidadReportDate = (record: AccidentalidadRecord): Date | null => {
  if (!record.reportDate) return null;
  const reportDate = new Date(`${record.reportDate}T00:00:00`);
  return Number.isNaN(reportDate.getTime()) ? null : reportDate;
};

export const countAccidentalidadBdEventsByReportDate = (
  records: AccidentalidadRecord[],
  informeYear: number,
  monthIndex: number | null,
  filter: AccidentalidadBdEventsFilter
): number => {
  const start = filter.startDate ? new Date(`${filter.startDate}T00:00:00`) : null;
  const end = filter.endDate ? new Date(`${filter.endDate}T23:59:59`) : null;
  const explicitYear = filter.yearFilter ? Number(filter.yearFilter) : null;
  const yearToMatch = explicitYear ?? informeYear;

  return records.filter((row) => {
    const reportDate = parseAccidentalidadReportDate(row);
    if (!reportDate) {
      return !start && !end && !explicitYear;
    }
    if (reportDate.getFullYear() !== yearToMatch) return false;
    if (monthIndex !== null && reportDate.getMonth() !== monthIndex) return false;
    if (start && reportDate < start) return false;
    if (end && reportDate > end) return false;
    return true;
  }).length;
};

const countAccidentalidadBdEventsByReportMonth = (
  records: AccidentalidadRecord[],
  year: number,
  month: number
): number =>
  records.filter((row) => {
    const reportDate = parseAccidentalidadReportDate(row);
    if (!reportDate) return false;
    return reportDate.getFullYear() === year && reportDate.getMonth() + 1 === month;
  }).length;

export const buildAccidentalidadIndicators = (
  rows: unknown[][],
  bdRecords: AccidentalidadRecord[],
  year: number,
  monthIndex: number | null = null,
  allBdRecords: AccidentalidadRecord[] = bdRecords,
  bdEventsFilter: AccidentalidadBdEventsFilter = { yearFilter: '', startDate: '', endDate: '' }
): AccidentalidadIndicators => {
  const totalEventsBd = countAccidentalidadBdEventsByReportDate(
    allBdRecords,
    year,
    monthIndex,
    bdEventsFilter
  );

  return {
    sourceYear: year,
    hasInforme: rows.length > 0,
    totalEventsBd,
    laborIncidents: getInformeMetric(rows, (label) => label.startsWith('01-incidentes laborales'), monthIndex),
    disablingAccidents: getInformeMetric(rows, (label) => label.startsWith('02-accidentes incapacitantes'), monthIndex),
    nonDisablingAccidents: getInformeMetric(rows, (label) => label.startsWith('03-accidentes sin incapacidad'), monthIndex),
    laborRoadAccidents: getInformeMetric(
      rows,
      (label) => label.includes('siniestro vial laboral') && !label.includes('no laboral'),
      monthIndex
    ),
    nonLaborRoadAccidents: getInformeMetric(
      rows,
      (label) =>
        (label.includes('siniestro vial') && label.includes('no laboral')) ||
        label.startsWith('10-accidente de transito - siniestro vial no laboral'),
      monthIndex
    ),
    environmentalAccidents: getInformeMetric(rows, (label) => label.includes('medio ambiente'), monthIndex),
    lostDaysAl: getInformeMetric(rows, (label) => label.startsWith('05-dias perdidos por a.l'), monthIndex),
    lostDaysRoadLabor: getInformeMetric(rows, (label) => label.startsWith('06-dias perdidas por siniestro vial laboral'), monthIndex),
    lostDaysRoadNonLabor: getInformeMetric(
      rows,
      (label) => label.startsWith('11-dias') && label.includes('no laboral'),
      monthIndex
    ),
    workersMonth: getInformeMetric(rows, (label) => label.startsWith('07-n'), monthIndex),
    hht: getInformeMetric(rows, (label) => label.startsWith('08-horas hombre trabajadas'), monthIndex),
    workFatalities: getInformeMetric(rows, (label) => label.startsWith('09-no. accidente de trabajo mortal'), monthIndex),
    roadMortalDriver: getInformeMetric(rows, matchRoadMortalDriver, monthIndex),
    roadMortalOther: getInformeMetric(rows, matchRoadMortalOther, monthIndex),
    roadGraveDriver: getInformeMetric(rows, matchRoadGraveDriver, monthIndex),
    roadGraveOther: getInformeMetric(rows, matchRoadGraveOther, monthIndex),
    roadLeveDriver: getInformeMetric(rows, matchRoadLeveDriver, monthIndex),
    roadLeveOther: getInformeMetric(rows, matchRoadLeveOther, monthIndex),
    roadSimpleCrash: getInformeMetric(rows, (label) => label.includes('choque simple'), monthIndex),
    frequencyIndex: getInformeMetric(rows, (label) => label.startsWith('ind. de frecuencia'), monthIndex),
    severityIndex: getInformeMetric(
      rows,
      (label) => label.startsWith('ind. de severidad') && !label.includes('siniestro vial'),
      monthIndex
    ),
    ili: getInformeMetric(rows, (label) => label.includes('lesiones incapacitantes'), monthIndex),
    accidentRate: getInformeMetric(rows, (label) => label.startsWith('tasa de accidentalidad'), monthIndex),
    roadSeverityIndex: getInformeMetric(
      rows,
      (label) => label.includes('indice de severidad siniestro vial incapacitante'),
      monthIndex
    ),
    roadLaborRate: getInformeMetric(
      rows,
      (label) => label.includes('tasa de accidentes de siniestro vial en el desarrollo de la labor'),
      monthIndex
    ),
    roadNonLaborRate: getInformeMetric(
      rows,
      (label) => label.includes('tasa de accidentes de siniestro vial fuera del desarrollo de la labor'),
      monthIndex
    ),
    incidenceProportion: getInformeMetric(rows, (label) => label.includes('proporcion de incidencia'), monthIndex),
    mortalityProportion: getInformeMetric(
      rows,
      (label) => label.includes('proporcion de accidente de trabajo mortales'),
      monthIndex
    ),
    iliMeta: getInformeMetric(rows, (label) => label.includes('meta mensual del ili'), monthIndex)
  };
};

export type AccidentalidadMonthlyTrendRow = {
  month: number;
  label: string;
  laborIncidents: number;
  disablingAccidents: number;
  nonDisablingAccidents: number;
  laborRoadAccidents: number;
  bdEvents: number;
};

export const buildAccidentalidadMonthlyTrend = (
  rows: unknown[][],
  bdRecords: AccidentalidadRecord[],
  year: number
): AccidentalidadMonthlyTrendRow[] => {
  const laborIncidentsRow = findInformeRow(rows, (label) => label.startsWith('01-incidentes laborales'));
  const disablingRow = findInformeRow(rows, (label) => label.startsWith('02-accidentes incapacitantes'));
  const nonDisablingRow = findInformeRow(rows, (label) => label.startsWith('03-accidentes sin incapacidad'));
  const roadLaborRow = findInformeRow(rows, (label) => label.includes('siniestro vial laboral') && !label.includes('no laboral'));

  return ACCIDENTALIDAD_INFORME_MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    laborIncidents: toNumberOrZero(laborIncidentsRow?.[index + 1]),
    disablingAccidents: toNumberOrZero(disablingRow?.[index + 1]),
    nonDisablingAccidents: toNumberOrZero(nonDisablingRow?.[index + 1]),
    laborRoadAccidents: toNumberOrZero(roadLaborRow?.[index + 1]),
    bdEvents: countAccidentalidadBdEventsByReportMonth(bdRecords, year, index + 1)
  }));
};

export type AccidentalidadGroupedStat = {
  label: string;
  total: number;
};

export const groupAccidentalidadRecords = (
  records: AccidentalidadRecord[],
  picker: (record: AccidentalidadRecord) => string
): AccidentalidadGroupedStat[] => {
  const grouped = new Map<string, number>();
  records.forEach((record) => {
    const key = picker(record).trim() || 'Sin clasificar';
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  });
  return Array.from(grouped.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total);
};

export type AccidentalidadInformeTableRow = {
  label: string;
  values: number[];
  total: number;
  isPercent: boolean;
};

export type AccidentalidadInformeSectionId =
  | 'eventos'
  | 'dias_recursos'
  | 'siniestros_viales'
  | 'indices_tasas'
  | 'otros_informe';

export type AccidentalidadInformeSection = {
  id: AccidentalidadInformeSectionId;
  title: string;
  rows: AccidentalidadInformeTableRow[];
};

const classifyInformeRow = (normalized: string): AccidentalidadInformeSectionId | null => {
  if (!normalized || normalized === 'graficas') return null;
  if (normalized.includes('meta mensual del ili')) return null;

  if (
    normalized.startsWith('01-') ||
    normalized.startsWith('02-') ||
    normalized.startsWith('03-') ||
    normalized.startsWith('04-') ||
    normalized.startsWith('09-') ||
    normalized.startsWith('10-') ||
    normalized.startsWith('11-') ||
    normalized.includes('medio ambiente')
  ) {
    return 'eventos';
  }

  if (
    normalized.startsWith('05-') ||
    normalized.startsWith('06-') ||
    normalized.startsWith('07-') ||
    normalized.startsWith('08-')
  ) {
    return 'dias_recursos';
  }

  if (normalized.includes('siniestros viales') || normalized.includes('choque simple')) {
    return 'siniestros_viales';
  }

  if (
    normalized.includes('ind.') ||
    normalized.includes('indice') ||
    normalized.includes('tasa') ||
    normalized.includes('proporcion') ||
    normalized.includes('ili')
  ) {
    return 'indices_tasas';
  }

  return 'otros_informe';
};

const INFORME_SECTION_META: Record<AccidentalidadInformeSectionId, string> = {
  eventos: 'Eventos e incidentes (FT-GEI-SO-017)',
  dias_recursos: 'Días perdidos y recursos operativos',
  siniestros_viales: 'Desglose de siniestros viales',
  indices_tasas: 'Índices, tasas y proporciones',
  otros_informe: 'Otros indicadores del informe'
};

const parseInformeTableRow = (row: unknown[]): AccidentalidadInformeTableRow | null => {
  const label = String(row[0] ?? '').trim();
  if (!label) return null;
  const normalized = normalizeText(label);
  if (normalized.startsWith('meta') || normalized === 'graficas') return null;
  const monthly = getInformeMonthlyValues(row);
  const total = getInformeTotalValue(row);
  const isPercent =
    normalized.includes('ind.') ||
    normalized.includes('indice') ||
    normalized.includes('tasa') ||
    normalized.includes('proporcion') ||
    normalized.includes('ili');
  return { label, values: monthly, total, isPercent };
};

export const formatAccidentalidadInformeCell = (row: AccidentalidadInformeTableRow, value: number): string =>
  row.isPercent ? `${value.toFixed(2)}%` : Math.round(value).toString();

export const buildAccidentalidadInformeSections = (rows: unknown[][]): AccidentalidadInformeSection[] => {
  const buckets: Record<AccidentalidadInformeSectionId, AccidentalidadInformeTableRow[]> = {
    eventos: [],
    dias_recursos: [],
    siniestros_viales: [],
    indices_tasas: [],
    otros_informe: []
  };

  for (let index = 4; index < rows.length; index += 1) {
    const row = rows[index];
    if (!Array.isArray(row)) continue;
    const parsed = parseInformeTableRow(row);
    if (!parsed) continue;
    const sectionId = classifyInformeRow(normalizeText(parsed.label));
    if (!sectionId) continue;
    buckets[sectionId].push(parsed);
  }

  return (Object.keys(INFORME_SECTION_META) as AccidentalidadInformeSectionId[])
    .map((id) => ({ id, title: INFORME_SECTION_META[id], rows: buckets[id] }))
    .filter((section) => section.rows.length > 0);
};

export type AccidentalidadReincidenceStat = {
  cedula: string;
  employeeName: string;
  total: number;
};

export const buildAccidentalidadReincidenceStats = (
  records: AccidentalidadRecord[]
): AccidentalidadReincidenceStat[] => {
  const grouped = new Map<string, AccidentalidadReincidenceStat>();
  records.forEach((record) => {
    const cedula = record.cedula.trim();
    if (!cedula) return;
    const current = grouped.get(cedula) ?? {
      cedula,
      employeeName: record.employeeName.trim() || 'Sin nombre',
      total: 0
    };
    current.total += 1;
    if (record.employeeName.trim()) current.employeeName = record.employeeName.trim();
    grouped.set(cedula, current);
  });

  return Array.from(grouped.values())
    .filter((row) => row.total > 1)
    .sort((a, b) => b.total - a.total);
};

const normalizeCauseLabel = (value: string): string => {
  const raw = value.trim();
  if (!raw || raw.toLowerCase() === 'n/a') return 'Sin registrar';
  return raw.length > 96 ? `${raw.slice(0, 93)}...` : raw;
};

export const groupAccidentalidadCauseStats = (
  records: AccidentalidadRecord[],
  field: 'basicCause' | 'immediateCause',
  limit = 8
): AccidentalidadGroupedStat[] =>
  groupAccidentalidadRecords(records, (row) => normalizeCauseLabel(row[field])).slice(0, limit);

export type AccidentalidadIliStatus = 'ok' | 'warn' | 'risk';

export const resolveAccidentalidadIliStatus = (ili: number, meta: number): AccidentalidadIliStatus => {
  if (meta <= 0) return ili <= 0 ? 'ok' : 'warn';
  if (ili <= meta) return 'ok';
  if (ili <= meta * 1.25) return 'warn';
  return 'risk';
};

export type AccidentalidadIliMetaRow = {
  month: number;
  label: string;
  ili: number;
  meta: number;
  status: AccidentalidadIliStatus;
};

export const buildAccidentalidadIliMetaComparison = (rows: unknown[][]): AccidentalidadIliMetaRow[] => {
  const iliRow = findInformeRow(rows, (label) => label.includes('lesiones incapacitantes'));
  const metaRow = findInformeRow(rows, (label) => label.includes('meta mensual del ili'));

  return ACCIDENTALIDAD_INFORME_MONTH_LABELS.map((label, index) => {
    const ili = toNumberOrZero(iliRow?.[index + 1]);
    const meta = toNumberOrZero(metaRow?.[index + 1]);
    return {
      month: index + 1,
      label,
      ili,
      meta,
      status: resolveAccidentalidadIliStatus(ili, meta)
    };
  });
};

export const buildAccidentalidadInformeTable = (rows: unknown[][]): AccidentalidadInformeTableRow[] =>
  buildAccidentalidadInformeSections(rows).flatMap((section) => section.rows);
