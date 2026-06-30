export const FORMACION_INFORME_MONTH_LABELS = [
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

export type FormacionInformeMonthlyInputs = {
  programmedActivities: number[];
  activeStaff: number[];
};

export type FormacionInformeManualEdits = {
  programmedActivities?: number[];
};

export type FormacionInformeBdMetrics = {
  executedActivities: number[];
  participatingPeople: number[];
  hhf: number[];
  approvedEvaluations: number[];
  totalEvaluated: number[];
};

export type FormacionInformeComputedRow = {
  key: string;
  label: string;
  values: Array<number | string>;
  editable: boolean;
  highlight?: 'yellow' | 'gray' | 'formula';
  valueType?: 'number' | 'percent';
};

export type FormacionInformeComputed = {
  year: number;
  rows: FormacionInformeComputedRow[];
  indicators: {
    programmedActivities: number;
    executedActivities: number;
    activeStaff: number;
    participatingPeople: number;
    hhf: number;
    approvedEvaluations: number;
    complianceRate: number;
    efficacyRate: number;
    coverageRate: number;
  };
};

type FormacionBdLikeRecord = {
  month: number;
  year: number;
  cedula: string;
  score: number;
  topic: string;
  dateLabel: string;
  trainingHours: number;
  modality: string;
};

export type FormacionSpecialMetrics = {
  virtualTopicsTreated: number;
  virtualTopicsParticipation: number;
  safetyMoments: number;
  safetyMomentsParticipation: number;
  monthlyVirtualTopics: number[];
  monthlyVirtualParticipation: number[];
  monthlySafetyMoments: number[];
  monthlySafetyParticipation: number[];
};

const normalizeFormacionText = (value: string) =>
  String(value ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const isFormacionMomentoSeguridad = (topic: string) =>
  normalizeFormacionText(topic).includes('MOMENTO DE SEGURIDAD');

export const isFormacionVirtualModality = (modality: string) =>
  normalizeFormacionText(modality).includes('VIRTUAL');

export const isFormacionVirtualTemaRecord = (record: Pick<FormacionBdLikeRecord, 'topic' | 'modality'>) =>
  isFormacionVirtualModality(record.modality) && !isFormacionMomentoSeguridad(record.topic);

export const normalizeFormacionModality = (modality: string): string => {
  const raw = String(modality ?? '').trim();
  if (!raw) return '';
  const normalized = normalizeFormacionText(raw).replace(/\s+/g, '');
  if (normalized === 'ENLINEA') return 'EN LÍNEA';
  return raw;
};

export const normalizeFormacionClient = (client: string): string => {
  const raw = String(client ?? '').trim();
  if (!raw) return '';
  const normalized = normalizeFormacionText(raw).replace(/\s+/g, '');
  if (normalized === 'EPM' || normalized === 'EPMNUEVO') return 'EPM';
  if (normalized === 'FLOTAPROPIA') return 'FLOTA PROPIA';
  if (normalized === 'INTEGRAL') return 'INTEGRAL';
  if (normalized === 'MEDICARTE') return 'MEDICARTE';
  return raw;
};

/** Clave única de capacitación: solo tema/contenido (sin fecha). */
export const getFormacionTopicKey = (topic: string): string =>
  String(topic ?? '').trim().replace(/\s+/g, ' ');

const sumTopicParticipantCounts = (topicPeople: Map<string, Set<string>>): number =>
  Array.from(topicPeople.values()).reduce((sum, people) => sum + people.size, 0);

export const countFormacionParticipatingPeople = (records: FormacionBdLikeRecord[]): number => {
  const topicPeople = new Map<string, Set<string>>();
  records.forEach((row) => {
    const topicKey = getFormacionTopicKey(row.topic);
    if (!topicKey || !row.cedula) return;
    const people = topicPeople.get(topicKey) ?? new Set<string>();
    people.add(row.cedula);
    topicPeople.set(topicKey, people);
  });
  return sumTopicParticipantCounts(topicPeople);
};

const toNumberOrZero = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? '').replace(/,/g, '.').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumValues = (values: number[]) => values.reduce((sum, value) => sum + value, 0);

const safeDiv = (numerator: number, denominator: number) => (denominator ? numerator / denominator : 0);

const emptyMonthly = () => Array.from({ length: 12 }, () => 0);

export const parseFormacionInformeInputsFromRows = (rows: unknown[][]): FormacionInformeMonthlyInputs => {
  const programmedActivities = FORMACION_INFORME_MONTH_LABELS.map((_, index) =>
    toNumberOrZero((rows[index + 1] as unknown[])?.[1])
  );
  const activeStaff = FORMACION_INFORME_MONTH_LABELS.map((_, index) =>
    toNumberOrZero((rows[index + 1] as unknown[])?.[3])
  );
  return { programmedActivities, activeStaff };
};

export const extractFormacionBdMetrics = (
  records: FormacionBdLikeRecord[],
  year: number
): FormacionInformeBdMetrics => {
  const monthly = Array.from({ length: 12 }, () => ({
    sessions: new Set<string>(),
    topicPeople: new Map<string, Set<string>>(),
    evaluatedPeople: new Set<string>(),
    approvedPeople: new Set<string>(),
    hhf: 0
  }));

  records
    .filter((row) => row.year === year && row.month >= 1 && row.month <= 12)
    .forEach((row) => {
      const bucket = monthly[row.month - 1];
      const topicKey = getFormacionTopicKey(row.topic);
      if (topicKey) bucket.sessions.add(topicKey);
      if (row.cedula) {
        if (topicKey) {
          const people = bucket.topicPeople.get(topicKey) ?? new Set<string>();
          people.add(row.cedula);
          bucket.topicPeople.set(topicKey, people);
        }
        bucket.evaluatedPeople.add(row.cedula);
        if (row.score >= 75) bucket.approvedPeople.add(row.cedula);
      }
      bucket.hhf += row.trainingHours;
    });

  return {
    executedActivities: monthly.map((row) => row.sessions.size),
    participatingPeople: monthly.map((row) => sumTopicParticipantCounts(row.topicPeople)),
    hhf: monthly.map((row) => row.hhf),
    approvedEvaluations: monthly.map((row) => row.approvedPeople.size),
    totalEvaluated: monthly.map((row) => row.evaluatedPeople.size)
  };
};

export const extractFormacionSpecialMetrics = (
  records: FormacionBdLikeRecord[],
  year: number
): FormacionSpecialMetrics =>
  extractFormacionSpecialMetricsFromRecords(records.filter((row) => row.year === year));

export const extractFormacionSpecialMetricsFromRecords = (
  records: FormacionBdLikeRecord[]
): FormacionSpecialMetrics => {
  const monthly = Array.from({ length: 12 }, () => ({
    virtualSessions: new Set<string>(),
    virtualPeople: new Set<string>(),
    safetySessions: new Set<string>(),
    safetyPeople: new Set<string>()
  }));

  const totalVirtualSessions = new Set<string>();
  const totalVirtualPeople = new Set<string>();
  const totalSafetySessions = new Set<string>();
  const totalSafetyPeople = new Set<string>();

  records
    .filter((row) => row.month >= 1 && row.month <= 12)
    .forEach((row) => {
      const bucket = monthly[row.month - 1];
      const sessionKey = `${row.dateLabel}__${row.topic}`;

      if (isFormacionVirtualTemaRecord(row)) {
        bucket.virtualSessions.add(sessionKey);
        totalVirtualSessions.add(sessionKey);
        if (row.cedula) {
          bucket.virtualPeople.add(row.cedula);
          totalVirtualPeople.add(row.cedula);
        }
      }

      if (isFormacionMomentoSeguridad(row.topic)) {
        bucket.safetySessions.add(sessionKey);
        totalSafetySessions.add(sessionKey);
        if (row.cedula) {
          bucket.safetyPeople.add(row.cedula);
          totalSafetyPeople.add(row.cedula);
        }
      }
    });

  return {
    virtualTopicsTreated: totalVirtualSessions.size,
    virtualTopicsParticipation: totalVirtualPeople.size,
    safetyMoments: totalSafetySessions.size,
    safetyMomentsParticipation: totalSafetyPeople.size,
    monthlyVirtualTopics: monthly.map((row) => row.virtualSessions.size),
    monthlyVirtualParticipation: monthly.map((row) => row.virtualPeople.size),
    monthlySafetyMoments: monthly.map((row) => row.safetySessions.size),
    monthlySafetyParticipation: monthly.map((row) => row.safetyPeople.size)
  };
};

export const computeFormacionInforme = (
  year: number,
  inputs: FormacionInformeMonthlyInputs,
  bdMetrics: FormacionInformeBdMetrics,
  manualEdits: FormacionInformeManualEdits = {}
): FormacionInformeComputed => {
  const programmedActivities = manualEdits.programmedActivities ?? inputs.programmedActivities;
  const activeStaff = inputs.activeStaff;

  const complianceRate = programmedActivities.map((programmed, index) =>
    safeDiv(bdMetrics.executedActivities[index], programmed) * 100
  );
  const efficacyRate = bdMetrics.totalEvaluated.map((evaluated, index) =>
    safeDiv(bdMetrics.approvedEvaluations[index], evaluated) * 100
  );
  const coverageRate = activeStaff.map((active, index) =>
    safeDiv(bdMetrics.participatingPeople[index], active) * 100
  );

  const totalProgrammed = sumValues(programmedActivities);
  const totalExecuted = sumValues(bdMetrics.executedActivities);
  const totalActive = sumValues(activeStaff);
  const totalParticipating = sumValues(bdMetrics.participatingPeople);
  const totalHhf = sumValues(bdMetrics.hhf);
  const totalApproved = sumValues(bdMetrics.approvedEvaluations);
  const totalEvaluated = sumValues(bdMetrics.totalEvaluated);

  const withTotalNumbers = (monthly: number[], totalValue: number) => [...monthly, totalValue];
  const withTotalPercents = (monthly: number[], totalValue: number) => [...monthly, totalValue];

  const rows: FormacionInformeComputedRow[] = [
    {
      key: 'programmedActivities',
      label: 'Cronograma actividades programadas',
      values: withTotalNumbers(programmedActivities, totalProgrammed),
      editable: true,
      highlight: 'yellow',
      valueType: 'number'
    },
    {
      key: 'executedActivities',
      label: 'Cronograma total actividades ejecutadas',
      values: withTotalNumbers(bdMetrics.executedActivities, totalExecuted),
      editable: false,
      highlight: 'gray',
      valueType: 'number'
    },
    {
      key: 'activeStaff',
      label: 'Personal activo periodo (No. de Empleados FT-GEI-SO-016)',
      values: withTotalNumbers(activeStaff, totalActive),
      editable: false,
      highlight: 'gray',
      valueType: 'number'
    },
    {
      key: 'participatingPeople',
      label: 'Suma del personal que efectivamente participa en la formación',
      values: withTotalNumbers(bdMetrics.participatingPeople, totalParticipating),
      editable: false,
      highlight: 'gray',
      valueType: 'number'
    },
    {
      key: 'hhf',
      label: 'Sumatoria del total horas hombre de formación HHF',
      values: withTotalNumbers(bdMetrics.hhf, totalHhf),
      editable: false,
      highlight: 'gray',
      valueType: 'number'
    },
    {
      key: 'approvedEvaluations',
      label: 'Total participantes con evaluación aprobada mayor a 75 puntos',
      values: withTotalNumbers(bdMetrics.approvedEvaluations, totalApproved),
      editable: false,
      highlight: 'gray',
      valueType: 'number'
    },
    {
      key: 'complianceRate',
      label: 'Indicador de cumplimiento por formación (%)',
      values: withTotalPercents(complianceRate, safeDiv(totalExecuted, totalProgrammed) * 100),
      editable: false,
      highlight: 'formula',
      valueType: 'percent'
    },
    {
      key: 'efficacyRate',
      label: 'Eficacia (%)',
      values: withTotalPercents(efficacyRate, safeDiv(totalApproved, totalEvaluated) * 100),
      editable: false,
      highlight: 'formula',
      valueType: 'percent'
    },
    {
      key: 'coverageRate',
      label: 'Promedio indicador de cobertura total (%)',
      values: withTotalPercents(coverageRate, safeDiv(totalParticipating, totalActive) * 100),
      editable: false,
      highlight: 'formula',
      valueType: 'percent'
    }
  ];

  return {
    year,
    rows,
    indicators: {
      programmedActivities: totalProgrammed,
      executedActivities: totalExecuted,
      activeStaff: totalActive,
      participatingPeople: totalParticipating,
      hhf: totalHhf,
      approvedEvaluations: totalApproved,
      complianceRate: safeDiv(totalExecuted, totalProgrammed) * 100,
      efficacyRate: safeDiv(totalApproved, totalEvaluated) * 100,
      coverageRate: safeDiv(totalParticipating, totalActive) * 100
    }
  };
};

export const formatFormacionInformeCellValue = (row: FormacionInformeComputedRow, value: number | string): string => {
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '0';
  if (row.valueType === 'percent') return `${value.toFixed(2)}%`;
  if (Math.abs(value - Math.round(value)) < 0.00001) return String(Math.round(value));
  return value.toFixed(2);
};

export type FormacionInformeEditableField = keyof FormacionInformeMonthlyInputs;
