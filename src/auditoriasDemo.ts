export type AuditoriaInternaRecord = {
  id: string;
  auditType: 'Interna';
  eventDate: string;
  eventDateLabel: string;
  month: number;
  year: number;
  entity: string;
  process: string;
  actionType: string;
  openActions: number;
  closedActions: number;
};

export type AuditoriaExternaRecord = {
  id: string;
  auditType: 'Externa';
  eventDate: string;
  eventDateLabel: string;
  month: number;
  year: number;
  entity: string;
  totalFindings: number;
  closedFindings: number;
  score: number;
};

export type AuditoriaGroupedStat = {
  label: string;
  total: number;
  openTotal: number;
  closedTotal: number;
};

export type AuditoriaMonthlyPoint = {
  month: number;
  label: string;
  internaOpen: number;
  internaClosed: number;
  externaFindings: number;
  externaClosed: number;
  avgScore: number;
  scoreCount: number;
};

export type AuditoriaIndicators = {
  auditEvents: number;
  internaRows: number;
  externaRows: number;
  openActions: number;
  closedActions: number;
  closureRate: number;
  avgExternalScore: number;
  auditedProcesses: number;
  auditedEntities: number;
};

export type AuditoriaYearCompliancePoint = {
  year: number;
  internaCompliance: number;
  externaCompliance: number;
  globalCompliance: number;
  internaEvents: number;
  externaEvents: number;
};

export type AuditoriaAuditYearCompliance = {
  label: string;
  auditKind: 'Interna' | 'Externa';
  years: { year: number; compliance: number; events: number }[];
  latestYear: number;
  latestCompliance: number;
  avgCompliance: number;
  trendDelta: number;
};

export type AuditoriaComplianceParetoRow = {
  label: string;
  auditKind: 'Interna' | 'Externa';
  gapPercent: number;
  compliance: number;
  referenceYear: number;
  cumulativeGap: number;
  cumulativePercent: number;
};

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const resolveInternaCompliance = (row: AuditoriaInternaRecord): number => {
  const total = row.openActions + row.closedActions;
  if (total <= 0) return 100;
  return (row.closedActions / total) * 100;
};

const resolveExternaCompliance = (row: AuditoriaExternaRecord): number => {
  if (row.score > 0) return row.score * 100;
  if (row.totalFindings <= 0) return 100;
  return (row.closedFindings / row.totalFindings) * 100;
};

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const parseDate = (iso: string): Date | null => {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const filterAuditoriaInternaRecords = (
  records: AuditoriaInternaRecord[],
  options: {
    yearFilter?: string;
    startDate?: string;
    endDate?: string;
    entityFilter?: string;
    processFilter?: string;
    actionFilter?: string;
  }
): AuditoriaInternaRecord[] => {
  const selectedYear = Number(options.yearFilter);
  const start = options.startDate ? new Date(`${options.startDate}T00:00:00`) : null;
  const end = options.endDate ? new Date(`${options.endDate}T23:59:59`) : null;

  return records.filter((row) => {
    if (options.yearFilter && row.year !== selectedYear) return false;
    if (options.entityFilter && row.entity !== options.entityFilter) return false;
    if (options.processFilter && row.process !== options.processFilter) return false;
    if (options.actionFilter && row.actionType !== options.actionFilter) return false;
    const date = parseDate(row.eventDate);
    if (!date) return !start && !end;
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
};

export const filterAuditoriaExternaRecords = (
  records: AuditoriaExternaRecord[],
  options: {
    yearFilter?: string;
    startDate?: string;
    endDate?: string;
    entityFilter?: string;
  }
): AuditoriaExternaRecord[] => {
  const selectedYear = Number(options.yearFilter);
  const start = options.startDate ? new Date(`${options.startDate}T00:00:00`) : null;
  const end = options.endDate ? new Date(`${options.endDate}T23:59:59`) : null;

  return records.filter((row) => {
    if (options.yearFilter && row.year !== selectedYear) return false;
    if (options.entityFilter && row.entity !== options.entityFilter) return false;
    const date = parseDate(row.eventDate);
    if (!date) return !start && !end;
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
};

export const buildAuditoriaIndicators = (
  interna: AuditoriaInternaRecord[],
  externa: AuditoriaExternaRecord[]
): AuditoriaIndicators => {
  const openActions = interna.reduce((sum, row) => sum + row.openActions, 0) +
    externa.reduce((sum, row) => sum + row.totalFindings, 0);
  const closedActions = interna.reduce((sum, row) => sum + row.closedActions, 0) +
    externa.reduce((sum, row) => sum + row.closedFindings, 0);
  const auditEvents = new Set([
    ...interna.map((row) => `${row.eventDate}|${row.auditType}`),
    ...externa.map((row) => `${row.eventDate}|${row.auditType}|${row.entity}`)
  ]).size;
  const avgExternalScore = externa.length
    ? externa.reduce((sum, row) => sum + row.score, 0) / externa.length
    : 0;

  return {
    auditEvents,
    internaRows: interna.length,
    externaRows: externa.length,
    openActions,
    closedActions,
    closureRate: openActions > 0 ? (closedActions / openActions) * 100 : 100,
    avgExternalScore,
    auditedProcesses: new Set(interna.map((row) => row.process).filter(Boolean)).size,
    auditedEntities: new Set([
      ...interna.map((row) => row.entity),
      ...externa.map((row) => row.entity)
    ].filter(Boolean)).size
  };
};

export const buildAuditoriaProcessStats = (records: AuditoriaInternaRecord[]): AuditoriaGroupedStat[] => {
  const grouped = new Map<string, AuditoriaGroupedStat>();
  records.forEach((row) => {
    const base = grouped.get(row.process) ?? {
      label: row.process,
      total: 0,
      openTotal: 0,
      closedTotal: 0
    };
    base.total += row.openActions + row.closedActions;
    base.openTotal += row.openActions;
    base.closedTotal += row.closedActions;
    grouped.set(row.process, base);
  });
  return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
};

export const buildAuditoriaEntityStats = (records: AuditoriaExternaRecord[]): AuditoriaGroupedStat[] => {
  const grouped = new Map<string, AuditoriaGroupedStat & { scoreSum: number; scoreCount: number }>();
  records.forEach((row) => {
    const base = grouped.get(row.entity) ?? {
      label: row.entity,
      total: 0,
      openTotal: 0,
      closedTotal: 0,
      scoreSum: 0,
      scoreCount: 0
    };
    base.total += row.totalFindings;
    base.openTotal += row.totalFindings;
    base.closedTotal += row.closedFindings;
    base.scoreSum += row.score;
    base.scoreCount += 1;
    grouped.set(row.entity, base);
  });
  return Array.from(grouped.values())
    .map(({ scoreSum, scoreCount, ...row }) => row)
    .sort((a, b) => b.total - a.total);
};

export const buildAuditoriaMonthlyTrend = (
  interna: AuditoriaInternaRecord[],
  externa: AuditoriaExternaRecord[],
  year: number
): AuditoriaMonthlyPoint[] => {
  const monthly = new Map<number, AuditoriaMonthlyPoint>();
  for (let month = 1; month <= 12; month += 1) {
    monthly.set(month, {
      month,
      label: MONTH_LABELS[month - 1] ?? `${month}`,
      internaOpen: 0,
      internaClosed: 0,
      externaFindings: 0,
      externaClosed: 0,
      avgScore: 0,
      scoreCount: 0
    });
  }

  interna
    .filter((row) => row.year === year && row.month > 0)
    .forEach((row) => {
      const point = monthly.get(row.month);
      if (!point) return;
      point.internaOpen += row.openActions;
      point.internaClosed += row.closedActions;
    });

  externa
    .filter((row) => row.year === year && row.month > 0)
    .forEach((row) => {
      const point = monthly.get(row.month);
      if (!point) return;
      point.externaFindings += row.totalFindings;
      point.externaClosed += row.closedFindings;
      point.avgScore += row.score;
      point.scoreCount += 1;
    });

  return Array.from(monthly.values()).map((point) => ({
    ...point,
    avgScore: point.scoreCount > 0 ? point.avgScore / point.scoreCount : 0
  }));
};

export const buildAuditoriaYearlyComplianceTrend = (
  interna: AuditoriaInternaRecord[],
  externa: AuditoriaExternaRecord[]
): AuditoriaYearCompliancePoint[] => {
  const years = new Set<number>();
  interna.forEach((row) => { if (row.year > 0) years.add(row.year); });
  externa.forEach((row) => { if (row.year > 0) years.add(row.year); });

  return Array.from(years)
    .sort((a, b) => a - b)
    .map((year) => {
      const internaRows = interna.filter((row) => row.year === year);
      const externaRows = externa.filter((row) => row.year === year);
      const internaCompliance = average(internaRows.map(resolveInternaCompliance));
      const externaCompliance = average(externaRows.map(resolveExternaCompliance));
      const allCompliances = [
        ...internaRows.map(resolveInternaCompliance),
        ...externaRows.map(resolveExternaCompliance)
      ];

      return {
        year,
        internaCompliance,
        externaCompliance,
        globalCompliance: average(allCompliances),
        internaEvents: internaRows.length,
        externaEvents: externaRows.length
      };
    });
};

export const buildAuditoriaComplianceByAudit = (
  interna: AuditoriaInternaRecord[],
  externa: AuditoriaExternaRecord[]
): AuditoriaAuditYearCompliance[] => {
  type YearBucket = { year: number; complianceSum: number; events: number };
  type AuditEntry = {
    label: string;
    auditKind: 'Interna' | 'Externa';
    yearMap: Map<number, YearBucket>;
  };

  const grouped = new Map<string, AuditEntry>();

  const upsert = (
    key: string,
    label: string,
    auditKind: 'Interna' | 'Externa',
    year: number,
    compliance: number
  ) => {
    const entry = grouped.get(key) ?? { label, auditKind, yearMap: new Map<number, YearBucket>() };
    const bucket = entry.yearMap.get(year) ?? { year, complianceSum: 0, events: 0 };
    bucket.complianceSum += compliance;
    bucket.events += 1;
    entry.yearMap.set(year, bucket);
    grouped.set(key, entry);
  };

  interna.forEach((row) => {
    const label = row.process.trim() || 'Sin proceso';
    upsert(`Interna|${label}`, label, 'Interna', row.year, resolveInternaCompliance(row));
  });

  externa.forEach((row) => {
    const label = row.entity.trim() || 'Sin entidad';
    upsert(`Externa|${label}`, label, 'Externa', row.year, resolveExternaCompliance(row));
  });

  return Array.from(grouped.values())
    .map((entry) => {
      const years = Array.from(entry.yearMap.values())
        .map((bucket) => ({
          year: bucket.year,
          compliance: bucket.complianceSum / bucket.events,
          events: bucket.events
        }))
        .sort((a, b) => a.year - b.year);
      const latest = years[years.length - 1];
      const previous = years[years.length - 2];
      return {
        label: entry.label,
        auditKind: entry.auditKind,
        years,
        latestYear: latest?.year ?? 0,
        latestCompliance: latest?.compliance ?? 0,
        avgCompliance: average(years.map((item) => item.compliance)),
        trendDelta: latest && previous ? latest.compliance - previous.compliance : 0
      };
    })
    .sort((a, b) => b.avgCompliance - a.avgCompliance);
};

export const resolveAuditoriaParetoReferenceYear = (
  interna: AuditoriaInternaRecord[],
  externa: AuditoriaExternaRecord[],
  yearFilter?: string
): number => {
  const selectedYear = Number(yearFilter);
  if (yearFilter && selectedYear > 0) return selectedYear;

  const years = [
    ...interna.map((row) => row.year),
    ...externa.map((row) => row.year)
  ].filter((year) => year > 0);

  if (years.length === 0) return new Date().getFullYear();
  return Math.max(...years);
};

export const buildAuditoriaCompliancePareto = (
  audits: AuditoriaAuditYearCompliance[],
  referenceYear: number
): AuditoriaComplianceParetoRow[] => {
  const rows = audits
    .map((audit) => {
      const yearPoint = audit.years.find((item) => item.year === referenceYear);
      if (!yearPoint) return null;

      const compliance = yearPoint.compliance;
      const gapPercent = Math.max(0, 100 - compliance);
      if (gapPercent <= 0) return null;

      return {
        label: audit.label,
        auditKind: audit.auditKind,
        compliance,
        gapPercent,
        referenceYear
      };
    })
    .filter((row): row is Omit<AuditoriaComplianceParetoRow, 'cumulativeGap' | 'cumulativePercent'> => row !== null)
    .sort((a, b) => b.gapPercent - a.gapPercent);

  const totalGap = rows.reduce((sum, row) => sum + row.gapPercent, 0) || 1;
  let cumulativeGap = 0;

  return rows.map((row) => {
    cumulativeGap += row.gapPercent;
    return {
      ...row,
      cumulativeGap,
      cumulativePercent: (cumulativeGap / totalGap) * 100
    };
  });
};

export const getAuditoriaComplianceColor = (compliance: number): string => {
  if (compliance >= 95) return '#006b3d';
  if (compliance >= 85) return '#d4a900';
  return '#d92d20';
};

export const getAuditoriaComplianceStyles = (compliance: number) => {
  if (compliance >= 95) {
    return { bar: '#006b3d', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' };
  }
  if (compliance >= 85) {
    return { bar: '#d4a900', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900' };
  }
  return { bar: '#d92d20', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' };
};

export const formatAuditoriaScore = (score: number): string => `${(score * 100).toFixed(1)}%`;

export const getAuditoriaScoreStyles = (score: number) => {
  if (score >= 0.95) return { label: 'Excelente', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (score >= 0.85) return { label: 'Aceptable', className: 'text-amber-800 bg-amber-50 border-amber-200' };
  return { label: 'Atención', className: 'text-red-700 bg-red-50 border-red-200' };
};

export const AUDITORIA_MONTH_LABELS = MONTH_LABELS;
