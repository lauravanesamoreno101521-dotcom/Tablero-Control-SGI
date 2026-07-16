import {
  formatIncapPeriodValue,
  formatShortDate,
  parseSpanishDate,
  parseUnknownDate
} from './incapDateUtils.ts';
import { normalizeFormacionModality, normalizeFormacionClient } from './formacionInformeDemo.ts';

export type SgiDemoExcelService =
  | 'Acompañamiento presencial'
  | 'Comportamientos inseguros'
  | 'Incapacidades'
  | 'Formación';

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const normalizeEstadoVisita = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const normalized = normalizeText(trimmed);
  if (normalized.includes('sinejecutar')) return 'Sin Ejecutar';
  if (normalized.includes('ejecutada')) return 'Ejecutada';
  return trimmed;
};

const toNumberOrZero = (value: unknown): number => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePersonName = (value: string): string => {
  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned
    .toLowerCase()
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const normalizeContractType = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const normalized = normalizeText(raw);
  if (
    normalized === 'administrativos' ||
    normalized === 'admnistrativos' ||
    normalized === 'administrativo' ||
    normalized === 'admnistrativo'
  ) {
    return 'ADMINISTRATIVO';
  }
  if (normalized === 'flotapropia') return 'FLOTA PROPIA';
  return raw;
};

const normalizeIncapClient = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const normalized = normalizeText(raw);
  if (normalized === 'admonemprestur') return 'ADMINISTRATIVOS EMPRESTUR';
  if (normalized === 'ayudahumanitaria' || normalized === 'corporacionayudahumanitaria' || normalized === 'corporacionlatina') {
    return 'CORPORACIÓN AYUDA HUMANITARIA';
  }
  if (normalized === 'epmnuevo') return 'EPM';
  if (normalized === 'empresadeenergia' || normalized === 'empresasdeenergia') return 'ENERGIA DE PEREIRA';
  if (normalized.includes('isagen')) return 'ISAGEN';
  if ((normalized.includes('mejia') || normalized.includes('megia')) && normalized.includes('acevedo')) {
    return 'MEJIA & ACEVEDO';
  }
  return raw;
};

const normalizeIncapHealthEntity = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (normalizeText(raw) === 'saviasalud') return 'SAVIASALUD';
  return raw;
};

const normalizeIncapRole = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const normalized = normalizeText(raw);

  if (normalized === 'analistacontable') return 'Analista contable';
  if (normalized === 'analistadetalentohumano' || normalized === 'analistatalentohumano') {
    return 'Analista talento humano';
  }
  if (normalized === 'aprendizdetalentohumano' || normalized === 'aprendizth') {
    return 'Aprendiz talento humano';
  }
  if (normalized === 'auxiliarcontable' || normalized === 'auxiliardecontabilidad') {
    return 'Auxiliar contable';
  }
  if (
    normalized === 'auxiliardeoperaciones' ||
    normalized === 'auxiliaroperaciones' ||
    normalized === 'auxiiardeoperaciones'
  ) {
    return 'Auxiliar operaciones';
  }
  if (
    normalized === 'coordinadordetalentohumano' ||
    normalized === 'coordinadortalentohumano' ||
    normalized === 'coordinadoradetalentohumano' ||
    normalized === 'coordinadoratalentohumano'
  ) {
    return 'Coordinador talento humano';
  }
  if (
    normalized === 'directordeflotapropia' ||
    normalized === 'directorflotapropia' ||
    normalized === 'directorfolatpropia'
  ) {
    return 'Director flota propia';
  }
  if (normalized === 'directoradehseq' || normalized === 'directorahseq') {
    return 'Directora HSEQ';
  }
  if (normalized === 'gestorlogistico') return 'Gestor Logístico';
  if (normalized === 'liderdegestiondocumental') return 'Lider gestión documental';
  if (normalized === 'profesionalcompras' || normalized === 'profesionaldecompras') {
    return 'Profesional compras';
  }

  return raw;
};

const normalizeUnsafeSiNo = (value: unknown): 'SI' | 'NO' | '' => {
  const normalized = normalizeText(value);
  if (normalized === 'si') return 'SI';
  if (normalized === 'no') return 'NO';
  return '';
};

const normalizeUnsafeInfractionLocation = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (normalizeText(trimmed) === 'itagui') return 'Itagüí';
  return trimmed;
};

const normalizeUnsafeActionType = (value: unknown): string => {
  const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Sin acción';
  if (normalizeText(cleaned) === 'capacitacion') return 'CAPACITACIÓN';
  return cleaned.toUpperCase();
};

const normalizeUnsafeControlStatus = (value: unknown): string => {
  const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Sin dato';
  const normalized = normalizeText(cleaned);
  if (normalized === 'nopago') return 'NO PAGO';
  if (normalized === 'pago') return 'PAGO';
  return cleaned.toUpperCase();
};

const inferUnsafeRiskLevel = (amount: number, description: string): 'Alto' | 'Medio' | 'Bajo' => {
  const descriptionNorm = normalizeText(description);
  if (amount >= 2000000 || descriptionNorm.includes('alcohol') || descriptionNorm.includes('sustancias')) {
    return 'Alto';
  }
  if (amount >= 800000) return 'Medio';
  return 'Bajo';
};

const inferUnsafeClosedStatus = (controlStatus: string, paymentReceipt: string): boolean => {
  const controlNorm = normalizeText(controlStatus);
  return controlNorm === 'pago' || normalizeText(paymentReceipt) === 'si';
};

const detectGestorAccompaniment = (activityText: string, executed: boolean): boolean => {
  const normalized = normalizeText(activityText);
  if (!normalized) return executed;
  if (
    normalized.includes('sinacompanamiento') ||
    normalized.includes('nosecoordina') ||
    normalized.includes('sinapoyo') ||
    normalized === 'no'
  ) {
    return false;
  }
  if (
    normalized.includes('secuentaconacompanamientodelgestor') ||
    normalized.includes('conacompanamiento') ||
    normalized.includes('acompanamientodelgestor') ||
    normalized === 'si' ||
    normalized.startsWith('si')
  ) {
    return true;
  }
  return executed;
};

const formatExcelTime = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  }

  const asString = String(value ?? '').trim();
  if (!asString) return '';

  const hhmmMatch = asString.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hhmmMatch) {
    return `${hhmmMatch[1].padStart(2, '0')}:${hhmmMatch[2]}`;
  }

  const decimal = Number(value);
  if (!Number.isFinite(decimal)) return asString;

  if (decimal >= 0 && decimal < 1) {
    const totalMinutes = Math.round(decimal * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return asString;
};

const pickField = (row: Record<string, unknown>, aliases: string[]): string => {
  const raw = pickRawField(row, aliases);
  if (raw === null || raw === undefined) return '';
  return String(raw).trim();
};

const pickRawField = (row: Record<string, unknown>, aliases: string[]): unknown => {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);
    const foundKey = keys.find((key) => normalizeText(key).includes(normalizedAlias));
    if (foundKey) return row[foundKey];
  }
  return '';
};

const findSheetByNames = (workbook: import('xlsx').WorkBook, preferredNames: string[]) => {
  for (const name of preferredNames) {
    if (workbook.Sheets[name]) return workbook.Sheets[name];
  }
  const normalizedPreferred = preferredNames.map((name) => normalizeText(name));
  const fuzzyName = workbook.SheetNames.find((sheetName) => {
    const normalizedSheet = normalizeText(sheetName);
    return normalizedPreferred.some((target) => normalizedSheet.includes(target));
  });
  if (fuzzyName) return workbook.Sheets[fuzzyName];
  return workbook.Sheets[workbook.SheetNames[0]];
};

export async function importDemoExcelForService(
  file: File,
  service: SgiDemoExcelService,
  options: { incapDxMap?: Map<string, string> } = {}
): Promise<{ count: number; records: unknown[] }> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  switch (service) {
    case 'Formación':
      return importFormacionRecords(workbook, XLSX);
    case 'Incapacidades':
      return importIncapRecords(workbook, XLSX, options.incapDxMap ?? new Map());
    case 'Comportamientos inseguros':
      return importUnsafeRecords(workbook, XLSX);
    case 'Acompañamiento presencial':
      return importSstRecords(workbook, XLSX);
    default:
      throw new Error('Servicio no soportado para carga de Excel.');
  }
}

async function importFormacionRecords(workbook: import('xlsx').WorkBook, XLSX: typeof import('xlsx')) {
  const sheet = findSheetByNames(workbook, ['BD PARTICIPANTES', 'PARTICIPANTES']);
  if (!sheet) throw new Error('No se encontró la hoja BD PARTICIPANTES.');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const records = rows
    .map((row, index) => {
      const rawDate = pickRawField(row, ['fecha']);
      const parsedDate = parseUnknownDate(rawDate) ?? parseSpanishDate(pickField(row, ['fecha']));
      const monthRaw = toNumberOrZero(row.MES ?? row['Mes'] ?? pickField(row, ['mes']));
      const month = monthRaw > 0 ? monthRaw : parsedDate ? parsedDate.getMonth() + 1 : 0;
      const yearRaw = toNumberOrZero(row['AÑO'] ?? row['Año'] ?? row.ANO ?? pickField(row, ['ano']));
      const year = yearRaw > 0 ? yearRaw : parsedDate ? parsedDate.getFullYear() : month > 0 ? 2026 : 0;
      const cedula = pickField(row, ['cedula participantes', 'cedula']);
      const rawDateLabel = parsedDate ? formatShortDate(parsedDate) : pickField(row, ['fecha']);

      return {
        id: `formacion-${index + 1}`,
        cedula,
        score: toNumberOrZero(
          row['PUNTAJE DE EVALUACIÓN'] ??
            row['PUNTAJE DE EVALUACION'] ??
            pickField(row, ['puntaje de evaluacion', 'puntaje'])
        ),
        client: normalizeFormacionClient(pickField(row, ['cliente'])),
        topic: pickField(row, ['tema y/o contenido', 'tema']),
        date: parsedDate,
        dateLabel: rawDateLabel,
        month,
        year,
        trainingTime: formatExcelTime(
          row['HORA EN QUE SE REALIZA LA FORMACIÓN'] ??
            row['HORA EN QUE SE REALIZA LA FORMACION'] ??
            pickRawField(row, ['hora en que se realiza la formacion'])
        ),
        modality: normalizeFormacionModality(
          String(
            row['MODALIDA DE LA FORMACIÓN '] ??
              row['MODALIDA DE LA FORMACIÓN'] ??
              row['MODALIDAD DE LA FORMACIÓN'] ??
              pickField(row, ['modalida de la formacion', 'modalidad de la formacion', 'modalidad'])
          ).trim()
        ),
        trainingHours: toNumberOrZero(
          row['TIEMPO TOTAL DE FORMACIÓN POR PERSONA'] ??
            row['TIEMPO TOTAL DE FORMACION POR PERSONA'] ??
            pickField(row, ['tiempo total de formacion por persona', 'tiempo total'])
        )
      };
    })
    .filter((row) => row.cedula && row.month > 0);

  if (records.length === 0) {
    throw new Error('El Excel no contiene registros válidos en BD PARTICIPANTES.');
  }

  return { count: records.length, records };
}

async function importIncapRecords(
  workbook: import('xlsx').WorkBook,
  XLSX: typeof import('xlsx'),
  incapDxMap: Map<string, string>
) {
  const sheet = findSheetByNames(workbook, ['BD Reporte Incapacidades', 'BD Incapacidades', 'Incapacidades']);
  if (!sheet) throw new Error('No se encontró la hoja BD Reporte Incapacidades.');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const records = rows
    .map((row, index) => {
      const incapDate = parseUnknownDate(row['Fecha de incapacidad']);
      const startDate = parseUnknownDate(row['Fecha Inicio']);
      const endDate = parseUnknownDate(row['Fecha Fin']);
      const entryDate = parseUnknownDate(row['fecha de ingreso a la empresa']);
      const dxCode = String(row['DX CIE10'] ?? '').trim().toUpperCase();
      const dxDescriptionRaw = String(row['Descripción DX'] ?? row['Descripcion DX'] ?? '').trim();
      const dxDescription = dxDescriptionRaw || incapDxMap.get(dxCode) || '';
      const month = toNumberOrZero(row.Mes) || (incapDate ? incapDate.getMonth() + 1 : 0);
      const year = toNumberOrZero(row['Año'] ?? row['Ano']) || (incapDate ? incapDate.getFullYear() : 0);

      return {
        id: `incap-${index + 1}`,
        incapDate,
        incapDateLabel: formatShortDate(incapDate),
        month,
        year,
        cedula: String(row.Cedula ?? row['Cédula'] ?? '').trim(),
        employeeName: normalizePersonName(String(row['Nombre del Empleado'] ?? '')),
        gender: String(row.Genero ?? row['Género'] ?? '').trim(),
        healthEntity: normalizeIncapHealthEntity(row['Entidad salud que cubre la atención']),
        payerEntity: String(row['ENTIDAD QUE PAGA LA INCAPACIDAD'] ?? '').trim(),
        contractType: normalizeContractType(row['Tipo de Contrato']),
        role: normalizeIncapRole(row.Cargo),
        entryDate,
        client: normalizeIncapClient(row['Contrato / Cliente']),
        city: String(row['Ciudad de Agencia'] ?? '').trim(),
        incapType: String(row.Incapacidad ?? '').trim(),
        incapDays: toNumberOrZero(row['Nro. Dias Incapacidad'] ?? row['Nro. Días Incapacidad']),
        startDate,
        endDate,
        dxCode,
        dxDescription,
        incapClass: String(row['Tipo incapacidad'] ?? '').trim(),
        effectivePeriod: formatIncapPeriodValue(row['Periodo Efectivo']),
        initialPeriod: formatIncapPeriodValue(row['Periodo inicial']),
        initialDays: toNumberOrZero(row.dias),
        followingPeriod: formatIncapPeriodValue(row['Periodo siguiente']),
        finalPeriod: formatIncapPeriodValue(row['Periodo final']),
        finalDays: toNumberOrZero(row.dias_1 ?? row['dias final']),
        returnRequirement: String(row['REQUISITO PARA RETOOMA DE LABORES'] ?? '').trim()
      };
    })
    .filter((row) => row.employeeName && row.month > 0 && row.year > 0);

  if (records.length === 0) {
    throw new Error('El Excel no contiene registros válidos de incapacidades.');
  }

  return { count: records.length, records };
}

async function importUnsafeRecords(workbook: import('xlsx').WorkBook, XLSX: typeof import('xlsx')) {
  const sheet = findSheetByNames(workbook, ['2026 INFRACCIONES', 'INFRACCIONES']);
  if (!sheet) throw new Error('No se encontró la hoja de infracciones.');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const records = rows
    .map((row, index) => {
      // Importante: se toma el valor crudo de la celda (puede venir como Date, número de
      // serie de Excel o texto) y se pasa sin convertir a string a parseUnknownDate, que sí
      // sabe interpretar cada caso. Convertir a String() antes de parsear un objeto Date
      // producía textos tipo "Thu Jan 26 2017 00:00:16 GMT-0500 (...)" que luego no se
      // podían volver a parsear y quedaban guardados tal cual en la columna Fecha infracción.
      const rawDateValue = row['Fecha Infracción'] ?? row['Fecha Infraccion'] ?? '';
      const rawNotificationDateValue = row['Fecha de Notificación'] ?? row['Fecha de Notificacion'] ?? '';
      const rawDate = String(rawDateValue).trim();
      const date = parseUnknownDate(rawDateValue) ?? parseSpanishDate(rawDate);
      const notificationDate =
        parseUnknownDate(rawNotificationDateValue) ?? parseSpanishDate(String(rawNotificationDateValue).trim());
      const yearRaw = Number(row['Año'] ?? row['Ano'] ?? '');
      const year = Number.isFinite(yearRaw) && yearRaw > 0 ? yearRaw : date ? date.getFullYear() : null;
      const monthRaw = Number(row.Mes ?? '');
      const month = Number.isFinite(monthRaw) && monthRaw > 0 ? monthRaw : date ? date.getMonth() + 1 : null;
      const amount = Number(row['Valor Infracción'] ?? row['Valor Infraccion'] ?? 0) || 0;
      const controlStatus = normalizeUnsafeControlStatus(row['Control Infracciones']);
      const paymentReceipt = normalizeUnsafeSiNo(row['ENTREGA COMPROBANTE DE PAGO']);
      const description = String(row['Descripción Infracciones'] ?? row['Descripcion Infracciones'] ?? '')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        id: `unsafe-${index + 1}`,
        cedula: String(row.Cedula ?? row['Cédula'] ?? '').trim(),
        driverName: normalizePersonName(String(row['Nombre completo'] ?? '')),
        client: String(row.CLIENTE ?? '').trim(),
        contractType: String(row['Tipo de Contrato'] ?? '').trim(),
        city: String(row.Ciudad ?? '').trim(),
        date,
        dateLabel: date ? formatShortDate(date) : rawDate,
        location: normalizeUnsafeInfractionLocation(
          String(row['Lugar de la Infraccion'] ?? row['Lugar de la Infracción'] ?? '').trim()
        ),
        code: String(row['Código infracción'] ?? row['Codigo infraccion'] ?? '').trim(),
        plate: String(row.Placa ?? '').trim(),
        description: description || 'Sin descripción',
        amount,
        month,
        year,
        actionType: normalizeUnsafeActionType(row['Tipo de Acción'] ?? row['Tipo de Accion']),
        notificationDate,
        trainingClass: String(row['Clase de Capacitación'] ?? row['Clase de Capacitacion'] ?? '').trim(),
        controlStatus,
        employeeStatus: String(row['ESTADO DEL EMPLEADO EN LA EMPRESA'] ?? '').trim(),
        signedReturn: normalizeUnsafeSiNo(row['DEVOLUCION NOTIFICACION FIRMADA']),
        trainingEvaluation: normalizeUnsafeSiNo(row['CAPACITACION Y EVALUACION']),
        inLabor: normalizeUnsafeSiNo(row['INFRACCIÓN SE DA EN DESARROLLO DE LA LABOR'] ?? row['INFRACCION SE DA EN DESARROLLO DE LA LABOR']),
        paymentReceipt,
        observations: String(row.Observaciones ?? '').trim(),
        riskLevel: inferUnsafeRiskLevel(amount, description),
        isClosed: inferUnsafeClosedStatus(controlStatus, paymentReceipt)
      };
    })
    .filter((row) => row.driverName && row.dateLabel);

  if (records.length === 0) {
    throw new Error('El Excel no contiene registros válidos de comportamientos inseguros.');
  }

  return { count: records.length, records };
}

async function importSstRecords(workbook: import('xlsx').WorkBook, XLSX: typeof import('xlsx')) {
  const sheet = findSheetByNames(workbook, ['agenda completa SST', 'agenda completa sst', '2026']);
  if (!sheet) throw new Error('No se encontró la hoja agenda completa SST.');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const records = rows
    .filter((row) => !!row && typeof row === 'object')
    .map((row, index) => {
      const rawDateLabel = pickField(row, ['fecha']);
      const parsedDate = parseSpanishDate(rawDateLabel) ?? parseUnknownDate(rawDateLabel);
      const dateLabel = parsedDate ? formatShortDate(parsedDate) : rawDateLabel;
      const activityText = pickField(row, ['actividad a realizar por el gestor']);
      const executedText = pickField(row, ['ejecutada']);
      const estadoVisita = pickField(row, ['estado de visita']);
      const executed =
        normalizeText(executedText) === 'si' || normalizeText(estadoVisita).includes('ejecutada');
      const hasAccompaniment = detectGestorAccompaniment(activityText, executed);
      const impacted = Number(pickField(row, ['cant personal impactado']).replace(',', '.')) || 0;

      return {
        id: `sst-${index + 1}`,
        client: pickField(row, ['cliente lugar visita', 'cliente']),
        city: pickField(row, ['ciudad']),
        date: parsedDate,
        dateLabel,
        gestor: pickField(row, ['gestor logistico']),
        sgiCompanion: normalizePersonName(pickField(row, ['se genera acompanamiento area sgi', 'se genera acompanamiento'])),
        area: pickField(row, ['area']),
        executed,
        accompanimentText: activityText,
        hasAccompaniment,
        estadoVisita:
          normalizeEstadoVisita(estadoVisita) || (executed ? 'Ejecutada' : 'Sin Ejecutar'),
        impactedPeople: impacted,
        topics: pickField(row, ['temas abordados', 'observacion novedades'])
      };
    })
    .filter((row) => row.client && row.dateLabel);

  if (records.length === 0) {
    throw new Error('El Excel no contiene registros válidos de agenda SST.');
  }

  return { count: records.length, records };
}
