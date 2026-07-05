export const MEDICINA_MONTH_LABELS = [
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

export const MEDICINA_MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
] as const;

export type MedicinaTrabajoRecord = {
  id: string;
  documento: string;
  employeeName: string;
  city: string;
  role: string;
  entryDate: string;
  entryDateLabel: string;
  contract: string;
  linkType: string;
  examDate: string;
  examDateLabel: string;
  examMonth: number;
  examYear: number;
  examStatus: string;
  postIncapacidad: string;
  ips: string;
  cost: number;
  periodicYears: number;
  expiryDate: string;
  expiryDateLabel: string;
  expiryMonth: number;
  expiryYear: number;
};

export type MedicinaExpiryStatus = 'vencido' | 'este_mes' | 'proximo_mes' | 'vigente';

export type MedicinaExpiryStyles = {
  status: MedicinaExpiryStatus;
  label: string;
  bg: string;
  border: string;
  text: string;
  badge: string;
};

export type MedicinaGroupedStat = {
  label: string;
  total: number;
  cost: number;
};

export type MedicinaMonthlyPoint = {
  monthIndex: number;
  label: string;
  exams: number;
  expiries: number;
};

export type MedicinaIndicators = {
  totalWorkers: number;
  vigentes: number;
  expireThisMonth: number;
  expireNextMonth: number;
  vencidos: number;
  complianceRate: number;
  totalCost: number;
  averageCost: number;
  ingresoCount: number;
  periodicoCount: number;
  seguimientoCount: number;
  postIncapCount: number;
  periodicOneYear: number;
  periodicThreeYears: number;
  nextMonthName: string;
  currentMonthName: string;
  referencePeriodLabel: string;
};

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeMedicinaLookupKey = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .toLowerCase();

export const normalizeMedicinaCity = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const normalized = normalizeMedicinaLookupKey(raw);
  if (normalized === 'sabanalrga' || normalized === 'sanalrga') return 'SABANALARGA';
  return raw;
};

export const normalizeMedicinaExamStatus = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (normalizeMedicinaLookupKey(raw) === 'periodicos') return 'PERIODICO';
  return raw;
};

export const withNormalizedMedicinaRecord = (record: MedicinaTrabajoRecord): MedicinaTrabajoRecord => ({
  ...record,
  city: normalizeMedicinaCity(record.city),
  examStatus: normalizeMedicinaExamStatus(record.examStatus)
});

const parseIsoDate = (iso: string): Date | null => {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfMonth = (year: number, monthIndex: number) => new Date(year, monthIndex, 1);

export const resolveMedicinaReferenceDate = (options: {
  yearFilter?: string;
  monthFilter?: string;
  startDate?: string;
  endDate?: string;
}): Date => {
  if (options.startDate && options.endDate) {
    const start = new Date(`${options.startDate}T00:00:00`);
    const end = new Date(`${options.endDate}T23:59:59`);
    if (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth()
    ) {
      return startOfMonth(start.getFullYear(), start.getMonth());
    }
  }

  const now = new Date();
  const year = options.yearFilter ? Number(options.yearFilter) : now.getFullYear();
  let monthIndex = now.getMonth();

  if (options.monthFilter) {
    monthIndex = Number(options.monthFilter) - 1;
  } else if (options.yearFilter && Number(options.yearFilter) !== now.getFullYear()) {
    monthIndex = 0;
  }

  return startOfMonth(year, monthIndex);
};

export const resolveMedicinaExamStatusGroup = (status: string): 'ingreso' | 'periodico' | 'seguimiento' | 'otro' => {
  const normalized = normalizeText(status);
  if (normalized.includes('ingreso')) return 'ingreso';
  if (normalized.includes('periodico')) return 'periodico';
  if (normalized.includes('seguimiento') || normalized.includes('incapacitado')) return 'seguimiento';
  return 'otro';
};

export const resolveMedicinaExpiryStatus = (
  record: MedicinaTrabajoRecord,
  referenceDate: Date = new Date()
): MedicinaExpiryStatus => {
  const expiry = parseIsoDate(record.expiryDate);
  if (!expiry) return 'vigente';

  const refStart = startOfMonth(referenceDate.getFullYear(), referenceDate.getMonth());
  const due = startOfDay(expiry);

  if (due < refStart) return 'vencido';

  const refYear = refStart.getFullYear();
  const refMonth = refStart.getMonth();

  if (due.getFullYear() === refYear && due.getMonth() === refMonth) {
    return 'este_mes';
  }

  const nextMonth = startOfMonth(refYear, refMonth + 1);
  if (due.getFullYear() === nextMonth.getFullYear() && due.getMonth() === nextMonth.getMonth()) {
    return 'proximo_mes';
  }

  return 'vigente';
};

export const getMedicinaExpiryStyles = (
  status: MedicinaExpiryStatus,
  referenceDate: Date = new Date()
): MedicinaExpiryStyles => {
  const currentMonthName = MEDICINA_MONTH_NAMES[referenceDate.getMonth()] ?? 'este mes';
  const nextMonthDate = startOfMonth(referenceDate.getFullYear(), referenceDate.getMonth() + 1);
  const nextMonthName = MEDICINA_MONTH_NAMES[nextMonthDate.getMonth()] ?? 'próximo mes';

  switch (status) {
    case 'vencido':
      return {
        status,
        label: 'Vencidos',
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-[#ba1a1a]',
        badge: 'bg-red-100 text-red-800 border-red-300'
      };
    case 'este_mes':
      return {
        status,
        label: 'Vencen este mes',
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        text: 'text-orange-700',
        badge: 'bg-orange-100 text-orange-800 border-orange-300'
      };
    case 'proximo_mes':
      return {
        status,
        label: 'Vencen próximo mes',
        bg: 'bg-yellow-50',
        border: 'border-[#ffd000]',
        text: 'text-[#9a7b00]',
        badge: 'bg-yellow-100 text-[#7a6200] border-[#ffd000]'
      };
    default:
      return {
        status: 'vigente',
        label: 'Vigentes',
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-[#006b3d]',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      };
  }
};

export const getMedicinaExpiryStylesForRecord = (
  record: MedicinaTrabajoRecord,
  referenceDate: Date = new Date()
) => getMedicinaExpiryStyles(resolveMedicinaExpiryStatus(record, referenceDate), referenceDate);

export const buildMedicinaIndicators = (
  records: MedicinaTrabajoRecord[],
  referenceDate: Date = new Date()
): MedicinaIndicators => {
  let vigentes = 0;
  let expireThisMonth = 0;
  let expireNextMonth = 0;
  let vencidos = 0;
  let ingresoCount = 0;
  let periodicoCount = 0;
  let seguimientoCount = 0;
  let postIncapCount = 0;
  let periodicOneYear = 0;
  let periodicThreeYears = 0;
  let totalCost = 0;

  records.forEach((record) => {
    const status = resolveMedicinaExpiryStatus(record, referenceDate);
    if (status === 'vencido') vencidos += 1;
    else if (status === 'este_mes') expireThisMonth += 1;
    else if (status === 'proximo_mes') expireNextMonth += 1;
    else vigentes += 1;

    const examGroup = resolveMedicinaExamStatusGroup(record.examStatus);
    if (examGroup === 'ingreso') ingresoCount += 1;
    else if (examGroup === 'periodico') periodicoCount += 1;
    else if (examGroup === 'seguimiento') seguimientoCount += 1;

    if (record.postIncapacidad.trim()) postIncapCount += 1;
    if (record.periodicYears >= 3) periodicThreeYears += 1;
    else periodicOneYear += 1;
    totalCost += record.cost;
  });

  const totalWorkers = records.length;
  const compliant = vigentes + expireNextMonth + expireThisMonth;
  const complianceRate = totalWorkers > 0 ? ((totalWorkers - vencidos) / totalWorkers) * 100 : 0;
  const currentMonthName = MEDICINA_MONTH_NAMES[referenceDate.getMonth()] ?? '';
  const nextMonthDate = startOfMonth(referenceDate.getFullYear(), referenceDate.getMonth() + 1);
  const nextMonthName = MEDICINA_MONTH_NAMES[nextMonthDate.getMonth()] ?? '';
  const referencePeriodLabel = `${currentMonthName} ${referenceDate.getFullYear()}`;

  return {
    totalWorkers,
    vigentes,
    expireThisMonth,
    expireNextMonth,
    vencidos,
    complianceRate,
    totalCost,
    averageCost: totalWorkers > 0 ? totalCost / totalWorkers : 0,
    ingresoCount,
    periodicoCount,
    seguimientoCount,
    postIncapCount,
    periodicOneYear,
    periodicThreeYears,
    currentMonthName,
    nextMonthName,
    referencePeriodLabel
  };
};

export const groupMedicinaRecords = (
  records: MedicinaTrabajoRecord[],
  picker: (record: MedicinaTrabajoRecord) => string
): MedicinaGroupedStat[] => {
  const map = new Map<string, { total: number; cost: number }>();
  records.forEach((record) => {
    const label = picker(record).trim() || 'Sin dato';
    const current = map.get(label) ?? { total: 0, cost: 0 };
    current.total += 1;
    current.cost += record.cost;
    map.set(label, current);
  });

  return [...map.entries()]
    .map(([label, value]) => ({ label, total: value.total, cost: value.cost }))
    .sort((a, b) => b.total - a.total);
};

export const buildMedicinaMonthlyTrend = (
  records: MedicinaTrabajoRecord[],
  year: number
): MedicinaMonthlyPoint[] =>
  MEDICINA_MONTH_LABELS.map((label, monthIndex) => {
    const monthNumber = monthIndex + 1;
    const exams = records.filter((row) => row.examYear === year && row.examMonth === monthNumber).length;
    const expiries = records.filter((row) => row.expiryYear === year && row.expiryMonth === monthNumber).length;
    return { monthIndex, label, exams, expiries };
  });

export const buildMedicinaAlertRecords = (
  records: MedicinaTrabajoRecord[],
  referenceDate: Date = new Date()
) =>
  records
    .map((record) => {
      const expiry = parseIsoDate(record.expiryDate);
      const refStart = startOfMonth(referenceDate.getFullYear(), referenceDate.getMonth());
      const daysToExpiry = expiry
        ? Math.ceil((startOfDay(expiry).getTime() - refStart.getTime()) / 86400000)
        : null;
      return {
        record,
        daysToExpiry,
        styles: getMedicinaExpiryStylesForRecord(record, referenceDate)
      };
    })
    .filter(({ styles }) => styles.status !== 'vigente')
    .sort((a, b) => (a.daysToExpiry ?? 99999) - (b.daysToExpiry ?? 99999));

export const formatMedicinaCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value);

export const filterMedicinaRecords = (
  records: MedicinaTrabajoRecord[],
  options: {
    yearFilter?: string;
    startDate?: string;
    endDate?: string;
    cityFilter?: string;
  }
) => {
  const selectedYear = options.yearFilter ? Number(options.yearFilter) : null;

  return records.filter((row) => {
    if (selectedYear && row.examYear !== selectedYear && row.expiryYear !== selectedYear) return false;
    if (options.cityFilter && normalizeText(row.city) !== normalizeText(options.cityFilter)) return false;

    const expiry = parseIsoDate(row.expiryDate);
    const exam = parseIsoDate(row.examDate);
    const compareDate = expiry ?? exam;
    if (!compareDate) return true;

    if (options.startDate) {
      const start = new Date(`${options.startDate}T00:00:00`);
      if (!Number.isNaN(start.getTime()) && compareDate < start) return false;
    }
    if (options.endDate) {
      const end = new Date(`${options.endDate}T23:59:59`);
      if (!Number.isNaN(end.getTime()) && compareDate > end) return false;
    }

    return true;
  });
};

export const resolveMedicinaTrendYear = (yearFilter: string, records: MedicinaTrabajoRecord[]) => {
  if (yearFilter) {
    const selected = Number(yearFilter);
    return Number.isFinite(selected) && selected > 0 ? selected : new Date().getFullYear();
  }
  const years = records.flatMap((row) => [row.examYear, row.expiryYear]).filter((year) => year > 0);
  return years.length > 0 ? Math.max(...years) : new Date().getFullYear();
};

export const getMedicinaYearOptions = (records: MedicinaTrabajoRecord[]) =>
  [...new Set(records.flatMap((row) => [row.examYear, row.expiryYear]).filter((year) => year > 0))].sort(
    (a, b) => b - a
  );

export const getMedicinaCityOptions = (records: MedicinaTrabajoRecord[]) =>
  [...new Set(records.map((row) => row.city.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
