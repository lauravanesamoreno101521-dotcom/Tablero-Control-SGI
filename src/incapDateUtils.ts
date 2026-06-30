const normalizeText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

export const parseSpanishDate = (value: string): Date | null => {
  const trimmed = value.trim();
  const serialMatch = trimmed.match(/^\d+(\.\d+)?$/);
  if (serialMatch) {
    const serial = Number(trimmed);
    if (!Number.isNaN(serial)) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const parsedFromSerial = new Date(excelEpoch.getTime() + Math.floor(serial) * 86400000);
      if (!Number.isNaN(parsedFromSerial.getTime())) return parsedFromSerial;
    }
  }

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const parsed = new Date(year, month, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const parseUnknownDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return parseSpanishDate(String(Math.floor(value)));
  }
  const raw = String(value).trim();
  if (!raw) return null;
  return parseSpanishDate(raw);
};

export const formatShortDate = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatIncapPeriodPart = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const date = parseSpanishDate(trimmed);
  return date ? formatShortDate(date) : trimmed;
};

/** Normaliza periodos (efectivo, siguiente, etc.): seriales Excel → dd/mm/aaaa o rango legible. */
export const formatIncapPeriodValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  const normalized = normalizeText(raw);
  if (normalized === 'na' || normalized === 'n/a') return 'N/A';

  if (!raw.includes('/') && !/^\d+(\.\d+)?$/.test(raw)) {
    return raw;
  }

  const rangeParts = raw.split(/\s*-\s*/).map((part) => part.trim()).filter(Boolean);
  if (rangeParts.length >= 2) {
    const start = formatIncapPeriodPart(rangeParts[0]);
    const end = formatIncapPeriodPart(rangeParts[rangeParts.length - 1]);
    if (start && end) return `${start} - ${end}`;
  }

  return formatIncapPeriodPart(raw) || raw;
};

export const parsePeriodRange = (period: string): { start: Date; end: Date } | null => {
  const normalized = formatIncapPeriodValue(period);
  const parts = normalized.split(/\s*-\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const start = parseSpanishDate(parts[0]);
  const end = parseSpanishDate(parts[parts.length - 1]);
  if (!start || !end) return null;
  return { start, end };
};

export const parsePeriodStartDate = (period: string): Date | null => {
  const normalized = formatIncapPeriodValue(period);
  if (!normalized || normalizeText(normalized) === 'na') return null;
  const range = parsePeriodRange(normalized);
  if (range) return range.start;
  return parseSpanishDate(normalized);
};

export const isActiveFollowingPeriod = (period: string) => {
  const text = formatIncapPeriodValue(period).trim();
  if (!text) return false;
  const normalized = normalizeText(text);
  return normalized !== 'na' && normalized !== 'n/a';
};
