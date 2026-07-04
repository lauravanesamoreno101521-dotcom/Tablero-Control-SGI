import {
  formatIncapPeriodValue,
  isActiveFollowingPeriod,
  parsePeriodRange,
  parsePeriodStartDate
} from './incapDateUtils.ts';

export const INCAP_INFORME_MONTH_LABELS = [
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

export type IncapInformeMonthlyInputs = {
  employees: number[];
  hhtt: number[];
  businessDays: number[];
};

export type IncapInformeManualBdEdits = {
  elApproved?: number[];
  elExisting?: number[];
};

export type IncapInformeEditableField = keyof IncapInformeMonthlyInputs | keyof IncapInformeManualBdEdits;

export type IncapInformeBdMetrics = {
  egDays: number[];
  egPeople: number[];
  atDays: number[];
  atPeople: number[];
  deaths: number[];
  elReported: number[];
  elApproved: number[];
  elExisting: number[];
  elDays: number[];
};

export type IncapInformeComputedRow = {
  key: string;
  label: string;
  values: number[];
  editable: boolean;
  highlight?: 'yellow' | 'gray' | 'formula';
};

export type IncapInformeComputed = {
  year: number;
  rows: IncapInformeComputedRow[];
  indicators: {
    employees: number;
    hhtt: number;
    scheduledDays: number;
    egDays: number;
    egPeople: number;
    atDays: number;
    atPeople: number;
    elLaborDays: number;
    elPrevalence: number;
    elSeverity: number;
    elIncidence: number;
    elIncapacityDays: number;
    globalRate: number;
    egAcGlobalRate: number;
    frequency: number;
    severity: number;
    generalIndex: number;
    medicalCause: number;
    egAcMortalityRate: number;
  };
};

type IncapBdLikeRecord = {
  month: number;
  year: number;
  cedula: string;
  employeeName: string;
  incapDays: number;
  incapType: string;
  incapClass: string;
  initialDays: number;
  finalDays: number;
  effectivePeriod: string;
  followingPeriod: string;
};

type MonthlyIncapBuckets = {
  egDays: number;
  egPeople: Set<string>;
  atDays: number;
  atPeople: Set<string>;
  deaths: number;
  elReported: number;
  elApproved: number;
  elExisting: number;
  elDays: number;
};

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const toNumberOrZero = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/,/g, '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumValues = (values: number[]) => values.reduce((sum, value) => sum + value, 0);

const safeDiv = (numerator: number, denominator: number) => (denominator ? numerator / denominator : 0);

const emptyMonthly = () => Array.from({ length: 12 }, () => 0);

const readMonthlyRow = (rows: unknown[][], excelRowNumber: number): number[] => {
  const row = rows[excelRowNumber - 1];
  if (!Array.isArray(row)) return emptyMonthly();
  return INCAP_INFORME_MONTH_LABELS.map((_, index) => toNumberOrZero(row[index + 1]));
};

const readMonthlyRowByLabel = (rows: unknown[][], labelIncludes: string): number[] => {
  const row = rows.find((entry) => {
    if (!Array.isArray(entry)) return false;
    const label = normalizeText(String(entry[0] ?? ''));
    return label.includes(normalizeText(labelIncludes));
  });
  if (!row) return emptyMonthly();
  return INCAP_INFORME_MONTH_LABELS.map((_, index) => toNumberOrZero(row[index + 1]));
};

export const readIncapEmployeesMonthlyFromRows = (rows: unknown[][]): number[] => {
  const byLabel = readMonthlyRowByLabel(rows, 'empleados');
  if (byLabel.some((value) => value > 0)) return byLabel;
  return readMonthlyRow(rows, 3);
};

export const parseInformeInputsFromRows = (rows: unknown[][]): IncapInformeMonthlyInputs => {
  const employees = readIncapEmployeesMonthlyFromRows(rows);
  const hhtt = readMonthlyRow(rows, 4);
  const scheduledDays = readMonthlyRow(rows, 5);
  const businessDays = employees.map((employeeCount, index) => {
    if (employeeCount <= 0) return 0;
    return scheduledDays[index] / employeeCount;
  });

  return { employees, hhtt, businessDays };
};

/** Personal activo mensual para Formación: fila "No. de Empleados" del FT-GEI-SO-016. */
export const resolveIncapEmployeesMonthly = (
  rows: unknown[][],
  manualEdits?: Partial<IncapInformeMonthlyInputs>
): number[] => {
  const base = parseInformeInputsFromRows(rows);
  return manualEdits?.employees ?? base.employees;
};

const isFallecidoClass = (incapClass: string) => normalizeText(incapClass) === 'fallecido';

const isEnfermedadLaboralType = (incapType: string) => normalizeText(incapType).includes('enfermedadlaboral');

const isEnfermedadGeneralType = (incapType: string) => normalizeText(incapType).includes('enfermedadgeneral');

const isAccidenteLaboralType = (incapType: string) => normalizeText(incapType).includes('accidente');

const getPersonKey = (row: IncapBdLikeRecord) => String(row.cedula ?? '').trim() || row.employeeName;

const getEffectiveMonthYear = (row: IncapBdLikeRecord) => {
  const effectivePeriod = formatIncapPeriodValue(row.effectivePeriod);
  const range = parsePeriodRange(effectivePeriod);
  if (range) {
    return { month: range.start.getMonth() + 1, year: range.start.getFullYear() };
  }
  const singleDate = parsePeriodStartDate(effectivePeriod);
  if (singleDate) {
    return { month: singleDate.getMonth() + 1, year: singleDate.getFullYear() };
  }
  return { month: row.month, year: row.year };
};

const getFollowingMonthYear = (row: IncapBdLikeRecord, fallbackMonth: number, fallbackYear: number) => {
  const followingPeriod = formatIncapPeriodValue(row.followingPeriod);
  const range = parsePeriodRange(followingPeriod);
  if (range) {
    return { month: range.start.getMonth() + 1, year: range.start.getFullYear() };
  }
  const singleDate = parsePeriodStartDate(followingPeriod);
  if (singleDate) {
    return { month: singleDate.getMonth() + 1, year: singleDate.getFullYear() };
  }
  if (fallbackMonth === 12) return { month: 1, year: fallbackYear + 1 };
  return { month: fallbackMonth + 1, year: fallbackYear };
};

const normalizeEgAtRecord = (row: IncapBdLikeRecord): IncapBdLikeRecord => ({
  ...row,
  effectivePeriod: formatIncapPeriodValue(row.effectivePeriod),
  followingPeriod: formatIncapPeriodValue(row.followingPeriod)
});

const allocateEgAtMetrics = (
  row: IncapBdLikeRecord,
  year: number,
  monthly: MonthlyIncapBuckets[],
  kind: 'eg' | 'at'
) => {
  const normalized = normalizeEgAtRecord(row);
  const personKey = getPersonKey(normalized);
  const daysKey = kind === 'eg' ? 'egDays' : 'atDays';
  const peopleKey = kind === 'eg' ? 'egPeople' : 'atPeople';
  const { month: effectiveMonth, year: effectiveYear } = getEffectiveMonthYear(normalized);

  const addToMonth = (targetMonth: number, targetYear: number, days: number) => {
    if (targetYear !== year || targetMonth < 1 || targetMonth > 12 || days <= 0) return;
    monthly[targetMonth - 1][daysKey] += days;
    if (personKey) monthly[targetMonth - 1][peopleKey].add(personKey);
  };

  addToMonth(effectiveMonth, effectiveYear, normalized.initialDays);

  if (isActiveFollowingPeriod(normalized.followingPeriod)) {
    const following = getFollowingMonthYear(normalized, effectiveMonth, effectiveYear);
    addToMonth(following.month, following.year, normalized.finalDays);
    return;
  }

  addToMonth(effectiveMonth, effectiveYear, normalized.finalDays);
};

const spillsIntoYear = (row: IncapBdLikeRecord, year: number) => {
  if (!isActiveFollowingPeriod(row.followingPeriod)) return false;
  const { month, year: effectiveYear } = getEffectiveMonthYear(row);
  const following = getFollowingMonthYear(row, month, effectiveYear);
  return following.year === year;
};

const contributesEgAtToYear = (row: IncapBdLikeRecord, year: number) => {
  const normalized = normalizeEgAtRecord(row);
  const effective = getEffectiveMonthYear(normalized);
  if (effective.year === year) return true;
  if (row.year === year && row.month >= 1 && row.month <= 12) return true;
  return spillsIntoYear(normalized, year);
};

/** Extracción desde BD para filas 6–14 del informe; otras reglas se definirán después. */
export const extractBdInformeMetrics = (
  records: IncapBdLikeRecord[],
  year: number
): IncapInformeBdMetrics => {
  const monthly: MonthlyIncapBuckets[] = Array.from({ length: 12 }, () => ({
    egDays: 0,
    egPeople: new Set<string>(),
    atDays: 0,
    atPeople: new Set<string>(),
    deaths: 0,
    elReported: 0,
    elApproved: 0,
    elExisting: 0,
    elDays: 0
  }));

  records
    .filter((row) => contributesEgAtToYear(row, year) || (row.year === year && row.month >= 1 && row.month <= 12))
    .forEach((row) => {
      if (row.year === year && row.month >= 1 && row.month <= 12) {
        const bucket = monthly[row.month - 1];

        if (isFallecidoClass(row.incapClass)) {
          bucket.deaths += 1;
        }

        if (isEnfermedadLaboralType(row.incapType)) {
          bucket.elReported += 1;
          bucket.elDays += row.incapDays;
        }
      }

      const normalizedRow = normalizeEgAtRecord(row);

      if (contributesEgAtToYear(normalizedRow, year) && isEnfermedadGeneralType(normalizedRow.incapType)) {
        allocateEgAtMetrics(normalizedRow, year, monthly, 'eg');
      }

      if (contributesEgAtToYear(normalizedRow, year) && isAccidenteLaboralType(normalizedRow.incapType)) {
        allocateEgAtMetrics(normalizedRow, year, monthly, 'at');
      }
    });

  return {
    egDays: monthly.map((row) => row.egDays),
    egPeople: monthly.map((row) => row.egPeople.size),
    atDays: monthly.map((row) => row.atDays),
    atPeople: monthly.map((row) => row.atPeople.size),
    deaths: monthly.map((row) => row.deaths),
    elReported: monthly.map((row) => row.elReported),
    elApproved: monthly.map((row) => row.elApproved),
    elExisting: monthly.map((row) => row.elExisting),
    elDays: monthly.map((row) => row.elDays)
  };
};

export const computeIncapInforme = (
  year: number,
  inputs: IncapInformeMonthlyInputs,
  bdMetrics: IncapInformeBdMetrics,
  manualBdEdits: IncapInformeManualBdEdits = {}
): IncapInformeComputed => {
  const scheduledDays = inputs.employees.map((employees, index) => employees * inputs.businessDays[index]);
  const elApprovedMonthly = manualBdEdits.elApproved ?? bdMetrics.elApproved;
  const elExistingMonthly = manualBdEdits.elExisting ?? bdMetrics.elExisting;

  const totalEmployees = sumValues(inputs.employees);
  const totalHhtt = sumValues(inputs.hhtt);
  const totalScheduledDays = totalEmployees * 20;

  const totalEgDays = sumValues(bdMetrics.egDays);
  const totalEgPeople = sumValues(bdMetrics.egPeople);
  const totalAtDays = sumValues(bdMetrics.atDays);
  const totalAtPeople = sumValues(bdMetrics.atPeople);
  const totalDeaths = sumValues(bdMetrics.deaths);
  const totalElReported = sumValues(bdMetrics.elReported);
  const totalElApproved = sumValues(elApprovedMonthly);
  const totalElExisting = sumValues(elExistingMonthly);
  const totalElDays = sumValues(bdMetrics.elDays);

  const monthlyGlobalRate = scheduledDays.map((scheduled, index) =>
    safeDiv(bdMetrics.egDays[index] + bdMetrics.atDays[index] + bdMetrics.elDays[index], scheduled)
  );
  const monthlyEgAcRate = scheduledDays.map((scheduled, index) => safeDiv(bdMetrics.egDays[index], scheduled));
  const monthlyFrequency = inputs.hhtt.map((hours, index) => safeDiv(bdMetrics.egPeople[index], hours) * 20000);
  const monthlySeverity = inputs.hhtt.map((hours, index) => safeDiv(bdMetrics.egDays[index], hours) * 20000);
  const monthlyGeneralIndex = inputs.employees.map((employees, index) => safeDiv(bdMetrics.egPeople[index], employees));
  const monthlyMortality = inputs.employees.map((employees, index) => safeDiv(bdMetrics.deaths[index], employees) * 1000);
  const monthlyMedicalCause = scheduledDays.map((scheduled, index) =>
    safeDiv(bdMetrics.egDays[index] + bdMetrics.atDays[index], scheduled)
  );
  const monthlyElIncidence = inputs.employees.map((employees, index) => safeDiv(elApprovedMonthly[index], employees) * 100000);
  const monthlyElPrevalence = inputs.employees.map(
    (employees, index) => safeDiv(elApprovedMonthly[index] + elExistingMonthly[index], employees) * 100000
  );
  const monthlyElSeverity = inputs.hhtt.map(
    (hours, index) => safeDiv(elExistingMonthly[index] + bdMetrics.elDays[index], hours) * 100000
  );

  const withTotal = (monthly: number[], totalValue: number) => [...monthly, totalValue];

  const rows: IncapInformeComputedRow[] = [
    {
      key: 'employees',
      label: 'No. de Empleados',
      values: withTotal(inputs.employees, totalEmployees),
      editable: true,
      highlight: 'yellow'
    },
    {
      key: 'hhtt',
      label: 'Horas Hombre Trabajadas Totales - HHTT',
      values: withTotal(inputs.hhtt, totalHhtt),
      editable: true,
      highlight: 'yellow'
    },
    {
      key: 'businessDays',
      label: 'Días hábil laborado',
      values: withTotal(inputs.businessDays, 0),
      editable: true,
      highlight: 'yellow'
    },
    {
      key: 'scheduledDays',
      label: 'No. De días programados de trabajo (Empleados × días hábil laborado)',
      values: withTotal(scheduledDays, totalScheduledDays),
      editable: false,
      highlight: 'gray'
    },
    {
      key: 'egDays',
      label: 'Total de días de Incapacidad EG - AC',
      values: withTotal(bdMetrics.egDays, totalEgDays),
      editable: false
    },
    {
      key: 'egPeople',
      label: 'Número de Personal Incapacitado en el periodo por Incapacidad Común (EG - AC)',
      values: withTotal(bdMetrics.egPeople, totalEgPeople),
      editable: false
    },
    {
      key: 'atDays',
      label: 'Total de días de Incapacidad AT',
      values: withTotal(bdMetrics.atDays, totalAtDays),
      editable: false
    },
    {
      key: 'atPeople',
      label: 'Número de Personal Incapacitado en el periodo por Incapacidad laboral (AT)',
      values: withTotal(bdMetrics.atPeople, totalAtPeople),
      editable: false
    },
    {
      key: 'deaths',
      label: 'No. de Personas Fallecidas por EG - AC',
      values: withTotal(bdMetrics.deaths, totalDeaths),
      editable: false
    },
    {
      key: 'elReported',
      label: 'Número de casos reportados de Enfermedad Laboral',
      values: withTotal(bdMetrics.elReported, totalElReported),
      editable: false
    },
    {
      key: 'elApproved',
      label: 'Número de casos aprobados por la ARL como Enfermedad Laboral',
      values: withTotal(elApprovedMonthly, totalElApproved),
      editable: true,
      highlight: 'yellow'
    },
    {
      key: 'elExisting',
      label: 'Número de casos existentes (antiguos) de Enfermedad Laboral',
      values: withTotal(elExistingMonthly, totalElExisting),
      editable: true,
      highlight: 'yellow'
    },
    {
      key: 'elDays',
      label: 'Total de días de incapacidad de Enfermedad Laboral',
      values: withTotal(bdMetrics.elDays, totalElDays),
      editable: false
    },
    {
      key: 'globalRate',
      label: 'Tasa Global de ausentismo (EG+AC+AT+EL)',
      values: withTotal(monthlyGlobalRate, safeDiv(totalEgDays + totalAtDays + totalElDays, totalScheduledDays)),
      editable: false,
      highlight: 'formula'
    },
    {
      key: 'egAcGlobalRate',
      label: 'Tasa Global de ausentismo Enfermedad General o Accidente Común',
      values: withTotal(monthlyEgAcRate, safeDiv(totalEgDays, totalScheduledDays)),
      editable: false,
      highlight: 'formula'
    },
    {
      key: 'frequency',
      label: 'Indice de Frecuencia Ausentismo',
      values: withTotal(monthlyFrequency, safeDiv(totalEgPeople, totalHhtt) * 240000),
      editable: false,
      highlight: 'formula'
    },
    {
      key: 'severity',
      label: 'Indice de Severidad Ausentismo',
      values: withTotal(monthlySeverity, safeDiv(totalEgDays, totalHhtt) * 240000),
      editable: false,
      highlight: 'formula'
    },
    {
      key: 'generalIndex',
      label: 'Indice de General de Ausentismo',
      values: withTotal(monthlyGeneralIndex, safeDiv(totalEgPeople, totalEmployees)),
      editable: false,
      highlight: 'formula'
    },
    {
      key: 'mortality',
      label: 'Tasa de Mortalidad por EG - AC',
      values: withTotal(monthlyMortality, safeDiv(totalDeaths, totalEmployees) * 1000),
      editable: false,
      highlight: 'formula'
    },
    {
      key: 'medicalCause',
      label: 'Ausentismo por Causa médica',
      values: withTotal(monthlyMedicalCause, safeDiv(totalEgPeople + totalAtPeople, totalScheduledDays)),
      editable: false,
      highlight: 'formula'
    },
    {
      key: 'elIncidence',
      label: 'Incidencia por Enfermedad Laboral',
      values: withTotal(monthlyElIncidence, safeDiv(totalElApproved, totalEmployees) * 100000),
      editable: false,
      highlight: 'formula'
    },
    {
      key: 'elPrevalence',
      label: 'Prevalencia por Enfermedad Laboral',
      values: withTotal(monthlyElPrevalence, safeDiv(totalElApproved + totalElExisting, totalEmployees) * 100000),
      editable: false,
      highlight: 'formula'
    },
    {
      key: 'elSeverity',
      label: 'Severidad por Enfermedad Laboral',
      values: withTotal(monthlyElSeverity, safeDiv(totalElExisting + totalElDays, totalHhtt) * 100000),
      editable: false,
      highlight: 'formula'
    }
  ];

  const indicators = {
    employees: totalEmployees,
    hhtt: totalHhtt,
    scheduledDays: totalScheduledDays,
    egDays: totalEgDays,
    egPeople: totalEgPeople,
    atDays: totalAtDays,
    atPeople: totalAtPeople,
    elLaborDays: totalElDays,
    elPrevalence: safeDiv(totalElApproved + totalElExisting, totalEmployees) * 100000,
    elSeverity: safeDiv(totalElExisting + totalElDays, totalHhtt) * 100000,
    elIncidence: safeDiv(totalElApproved, totalEmployees) * 100000,
    elIncapacityDays: totalElDays,
    globalRate: safeDiv(totalEgDays + totalAtDays + totalElDays, totalScheduledDays),
    egAcGlobalRate: safeDiv(totalEgDays, totalScheduledDays),
    frequency: safeDiv(totalEgPeople, totalHhtt) * 240000,
    severity: safeDiv(totalEgDays, totalHhtt) * 240000,
    generalIndex: safeDiv(totalEgPeople, totalEmployees),
    medicalCause: safeDiv(totalEgPeople + totalAtPeople, totalScheduledDays),
    egAcMortalityRate: safeDiv(totalDeaths, totalEmployees) * 1000
  };

  return { year, rows, indicators };
};

export type IncapInformeDashboardIndicators = IncapInformeComputed['indicators'] & {
  sourceYear: number | null;
  hasInforme: boolean;
};

/** Totales anuales del FT-GEI-SO-016 (columna Total) para el tablero por año. */
export const parseIncapIndicatorsFromInformeRows = (
  rows: unknown[][],
  sourceYear: number | null
): IncapInformeDashboardIndicators => {
  const pickTotal = (labelContains: string): number => {
    const row = rows.find((entry) => {
      if (!Array.isArray(entry)) return false;
      return normalizeText(String(entry[0] ?? '')).includes(normalizeText(labelContains));
    }) as unknown[] | undefined;
    if (!row) return 0;
    return toNumberOrZero(row[13]);
  };
  const pickInformeExcelRowTotal = (excelRowNumber: number): number => {
    const row = rows[excelRowNumber - 1];
    if (!Array.isArray(row)) return 0;
    return toNumberOrZero(row[13]);
  };

  return {
    sourceYear,
    hasInforme: Boolean(sourceYear && rows.length > 0),
    employees: pickTotal('No. de Empleados'),
    hhtt: pickTotal('Horas Hombre Trabajadas Totales'),
    scheduledDays: pickTotal('No. De días progamados de trabajo'),
    egDays: pickTotal('Total de días de Incapacidad EG - AC'),
    egPeople: pickTotal('Número de Personal Incapacitado en el periodo por Incapacidad Común'),
    atDays: pickTotal('Total de días de Incapacidad AT'),
    atPeople: pickTotal('Número de Personal Incapacitado en el periodo por Incapacidad laboral'),
    elLaborDays: pickInformeExcelRowTotal(14),
    elPrevalence: pickTotal('Prevalencia por Enfermedad Laboral'),
    elSeverity: pickTotal('Severidad por Enfermedad Laboral'),
    elIncidence: pickTotal('Incidencia por Enfermedad Laboral'),
    elIncapacityDays: pickTotal('Total de días de incapacidad de Enfermedad Laboral'),
    globalRate: pickTotal('Tasa Global de ausentismo (EG+AC+AT+EL)'),
    egAcGlobalRate: pickInformeExcelRowTotal(16),
    frequency: pickTotal('Indice de Frecuencia Ausentismo'),
    severity: pickTotal('Indice de Severidad Ausentismo'),
    generalIndex: pickTotal('Indice de General de Ausentismo'),
    medicalCause: pickTotal('Ausentismo por Cauda medica'),
    egAcMortalityRate: pickInformeExcelRowTotal(20)
  };
};

export const formatInformeCellValue = (rowKey: string, value: number): string => {
  if (!Number.isFinite(value)) return '0';

  if (rowKey === 'globalRate' || rowKey === 'egAcGlobalRate' || rowKey === 'medicalCause') {
    return `${(value * 100).toFixed(2)}%`;
  }

  if (
    rowKey === 'frequency' ||
    rowKey === 'severity' ||
    rowKey === 'generalIndex' ||
    rowKey === 'mortality' ||
    rowKey === 'elIncidence' ||
    rowKey === 'elPrevalence' ||
    rowKey === 'elSeverity'
  ) {
    return value.toFixed(rowKey === 'generalIndex' ? 4 : 2);
  }

  if (rowKey === 'businessDays') {
    return value ? String(Math.round(value)) : '';
  }

  if (Math.abs(value - Math.round(value)) < 0.00001) {
    return String(Math.round(value));
  }

  return value.toFixed(2);
};
