/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle,
  MapPin,
  TrendingUp,
  Plus,
  Search,
  Navigation,
  User,
  Gauge,
  Fuel,
  Thermometer,
  Filter,
  Check,
  FileText,
  RefreshCw,
  Sliders,
  Eye,
  Compass,
  AlertCircle,
  HelpCircle,
  Map as MapIcon,
  Hash,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Leaf,
  Users
} from 'lucide-react';
import { Shipment, Driver, FleetVehicle, IncidentAlert, GpsPoint, OptimizedRoute, ShipmentStatus } from './types.ts';
import { INITIAL_SHIPMENTS, INITIAL_DRIVERS, INITIAL_VEHICLES, INITIAL_ALERTS, COORDINATES_MAP } from './mockData.ts';
import empresturLogo from '../Logo Emprestur.jpeg';
import sstAgendaRaw from './sstAgendaData.json';
import comportamientosInsegurosRaw from './comportamientosInsegurosData.json';
import incapBdRaw from './incapBdData.json';
import incapDxRaw from './incapDxData.json';
import incapInformeRaw from './incapInformeData.json';
import {
  computeIncapInforme,
  extractBdInformeMetrics,
  formatInformeCellValue,
  INCAP_INFORME_MONTH_LABELS,
  parseInformeInputsFromRows,
  parseIncapIndicatorsFromInformeRows,
  resolveIncapEmployeesMonthly,
  type IncapInformeEditableField,
  type IncapInformeManualBdEdits,
  type IncapInformeMonthlyInputs
} from './incapInformeDemo.ts';
import {
  formatIncapPeriodValue,
  formatShortDate,
  parseSpanishDate,
  parseUnknownDate
} from './incapDateUtils.ts';
import { getScaledBarHeight, renderSgiGroupedVerticalBars, renderSgiVerticalBar } from './sgiBarChart.tsx';
import formacionBdRaw from './formacionBdData.json';
import formacionInformeRaw from './formacionInformeData.json';
import {
  computeFormacionInforme,
  extractFormacionBdMetrics,
  extractFormacionSpecialMetricsFromRecords,
  formatFormacionInformeCellValue,
  normalizeFormacionModality,
  getFormacionTopicKey,
  countFormacionParticipatingPeople,
  normalizeFormacionClient,
  FORMACION_INFORME_MONTH_LABELS,
  parseFormacionInformeInputsFromRows,
  type FormacionInformeEditableField,
  type FormacionInformeManualEdits,
  type FormacionInformeMonthlyInputs
} from './formacionInformeDemo.ts';
import { DemoExcelUploadButton } from './DemoExcelUploadButton.tsx';
import { importDemoExcelForService, type SgiDemoExcelService } from './sgiDemoExcelImport.ts';
import { isSupabaseConfigured, SGI_SESSION_EMAIL_KEY } from './supabase/client.ts';
import {
  canEditSgiDatasets,
  getCurrentSgiAppUser,
  getSgiRoleLabel,
  isSgiAdmin,
  registerSgiUser,
  signInSgiUser,
  signOutSgiUser,
  type SgiAppRole,
  type SgiAppUser
} from './supabase/auth.ts';
import SgiAuthScreen from './components/SgiAuthScreen.tsx';
import SgiUserManagement from './components/SgiUserManagement.tsx';
import { parseSgiRoute, sgiRouteToHash, type SgiAppRoute } from './sgiRoutes.ts';
import {
  loadSgiDatasetsFromSupabase,
  persistSgiDatasetsToSupabase,
  type SgiPersistedDatasets
} from './supabase/sgiPersistence.ts';
import accidentalidadBdRaw from './accidentalidadBdData.json';
import accidentalidadInformeRaw from './accidentalidadInformeData.json';
import {
  ACCIDENTALIDAD_INFORME_MONTH_LABELS,
  buildAccidentalidadIliMetaComparison,
  buildAccidentalidadIndicators,
  buildAccidentalidadInformeSections,
  buildAccidentalidadMonthlyTrend,
  buildAccidentalidadReincidenceStats,
  formatAccidentalidadInformeCell,
  getAccidentalidadInformeRows,
  groupAccidentalidadCauseStats,
  groupAccidentalidadRecords,
  resolveAccidentalidadIliStatus,
  resolveAccidentalidadInformeYear,
  type AccidentalidadIliStatus,
  type AccidentalidadInformeSection,
  type AccidentalidadRecord
} from './accidentalidadInformeDemo.ts';
import medicinaTrabajoBdRaw from './medicinaTrabajoBdData.json';
import {
  buildMedicinaIndicators,
  buildMedicinaMonthlyTrend,
  filterMedicinaRecords,
  formatMedicinaCurrency,
  getMedicinaCityOptions,
  getMedicinaYearOptions,
  getMedicinaExpiryStylesForRecord,
  groupMedicinaRecords,
  MEDICINA_MONTH_NAMES,
  resolveMedicinaReferenceDate,
  resolveMedicinaTrendYear,
  type MedicinaTrabajoRecord
} from './medicinaTrabajoDemo.ts';
import MedicinaTrabajoSection from './components/MedicinaTrabajoSection.tsx';

type IncapInformeByYear = Record<string, unknown[][]>;

const incapInformeByYear = incapInformeRaw as IncapInformeByYear;

const INCAP_INFORME_YEARS = Object.keys(incapInformeByYear)
  .map(Number)
  .filter((year) => year > 0)
  .sort((a, b) => b - a);

const resolveIncapInformeYear = (yearFilter: string): number | null => {
  if (yearFilter) {
    const selected = Number(yearFilter);
    return INCAP_INFORME_YEARS.includes(selected) ? selected : null;
  }
  return INCAP_INFORME_YEARS[0] ?? 2026;
};

const getIncapInformeRows = (year: number): unknown[][] => {
  const rows = incapInformeByYear[String(year)];
  return Array.isArray(rows) ? rows : [];
};

type FormacionInformeByYear = Record<string, unknown[][]>;

const formacionInformeByYear = formacionInformeRaw as FormacionInformeByYear;

const accidentalidadInformeByYear = accidentalidadInformeRaw as Record<string, unknown[][]>;

const ACCIDENTALIDAD_INFORME_YEARS = Object.keys(accidentalidadInformeByYear)
  .map(Number)
  .filter((year) => year > 0)
  .sort((a, b) => b - a);

const FORMACION_INFORME_YEARS = Object.keys(formacionInformeByYear)
  .map(Number)
  .filter((year) => year > 0)
  .sort((a, b) => b - a);

const resolveFormacionInformeYear = (yearFilter: string): number | null => {
  if (yearFilter) {
    const selected = Number(yearFilter);
    return FORMACION_INFORME_YEARS.includes(selected) ? selected : null;
  }
  return FORMACION_INFORME_YEARS[0] ?? 2026;
};

const getFormacionInformeRows = (year: number): unknown[][] => {
  const rows = formacionInformeByYear[String(year)];
  return Array.isArray(rows) ? rows : [];
};

type SstVisitRecord = {
  id: string;
  client: string;
  city: string;
  date: Date | null;
  dateLabel: string;
  gestor: string;
  sgiCompanion: string;
  area: string;
  executed: boolean;
  accompanimentText: string;
  hasAccompaniment: boolean;
  estadoVisita: string;
  impactedPeople: number;
  topics: string;
};

type SstVisitForm = {
  client: string;
  city: string;
  date: string;
  gestor: string;
  executed: '' | 'SI' | 'NO';
  accompanimentText: string;
  sgiCompanion: string;
  area: string;
  estadoVisita: string;
  impactedPeople: string;
  topics: string;
};

type UnsafeBehaviorRecord = {
  id: string;
  cedula: string;
  driverName: string;
  client: string;
  contractType: string;
  city: string;
  date: Date | null;
  dateLabel: string;
  location: string;
  code: string;
  plate: string;
  description: string;
  amount: number;
  month: number | null;
  year: number | null;
  actionType: string;
  notificationDate: Date | null;
  trainingClass: string;
  controlStatus: string;
  employeeStatus: string;
  signedReturn: string;
  trainingEvaluation: string;
  inLabor: string;
  paymentReceipt: string;
  observations: string;
  riskLevel: 'Alto' | 'Medio' | 'Bajo';
  isClosed: boolean;
};

type UnsafeBehaviorForm = {
  cedula: string;
  date: string;
  driverName: string;
  client: string;
  contractType: string;
  city: string;
  location: string;
  code: string;
  plate: string;
  description: string;
  amount: string;
  month: string;
  year: string;
  actionType: string;
  notificationDate: string;
  trainingClass: string;
  controlStatus: string;
  employeeStatus: string;
  signedReturn: string;
  trainingEvaluation: string;
  inLabor: string;
  paymentReceipt: string;
  observations: string;
};

type IncapRecord = {
  id: string;
  incapDate: Date | null;
  incapDateLabel: string;
  month: number;
  year: number;
  cedula: string;
  employeeName: string;
  gender: string;
  healthEntity: string;
  payerEntity: string;
  contractType: string;
  role: string;
  entryDate: Date | null;
  client: string;
  city: string;
  incapType: string;
  incapDays: number;
  startDate: Date | null;
  endDate: Date | null;
  dxCode: string;
  dxDescription: string;
  incapClass: string;
  effectivePeriod: string;
  initialPeriod: string;
  initialDays: number;
  followingPeriod: string;
  finalPeriod: string;
  finalDays: number;
  returnRequirement: string;
};

type IncapForm = {
  incapDate: string;
  month: string;
  year: string;
  cedula: string;
  employeeName: string;
  gender: string;
  healthEntity: string;
  payerEntity: string;
  contractType: string;
  role: string;
  entryDate: string;
  client: string;
  city: string;
  incapType: string;
  incapDays: string;
  startDate: string;
  endDate: string;
  dxCode: string;
  dxDescription: string;
  incapClass: string;
  effectivePeriod: string;
  initialPeriod: string;
  initialDays: string;
  followingPeriod: string;
  finalPeriod: string;
  finalDays: string;
  returnRequirement: string;
};

type FormacionRecord = {
  id: string;
  cedula: string;
  score: number;
  client: string;
  topic: string;
  date: Date | null;
  dateLabel: string;
  month: number;
  year: number;
  trainingTime: string;
  modality: string;
  trainingHours: number;
};

type FormacionForm = {
  cedula: string;
  score: string;
  client: string;
  topic: string;
  date: string;
  month: string;
  year: string;
  trainingTime: string;
  modality: string;
  trainingHours: string;
};

type AccidentalidadForm = {
  eventDate: string;
  reportDate: string;
  month: string;
  year: string;
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

type MedicinaTrabajoForm = {
  documento: string;
  employeeName: string;
  city: string;
  role: string;
  entryDate: string;
  contract: string;
  linkType: string;
  examDate: string;
  examStatus: string;
  postIncapacidad: string;
  ips: string;
  cost: string;
  periodicYears: string;
  expiryDate: string;
};

const INCAP_DB_FIELD_CLASS = 'w-full min-w-0 max-w-full border border-[#d6dce5] rounded-soft px-1 py-1 bg-white text-[10px]';
const INCAP_DB_TH_CLASS = 'px-2 py-2 font-semibold align-bottom border-r border-[#eaecf0] last:border-r-0';
const INCAP_DB_TD_CLASS = 'px-2 py-2 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-middle border-r border-[#eef1f5] last:border-r-0';

const INCAP_TYPE_OPTIONS = [
  'Inc. Accidente laboral',
  'Inc. Enfermedad general',
  'Inc. Enfermedad laboral',
  'Licencia Maternidad',
  'Licencia Paternidad'
];

const INCAP_CLASS_OPTIONS = ['INICIAL', 'PRORROGA', 'FALLECIDO'];

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const infractionDescriptionFixes: Array<[string, string]> = [
  [
    'Nodetenerseanteunaluzrojaoamarilladesemáforo,unaseñalde"PARE"ounsemáforointermitenteenrojo.Enelcasodemotocicletaseprocederaasuinmovilizaciónhastatantonosepagueelvalordelamultaolaautoridadcompetentedecidasobresuimposicionenlosterminosdelosarticulos135y136delcódigonacionaldetránsito.',
    'No detenerse ante una luz roja o amarilla de semáforo, una señal de "PARE" o un semáforo intermitente en rojo. En el caso de motocicletas se procederá a su inmovilización hasta tanto no se pague el valor de la multa o la autoridad competente decida sobre su imposición en los términos de los artículos 135 y 136 del Código Nacional de Tránsito.'
  ],
  [
    'ConducirsinportarelSeguroObligatoriodeAccidentesdetránsitoordenadoporlaley.Además,elvehículoseráinmovilizado.',
    'Conducir sin portar el Seguro Obligatorio de Accidentes de Tránsito ordenado por la ley. Además, el vehículo será inmovilizado.'
  ],
  [
    'Noportarcomomínimoelsiguienteequipodeprevenciónyseguridad.(verlistado)',
    'No portar como mínimo el siguiente equipo de prevención y seguridad. (Ver listado)'
  ],
  [
    'Transitarenvehículosde3.5omástoneladasporelcarrilizquierdodelavíacuandohubieremásdeuncarril.',
    'Transitar en vehículos de 3.5 o más toneladas por el carril izquierdo de la vía cuando hubiere más de un carril.'
  ],
  [
    'Noutilizarelcinturóndeseguridadporpartedelosocupantesdelvehículoyloscinturonesdeseguridadenlosasientostraserosenlosvehículosfabricadosapartirdelaño2004.',
    'No utilizar el cinturón de seguridad por parte de los ocupantes del vehículo y los cinturones de seguridad en los asientos traseros en los vehículos fabricados a partir del año 2004.'
  ],
  [
    'Transitarensentidocontrarioalestipuladoparalavía,calzadaocarril.Enelcasodemotocicletaseprocederaasuinmovilizaciónhastatantonosepagueelvalordelamultaolaautoridadcompetentedecidasobresuimposicionenlosterminosdelosarticulos135y136delcódigonacionaldetránsito.',
    'Transitar en sentido contrario al estipulado para la vía, calzada o carril. En el caso de motocicletas se procederá a su inmovilización hasta tanto no se pague el valor de la multa o la autoridad competente decida sobre su imposición en los términos de los artículos 135 y 136 del Código Nacional de Tránsito.'
  ],
  [
    'Conducirunvehículodeserviciopúblicoquenolleveelavisodetarifasoficialesencondicionesdefácillecturaparalospasajerosoposeeresteavisodeterioradooadulterado.',
    'Conducir un vehículo de servicio público que no lleve el aviso de tarifas oficiales en condiciones de fácil lectura para los pasajeros o poseer este aviso deteriorado o adulterado.'
  ],
  [
    'Conducirunvehículoconvidriospolarizados,entintadosuoscurecidos,sinportarelpermisorespectivo,deacuerdoalareglamentaciónexistenteo,nollevarelvehículodeserviciopúblicocolectivourbanoconlosvidriostransparentes.',
    'Conducir un vehículo con vidrios polarizados, entintados u oscurecidos, sin portar el permiso respectivo, de acuerdo a la reglamentación existente o no llevar el vehículo de servicio público colectivo urbano con los vidrios transparentes.'
  ],
  [
    'Cuandosedetecteoadviertaunainfracciónalasnormasdeemisióncontaminantesodegeneraciónderuidoporvehículosautomotores',
    'Cuando se detecte o advierta una infracción a las normas de emisión contaminantes o de generación de ruido por vehículos automotores.'
  ],
  [
    'Bloquearunacalzadaointersecciónconunvehículo,salvocuandoelbloqueoobedezcaalaocurrenciadeunaccidente.',
    'Bloquear una calzada o intersección con un vehículo, salvo cuando el bloqueo obedezca a la ocurrencia de un accidente.'
  ],
  [
    'Dejardeseñalizar(verlistadodesituaciones)',
    'Dejar de señalizar. (Ver listado de situaciones)'
  ]
];

const toReadableInfractionDescription = (value: unknown): string => {
  const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Sin descripción';
  const normalized = normalizeText(cleaned);
  const fixed = infractionDescriptionFixes.find(([raw]) => normalizeText(raw) === normalized);
  if (fixed) return fixed[1];
  return cleaned;
};

const normalizeUnsafeActionType = (value: unknown): string => {
  const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Sin acción';
  const normalized = normalizeText(cleaned);
  if (normalized === 'capacitacion') return 'CAPACITACIÓN';
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

const normalizeUnsafeSiNo = (value: unknown): 'SI' | 'NO' | '' => {
  const normalized = normalizeText(value);
  if (normalized === 'si') return 'SI';
  if (normalized === 'no') return 'NO';
  return '';
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
  if (normalized === 'flotapropia') {
    return 'FLOTA PROPIA';
  }
  return raw;
};

const normalizeIncapClient = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const normalized = normalizeText(raw);
  if (normalized === 'admonemprestur') {
    return 'ADMINISTRATIVOS EMPRESTUR';
  }
  if (normalized === 'ayudahumanitaria' || normalized === 'corporacionayudahumanitaria' || normalized === 'corporacionlatina') {
    return 'CORPORACIÓN AYUDA HUMANITARIA';
  }
  if (normalized === 'epmnuevo') {
    return 'EPM';
  }
  if (normalized === 'empresadeenergia' || normalized === 'empresasdeenergia') {
    return 'ENERGIA DE PEREIRA';
  }
  if (normalized.includes('isagen')) {
    return 'ISAGEN';
  }
  if ((normalized.includes('mejia') || normalized.includes('megia')) && normalized.includes('acevedo')) {
    return 'MEJIA & ACEVEDO';
  }
  return raw;
};

const normalizeIncapHealthEntity = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (normalizeText(raw) === 'saviasalud') {
    return 'SAVIASALUD';
  }
  return raw;
};

const formatDateForInput = (date: Date | null): string => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const buildVisitFromForm = (form: SstVisitForm, id: string): SstVisitRecord => {
  const parsedDate = form.date ? new Date(`${form.date}T00:00:00`) : null;
  const dateLabel = parsedDate ? formatShortDate(parsedDate) : '';
  const activityText = form.accompanimentText.trim();
  const executed = form.executed === 'SI';
  return {
    id,
    client: form.client.trim(),
    city: form.city.trim(),
    date: parsedDate,
    dateLabel,
    gestor: normalizePersonName(form.gestor),
    sgiCompanion: normalizePersonName(form.sgiCompanion),
    area: form.area.trim(),
    executed,
    accompanimentText: activityText,
    hasAccompaniment: detectGestorAccompaniment(activityText, executed),
    estadoVisita: form.estadoVisita.trim() || (executed ? 'Ejecutada' : 'Sin Ejecutar'),
    impactedPeople: Number(form.impactedPeople) || 0,
    topics: form.topics.trim()
  };
};

const EXECUTION_TARGET_PERCENT = 70;

const getSgiComplianceBarColor = (rate: number): string => {
  if (rate < 70) return '#ba1a1a';
  if (rate <= 90) return '#ffd000';
  return '#006b3d';
};

const getGreenBarColor = (value: number, minValue: number, maxValue: number): string => {
  const intensity = maxValue === minValue ? 1 : (value - minValue) / (maxValue - minValue);
  const barLightness = 58 - intensity * 38;
  const barSaturation = 72 + intensity * 24;
  return `hsl(150, ${barSaturation}%, ${barLightness}%)`;
};

const getAccidentalidadIliStatusStyles = (status: AccidentalidadIliStatus) => {
  if (status === 'ok') {
    return {
      bg: 'bg-[#dcfce7]',
      text: 'text-[#166534]',
      border: 'border-[#86efac]',
      label: 'Dentro de meta'
    };
  }
  if (status === 'warn') {
    return {
      bg: 'bg-[#fef9c3]',
      text: 'text-[#854d0e]',
      border: 'border-[#fde047]',
      label: 'Atención'
    };
  }
  return {
    bg: 'bg-[#fee2e2]',
    text: 'text-[#991b1b]',
    border: 'border-[#fca5a5]',
    label: 'Fuera de meta'
  };
};

const renderAccidentalidadStatList = (
  title: string,
  rows: { label: string; total: number; hint?: string }[],
  emptyLabel = 'Sin registros en el filtro actual.'
) => (
  <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">{title}</p>
    {rows.length === 0 ? (
      <p className="text-xs text-gray-500 bg-white border border-[#eaecf0] rounded-soft p-3">{emptyLabel}</p>
    ) : (
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#191c1d] line-clamp-2" title={row.hint ?? row.label}>
              {row.label}
            </span>
            <span className="font-mono shrink-0">{row.total}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

const renderAccidentalidadInformeSections = (sections: AccidentalidadInformeSection[], keyPrefix: string) => (
  <div className="space-y-4">
    {sections.map((section) => (
      <div key={`${keyPrefix}-${section.id}`} className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">{section.title}</p>
        <div className="overflow-x-auto bg-white border border-[#eaecf0] rounded-soft">
          <table className="min-w-full text-xs">
            <thead className="bg-[#f8f9fa] border-b border-[#eaecf0] text-left text-gray-600">
              <tr>
                <th className="px-3 py-2 min-w-[280px]">Descripción</th>
                {ACCIDENTALIDAD_INFORME_MONTH_LABELS.map((month) => (
                  <th key={`${keyPrefix}-${section.id}-${month}`} className="px-2 py-2 text-center">{month}</th>
                ))}
                <th className="px-2 py-2 text-center bg-[#eceff3]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1f5]">
              {section.rows.map((row) => (
                <tr key={`${keyPrefix}-${section.id}-${row.label}`}>
                  <td className="px-3 py-2 font-medium text-[#191c1d]">{row.label}</td>
                  {row.values.map((value, index) => (
                    <td key={`${keyPrefix}-${section.id}-${row.label}-${index}`} className="px-2 py-2 text-center font-mono">
                      {formatAccidentalidadInformeCell(row, value)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-mono bg-[#eceff3] font-semibold">
                    {formatAccidentalidadInformeCell(row, row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ))}
  </div>
);

const resolveSingleMonthIndexFromDateRange = (startDate: string, endDate: string): number | null => {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = endDate ? new Date(`${endDate}T23:59:59`) : start;
  if (Number.isNaN(end.getTime())) return null;
  if (start.getFullYear() !== end.getFullYear() || start.getMonth() !== end.getMonth()) return null;
  return start.getMonth();
};

const normalizeSgiTopicLabel = (topic: string): string => {
  if (/pausas?\s*activas?/i.test(topic)) return 'Pausa Activa';
  if (/inspecci[oó]n/i.test(topic)) return 'Inspecciones';
  if (/pevs|pesv/i.test(topic)) return 'PEVS';
  if (/peligros?\s*y\s*riesgos?/i.test(topic)) return 'Peligros y Riesgos';
  if (
    /prevenci[oó]n\s+(del\s+)?consumo\s+(de\s+)?(alcohol|alochol|drogras|sustancias(\s+psicoactivas)?)/i.test(topic) ||
    /prevenci[oó]n\s+(de\s+la\s+|de\s+)?embriaguez/i.test(topic) ||
    /prevenci[oó]n\s+consumo\s+alochol/i.test(topic)
  ) {
    return 'Prevención del consumo de alcohol y sustancias psicoactivas';
  }
  if (/tamizaje/i.test(topic)) return 'Tamizajes';
  if (/socializaci[oó]n(\s+(de\s+)?)?examenes?(\s+medicos?)?/i.test(topic)) {
    return 'Socialización de exámenes médicos';
  }
  if (/conducci[oó]n\s+(a\s+la\s+defensiva|preventiva)|manejo\s+defensivo/i.test(topic)) {
    return 'Conducción preventiva y a la defensiva';
  }
  if (
    /reportes?\s+(de\s+)?(accidentes?(\s+de\s+trabajo(\s+y\s+siniestros\s+viales)?)?|at\b|novedades|condiciones\s+inseguras)/i.test(
      topic
    ) ||
    /^condiciones\s+inseguras$/i.test(topic)
  ) {
    return 'Reporte de novedades, condiciones inseguras, AT o siniestros viales';
  }
  return topic;
};

/** Activar solo cuando se solicite explícitamente el acceso de modo prueba. */
const ENABLE_DEMO_MODE_ENTRY = false;

const isEmpresturEmail = (email: string): boolean =>
  /^[^\s@]+@emprestur\.com$/i.test(email.trim());

export default function App() {
  const serviceMenuItems = [
    'Acompañamiento presencial',
    'Accidentalidad',
    'Medicina del trabajo',
    'Comportamientos inseguros',
    'Incapacidades',
    'Formación'
  ] as const;

  // State for operational database
  const [shipments, setShipments] = useState<Shipment[]>(() => {
    const saved = localStorage.getItem('logi_shipments');
    return saved ? JSON.parse(saved) : INITIAL_SHIPMENTS;
  });

  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('logi_drivers');
    return saved ? JSON.parse(saved) : INITIAL_DRIVERS;
  });

  const [vehicles, setVehicles] = useState<FleetVehicle[]>(() => {
    const saved = localStorage.getItem('logi_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
  });

  const [alerts, setAlerts] = useState<IncidentAlert[]>(() => {
    const saved = localStorage.getItem('logi_alerts');
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'control' | 'shipments' | 'crews' | 'optimizer' | 'sgi'>('sgi');
  const [searchShipment, setSearchShipment] = useState('');
  const [filterStatus, setFilterStatus] = useState<ShipmentStatus | 'all'>('all');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>('TRK-7711-ESP'); // pre-select critical item for visual impact
  const [selectedMapNode, setSelectedMapNode] = useState<string | null>(null);
  const [selectedServiceMenuItem, setSelectedServiceMenuItem] = useState<(typeof serviceMenuItems)[number]>('Formación');
  const [isGsiMenuOpen, setIsGsiMenuOpen] = useState(true);
  const [sgiSubIndicator, setSgiSubIndicator] = useState<'1' | '2' | '3' | '4'>('1');
  const [sgiDonutMetric, setSgiDonutMetric] = useState<'executed' | 'logistic' | 'sgi'>('executed');
  const [sgiStartDate, setSgiStartDate] = useState('');
  const [sgiEndDate, setSgiEndDate] = useState('');
  const [unsafeYearFilter, setUnsafeYearFilter] = useState('');
  const [incapYearFilter, setIncapYearFilter] = useState('');
  const [formacionYearFilter, setFormacionYearFilter] = useState('');
  const [accidentalidadYearFilter, setAccidentalidadYearFilter] = useState('');
  const [medicinaYearFilter, setMedicinaYearFilter] = useState('');
  const [medicinaMonthFilter, setMedicinaMonthFilter] = useState('');
  const [medicinaCityFilter, setMedicinaCityFilter] = useState('');
  const [medicinaAlertFilter, setMedicinaAlertFilter] = useState<'all' | 'vencido' | 'este_mes' | 'proximo_mes'>('all');
  const sgiDonutRef = useRef<HTMLDivElement | null>(null);
  const supabaseSyncReadyRef = useRef(false);
  const [authBootstrapping, setAuthBootstrapping] = useState(() => isSupabaseConfigured());
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);
  const [registerEmail, setRegisterEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registeredUserEmail, setRegisteredUserEmail] = useState('');
  const [sgiAppUserRole, setSgiAppUserRole] = useState<SgiAppRole | null>(null);
  const [sgiRoute, setSgiRoute] = useState<SgiAppRoute>(() =>
    typeof window !== 'undefined' ? parseSgiRoute(window.location.hash) : 'dashboard'
  );
  const [isDbTestConnected, setIsDbTestConnected] = useState(false);
  const [showDbDetailPanel, setShowDbDetailPanel] = useState(false);
  const [isDemoExcelLoading, setIsDemoExcelLoading] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [dbForm, setDbForm] = useState<SstVisitForm>({
    client: '',
    city: '',
    date: '',
    gestor: '',
    executed: '',
    accompanimentText: '',
    sgiCompanion: '',
    area: '',
    estadoVisita: '',
    impactedPeople: '',
    topics: ''
  });
  const [editingUnsafeId, setEditingUnsafeId] = useState<string | null>(null);
  const [unsafeForm, setUnsafeForm] = useState<UnsafeBehaviorForm>({
    cedula: '',
    date: '',
    driverName: '',
    client: '',
    contractType: '',
    city: '',
    location: '',
    code: '',
    plate: '',
    description: '',
    amount: '',
    month: '',
    year: '',
    actionType: '',
    notificationDate: '',
    trainingClass: '',
    controlStatus: '',
    employeeStatus: '',
    signedReturn: '',
    trainingEvaluation: '',
    inLabor: '',
    paymentReceipt: '',
    observations: ''
  });
  const [editingIncapId, setEditingIncapId] = useState<string | null>(null);
  const [incapDemoPanel, setIncapDemoPanel] = useState<'bd' | 'informe'>('bd');
  const [incapDemoInformeEdits, setIncapDemoInformeEdits] = useState<
    Record<number, Partial<IncapInformeMonthlyInputs & IncapInformeManualBdEdits>>
  >({});
  const [formacionDemoPanel, setFormacionDemoPanel] = useState<'bd' | 'informe'>('bd');
  const [accidentalidadDemoPanel, setAccidentalidadDemoPanel] = useState<'bd' | 'informe'>('bd');
  const [formacionDemoInformeEdits, setFormacionDemoInformeEdits] = useState<
    Record<number, Partial<FormacionInformeMonthlyInputs>>
  >({});
  const [editingFormacionId, setEditingFormacionId] = useState<string | null>(null);
  const [formacionForm, setFormacionForm] = useState<FormacionForm>({
    cedula: '',
    score: '',
    client: '',
    topic: '',
    date: '',
    month: '',
    year: '',
    trainingTime: '',
    modality: '',
    trainingHours: ''
  });
  const [editingAccidentalidadId, setEditingAccidentalidadId] = useState<string | null>(null);
  const [accidentalidadForm, setAccidentalidadForm] = useState<AccidentalidadForm>({
    eventDate: '',
    reportDate: '',
    month: '',
    year: '',
    manager: '',
    cedula: '',
    employeeName: '',
    plate: '',
    client: '',
    duringService: '',
    characteristic: '',
    severity: '',
    lossLevel: '',
    contractType: '',
    linkType: '',
    role: '',
    basicCause: '',
    immediateCause: '',
    riskDescription: ''
  });
  const [editingMedicinaId, setEditingMedicinaId] = useState<string | null>(null);
  const [medicinaForm, setMedicinaForm] = useState<MedicinaTrabajoForm>({
    documento: '',
    employeeName: '',
    city: '',
    role: '',
    entryDate: '',
    contract: '',
    linkType: '',
    examDate: '',
    examStatus: '',
    postIncapacidad: '',
    ips: '',
    cost: '',
    periodicYears: '1',
    expiryDate: ''
  });
  const [incapForm, setIncapForm] = useState<IncapForm>({
    incapDate: '',
    month: '',
    year: '',
    cedula: '',
    employeeName: '',
    gender: '',
    healthEntity: '',
    payerEntity: '',
    contractType: '',
    role: '',
    entryDate: '',
    client: '',
    city: '',
    incapType: '',
    incapDays: '',
    startDate: '',
    endDate: '',
    dxCode: '',
    dxDescription: '',
    incapClass: '',
    effectivePeriod: '',
    initialPeriod: '',
    initialDays: '',
    followingPeriod: '',
    finalPeriod: '',
    finalDays: '',
    returnRequirement: ''
  });
  
  // Create dispatch shipment modal / collapsible form
  const [isAddingShipment, setIsAddingShipment] = useState(false);
  const [newOrigin, setNewOrigin] = useState('Madrid');
  const [newDestination, setNewDestination] = useState('Barcelona');
  const [newCargo, setNewCargo] = useState('');
  const [newWeight, setNewWeight] = useState(6500);
  const [isRefrigerated, setIsRefrigerated] = useState(false);
  const [newTemp, setNewTemp] = useState<number>(4);
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');

  // Routing and Optimization engine state
  const [optOrigin, setOptOrigin] = useState('Madrid');
  const [optDestination, setOptDestination] = useState('Sevilla');
  const [optPriority, setOptPriority] = useState<'speed' | 'sustainability' | 'cost'>('speed');
  const [optWeight, setOptWeight] = useState(8000);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState<OptimizedRoute | null>(null);

  // Digital Sync Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (activeTab !== 'sgi' || sgiSubIndicator !== '1') return;
      if (!sgiDonutRef.current) return;
      const target = event.target as Node;
      if (!sgiDonutRef.current.contains(target)) {
        setSgiDonutMetric('executed');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeTab, sgiSubIndicator]);

  const initialSstVisits = useMemo(() => {
    try {
      const pickField = (row: Record<string, unknown>, aliases: string[]) => {
        const keys = Object.keys(row);
        for (const alias of aliases) {
          const normalizedAlias = normalizeText(alias);
          const foundKey = keys.find((key) => normalizeText(key).includes(normalizedAlias));
          if (foundKey) {
            return String(row[foundKey] ?? '').trim();
          }
        }
        return '';
      };

      return (Array.isArray(sstAgendaRaw) ? sstAgendaRaw : [])
        .filter((row) => !!row && typeof row === 'object' && !Array.isArray(row))
        .map((row, index) => {
          const record = row as Record<string, unknown>;
          const rawDateLabel = pickField(record, ['fecha']);
          const parsedDate = parseSpanishDate(rawDateLabel);
          const dateLabel = parsedDate ? formatShortDate(parsedDate) : rawDateLabel;
          const activityText = pickField(record, ['actividad a realizar por el gestor']);
          const executedText = pickField(record, ['ejecutada']);
          const estadoVisita = pickField(record, ['estado de visita']);
          const executed =
            normalizeText(executedText) === 'si' ||
            normalizeText(estadoVisita).includes('ejecutada');
          const hasAccompaniment = detectGestorAccompaniment(activityText, executed);
          const impacted = Number(pickField(record, ['cant personal impactado']).replace(',', '.')) || 0;

          return {
            id: `sst-${index + 1}`,
            client: pickField(record, ['cliente lugar visita', 'cliente']),
            city: pickField(record, ['ciudad']),
            date: parsedDate,
            dateLabel,
            gestor: pickField(record, ['gestor logistico']),
            sgiCompanion: normalizePersonName(
              pickField(record, ['se genera acompanamiento area sgi', 'se genera acompanamiento'])
            ),
            area: pickField(record, ['area']),
            executed,
            accompanimentText: activityText,
            hasAccompaniment,
            estadoVisita,
            impactedPeople: impacted,
            topics: pickField(record, ['temas abordados', 'observacion novedades'])
          } as SstVisitRecord;
        })
        .filter((row) => row.client && row.dateLabel);
    } catch (error) {
      console.error('Error procesando agenda SST:', error);
      return [];
    }
  }, []);

  const [sstVisits, setSstVisits] = useState<SstVisitRecord[]>(() => initialSstVisits);

  const isLoadingSst = false;
  const sstLoadError: string | null = null;

  const sstFilteredVisits = useMemo(() => {
    if (!sgiStartDate && !sgiEndDate) return sstVisits;

    const start = sgiStartDate ? new Date(`${sgiStartDate}T00:00:00`) : null;
    const end = sgiEndDate ? new Date(`${sgiEndDate}T23:59:59`) : null;

    return sstVisits.filter((visit) => {
      if (!visit.date) return false;
      if (start && visit.date < start) return false;
      if (end && visit.date > end) return false;
      return true;
    });
  }, [sstVisits, sgiStartDate, sgiEndDate]);

  const initialUnsafeBehaviorRecords = useMemo(() => {
    return (Array.isArray(comportamientosInsegurosRaw) ? comportamientosInsegurosRaw : [])
      .filter((row) => !!row && typeof row === 'object' && !Array.isArray(row))
      .map((row, index) => {
        const record = row as Record<string, unknown>;
        const rawDate = String(record['Fecha Infracción'] ?? '').trim();
        const rawNotificationDate = String(record['Fecha de Notificación'] ?? '').trim();
        const date = parseSpanishDate(rawDate);
        const notificationDate = parseSpanishDate(rawNotificationDate);
        const yearRaw = Number(record['Año'] ?? '');
        const year = Number.isFinite(yearRaw) && yearRaw > 0
          ? yearRaw
          : date
            ? date.getFullYear()
            : null;
        const monthRaw = Number(record['Mes'] ?? '');
        const month = Number.isFinite(monthRaw) && monthRaw > 0 ? monthRaw : (date ? date.getMonth() + 1 : null);
        const amount = Number(record['Valor Infracción'] ?? 0) || 0;
        const controlStatus = normalizeUnsafeControlStatus(record['Control Infracciones']);
        const paymentReceipt = normalizeUnsafeSiNo(record['ENTREGA COMPROBANTE DE PAGO']);
        const isClosed = inferUnsafeClosedStatus(controlStatus, paymentReceipt);
        const description = toReadableInfractionDescription(record['Descripción Infracciones']);

        return {
          id: `unsafe-${index + 1}`,
          cedula: String(record['Cedula'] ?? '').trim(),
          driverName: normalizePersonName(String(record['Nombre completo'] ?? '')),
          client: String(record['CLIENTE'] ?? '').trim(),
          contractType: String(record['Tipo de Contrato'] ?? '').trim(),
          city: String(record['Ciudad'] ?? '').trim(),
          date,
          dateLabel: date ? formatShortDate(date) : rawDate,
          location: String(record['Lugar de la Infraccion'] ?? '').trim(),
          code: String(record['Código infracción'] ?? '').trim(),
          plate: String(record['Placa'] ?? '').trim(),
          description,
          amount,
          month,
          year,
          actionType: normalizeUnsafeActionType(record['Tipo de Acción']),
          notificationDate,
          trainingClass: String(record['Clase de Capacitación'] ?? '').trim(),
          controlStatus,
          employeeStatus: String(record['ESTADO DEL EMPLEADO EN LA EMPRESA'] ?? '').trim(),
          signedReturn: normalizeUnsafeSiNo(record['DEVOLUCION NOTIFICACION FIRMADA']),
          trainingEvaluation: normalizeUnsafeSiNo(record['CAPACITACION Y EVALUACION']),
          inLabor: normalizeUnsafeSiNo(record['INFRACCIÓN SE DA EN DESARROLLO DE LA LABOR']),
          paymentReceipt,
          observations: String(record['Observaciones'] ?? '').trim(),
          riskLevel: inferUnsafeRiskLevel(amount, description),
          isClosed
        } as UnsafeBehaviorRecord;
      })
      .filter((row) => row.driverName && row.dateLabel);
  }, []);

  const [unsafeBehaviorRecords, setUnsafeBehaviorRecords] = useState<UnsafeBehaviorRecord[]>(
    () => initialUnsafeBehaviorRecords
  );

  const incapDxMap = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(incapDxRaw) ? incapDxRaw : []).forEach((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) return;
      const record = row as Record<string, unknown>;
      const code = String(record['Dx'] ?? '').trim().toUpperCase();
      const description = String(record['Diagnóstico'] ?? '').trim();
      if (code && description) map.set(code, description);
    });
    return map;
  }, []);

  const initialIncapRecords = useMemo(() => {
    return (Array.isArray(incapBdRaw) ? incapBdRaw : [])
      .filter((row) => !!row && typeof row === 'object' && !Array.isArray(row))
      .map((row, index) => {
        const record = row as Record<string, unknown>;
        const incapDate = parseUnknownDate(record['Fecha de incapacidad']);
        const startDate = parseUnknownDate(record['Fecha Inicio']);
        const endDate = parseUnknownDate(record['Fecha Fin']);
        const entryDate = parseUnknownDate(record['fecha de ingreso a la empresa']);
        const dxCode = String(record['DX CIE10'] ?? '').trim().toUpperCase();
        const dxDescriptionRaw = String(record['Descripción DX'] ?? '').trim();
        const dxDescription = dxDescriptionRaw || incapDxMap.get(dxCode) || '';
        const month = toNumberOrZero(record['Mes']) || (incapDate ? incapDate.getMonth() + 1 : 0);
        const year = toNumberOrZero(record['Año']) || (incapDate ? incapDate.getFullYear() : 0);

        return {
          id: `incap-${index + 1}`,
          incapDate,
          incapDateLabel: formatShortDate(incapDate),
          month,
          year,
          cedula: String(record['Cedula'] ?? '').trim(),
          employeeName: normalizePersonName(String(record['Nombre del Empleado'] ?? '')),
          gender: String(record['Genero'] ?? '').trim(),
          healthEntity: normalizeIncapHealthEntity(record['Entidad salud que cubre la atención']),
          payerEntity: String(record['ENTIDAD QUE PAGA LA INCAPACIDAD'] ?? '').trim(),
          contractType: normalizeContractType(record['Tipo de Contrato']),
          role: String(record['Cargo'] ?? '').trim(),
          entryDate,
          client: normalizeIncapClient(record['Contrato / Cliente']),
          city: String(record['Ciudad de Agencia'] ?? '').trim(),
          incapType: String(record['Incapacidad'] ?? '').trim(),
          incapDays: toNumberOrZero(record['Nro. Dias Incapacidad']),
          startDate,
          endDate,
          dxCode,
          dxDescription,
          incapClass: String(record['Tipo incapacidad'] ?? '').trim(),
          effectivePeriod: formatIncapPeriodValue(record['Periodo Efectivo']),
          initialPeriod: formatIncapPeriodValue(record['Periodo inicial']),
          initialDays: toNumberOrZero(record['dias']),
          followingPeriod: formatIncapPeriodValue(record['Periodo siguiente']),
          finalPeriod: formatIncapPeriodValue(record['Periodo final']),
          finalDays: toNumberOrZero(record['dias_1'] ?? ''),
          returnRequirement: String(record['REQUISITO PARA RETOOMA DE LABORES'] ?? '').trim()
        } as IncapRecord;
      })
      .filter((row) => row.employeeName && row.month > 0 && row.year > 0);
  }, [incapDxMap]);

  const [incapRecords, setIncapRecords] = useState<IncapRecord[]>(() => initialIncapRecords);

  const initialFormacionRecords = useMemo(() => {
    return (Array.isArray(formacionBdRaw) ? formacionBdRaw : [])
      .filter((row) => !!row && typeof row === 'object' && !Array.isArray(row))
      .map((row, index) => {
        const record = row as Record<string, unknown>;
        const rawDate = String(record['FECHA'] ?? '').trim();
        const date = parseSpanishDate(rawDate);
        const month = toNumberOrZero(record['MES']) || (date ? date.getMonth() + 1 : 0);
        const year = toNumberOrZero(record['AÑO']) || (date ? date.getFullYear() : 0);

        return {
          id: `formacion-${index + 1}`,
          cedula: String(record['CÉDULA PARTICIPANTES'] ?? '').trim(),
          score: toNumberOrZero(record['PUNTAJE DE EVALUACIÓN']),
          client: normalizeFormacionClient(String(record['CLIENTE'] ?? '').trim()),
          topic: String(record['TEMA Y/O CONTENIDO'] ?? '').trim(),
          date,
          dateLabel: date ? formatShortDate(date) : rawDate,
          month,
          year,
          trainingTime: String(record['HORA EN QUE SE REALIZA LA FORMACIÓN'] ?? '').trim(),
          modality: normalizeFormacionModality(String(record['MODALIDA DE LA FORMACIÓN'] ?? '').trim()),
          trainingHours: toNumberOrZero(record['TIEMPO TOTAL DE FORMACIÓN POR PERSONA'])
        } as FormacionRecord;
      })
      .filter((row) => row.cedula && row.month > 0 && row.year > 0);
  }, []);

  const [formacionRecords, setFormacionRecords] = useState<FormacionRecord[]>(() => initialFormacionRecords);

  const initialAccidentalidadRecords = useMemo((): AccidentalidadRecord[] => {
    return (Array.isArray(accidentalidadBdRaw) ? accidentalidadBdRaw : []).map((row) => {
      const record = row as AccidentalidadRecord;
      return {
        ...record,
        eventDate: record.eventDate ?? '',
        month: record.month ?? 0,
        year: record.year ?? 2026
      };
    });
  }, []);

  const [accidentalidadRecords, setAccidentalidadRecords] = useState<AccidentalidadRecord[]>(
    () => initialAccidentalidadRecords
  );

  const initialMedicinaTrabajoRecords = useMemo((): MedicinaTrabajoRecord[] => {
    return (Array.isArray(medicinaTrabajoBdRaw) ? medicinaTrabajoBdRaw : []).map((row) => {
      const record = row as MedicinaTrabajoRecord;
      return {
        ...record,
        examMonth: record.examMonth ?? 0,
        examYear: record.examYear ?? 0,
        expiryMonth: record.expiryMonth ?? 0,
        expiryYear: record.expiryYear ?? 0,
        cost: Number(record.cost) || 0,
        periodicYears: Number(record.periodicYears) || 1
      };
    });
  }, []);

  const [medicinaTrabajoRecords, setMedicinaTrabajoRecords] = useState<MedicinaTrabajoRecord[]>(
    () => initialMedicinaTrabajoRecords
  );

  const buildSgiDatasetBaselines = (): SgiPersistedDatasets => ({
    acompanamiento: initialSstVisits,
    comportamientos: initialUnsafeBehaviorRecords,
    incapacidades: initialIncapRecords,
    formacion: initialFormacionRecords,
    accidentalidad: initialAccidentalidadRecords,
    medicinaTrabajo: initialMedicinaTrabajoRecords,
    incapInformeEdits: {},
    formacionInformeEdits: {}
  });

  const applySgiDatasetsFromSupabase = (datasets: SgiPersistedDatasets) => {
    setSstVisits(datasets.acompanamiento as SstVisitRecord[]);
    setUnsafeBehaviorRecords(datasets.comportamientos as UnsafeBehaviorRecord[]);
    setIncapRecords(datasets.incapacidades as IncapRecord[]);
    setFormacionRecords(datasets.formacion as FormacionRecord[]);
    setAccidentalidadRecords(datasets.accidentalidad as AccidentalidadRecord[]);
    setMedicinaTrabajoRecords(datasets.medicinaTrabajo as MedicinaTrabajoRecord[]);
    setIncapDemoInformeEdits(
      datasets.incapInformeEdits as Record<number, Partial<IncapInformeMonthlyInputs & IncapInformeManualBdEdits>>
    );
    setFormacionDemoInformeEdits(
      datasets.formacionInformeEdits as Record<number, Partial<FormacionInformeMonthlyInputs>>
    );
  };

  const establishSgiAuthenticatedSession = async (
    appUser: SgiAppUser
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    supabaseSyncReadyRef.current = false;
    const datasets = await loadSgiDatasetsFromSupabase(buildSgiDatasetBaselines(), appUser.email);
    applySgiDatasetsFromSupabase(datasets);
    setRegisteredUserEmail(appUser.email);
    setSgiAppUserRole(appUser.role);
    setIsDbTestConnected(true);
    setShowDbDetailPanel(canEditSgiDatasets(appUser.role, appUser.email));
    supabaseSyncReadyRef.current = true;
    return { ok: true };
  };

  const connectSgiSupabaseSession = async (
    email: string,
    password: string
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured()) {
      if (!isEmpresturEmail(normalizedEmail)) {
        return { ok: false, error: 'error en registro de correo electronico' };
      }
      setRegisteredUserEmail(normalizedEmail);
      setSgiAppUserRole('viewer');
      setIsDbTestConnected(true);
      setShowDbDetailPanel(false);
      supabaseSyncReadyRef.current = false;
      return { ok: true };
    }

    const signInResult = await signInSgiUser(normalizedEmail, password);
    if (!signInResult.ok) {
      return { ok: false, error: 'error' in signInResult ? signInResult.error : 'No se pudo iniciar sesión.' };
    }

    try {
      return await establishSgiAuthenticatedSession(signInResult.user);
    } catch (error) {
      await signOutSgiUser();
      const message = error instanceof Error ? error.message : 'No se pudieron cargar los datos SGI.';
      return { ok: false, error: message };
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthBootstrapping(false);
      return;
    }

    const restoreAuthSession = async () => {
      try {
        const appUser = await getCurrentSgiAppUser();
        if (!appUser) {
          localStorage.removeItem(SGI_SESSION_EMAIL_KEY);
          return;
        }
        await establishSgiAuthenticatedSession(appUser);
      } catch (error) {
        console.error('Error restaurando sesión SGI:', error);
        localStorage.removeItem(SGI_SESSION_EMAIL_KEY);
        await signOutSgiUser();
      } finally {
        setAuthBootstrapping(false);
      }
    };

    void restoreAuthSession();
    // Restaurar sesión guardada al iniciar la aplicación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !isSupabaseConfigured() ||
      !isDbTestConnected ||
      !registeredUserEmail ||
      !supabaseSyncReadyRef.current ||
      !sgiAppUserRole ||
      !canEditSgiDatasets(sgiAppUserRole, registeredUserEmail)
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void persistSgiDatasetsToSupabase(
        {
          acompanamiento: sstVisits,
          comportamientos: unsafeBehaviorRecords,
          incapacidades: incapRecords,
          formacion: formacionRecords,
          accidentalidad: accidentalidadRecords,
          medicinaTrabajo: medicinaTrabajoRecords,
          incapInformeEdits: incapDemoInformeEdits,
          formacionInformeEdits: formacionDemoInformeEdits
        },
        registeredUserEmail
      ).catch((error) => console.error('Error guardando datos SGI en Supabase:', error));
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [
    sstVisits,
    unsafeBehaviorRecords,
    incapRecords,
    formacionRecords,
    accidentalidadRecords,
    medicinaTrabajoRecords,
    incapDemoInformeEdits,
    formacionDemoInformeEdits,
    isDbTestConnected,
    registeredUserEmail,
    sgiAppUserRole
  ]);

  const sgiCanEditDatasets = useMemo(() => {
    if (!isDbTestConnected) return false;
    if (!isSupabaseConfigured()) return true;
    return sgiAppUserRole
      ? canEditSgiDatasets(sgiAppUserRole, registeredUserEmail ?? undefined)
      : false;
  }, [isDbTestConnected, sgiAppUserRole, registeredUserEmail]);

  const sgiIsAdmin = useMemo(
    () =>
      Boolean(
        sgiAppUserRole &&
          registeredUserEmail &&
          isSgiAdmin(sgiAppUserRole, registeredUserEmail)
      ),
    [sgiAppUserRole, registeredUserEmail]
  );

  const sgiCanManageUsers = useMemo(
    () => sgiIsAdmin && isSupabaseConfigured(),
    [sgiIsAdmin]
  );

  const navigateSgiRoute = (route: SgiAppRoute) => {
    const hash = sgiRouteToHash(route);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
    setSgiRoute(route);
  };

  useEffect(() => {
    const syncRouteFromHash = () => {
      setSgiRoute(parseSgiRoute(window.location.hash));
    };

    syncRouteFromHash();
    window.addEventListener('hashchange', syncRouteFromHash);
    return () => window.removeEventListener('hashchange', syncRouteFromHash);
  }, []);

  useEffect(() => {
    if (sgiRoute === 'admin-users' && isDbTestConnected && !sgiCanManageUsers) {
      navigateSgiRoute('dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sgiRoute, isDbTestConnected, sgiCanManageUsers]);

  const unsafeFilteredRecords = useMemo(() => {
    const selectedYear = Number(unsafeYearFilter);
    if (!sgiStartDate && !sgiEndDate && !unsafeYearFilter) return unsafeBehaviorRecords;
    const start = sgiStartDate ? new Date(`${sgiStartDate}T00:00:00`) : null;
    const end = sgiEndDate ? new Date(`${sgiEndDate}T23:59:59`) : null;

    return unsafeBehaviorRecords.filter((row) => {
      if (unsafeYearFilter && row.year !== selectedYear) return false;
      if (!row.date) return !start && !end;
      if (start && row.date < start) return false;
      if (end && row.date > end) return false;
      return true;
    });
  }, [unsafeBehaviorRecords, sgiStartDate, sgiEndDate, unsafeYearFilter]);

  const unsafeYearOptions = useMemo(() => {
    return Array.from(
      new Set(
        unsafeBehaviorRecords
          .map((row) => row.year)
          .filter((value): value is number => value !== null)
      )
    ).sort((a, b) => Number(b) - Number(a));
  }, [unsafeBehaviorRecords]);

  const incapYearOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...incapRecords.map((row) => row.year).filter((year): year is number => year > 0),
        ...INCAP_INFORME_YEARS
      ])
    ).sort((a, b) => Number(b) - Number(a));
  }, [incapRecords]);

  const incapInformeYear = useMemo(() => resolveIncapInformeYear(incapYearFilter), [incapYearFilter]);

  const incapFilteredRecords = useMemo(() => {
    const start = sgiStartDate ? new Date(`${sgiStartDate}T00:00:00`) : null;
    const end = sgiEndDate ? new Date(`${sgiEndDate}T23:59:59`) : null;
    const selectedYear = Number(incapYearFilter);

    return incapRecords.filter((row) => {
      if (incapYearFilter && row.year !== selectedYear) return false;
      if (!row.incapDate) return !start && !end;
      if (start && row.incapDate < start) return false;
      if (end && row.incapDate > end) return false;
      return true;
    });
  }, [incapRecords, incapYearFilter, sgiStartDate, sgiEndDate]);

  const incapDemoInformeInputs = useMemo((): IncapInformeMonthlyInputs | null => {
    if (!incapInformeYear) return null;
    const base = parseInformeInputsFromRows(getIncapInformeRows(incapInformeYear));
    const edits = incapDemoInformeEdits[incapInformeYear];
    if (!edits) return base;
    return {
      employees: edits.employees ?? base.employees,
      hhtt: edits.hhtt ?? base.hhtt,
      businessDays: edits.businessDays ?? base.businessDays
    };
  }, [incapInformeYear, incapDemoInformeEdits]);

  const incapDemoInformeComputed = useMemo(() => {
    if (!isDbTestConnected || !incapInformeYear || !incapDemoInformeInputs) return null;
    const bdMetrics = extractBdInformeMetrics(incapRecords, incapInformeYear);
    const edits = incapDemoInformeEdits[incapInformeYear];
    return computeIncapInforme(incapInformeYear, incapDemoInformeInputs, bdMetrics, {
      elApproved: edits?.elApproved,
      elExisting: edits?.elExisting
    });
  }, [isDbTestConnected, incapInformeYear, incapDemoInformeInputs, incapRecords, incapDemoInformeEdits]);

  const incapIndicatorsFromInforme = useMemo(() => {
    const rows = incapInformeYear ? getIncapInformeRows(incapInformeYear) : [];
    const fromInforme = parseIncapIndicatorsFromInformeRows(rows, incapInformeYear);
    const latestInformeYear = INCAP_INFORME_YEARS[0] ?? 2026;
    const useLiveComputedIndicators =
      Boolean(incapDemoInformeComputed) && incapInformeYear === latestInformeYear;

    if (!useLiveComputedIndicators || !incapDemoInformeComputed) {
      return fromInforme;
    }

    const indicators = incapDemoInformeComputed.indicators;
    return {
      ...fromInforme,
      hasInforme: true,
      employees: indicators.employees,
      hhtt: indicators.hhtt,
      scheduledDays: indicators.scheduledDays,
      egDays: indicators.egDays,
      egPeople: indicators.egPeople,
      atDays: indicators.atDays,
      atPeople: indicators.atPeople,
      elLaborDays: indicators.elIncapacityDays,
      elPrevalence: indicators.elPrevalence,
      elSeverity: indicators.elSeverity,
      elIncidence: indicators.elIncidence,
      elIncapacityDays: indicators.elIncapacityDays,
      globalRate: indicators.globalRate,
      egAcGlobalRate: indicators.egAcGlobalRate,
      frequency: indicators.frequency,
      severity: indicators.severity,
      generalIndex: indicators.generalIndex,
      medicalCause: indicators.medicalCause,
      egAcMortalityRate: indicators.egAcMortalityRate
    };
  }, [incapInformeYear, incapDemoInformeComputed]);

  const incapMonthlyStats = useMemo(() => {
    const monthly = new Map<number, { month: number; label: string; totalDays: number; people: Set<string>; atDays: number; egDays: number }>();
    incapFilteredRecords.forEach((row) => {
      const key = row.month;
      if (!key) return;
      const base = monthly.get(key) ?? {
        month: key,
        label: new Date(2026, Math.max(0, key - 1), 1).toLocaleDateString('es-CO', { month: 'short' }),
        totalDays: 0,
        people: new Set<string>(),
        atDays: 0,
        egDays: 0
      };
      base.totalDays += row.incapDays;
      base.people.add(row.cedula || row.employeeName);
      if (normalizeText(row.incapType).includes('accidente')) base.atDays += row.incapDays;
      else base.egDays += row.incapDays;
      monthly.set(key, base);
    });

    return Array.from(monthly.values())
      .sort((a, b) => a.month - b.month)
      .map((row) => ({
        ...row,
        peopleCount: row.people.size
      }));
  }, [incapFilteredRecords]);

  const incapClientStats = useMemo(() => {
    const grouped = new Map<string, { cases: number; days: number }>();
    incapFilteredRecords.forEach((row) => {
      const key = normalizeIncapClient(row.client) || 'Sin cliente';
      const current = grouped.get(key) ?? { cases: 0, days: 0 };
      current.cases += 1;
      current.days += row.incapDays;
      grouped.set(key, current);
    });
    return Array.from(grouped.entries())
      .map(([client, values]) => ({ client, ...values }))
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 8);
  }, [incapFilteredRecords]);

  const incapCityStats = useMemo(() => {
    const grouped = new Map<string, { cases: number; days: number }>();
    incapFilteredRecords.forEach((row) => {
      const key = row.city || 'Sin ciudad';
      const current = grouped.get(key) ?? { cases: 0, days: 0 };
      current.cases += 1;
      current.days += row.incapDays;
      grouped.set(key, current);
    });
    return Array.from(grouped.entries())
      .map(([city, values]) => ({ city, ...values }))
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 8);
  }, [incapFilteredRecords]);

  const incapContractStats = useMemo(() => {
    const grouped = new Map<string, number>();
    incapFilteredRecords.forEach((row) => {
      const key = normalizeContractType(row.contractType) || 'Sin contrato';
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });
    return Array.from(grouped.entries())
      .map(([contractType, cases]) => ({ contractType, cases }))
      .sort((a, b) => b.cases - a.cases);
  }, [incapFilteredRecords]);

  const incapGenderStats = useMemo(() => {
    const grouped = new Map<string, { cases: number; days: number; people: Set<string> }>();
    incapFilteredRecords.forEach((row) => {
      const key = row.gender || 'Sin dato';
      const current = grouped.get(key) ?? { cases: 0, days: 0, people: new Set<string>() };
      current.cases += 1;
      current.days += row.incapDays;
      current.people.add(row.cedula || row.employeeName);
      grouped.set(key, current);
    });
    return Array.from(grouped.entries())
      .map(([gender, values]) => ({ gender, cases: values.cases, days: values.days, people: values.people.size }))
      .sort((a, b) => b.cases - a.cases);
  }, [incapFilteredRecords]);

  const incapPayerStats = useMemo(() => {
    const grouped = new Map<string, { cases: number; days: number }>();
    incapFilteredRecords.forEach((row) => {
      const key = row.payerEntity || 'Sin entidad';
      const current = grouped.get(key) ?? { cases: 0, days: 0 };
      current.cases += 1;
      current.days += row.incapDays;
      grouped.set(key, current);
    });
    return Array.from(grouped.entries())
      .map(([payerEntity, values]) => ({ payerEntity, ...values }))
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 8);
  }, [incapFilteredRecords]);

  const incapTypeStats = useMemo(() => {
    const grouped = new Map<string, { cases: number; days: number }>();
    incapFilteredRecords.forEach((row) => {
      const key = row.incapType || 'Sin tipo';
      const current = grouped.get(key) ?? { cases: 0, days: 0 };
      current.cases += 1;
      current.days += row.incapDays;
      grouped.set(key, current);
    });
    return Array.from(grouped.entries())
      .map(([incapType, values]) => ({ incapType, ...values }))
      .sort((a, b) => b.cases - a.cases);
  }, [incapFilteredRecords]);

  const incapDxStats = useMemo(() => {
    const grouped = new Map<string, { code: string; description: string; cases: number; days: number; people: Set<string> }>();
    incapFilteredRecords.forEach((row) => {
      const code = row.dxCode || 'SIN DX';
      const current = grouped.get(code) ?? {
        code,
        description: row.dxDescription || incapDxMap.get(code) || 'Sin diagnóstico',
        cases: 0,
        days: 0,
        people: new Set<string>()
      };
      current.cases += 1;
      current.days += row.incapDays;
      current.people.add(row.cedula || row.employeeName);
      grouped.set(code, current);
    });
    return Array.from(grouped.values())
      .map((row) => ({ ...row, peopleCount: row.people.size }))
      .sort((a, b) => b.cases - a.cases);
  }, [incapFilteredRecords, incapDxMap]);

  const incapDxTop10 = useMemo(() => incapDxStats.slice(0, 10), [incapDxStats]);

  const incapDxMonthlyTop5 = useMemo(() => {
    const topCodes = new Set(incapDxTop10.slice(0, 5).map((row) => row.code));
    const monthLabels = Array.from(
      new Set(incapFilteredRecords.map((row) => row.month).filter((month): month is number => month > 0))
    ).sort((a, b) => Number(a) - Number(b));
    const rows = Array.from(topCodes).map((code) => {
      const detail = incapDxStats.find((row) => row.code === code);
      const perMonth = monthLabels.map((month) => {
        const people = new Set<string>();
        incapFilteredRecords.forEach((row) => {
          if (row.dxCode === code && row.month === month) {
            people.add(row.cedula || row.employeeName);
          }
        });
        return people.size;
      });
      return {
        code,
        description: detail?.description ?? 'Sin diagnóstico',
        perMonth
      };
    });
    return { monthLabels, rows };
  }, [incapDxStats, incapDxTop10, incapFilteredRecords]);

  const incapDbFilterOptions = useMemo(() => {
    const uniqueSorted = (values: string[]) =>
      Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
      );
    return {
      cedula: uniqueSorted(incapRecords.map((row) => String(row.cedula))),
      employeeName: uniqueSorted(incapRecords.map((row) => row.employeeName)),
      client: uniqueSorted(incapRecords.map((row) => row.client)),
      city: uniqueSorted(incapRecords.map((row) => row.city)),
      dxCode: uniqueSorted(incapRecords.map((row) => row.dxCode)),
      dxDescription: uniqueSorted(incapRecords.map((row) => row.dxDescription)),
      incapDays: uniqueSorted(incapRecords.map((row) => String(row.incapDays))),
      contractType: uniqueSorted(incapRecords.map((row) => row.contractType)),
      incapType: uniqueSorted([...INCAP_TYPE_OPTIONS, ...incapRecords.map((row) => row.incapType)]),
      gender: uniqueSorted(incapRecords.map((row) => row.gender)),
      healthEntity: uniqueSorted(incapRecords.map((row) => row.healthEntity)),
      payerEntity: uniqueSorted(incapRecords.map((row) => row.payerEntity)),
      role: uniqueSorted(incapRecords.map((row) => row.role)),
      incapClass: uniqueSorted([...INCAP_CLASS_OPTIONS, ...incapRecords.map((row) => row.incapClass)]),
      effectivePeriod: uniqueSorted(incapRecords.map((row) => row.effectivePeriod)),
      initialPeriod: uniqueSorted(incapRecords.map((row) => row.initialPeriod)),
      followingPeriod: uniqueSorted(incapRecords.map((row) => row.followingPeriod)),
      finalPeriod: uniqueSorted(incapRecords.map((row) => row.finalPeriod)),
      returnRequirement: uniqueSorted(incapRecords.map((row) => row.returnRequirement))
    };
  }, [incapRecords]);

  const incapCurrentMetrics = useMemo(() => {
    const totalCases = incapFilteredRecords.length;
    const totalDays = incapFilteredRecords.reduce((sum, row) => sum + row.incapDays, 0);
    const people = new Set(incapFilteredRecords.map((row) => row.cedula || row.employeeName).filter(Boolean));
    const egPeople = new Set<string>();
    const atPeople = new Set<string>();
    let atDays = 0;
    let egDays = 0;
    let generalDays = 0;

    incapFilteredRecords.forEach((row) => {
      const personKey = row.cedula || row.employeeName;
      const typeText = normalizeText(row.incapType);
      const isAccident = typeText.includes('accidente');
      const isGeneral = typeText.includes('enfermedad general');

      if (isAccident) {
        atDays += row.incapDays;
        if (personKey) atPeople.add(personKey);
      } else {
        egDays += row.incapDays;
        if (personKey) egPeople.add(personKey);
      }
      if (isGeneral) generalDays += row.incapDays;
    });

    return {
      totalCases,
      totalDays,
      people: people.size,
      egPeople: egPeople.size,
      atPeople: atPeople.size,
      atDays,
      egDays,
      generalDays,
      egAcDays: egDays
    };
  }, [incapFilteredRecords]);

  const formacionYearOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...formacionRecords.map((row) => row.year).filter((year): year is number => year > 0),
        ...FORMACION_INFORME_YEARS
      ])
    ).sort((a, b) => Number(b) - Number(a));
  }, [formacionRecords]);

  const formacionInformeYear = useMemo(
    () => resolveFormacionInformeYear(formacionYearFilter),
    [formacionYearFilter]
  );

  const formacionIncapLinkYear = useMemo(() => {
    if (formacionInformeYear) return formacionInformeYear;
    const selectedYear = Number(formacionYearFilter);
    if (Number.isFinite(selectedYear) && selectedYear > 0 && INCAP_INFORME_YEARS.includes(selectedYear)) {
      return selectedYear;
    }
    return INCAP_INFORME_YEARS[0] ?? 2026;
  }, [formacionInformeYear, formacionYearFilter]);

  const formacionActiveStaffFromIncap = useMemo((): number[] => {
    const incapRows = getIncapInformeRows(formacionIncapLinkYear);
    if (!incapRows.length) return Array.from({ length: 12 }, () => 0);
    return resolveIncapEmployeesMonthly(incapRows, incapDemoInformeEdits[formacionIncapLinkYear]);
  }, [formacionIncapLinkYear, incapDemoInformeEdits]);

  const formacionActiveStaffTotal = useMemo(
    () => formacionActiveStaffFromIncap.reduce((sum, value) => sum + value, 0),
    [formacionActiveStaffFromIncap]
  );

  const formacionHasIncapEmployeesSource = useMemo(() => {
    return getIncapInformeRows(formacionIncapLinkYear).length > 0;
  }, [formacionIncapLinkYear]);

  const formacionFilteredRecords = useMemo(() => {
    const start = sgiStartDate ? new Date(`${sgiStartDate}T00:00:00`) : null;
    const end = sgiEndDate ? new Date(`${sgiEndDate}T23:59:59`) : null;
    const selectedYear = Number(formacionYearFilter);

    return formacionRecords.filter((row) => {
      if (formacionYearFilter && row.year !== selectedYear) return false;
      if (!row.date) return !start && !end;
      if (start && row.date < start) return false;
      if (end && row.date > end) return false;
      return true;
    });
  }, [formacionRecords, formacionYearFilter, sgiStartDate, sgiEndDate]);

  const formacionDemoInformeInputs = useMemo((): FormacionInformeMonthlyInputs | null => {
    if (!formacionInformeYear) return null;
    const base = parseFormacionInformeInputsFromRows(getFormacionInformeRows(formacionInformeYear));
    const edits = formacionDemoInformeEdits[formacionInformeYear];
    return {
      programmedActivities: edits?.programmedActivities ?? base.programmedActivities,
      activeStaff: formacionActiveStaffFromIncap
    };
  }, [formacionInformeYear, formacionDemoInformeEdits, formacionActiveStaffFromIncap]);

  const formacionDemoInformeComputed = useMemo(() => {
    if (!isDbTestConnected || !formacionInformeYear || !formacionDemoInformeInputs) return null;
    const bdMetrics = extractFormacionBdMetrics(formacionRecords, formacionInformeYear);
    const edits = formacionDemoInformeEdits[formacionInformeYear] as FormacionInformeManualEdits | undefined;
    return computeFormacionInforme(formacionInformeYear, formacionDemoInformeInputs, bdMetrics, edits ?? {});
  }, [
    isDbTestConnected,
    formacionInformeYear,
    formacionDemoInformeInputs,
    formacionRecords,
    formacionDemoInformeEdits
  ]);

  const formacionIndicatorsFromInforme = useMemo(() => {
    const buildCoverageRate = (participatingPeople: number) =>
      formacionActiveStaffTotal ? (participatingPeople / formacionActiveStaffTotal) * 100 : 0;

    if (formacionDemoInformeComputed) {
      const indicators = formacionDemoInformeComputed.indicators;
      return {
        sourceYear: formacionInformeYear ?? formacionIncapLinkYear,
        hasInforme: true,
        ...indicators,
        activeStaff: formacionActiveStaffTotal,
        coverageRate: buildCoverageRate(indicators.participatingPeople)
      };
    }

    const rows = formacionInformeYear ? getFormacionInformeRows(formacionInformeYear) : [];
    const pickTotal = (columnIndex: number): number => {
      let total = 0;
      for (let index = 1; index <= 12; index += 1) {
        const row = rows[index] as unknown[] | undefined;
        if (!Array.isArray(row)) continue;
        total += toNumberOrZero(row[columnIndex]);
      }
      return total;
    };

    const programmedActivities = pickTotal(1);
    const executedActivities = formacionFilteredRecords.reduce((topics, row) => {
      const topicKey = getFormacionTopicKey(row.topic);
      if (topicKey) topics.add(topicKey);
      return topics;
    }, new Set<string>()).size;
    const participatingPeople = countFormacionParticipatingPeople(formacionFilteredRecords);
    const hhf = formacionFilteredRecords.reduce((sum, row) => sum + row.trainingHours, 0);
    const approvedEvaluations = formacionFilteredRecords.filter((row) => row.score >= 75).length;

    return {
      sourceYear: formacionInformeYear ?? formacionIncapLinkYear,
      hasInforme: Boolean((formacionInformeYear && rows.length > 0) || formacionHasIncapEmployeesSource),
      programmedActivities,
      executedActivities,
      activeStaff: formacionActiveStaffTotal,
      participatingPeople,
      hhf,
      approvedEvaluations,
      complianceRate: programmedActivities ? (executedActivities / programmedActivities) * 100 : 0,
      efficacyRate: formacionFilteredRecords.length
        ? (approvedEvaluations / formacionFilteredRecords.length) * 100
        : 0,
      coverageRate: buildCoverageRate(participatingPeople)
    };
  }, [
    formacionInformeYear,
    formacionIncapLinkYear,
    formacionDemoInformeComputed,
    formacionFilteredRecords,
    formacionActiveStaffTotal,
    formacionHasIncapEmployeesSource
  ]);

  const formacionProgrammedActivitiesMonthly = useMemo((): number[] => {
    if (formacionDemoInformeInputs) {
      return formacionDemoInformeInputs.programmedActivities;
    }
    const rows = formacionInformeYear ? getFormacionInformeRows(formacionInformeYear) : [];
    return FORMACION_INFORME_MONTH_LABELS.map((_, index) => {
      const row = rows[index + 1] as unknown[] | undefined;
      return Array.isArray(row) ? toNumberOrZero(row[1]) : 0;
    });
  }, [formacionDemoInformeInputs, formacionInformeYear]);

  const formacionSelectedMonthIndex = useMemo(
    () => resolveSingleMonthIndexFromDateRange(sgiStartDate, sgiEndDate),
    [sgiStartDate, sgiEndDate]
  );

  const formacionKpiProgrammedActivities = useMemo(() => {
    if (formacionSelectedMonthIndex === null) {
      return formacionIndicatorsFromInforme.programmedActivities;
    }
    return formacionProgrammedActivitiesMonthly[formacionSelectedMonthIndex] ?? 0;
  }, [
    formacionSelectedMonthIndex,
    formacionIndicatorsFromInforme.programmedActivities,
    formacionProgrammedActivitiesMonthly
  ]);

  const formacionKpiActiveStaff = useMemo(() => {
    if (formacionSelectedMonthIndex === null) {
      return formacionIndicatorsFromInforme.activeStaff;
    }
    return formacionActiveStaffFromIncap[formacionSelectedMonthIndex] ?? 0;
  }, [
    formacionSelectedMonthIndex,
    formacionIndicatorsFromInforme.activeStaff,
    formacionActiveStaffFromIncap
  ]);

  const formacionMonthlyStats = useMemo(() => {
    const monthly = Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      label: FORMACION_INFORME_MONTH_LABELS[index],
      sessions: new Set<string>(),
      topicPeople: new Map<string, Set<string>>(),
      approved: 0,
      evaluated: 0,
      hhf: 0
    }));

    formacionFilteredRecords.forEach((row) => {
      if (row.month < 1 || row.month > 12) return;
      const bucket = monthly[row.month - 1];
      const topicKey = getFormacionTopicKey(row.topic);
      if (topicKey) bucket.sessions.add(topicKey);
      if (row.cedula) {
        if (topicKey) {
          const people = bucket.topicPeople.get(topicKey) ?? new Set<string>();
          people.add(row.cedula);
          bucket.topicPeople.set(topicKey, people);
        }
        bucket.evaluated += 1;
        if (row.score >= 75) bucket.approved += 1;
      }
      bucket.hhf += row.trainingHours;
    });

    return monthly.map((row) => {
      const activeStaff = formacionActiveStaffFromIncap[row.month - 1] ?? 0;
      const participantsCount = Array.from(row.topicPeople.values()).reduce(
        (sum, people) => sum + people.size,
        0
      );
      return {
        month: row.month,
        label: row.label,
        sessionsCount: row.sessions.size,
        participantsCount,
        approvedCount: row.approved,
        evaluatedCount: row.evaluated,
        hhf: row.hhf,
        approvalRate: row.evaluated ? (row.approved / row.evaluated) * 100 : 0,
        activeStaff,
        coverageRate: activeStaff ? (participantsCount / activeStaff) * 100 : 0
      };
    });
  }, [formacionFilteredRecords, formacionActiveStaffFromIncap]);

  const accidentalidadYearOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...accidentalidadRecords.map((row) => row.year).filter((year) => year > 0),
          ...ACCIDENTALIDAD_INFORME_YEARS
        ])
      ).sort((a, b) => Number(b) - Number(a)),
    [accidentalidadRecords]
  );

  const accidentalidadInformeYear = useMemo(
    () => resolveAccidentalidadInformeYear(accidentalidadYearFilter, ACCIDENTALIDAD_INFORME_YEARS),
    [accidentalidadYearFilter]
  );

  const accidentalidadSelectedMonthIndex = useMemo(
    () => resolveSingleMonthIndexFromDateRange(sgiStartDate, sgiEndDate),
    [sgiStartDate, sgiEndDate]
  );

  const accidentalidadFilteredRecords = useMemo(() => {
    const start = sgiStartDate ? new Date(`${sgiStartDate}T00:00:00`) : null;
    const end = sgiEndDate ? new Date(`${sgiEndDate}T23:59:59`) : null;
    const selectedYear = Number(accidentalidadYearFilter);

    return accidentalidadRecords.filter((row) => {
      if (accidentalidadYearFilter && row.year !== selectedYear) return false;
      if (!row.eventDate) return !start && !end;
      const eventDate = new Date(`${row.eventDate}T00:00:00`);
      if (Number.isNaN(eventDate.getTime())) return !start && !end;
      if (start && eventDate < start) return false;
      if (end && eventDate > end) return false;
      return true;
    });
  }, [accidentalidadRecords, accidentalidadYearFilter, sgiStartDate, sgiEndDate]);

  const accidentalidadIndicators = useMemo(() => {
    const year = accidentalidadInformeYear ?? ACCIDENTALIDAD_INFORME_YEARS[0] ?? 2026;
    const rows = getAccidentalidadInformeRows(accidentalidadInformeByYear, year);
    return buildAccidentalidadIndicators(
      rows,
      accidentalidadFilteredRecords,
      year,
      accidentalidadSelectedMonthIndex,
      accidentalidadRecords,
      {
        yearFilter: accidentalidadYearFilter,
        startDate: sgiStartDate,
        endDate: sgiEndDate
      }
    );
  }, [
    accidentalidadInformeYear,
    accidentalidadFilteredRecords,
    accidentalidadRecords,
    accidentalidadYearFilter,
    sgiStartDate,
    sgiEndDate,
    accidentalidadSelectedMonthIndex
  ]);

  const accidentalidadMonthlyTrend = useMemo(() => {
    const year = accidentalidadInformeYear ?? ACCIDENTALIDAD_INFORME_YEARS[0] ?? 2026;
    const rows = getAccidentalidadInformeRows(accidentalidadInformeByYear, year);
    return buildAccidentalidadMonthlyTrend(rows, accidentalidadRecords, year);
  }, [accidentalidadInformeYear, accidentalidadRecords]);

  const accidentalidadCharacteristicStats = useMemo(
    () => groupAccidentalidadRecords(accidentalidadFilteredRecords, (row) => row.characteristic || 'Sin característica'),
    [accidentalidadFilteredRecords]
  );

  const accidentalidadClientStats = useMemo(
    () => groupAccidentalidadRecords(accidentalidadFilteredRecords, (row) => row.client || 'Sin cliente'),
    [accidentalidadFilteredRecords]
  );

  const accidentalidadSeverityStats = useMemo(
    () => groupAccidentalidadRecords(accidentalidadFilteredRecords, (row) => row.severity || 'Sin clasificar'),
    [accidentalidadFilteredRecords]
  );

  const accidentalidadLinkTypeStats = useMemo(
    () => groupAccidentalidadRecords(accidentalidadFilteredRecords, (row) => row.linkType || 'Sin vinculación'),
    [accidentalidadFilteredRecords]
  );

  const accidentalidadContractTypeStats = useMemo(
    () => groupAccidentalidadRecords(accidentalidadFilteredRecords, (row) => row.contractType || 'Sin contratación'),
    [accidentalidadFilteredRecords]
  );

  const accidentalidadBasicCauseStats = useMemo(
    () => groupAccidentalidadCauseStats(accidentalidadFilteredRecords, 'basicCause'),
    [accidentalidadFilteredRecords]
  );

  const accidentalidadImmediateCauseStats = useMemo(
    () => groupAccidentalidadCauseStats(accidentalidadFilteredRecords, 'immediateCause'),
    [accidentalidadFilteredRecords]
  );

  const accidentalidadReincidenceStats = useMemo(
    () => buildAccidentalidadReincidenceStats(accidentalidadFilteredRecords),
    [accidentalidadFilteredRecords]
  );

  const accidentalidadInformeSections = useMemo(() => {
    const year = accidentalidadInformeYear ?? ACCIDENTALIDAD_INFORME_YEARS[0] ?? 2026;
    const rows = getAccidentalidadInformeRows(accidentalidadInformeByYear, year);
    return buildAccidentalidadInformeSections(rows);
  }, [accidentalidadInformeYear]);

  const accidentalidadIliMetaComparison = useMemo(() => {
    const year = accidentalidadInformeYear ?? ACCIDENTALIDAD_INFORME_YEARS[0] ?? 2026;
    const rows = getAccidentalidadInformeRows(accidentalidadInformeByYear, year);
    return buildAccidentalidadIliMetaComparison(rows);
  }, [accidentalidadInformeYear]);

  const accidentalidadCurrentIliStatus = useMemo(
    () =>
      resolveAccidentalidadIliStatus(
        accidentalidadIndicators.ili,
        accidentalidadIndicators.iliMeta
      ),
    [accidentalidadIndicators.ili, accidentalidadIndicators.iliMeta]
  );

  const medicinaYearOptions = useMemo(
    () => getMedicinaYearOptions(medicinaTrabajoRecords),
    [medicinaTrabajoRecords]
  );

  const medicinaCityOptions = useMemo(
    () => getMedicinaCityOptions(medicinaTrabajoRecords),
    [medicinaTrabajoRecords]
  );

  const medicinaFilteredRecords = useMemo(
    () =>
      filterMedicinaRecords(medicinaTrabajoRecords, {
        yearFilter: medicinaYearFilter,
        startDate: sgiStartDate,
        endDate: sgiEndDate,
        cityFilter: medicinaCityFilter
      }),
    [medicinaTrabajoRecords, medicinaYearFilter, medicinaCityFilter, sgiStartDate, sgiEndDate]
  );

  const medicinaReferenceDate = useMemo(
    () =>
      resolveMedicinaReferenceDate({
        yearFilter: medicinaYearFilter,
        monthFilter: medicinaMonthFilter,
        startDate: sgiStartDate,
        endDate: sgiEndDate
      }),
    [medicinaYearFilter, medicinaMonthFilter, sgiStartDate, sgiEndDate]
  );

  const medicinaIndicators = useMemo(
    () => buildMedicinaIndicators(medicinaFilteredRecords, medicinaReferenceDate),
    [medicinaFilteredRecords, medicinaReferenceDate]
  );

  const medicinaTrendYear = useMemo(
    () => resolveMedicinaTrendYear(medicinaYearFilter, medicinaFilteredRecords),
    [medicinaYearFilter, medicinaFilteredRecords]
  );

  const medicinaMonthlyTrend = useMemo(
    () => buildMedicinaMonthlyTrend(medicinaFilteredRecords, medicinaTrendYear),
    [medicinaFilteredRecords, medicinaTrendYear]
  );

  const medicinaCityStats = useMemo(
    () => groupMedicinaRecords(medicinaFilteredRecords, (row) => row.city || 'Sin ciudad'),
    [medicinaFilteredRecords]
  );

  const medicinaLinkStats = useMemo(
    () => groupMedicinaRecords(medicinaFilteredRecords, (row) => row.linkType || 'Sin vinculación'),
    [medicinaFilteredRecords]
  );

  const medicinaIpsStats = useMemo(
    () => groupMedicinaRecords(medicinaFilteredRecords, (row) => row.ips || 'Sin IPS'),
    [medicinaFilteredRecords]
  );

  const medicinaContractStats = useMemo(
    () => groupMedicinaRecords(medicinaFilteredRecords, (row) => row.contract || 'Sin contrato'),
    [medicinaFilteredRecords]
  );

  const formacionClientStats = useMemo(() => {
    const grouped = new Map<string, { participants: Set<string>; sessions: Set<string>; hhf: number; approved: number }>();
    formacionFilteredRecords.forEach((row) => {
      const key = normalizeFormacionClient(row.client) || 'Sin cliente';
      const current = grouped.get(key) ?? {
        participants: new Set<string>(),
        sessions: new Set<string>(),
        hhf: 0,
        approved: 0
      };
      current.sessions.add(`${row.dateLabel}__${row.topic}`);
      if (row.cedula) current.participants.add(row.cedula);
      current.hhf += row.trainingHours;
      if (row.score >= 75) current.approved += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([client, values]) => ({
        client,
        sessionsCount: values.sessions.size,
        participantsCount: values.participants.size,
        hhf: values.hhf,
        approvedCount: values.approved
      }))
      .sort((a, b) => b.participantsCount - a.participantsCount)
      .slice(0, 10);
  }, [formacionFilteredRecords]);

  const formacionModalityStats = useMemo(() => {
    const grouped = new Map<string, { participants: Set<string>; sessions: Set<string>; hhf: number }>();
    formacionFilteredRecords.forEach((row) => {
      const key = normalizeFormacionModality(row.modality) || 'Sin modalidad';
      const current = grouped.get(key) ?? {
        participants: new Set<string>(),
        sessions: new Set<string>(),
        hhf: 0
      };
      current.sessions.add(`${row.dateLabel}__${row.topic}`);
      if (row.cedula) current.participants.add(row.cedula);
      current.hhf += row.trainingHours;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([modality, values]) => ({
        modality,
        sessionsCount: values.sessions.size,
        participantsCount: values.participants.size,
        hhf: values.hhf
      }))
      .sort((a, b) => b.participantsCount - a.participantsCount);
  }, [formacionFilteredRecords]);

  const formacionEvaluationStats = useMemo(() => {
    const approved = formacionFilteredRecords.filter((row) => row.score >= 75).length;
    const total = formacionFilteredRecords.length;
    const averageScore = total
      ? formacionFilteredRecords.reduce((sum, row) => sum + row.score, 0) / total
      : 0;
    const belowThreshold = total - approved;

    return {
      total,
      approved,
      belowThreshold,
      averageScore,
      approvalRate: total ? (approved / total) * 100 : 0
    };
  }, [formacionFilteredRecords]);

  const formacionSpecialMetrics = useMemo(
    () => extractFormacionSpecialMetricsFromRecords(formacionFilteredRecords),
    [formacionFilteredRecords]
  );

  const formacionDbFilterOptions = useMemo(() => {
    const uniqueSorted = (values: string[]) =>
      Array.from(
        new Set(
          values
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    return {
      cedula: uniqueSorted(formacionRecords.map((row) => row.cedula)),
      client: uniqueSorted(formacionRecords.map((row) => normalizeFormacionClient(row.client))),
      topic: uniqueSorted(formacionRecords.map((row) => row.topic)),
      modality: uniqueSorted(formacionRecords.map((row) => normalizeFormacionModality(row.modality))),
      trainingTime: uniqueSorted(formacionRecords.map((row) => row.trainingTime))
    };
  }, [formacionRecords]);

  const unsafeDbFilterOptions = useMemo(() => {
    const uniqueSorted = (values: string[]) =>
      Array.from(
        new Set(
          values
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    return {
      cedula: uniqueSorted(unsafeBehaviorRecords.map((row) => row.cedula)),
      driverName: uniqueSorted(unsafeBehaviorRecords.map((row) => row.driverName)),
      client: uniqueSorted(unsafeBehaviorRecords.map((row) => row.client)),
      contractType: uniqueSorted(unsafeBehaviorRecords.map((row) => row.contractType)),
      city: uniqueSorted(unsafeBehaviorRecords.map((row) => row.city)),
      location: uniqueSorted(unsafeBehaviorRecords.map((row) => row.location)),
      code: uniqueSorted(unsafeBehaviorRecords.map((row) => row.code)),
      plate: uniqueSorted(unsafeBehaviorRecords.map((row) => row.plate)),
      description: uniqueSorted(unsafeBehaviorRecords.map((row) => row.description)),
      month: uniqueSorted(unsafeBehaviorRecords.map((row) => (row.month ? String(row.month) : ''))),
      year: uniqueSorted(unsafeBehaviorRecords.map((row) => (row.year ? String(row.year) : ''))),
      actionType: uniqueSorted(unsafeBehaviorRecords.map((row) => row.actionType)),
      trainingClass: uniqueSorted(unsafeBehaviorRecords.map((row) => row.trainingClass)),
      controlStatus: uniqueSorted(unsafeBehaviorRecords.map((row) => row.controlStatus)),
      employeeStatus: uniqueSorted(unsafeBehaviorRecords.map((row) => row.employeeStatus)),
      signedReturn: uniqueSorted(unsafeBehaviorRecords.map((row) => row.signedReturn)),
      trainingEvaluation: uniqueSorted(unsafeBehaviorRecords.map((row) => row.trainingEvaluation)),
      inLabor: uniqueSorted(unsafeBehaviorRecords.map((row) => row.inLabor)),
      paymentReceipt: uniqueSorted(unsafeBehaviorRecords.map((row) => row.paymentReceipt)),
      observations: uniqueSorted(unsafeBehaviorRecords.map((row) => row.observations))
    };
  }, [unsafeBehaviorRecords]);

  // Save states to local storage on changes
  useEffect(() => {
    localStorage.setItem('logi_shipments', JSON.stringify(shipments));
  }, [shipments]);

  useEffect(() => {
    localStorage.setItem('logi_drivers', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('logi_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('logi_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    const code = incapForm.dxCode.trim().toUpperCase();
    if (!code) return;
    const found = incapDxMap.get(code);
    if (!found) return;
    if (incapForm.dxDescription.trim() === found) return;
    setIncapForm((prev) => ({ ...prev, dxCode: code, dxDescription: found }));
  }, [incapForm.dxCode, incapForm.dxDescription, incapDxMap]);

  // Pre-load driver options for dispatch builder
  useEffect(() => {
    const defaultAvail = drivers.find(d => d.status === 'available');
    if (defaultAvail) setAssignedDriverId(defaultAvail.id);
    const defaultVeh = vehicles.find(v => v.status === 'idle');
    if (defaultVeh) setAssignedVehicleId(defaultVeh.id);
  }, [drivers, vehicles]);

  // Calculations & Analytics metrics
  const activeAlertsCount = useMemo(() => alerts.filter(a => !a.checked).length, [alerts]);
  
  const metrics = useMemo(() => {
    const total = shipments.length;
    const active = shipments.filter(s => s.status === 'transit' || s.status === 'delayed').length;
    const delivered = shipments.filter(s => s.status === 'delivered').length;
    const delayed = shipments.filter(s => s.status === 'delayed').length;
    const onTimeRate = total > 0 ? (100 - (delayed / total) * 100).toFixed(1) : '100';
    
    // Total cargo tonnes
    const totalTons = (shipments.reduce((sum, s) => sum + s.weight, 0) / 1000).toFixed(1);
    
    // Eco mileage: electric trucks vs fuel vehicles
    const activeVechicles = vehicles.filter(v => v.status === 'active');
    const electCount = activeVechicles.filter(v => v.type === 'electric').length;
    const ecoPercentage = activeVechicles.length > 0 ? Math.round((electCount / activeVechicles.length) * 100) : 50;

    return { total, active, delivered, delayed, onTimeRate, totalTons, ecoPercentage };
  }, [shipments, vehicles]);

  // Handle Dispatch of New Shipment
  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCargo.trim()) {
      alert('Introduzca la descripción de la mercancía cara al manifiesto.');
      return;
    }

    const trackerId = `TRK-${Math.floor(1000 + Math.random() * 9000)}-ESP`;
    const driver = drivers.find(d => d.id === assignedDriverId);
    const vehicle = vehicles.find(v => v.id === assignedVehicleId);

    const originGps = COORDINATES_MAP[newOrigin] || { x: 50, y: 50 };
    const destGps = COORDINATES_MAP[newDestination] || { x: 80, y: 30 };

    const newShipment: Shipment = {
      id: trackerId,
      origin: newOrigin,
      originCoords: originGps,
      destination: newDestination,
      destinationCoords: destGps,
      status: 'scheduled',
      cargo: newCargo,
      weight: Number(newWeight),
      temperature: isRefrigerated ? Number(newTemp) : null,
      driverName: driver ? driver.name : 'Chófer No Asignado',
      vehicleLicence: vehicle ? vehicle.licence : 'M-MOCK-GP',
      eta: 'Mañana ' + (8 + Math.floor(Math.random() * 8)) + ':00',
      progress: 0,
      warningNote: null,
      sensorAnomaly: false
    };

    // Update state & set driver and vehicle to active
    setShipments(prev => [newShipment, ...prev]);

    if (driver) {
      setDrivers(prev => prev.map(d => 
        d.id === driver.id 
          ? { ...d, status: 'on_duty', activeShipmentId: trackerId } 
          : d
      ));
    }

    if (vehicle) {
      setVehicles(prev => prev.map(v => 
        v.id === vehicle.id 
          ? { ...v, status: 'active' } 
          : v
      ));
    }

    // Reset form
    setNewCargo('');
    setIsRefrigerated(false);
    setIsAddingShipment(false);
    setSelectedShipmentId(trackerId); // Automatically focus new shipment
    setActiveTab('shipments'); // Shift focus
  };

  // Assign continuous rest (Interactive task execution)
  const handleAssignRest = (driverId: string) => {
    const targetDriver = drivers.find(d => d.id === driverId);
    if (!targetDriver) return;

    // Reset driver continuous driving hours log, change status to resting, clear active relative alerts
    setDrivers(prev => prev.map(d => 
      d.id === driverId 
        ? { ...d, hoursDrivenToday: 0, status: 'resting', activeShipmentId: null } 
        : d
    ));

    // Resolve specific high driving alert
    setAlerts(prev => prev.map(a => 
      a.title.includes(targetDriver.name) || (targetDriver.id === 'DRV-005' && a.id === 'AL-003')
        ? { ...a, checked: true }
        : a
    ));
  };

  // Address thermal sensor anomalies (Critical corrective trigger)
  const handleAcknowledgeAnomaly = (shipmentId: string) => {
    setShipments(prev => prev.map(s => 
      s.id === shipmentId 
        ? { ...s, temperature: s.temperature !== null ? Math.min(20, s.temperature - 5.5) : null, sensorAnomaly: false, warningNote: 'Regulación térmica restablecida por comando remoto de la central.' }
        : s
    ));

    // Checked corresponding visual alert
    setAlerts(prev => prev.map(a => 
      a.shipmentId === shipmentId 
        ? { ...a, checked: true }
        : a
    ));
  };

  // Solve simple operational notifications
  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === alertId ? { ...a, checked: true } : a
    ));
  };

  // Optimize shipment route via heuristics solver
  const handleOptimizeRoute = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOptimizing(true);

    setTimeout(() => {
      let distanceMultiplier = 1;
      let carbonSaving = 50;
      let transitHrs = 4;
      let weatherInfo = "Condiciones climatológicas óptimas para el transporte de carga por autopista nacional integrada.";

      // Heuristic simulations
      const cleanWeight = Number(optWeight);
      if (optOrigin === optDestination) {
        alert("El origen y destino logística no pueden ser idénticos.");
        setIsOptimizing(false);
        return;
      }

      // Spain mock distance matrices
      let distance = 350;
      if ((optOrigin === 'Madrid' && optDestination === 'Barcelona') || (optOrigin === 'Barcelona' && optDestination === 'Madrid')) {
        distance = 620; transitHrs = 6.2;
      } else if ((optOrigin === 'Madrid' && optDestination === 'Sevilla') || (optOrigin === 'Sevilla' && optDestination === 'Madrid')) {
        distance = 530; transitHrs = 5.3;
      } else if ((optOrigin === 'Madrid' && optDestination === 'Bilbao') || (optOrigin === 'Bilbao' && optDestination === 'Madrid')) {
        distance = 400; transitHrs = 4.1;
      } else if ((optOrigin === 'Valencia' && optDestination === 'Barcelona') || (optOrigin === 'Barcelona' && optDestination === 'Valencia')) {
        distance = 360; transitHrs = 3.6;
      } else if ((optOrigin === 'Sevilla' && optDestination === 'Barcelona') || (optOrigin === 'Barcelona' && optDestination === 'Sevilla')) {
        distance = 990; transitHrs = 10.1;
      }

      let steps: string[] = [];
      let tollCosts = Math.round(distance * 0.08);

      if (optPriority === 'speed') {
        steps = [
          `Salida desde Centro Logístico S-Hub ${optOrigin}`,
          `Incorporación inmediata a autopista de peaje directo AP-Core para reducción de retrasos`,
          `Punto de Monitoreo Intermedio: Lectura de RFID y escaneo de báscula dinámico`,
          `Llegada prioritaria a terminal destino de contenedores en ${optDestination}`
        ];
        distanceMultiplier = 1.0;
        tollCosts = Math.round(distance * 0.12);
        carbonSaving = Math.round(cleanWeight * 0.04);
        weatherInfo = "Estable, desvío AP recomendado para evadir congestiones viales en autovía libre.";
      } else if (optPriority === 'sustainability') {
        steps = [
          `Carga optimizada en tren intermodal / Vehículo eléctrico de reparto`,
          `Ruta Eco-Green optimizada para frenado regenerativo por autovía radial`,
          `Estación de cambio o carga rápida eléctrica programada en mitad de trayecto`,
          `Llegada descarbonizada a terminal de ${optDestination} con certificación verde`
        ];
        distanceMultiplier = 1.08; // slightly longer but safer
        tollCosts = Math.round(distance * 0.03);
        carbonSaving = Math.round(cleanWeight * 0.19);
        weatherInfo = "Viento favorable. Consumo aerodinámico de la flota reducido en un 8.2%.";
      } else {
        steps = [
          `Partida consolidada multi-carga desde la base operativa de ${optOrigin}`,
          `Navegación secuencial evitando tramos de peaje nacional privado`,
          `Control preventivo de combustible e inercas de motor activado`,
          `Arribo consolidado a la distribuidora regional en ${optDestination}`
        ];
        distanceMultiplier = 1.03;
        tollCosts = 0;
        carbonSaving = Math.round(cleanWeight * 0.08);
        weatherInfo = "Precaución en zonas montañosas libres de peaje. Velocidad máxima limitada a 80 km/h.";
      }

      setOptimizedResult({
        steps,
        totalDistance: Math.round(distance * distanceMultiplier),
        estimatedHours: Number((transitHrs * distanceMultiplier).toFixed(1)),
        tollCosts: tollCosts,
        carbonKgs: Math.max(12, Math.round(distance * 0.35 - (carbonSaving / 10))),
        weatherRecommendation: weatherInfo,
        restStopCount: distance > 500 ? 2 : 1
      });

      setIsOptimizing(false);
    }, 1200);
  };

  // Filtered Shipment list
  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      // search filter
      const matchesSearch = s.id.toLowerCase().includes(searchShipment.toLowerCase()) ||
        s.cargo.toLowerCase().includes(searchShipment.toLowerCase()) ||
        s.driverName.toLowerCase().includes(searchShipment.toLowerCase()) ||
        s.origin.toLowerCase().includes(searchShipment.toLowerCase()) ||
        s.destination.toLowerCase().includes(searchShipment.toLowerCase());

      // status filter
      const matchesStatus = filterStatus === 'all' || s.status === filterStatus;

      // map node focus filter
      const matchesNode = !selectedMapNode || s.origin === selectedMapNode || s.destination === selectedMapNode;

      return matchesSearch && matchesStatus && matchesNode;
    });
  }, [shipments, searchShipment, filterStatus, selectedMapNode]);

  // Active shipment selection for sidebar
  const activeShipmentDetails = useMemo(() => {
    return shipments.find(s => s.id === selectedShipmentId) || null;
  }, [shipments, selectedShipmentId]);

  // Live truck point rendering math
  const liveTruckLocations = useMemo(() => {
    return shipments.map(s => {
      if (s.status === 'scheduled' || s.status === 'delivered') return null;
      
      const p = s.progress / 100;
      const start = s.originCoords;
      const end = s.destinationCoords;
      return {
        id: s.id,
        status: s.status,
        anomala: s.sensorAnomaly,
        cargo: s.cargo,
        progress: s.progress,
        x: start.x + (end.x - start.x) * p,
        y: start.y + (end.y - start.y) * p
      };
    }).filter(Boolean);
  }, [shipments]);

  const sstMetrics = useMemo(() => {
    const total = sstFilteredVisits.length;
    const accompanied = sstFilteredVisits.filter((visit) => visit.hasAccompaniment).length;
    const sgiAccompanied = sstFilteredVisits.filter((visit) => {
      const normalized = normalizeText(visit.sgiCompanion);
      return normalized !== '' && normalized !== 'sinasignarsgi';
    }).length;
    const executed = sstFilteredVisits.filter((visit) => visit.executed).length;
    const impactedPeople = sstFilteredVisits.reduce((sum, visit) => sum + visit.impactedPeople, 0);
    const accompanimentRate = total > 0 ? (accompanied / total) * 100 : 0;
    const sgiAccompanimentRate = total > 0 ? (sgiAccompanied / total) * 100 : 0;
    const executionRate = total > 0 ? (executed / total) * 100 : 0;

    return {
      total,
      accompanied,
      sgiAccompanied,
      executed,
      impactedPeople,
      accompanimentRate,
      sgiAccompanimentRate,
      executionRate
    };
  }, [sstFilteredVisits]);

  const sstGestorStats = useMemo(() => {
    const grouped = new Map<string, { total: number; accompanied: number; executed: number }>();
    sstFilteredVisits.forEach((visit) => {
      const key = visit.gestor || 'Sin gestor';
      const current = grouped.get(key) ?? { total: 0, accompanied: 0, executed: 0 };
      current.total += 1;
      if (visit.hasAccompaniment) current.accompanied += 1;
      if (visit.executed) current.executed += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([gestor, values]) => ({
        gestor,
        ...values,
        accompanimentRate: values.total > 0 ? (values.accompanied / values.total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [sstFilteredVisits]);

  const sstClientStats = useMemo(() => {
    const grouped = new Map<string, { total: number; accompanied: number }>();
    sstFilteredVisits.forEach((visit) => {
      const key = visit.client || 'Sin cliente';
      const current = grouped.get(key) ?? { total: 0, accompanied: 0 };
      current.total += 1;
      if (visit.hasAccompaniment) current.accompanied += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([client, values]) => ({
        client,
        ...values,
        accompanimentRate: values.total > 0 ? (values.accompanied / values.total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [sstFilteredVisits]);

  const sgiCompanionStats = useMemo(() => {
    const grouped = new Map<string, { total: number; accompanied: number; executed: number }>();
    sstFilteredVisits.forEach((visit) => {
      const key = visit.sgiCompanion || 'Sin asignar SGI';
      const current = grouped.get(key) ?? { total: 0, accompanied: 0, executed: 0 };
      current.total += 1;
      if (visit.hasAccompaniment) current.accompanied += 1;
      if (visit.executed) current.executed += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([sgiCompanion, values]) => ({
        sgiCompanion,
        ...values,
        accompanimentRate: values.total > 0 ? (values.accompanied / values.total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [sstFilteredVisits]);

  const sgiTopicsStats = useMemo(() => {
    const topicsCounter = new Map<string, number>();
    sstFilteredVisits.forEach((visit) => {
      const normalizedTopics = visit.topics
        .split(/,| - |\n|;/)
        .map((topic) => topic.trim())
        .filter((topic) => topic.length > 3);
      normalizedTopics.forEach((topic) => {
        const groupedTopic = normalizeSgiTopicLabel(topic);
        const current = topicsCounter.get(groupedTopic) ?? 0;
        topicsCounter.set(groupedTopic, current + 1);
      });
    });

    return Array.from(topicsCounter.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
  }, [sstFilteredVisits]);

  const sstMonthlyImpact = useMemo(() => {
    const monthly = new Map<string, { label: string; impacted: number; visits: number }>();
    sstFilteredVisits.forEach((visit) => {
      if (!visit.date) return;
      const key = `${visit.date.getFullYear()}-${visit.date.getMonth() + 1}`;
      const label = visit.date.toLocaleDateString('es-CO', { month: 'short' });
      const current = monthly.get(key) ?? { label, impacted: 0, visits: 0 };
      current.impacted += visit.impactedPeople;
      current.visits += 1;
      monthly.set(key, current);
    });

    return Array.from(monthly.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [sstFilteredVisits]);

  const sstCityStatus = useMemo(() => {
    const grouped = new Map<string, { city: string; executed: number; notExecuted: number }>();
    sstFilteredVisits.forEach((visit) => {
      const key = visit.city || 'Sin ciudad';
      const current = grouped.get(key) ?? { city: key, executed: 0, notExecuted: 0 };
      if (visit.executed) current.executed += 1;
      else current.notExecuted += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.values()).sort(
      (
        a: { city: string; executed: number; notExecuted: number },
        b: { city: string; executed: number; notExecuted: number }
      ) => b.executed + b.notExecuted - (a.executed + a.notExecuted)
    ).map((row) => {
      const total = row.executed + row.notExecuted;
      const complianceRate = total > 0 ? (row.executed / total) * 100 : 0;
      return { ...row, total, complianceRate };
    });
  }, [sstFilteredVisits]);

  const sgiDonutValue = useMemo(() => {
    if (sgiDonutMetric === 'logistic') return sstMetrics.accompanimentRate;
    if (sgiDonutMetric === 'sgi') return sstMetrics.sgiAccompanimentRate;
    return sstMetrics.executionRate;
  }, [sgiDonutMetric, sstMetrics.accompanimentRate, sstMetrics.executionRate, sstMetrics.sgiAccompanimentRate]);

  const sgiDonutLabel = useMemo(() => {
    if (sgiDonutMetric === 'logistic') return 'Acompañamiento del gestor';
    if (sgiDonutMetric === 'sgi') return 'Acompañamiento área SGI';
    return 'Visitas ejecutadas';
  }, [sgiDonutMetric]);

  const isExecutionBelowTarget = useMemo(
    () => sstMetrics.executionRate < EXECUTION_TARGET_PERCENT,
    [sstMetrics.executionRate]
  );

  const sgiDonutColors = useMemo(() => {
    const logisticHighlighted = sgiDonutMetric === 'logistic';
    const sgiHighlighted = sgiDonutMetric === 'sgi';

    return {
      outerFill: logisticHighlighted ? '#006b3d' : '#4f9d7a',
      outerTrack: logisticHighlighted ? '#d5dbe3' : '#dde6e1',
      innerFill: sgiHighlighted ? '#ffd000' : '#f4df7a',
      innerTrack: sgiHighlighted ? '#e6e8eb' : '#ece7d2',
      outerOpacity: sgiHighlighted ? 0.65 : 1,
      innerOpacity: logisticHighlighted ? 0.65 : 1
    };
  }, [sgiDonutMetric]);

  const unsafeMetrics = useMemo(() => {
    const total = unsafeFilteredRecords.length;
    const closed = unsafeFilteredRecords.filter((row) => row.isClosed).length;
    const highRisk = unsafeFilteredRecords.filter((row) => row.riskLevel === 'Alto').length;
    const notifications = unsafeFilteredRecords.filter((row) => row.notificationDate).length;
    const byDriver = new Map<string, number>();
    unsafeFilteredRecords.forEach((row) => {
      const key = row.cedula || row.driverName;
      if (!key) return;
      byDriver.set(key, (byDriver.get(key) ?? 0) + 1);
    });
    const recurrentDrivers = Array.from(byDriver.values()).filter((count) => count > 1).length;
    const closureDays = unsafeFilteredRecords
      .filter((row) => row.isClosed && row.date && row.notificationDate)
      .map((row) => {
        const days = Math.round((row.notificationDate!.getTime() - row.date!.getTime()) / 86400000);
        return days >= 0 ? days : 0;
      });
    const avgClosureDays = closureDays.length > 0
      ? closureDays.reduce((sum, day) => sum + day, 0) / closureDays.length
      : 0;
    const byClient = new Map<string, number>();
    unsafeFilteredRecords.forEach((row) => {
      const key = row.client || 'Sin cliente';
      byClient.set(key, (byClient.get(key) ?? 0) + 1);
    });
    const topClient = Array.from(byClient.entries()).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      closed,
      closedRate: total > 0 ? (closed / total) * 100 : 0,
      highRisk,
      highRiskRate: total > 0 ? (highRisk / total) * 100 : 0,
      notifications,
      recurrentDrivers,
      avgClosureDays,
      topClient: topClient ? `${topClient[0]} (${topClient[1]})` : 'Sin datos'
    };
  }, [unsafeFilteredRecords]);

  const unsafeStatusStats = useMemo(() => {
    const open = unsafeFilteredRecords.filter((row) => !row.isClosed).length;
    const closed = unsafeFilteredRecords.filter((row) => row.isClosed).length;
    const total = open + closed;
    return {
      open,
      closed,
      openRate: total > 0 ? (open / total) * 100 : 0,
      closedRate: total > 0 ? (closed / total) * 100 : 0
    };
  }, [unsafeFilteredRecords]);

  const unsafeTypeStats = useMemo(() => {
    const grouped = new Map<string, number>();
    unsafeFilteredRecords.forEach((row) => {
      const key = row.code || 'Sin código';
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });
    return Array.from(grouped.entries())
      .map(([code, total]) => ({ code, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [unsafeFilteredRecords]);

  const unsafeContractStats = useMemo(() => {
    const grouped = new Map<string, number>();
    unsafeFilteredRecords.forEach((row) => {
      const key = row.contractType || 'Sin contrato';
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });
    return Array.from(grouped.entries())
      .map(([contractType, total]) => ({ contractType, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [unsafeFilteredRecords]);

  const unsafeActionStats = useMemo(() => {
    const grouped = new Map<string, number>();
    unsafeFilteredRecords.forEach((row) => {
      const key = row.actionType || 'Sin acción';
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });
    return Array.from(grouped.entries())
      .map(([actionType, total]) => ({ actionType, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [unsafeFilteredRecords]);

  const unsafeRiskStats = useMemo(() => {
    const totals = { Alto: 0, Medio: 0, Bajo: 0 };
    unsafeFilteredRecords.forEach((row) => { totals[row.riskLevel] += 1; });
    return [
      { level: 'Alto', total: totals.Alto, color: '#ba1a1a' },
      { level: 'Medio', total: totals.Medio, color: '#ffd000' },
      { level: 'Bajo', total: totals.Bajo, color: '#006b3d' }
    ] as const;
  }, [unsafeFilteredRecords]);

  const unsafeCityStats = useMemo(() => {
    const grouped = new Map<string, { total: number; highRisk: number }>();
    unsafeFilteredRecords.forEach((row) => {
      const key = row.city || 'Sin ciudad';
      const current = grouped.get(key) ?? { total: 0, highRisk: 0 };
      current.total += 1;
      if (row.riskLevel === 'Alto') current.highRisk += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .map(([city, values]) => ({
        city,
        ...values,
        highRiskRate: values.total > 0 ? (values.highRisk / values.total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [unsafeFilteredRecords]);

  const unsafeMonthlyTrend = useMemo(() => {
    const grouped = new Map<string, { label: string; total: number; closed: number }>();
    unsafeFilteredRecords.forEach((row) => {
      if (!row.date) return;
      const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`;
      const label = row.date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
      const current = grouped.get(key) ?? { label, total: 0, closed: 0 };
      current.total += 1;
      if (row.isClosed) current.closed += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => ({
        ...value,
        closedRate: value.total > 0 ? (value.closed / value.total) * 100 : 0
      }));
  }, [unsafeFilteredRecords]);

  const unsafeTopCodeMonthlyPeople = useMemo(() => {
    const monthMap = new Map<string, string>();
    const grouped = new Map<
      string,
      { code: string; description: string; total: number; monthlyPeople: Map<string, Set<string>> }
    >();

    unsafeFilteredRecords.forEach((row) => {
      if (!row.code) return;
      if (!row.date) return;
      const monthKey = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = row.date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
      monthMap.set(monthKey, monthLabel);
      const current = grouped.get(row.code) ?? {
        code: row.code,
        description: row.description || 'Sin descripción',
        total: 0,
        monthlyPeople: new Map<string, Set<string>>()
      };
      current.total += 1;
      if (row.description && current.description === 'Sin descripción') {
        current.description = row.description;
      }
      const peopleSet = current.monthlyPeople.get(monthKey) ?? new Set<string>();
      peopleSet.add(row.cedula || row.driverName || row.id);
      current.monthlyPeople.set(monthKey, peopleSet);
      grouped.set(row.code, current);
    });

    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, label]) => ({ key, label }));

    const rows = Array.from(grouped.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((row) => ({
        code: row.code,
        description: row.description,
        total: row.total,
        perMonth: months.map((month) => row.monthlyPeople.get(month.key)?.size ?? 0)
      }));

    return { months, rows };
  }, [unsafeFilteredRecords]);

  const unsafeFollowupRows = useMemo(() => {
    return [...unsafeFilteredRecords]
      .sort((a, b) => {
        if (a.isClosed !== b.isClosed) return a.isClosed ? 1 : -1;
        if (a.riskLevel !== b.riskLevel) {
          const weight = { Alto: 3, Medio: 2, Bajo: 1 };
          return weight[b.riskLevel] - weight[a.riskLevel];
        }
        return b.amount - a.amount;
      })
      .slice(0, 12);
  }, [unsafeFilteredRecords]);

  const sgiSubIndicatorButtons = useMemo(() => {
    if (selectedServiceMenuItem === 'Acompañamiento presencial') {
      return [
        { id: '1', label: 'Detalle general de visitas' },
        { id: '2', label: 'Cumplimiento por gestor logistico' },
        { id: '4', label: 'Cumplimiento área SGI' },
        { id: '3', label: 'Impacto mensual del personal' }
      ] as const;
    }
    if (selectedServiceMenuItem === 'Accidentalidad') {
      return [
        { id: '1', label: 'Detalle general' },
        { id: '2', label: 'Tendencia mensual' },
        { id: '3', label: 'Tipo, cliente y gravedad' },
        { id: '4', label: 'Informe FT-GEI-SO-017' }
      ] as const;
    }
    if (selectedServiceMenuItem === 'Medicina del trabajo') {
      return [
        { id: '1', label: 'Detalle general' },
        { id: '2', label: 'Tendencia y vencimientos' },
        { id: '3', label: 'Ciudad, contrato y vinculación' },
        { id: '4', label: 'Control y seguimiento' }
      ] as const;
    }
    if (selectedServiceMenuItem === 'Comportamientos inseguros') {
      return [
        { id: '1', label: 'Detalle general' },
        { id: '2', label: 'Análisis por área y sede' },
        { id: '3', label: 'Tendencia Mensual' }
      ] as const;
    }
    if (selectedServiceMenuItem === 'Incapacidades') {
      return [
        { id: '1', label: 'Detalle general' },
        { id: '2', label: 'Tendencia mensual' },
        { id: '3', label: 'Causas médicas' },
        { id: '4', label: 'Descripción administrativa' }
      ] as const;
    }
    if (selectedServiceMenuItem === 'Formación') {
      return [
        { id: '1', label: 'Cobertura mensual' },
        { id: '2', label: 'Virtual y momentos de seguridad' },
        { id: '3', label: 'Por cliente' },
        { id: '4', label: 'Asistencia y evaluación' }
      ] as const;
    }
    return [
      { id: '1', label: '1' },
      { id: '2', label: '2' },
      { id: '3', label: '3' },
      { id: '4', label: '4' }
    ] as const;
  }, [selectedServiceMenuItem]);

  const handleDownloadSgiReport = async () => {
    const XLSX = await import('xlsx');
    const dateSuffix =
      sgiStartDate && sgiEndDate ? `${sgiStartDate}_a_${sgiEndDate}` :
      sgiStartDate ? `desde_${sgiStartDate}` :
      sgiEndDate ? `hasta_${sgiEndDate}` :
      'completo';
    const yearSuffix = unsafeYearFilter ? `_${unsafeYearFilter}` : '';

    if (selectedServiceMenuItem === 'Comportamientos inseguros') {
      if (unsafeFilteredRecords.length === 0) {
        alert('No hay registros de comportamientos inseguros para exportar con el filtro actual.');
        return;
      }

      const rows = unsafeFilteredRecords.map((row) => ({
        CEDULA: row.cedula,
        'NOMBRE COMPLETO': row.driverName,
        CLIENTE: row.client,
        CIUDAD: row.city,
        'FECHA INFRACCION': row.dateLabel,
        'CODIGO INFRACCION': row.code,
        'DESCRIPCION INFRACCION': row.description,
        'VALOR INFRACCION': row.amount,
        AÑO: row.year ?? '',
        'TIPO DE ACCION': row.actionType,
        'CONTROL INFRACCIONES': row.controlStatus,
        'ESTADO DE GESTION': row.isClosed ? 'CERRADO' : 'ABIERTO',
        'NIVEL DE RIESGO': row.riskLevel
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 15 }, { wch: 34 }, { wch: 30 }, { wch: 15 }, { wch: 14 }, { wch: 16 },
        { wch: 55 }, { wch: 16 }, { wch: 8 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 14 }
      ];
      worksheet['!autofilter'] = { ref: 'A1:M1' };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '2026 INFRACCIONES');
      XLSX.writeFile(workbook, `reporte_comportamientos_inseguros${yearSuffix}_${dateSuffix}.xlsx`);
      return;
    }

    if (selectedServiceMenuItem === 'Incapacidades') {
      if (incapFilteredRecords.length === 0) {
        alert('No hay registros de incapacidades para exportar con el filtro actual.');
        return;
      }
      const rows = incapFilteredRecords.map((row) => ({
        'FECHA DE INCAPACIDAD': row.incapDateLabel,
        MES: row.month,
        AÑO: row.year,
        CEDULA: row.cedula,
        'NOMBRE DEL EMPLEADO': row.employeeName,
        GENERO: row.gender,
        'ENTIDAD SALUD': row.healthEntity,
        'ENTIDAD QUE PAGA': row.payerEntity,
        'TIPO DE CONTRATO': row.contractType,
        CARGO: row.role,
        'FECHA INGRESO': formatShortDate(row.entryDate),
        'CONTRATO / CLIENTE': row.client,
        'CIUDAD DE AGENCIA': row.city,
        INCAPACIDAD: row.incapType,
        'NRO. DIAS INCAPACIDAD': row.incapDays,
        'FECHA INICIO': formatShortDate(row.startDate),
        'FECHA FIN': formatShortDate(row.endDate),
        'DX CIE10': row.dxCode,
        'DESCRIPCIÓN DX': row.dxDescription,
        'TIPO INCAPACIDAD': row.incapClass,
        'PERIODO EFECTIVO': row.effectivePeriod,
        'PERIODO INICIAL': row.initialPeriod,
        'DIAS INICIAL': row.initialDays,
        'PERIODO SIGUIENTE': row.followingPeriod,
        'PERIODO FINAL': row.finalPeriod,
        'DIAS FINAL': row.finalDays,
        'REQUISITO PARA RETOOMA DE LABORES': row.returnRequirement
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!autofilter'] = { ref: 'A1:AA1' };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'BD Reporte Incapacidades');
      XLSX.writeFile(workbook, `reporte_incapacidades_${incapYearFilter || 'todos'}_${dateSuffix}.xlsx`);
      return;
    }

    if (selectedServiceMenuItem === 'Formación') {
      if (formacionFilteredRecords.length === 0) {
        alert('No hay registros de formación para exportar con el filtro actual.');
        return;
      }

      const rows = formacionFilteredRecords.map((row) => ({
        'CÉDULA PARTICIPANTES': row.cedula,
        'PUNTAJE DE EVALUACIÓN': row.score,
        CLIENTE: row.client,
        'TEMA Y/O CONTENIDO': row.topic,
        FECHA: row.dateLabel,
        MES: row.month,
        AÑO: row.year,
        'HORA EN QUE SE REALIZA LA FORMACIÓN': row.trainingTime,
        'MODALIDA DE LA FORMACIÓN': row.modality,
        'TIEMPO TOTAL DE FORMACIÓN POR PERSONA': row.trainingHours
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 16 }, { wch: 12 }, { wch: 28 }, { wch: 52 }, { wch: 12 }, { wch: 8 },
        { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 16 }
      ];
      worksheet['!autofilter'] = { ref: 'A1:J1' };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'BD PARTICIPANTES');
      XLSX.writeFile(workbook, `reporte_formacion_${formacionYearFilter || 'todos'}_${dateSuffix}.xlsx`);
      return;
    }

    if (selectedServiceMenuItem === 'Accidentalidad') {
      if (accidentalidadFilteredRecords.length === 0) {
        alert('No hay registros de accidentalidad para exportar con el filtro actual.');
        return;
      }

      const rows = accidentalidadFilteredRecords.map((row) => ({
        'FECHA REPORTE': row.reportDateLabel,
        'FECHA EVENTO': row.eventDateLabel,
        CEDULA: row.cedula,
        EMPLEADO: row.employeeName,
        CLIENTE: row.client,
        CARACTERISTICA: row.characteristic,
        GRAVEDAD: row.severity,
        'DURANTE SERVICIO': row.duringService,
        'TIPO CONTRATACION': row.contractType,
        'CAUSA BASICA': row.basicCause,
        'DESCRIPCION RIESGO': row.riskDescription
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 34 }, { wch: 22 }, { wch: 10 },
        { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 34 }
      ];
      worksheet['!autofilter'] = { ref: 'A1:K1' };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'bd_AT_SV_IT_2026');
      XLSX.writeFile(workbook, `reporte_accidentalidad_${accidentalidadYearFilter || 'todos'}_${dateSuffix}.xlsx`);
      return;
    }

    if (selectedServiceMenuItem === 'Medicina del trabajo') {
      if (medicinaFilteredRecords.length === 0) {
        alert('No hay registros de medicina del trabajo para exportar con el filtro actual.');
        return;
      }

      const rows = medicinaFilteredRecords.map((row) => ({
        DOCUMENTO: row.documento,
        'NOMBRE COMPLETO': row.employeeName,
        CIUDAD: row.city,
        CARGO: row.role,
        'F.INGRESO': row.entryDateLabel,
        CONTRATO: row.contract,
        VINCULACION: row.linkType,
        'FECHA EXAMENES': row.examDateLabel,
        'ESTADO EXAMEN': row.examStatus,
        POSTINCAPACIDAD: row.postIncapacidad,
        IPS: row.ips,
        COSTOS: row.cost,
        'TIEMPO PERIODICO AÑOS': row.periodicYears,
        'FECHA DE VENCIMIENTO': row.expiryDateLabel
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 34 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 24 },
        { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
        { wch: 10 }, { wch: 16 }
      ];
      worksheet['!autofilter'] = { ref: 'A1:N1' };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tablero control');
      XLSX.writeFile(workbook, `reporte_medicina_trabajo_${medicinaYearFilter || 'todos'}_${dateSuffix}.xlsx`);
      return;
    }

    if (sstFilteredVisits.length === 0) {
      alert('No hay registros para exportar con el filtro actual.');
      return;
    }

    const rows = sstFilteredVisits.map((visit) => ({
      'CLIENTE - LUGAR VISITA': visit.client,
      CIUDAD: visit.city,
      FECHA: visit.dateLabel,
      'GESTOR LOGISTICO': visit.gestor,
      EJECUTADA: visit.executed ? 'SI' : 'NO',
      'ACTIVIDAD A REALIZAR POR EL GESTOR': visit.accompanimentText,
      'SE GENERA ACOMPAÑAMIENTO ÁREA SGI': visit.sgiCompanion || 'Sin asignar SGI',
      AREA: visit.area || '',
      'ESTADO DE VISITA': visit.estadoVisita || (visit.executed ? 'Ejecutada' : 'Sin Ejecutar'),
      'CANT. PERSONAL IMPACTADO': visit.impactedPeople,
      'TEMAS ABORDADOS': visit.topics
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 34 }, { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 11 }, { wch: 42 },
      { wch: 32 }, { wch: 8 }, { wch: 16 }, { wch: 12 }, { wch: 48 }
    ];
    worksheet['!autofilter'] = { ref: 'A1:K1' };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'agenda completa SST');
    XLSX.writeFile(workbook, `reporte_acompanamiento_sgi_${dateSuffix}.xlsx`);
  };

  const dbFilterOptions = useMemo(() => {
    const uniqueSorted = (values: string[]) =>
      Array.from(
        new Set(
          values
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    return {
      client: uniqueSorted(sstVisits.map((visit) => visit.client)),
      city: uniqueSorted(sstVisits.map((visit) => visit.city)),
      date: uniqueSorted(sstVisits.map((visit) => formatDateForInput(visit.date))),
      gestor: uniqueSorted(sstVisits.map((visit) => visit.gestor)),
      accompanimentText: uniqueSorted(sstVisits.map((visit) => visit.accompanimentText)),
      sgiCompanion: uniqueSorted(sstVisits.map((visit) => visit.sgiCompanion)),
      area: uniqueSorted(sstVisits.map((visit) => visit.area)),
      estadoVisita: uniqueSorted(sstVisits.map((visit) => visit.estadoVisita)),
      impactedPeople: uniqueSorted(sstVisits.map((visit) => String(visit.impactedPeople))),
      topics: uniqueSorted(sstVisits.map((visit) => visit.topics))
    };
  }, [sstVisits]);

  const medicinaFilterOptions = useMemo(() => {
    const uniqueSorted = (values: string[]) =>
      Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'es')
      );

    return {
      city: uniqueSorted(medicinaTrabajoRecords.map((row) => row.city)),
      contract: uniqueSorted(medicinaTrabajoRecords.map((row) => row.contract)),
      linkType: uniqueSorted(medicinaTrabajoRecords.map((row) => row.linkType)),
      examStatus: uniqueSorted(medicinaTrabajoRecords.map((row) => row.examStatus)),
      ips: uniqueSorted(medicinaTrabajoRecords.map((row) => row.ips)),
      role: uniqueSorted(medicinaTrabajoRecords.map((row) => row.role))
    };
  }, [medicinaTrabajoRecords]);

  const handleServiceMenuItemClick = (item: (typeof serviceMenuItems)[number]) => {
    setSelectedServiceMenuItem(item);
    setActiveTab('sgi');
    setSgiSubIndicator('1');
    if (item !== 'Acompañamiento presencial') {
      setShowDbDetailPanel(false);
    }
    if (item !== 'Comportamientos inseguros') {
      setUnsafeYearFilter('');
    }
    if (item !== 'Incapacidades') {
      setIncapYearFilter('');
    }
    if (item !== 'Formación') {
      setFormacionYearFilter('');
    }
    if (item !== 'Accidentalidad') {
      setAccidentalidadYearFilter('');
    }
    if (item !== 'Medicina del trabajo') {
      setMedicinaYearFilter('');
      setMedicinaCityFilter('');
      setMedicinaMonthFilter('');
      setMedicinaAlertFilter('all');
    }
  };

  const handleAuthSubmit = async () => {
    const email = registerEmail.trim();
    if (!email) {
      setRegisterError('Ingresa tu correo corporativo.');
      return;
    }
    if (!isEmpresturEmail(email)) {
      setRegisterError('error en registro de correo electronico');
      return;
    }

    if (authMode === 'register') {
      if (isSupabaseConfigured()) {
        if (!loginPassword.trim()) {
          setRegisterError('Ingresa una contraseña.');
          return;
        }
        if (loginPassword !== confirmPassword) {
          setRegisterError('Las contraseñas no coinciden.');
          return;
        }
      }
    } else if (isSupabaseConfigured() && !loginPassword.trim()) {
      setRegisterError('Ingresa tu contraseña.');
      return;
    }

    setRegisterError('');
    setIsRegisterSubmitting(true);
    try {
      if (authMode === 'register') {
        if (!isSupabaseConfigured()) {
          const result = await connectSgiSupabaseSession(email, '');
          if (!result.ok) {
            setRegisterError('error' in result ? result.error : 'No se pudo registrar.');
            return;
          }
        } else {
          const registerResult = await registerSgiUser(email, loginPassword, registerFullName);
          if (!registerResult.ok) {
            setRegisterError('error' in registerResult ? registerResult.error : 'No se pudo registrar.');
            return;
          }
          try {
            await establishSgiAuthenticatedSession(registerResult.user);
          } catch (error) {
            await signOutSgiUser();
            const message = error instanceof Error ? error.message : 'No se pudieron cargar los datos SGI.';
            setRegisterError(message);
            return;
          }
        }
      } else {
        const result = await connectSgiSupabaseSession(email, loginPassword);
        if (!result.ok) {
          setRegisterError('error' in result ? result.error : 'No se pudo iniciar sesión.');
          return;
        }
      }

      setRegisterEmail('');
      setLoginPassword('');
      setConfirmPassword('');
      setRegisterFullName('');
    } catch (error) {
      console.error('Error en autenticación SGI:', error);
      setRegisterError('No se pudo completar la operación. Verifica la conexión con Supabase.');
    } finally {
      setIsRegisterSubmitting(false);
    }
  };

  const handleDemoModeEntry = async () => {
    setIsRegisterSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setIsDbTestConnected(true);
      setSgiAppUserRole('viewer');
      setShowDbDetailPanel(false);
    } finally {
      setIsRegisterSubmitting(false);
    }
  };

  const buildFormacionRecordKey = (record: FormacionRecord) =>
    [
      record.cedula,
      record.dateLabel,
      getFormacionTopicKey(record.topic),
      normalizeFormacionClient(record.client),
      record.trainingTime,
      String(record.score),
      String(record.trainingHours)
    ].join('|');

  const mergeFormacionRecords = (existing: FormacionRecord[], imported: FormacionRecord[]) => {
    const existingKeys = new Set(existing.map(buildFormacionRecordKey));
    const toAdd: FormacionRecord[] = [];

    imported.forEach((record, index) => {
      const key = buildFormacionRecordKey(record);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      toAdd.push({
        ...record,
        id: `formacion-${Date.now()}-${index}`
      });
    });

    return {
      merged: [...existing, ...toAdd],
      added: toAdd.length,
      skipped: imported.length - toAdd.length
    };
  };

  const handleRestoreFormacionInitialData = () => {
    const confirmed = window.confirm(
      '¿Restaurar la base de datos al ejemplo inicial? Se eliminarán los registros agregados o editados en esta sesión (incluidos cargues de Excel).'
    );
    if (!confirmed) return;

    setFormacionRecords(initialFormacionRecords.map((row) => ({ ...row })));
    setFormacionDemoInformeEdits({});
    resetFormacionForm();
    setSgiStartDate('');
    setSgiEndDate('');
    setFormacionYearFilter('');
  };

  const resetAccidentalidadForm = () => {
    setAccidentalidadForm({
      eventDate: '',
      reportDate: '',
      month: '',
      year: '',
      manager: '',
      cedula: '',
      employeeName: '',
      plate: '',
      client: '',
      duringService: '',
      characteristic: '',
      severity: '',
      lossLevel: '',
      contractType: '',
      linkType: '',
      role: '',
      basicCause: '',
      immediateCause: '',
      riskDescription: ''
    });
    setEditingAccidentalidadId(null);
  };

  const handleRestoreAccidentalidadInitialData = () => {
    const confirmed = window.confirm(
      '¿Restaurar la base de datos al ejemplo inicial? Se eliminarán los registros agregados o editados en esta sesión.'
    );
    if (!confirmed) return;

    setAccidentalidadRecords(initialAccidentalidadRecords.map((row) => ({ ...row })));
    resetAccidentalidadForm();
    setSgiStartDate('');
    setSgiEndDate('');
    setAccidentalidadYearFilter('');
  };

  const handleEditAccidentalidadRecord = (row: AccidentalidadRecord) => {
    setEditingAccidentalidadId(row.id);
    setAccidentalidadForm({
      eventDate: row.eventDate,
      reportDate: row.reportDate,
      month: row.month ? String(row.month) : '',
      year: row.year ? String(row.year) : '',
      manager: row.manager,
      cedula: row.cedula,
      employeeName: row.employeeName,
      plate: row.plate,
      client: row.client,
      duringService: row.duringService,
      characteristic: row.characteristic,
      severity: row.severity,
      lossLevel: row.lossLevel,
      contractType: row.contractType,
      linkType: row.linkType,
      role: row.role,
      basicCause: row.basicCause,
      immediateCause: row.immediateCause,
      riskDescription: row.riskDescription
    });
  };

  const handleAccidentalidadFormSubmit = () => {
    if (!accidentalidadForm.eventDate || !accidentalidadForm.cedula.trim() || !accidentalidadForm.employeeName.trim()) {
      alert('Completa fecha del evento, cédula y nombre del empleado para registrar.');
      return;
    }

    const eventDate = new Date(`${accidentalidadForm.eventDate}T00:00:00`);
    if (Number.isNaN(eventDate.getTime())) {
      alert('La fecha del evento no es válida.');
      return;
    }

    const reportDate = accidentalidadForm.reportDate
      ? new Date(`${accidentalidadForm.reportDate}T00:00:00`)
      : null;
    const validReportDate = reportDate && !Number.isNaN(reportDate.getTime()) ? reportDate : null;
    const month = Number(accidentalidadForm.month) || eventDate.getMonth() + 1;
    const year = Number(accidentalidadForm.year) || eventDate.getFullYear();
    const nextId = editingAccidentalidadId ?? `acc-${Date.now()}`;

    const nextRecord: AccidentalidadRecord = {
      id: nextId,
      reportDate: validReportDate ? validReportDate.toISOString().slice(0, 10) : accidentalidadForm.reportDate,
      reportDateLabel: validReportDate ? formatShortDate(validReportDate) : accidentalidadForm.reportDate.trim(),
      eventDate: eventDate.toISOString().slice(0, 10),
      eventDateLabel: formatShortDate(eventDate),
      month,
      year,
      manager: accidentalidadForm.manager.trim(),
      cedula: accidentalidadForm.cedula.trim(),
      employeeName: accidentalidadForm.employeeName.trim(),
      plate: accidentalidadForm.plate.trim(),
      client: accidentalidadForm.client.trim(),
      duringService: accidentalidadForm.duringService.trim(),
      characteristic: accidentalidadForm.characteristic.trim(),
      severity: accidentalidadForm.severity.trim(),
      lossLevel: accidentalidadForm.lossLevel.trim(),
      contractType: accidentalidadForm.contractType.trim(),
      linkType: accidentalidadForm.linkType.trim(),
      role: accidentalidadForm.role.trim(),
      basicCause: accidentalidadForm.basicCause.trim(),
      immediateCause: accidentalidadForm.immediateCause.trim(),
      riskDescription: accidentalidadForm.riskDescription.trim()
    };

    if (editingAccidentalidadId) {
      setAccidentalidadRecords((prev) =>
        prev.map((row) => (row.id === editingAccidentalidadId ? nextRecord : row))
      );
    } else {
      setAccidentalidadRecords((prev) => [nextRecord, ...prev]);
    }

    resetAccidentalidadForm();
  };

  const resetMedicinaForm = () => {
    setMedicinaForm({
      documento: '',
      employeeName: '',
      city: '',
      role: '',
      entryDate: '',
      contract: '',
      linkType: '',
      examDate: '',
      examStatus: '',
      postIncapacidad: '',
      ips: '',
      cost: '',
      periodicYears: '1',
      expiryDate: ''
    });
    setEditingMedicinaId(null);
  };

  const handleRestoreMedicinaInitialData = () => {
    const confirmed = window.confirm(
      '¿Restaurar la base de datos al ejemplo inicial? Se eliminarán los registros agregados o editados en esta sesión.'
    );
    if (!confirmed) return;

    setMedicinaTrabajoRecords(initialMedicinaTrabajoRecords.map((row) => ({ ...row })));
    resetMedicinaForm();
    setSgiStartDate('');
    setSgiEndDate('');
    setMedicinaYearFilter('');
    setMedicinaCityFilter('');
    setMedicinaMonthFilter('');
    setMedicinaAlertFilter('all');
  };

  const handleEditMedicinaRecord = (row: MedicinaTrabajoRecord) => {
    setEditingMedicinaId(row.id);
    setMedicinaForm({
      documento: row.documento,
      employeeName: row.employeeName,
      city: row.city,
      role: row.role,
      entryDate: row.entryDate,
      contract: row.contract,
      linkType: row.linkType,
      examDate: row.examDate,
      examStatus: row.examStatus,
      postIncapacidad: row.postIncapacidad,
      ips: row.ips,
      cost: row.cost ? String(row.cost) : '',
      periodicYears: String(row.periodicYears || 1),
      expiryDate: row.expiryDate
    });
  };

  const handleMedicinaFormSubmit = () => {
    if (!medicinaForm.documento.trim() || !medicinaForm.employeeName.trim()) {
      alert('Completa documento y nombre del trabajador para registrar.');
      return;
    }

    const entryParsed = medicinaForm.entryDate ? new Date(`${medicinaForm.entryDate}T00:00:00`) : null;
    const examParsed = medicinaForm.examDate ? new Date(`${medicinaForm.examDate}T00:00:00`) : null;
    const expiryParsed = medicinaForm.expiryDate ? new Date(`${medicinaForm.expiryDate}T00:00:00`) : null;
    const validExam = examParsed && !Number.isNaN(examParsed.getTime()) ? examParsed : null;
    const validExpiry = expiryParsed && !Number.isNaN(expiryParsed.getTime()) ? expiryParsed : null;
    const validEntry = entryParsed && !Number.isNaN(entryParsed.getTime()) ? entryParsed : null;
    const nextId = editingMedicinaId ?? `med-${Date.now()}`;

    const nextRecord: MedicinaTrabajoRecord = {
      id: nextId,
      documento: medicinaForm.documento.trim(),
      employeeName: medicinaForm.employeeName.trim(),
      city: medicinaForm.city.trim(),
      role: medicinaForm.role.trim(),
      entryDate: validEntry ? validEntry.toISOString().slice(0, 10) : medicinaForm.entryDate,
      entryDateLabel: validEntry ? formatShortDate(validEntry) : medicinaForm.entryDate.trim(),
      contract: medicinaForm.contract.trim(),
      linkType: medicinaForm.linkType.trim(),
      examDate: validExam ? validExam.toISOString().slice(0, 10) : medicinaForm.examDate,
      examDateLabel: validExam ? formatShortDate(validExam) : medicinaForm.examDate.trim(),
      examMonth: validExam ? validExam.getMonth() + 1 : 0,
      examYear: validExam ? validExam.getFullYear() : 0,
      examStatus: medicinaForm.examStatus.trim(),
      postIncapacidad: medicinaForm.postIncapacidad.trim(),
      ips: medicinaForm.ips.trim(),
      cost: Number(medicinaForm.cost) || 0,
      periodicYears: Number(medicinaForm.periodicYears) || 1,
      expiryDate: validExpiry ? validExpiry.toISOString().slice(0, 10) : medicinaForm.expiryDate,
      expiryDateLabel: validExpiry ? formatShortDate(validExpiry) : medicinaForm.expiryDate.trim(),
      expiryMonth: validExpiry ? validExpiry.getMonth() + 1 : 0,
      expiryYear: validExpiry ? validExpiry.getFullYear() : 0
    };

    if (editingMedicinaId) {
      setMedicinaTrabajoRecords((prev) =>
        prev.map((row) => (row.id === editingMedicinaId ? nextRecord : row))
      );
    } else {
      setMedicinaTrabajoRecords((prev) => [nextRecord, ...prev]);
    }

    setSgiStartDate('');
    setSgiEndDate('');
    resetMedicinaForm();
  };

  const handleDemoExcelUpload = async (file: File) => {
    const service = selectedServiceMenuItem as SgiDemoExcelService;
    const supportedServices: SgiDemoExcelService[] = [
      'Acompañamiento presencial',
      'Comportamientos inseguros',
      'Incapacidades',
      'Formación'
    ];

    if (!supportedServices.includes(service)) {
      alert('La carga de Excel no está disponible para este módulo.');
      return;
    }

    setIsDemoExcelLoading(true);
    try {
      const result = await importDemoExcelForService(file, service, { incapDxMap });

      if (service === 'Acompañamiento presencial') {
        setSstVisits(result.records as SstVisitRecord[]);
        resetDbForm();
      } else if (service === 'Comportamientos inseguros') {
        setUnsafeBehaviorRecords(result.records as UnsafeBehaviorRecord[]);
        resetUnsafeForm();
      } else if (service === 'Incapacidades') {
        setIncapRecords(result.records as IncapRecord[]);
        resetIncapForm();
      } else if (service === 'Formación') {
        const imported = result.records as FormacionRecord[];
        const outcome = mergeFormacionRecords(formacionRecords, imported);
        setFormacionRecords(outcome.merged);
        resetFormacionForm();
        setSgiStartDate('');
        setSgiEndDate('');
        alert(
          `Se agregaron ${outcome.added} registros nuevos desde "${file.name}"` +
            `${outcome.skipped ? ` (${outcome.skipped} duplicados omitidos)` : ''}. ` +
            `Total en base de datos: ${outcome.merged.length}.`
        );
        return;
      }

      setSgiStartDate('');
      setSgiEndDate('');
      alert(`Se cargaron ${result.count} registros desde "${file.name}".`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo cargar el Excel.');
    } finally {
      setIsDemoExcelLoading(false);
    }
  };

  const resetDbForm = () => {
    setDbForm({
      client: '',
      city: '',
      date: '',
      gestor: '',
      executed: '',
      accompanimentText: '',
      sgiCompanion: '',
      area: '',
      estadoVisita: '',
      impactedPeople: '',
      topics: ''
    });
    setEditingVisitId(null);
  };

  const handleDbFormSubmit = () => {
    const nextId = editingVisitId ?? `sst-${Date.now()}`;
    const newVisit = buildVisitFromForm(dbForm, nextId);
    if (!newVisit.client || !newVisit.city || !newVisit.dateLabel || !newVisit.gestor) {
      alert('Completa Cliente, Ciudad, Fecha y Gestor logístico para registrar.');
      return;
    }

    if (editingVisitId) {
      setSstVisits((prev) => prev.map((visit) => (visit.id === editingVisitId ? newVisit : visit)));
    } else {
      setSstVisits((prev) => [newVisit, ...prev]);
    }
    // Al registrar o editar en modo base de datos, mostramos todo para validar cambios en la visual.
    setSgiStartDate('');
    setSgiEndDate('');
    resetDbForm();
  };

  const handleEditVisit = (visit: SstVisitRecord) => {
    setEditingVisitId(visit.id);
    setDbForm({
      client: visit.client,
      city: visit.city,
      date: formatDateForInput(visit.date),
      gestor: visit.gestor,
      executed: visit.executed ? 'SI' : 'NO',
      accompanimentText: visit.accompanimentText,
      sgiCompanion: visit.sgiCompanion,
      area: visit.area,
      estadoVisita: visit.estadoVisita,
      impactedPeople: String(visit.impactedPeople),
      topics: visit.topics
    });
  };

  const resetUnsafeForm = () => {
    setUnsafeForm({
      cedula: '',
      date: '',
      driverName: '',
      client: '',
      contractType: '',
      city: '',
      location: '',
      code: '',
      plate: '',
      description: '',
      amount: '',
      month: '',
      year: '',
      actionType: '',
      notificationDate: '',
      trainingClass: '',
      controlStatus: '',
      employeeStatus: '',
      signedReturn: '',
      trainingEvaluation: '',
      inLabor: '',
      paymentReceipt: '',
      observations: ''
    });
    setEditingUnsafeId(null);
  };

  const handleUnsafeFormSubmit = () => {
    if (!unsafeForm.date || !unsafeForm.driverName.trim() || !unsafeForm.client.trim() || !unsafeForm.city.trim()) {
      alert('Completa Fecha, Conductor, Cliente y Ciudad para registrar.');
      return;
    }

    const parsedDate = new Date(`${unsafeForm.date}T00:00:00`);
    const date = Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    const dateLabel = date ? formatShortDate(date) : '';
    const parsedNotificationDate = unsafeForm.notificationDate ? new Date(`${unsafeForm.notificationDate}T00:00:00`) : null;
    const notificationDate = parsedNotificationDate && !Number.isNaN(parsedNotificationDate.getTime()) ? parsedNotificationDate : null;
    const actionType = normalizeUnsafeActionType(unsafeForm.actionType);
    const controlStatus = normalizeUnsafeControlStatus(unsafeForm.controlStatus);
    const paymentReceipt = normalizeUnsafeSiNo(unsafeForm.paymentReceipt);
    const amount = Number(unsafeForm.amount) || 0;
    const month = Number(unsafeForm.month) || (date ? date.getMonth() + 1 : null);
    const year = Number(unsafeForm.year) || (date ? date.getFullYear() : null);
    const description = toReadableInfractionDescription(unsafeForm.description);
    const isClosed = inferUnsafeClosedStatus(controlStatus, paymentReceipt);
    const riskLevel = inferUnsafeRiskLevel(amount, description);

    if (editingUnsafeId) {
      setUnsafeBehaviorRecords((prev) =>
        prev.map((row) =>
          row.id === editingUnsafeId
            ? {
                ...row,
                cedula: unsafeForm.cedula.trim(),
                driverName: normalizePersonName(unsafeForm.driverName),
                client: unsafeForm.client.trim(),
                contractType: unsafeForm.contractType.trim(),
                city: unsafeForm.city.trim(),
                location: unsafeForm.location.trim(),
                code: unsafeForm.code.trim(),
                plate: unsafeForm.plate.trim().toUpperCase(),
                description,
                amount,
                month,
                year,
                actionType,
                controlStatus,
                date,
                dateLabel,
                notificationDate,
                trainingClass: unsafeForm.trainingClass.trim(),
                employeeStatus: unsafeForm.employeeStatus.trim().toUpperCase(),
                signedReturn: normalizeUnsafeSiNo(unsafeForm.signedReturn),
                trainingEvaluation: normalizeUnsafeSiNo(unsafeForm.trainingEvaluation),
                inLabor: normalizeUnsafeSiNo(unsafeForm.inLabor),
                paymentReceipt,
                observations: unsafeForm.observations.trim(),
                riskLevel,
                isClosed
              }
            : row
        )
      );
    } else {
      const nextId = `unsafe-${Date.now()}`;
      setUnsafeBehaviorRecords((prev) => [
        {
          id: nextId,
          cedula: unsafeForm.cedula.trim(),
          driverName: normalizePersonName(unsafeForm.driverName),
          client: unsafeForm.client.trim(),
          contractType: unsafeForm.contractType.trim(),
          city: unsafeForm.city.trim(),
          date,
          dateLabel,
          location: unsafeForm.location.trim(),
          code: unsafeForm.code.trim(),
          plate: unsafeForm.plate.trim().toUpperCase(),
          description,
          amount,
          month,
          year,
          actionType,
          notificationDate,
          trainingClass: unsafeForm.trainingClass.trim(),
          controlStatus,
          employeeStatus: unsafeForm.employeeStatus.trim().toUpperCase(),
          signedReturn: normalizeUnsafeSiNo(unsafeForm.signedReturn),
          trainingEvaluation: normalizeUnsafeSiNo(unsafeForm.trainingEvaluation),
          inLabor: normalizeUnsafeSiNo(unsafeForm.inLabor),
          paymentReceipt,
          observations: unsafeForm.observations.trim(),
          riskLevel,
          isClosed
        },
        ...prev
      ]);
    }

    setSgiStartDate('');
    setSgiEndDate('');
    resetUnsafeForm();
  };

  const handleEditUnsafeRecord = (row: UnsafeBehaviorRecord) => {
    setEditingUnsafeId(row.id);
    setUnsafeForm({
      cedula: row.cedula,
      date: formatDateForInput(row.date),
      driverName: row.driverName,
      client: row.client,
      contractType: row.contractType,
      city: row.city,
      location: row.location,
      code: row.code,
      plate: row.plate,
      description: row.description,
      amount: row.amount ? String(row.amount) : '',
      month: row.month ? String(row.month) : '',
      year: row.year ? String(row.year) : '',
      actionType: row.actionType,
      notificationDate: formatDateForInput(row.notificationDate),
      trainingClass: row.trainingClass,
      controlStatus: row.controlStatus,
      employeeStatus: row.employeeStatus,
      signedReturn: normalizeUnsafeSiNo(row.signedReturn),
      trainingEvaluation: normalizeUnsafeSiNo(row.trainingEvaluation),
      inLabor: normalizeUnsafeSiNo(row.inLabor),
      paymentReceipt: normalizeUnsafeSiNo(row.paymentReceipt),
      observations: row.observations
    });
  };

  const resetIncapForm = () => {
    setIncapForm({
      incapDate: '',
      month: '',
      year: '',
      cedula: '',
      employeeName: '',
      gender: '',
      healthEntity: '',
      payerEntity: '',
      contractType: '',
      role: '',
      entryDate: '',
      client: '',
      city: '',
      incapType: '',
      incapDays: '',
      startDate: '',
      endDate: '',
      dxCode: '',
      dxDescription: '',
      incapClass: '',
      effectivePeriod: '',
      initialPeriod: '',
      initialDays: '',
      followingPeriod: '',
      finalPeriod: '',
      finalDays: '',
      returnRequirement: ''
    });
    setEditingIncapId(null);
  };

  const handleIncapDateChange = (incapDate: string) => {
    const date = incapDate ? new Date(`${incapDate}T00:00:00`) : null;
    const validDate = date && !Number.isNaN(date.getTime()) ? date : null;
    setIncapForm((prev) => ({
      ...prev,
      incapDate,
      month: validDate ? String(validDate.getMonth() + 1) : prev.month,
      year: validDate ? String(validDate.getFullYear()) : prev.year
    }));
  };

  const handleIncapEmployeeChange = (employeeName: string) => {
    const match = incapRecords.find((row) => row.employeeName === employeeName);
    setIncapForm((prev) => ({
      ...prev,
      employeeName,
      cedula: prev.cedula || match?.cedula || '',
      gender: prev.gender || match?.gender || '',
      role: prev.role || match?.role || '',
      entryDate: prev.entryDate || formatDateForInput(match?.entryDate ?? null)
    }));
  };

  const handleIncapFormSubmit = () => {
    if (!incapForm.incapDate || !incapForm.employeeName.trim() || !incapForm.client.trim() || !incapForm.city.trim()) {
      alert('Completa Fecha, Nombre del Empleado, Cliente y Ciudad para registrar.');
      return;
    }

    const incapDate = new Date(`${incapForm.incapDate}T00:00:00`);
    const validDate = Number.isNaN(incapDate.getTime()) ? null : incapDate;
    const month = Number(incapForm.month) || (validDate ? validDate.getMonth() + 1 : 0);
    const year = Number(incapForm.year) || (validDate ? validDate.getFullYear() : 0);
    const dxCode = incapForm.dxCode.trim().toUpperCase();
    const dxDescription = incapForm.dxDescription.trim() || incapDxMap.get(dxCode) || '';
    const incapDays = Number(incapForm.incapDays) || 0;
    const initialDays = Number(incapForm.initialDays) || 0;
    const finalDays = Number(incapForm.finalDays) || 0;
    const entryDate = incapForm.entryDate
      ? new Date(`${incapForm.entryDate}T00:00:00`)
      : null;
    const validEntryDate = entryDate && !Number.isNaN(entryDate.getTime()) ? entryDate : null;
    const startDate = incapForm.startDate
      ? new Date(`${incapForm.startDate}T00:00:00`)
      : validDate;
    const endDate = incapForm.endDate
      ? new Date(`${incapForm.endDate}T00:00:00`)
      : validDate;
    const validStartDate = startDate && !Number.isNaN(startDate.getTime()) ? startDate : validDate;
    const validEndDate = endDate && !Number.isNaN(endDate.getTime()) ? endDate : validDate;

    if (editingIncapId) {
      setIncapRecords((prev) =>
        prev.map((row) =>
          row.id === editingIncapId
            ? {
                ...row,
                incapDate: validDate,
                incapDateLabel: formatShortDate(validDate),
                month,
                year,
                employeeName: normalizePersonName(incapForm.employeeName),
                client: normalizeIncapClient(incapForm.client),
                city: incapForm.city.trim(),
                cedula: incapForm.cedula.trim(),
                gender: incapForm.gender.trim(),
                healthEntity: normalizeIncapHealthEntity(incapForm.healthEntity),
                payerEntity: incapForm.payerEntity.trim(),
                role: incapForm.role.trim(),
                entryDate: validEntryDate,
                incapDays,
                startDate: validStartDate,
                endDate: validEndDate,
                dxCode,
                dxDescription,
                contractType: normalizeContractType(incapForm.contractType),
                incapType: incapForm.incapType.trim(),
                incapClass: incapForm.incapClass.trim(),
                effectivePeriod: formatIncapPeriodValue(incapForm.effectivePeriod.trim()),
                initialPeriod: formatIncapPeriodValue(incapForm.initialPeriod.trim()),
                initialDays,
                followingPeriod: formatIncapPeriodValue(incapForm.followingPeriod.trim()),
                finalPeriod: formatIncapPeriodValue(incapForm.finalPeriod.trim()),
                finalDays,
                returnRequirement: incapForm.returnRequirement.trim()
              }
            : row
        )
      );
    } else {
      setIncapRecords((prev) => [
        {
          id: `incap-db-${Date.now()}`,
          incapDate: validDate,
          incapDateLabel: formatShortDate(validDate),
          month,
          year,
          cedula: incapForm.cedula.trim(),
          employeeName: normalizePersonName(incapForm.employeeName),
          gender: incapForm.gender.trim(),
          healthEntity: normalizeIncapHealthEntity(incapForm.healthEntity),
          payerEntity: incapForm.payerEntity.trim(),
          contractType: normalizeContractType(incapForm.contractType),
          role: incapForm.role.trim(),
          entryDate: validEntryDate,
          client: normalizeIncapClient(incapForm.client),
          city: incapForm.city.trim(),
          incapType: incapForm.incapType.trim(),
          incapDays,
          startDate: validStartDate,
          endDate: validEndDate,
          dxCode,
          dxDescription,
          incapClass: incapForm.incapClass.trim(),
          effectivePeriod: formatIncapPeriodValue(incapForm.effectivePeriod.trim()),
          initialPeriod: formatIncapPeriodValue(incapForm.initialPeriod.trim()),
          initialDays,
          followingPeriod: formatIncapPeriodValue(incapForm.followingPeriod.trim()),
          finalPeriod: formatIncapPeriodValue(incapForm.finalPeriod.trim()),
          finalDays,
          returnRequirement: incapForm.returnRequirement.trim()
        },
        ...prev
      ]);
    }
    resetIncapForm();
  };

  const handleUpdateIncapDemoInformeCell = (
    field: IncapInformeEditableField,
    monthIndex: number,
    rawValue: string
  ) => {
    if (!incapInformeYear || monthIndex < 0 || monthIndex > 11) return;
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) return;

    setIncapDemoInformeEdits((prev) => {
      const current = prev[incapInformeYear] ?? {};
      let baseValues: number[];

      if (field === 'elApproved' || field === 'elExisting') {
        const bdMetrics = extractBdInformeMetrics(incapRecords, incapInformeYear);
        baseValues = [...bdMetrics[field]];
      } else {
        const base = parseInformeInputsFromRows(getIncapInformeRows(incapInformeYear));
        baseValues = [...base[field]];
      }

      const nextValues = [...(current[field] ?? baseValues)];
      nextValues[monthIndex] = value;
      return {
        ...prev,
        [incapInformeYear]: {
          ...current,
          [field]: nextValues
        }
      };
    });
  };

  const resetFormacionForm = () => {
    setFormacionForm({
      cedula: '',
      score: '',
      client: '',
      topic: '',
      date: '',
      month: '',
      year: '',
      trainingTime: '',
      modality: '',
      trainingHours: ''
    });
    setEditingFormacionId(null);
  };

  const restoreAllSgiDemoBaseline = () => {
    setSstVisits(initialSstVisits.map((row) => ({ ...row })));
    setUnsafeBehaviorRecords(initialUnsafeBehaviorRecords.map((row) => ({ ...row })));
    setIncapRecords(initialIncapRecords.map((row) => ({ ...row })));
    setFormacionRecords(initialFormacionRecords.map((row) => ({ ...row })));
    setAccidentalidadRecords(initialAccidentalidadRecords.map((row) => ({ ...row })));
    setMedicinaTrabajoRecords(initialMedicinaTrabajoRecords.map((row) => ({ ...row })));
    setIncapDemoInformeEdits({});
    setFormacionDemoInformeEdits({});
    setSgiStartDate('');
    setSgiEndDate('');
    setUnsafeYearFilter('');
    setIncapYearFilter('');
    setFormacionYearFilter('');
    setAccidentalidadYearFilter('');
    setMedicinaYearFilter('');
    setMedicinaCityFilter('');
    setMedicinaMonthFilter('');
    setIncapDemoPanel('bd');
    setFormacionDemoPanel('bd');
    setAccidentalidadDemoPanel('bd');
    resetDbForm();
    resetUnsafeForm();
    resetIncapForm();
    resetFormacionForm();
    resetAccidentalidadForm();
    resetMedicinaForm();
  };

  const handleFormacionFormSubmit = () => {
    if (!formacionForm.cedula.trim() || !formacionForm.client.trim() || !formacionForm.topic.trim()) {
      alert('Completa cédula, cliente y tema/contenido para registrar.');
      return;
    }

    const parsedDate = formacionForm.date ? new Date(`${formacionForm.date}T00:00:00`) : null;
    const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
    const month = Number(formacionForm.month) || (validDate ? validDate.getMonth() + 1 : 0);
    const year = Number(formacionForm.year) || (validDate ? validDate.getFullYear() : 0);
    const score = Number(formacionForm.score) || 0;
    const trainingHours = Number(formacionForm.trainingHours) || 0;
    const nextId = editingFormacionId ?? `formacion-${Date.now()}`;

    const nextRecord: FormacionRecord = {
      id: nextId,
      cedula: formacionForm.cedula.trim(),
      score,
      client: normalizeFormacionClient(formacionForm.client),
      topic: formacionForm.topic.trim(),
      date: validDate,
      dateLabel: validDate ? formatShortDate(validDate) : formacionForm.date.trim(),
      month,
      year,
      trainingTime: formacionForm.trainingTime.trim(),
      modality: normalizeFormacionModality(formacionForm.modality),
      trainingHours
    };

    if (editingFormacionId) {
      setFormacionRecords((prev) => prev.map((row) => (row.id === editingFormacionId ? nextRecord : row)));
    } else {
      setFormacionRecords((prev) => [nextRecord, ...prev]);
    }

    setSgiStartDate('');
    setSgiEndDate('');
    resetFormacionForm();
  };

  const handleUpdateFormacionDemoInformeCell = (
    field: FormacionInformeEditableField,
    monthIndex: number,
    rawValue: string
  ) => {
    if (!formacionInformeYear || monthIndex < 0 || monthIndex > 11) return;
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value < 0) return;

    setFormacionDemoInformeEdits((prev) => {
      const current = prev[formacionInformeYear] ?? {};
      const base = parseFormacionInformeInputsFromRows(getFormacionInformeRows(formacionInformeYear));
      const baseValues = [...base[field]];
      const nextValues = [...(current[field] ?? baseValues)];
      nextValues[monthIndex] = value;
      return {
        ...prev,
        [formacionInformeYear]: {
          ...current,
          [field]: nextValues
        }
      };
    });
  };

  const handleEditFormacionRecord = (row: FormacionRecord) => {
    setEditingFormacionId(row.id);
    setFormacionForm({
      cedula: row.cedula,
      score: String(row.score),
      client: normalizeFormacionClient(row.client),
      topic: row.topic,
      date: formatDateForInput(row.date),
      month: row.month ? String(row.month) : '',
      year: row.year ? String(row.year) : '',
      trainingTime: row.trainingTime,
      modality: row.modality,
      trainingHours: String(row.trainingHours)
    });
  };

  const handleEditIncapRecord = (row: IncapRecord) => {
    setEditingIncapId(row.id);
    setIncapForm({
      incapDate: formatDateForInput(row.incapDate),
      month: row.month ? String(row.month) : '',
      year: row.year ? String(row.year) : '',
      cedula: row.cedula,
      employeeName: row.employeeName,
      gender: row.gender,
      healthEntity: row.healthEntity,
      payerEntity: row.payerEntity,
      contractType: row.contractType,
      role: row.role,
      entryDate: formatDateForInput(row.entryDate),
      client: row.client,
      city: row.city,
      incapType: row.incapType,
      incapDays: String(row.incapDays),
      startDate: formatDateForInput(row.startDate),
      endDate: formatDateForInput(row.endDate),
      dxCode: row.dxCode,
      dxDescription: row.dxDescription,
      incapClass: row.incapClass,
      effectivePeriod: row.effectivePeriod,
      initialPeriod: row.initialPeriod,
      initialDays: row.initialDays ? String(row.initialDays) : '',
      followingPeriod: row.followingPeriod,
      finalPeriod: row.finalPeriod,
      finalDays: row.finalDays ? String(row.finalDays) : '',
      returnRequirement: row.returnRequirement
    });
  };

  if (authBootstrapping) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <p className="text-sm text-gray-600 font-medium">Verificando sesión...</p>
      </div>
    );
  }

  if (!isDbTestConnected) {
    return (
      <SgiAuthScreen
        mode={authMode}
        onModeChange={(mode) => {
          setAuthMode(mode);
          setRegisterError('');
        }}
        email={registerEmail}
        password={loginPassword}
        confirmPassword={confirmPassword}
        fullName={registerFullName}
        onEmailChange={setRegisterEmail}
        onPasswordChange={setLoginPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onFullNameChange={setRegisterFullName}
        error={registerError}
        isSubmitting={isRegisterSubmitting}
        usesSupabaseAuth={isSupabaseConfigured()}
        onSubmit={() => void handleAuthSubmit()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans selection:bg-[#ffd000] selection:text-black antialiased">
      
      {/* 1. Header institucional - Alto Contraste */}
      <header className="bg-[#00502c] text-white border-b-2 border-[#ffd000] sticky top-0 z-50 transition-all shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            {/* Logotipo oficial Emprestur */}
            <div className="bg-white p-1.5 rounded-soft border border-emerald-200 shadow-sm">
              <img
                src={empresturLogo}
                alt="Logo Emprestur"
                className="h-10 w-auto object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Tablero de control SGI Emprestur
              </h1>
              <p className="text-xs text-emerald-200">Gestión del Sistema Integrado (SGI)</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs md:text-sm">
            {/* Dynamic Clock Indicator */}
            <div className="flex items-center gap-2 bg-[#006b3d] px-3 py-1.5 rounded-soft border border-emerald-700/50">
              <Clock size={15} className="text-[#ffd000]" />
              <span className="font-mono font-medium text-emerald-50">
                {currentTime.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} — {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                restoreAllSgiDemoBaseline();
                setIsDbTestConnected(false);
                setShowDbDetailPanel(false);
                setRegisteredUserEmail('');
                setSgiAppUserRole(null);
                setSgiRoute('dashboard');
                setRegisterEmail('');
                setLoginPassword('');
                setConfirmPassword('');
                setRegisterFullName('');
                setRegisterError('');
                setAuthMode('login');
                localStorage.removeItem(SGI_SESSION_EMAIL_KEY);
                supabaseSyncReadyRef.current = false;
                window.location.hash = '#/';
                void signOutSgiUser();
              }}
              className="bg-[#ffd000] text-[#00502c] hover:bg-[#f5c400] px-3.5 py-1.5 rounded-soft border border-[#ffe786] text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Cerrar sesión
            </button>
            {registeredUserEmail && sgiAppUserRole && (
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-soft border border-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                {registeredUserEmail} · {getSgiRoleLabel(sgiAppUserRole, registeredUserEmail)}
              </span>
            )}
          </div>
        </div>
      </header>

      {sgiRoute === 'admin-users' && sgiCanManageUsers ? (
        <SgiUserManagement
          currentUserEmail={registeredUserEmail ?? ''}
          usesSupabaseAuth={isSupabaseConfigured()}
          onNavigateDashboard={() => navigateSgiRoute('dashboard')}
        />
      ) : (
      <>
      <div
        className={`fixed left-0 top-[68px] z-40 transition-transform duration-300 ${
          isGsiMenuOpen ? 'translate-x-0' : '-translate-x-[calc(100%-96px)]'
        }`}
      >
        <div className="flex items-start">
          <aside className="w-72 bg-white border-y border-r border-[#eaecf0] shadow-md p-3 rounded-r-soft">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-[#00502c] uppercase tracking-wide">Gestión SGI</h3>
              <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {serviceMenuItems.length} ítems
              </span>
            </div>

            <div className="border border-[#eaecf0] rounded-soft">
              {serviceMenuItems.map((item) => (
                <button
                  key={item}
                  onClick={() => handleServiceMenuItemClick(item)}
                  className={`w-full text-left px-3 py-2 text-sm border-b border-[#f1f3f6] last:border-b-0 transition-colors flex items-center justify-between gap-2 ${
                    selectedServiceMenuItem === item
                      ? 'bg-emerald-50 text-[#00502c] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FileText size={14} />
                    <span>{item}</span>
                  </span>
                  <span className="bg-[#00502c] text-white font-mono text-[9px] px-1.5 py-0.5 rounded-soft font-bold">
                    SGI
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <button
            onClick={() => setIsGsiMenuOpen(prev => !prev)}
            className="h-14 w-24 px-2 bg-[#00502c] text-white rounded-r-soft border-y border-r border-[#ffd000] shadow-md flex items-center justify-center gap-1.5 hover:bg-[#006b3d] transition-colors whitespace-nowrap"
            aria-label={isGsiMenuOpen ? 'Ocultar menú Gestión SGI' : 'Mostrar menú Gestión SGI'}
            title={isGsiMenuOpen ? 'Ocultar Gestión SGI' : 'Mostrar Gestión SGI'}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide">Menú</span>
            {isGsiMenuOpen ? (
              <span className="text-base font-bold leading-none" aria-hidden="true">X</span>
            ) : (
              <Check size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* 4. Layout de Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:py-6">
        
        {/* TAB 1: CENTRO DE CONTROL, MAPA DINÁMICO E INCIDENTES */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Lado izquierdo: Alertas e Indicadores Rápidos (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              
              {/* Alerta de anomalía interactiva rápida */}
              <div className="bg-white border border-[#ba1a1a] rounded-soft overflow-hidden shadow-sm">
                <div className="bg-[#ba1a1a] text-white p-3 flex justify-between items-center">
                  <span className="font-bold text-xs tracking-wide uppercase flex items-center gap-1.5">
                    <AlertTriangle size={15} /> RESOLVER EVENTO CRÍTICO
                  </span>
                  <span className="bg-white text-[#93000a] text-[10px] font-mono px-2 py-0.5 font-bold rounded-soft uppercase">
                    Cabina
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex gap-2.5 items-start">
                    <div className="p-1 rounded bg-[#ffdad6] text-[#ba1a1a] mt-0.5">
                      <Thermometer size={20} className="animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-tight text-gray-900">Sobrecalentamiento TRK-7711-ESP</h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Celdas de Litio en tránsito reportan un aumento de calor a <span className="font-mono bg-red-100 text-[#ba1a1a] font-bold px-1.5 py-0.2 rounded-soft">24.8°C</span>. 
                        Es imperativo reactivar las válvulas auxiliares criogénicas de seguridad.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {shipments.find(s => s.id === 'TRK-7711-ESP')?.sensorAnomaly ? (
                      <button
                        onClick={() => handleAcknowledgeAnomaly('TRK-7711-ESP')}
                        className="w-full bg-[#006b3d] text-white hover:bg-[#00502c] text-xs font-semibold py-2 px-3 rounded-soft flex items-center justify-center gap-1.5 transition-all shadow-sm active:translate-y-0.5"
                      >
                        <Sliders size={14} className="text-[#ffd000]" />
                        <span>Activar Purga Criogénica Remota</span>
                      </button>
                    ) : (
                      <div className="w-full bg-emerald-50 text-[#006b3d] border border-emerald-300 text-xs py-2 px-3 rounded-soft flex items-center justify-center gap-1.5">
                        <CheckCircle size={15} />
                        <span>Válvulas activas / Temperatura Normal</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Centro de Incidentes Activos */}
              <div className="bg-white border border-[#eaecf0] rounded-soft shadow-sm flex flex-col">
                <div className="border-b border-[#eaecf0] p-3 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-sm text-[#191c1d] flex items-center gap-2">
                    <Activity size={16} className="text-[#006b3d]" />
                    <span>Boletín de Incidentes y Monitoreo</span>
                  </h3>
                  <span className="text-xs font-mono text-gray-500">{alerts.filter(a => !a.checked).length} pendientes</span>
                </div>

                <div className="divide-y divide-[#eaecf0] overflow-y-auto max-h-[340px]">
                  {alerts.filter(a => !a.checked).length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} />
                      <p className="text-sm font-medium">No hay incidentes reportados</p>
                      <p className="text-xs text-gray-450 mt-1">Todos los sistemas operan en verde.</p>
                    </div>
                  ) : (
                    alerts.filter(a => !a.checked).map(alert => (
                      <div 
                        key={alert.id} 
                        className={`p-3.5 transition-all hover:bg-gray-50 flex gap-2.5 items-start ${
                          alert.severity === 'critical' 
                            ? 'border-l-4 border-l-[#d92d20] bg-orange-50/10' 
                            : 'border-l-4 border-l-[#ffd000] bg-yellow-50/10'
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {alert.severity === 'critical' ? (
                            <span className="w-2 h-2 rounded-full bg-[#d92d20] block animate-ping" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-[#ffd000] block" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-1">
                            <h4 className="font-bold text-xs text-gray-900 leading-snug">{alert.title}</h4>
                            <span className="text-[9px] text-gray-400 font-mono flex-shrink-0">{alert.timestamp}</span>
                          </div>
                          <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">{alert.description}</p>
                          
                          <div className="mt-2.5 flex items-center justify-between">
                            {alert.shipmentId && (
                              <button 
                                onClick={() => {
                                  setSelectedShipmentId(alert.shipmentId);
                                  setActiveTab('shipments');
                                }}
                                className="text-[10px] text-[#006b3d] font-semibold flex items-center gap-1 hover:underline"
                              >
                                <Hash size={10} />
                                <span className="font-mono">Rastrear {alert.shipmentId}</span>
                              </button>
                            )}
                            
                            {!alert.shipmentId && alert.id === 'AL-003' && (
                              <button
                                onClick={() => {
                                  // Assign rest to Roberto Sanchez DRV-005
                                  handleAssignRest('DRV-005');
                                }}
                                className="text-[10px] bg-[#ffd000] text-black font-semibold px-2 py-0.5 rounded-soft hover:bg-amber-400"
                              >
                                Forzar descanso tacógrafo
                              </button>
                            )}

                            <button
                              onClick={() => handleDismissAlert(alert.id)}
                              className="text-[11px] text-gray-500 hover:text-gray-900 font-bold ml-auto flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded-soft text-right"
                            >
                              <Check size={12} />
                              <span>Archivar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Leyenda de Red Logística */}
              <div className="bg-white border border-[#eaecf0] rounded-soft p-4 shadow-sm text-xs">
                <h4 className="font-bold text-xs text-[#191c1d] uppercase tracking-wider mb-2">Simbolos de Cobertura Iberia</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#006b3d] inline-block" />
                    <span className="text-gray-600 font-medium">S-Hub Centralizado / Almacén Operativo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffd000] inline-block ring-2 ring-amber-200" />
                    <span className="text-gray-600 font-medium">Unidad con Alerta Temporal (Demora)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#d92d20] inline-block ring-2 ring-red-200" />
                    <span className="text-gray-600 font-medium font-bold">Unidad con Anomalía Crítica (Temperatura/Seguridad)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="border-t border-dashed border-gray-400 w-5 inline-block" />
                    <span className="text-gray-500 font-mono text-[10px]">Autopistas Troncales AP-Core</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Lado derecho: Mapa Vectorial Interactivo de Cobertura (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              
              <div className="bg-white border border-[#eaecf0] rounded-soft shadow-sm p-4 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#eaecf0] pb-3 gap-2">
                  <div>
                    <h3 className="font-bold text-base text-[#191c1d] flex items-center gap-2">
                      <MapIcon size={18} className="text-[#006b3d]" />
                      <span>Mapa Dinámico de Rastreo SAT — España</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Vire, seleccione y haga clic en los nodos de reenvío para ver los envíos asignados.</p>
                  </div>

                  <div className="flex gap-2">
                    {selectedMapNode && (
                      <button
                        onClick={() => setSelectedMapNode(null)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1 px-2.5 rounded-soft font-semibold flex items-center gap-1 transition-all"
                      >
                        <RefreshCw size={12} />
                        <span>Ver Todo el País</span>
                      </button>
                    )}
                    <span className="bg-gray-150 border border-gray-250 text-gray-700 text-xs font-mono px-2 py-1 rounded-soft font-semibold self-center">
                      GRID SCALE: 1:40,000
                    </span>
                  </div>
                </div>

                {/* SVG MAP RENDERER */}
                <div className="relative bg-[#f1f3f5] rounded-soft border border-[#eaecf0] mt-4 flex items-center justify-center p-2 sm:p-4 overflow-auto">
                  
                  {/* Background Iberia Canvas */}
                  <svg 
                    viewBox="0 0 100 100" 
                    className="w-full max-w-[620px] aspect-square text-[#c8cbd0] select-none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Simplified schematic representation of Iberian Peninsula Coastlines */}
                    <path 
                      d="M 5,22 Q 12,18 25,12 T 48,10 T 55,5 T 75,12 T 87,20 T 96,38 T 92,62 T 80,72 T 76,89 T 68,95 T 45,95 T 32,91 T 18,85 T 10,75 L 12,60 L 5,50 Z" 
                      fill="#e9ecef" 
                      stroke="#dbe1e6" 
                      strokeWidth="1"
                    />

                    {/* Portugal boundary line schematic */}
                    <path 
                      d="M 21,15 Q 16,35 15,50 Q 18,65 14,84" 
                      fill="none" 
                      stroke="#ced4da" 
                      strokeWidth="0.8" 
                      strokeDasharray="2,2"
                    />

                    {/* Logistic corridors (dashed lines) */}
                    {/* Madrid to Galicia */}
                    <line x1="50" y1="50" x2="10" y2="20" stroke="#ced4da" strokeWidth="0.5" strokeDasharray="1,1" />
                    {/* Madrid to Bilbao */}
                    <line x1="50" y1="50" x2="45" y2="12" stroke="#adb5bd" strokeWidth="0.6" strokeDasharray="3,2" />
                    {/* Madrid to Zaragoza */}
                    <line x1="50" y1="50" x2="69" y2="32" stroke="#adb5bd" strokeWidth="0.6" strokeDasharray="3,2" />
                    {/* Zaragoza to Barcelona */}
                    <line x1="69" y1="32" x2="86" y2="28" stroke="#adb5bd" strokeWidth="0.6" strokeDasharray="3,2" />
                    {/* Madrid to Valencia */}
                    <line x1="50" y1="50" x2="78" y2="56" stroke="#adb5bd" strokeWidth="0.6" strokeDasharray="3,2" />
                    {/* Valencia to Barcelona (Corredor Mediterraneo) */}
                    <line x1="78" y1="56" x2="86" y2="28" stroke="#adb5bd" strokeWidth="0.6" strokeDasharray="3,2" />
                    {/* Madrid to Sevilla */}
                    <line x1="50" y1="50" x2="26" y2="81" stroke="#adb5bd" strokeWidth="0.6" strokeDasharray="3,2" />
                    {/* Sevilla to Málaga */}
                    <line x1="26" y1="81" x2="36" y2="88" stroke="#ced4da" strokeWidth="0.5" strokeDasharray="1,1" />
                    {/* Madrid to Valladolid */}
                    <line x1="50" y1="50" x2="38" y2="35" stroke="#ced4da" strokeWidth="0.5" strokeDasharray="1,1" />

                    {/* Interactive Logistic City Nodes */}
                    {Object.keys(COORDINATES_MAP).map(cityName => {
                      const gps = COORDINATES_MAP[cityName];
                      const isFocused = selectedMapNode === cityName;
                      
                      // Calculate active cargo going to or leaving this node
                      const countLoads = shipments.filter(s => (s.origin === cityName || s.destination === cityName) && s.status !== 'delivered').length;
                      
                      return (
                        <g 
                          key={cityName} 
                          className="cursor-pointer group"
                          onClick={() => setSelectedMapNode(cityName === selectedMapNode ? null : cityName)}
                        >
                          <circle 
                            cx={gps.x} 
                            cy={gps.y} 
                            r={isFocused ? "2.8" : "1.8"} 
                            fill={isFocused ? "#ffd000" : "#006b3d"} 
                            stroke="#ffffff" 
                            strokeWidth="0.6"
                            className="transition-all duration-300 group-hover:scale-125"
                          />
                          {countLoads > 0 && (
                            <circle 
                              cx={gps.x} 
                              cy={gps.y} 
                              r={isFocused ? "5.5" : "4.0"} 
                              fill="none" 
                              stroke={isFocused ? "#ffd000" : "#006b3d"} 
                              strokeWidth="0.3"
                              className="animate-ping opacity-60"
                              style={{ animationDuration: '3s' }}
                            />
                          )}
                          <text 
                            x={gps.x} 
                            y={gps.y - 3.5} 
                            textAnchor="middle" 
                            fontSize="2.4" 
                            fontFamily="var(--font-mono)" 
                            fontWeight={isFocused ? "bold" : "normal"}
                            fill={isFocused ? "#000000" : "#191c1d"}
                            className="bg-white/80 select-none transition-all"
                          >
                            {cityName}
                          </text>
                        </g>
                      );
                    })}

                    {/* Live Moving Trucks Indicators (Transit & Delayed) */}
                    {liveTruckLocations.map(truck => {
                      if (!truck) return null;
                      const isSelected = selectedShipmentId === truck.id;
                      
                      return (
                        <g 
                          key={truck.id} 
                          className="cursor-pointer group" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShipmentId(truck.id);
                            // Open details automatically or highlight
                          }}
                        >
                          {/* Pulsing halo around selected tracking item */}
                          {isSelected && (
                            <circle 
                              cx={truck.x} 
                              cy={truck.y} 
                              r="6" 
                              fill="none" 
                              stroke="#ffd000" 
                              strokeWidth="0.8" 
                              className="animate-pulse"
                            />
                          )}
                          
                          {/* Outer Indicator */}
                          <rect 
                            x={truck.x - 2.5} 
                            y={truck.y - 1.5} 
                            width="5" 
                            height="3" 
                            rx="0.5"
                            fill={truck.anomala ? "#d92d20" : (truck.status === 'delayed' ? "#ffd000" : "#006b3d")} 
                            stroke="#ffffff" 
                            strokeWidth="0.4"
                            className="transition-all hover:scale-150"
                          />
                          
                          {/* Dynamic Direction marker dots */}
                          <line 
                            x1={truck.x} 
                            y1={truck.y} 
                            x2={truck.x + 0.1} 
                            y2={truck.y} 
                            stroke="#ffffff" 
                            strokeWidth="0.6" 
                            strokeLinecap="round" 
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Absolute UI overlay: Node filter details */}
                  <div className="absolute bottom-3 left-3 bg-white/95 border border-[#eaecf0] p-3 rounded-soft backdrop-blur shadow-sm max-w-[280px]">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Filtro de Nodo Seleccionado</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">
                      {selectedMapNode ? `Nodo: S-Hub ${selectedMapNode}` : 'Todo el Territorio Español'}
                    </div>
                    
                    {selectedMapNode ? (
                      <div className="mt-2 text-xs space-y-1 text-gray-600">
                        <div>Envíos que pasan por aquí: <span className="font-mono font-bold text-gray-900">
                          {shipments.filter(s => (s.origin === selectedMapNode || s.destination === selectedMapNode) && s.status !== 'delivered').length}
                        </span></div>
                        <p className="text-[10px] text-[#006b3d] leading-normal italic mt-1.5 font-medium">Tabla filtrada automáticamente para mostrar este nodo.</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                        Haga clic en cualquiera de las 10 cabeceras logísticas provinciales en el mapa para ver la mercadería asociada.
                      </p>
                    )}
                  </div>

                  {/* Absolute Info Floating Help */}
                  <div className="absolute top-3 right-3 bg-white/90 p-2 border border-[#eaecf0] rounded-soft text-[10px] font-mono shadow-xs hidden sm:block">
                    <span className="font-bold text-[#006b3d]">TRÁNSITO ACTIVO:</span> {shipments.filter(s => s.status === 'transit').length} Camiones
                  </div>
                </div>

                {/* Sub-lista rápida para el nodo seleccionado */}
                {selectedMapNode && (
                  <div className="mt-4 p-3 bg-emerald-50/40 border border-[#eaecf0] rounded-soft">
                    <div className="text-xs font-bold text-emerald-900 mb-2 flex items-center justify-between">
                      <span>Cargamentos asignadas al Nodo Central {selectedMapNode}:</span>
                      <button 
                        onClick={() => setSelectedMapNode(null)} 
                        className="text-[10px] text-[#006b3d] underline font-bold"
                      >
                        Limpiar Filtro
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {shipments
                        .filter(s => s.origin === selectedMapNode || s.destination === selectedMapNode)
                        .map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => { setSelectedShipmentId(s.id); setActiveTab('shipments'); }}
                            className="bg-white p-2 border border-[#eaecf0] rounded-soft hover:border-[#006b3d] cursor-pointer text-xs flex justify-between items-center"
                          >
                            <div>
                              <div className="font-mono font-bold text-gray-950">{s.id}</div>
                              <div className="text-gray-500 truncate max-w-[130px]">{s.cargo}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              s.status === 'transit' ? 'bg-emerald-100 text-[#006b3d]' :
                              s.status === 'delayed' ? 'bg-amber-100 text-[#6e5900]' :
                              s.status === 'delivered' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {s.status === 'transit' ? 'Tránsito' : s.status === 'delayed' ? 'Retraso' : s.status === 'delivered' ? 'Entregado' : 'Pendiente'}
                            </span>
                          </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Sección de ayuda de despacho rápida */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#eaecf0] rounded-soft p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#191c1d] flex items-center gap-1.5">
                      <Zap size={16} className="text-[#ffd000] fill-[#ffd000]" />
                      <span>Eficiencia y Próxima Descarbonización</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      La directiva europea establece un mix mínimo de 25% de toneladas eléctricas para 2027. Actualmente nuestro ratio de despacho limpio se sitúa en <span className="font-mono font-bold text-emerald-800">42%</span> gracias a la consolidación de rutas en el Volvo FH Electric 540.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('optimizer')}
                    className="text-xs font-bold text-[#006b3d] hover:underline mt-3 flex items-center gap-1.5 self-start"
                  >
                    <span>Simular ruta intermodal de bajas emisiones</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className="bg-white border border-[#eaecf0] rounded-soft p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#191c1d] flex items-center gap-1.5">
                      <Sliders size={16} className="text-[#056d3f]" />
                      <span>Despachar Carga en el Panel Central</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Añada nuevos albaranes de carga secos o refrigerados con conductores capacitados utilizando el formulario reactivo de la pestaña de despachos.
                    </p>
                  </div>
                  <button 
                    onClick={() => { setActiveTab('shipments'); setIsAddingShipment(true); }}
                    className="bg-[#006b3d] text-white font-semibold text-xs py-1.5 px-3 rounded-soft hover:bg-[#00502c] transition-all self-start mt-3"
                  >
                    Nuevo Manifiesto +
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: SEGUIMIENTO Y DESPACHO DE CAMIONES */}
        {activeTab === 'shipments' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Lado Izquierdo: Buscador, filtros y Ledger de Manifiestos (7 u 8 Cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              
              {/* Opciones De Búsqueda y Botón Despachar */}
              <div className="bg-white border border-[#eaecf0] p-4 rounded-soft shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                <div className="flex-1 flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar por ID, carga, chófer..."
                      value={searchShipment}
                      onChange={(e) => setSearchShipment(e.target.value)}
                      className="bg-[#f8f9fa] border border-[#eaecf0] text-gray-900 rounded-soft pl-9 pr-4 py-1.5 text-xs w-full focus:outline-none focus:border-[#006b3d]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Filter size={14} className="text-gray-500" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as ShipmentStatus | 'all')}
                      className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft text-xs px-2.5 py-1.5 focus:outline-none focus:border-[#006b3d]"
                    >
                      <option value="all">Ver Estados (Todos)</option>
                      <option value="transit">Tránsito Activo</option>
                      <option value="delayed">Retrasado</option>
                      <option value="scheduled">Programado</option>
                      <option value="delivered">Entregado</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddingShipment(!isAddingShipment)}
                  className="bg-[#006b3d] text-white hover:bg-[#00502c] font-semibold text-xs py-2 px-3.5 rounded-soft flex items-center justify-center gap-1.5 transition-all w-full md:w-auto"
                >
                  <Plus size={16} />
                  <span>{isAddingShipment ? 'Cerrar Registro' : 'Despachar Camión'}</span>
                </button>
              </div>

              {/* Formulario de Adición de Envío (Collapsible) */}
              {isAddingShipment && (
                <form 
                  onSubmit={handleCreateShipment}
                  className="bg-white border-t-4 border-t-[#006b3d] border-[#eaecf0] p-4 rounded-soft shadow-md animate-fadeIn"
                >
                  <h3 className="font-bold text-sm text-[#191c1d] uppercase tracking-wide border-b border-[#eaecf0] pb-2 mb-4">
                    Nuevo Manifiesto de Despacho Logístico
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Origen */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Hub Logístico Origen</label>
                      <select
                        value={newOrigin}
                        onChange={(e) => setNewOrigin(e.target.value)}
                        className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-1.5 w-full text-xs font-mono text-gray-900 focus:outline-none focus:border-[#006b3d]"
                      >
                        {Object.keys(COORDINATES_MAP).map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>

                    {/* Destino */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Destino Final de Carga</label>
                      <select
                        value={newDestination}
                        onChange={(e) => setNewDestination(e.target.value)}
                        className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-1.5 w-full text-xs font-mono text-gray-900 focus:outline-none focus:border-[#006b3d]"
                      >
                        {Object.keys(COORDINATES_MAP).map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>

                    {/* Mercancía */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Descripción Mercancía</label>
                      <input
                        type="text"
                        placeholder="Ej. Componentes, Vacuna, Alimentos"
                        value={newCargo}
                        onChange={(e) => setNewCargo(e.target.value)}
                        className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-1.5 w-full text-xs text-gray-900 focus:outline-none focus:border-[#006b3d]"
                      />
                    </div>

                    {/* Peso */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Peso Neto (Kg)</label>
                      <input
                        type="number"
                        min="50"
                        max="24000"
                        value={newWeight}
                        onChange={(e) => setNewWeight(Number(e.target.value))}
                        className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-1.5 w-full text-xs font-mono text-gray-900 focus:outline-none focus:border-[#006b3d]"
                      />
                    </div>

                    {/* Control de Temperatura */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Cadena de Frío</label>
                      <div className="flex gap-2 items-center py-1.5">
                        <input
                          type="checkbox"
                          id="refrig"
                          checked={isRefrigerated}
                          onChange={(e) => setIsRefrigerated(e.target.checked)}
                          className="accent-[#006b3d] h-4 w-4"
                        />
                        <label htmlFor="refrig" className="text-xs text-gray-750 font-medium">Requerida (Reefer)</label>
                      </div>
                    </div>

                    {/* Temperatura Consigna */}
                    {isRefrigerated && (
                      <div>
                        <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Temperatura Consigna (°C)</label>
                        <input
                          type="number"
                          min="-25"
                          max="15"
                          value={newTemp}
                          onChange={(e) => setNewTemp(Number(e.target.value))}
                          className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-1.5 w-full text-xs font-mono text-gray-950 focus:outline-none focus:border-[#006b3d]"
                        />
                      </div>
                    )}

                    {/* Conductor Asignado */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Chófer disponible</label>
                      <select
                        value={assignedDriverId}
                        onChange={(e) => setAssignedDriverId(e.target.value)}
                        className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-1.5 w-full text-xs text-gray-950 focus:outline-none focus:border-[#006b3d]"
                      >
                        {drivers.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.status === 'available' ? 'Disponible' : d.status === 'resting' ? 'Descanso' : 'Activo'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Vehículo Asignado */}
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Vehículo asignado</label>
                      <select
                        value={assignedVehicleId}
                        onChange={(e) => setAssignedVehicleId(e.target.value)}
                        className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-1.5 w-full text-xs text-gray-950 focus:outline-none focus:border-[#006b3d]"
                      >
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.id} — {v.model} ({v.type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2 border-t border-[#eaecf0] pt-3">
                    <button
                      type="button"
                      onClick={() => setIsAddingShipment(false)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs py-2 px-4 rounded-soft"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-[#006b3d] text-white hover:bg-[#00502c] font-semibold text-xs py-2 px-5 rounded-soft hover:shadow-xs flex items-center gap-1"
                    >
                      <Check size={14} />
                      <span>Oficializar Despacho</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Listado Principal de Albaranes */}
              <div className="bg-white border border-[#eaecf0] rounded-soft shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-[#eaecf0] p-3">
                  <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                    <FileText size={16} className="text-[#006b3d]" />
                    <span>Transacciones de Transporte Mapeadas</span>
                    {selectedMapNode && (
                      <span className="bg-emerald-100 text-[#006b3d] text-[10px] py-0.5 px-2 rounded-soft uppercase font-bold font-mono">
                        Filtrado: {selectedMapNode}
                      </span>
                    )}
                  </h3>
                </div>

                <div className="overflow-x-auto text-xs">
                  {filteredShipments.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                      <Truck className="mx-auto text-gray-300 mb-2" size={40} />
                      <p className="font-semibold text-sm">No se encontraron envíos que coincidan</p>
                      <p className="text-xs text-gray-450 mt-1">Intente resetear los filtros de búsqueda o nodo.</p>
                      {selectedMapNode && (
                        <button
                          onClick={() => setSelectedMapNode(null)}
                          className="mt-3 bg-gray-100 text-gray-700 text-xs py-1.5 px-3 rounded-soft hover:bg-gray-200 font-semibold"
                        >
                          Remover filtro de nodo
                        </button>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-left divide-y divide-[#eaecf0]">
                      <thead className="bg-[#f8f9fa] text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-3">Código</th>
                          <th className="p-3">Origen ➜ Destino</th>
                          <th className="p-3">Carga / Peso</th>
                          <th className="p-3">Chófer</th>
                          <th className="p-3">Estado</th>
                          <th className="p-3">Termo/Temp</th>
                          <th className="p-3 text-right">Rastreo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eaecf0] font-medium text-gray-800">
                        {filteredShipments.map(s => {
                          const isSelected = s.id === selectedShipmentId;
                          
                          return (
                            <tr 
                              key={s.id} 
                              onClick={() => setSelectedShipmentId(s.id)}
                              className={`cursor-pointer transition-all ${
                                isSelected ? 'bg-emerald-50/15 font-semibold text-gray-950 border-l-4 border-l-[#006b3d]' : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="p-3 font-mono text-[#006b3d] text-[12px]">
                                {s.id}
                              </td>

                              <td className="p-3">
                                <div className="flex items-center gap-1 font-semibold text-gray-900">
                                  <span>{s.origin}</span>
                                  <ArrowRight size={11} className="text-gray-400" />
                                  <span>{s.destination}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">ETA: {s.eta}</div>
                              </td>

                              <td className="p-3">
                                <div className="truncate max-w-[170px] text-gray-950">{s.cargo}</div>
                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">{(s.weight / 1000).toFixed(1)} Tons</div>
                              </td>

                              <td className="p-3 text-gray-600">
                                {s.driverName}
                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">Veh: {s.vehicleLicence}</div>
                              </td>

                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  s.status === 'transit' ? 'bg-emerald-100 text-[#006b3d]' :
                                  s.status === 'delayed' ? 'bg-amber-100 text-[#6e5900]' :
                                  s.status === 'delivered' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {s.status === 'transit' ? 'Tránsito' : s.status === 'delayed' ? 'Demorado' : s.status === 'delivered' ? 'Entregado' : 'Asignado'}
                                </span>
                              </td>

                              <td className="p-3 font-mono text-[11px]">
                                {s.temperature !== null ? (
                                  <div className="flex items-center gap-1">
                                    <Thermometer size={12} className={s.sensorAnomaly ? 'text-[#d92d20]' : 'text-emerald-700'} />
                                    <span className={s.sensorAnomaly ? 'text-[#d92d20] font-bold' : 'text-gray-700'}>
                                      {s.temperature.toFixed(1)}°C
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">— Secco</span>
                                )}
                              </td>

                              <td className="p-3 text-right">
                                <button
                                  className="text-[11px] bg-gray-100 hover:bg-[#ffd000] text-black font-semibold py-1 px-2.5 rounded-soft transition-all"
                                >
                                  Panel
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>

            {/* Lado Derecho: Detalles de Envío Seleccionado (4 Cols) */}
            <div className="lg:col-span-4 select-none">
              
              {activeShipmentDetails ? (
                <div className={`bg-white border rounded-soft shadow-sm p-4 sticky top-[130px] transition-all duration-300 ${
                  activeShipmentDetails.sensorAnomaly 
                    ? 'border-t-4 border-t-[#d92d20] border-[#eaecf0]' 
                    : 'border-t-4 border-t-[#006b3d] border-[#eaecf0]'
                }`}>
                  
                  {/* Codigo y estado */}
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="text-[10px] font-mono text-gray-400">MANIFESTO TRANSPORTE</span>
                      <h3 className="font-mono text-base font-bold text-gray-950">{activeShipmentDetails.id}</h3>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      activeShipmentDetails.status === 'transit' ? 'bg-emerald-100 text-[#006b3d]' :
                      activeShipmentDetails.status === 'delayed' ? 'bg-amber-100 text-[#6e5900]' :
                      activeShipmentDetails.status === 'delivered' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {activeShipmentDetails.status === 'transit' ? 'En Ruta' : activeShipmentDetails.status === 'delayed' ? 'Demorado' : activeShipmentDetails.status === 'delivered' ? 'Entregado' : 'Planificado'}
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    
                    {/* Alerta si tiene anomalía */}
                    {activeShipmentDetails.sensorAnomaly && (
                      <div className="bg-[#ffdad6] border border-[#d92d20] p-3 rounded-soft text-[#93000a]">
                        <div className="flex items-center gap-1.5 font-bold text-xs uppercase mb-1">
                          <AlertCircle size={14} />
                          <span>¡Acción Requerida!</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          La temperatura actual supera el umbral crítico para este cargamento de baterías de litio. Ejecute la purga auxiliar remota.
                        </p>
                        <button
                          onClick={() => handleAcknowledgeAnomaly(activeShipmentDetails.id)}
                          className="mt-2.5 w-full bg-[#d0241a] text-white hover:bg-[#ba1a1a] font-semibold py-1.5 px-3 rounded-soft flex items-center justify-center gap-1.5 shadow-sm transition-all text-[11px]"
                        >
                          <RefreshCw size={12} />
                          <span>Refrigerar Celdas Ahora</span>
                        </button>
                      </div>
                    )}

                    {/* Progress slider bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1 text-[11px]">
                        <span className="text-gray-500 font-bold uppercase tracking-wider">Avance del Trayecto</span>
                        <span className="font-mono font-bold text-gray-900">{activeShipmentDetails.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-gray-200">
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            activeShipmentDetails.status === 'delayed' ? 'bg-[#ffd000]' : 'bg-[#006b3d]'
                          }`}
                          style={{ width: `${activeShipmentDetails.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Trayectoria */}
                    <div className="bg-[#f8f9fa] p-3 border border-[#eaecf0] rounded-soft">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={15} className="text-[#006b3d]" />
                        <span className="font-bold text-gray-900">Origen y Destino</span>
                      </div>

                      <div className="relative pl-5 border-l-2 border-[#006b3d] ml-1.5 space-y-3">
                        {/* Origen */}
                        <div className="relative">
                          <span className="absolute -left-[24.5px] top-0 bg-white border-2 border-[#006b3d] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                            <span className="w-1.5 h-1.5 bg-[#006b3d] rounded-full inline-block" />
                          </span>
                          <div className="font-bold text-gray-950 text-xs leading-none">{activeShipmentDetails.origin}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">Coordenadas: {activeShipmentDetails.originCoords.x}N, {activeShipmentDetails.originCoords.y}E</div>
                        </div>

                        {/* Destino */}
                        <div className="relative">
                          <span className="absolute -left-[24.5px] top-[1px] bg-white border-2 border-dashed border-[#006b3d] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                            <span className="w-1.5 h-1.5 bg-[#006b3d] rounded-full inline-block animate-ping" />
                          </span>
                          <div className="font-bold text-gray-950 text-xs leading-none">{activeShipmentDetails.destination}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">Coordenadas: {activeShipmentDetails.destinationCoords.x}N, {activeShipmentDetails.destinationCoords.y}E</div>
                        </div>
                      </div>
                    </div>

                    {/* Detalle Operacional */}
                    <div className="space-y-2">
                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-500">Mercancía de Manifiesto:</span>
                        <span className="font-semibold text-gray-900 text-right">{activeShipmentDetails.cargo}</span>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-100 font-mono">
                        <span className="text-gray-500">Peso de Carga:</span>
                        <span className="font-bold text-gray-900">{activeShipmentDetails.weight.toLocaleString('es-ES')} kg</span>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-100 font-mono">
                        <span className="text-gray-500">Cadena de Frío:</span>
                        <span>
                          {activeShipmentDetails.temperature !== null ? (
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-soft border border-emerald-200">
                              Requerida ({activeShipmentDetails.temperature}°C)
                            </span>
                          ) : (
                            <span className="text-gray-400">Seco (No requerida)</span>
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                        <span className="text-gray-500">Conductor de Ruta:</span>
                        <span className="font-semibold text-gray-900">{activeShipmentDetails.driverName}</span>
                      </div>

                      <div className="flex justify-between py-1.5 border-b border-gray-100 font-mono">
                        <span className="text-gray-500">Licencia Vehicular:</span>
                        <span className="font-semibold text-gray-900">{activeShipmentDetails.vehicleLicence}</span>
                      </div>
                    </div>

                    {/* Nota de advertencia si la hay */}
                    {activeShipmentDetails.warningNote && (
                      <div className="bg-amber-50 border border-amber-300 p-2.5 rounded-soft text-[11px] text-amber-900 leading-relaxed font-medium">
                        <div className="flex items-center gap-1 font-bold mb-1">
                          <AlertTriangle size={12} className="text-amber-700" />
                          <span>Observación de Demora:</span>
                        </div>
                        {activeShipmentDetails.warningNote}
                      </div>
                    )}

                    {/* Interactive dispatch controls */}
                    <div className="flex gap-2 pt-2 border-t border-[#eaecf0]">
                      {activeShipmentDetails.status !== 'delivered' && (
                        <button
                          onClick={() => {
                            // Manual trigger to immediately mark shipment as completed
                            setShipments(prev => prev.map(s => 
                              s.id === activeShipmentDetails.id 
                                ? { ...s, status: 'delivered', progress: 100, warningNote: 'Cargamento descargado exitosamente en terminal.' } 
                                : s
                            ));
                            
                            // Liberate the driver and vehicle assigned
                            const driver = drivers.find(d => d.name === activeShipmentDetails.driverName);
                            if (driver) {
                              setDrivers(prev => prev.map(d => 
                                d.id === driver.id 
                                  ? { ...d, status: 'available', activeShipmentId: null } 
                                  : d
                              ));
                            }
                          }}
                          className="w-full bg-[#006b3d] text-white hover:bg-[#00502c] text-[11px] font-semibold py-1.5 rounded-soft text-center transition-all"
                        >
                          Concluir Entrega (Recibido)
                        </button>
                      )}

                      {activeShipmentDetails.status === 'scheduled' && (
                        <button
                          onClick={() => {
                            setShipments(prev => prev.map(s => 
                              s.id === activeShipmentDetails.id 
                                ? { ...s, status: 'transit', progress: 10 } 
                                : s
                            ));
                          }}
                          className="w-full bg-[#ffd000] text-black hover:bg-amber-450 text-[11px] font-bold py-1.5 rounded-soft text-center transition-all"
                        >
                          Iniciar Desplazamiento
                        </button>
                      )}
                    </div>

                  </div>

                </div>
              ) : (
                <div className="bg-white border border-[#eaecf0] p-8 text-center text-gray-400 rounded-soft sticky top-[130px]">
                  <Truck className="mx-auto mb-2 text-gray-300" size={32} />
                  <p className="text-xs font-semibold">Seleccione un envío en la tabla para ver todos los parámetros de telemetría y geolocalización satelital.</p>
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 3: CONDUCTORES Y FLOTA (SAFETY & REST TRIGGER ENGINE) */}
        {activeTab === 'crews' && (
          <div className="space-y-6">
            
            {/* Cabecera general de analíticas de tripulación */}
            <div className="bg-[#00502c] text-white p-4 rounded-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-2 border-[#ffd000] shadow-sm">
              <div>
                <h3 className="font-bold text-base leading-tight">Control de Conductores y Cuentas de Tacógrafo</h3>
                <p className="text-xs text-emerald-200 mt-1">Regulación de jornadas de seguridad según directiva vial europea (Infracción automática &gt; 8 horas continuas).</p>
              </div>

              <div className="bg-[#006b3d] border border-emerald-700/50 p-2.5 rounded-soft flex gap-4 text-xs font-mono">
                <div>
                  <span className="opacity-75 text-[10px] block uppercase">Chóferes en Ruta</span>
                  <span className="text-base font-bold text-white">{drivers.filter(d => d.status === 'on_duty').length} en servicio</span>
                </div>
                <div className="border-l border-emerald-700 pl-4">
                  <span className="opacity-75 text-[10px] block uppercase">Sobre Límite de Seguridad</span>
                  <span className="text-base font-bold text-[#ffd000]">
                    {drivers.filter(d => d.status === 'over_limit').length} alertas
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Lado Izquierdo: Conductores (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                
                <div className="bg-white border border-[#eaecf0] rounded-soft shadow-sm p-4">
                  <h4 className="font-bold text-sm text-gray-900 uppercase tracking-tight mb-3 flex items-center gap-2">
                    <User size={16} className="text-[#006b3d]" />
                    <span>Nómina de Chóferes y Log de Seguridad</span>
                  </h4>

                  <div className="space-y-3.5">
                    {drivers.map(driver => {
                      const isOverLimit = driver.hoursDrivenToday >= 8.0;
                      
                      return (
                        <div 
                          key={driver.id}
                          className={`p-3.5 border rounded-soft transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                            driver.status === 'over_limit' 
                              ? 'bg-red-50/40 border-[#ba1a1a]' 
                              : driver.status === 'resting' 
                                ? 'bg-blue-50/10 border-blue-200' 
                                : 'bg-[#f8f9fa] border-[#eaecf0]'
                          }`}
                        >
                          {/* Info Chófer */}
                          <div className="flex items-center gap-3">
                            <img 
                              src={driver.avatarUrl} 
                              alt={driver.name}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-full object-cover border-2 border-white ring-1 ring-[#eaecf0]"
                            />
                            <div>
                              <div className="font-bold text-gray-950 text-sm">{driver.name}</div>
                              <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                                <span>ID: {driver.id}</span>
                                <span>•</span>
                                <span>Lic: {driver.licenseType}</span>
                              </div>
                            </div>
                          </div>

                          {/* Stats del Chófer */}
                          <div className="flex gap-4 sm:gap-6 text-xs text-left">
                            {/* Horas */}
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Horas Tacógrafo</span>
                              <div className="font-mono flex items-center gap-1">
                                <Clock size={12} className={isOverLimit ? 'text-[#d92d20]' : 'text-gray-600'} />
                                <span className={`font-bold ${isOverLimit ? 'text-[#d92d20]' : 'text-gray-900'}`}>
                                  {driver.hoursDrivenToday}h <span className="text-[10px] text-gray-400">/ 8h</span>
                                </span>
                              </div>
                            </div>

                            {/* Puntos de Seguridad */}
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Rendimiento</span>
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150">
                                {driver.safetyScore}% score
                              </span>
                            </div>

                            {/* Estado de servicio */}
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-0.5">Régimen</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                driver.status === 'on_duty' ? 'bg-emerald-100 text-[#006b3d]' :
                                driver.status === 'resting' ? 'bg-blue-100 text-blue-700' :
                                driver.status === 'over_limit' ? 'bg-red-100 text-[#ba1a1a] animate-pulse' :
                                'bg-gray-150 text-gray-600'
                              }`}>
                                {driver.status === 'on_duty' ? 'Activo' : 
                                 driver.status === 'resting' ? 'Descansando' :
                                 driver.status === 'over_limit' ? 'Peligro Límite' : 'Disponible'}
                              </span>
                            </div>
                          </div>

                          {/* Trigger de Acción Reguladora */}
                          <div className="w-full sm:w-auto text-right">
                            {driver.status === 'over_limit' && (
                              <button
                                onClick={() => handleAssignRest(driver.id)}
                                className="w-full sm:w-auto bg-[#ffd000] text-black hover:bg-amber-450 font-bold text-xs px-3 py-1.5 rounded-soft transition-all"
                              >
                                Asignar Pausa Obligatoria
                              </button>
                            )}

                            {driver.status === 'on_duty' && (
                              <button
                                onClick={() => handleAssignRest(driver.id)}
                                className="w-full sm:w-auto bg-gray-200 hover:bg-[#ffdad6] hover:text-[#ba1a1a] text-gray-700 text-[11px] font-semibold px-2.5 py-1 rounded-soft transition-all"
                              >
                                Mandar a pausa
                              </button>
                            )}

                            {driver.status === 'resting' && (
                              <button
                                onClick={() => {
                                  setDrivers(prev => prev.map(d => 
                                    d.id === driver.id ? { ...d, status: 'available' } : d
                                  ));
                                }}
                                className="w-full sm:w-auto bg-emerald-100/40 text-[#006b3d] border border-emerald-300 text-[11.px] font-semibold px-3 py-1 rounded-soft"
                              >
                                Reactivar Chófer (Fin Pausa)
                              </button>
                            )}

                            {driver.status === 'available' && (
                              <span className="text-gray-400 font-mono text-xs italic">Listo para asignación</span>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>
              
              {/* Lado Derecho: Flota Vehicular y Métricas Diagnósticas (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                
                <div className="bg-white border border-[#eaecf0] rounded-soft shadow-sm p-4">
                  <h4 className="font-bold text-sm text-gray-900 uppercase tracking-tight mb-3 flex items-center gap-2">
                    <Truck size={16} className="text-[#006b3d]" />
                    <span>Control de Flota y Diagnóstico OBD</span>
                  </h4>

                  <div className="grid grid-cols-1 gap-3.5">
                    {vehicles.map(vehicle => {
                      const isLowFuel = vehicle.fuelLevel <= 25;
                      
                      return (
                        <div 
                          key={vehicle.id}
                          className="p-3 bg-[#f8f9fa] border border-[#eaecf0] rounded-soft flex flex-col justify-between gap-2.5"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-sm text-gray-950">{vehicle.id}</span>
                                <span className="text-gray-400 font-mono text-xs">/ {vehicle.model}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono mt-0.5">Matrícula: {vehicle.licence}</div>
                            </div>

                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              vehicle.type === 'electric' ? 'bg-emerald-100 text-[#006b3d]' :
                              vehicle.type === 'hybrid' ? 'bg-yellow-150 text-[#6e5900]' : 'bg-gray-150 text-gray-600'
                            }`}>
                              {vehicle.type}
                            </span>
                          </div>

                          {/* OBD Telemetry indicators */}
                          <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-150/40 pt-2 font-mono">
                            {/* Nivel de combustible o batería */}
                            <div>
                              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                                <span>{vehicle.type === 'electric' ? 'BATERÍA' : 'COMBUSTIBLE'}</span>
                                <span className={isLowFuel ? 'text-[#d92d20] font-bold' : 'text-gray-900'}>{vehicle.fuelLevel}%</span>
                              </div>
                              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${isLowFuel ? 'bg-[#d92d20]' : 'bg-[#006b3d]'}`} 
                                  style={{ width: `${vehicle.fuelLevel}%` }}
                                />
                              </div>
                            </div>

                            {/* Temperatura de Sistema */}
                            <div>
                              <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                                <span>TEMP_COCOOLANT</span>
                                <span className={vehicle.coolantTemp > 85 ? 'text-[#d92d20] font-bold' : 'text-gray-650'}>{vehicle.coolantTemp}°C</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Thermometer size={11} className={vehicle.coolantTemp > 85 ? 'text-[#d92d20]' : 'text-gray-400'} />
                                <span className={`text-[11px] font-bold ${vehicle.coolantTemp > 85 ? 'text-[#d92d20]' : 'text-gray-800'}`}>
                                  {vehicle.coolantTemp > 80 ? 'Temperatura Crítica' : 'Estable'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick interactive maintenance schedule toggle */}
                          <div className="flex justify-between items-center text-xs mt-1 border-t border-gray-150/40 pt-2">
                            <span className="text-gray-500">Diagnóstico:</span>
                            
                            <div className="flex gap-1.5">
                              {vehicle.status === 'maintenance' ? (
                                <button
                                  onClick={() => {
                                    setVehicles(prev => prev.map(v => 
                                      v.id === vehicle.id ? { ...v, status: 'idle', fuelLevel: 100, coolantTemp: 40 } : v
                                    ));
                                  }}
                                  className="bg-yellow-400 text-black px-2 py-0.5 rounded text-[10px] font-bold"
                                >
                                  Liberar de taller (Carga 100%)
                                </button>
                              ) : (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  vehicle.status === 'active' ? 'bg-emerald-50 text-[#006b3d] border border-emerald-200' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {vehicle.status === 'active' ? 'Desplegado' : 'Estacionamiento (Inerte)'}
                                </span>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 4: ACOMPAÑAMIENTO PRESENCIAL (SGI) */}
        {activeTab === 'sgi' && (
          <div className="space-y-5">
            {sgiIsAdmin && (
              <div className="bg-white border border-[#eaecf0] rounded-soft p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#00502c]">Administración del tablero</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {sgiCanManageUsers
                      ? 'Gestiona roles de visualizador y editor para los usuarios registrados.'
                      : 'Conecta Supabase en Vercel (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY) y redeploy para habilitar la gestión de usuarios.'}
                  </p>
                </div>
                {sgiCanManageUsers ? (
                  <button
                    type="button"
                    onClick={() => navigateSgiRoute('admin-users')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-soft text-sm font-semibold border border-[#00502c] bg-[#00502c] text-white hover:bg-[#006b3d] transition-colors"
                  >
                    <Users size={16} />
                    Gestión de usuarios
                  </button>
                ) : (
                  <span className="inline-flex items-center justify-center px-4 py-2.5 rounded-soft text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-900">
                    Supabase pendiente de configurar
                  </span>
                )}
              </div>
            )}
            <div className="bg-white border border-[#eaecf0] rounded-soft p-4 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                {(selectedServiceMenuItem === 'Acompañamiento presencial' || selectedServiceMenuItem === 'Accidentalidad' || selectedServiceMenuItem === 'Medicina del trabajo' || selectedServiceMenuItem === 'Comportamientos inseguros' || selectedServiceMenuItem === 'Incapacidades' || selectedServiceMenuItem === 'Formación') && sgiCanEditDatasets && (
                  selectedServiceMenuItem === 'Incapacidades' || selectedServiceMenuItem === 'Formación' || selectedServiceMenuItem === 'Accidentalidad' ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const activePanel =
                            selectedServiceMenuItem === 'Formación'
                              ? formacionDemoPanel
                              : selectedServiceMenuItem === 'Accidentalidad'
                                ? accidentalidadDemoPanel
                                : incapDemoPanel;
                          if (showDbDetailPanel && activePanel === 'bd') {
                            setShowDbDetailPanel(false);
                            return;
                          }
                          setShowDbDetailPanel(true);
                          if (selectedServiceMenuItem === 'Formación') setFormacionDemoPanel('bd');
                          else if (selectedServiceMenuItem === 'Accidentalidad') setAccidentalidadDemoPanel('bd');
                          else setIncapDemoPanel('bd');
                        }}
                        className={`px-3 py-2 rounded-soft text-xs font-semibold border transition-colors ${
                          showDbDetailPanel &&
                          (selectedServiceMenuItem === 'Formación'
                            ? formacionDemoPanel
                            : selectedServiceMenuItem === 'Accidentalidad'
                              ? accidentalidadDemoPanel
                              : incapDemoPanel) === 'bd'
                            ? 'border-[#00502c] bg-[#00502c] text-white'
                            : 'border-[#d6dce5] bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Ingreso base de datos
                      </button>
                      <button
                        onClick={() => {
                          const activePanel =
                            selectedServiceMenuItem === 'Formación'
                              ? formacionDemoPanel
                              : selectedServiceMenuItem === 'Accidentalidad'
                                ? accidentalidadDemoPanel
                                : incapDemoPanel;
                          if (showDbDetailPanel && activePanel === 'informe') {
                            setShowDbDetailPanel(false);
                            return;
                          }
                          setShowDbDetailPanel(true);
                          if (selectedServiceMenuItem === 'Formación') setFormacionDemoPanel('informe');
                          else if (selectedServiceMenuItem === 'Accidentalidad') setAccidentalidadDemoPanel('informe');
                          else setIncapDemoPanel('informe');
                        }}
                        className={`px-3 py-2 rounded-soft text-xs font-semibold border transition-colors ${
                          showDbDetailPanel &&
                          (selectedServiceMenuItem === 'Formación'
                            ? formacionDemoPanel
                            : selectedServiceMenuItem === 'Accidentalidad'
                              ? accidentalidadDemoPanel
                              : incapDemoPanel) === 'informe'
                            ? 'border-[#00502c] bg-[#00502c] text-white'
                            : 'border-[#d6dce5] bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {selectedServiceMenuItem === 'Formación'
                          ? 'Informe consolidado'
                          : selectedServiceMenuItem === 'Accidentalidad'
                            ? 'Informe consolidado FT-GEI-SO-017'
                            : 'Informe consolidado FT-GEI-SO-016'}
                      </button>
                    </div>
                  ) : (
                  <button
                    onClick={() => setShowDbDetailPanel((prev) => !prev)}
                    className={`px-3 py-2 rounded-soft text-xs font-semibold border transition-colors ${
                      showDbDetailPanel
                        ? 'border-[#00502c] bg-[#00502c] text-white'
                        : 'border-[#d6dce5] bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Ingreso base de datos
                  </button>
                  )
                )}
                {(selectedServiceMenuItem === 'Acompañamiento presencial' || selectedServiceMenuItem === 'Accidentalidad' || selectedServiceMenuItem === 'Medicina del trabajo' || selectedServiceMenuItem === 'Comportamientos inseguros' || selectedServiceMenuItem === 'Incapacidades' || selectedServiceMenuItem === 'Formación') && (
                  <button
                    onClick={handleDownloadSgiReport}
                    className="px-3 py-2 rounded-soft text-xs font-semibold border border-[#006b3d] bg-[#006b3d] text-white hover:bg-[#00502c] transition-colors"
                  >
                    Descargar reporte
                  </button>
                )}
                </div>

                {(selectedServiceMenuItem === 'Acompañamiento presencial' || selectedServiceMenuItem === 'Accidentalidad' || selectedServiceMenuItem === 'Medicina del trabajo' || selectedServiceMenuItem === 'Comportamientos inseguros' || selectedServiceMenuItem === 'Incapacidades' || selectedServiceMenuItem === 'Formación') && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedServiceMenuItem === 'Comportamientos inseguros' && (
                      <select
                        value={unsafeYearFilter}
                        onChange={(e) => setUnsafeYearFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-[#d6dce5] rounded-soft bg-white"
                      >
                        <option value="">Todos los años</option>
                        {unsafeYearOptions.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    )}
                    {selectedServiceMenuItem === 'Incapacidades' && (
                      <select
                        value={incapYearFilter}
                        onChange={(e) => setIncapYearFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-[#d6dce5] rounded-soft bg-white"
                      >
                        <option value="">Todos los años</option>
                        {incapYearOptions.map((year) => (
                          <option key={`incap-year-${year}`} value={year}>{year}</option>
                        ))}
                      </select>
                    )}
                    {selectedServiceMenuItem === 'Accidentalidad' && (
                      <select
                        value={accidentalidadYearFilter}
                        onChange={(e) => setAccidentalidadYearFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-[#d6dce5] rounded-soft bg-white"
                      >
                        <option value="">Todos los años</option>
                        {accidentalidadYearOptions.map((year) => (
                          <option key={`acc-year-${year}`} value={year}>{year}</option>
                        ))}
                      </select>
                    )}
                    {selectedServiceMenuItem === 'Medicina del trabajo' && (
                      <>
                        <select
                          value={medicinaYearFilter}
                          onChange={(e) => setMedicinaYearFilter(e.target.value)}
                          className="px-2 py-1.5 text-xs border border-[#d6dce5] rounded-soft bg-white"
                        >
                          <option value="">Todos los años</option>
                          {medicinaYearOptions.map((year) => (
                            <option key={`med-year-${year}`} value={year}>{year}</option>
                          ))}
                        </select>
                        <select
                          value={medicinaMonthFilter}
                          onChange={(e) => setMedicinaMonthFilter(e.target.value)}
                          className="px-2 py-1.5 text-xs border border-[#d6dce5] rounded-soft bg-white"
                        >
                          <option value="">Mes de referencia</option>
                          {MEDICINA_MONTH_NAMES.map((name, index) => (
                            <option key={`med-month-${index + 1}`} value={String(index + 1)}>
                              {name.charAt(0).toUpperCase() + name.slice(1)}
                            </option>
                          ))}
                        </select>
                        <select
                          value={medicinaCityFilter}
                          onChange={(e) => setMedicinaCityFilter(e.target.value)}
                          className="px-2 py-1.5 text-xs border border-[#d6dce5] rounded-soft bg-white max-w-[160px]"
                        >
                          <option value="">Todas las ciudades</option>
                          {medicinaCityOptions.map((city) => (
                            <option key={`med-city-${city}`} value={city}>{city}</option>
                          ))}
                        </select>
                      </>
                    )}
                    {selectedServiceMenuItem === 'Formación' && (
                      <select
                        value={formacionYearFilter}
                        onChange={(e) => setFormacionYearFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-[#d6dce5] rounded-soft bg-white"
                      >
                        <option value="">Todos los años</option>
                        {formacionYearOptions.map((year) => (
                          <option key={`formacion-year-${year}`} value={year}>{year}</option>
                        ))}
                      </select>
                    )}
                    <input
                      type="date"
                      value={sgiStartDate}
                      onChange={(e) => setSgiStartDate(e.target.value)}
                      className="px-2 py-1.5 text-xs border border-[#d6dce5] rounded-soft bg-white"
                    />
                    <span className="text-xs text-gray-500">a</span>
                    <input
                      type="date"
                      value={sgiEndDate}
                      onChange={(e) => setSgiEndDate(e.target.value)}
                      className="px-2 py-1.5 text-xs border border-[#d6dce5] rounded-soft bg-white"
                    />
                  </div>
                )}
              </div>

              {!showDbDetailPanel && (
                <>
              <div className="flex flex-wrap gap-2">
                {sgiSubIndicatorButtons.map((indicator) => (
                  <button
                    key={indicator.id}
                    onClick={() => setSgiSubIndicator(indicator.id)}
                    className={`px-3 py-2 rounded-soft text-xs font-semibold border transition-colors ${
                      sgiSubIndicator === indicator.id
                        ? 'bg-[#006b3d] text-white border-[#006b3d]'
                        : 'bg-white text-gray-700 border-[#d6dce5] hover:bg-gray-50'
                    }`}
                  >
                    {indicator.label}
                  </button>
                ))}
              </div>

              {selectedServiceMenuItem === 'Acompañamiento presencial' && (
                <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Visitas programadas</p>
                  <p className="text-2xl font-bold text-[#191c1d] mt-1">{sstMetrics.total}</p>
                </div>
                <div
                  onClick={() => setSgiDonutMetric('logistic')}
                  className={`border rounded-soft p-3 transition-colors cursor-pointer ${
                    sgiDonutMetric === 'logistic'
                      ? 'border-[#006b3d] bg-emerald-100 ring-2 ring-emerald-200'
                      : 'border-[#eaecf0] bg-white hover:bg-gray-50'
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Con acompañamiento del gestor</p>
                  <p className="text-2xl font-bold text-[#006b3d] mt-1">{sstMetrics.accompanied}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">{sstMetrics.accompanimentRate.toFixed(1)}%</p>
                </div>
                <div
                  onClick={() => setSgiDonutMetric('sgi')}
                  className={`border rounded-soft p-3 transition-colors cursor-pointer ${
                    sgiDonutMetric === 'sgi'
                      ? 'border-[#d4a900] bg-yellow-100 ring-2 ring-yellow-200'
                      : 'border-[#eaecf0] bg-white hover:bg-gray-50'
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Con acompañamiento del área SGI</p>
                  <p className="text-2xl font-bold text-[#006b3d] mt-1">{sstMetrics.sgiAccompanied}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold">{sstMetrics.sgiAccompanimentRate.toFixed(1)}%</p>
                </div>
                <div
                  className={`border rounded-soft p-3 transition-colors ${
                    isExecutionBelowTarget
                      ? 'bg-red-50 border-red-300 ring-2 ring-red-100'
                      : 'bg-white border-[#eaecf0]'
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Visitas ejecutadas</p>
                  <p className={`text-2xl font-bold mt-1 ${isExecutionBelowTarget ? 'text-[#ba1a1a]' : 'text-[#00502c]'}`}>
                    {sstMetrics.executed}
                  </p>
                  <p className={`text-[11px] font-semibold ${isExecutionBelowTarget ? 'text-[#ba1a1a]' : 'text-gray-600'}`}>
                    {sstMetrics.executionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Personal impactado</p>
                  <p className="text-2xl font-bold text-[#191c1d] mt-1">{sstMetrics.impactedPeople}</p>
                </div>
              </div>

              {isLoadingSst && (
                <div className="border border-[#eaecf0] rounded-soft p-6 bg-[#f8f9fa] text-sm text-gray-600">
                  Cargando agenda completa SST...
                </div>
              )}

              {sstLoadError && (
                <div className="border border-[#ffdad6] rounded-soft p-4 bg-[#fff4f3] text-sm text-[#93000a]">
                  {sstLoadError}
                </div>
              )}

              {!isLoadingSst && !sstLoadError && sgiSubIndicator === '1' && (
                <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                  <div ref={sgiDonutRef} className="max-w-xl mx-auto">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold text-center">Detalle general de visitas</p>
                    <div className="mt-4 h-56 w-56 mx-auto relative flex items-center justify-center">
                      <div
                        className="absolute inset-0 rounded-full cursor-pointer transition-all"
                        onClick={() => setSgiDonutMetric('logistic')}
                        title="Click para ver cumplimiento gestor logístico"
                        style={{
                          background: `conic-gradient(${sgiDonutColors.outerFill} ${sstMetrics.accompanimentRate}%, ${sgiDonutColors.outerTrack} ${sstMetrics.accompanimentRate}% 100%)`,
                          opacity: sgiDonutColors.outerOpacity
                        }}
                      />
                      <div
                        className="absolute inset-[28px] rounded-full cursor-pointer transition-all"
                        onClick={() => setSgiDonutMetric('sgi')}
                        title="Click para ver acompañamiento área SGI"
                        style={{
                          background: `conic-gradient(${sgiDonutColors.innerFill} ${sstMetrics.sgiAccompanimentRate}%, ${sgiDonutColors.innerTrack} ${sstMetrics.sgiAccompanimentRate}% 100%)`,
                          opacity: sgiDonutColors.innerOpacity
                        }}
                      />
                      <div className="absolute inset-[54px] bg-[#f8f9fa] rounded-full flex flex-col items-center justify-center">
                        <span
                          className={`text-xl font-bold ${
                            sgiDonutMetric === 'executed' && isExecutionBelowTarget ? 'text-[#ba1a1a]' : 'text-[#00502c]'
                          }`}
                        >
                          {sgiDonutValue.toFixed(1)}%
                        </span>
                        <span
                          className={`text-xs font-semibold text-center px-3 leading-tight ${
                            sgiDonutMetric === 'executed' && isExecutionBelowTarget ? 'text-[#ba1a1a]' : 'text-gray-600'
                          }`}
                        >
                          {sgiDonutLabel}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-[#006b3d]" /> Gestor logístico</span>
                      <span className="flex items-center gap-1 text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-[#ffd000]" /> Área SGI</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-4 text-center">
                      Meta sugerida: <span className="font-semibold text-[#00502c]">{EXECUTION_TARGET_PERCENT}%</span>
                    </p>
                  </div>
                </div>
              )}

              {!isLoadingSst && !sstLoadError && sgiSubIndicator === '2' && (
                <div className="space-y-4">
                  <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Clientes con mayor actividad</p>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      {(() => {
                        const maxRate = Math.max(...sstClientStats.map((item) => item.accompanimentRate), 1);
                        const minRate = Math.min(...sstClientStats.map((item) => item.accompanimentRate));

                        return (
                          <div className="overflow-x-auto overflow-y-visible py-2">
                            <div className="flex gap-4 justify-between min-w-max px-1">
                              {sstClientStats.map((row) => {
                                const barColor = getGreenBarColor(row.accompanimentRate, minRate, maxRate);
                                const barHeight = getScaledBarHeight(row.accompanimentRate, maxRate);

                                return (
                                  <div key={row.client} className="min-w-[100px] w-[100px] flex flex-col items-center">
                                    {renderSgiVerticalBar(
                                      `${row.accompanimentRate.toFixed(1)}%`,
                                      barHeight,
                                      barColor,
                                      {
                                        title: `${row.client}: cobertura ${row.accompanimentRate.toFixed(1)}%`
                                      }
                                    )}
                                    <div className="mt-2 text-[11px] text-center text-gray-700 leading-tight line-clamp-2">
                                      {row.client}
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                      {row.total} visitas
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Cumplimiento por gestor logistico</p>
                    <div className="space-y-2">
                      {sstGestorStats.map((row) => (
                        <div key={row.gestor} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#191c1d]">{row.gestor}</span>
                            <span className="font-mono">{row.accompanimentRate.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 mt-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#006b3d]" style={{ width: `${row.accompanimentRate}%` }} />
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1">
                            {row.accompanied}/{row.total} con acompañamiento • {row.executed} ejecutadas
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!isLoadingSst && !sstLoadError && sgiSubIndicator === '3' && (
                <div className="space-y-4">
                  <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Impacto mensual del personal</p>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      {sstMonthlyImpact.length === 0 ? (
                        <div className="h-56 flex items-center justify-center text-sm text-gray-500">
                          No hay datos mensuales disponibles para graficar.
                        </div>
                      ) : (
                        <div className="overflow-x-auto overflow-y-visible py-2">
                          <div className="flex gap-4 justify-between min-w-max px-1">
                            {sstMonthlyImpact.map((month) => {
                              const maxValue = Math.max(...sstMonthlyImpact.map((item) => item.impacted), 1);
                              const minValue = Math.min(...sstMonthlyImpact.map((item) => item.impacted));
                              const barHeight = getScaledBarHeight(month.impacted, maxValue);
                              const barColor = getGreenBarColor(month.impacted, minValue, maxValue);
                              return (
                                <div key={month.label} className="min-w-[88px] w-[88px] flex flex-col items-center">
                                  {renderSgiVerticalBar(
                                    String(month.impacted),
                                    barHeight,
                                    barColor,
                                    {
                                      barWidthClass: 'w-[58px]',
                                      labelColor: barColor,
                                      title: `${month.label.toUpperCase()}: ${month.impacted} personas (${month.visits} visitas)`
                                    }
                                  )}
                                  <div className="text-[11px] uppercase font-semibold text-gray-600 mt-2">{month.label}</div>
                                  <div className="text-[11px] text-gray-500">{month.visits} visitas</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Estado por ciudad</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {sstCityStatus.slice(0, 7).map((cityRow) => (
                        <div key={cityRow.city} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                          <div className="text-xs font-semibold text-[#191c1d]">{cityRow.city}</div>
                          <div className="text-[11px] text-gray-500 mt-1">
                            Ejecutadas: {cityRow.executed} • Sin ejecutar: {cityRow.notExecuted}
                          </div>
                          <div className="text-[11px] text-[#00502c] font-semibold mt-1">
                            Cumplimiento: {cityRow.complianceRate.toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!isLoadingSst && !sstLoadError && sgiSubIndicator === '4' && (
                <div className="space-y-4">
                  <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">
                      Cumplimiento área SGI
                    </p>
                    <div className="space-y-2">
                      {sgiCompanionStats.map((row) => (
                        <div key={row.sgiCompanion} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#191c1d]">{row.sgiCompanion}</span>
                            <span className="font-mono">{row.accompanimentRate.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 mt-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full"
                              style={{ width: `${row.accompanimentRate}%`, backgroundColor: getSgiComplianceBarColor(row.accompanimentRate) }}
                            />
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1">
                            {row.accompanied}/{row.total} con acompañamiento • {row.executed} ejecutadas
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Temas abordados</p>
                    <div className="space-y-2">
                      {sgiTopicsStats.map((topic) => (
                        <div key={topic.topic} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                          <div className="text-xs font-semibold text-[#191c1d]">{topic.topic}</div>
                          <div className="text-[11px] text-gray-500 mt-1">Apariciones: {topic.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
              {selectedServiceMenuItem === 'Accidentalidad' && (
                <>
                  {!accidentalidadYearFilter && (
                    <p className="text-[11px] text-gray-500">
                      Indicadores FT-GEI-SO-017 mostrando cierre {accidentalidadIndicators.sourceYear}. Seleccione año o rango de fechas para acotar la vista.
                    </p>
                  )}
                  {accidentalidadYearFilter && !accidentalidadIndicators.hasInforme && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-soft px-3 py-2">
                      No hay informe FT-GEI-SO-017 consolidado para {accidentalidadYearFilter}.
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Eventos en BD</p>
                      <p className="text-2xl font-bold text-[#191c1d] mt-1">{accidentalidadIndicators.totalEventsBd}</p>
                      <p className="text-[10px] text-gray-500 mt-1">bd_AT_SV_IT_2026</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Incidentes laborales</p>
                      <p className="text-2xl font-bold text-[#00502c] mt-1">{Math.round(accidentalidadIndicators.laborIncidents)}</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Acc. incapacitantes</p>
                      <p className="text-2xl font-bold text-[#ba1a1a] mt-1">{Math.round(accidentalidadIndicators.disablingAccidents)}</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Siniestros viales laborales</p>
                      <p className="text-2xl font-bold text-[#9a7b00] mt-1">{Math.round(accidentalidadIndicators.laborRoadAccidents)}</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Días perdidos A.L</p>
                      <p className="text-2xl font-bold text-[#ba1a1a] mt-1">{Math.round(accidentalidadIndicators.lostDaysAl)}</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Trabajadores mes</p>
                      <p className="text-2xl font-bold text-[#191c1d] mt-1">{Math.round(accidentalidadIndicators.workersMonth)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {accidentalidadSelectedMonthIndex === null
                          ? 'Promedio anual'
                          : ACCIDENTALIDAD_INFORME_MONTH_LABELS[accidentalidadSelectedMonthIndex]}
                      </p>
                    </div>
                  </div>

                  {sgiSubIndicator === '1' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Ind. frecuencia (IF)</p>
                          <p className="text-2xl font-bold text-[#00502c] mt-1">{accidentalidadIndicators.frequencyIndex.toFixed(3)}</p>
                        </div>
                        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Ind. severidad (IS)</p>
                          <p className="text-2xl font-bold text-[#00502c] mt-1">{accidentalidadIndicators.severityIndex.toFixed(3)}</p>
                        </div>
                        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">ILI</p>
                          <p className="text-2xl font-bold text-[#00502c] mt-1">{accidentalidadIndicators.ili.toFixed(6)}</p>
                        </div>
                        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Tasa accidentalidad (TA)</p>
                          <p className="text-2xl font-bold text-[#00502c] mt-1">{accidentalidadIndicators.accidentRate.toFixed(3)}</p>
                        </div>
                      </div>
                      {(() => {
                        const iliStyles = getAccidentalidadIliStatusStyles(accidentalidadCurrentIliStatus);
                        return (
                          <div className={`rounded-soft border p-4 ${iliStyles.bg} ${iliStyles.border}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-600">ILI vs meta mensual</p>
                                <p className={`text-2xl font-bold mt-1 ${iliStyles.text}`}>
                                  {accidentalidadIndicators.ili.toFixed(6)}
                                  <span className="text-sm font-semibold text-gray-600 ml-2">
                                    / meta {accidentalidadIndicators.iliMeta.toFixed(6)}
                                  </span>
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${iliStyles.bg} ${iliStyles.text} ${iliStyles.border}`}>
                                {iliStyles.label}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Eventos e incidentes (informe FT-GEI-SO-017)</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                          {[
                            { label: '01-Incidentes laborales', value: accidentalidadIndicators.laborIncidents },
                            { label: '02-Acc. incapacitantes', value: accidentalidadIndicators.disablingAccidents },
                            { label: '03-Acc. sin incapacidad', value: accidentalidadIndicators.nonDisablingAccidents },
                            { label: '04-Siniestro vial laboral', value: accidentalidadIndicators.laborRoadAccidents },
                            { label: '04-Siniestro vial NO laboral', value: accidentalidadIndicators.nonLaborRoadAccidents },
                            { label: 'Medio ambiente', value: accidentalidadIndicators.environmentalAccidents },
                            { label: '09-Acc. trabajo mortal', value: accidentalidadIndicators.workFatalities }
                          ].map((item) => (
                            <div key={item.label} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold line-clamp-2">{item.label}</p>
                              <p className="text-lg font-bold text-[#191c1d] mt-1 font-mono">{Math.round(item.value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Días perdidos y recursos operativos</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[
                            { label: '05-Días perdidos A.L', value: Math.round(accidentalidadIndicators.lostDaysAl) },
                            { label: '06-Días siniestro vial laboral', value: Math.round(accidentalidadIndicators.lostDaysRoadLabor) },
                            { label: '11-Días siniestro vial NO laboral', value: Math.round(accidentalidadIndicators.lostDaysRoadNonLabor) },
                            { label: '07-Trabajadores mes', value: Math.round(accidentalidadIndicators.workersMonth) },
                            { label: '08-HHT', value: Math.round(accidentalidadIndicators.hht) }
                          ].map((item) => (
                            <div key={item.label} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold line-clamp-2">{item.label}</p>
                              <p className="text-lg font-bold text-[#191c1d] mt-1 font-mono">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Desglose de siniestros viales</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                          {[
                            { label: 'Mortal conductor Emprestur', value: accidentalidadIndicators.roadMortalDriver },
                            { label: 'Mortal otro actor vial', value: accidentalidadIndicators.roadMortalOther },
                            { label: 'Grave conductor Emprestur', value: accidentalidadIndicators.roadGraveDriver },
                            { label: 'Grave otro actor vial', value: accidentalidadIndicators.roadGraveOther },
                            { label: 'Leve conductor Emprestur', value: accidentalidadIndicators.roadLeveDriver },
                            { label: 'Leve otro actor vial', value: accidentalidadIndicators.roadLeveOther },
                            { label: 'Choque simple', value: accidentalidadIndicators.roadSimpleCrash }
                          ].map((item) => (
                            <div key={item.label} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold line-clamp-2">{item.label}</p>
                              <p className="text-lg font-bold text-[#191c1d] mt-1 font-mono">{Math.round(item.value)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Índices, tasas y proporciones</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                          {[
                            { label: 'IS siniestro vial incapacitante', value: `${accidentalidadIndicators.roadSeverityIndex.toFixed(3)}%`, isText: true },
                            { label: 'Tasa SV en la labor', value: `${accidentalidadIndicators.roadLaborRate.toFixed(3)}%`, isText: true },
                            { label: 'Tasa SV fuera de la labor', value: `${accidentalidadIndicators.roadNonLaborRate.toFixed(3)}%`, isText: true },
                            { label: 'Proporción incidencia (PI*100W)', value: `${accidentalidadIndicators.incidenceProportion.toFixed(3)}%`, isText: true },
                            { label: 'Proporción AT mortales', value: `${accidentalidadIndicators.mortalityProportion.toFixed(3)}%`, isText: true }
                          ].map((item) => (
                            <div key={item.label} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold line-clamp-2">{item.label}</p>
                              <p className="text-lg font-bold text-[#191c1d] mt-1 font-mono">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '2' && (
                    <div className="space-y-4">
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Tendencia mensual FT-GEI-SO-017</p>
                        <div className="overflow-x-auto bg-white border border-[#eaecf0] rounded-soft">
                          <table className="min-w-full text-xs">
                            <thead className="bg-[#f8f9fa] border-b border-[#eaecf0] text-left text-gray-600">
                              <tr>
                                <th className="px-3 py-2">Indicador</th>
                                {ACCIDENTALIDAD_INFORME_MONTH_LABELS.map((month) => (
                                  <th key={`acc-trend-${month}`} className="px-2 py-2 text-center">{month}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eef1f5]">
                              {[
                                { label: 'Incidentes laborales', key: 'laborIncidents' as const },
                                { label: 'Acc. incapacitantes', key: 'disablingAccidents' as const },
                                { label: 'Acc. sin incapacidad', key: 'nonDisablingAccidents' as const },
                                { label: 'Siniestros viales laborales', key: 'laborRoadAccidents' as const },
                                { label: 'Eventos BD', key: 'bdEvents' as const }
                              ].map((row) => (
                                <tr key={row.key}>
                                  <td className="px-3 py-2 font-medium text-[#191c1d]">{row.label}</td>
                                  {accidentalidadMonthlyTrend.map((month) => (
                                    <td key={`${row.key}-${month.month}`} className="px-2 py-2 text-center font-mono">
                                      {Math.round(month[row.key])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {[
                          {
                            title: 'Eventos registrados en BD',
                            picker: (month: (typeof accidentalidadMonthlyTrend)[number]) => month.bdEvents
                          },
                          {
                            title: 'Incidentes laborales (informe)',
                            picker: (month: (typeof accidentalidadMonthlyTrend)[number]) => month.laborIncidents
                          },
                          {
                            title: 'Accidentes incapacitantes (informe)',
                            picker: (month: (typeof accidentalidadMonthlyTrend)[number]) => month.disablingAccidents
                          },
                          {
                            title: 'Siniestros viales laborales (informe)',
                            picker: (month: (typeof accidentalidadMonthlyTrend)[number]) => month.laborRoadAccidents
                          }
                        ].map((chart) => {
                          const maxValue = Math.max(...accidentalidadMonthlyTrend.map((month) => chart.picker(month)), 1);
                          const minValue = Math.min(...accidentalidadMonthlyTrend.map((month) => chart.picker(month)));
                          return (
                            <div key={chart.title} className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">{chart.title}</p>
                              <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                                <div className="overflow-x-auto overflow-y-visible py-2">
                                  <div className="flex gap-3 justify-between min-w-max px-1">
                                    {accidentalidadMonthlyTrend.map((month) => {
                                      const value = chart.picker(month);
                                      const barHeight = getScaledBarHeight(value, maxValue);
                                      const barColor = getGreenBarColor(value, minValue, maxValue);
                                      return (
                                        <div key={`${chart.title}-${month.label}`} className="min-w-[72px] w-[72px] flex flex-col items-center">
                                          {renderSgiVerticalBar(
                                            String(Math.round(value)),
                                            barHeight,
                                            barColor,
                                            {
                                              barWidthClass: 'w-[48px]',
                                              title: `${month.label}: ${Math.round(value)}`
                                            }
                                          )}
                                          <div className="text-[11px] uppercase font-semibold text-gray-600 mt-2">{month.label}</div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '3' && (
                    <div className="space-y-4">
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Clasificación operativa (base de datos bd_AT_SV_IT_2026)</p>
                        <p className="text-[11px] text-gray-600 mt-1">
                          Tipo de vinculación, tipo de contratación, contrato/cliente, característica del evento y gravedad.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {renderAccidentalidadStatList(
                          'Tipo de vinculación',
                          accidentalidadLinkTypeStats.slice(0, 8).map((row) => ({ label: row.label, total: row.total }))
                        )}
                        {renderAccidentalidadStatList(
                          'Tipo de contratación',
                          accidentalidadContractTypeStats.slice(0, 8).map((row) => ({ label: row.label, total: row.total }))
                        )}
                        {renderAccidentalidadStatList(
                          'Contrato o cliente',
                          accidentalidadClientStats.slice(0, 8).map((row) => ({ label: row.label, total: row.total }))
                        )}
                        {renderAccidentalidadStatList(
                          'Característica del evento',
                          accidentalidadCharacteristicStats.slice(0, 8).map((row) => ({ label: row.label, total: row.total }))
                        )}
                        {renderAccidentalidadStatList(
                          'Clasificación por gravedad',
                          accidentalidadSeverityStats.map((row) => ({ label: row.label, total: row.total }))
                        )}
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {renderAccidentalidadStatList(
                          'Causas básicas (análisis tendencial por causalidad)',
                          accidentalidadBasicCauseStats.map((row) => ({ label: row.label, total: row.total, hint: row.label }))
                        )}
                        {renderAccidentalidadStatList(
                          'Causas inmediatas (análisis tendencial por daños)',
                          accidentalidadImmediateCauseStats.map((row) => ({ label: row.label, total: row.total, hint: row.label }))
                        )}
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Análisis de reincidencia de accidentados</p>
                        {accidentalidadReincidenceStats.length === 0 ? (
                          <p className="text-xs text-gray-500 bg-white border border-[#eaecf0] rounded-soft p-3">
                            No hay trabajadores con más de un evento en el filtro actual.
                          </p>
                        ) : (
                          <div className="overflow-x-auto bg-white border border-[#eaecf0] rounded-soft">
                            <table className="min-w-full text-xs">
                              <thead className="bg-[#f8f9fa] border-b border-[#eaecf0] text-left text-gray-600">
                                <tr>
                                  <th className="px-3 py-2">Cédula</th>
                                  <th className="px-3 py-2">Nombre</th>
                                  <th className="px-3 py-2 text-center">Eventos</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#eef1f5]">
                                {accidentalidadReincidenceStats.slice(0, 12).map((row) => (
                                  <tr key={`acc-reinc-${row.cedula}`}>
                                    <td className="px-3 py-2 font-mono">{row.cedula}</td>
                                    <td className="px-3 py-2">{row.employeeName}</td>
                                    <td className="px-3 py-2 text-center font-mono font-semibold text-[#ba1a1a]">{row.total}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '4' && (
                    <div className="space-y-4">
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">
                          ILI vs meta mensual · {accidentalidadIndicators.sourceYear}
                        </p>
                        <div className="overflow-x-auto overflow-y-visible py-2 bg-white border border-[#eaecf0] rounded-soft p-3">
                          <div className="flex gap-3 justify-between min-w-max px-1">
                            {accidentalidadIliMetaComparison.map((month) => {
                              const iliStyles = getAccidentalidadIliStatusStyles(month.status);
                              const maxIli = Math.max(...accidentalidadIliMetaComparison.map((row) => row.ili), 0.000001);
                              const barHeight = getScaledBarHeight(month.ili, maxIli);
                              const barColor =
                                month.status === 'ok' ? '#006b3d' : month.status === 'warn' ? '#ffd000' : '#ba1a1a';
                              return (
                                <div key={`acc-ili-${month.label}`} className="min-w-[88px] w-[88px] flex flex-col items-center">
                                  {renderSgiVerticalBar(
                                    month.ili.toFixed(4),
                                    barHeight,
                                    barColor,
                                    {
                                      barWidthClass: 'w-[52px]',
                                      title: `${month.label}: ILI ${month.ili.toFixed(6)} / meta ${month.meta.toFixed(6)}`
                                    }
                                  )}
                                  <div className="text-[11px] uppercase font-semibold text-gray-600 mt-2">{month.label}</div>
                                  <div className="text-[10px] text-gray-500">meta {month.meta.toFixed(4)}</div>
                                  <span className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${iliStyles.bg} ${iliStyles.text} ${iliStyles.border}`}>
                                    {iliStyles.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {renderAccidentalidadInformeSections(accidentalidadInformeSections, 'acc-tab4')}
                    </div>
                  )}
                </>
              )}
              {selectedServiceMenuItem === 'Medicina del trabajo' && (
                <MedicinaTrabajoSection
                  subIndicator={sgiSubIndicator}
                  indicators={medicinaIndicators}
                  referenceDate={medicinaReferenceDate}
                  monthlyTrend={medicinaMonthlyTrend}
                  trendYear={medicinaTrendYear}
                  cityStats={medicinaCityStats}
                  linkStats={medicinaLinkStats}
                  ipsStats={medicinaIpsStats}
                  contractStats={medicinaContractStats}
                  filteredRecords={medicinaFilteredRecords}
                  alertFilter={medicinaAlertFilter}
                  onAlertFilterChange={setMedicinaAlertFilter}
                />
              )}
              {selectedServiceMenuItem === 'Comportamientos inseguros' && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Reportes registrados</p>
                      <p className="text-2xl font-bold text-[#191c1d] mt-1">{unsafeMetrics.total}</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">% cerrados</p>
                      <p className="text-2xl font-bold text-[#006b3d] mt-1">{unsafeMetrics.closedRate.toFixed(1)}%</p>
                      <p className="text-[11px] text-gray-600">{unsafeMetrics.closed}/{unsafeMetrics.total} gestionados</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Alto riesgo</p>
                      <p className="text-2xl font-bold text-[#ba1a1a] mt-1">{unsafeMetrics.highRisk}</p>
                      <p className="text-[11px] text-gray-600">{unsafeMetrics.highRiskRate.toFixed(1)}% del total</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Promedio cierre</p>
                      <p className="text-2xl font-bold text-[#191c1d] mt-1">{unsafeMetrics.avgClosureDays.toFixed(1)}</p>
                      <p className="text-[11px] text-gray-600">días desde infracción</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Notificación</p>
                      <p className="text-2xl font-bold text-[#191c1d] mt-1">{unsafeMetrics.notifications}</p>
                      <p className="text-[11px] text-gray-600">casos notificados</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Conductor reincidente</p>
                      <p className="text-2xl font-bold text-[#ba1a1a] mt-1">{unsafeMetrics.recurrentDrivers}</p>
                      <p className="text-[11px] text-gray-600">con más de una infracción</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Cliente con más eventos</p>
                      <p className="text-sm font-bold text-[#191c1d] mt-1 line-clamp-2">{unsafeMetrics.topClient}</p>
                    </div>
                  </div>

                  {sgiSubIndicator === '1' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Estado de gestión</p>
                        <div className="bg-white border border-[#eaecf0] rounded-soft p-4 space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">Cerrados</span>
                            <span className="font-mono text-[#006b3d]">{unsafeStatusStats.closedRate.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#006b3d]" style={{ width: `${unsafeStatusStats.closedRate}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">Abiertos</span>
                            <span className="font-mono text-[#ba1a1a]">{unsafeStatusStats.openRate.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#ba1a1a]" style={{ width: `${unsafeStatusStats.openRate}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Top 5 códigos de infracción</p>
                        <div className="space-y-2">
                          {unsafeTopCodeMonthlyPeople.rows.map((row) => (
                            <div key={row.code} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[#191c1d]">Código {row.code}</span>
                                <span className="font-mono">{row.total}</span>
                              </div>
                              <div className="text-[11px] text-gray-600 mt-1 line-clamp-2">{row.description}</div>
                              <div className="h-2 mt-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#006b3d]"
                                  style={{ width: `${(row.total / Math.max(...unsafeTopCodeMonthlyPeople.rows.map((item) => item.total), 1)) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '2' && (
                    <div className="space-y-4">
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Eventos por ciudad</p>
                        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                          <div className="space-y-2">
                            {unsafeCityStats.map((row) => (
                              <div key={row.city} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-[#191c1d]">{row.city}</span>
                                  <span className="font-mono">{row.total} reportes</span>
                                </div>
                                <div className="text-[11px] text-gray-500 mt-1">Alto riesgo: {row.highRisk} ({row.highRiskRate.toFixed(1)}%)</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Tipo de contrato</p>
                          <div className="space-y-2">
                            {unsafeContractStats.map((row) => (
                              <div key={row.contractType} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 flex items-center justify-between text-xs">
                                <span className="font-semibold text-[#191c1d]">{row.contractType}</span>
                                <span className="font-mono">{row.total}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Tipo de acción</p>
                          <div className="space-y-2">
                            {unsafeActionStats.map((row) => (
                              <div key={row.actionType} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 flex items-center justify-between text-xs">
                                <span className="font-semibold text-[#191c1d]">{row.actionType}</span>
                                <span className="font-mono">{row.total}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Distribución por criticidad</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {unsafeRiskStats.map((row) => (
                            <div key={row.level} className="bg-white border border-[#eaecf0] rounded-soft p-3">
                              <div className="text-[11px] text-gray-500">{row.level}</div>
                              <div className="text-xl font-bold mt-1" style={{ color: row.color }}>{row.total}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '3' && (
                    <div className="space-y-4">
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Tendencia mensual</p>
                        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                          <div className="overflow-x-auto overflow-y-visible py-2">
                            <div className="flex gap-3 justify-between min-w-max px-1">
                              {unsafeMonthlyTrend.map((month) => {
                                const maxValue = Math.max(...unsafeMonthlyTrend.map((item) => item.total), 1);
                                return (
                                  <div key={month.label} className="min-w-[90px] flex flex-col items-center">
                                    {renderSgiGroupedVerticalBars(
                                      [
                                        {
                                          value: month.total,
                                          color: '#ba1a1a',
                                          title: `Reportados: ${month.total}`
                                        },
                                        {
                                          value: month.closed,
                                          color: '#006b3d',
                                          title: `Cerrados: ${month.closed}`
                                        }
                                      ],
                                      maxValue,
                                      { barWidthClass: 'w-[22px]', columnWidthClass: 'w-[28px]' }
                                    )}
                                    <div className="text-[11px] uppercase font-semibold text-gray-600 mt-2">{month.label}</div>
                                    <div className="text-[11px] text-gray-500">Cierre {month.closedRate.toFixed(1)}%</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" /> Reportados</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#006b3d]" /> Cerrados</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">
                          Código infracción: Top 5 (personas con infracción mes a mes)
                        </p>
                        <div className="overflow-x-auto bg-white border border-[#eaecf0] rounded-soft">
                          <table className="min-w-full text-xs">
                            <thead className="bg-[#f8f9fa] border-b border-[#eaecf0] text-left text-gray-600">
                              <tr>
                                <th className="px-3 py-2">Código</th>
                                <th className="px-3 py-2">Descripción</th>
                                <th className="px-3 py-2">Total</th>
                                {unsafeTopCodeMonthlyPeople.months.map((month) => (
                                  <th key={month.key} className="px-3 py-2">{month.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eef1f5]">
                              {unsafeTopCodeMonthlyPeople.rows.map((row) => (
                                <tr key={`top-code-${row.code}`}>
                                  <td className="px-3 py-2 font-semibold">{row.code}</td>
                                  <td className="px-3 py-2 min-w-[280px]">{row.description}</td>
                                  <td className="px-3 py-2 font-mono">{row.total}</td>
                                  {row.perMonth.map((count, index) => (
                                    <td key={`code-${row.code}-m-${index}`} className="px-3 py-2 text-center font-mono">{count}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '4' && (
                    <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Casos priorizados de seguimiento</p>
                      <div className="overflow-x-auto bg-white border border-[#eaecf0] rounded-soft">
                        <table className="min-w-full text-xs">
                          <thead className="bg-[#f8f9fa] border-b border-[#eaecf0] text-left text-gray-600">
                            <tr>
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Conductor</th>
                              <th className="px-3 py-2">Tipo de contrato</th>
                              <th className="px-3 py-2">Cliente</th>
                              <th className="px-3 py-2">Ciudad</th>
                              <th className="px-3 py-2">Código</th>
                              <th className="px-3 py-2">Tipo de acción</th>
                              <th className="px-3 py-2">Fecha notificación</th>
                              <th className="px-3 py-2">Riesgo</th>
                              <th className="px-3 py-2">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#eef1f5]">
                            {unsafeFollowupRows.map((row) => (
                              <tr key={row.id}>
                                <td className="px-3 py-2">{row.dateLabel}</td>
                                <td className="px-3 py-2">{row.driverName}</td>
                                <td className="px-3 py-2">{row.contractType || 'Sin dato'}</td>
                                <td className="px-3 py-2">{row.client}</td>
                                <td className="px-3 py-2">{row.city}</td>
                                <td className="px-3 py-2">{row.code || 'N/A'}</td>
                                <td className="px-3 py-2">{row.actionType || 'Sin dato'}</td>
                                <td className="px-3 py-2">{formatShortDate(row.notificationDate)}</td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      row.riskLevel === 'Alto'
                                        ? 'bg-red-100 text-red-700'
                                        : row.riskLevel === 'Medio'
                                          ? 'bg-yellow-100 text-yellow-700'
                                          : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                  >
                                    {row.riskLevel}
                                  </span>
                                </td>
                                <td className="px-3 py-2">{row.isClosed ? 'Cerrado' : 'Abierto'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
              {selectedServiceMenuItem === 'Incapacidades' && (
                <>
                  {!incapYearFilter && (
                    <p className="text-[11px] text-gray-500">
                      Indicadores FT-GEI-SO-016 mostrando cierre {incapIndicatorsFromInforme.sourceYear}. Seleccione un año para ver el cierre de 2023, 2024, 2025 o 2026.
                    </p>
                  )}
                  {incapYearFilter && !incapIndicatorsFromInforme.hasInforme && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-soft px-3 py-2">
                      No hay informe FT-GEI-SO-016 consolidado para {incapYearFilter}. Los indicadores del informe están disponibles para 2023, 2024, 2025 y 2026.
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Tasa global ausentismo</p>
                      <p className="text-2xl font-bold text-[#00502c] mt-1">{(incapIndicatorsFromInforme.globalRate * 100).toFixed(2)}%</p>
                      <p className="text-[10px] text-gray-500 mt-1">EG + AC + AT + EL</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Tasa Global de ausentismo EG-AC</p>
                      <p className="text-2xl font-bold text-[#00502c] mt-1">{(incapIndicatorsFromInforme.egAcGlobalRate * 100).toFixed(2)}%</p>
                      <p className="text-[10px] text-gray-500 mt-1">Enfermedad general y accidente común</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Ausentismo causa médica</p>
                      <p className="text-2xl font-bold text-[#00502c] mt-1">{(incapIndicatorsFromInforme.medicalCause * 100).toFixed(2)}%</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Días Incapacidad EG-AC</p>
                      <p className="text-2xl font-bold text-[#006b3d] mt-1">{Math.round(incapIndicatorsFromInforme.egDays || incapCurrentMetrics.egAcDays)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Enfermedad general y accidente común</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Días incapacidad AT</p>
                      <p className="text-2xl font-bold text-[#ba1a1a] mt-1">{Math.round(incapIndicatorsFromInforme.atDays || incapCurrentMetrics.atDays)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Accidente Trabajo</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Personal EG-AC</p>
                      <p className="text-2xl font-bold text-[#191c1d] mt-1">{Math.round(incapIndicatorsFromInforme.egPeople || incapCurrentMetrics.egPeople)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Enfermedad general y accidente común</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Personal AT</p>
                      <p className="text-2xl font-bold text-[#191c1d] mt-1">{Math.round(incapIndicatorsFromInforme.atPeople || incapCurrentMetrics.atPeople)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Accidente Trabajo</p>
                    </div>
                  </div>

                  {sgiSubIndicator === '1' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4 xl:col-span-2">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">
                            Indicadores consolidados FT-GEI-SO-016
                            {incapIndicatorsFromInforme.sourceYear ? ` · cierre ${incapIndicatorsFromInforme.sourceYear}` : ''}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                              <p className="text-[10px] uppercase text-gray-500">Índice Frecuencia Ausentismo</p>
                              <p className="text-lg font-bold text-[#191c1d] mt-1">{incapIndicatorsFromInforme.frequency.toFixed(2)}</p>
                            </div>
                            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                              <p className="text-[10px] uppercase text-gray-500">Índice Severidad Ausentismo</p>
                              <p className="text-lg font-bold text-[#191c1d] mt-1">{incapIndicatorsFromInforme.severity.toFixed(2)}</p>
                            </div>
                            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                              <p className="text-[10px] uppercase text-gray-500">Total días incapacidad EG-AC+AT+EL</p>
                              <p className="text-lg font-bold text-[#191c1d] mt-1">{Math.round(incapIndicatorsFromInforme.egDays + incapIndicatorsFromInforme.atDays + incapIndicatorsFromInforme.elIncapacityDays || incapCurrentMetrics.totalDays)}</p>
                            </div>
                            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                              <p className="text-[10px] uppercase text-gray-500 leading-snug">Tasa de Mortalidad por EG - AC</p>
                              <p className="text-lg font-bold text-[#191c1d] mt-1">{incapIndicatorsFromInforme.egAcMortalityRate.toFixed(4)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Enfermedad laboral</p>
                          <div className="space-y-2">
                            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                              <p className="text-[10px] uppercase text-gray-500">Días de enfermedad laboral</p>
                              <p className={`text-xl font-bold mt-1 ${incapIndicatorsFromInforme.elLaborDays === 0 ? 'text-[#006b3d]' : 'text-[#ba1a1a]'}`}>{Math.round(incapIndicatorsFromInforme.elLaborDays)}</p>
                            </div>
                            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                              <p className="text-[10px] uppercase text-gray-500">Prevalencia por Enfermedad Laboral</p>
                              <p className={`text-xl font-bold mt-1 ${incapIndicatorsFromInforme.elPrevalence === 0 ? 'text-[#006b3d]' : 'text-[#ba1a1a]'}`}>{incapIndicatorsFromInforme.elPrevalence.toFixed(4)}</p>
                            </div>
                            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                              <p className="text-[10px] uppercase text-gray-500">Severidad por Enfermedad Laboral</p>
                              <p className={`text-xl font-bold mt-1 ${incapIndicatorsFromInforme.elSeverity === 0 ? 'text-[#006b3d]' : 'text-[#ba1a1a]'}`}>{incapIndicatorsFromInforme.elSeverity.toFixed(4)}</p>
                            </div>
                            <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                              <p className="text-[10px] uppercase text-gray-500">Incidencia por Enfermedad Laboral</p>
                              <p className={`text-xl font-bold mt-1 ${incapIndicatorsFromInforme.elIncidence === 0 ? 'text-[#006b3d]' : 'text-[#ba1a1a]'}`}>{incapIndicatorsFromInforme.elIncidence.toFixed(4)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '2' && (
                    <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Tendencia mensual de incapacidades</p>
                      <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                        <div className="overflow-x-auto overflow-y-visible py-2">
                          <div className="flex gap-3 justify-between min-w-max px-1">
                            {incapMonthlyStats.map((month) => {
                              const maxValue = Math.max(...incapMonthlyStats.map((item) => item.totalDays), 1);
                              return (
                                <div key={`inc-month-${month.month}`} className="min-w-[95px] flex flex-col items-center">
                                  {renderSgiGroupedVerticalBars(
                                    [
                                      {
                                        value: month.egDays,
                                        color: '#006b3d',
                                        title: `EG-AC: ${month.egDays} días`
                                      },
                                      {
                                        value: month.atDays,
                                        color: '#ba1a1a',
                                        title: `AT: ${month.atDays} días`
                                      }
                                    ],
                                    maxValue,
                                    { barWidthClass: 'w-[22px]', columnWidthClass: 'w-[28px]' }
                                  )}
                                  <div className="text-[11px] uppercase font-semibold text-gray-600 mt-2">{month.label}</div>
                                  <div className="text-[11px] text-gray-500">{month.peopleCount} personas · {month.totalDays} días</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#006b3d]" /> EG-AC — Enfermedad general y accidente común</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" /> AT — Accidente Trabajo</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '3' && (
                    <div className="space-y-4">
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Top 10 diagnósticos por código DX</p>
                        <div className="space-y-2">
                          {incapDxTop10.map((row) => (
                            <div key={`incap-dx-${row.code}`} className="bg-white border border-[#eaecf0] rounded-soft p-2.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[#191c1d]">{row.code}</span>
                                <span className="font-mono">{row.cases} soportes</span>
                              </div>
                              <div className="text-[11px] text-gray-600 mt-1">{row.description}</div>
                              <div className="text-[11px] text-gray-500 mt-1">{row.peopleCount} personas • {row.days} días</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Top 5 DX: personas con incapacidad mes a mes</p>
                        <div className="overflow-x-auto bg-white border border-[#eaecf0] rounded-soft">
                          <table className="min-w-full text-xs">
                            <thead className="bg-[#f8f9fa] border-b border-[#eaecf0] text-left text-gray-600">
                              <tr>
                                <th className="px-3 py-2">Código</th>
                                <th className="px-3 py-2">Diagnóstico</th>
                                {incapDxMonthlyTop5.monthLabels.map((month) => (
                                  <th key={`incap-dx-month-${month}`} className="px-3 py-2 text-center">
                                    {new Date(2026, month - 1, 1).toLocaleDateString('es-CO', { month: 'short' })}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eef1f5]">
                              {incapDxMonthlyTop5.rows.map((row) => (
                                <tr key={`incap-dx-row-${row.code}`}>
                                  <td className="px-3 py-2 font-semibold">{row.code}</td>
                                  <td className="px-3 py-2 min-w-[280px]">{row.description}</td>
                                  {row.perMonth.map((count, index) => (
                                    <td key={`incap-dx-${row.code}-${index}`} className="px-3 py-2 text-center font-mono">{count}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '4' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Contrato / Cliente</p>
                          <div className="space-y-2">
                            {incapClientStats.map((row) => (
                              <div key={`inc-client-${row.client}`} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 text-xs">
                                <div className="font-semibold text-[#191c1d]">{row.client}</div>
                                <div className="text-gray-500 mt-1">{row.cases} soportes • {row.days} días</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Tipo de contrato</p>
                          <div className="space-y-2">
                            {incapContractStats.map((row) => (
                              <div key={`inc-contract-${row.contractType}`} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 text-xs flex items-center justify-between">
                                <span className="font-semibold text-[#191c1d]">{row.contractType}</span>
                                <span className="font-mono">{row.cases}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Tipo de incapacidad</p>
                          <div className="space-y-2">
                            {incapTypeStats.map((row) => (
                              <div key={`inc-type-${row.incapType}`} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 text-xs">
                                <div className="font-semibold text-[#191c1d]">{row.incapType}</div>
                                <div className="text-gray-500 mt-1">{row.cases} soportes • {row.days} días</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Distribución por género</p>
                          <div className="space-y-2">
                            {incapGenderStats.map((row) => {
                              const maxCases = Math.max(...incapGenderStats.map((item) => item.cases), 1);
                              const width = (row.cases / maxCases) * 100;
                              const barColor = normalizeText(row.gender) === 'femenino' ? '#ffd000' : '#006b3d';
                              return (
                                <div key={`inc-gender-${row.gender}`} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-[#191c1d]">{row.gender}</span>
                                    <span className="font-mono">{row.cases} soportes</span>
                                  </div>
                                  <div className="h-2 bg-[#eef1f5] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: barColor }} />
                                  </div>
                                  <div className="text-gray-500 mt-1">{row.people} personas • {row.days} días</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4 xl:col-span-2">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Entidad que paga la incapacidad</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {incapPayerStats.map((row) => (
                              <div key={`inc-payer-${row.payerEntity}`} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 text-xs">
                                <div className="font-semibold text-[#191c1d] leading-snug">{row.payerEntity}</div>
                                <div className="text-gray-500 mt-1">{row.cases} soportes • {row.days} días</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Distribución por ciudad</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                          {incapCityStats.map((row) => (
                            <div key={`inc-city-${row.city}`} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 text-xs">
                              <div className="font-semibold text-[#191c1d]">{row.city}</div>
                              <div className="text-gray-500 mt-1">{row.cases} soportes • {row.days} días</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {selectedServiceMenuItem === 'Formación' && (
                <>
                  {sgiSubIndicator === '1' && !formacionYearFilter && (
                    <p className="text-[11px] text-gray-500">
                      Indicadores consolidados mostrando cierre {formacionIndicatorsFromInforme.sourceYear}. Seleccione un año para filtrar la base de participantes.
                    </p>
                  )}
                  {sgiSubIndicator === '1' && formacionYearFilter && !formacionIndicatorsFromInforme.hasInforme && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-soft px-3 py-2">
                      No hay informe consolidado de formación para {formacionYearFilter}.
                    </p>
                  )}
                  {sgiSubIndicator === '1' && !formacionHasIncapEmployeesSource && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-soft px-3 py-2">
                      Personal activo y cobertura requieren el informe FT-GEI-SO-016 de Incapacidades para {formacionIncapLinkYear}.
                    </p>
                  )}
                  {sgiSubIndicator === '1' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Temas programados</p>
                      <p className="text-2xl font-bold text-[#00502c] mt-1">{Math.round(formacionKpiProgrammedActivities)}</p>
                      {formacionSelectedMonthIndex !== null && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          Mes {FORMACION_INFORME_MONTH_LABELS[formacionSelectedMonthIndex]}
                        </p>
                      )}
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Temas ejecutados</p>
                      <p className="text-2xl font-bold text-[#006b3d] mt-1">{Math.round(formacionIndicatorsFromInforme.executedActivities)}</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Personal activo</p>
                      <p className="text-2xl font-bold text-[#191c1d] mt-1">{Math.round(formacionKpiActiveStaff)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {formacionSelectedMonthIndex === null
                          ? 'Consolidado anual · No. de Empleados FT-GEI-SO-016'
                          : `${FORMACION_INFORME_MONTH_LABELS[formacionSelectedMonthIndex]} · No. de Empleados FT-GEI-SO-016`}
                      </p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Participantes</p>
                      <p className="text-2xl font-bold text-[#191c1d] mt-1">{Math.round(formacionIndicatorsFromInforme.participatingPeople)}</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">HHF</p>
                      <p className="text-2xl font-bold text-[#00502c] mt-1">{Math.round(formacionIndicatorsFromInforme.hhf)}</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Evaluaciones aprobadas ≥75</p>
                      <p className="text-2xl font-bold text-[#006b3d] mt-1">{Math.round(formacionIndicatorsFromInforme.approvedEvaluations)}</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Cumplimiento</p>
                      <p className="text-2xl font-bold text-[#00502c] mt-1">{formacionIndicatorsFromInforme.complianceRate.toFixed(2)}%</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Eficacia</p>
                      <p className="text-2xl font-bold text-[#00502c] mt-1">{formacionIndicatorsFromInforme.efficacyRate.toFixed(2)}%</p>
                    </div>
                    <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Cobertura</p>
                      <p className="text-2xl font-bold text-[#00502c] mt-1">{formacionIndicatorsFromInforme.coverageRate.toFixed(2)}%</p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Participantes ÷ personal activo ({Math.round(formacionIndicatorsFromInforme.participatingPeople)} ÷ {Math.round(formacionIndicatorsFromInforme.activeStaff)})
                      </p>
                    </div>
                  </div>
                  )}

                  {sgiSubIndicator === '1' && (
                    <div className="space-y-4">
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Cobertura mensual</p>
                        <p className="text-[10px] text-gray-500 mb-3">
                          Personal activo = No. de Empleados (FT-GEI-SO-016 Incapacidades) · Cobertura = participantes ÷ personal activo
                        </p>
                        <div className="overflow-x-auto bg-white border border-[#eaecf0] rounded-soft">
                          <table className="min-w-full text-xs">
                            <thead className="bg-[#f8f9fa] border-b border-[#eaecf0] text-left text-gray-600">
                              <tr>
                                <th className="px-3 py-2 min-w-[160px]">Indicador</th>
                                {FORMACION_INFORME_MONTH_LABELS.map((month) => (
                                  <th key={`form-coverage-head-${month}`} className="px-2 py-2 text-center">{month}</th>
                                ))}
                                <th className="px-2 py-2 text-center bg-[#eceff3]">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eef1f5]">
                              <tr>
                                <td className="px-3 py-2 font-medium text-[#191c1d]">Personal activo</td>
                                {formacionActiveStaffFromIncap.map((value, index) => (
                                  <td key={`form-active-${index}`} className="px-2 py-2 text-center font-mono bg-[#eceff3]">{Math.round(value)}</td>
                                ))}
                                <td className="px-2 py-2 text-center font-mono bg-[#eceff3] font-semibold">
                                  {Math.round(formacionIndicatorsFromInforme.activeStaff)}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium text-[#191c1d]">Participantes formación</td>
                                {formacionMonthlyStats.map((month) => (
                                  <td key={`form-participants-${month.month}`} className="px-2 py-2 text-center font-mono">{month.participantsCount}</td>
                                ))}
                                <td className="px-2 py-2 text-center font-mono bg-[#eceff3] font-semibold">
                                  {Math.round(formacionIndicatorsFromInforme.participatingPeople)}
                                </td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 font-medium text-[#191c1d]">Cobertura (%)</td>
                                {formacionMonthlyStats.map((month) => (
                                  <td key={`form-coverage-${month.month}`} className="px-2 py-2 text-center font-mono text-[#00502c] font-semibold">
                                    {month.coverageRate.toFixed(2)}%
                                  </td>
                                ))}
                                <td className="px-2 py-2 text-center font-mono bg-[#eceff3] font-semibold text-[#00502c]">
                                  {formacionIndicatorsFromInforme.coverageRate.toFixed(2)}%
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Participantes y sesiones por mes</p>
                        <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                          <div className="overflow-x-auto overflow-y-visible py-2">
                            <div className="flex gap-2 justify-between min-w-max px-1">
                              {formacionMonthlyStats.map((month) => {
                                const maxValue = Math.max(
                                  ...formacionMonthlyStats.map((item) =>
                                    Math.max(item.participantsCount, item.sessionsCount)
                                  ),
                                  1
                                );
                                return (
                                  <div key={`form-month-${month.month}`} className="min-w-[84px] flex flex-col items-center">
                                    {renderSgiGroupedVerticalBars(
                                      [
                                        {
                                          value: month.participantsCount,
                                          color: '#006b3d',
                                          title: `Participantes únicos: ${month.participantsCount}`
                                        },
                                        {
                                          value: month.sessionsCount,
                                          color: '#ffd000',
                                          title: `Sesiones ejecutadas: ${month.sessionsCount}`
                                        }
                                      ],
                                      maxValue,
                                      { barWidthClass: 'w-[22px]', columnWidthClass: 'w-[28px]' }
                                    )}
                                    <div className="text-[11px] uppercase font-semibold text-gray-600 mt-2">{month.label}</div>
                                    <div className="text-[10px] text-gray-500">{month.coverageRate.toFixed(1)}% cobertura</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#006b3d]" /> Participantes únicos</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ffd000]" /> Sesiones ejecutadas</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '2' && (
                    <div className="space-y-4">
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                            Formación virtual y momentos de seguridad
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Calculado desde BD participantes · modalidad virtual y temas identificados
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                          <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Temas tratados virtual</p>
                            <p className="text-2xl font-bold text-[#00502c] mt-1">{formacionSpecialMetrics.virtualTopicsTreated}</p>
                            <p className="text-[10px] text-gray-500 mt-1">Sesiones virtuales distintas (excluye momentos de seguridad)</p>
                          </div>
                          <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Participación temas virtuales</p>
                            <p className="text-2xl font-bold text-[#006b3d] mt-1">{formacionSpecialMetrics.virtualTopicsParticipation}</p>
                            <p className="text-[10px] text-gray-500 mt-1">Personas únicas en formación virtual</p>
                          </div>
                          <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Momentos de seguridad</p>
                            <p className="text-2xl font-bold text-[#191c1d] mt-1">{formacionSpecialMetrics.safetyMoments}</p>
                            <p className="text-[10px] text-gray-500 mt-1">Sesiones de momento de seguridad ejecutadas</p>
                          </div>
                          <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Participación momentos de seguridad</p>
                            <p className="text-2xl font-bold text-[#191c1d] mt-1">{formacionSpecialMetrics.safetyMomentsParticipation}</p>
                            <p className="text-[10px] text-gray-500 mt-1">Personas únicas en momentos de seguridad</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Seguimiento mensual virtual y momentos de seguridad</p>
                        <div className="overflow-x-auto bg-white border border-[#eaecf0] rounded-soft">
                          <table className="min-w-full text-xs">
                            <thead className="bg-[#f8f9fa] border-b border-[#eaecf0] text-left text-gray-600">
                              <tr>
                                <th className="px-3 py-2 min-w-[220px]">Indicador</th>
                                {FORMACION_INFORME_MONTH_LABELS.map((month) => (
                                  <th key={`form-special-head-${month}`} className="px-2 py-2 text-center">{month}</th>
                                ))}
                                <th className="px-2 py-2 text-center bg-[#eceff3]">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#eef1f5]">
                              {[
                                { label: 'Temas tratados virtual', values: formacionSpecialMetrics.monthlyVirtualTopics, total: formacionSpecialMetrics.virtualTopicsTreated },
                                { label: 'Participación temas virtuales', values: formacionSpecialMetrics.monthlyVirtualParticipation, total: formacionSpecialMetrics.virtualTopicsParticipation },
                                { label: 'Momentos de seguridad', values: formacionSpecialMetrics.monthlySafetyMoments, total: formacionSpecialMetrics.safetyMoments },
                                { label: 'Participación momentos de seguridad', values: formacionSpecialMetrics.monthlySafetyParticipation, total: formacionSpecialMetrics.safetyMomentsParticipation }
                              ].map((row) => (
                                <tr key={`form-special-row-${row.label}`}>
                                  <td className="px-3 py-2 font-medium text-[#191c1d]">{row.label}</td>
                                  {row.values.map((value, index) => (
                                    <td key={`${row.label}-${index}`} className="px-2 py-2 text-center font-mono">{value}</td>
                                  ))}
                                  <td className="px-2 py-2 text-center font-mono bg-[#eceff3] font-semibold">{row.total}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Formación por modalidad</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                          {formacionModalityStats.map((row) => (
                            <div key={`form-modality-${row.modality}`} className="bg-white border border-[#eaecf0] rounded-soft p-3 text-xs">
                              <div className="font-semibold text-[#191c1d]">{row.modality}</div>
                              <div className="text-gray-500 mt-1">{row.sessionsCount} sesiones • {row.participantsCount} participantes • {Math.round(row.hhf)} HHF</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '3' && (
                    <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Top clientes por participación</p>
                      <div className="space-y-2">
                        {formacionClientStats.map((row) => (
                          <div key={`form-client-${row.client}`} className="bg-white border border-[#eaecf0] rounded-soft p-2.5 text-xs">
                            <div className="font-semibold text-[#191c1d]">{row.client}</div>
                            <div className="text-gray-500 mt-1">{row.sessionsCount} sesiones • {row.participantsCount} participantes • {Math.round(row.hhf)} HHF • {row.approvedCount} aprobados</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sgiSubIndicator === '4' && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Resumen evaluaciones</p>
                        <div className="space-y-2">
                          <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                            <p className="text-[10px] uppercase text-gray-500">Total evaluados</p>
                            <p className="text-xl font-bold text-[#191c1d] mt-1">{formacionEvaluationStats.total}</p>
                          </div>
                          <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                            <p className="text-[10px] uppercase text-gray-500">Aprobados ≥75</p>
                            <p className="text-xl font-bold text-[#006b3d] mt-1">{formacionEvaluationStats.approved}</p>
                          </div>
                          <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                            <p className="text-[10px] uppercase text-gray-500">Por debajo de 75</p>
                            <p className="text-xl font-bold text-[#ba1a1a] mt-1">{formacionEvaluationStats.belowThreshold}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-4 xl:col-span-2">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3">Indicadores de asistencia y evaluación</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                            <p className="text-[10px] uppercase text-gray-500">Promedio puntaje</p>
                            <p className="text-2xl font-bold text-[#191c1d] mt-1">{formacionEvaluationStats.averageScore.toFixed(1)}</p>
                          </div>
                          <div className="bg-white border border-[#eaecf0] rounded-soft p-3">
                            <p className="text-[10px] uppercase text-gray-500">Tasa aprobación</p>
                            <p className="text-2xl font-bold text-[#006b3d] mt-1">{formacionEvaluationStats.approvalRate.toFixed(2)}%</p>
                          </div>
                        </div>
                        <div className="mt-4 bg-white border border-[#eaecf0] rounded-soft p-3">
                          <p className="text-[10px] uppercase text-gray-500 mb-2">Aprobación mensual (%)</p>
                          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                            {formacionMonthlyStats.map((month) => (
                              <div key={`form-approval-${month.month}`} className="text-center">
                                <div className="text-[10px] font-mono text-[#006b3d]">{month.approvalRate.toFixed(0)}%</div>
                                <div className="text-[10px] text-gray-500">{month.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
                </>
              )}

              {!isLoadingSst && !sstLoadError && selectedServiceMenuItem === 'Acompañamiento presencial' && sgiCanEditDatasets && showDbDetailPanel && (
                <div className="border border-[#eaecf0] rounded-soft overflow-hidden">
                  <div className="bg-[#f8f9fa] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Ingreso base de datos (agenda completa SST)
                    </div>
                    <DemoExcelUploadButton onFileSelected={handleDemoExcelUpload} loading={isDemoExcelLoading} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-white border-b border-[#eaecf0]">
                        <tr className="text-left text-gray-600">
                          <th className="px-3 py-2">Cliente - Lugar visita</th>
                          <th className="px-3 py-2">Ciudad</th>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2">Gestor logístico</th>
                          <th className="px-3 py-2">Ejecutada</th>
                          <th className="px-3 py-2">Actividad gestor</th>
                          <th className="px-3 py-2">Integrante área SGI</th>
                          <th className="px-3 py-2">Acompañamiento área SGI</th>
                          <th className="px-3 py-2">Estado visita</th>
                          <th className="px-3 py-2 text-right">Cant. personal impactado</th>
                          <th className="px-3 py-2">Temas abordados</th>
                          <th className="px-3 py-2">Acciones</th>
                        </tr>
                        <tr className="border-t border-[#eef1f5] bg-[#f8f9fa]">
                          <th className="px-2 py-2"><input list="db-client-options" value={dbForm.client} onChange={(e) => setDbForm((p) => ({ ...p, client: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="db-city-options" value={dbForm.city} onChange={(e) => setDbForm((p) => ({ ...p, city: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input type="date" value={dbForm.date} onChange={(e) => setDbForm((p) => ({ ...p, date: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="db-gestor-options" value={dbForm.gestor} onChange={(e) => setDbForm((p) => ({ ...p, gestor: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2">
                            <select value={dbForm.executed} onChange={(e) => setDbForm((p) => ({ ...p, executed: e.target.value as '' | 'SI' | 'NO' }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1">
                              <option value="">Seleccionar</option>
                              <option value="SI">SI</option>
                              <option value="NO">NO</option>
                            </select>
                          </th>
                          <th className="px-2 py-2"><input list="db-accompaniment-options" value={dbForm.accompanimentText} onChange={(e) => setDbForm((p) => ({ ...p, accompanimentText: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="db-sgi-options" value={dbForm.sgiCompanion} onChange={(e) => setDbForm((p) => ({ ...p, sgiCompanion: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="db-area-options" value={dbForm.area} onChange={(e) => setDbForm((p) => ({ ...p, area: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="db-status-options" value={dbForm.estadoVisita} onChange={(e) => setDbForm((p) => ({ ...p, estadoVisita: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input type="number" list="db-impacted-options" value={dbForm.impactedPeople} onChange={(e) => setDbForm((p) => ({ ...p, impactedPeople: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1 text-right" /></th>
                          <th className="px-2 py-2"><input list="db-topics-options" value={dbForm.topics} onChange={(e) => setDbForm((p) => ({ ...p, topics: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2">
                            <div className="flex gap-1">
                              <button type="button" onClick={handleDbFormSubmit} className="px-2 py-1 bg-[#006b3d] text-white rounded-soft text-[11px] font-semibold">
                                {editingVisitId ? 'Guardar' : 'Agregar'}
                              </button>
                              {editingVisitId && (
                                <button type="button" onClick={resetDbForm} className="px-2 py-1 border border-[#d6dce5] rounded-soft text-[11px]">
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f5]">
                        {sstVisits.map((visit) => (
                          <tr key={visit.id} className="bg-white">
                            <td className="px-3 py-2">{visit.client}</td>
                            <td className="px-3 py-2">{visit.city}</td>
                            <td className="px-3 py-2">{visit.dateLabel}</td>
                            <td className="px-3 py-2">{visit.gestor}</td>
                            <td className="px-3 py-2">{visit.executed ? 'SI' : 'NO'}</td>
                            <td className="px-3 py-2">{visit.accompanimentText}</td>
                            <td className="px-3 py-2">{visit.sgiCompanion || 'Sin asignar SGI'}</td>
                            <td className="px-3 py-2">{visit.area || 'Sin dato'}</td>
                            <td className="px-3 py-2">{visit.estadoVisita || (visit.executed ? 'Ejecutada' : 'Sin ejecutar')}</td>
                            <td className="px-3 py-2 text-right font-mono">{visit.impactedPeople}</td>
                            <td className="px-3 py-2">{visit.topics}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => handleEditVisit(visit)}
                                className="px-2 py-1 border border-[#d6dce5] rounded-soft text-[11px] text-gray-700 hover:bg-gray-50"
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <datalist id="db-client-options">
                      {dbFilterOptions.client.map((option) => <option key={`client-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="db-city-options">
                      {dbFilterOptions.city.map((option) => <option key={`city-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="db-date-options">
                      {dbFilterOptions.date.map((option) => <option key={`date-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="db-gestor-options">
                      {dbFilterOptions.gestor.map((option) => <option key={`gestor-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="db-accompaniment-options">
                      {dbFilterOptions.accompanimentText.map((option) => <option key={`acomp-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="db-sgi-options">
                      {dbFilterOptions.sgiCompanion.map((option) => <option key={`sgi-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="db-area-options">
                      {dbFilterOptions.area.map((option) => <option key={`area-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="db-status-options">
                      {dbFilterOptions.estadoVisita.map((option) => <option key={`status-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="db-impacted-options">
                      {dbFilterOptions.impactedPeople.map((option) => <option key={`impact-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="db-topics-options">
                      {dbFilterOptions.topics.map((option) => <option key={`topic-${option}`} value={option} />)}
                    </datalist>
                  </div>
                </div>
              )}

              {selectedServiceMenuItem === 'Comportamientos inseguros' && sgiCanEditDatasets && showDbDetailPanel && (
                <div className="border border-[#eaecf0] rounded-soft overflow-hidden">
                  <div className="bg-[#f8f9fa] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Ingreso base de datos
                    </div>
                    <DemoExcelUploadButton onFileSelected={handleDemoExcelUpload} loading={isDemoExcelLoading} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-white border-b border-[#eaecf0] text-left text-gray-600">
                        <tr>
                          <th className="px-3 py-2">Cédula</th>
                          <th className="px-3 py-2">Nombre completo</th>
                          <th className="px-3 py-2">Cliente</th>
                          <th className="px-3 py-2">Tipo de contrato</th>
                          <th className="px-3 py-2">Ciudad</th>
                          <th className="px-3 py-2">Fecha infracción</th>
                          <th className="px-3 py-2">Lugar infracción</th>
                          <th className="px-3 py-2">Código</th>
                          <th className="px-3 py-2">Placa</th>
                          <th className="px-3 py-2">Descripción infracciones</th>
                          <th className="px-3 py-2">Valor infracción</th>
                          <th className="px-3 py-2">Mes</th>
                          <th className="px-3 py-2">Año</th>
                          <th className="px-3 py-2">Tipo de acción</th>
                          <th className="px-3 py-2">Fecha notificación</th>
                          <th className="px-3 py-2">Clase de capacitación</th>
                          <th className="px-3 py-2">Control</th>
                          <th className="px-3 py-2">Estado empleado</th>
                          <th className="px-3 py-2">Devolución notificación firmada</th>
                          <th className="px-3 py-2">Capacitación y evaluación</th>
                          <th className="px-3 py-2">Infracción en desarrollo de labor</th>
                          <th className="px-3 py-2">Entrega comprobante de pago</th>
                          <th className="px-3 py-2">Observaciones</th>
                          <th className="px-3 py-2">Acciones</th>
                        </tr>
                        <tr className="border-t border-[#eef1f5] bg-[#f8f9fa]">
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-cedula-options"
                              value={unsafeForm.cedula}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, cedula: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-driver-options"
                              value={unsafeForm.driverName}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, driverName: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-client-options"
                              value={unsafeForm.client}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, client: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-contract-options"
                              value={unsafeForm.contractType}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, contractType: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-city-options"
                              value={unsafeForm.city}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, city: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              type="date"
                              value={unsafeForm.date}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, date: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-location-options"
                              value={unsafeForm.location}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, location: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-code-options"
                              value={unsafeForm.code}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-plate-options"
                              value={unsafeForm.plate}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, plate: e.target.value.toUpperCase() }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-description-options"
                              value={unsafeForm.description}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, description: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              type="number"
                              value={unsafeForm.amount}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, amount: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1 text-right"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-month-options"
                              type="number"
                              value={unsafeForm.month}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, month: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1 text-right"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-year-options"
                              type="number"
                              value={unsafeForm.year}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, year: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1 text-right"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-action-options"
                              value={unsafeForm.actionType}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, actionType: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              type="date"
                              value={unsafeForm.notificationDate}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, notificationDate: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-training-class-options"
                              value={unsafeForm.trainingClass}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, trainingClass: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <select
                              value={unsafeForm.controlStatus}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, controlStatus: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            >
                              <option value="">Seleccionar</option>
                              {unsafeDbFilterOptions.controlStatus.map((option) => (
                                <option key={`unsafe-control-${option}`} value={option}>{option}</option>
                              ))}
                            </select>
                          </th>
                          <th className="px-2 py-2">
                            <select
                              value={unsafeForm.employeeStatus}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, employeeStatus: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            >
                              <option value="">Seleccionar</option>
                              {unsafeDbFilterOptions.employeeStatus.map((option) => (
                                <option key={`unsafe-employee-${option}`} value={option}>{option}</option>
                              ))}
                            </select>
                          </th>
                          <th className="px-2 py-2">
                            <select
                              value={unsafeForm.signedReturn}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, signedReturn: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            >
                              <option value="">Seleccionar</option>
                              <option value="SI">SI</option>
                              <option value="NO">NO</option>
                            </select>
                          </th>
                          <th className="px-2 py-2">
                            <select
                              value={unsafeForm.trainingEvaluation}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, trainingEvaluation: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            >
                              <option value="">Seleccionar</option>
                              <option value="SI">SI</option>
                              <option value="NO">NO</option>
                            </select>
                          </th>
                          <th className="px-2 py-2">
                            <select
                              value={unsafeForm.inLabor}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, inLabor: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            >
                              <option value="">Seleccionar</option>
                              <option value="SI">SI</option>
                              <option value="NO">NO</option>
                            </select>
                          </th>
                          <th className="px-2 py-2">
                            <select
                              value={unsafeForm.paymentReceipt}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, paymentReceipt: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            >
                              <option value="">Seleccionar</option>
                              <option value="SI">SI</option>
                              <option value="NO">NO</option>
                            </select>
                          </th>
                          <th className="px-2 py-2">
                            <input
                              list="unsafe-observation-options"
                              value={unsafeForm.observations}
                              onChange={(e) => setUnsafeForm((prev) => ({ ...prev, observations: e.target.value }))}
                              className="w-full border border-[#d6dce5] rounded-soft px-2 py-1"
                            />
                          </th>
                          <th className="px-2 py-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={handleUnsafeFormSubmit}
                                className="px-2 py-1 bg-[#006b3d] text-white rounded-soft text-[11px] font-semibold"
                              >
                                {editingUnsafeId ? 'Guardar' : 'Agregar'}
                              </button>
                              {editingUnsafeId && (
                                <button
                                  type="button"
                                  onClick={resetUnsafeForm}
                                  className="px-2 py-1 border border-[#d6dce5] rounded-soft text-[11px]"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f5]">
                        {unsafeFilteredRecords.map((row) => (
                          <tr key={`unsafe-db-${row.id}`}>
                            <td className="px-3 py-2">{row.cedula}</td>
                            <td className="px-3 py-2">{row.driverName}</td>
                            <td className="px-3 py-2">{row.client}</td>
                            <td className="px-3 py-2">{row.contractType}</td>
                            <td className="px-3 py-2">{row.city}</td>
                            <td className="px-3 py-2">{row.dateLabel}</td>
                            <td className="px-3 py-2">{row.location}</td>
                            <td className="px-3 py-2">{row.code || 'N/A'}</td>
                            <td className="px-3 py-2">{row.plate}</td>
                            <td className="px-3 py-2 min-w-[280px]">{row.description}</td>
                            <td className="px-3 py-2 text-right font-mono">{row.amount}</td>
                            <td className="px-3 py-2 text-right">{row.month ?? ''}</td>
                            <td className="px-3 py-2 text-right">{row.year ?? ''}</td>
                            <td className="px-3 py-2">{row.actionType || 'Sin acción'}</td>
                            <td className="px-3 py-2">{formatShortDate(row.notificationDate)}</td>
                            <td className="px-3 py-2">{row.trainingClass}</td>
                            <td className="px-3 py-2">{row.controlStatus || 'Sin dato'}</td>
                            <td className="px-3 py-2">{row.employeeStatus}</td>
                            <td className="px-3 py-2">{row.signedReturn}</td>
                            <td className="px-3 py-2">{row.trainingEvaluation}</td>
                            <td className="px-3 py-2">{row.inLabor}</td>
                            <td className="px-3 py-2">{row.paymentReceipt}</td>
                            <td className="px-3 py-2 min-w-[220px]">{row.observations}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => handleEditUnsafeRecord(row)}
                                className="px-2 py-1 border border-[#d6dce5] rounded-soft text-[11px] text-gray-700 hover:bg-gray-50"
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <datalist id="unsafe-cedula-options">
                      {unsafeDbFilterOptions.cedula.map((option) => <option key={`unsafe-cedula-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-driver-options">
                      {unsafeDbFilterOptions.driverName.map((option) => <option key={`unsafe-driver-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-client-options">
                      {unsafeDbFilterOptions.client.map((option) => <option key={`unsafe-client-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-contract-options">
                      {unsafeDbFilterOptions.contractType.map((option) => <option key={`unsafe-contract-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-city-options">
                      {unsafeDbFilterOptions.city.map((option) => <option key={`unsafe-city-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-location-options">
                      {unsafeDbFilterOptions.location.map((option) => <option key={`unsafe-location-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-code-options">
                      {unsafeDbFilterOptions.code.map((option) => <option key={`unsafe-code-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-plate-options">
                      {unsafeDbFilterOptions.plate.map((option) => <option key={`unsafe-plate-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-description-options">
                      {unsafeDbFilterOptions.description.map((option) => <option key={`unsafe-description-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-month-options">
                      {unsafeDbFilterOptions.month.map((option) => <option key={`unsafe-month-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-year-options">
                      {unsafeDbFilterOptions.year.map((option) => <option key={`unsafe-year-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-action-options">
                      {unsafeDbFilterOptions.actionType.map((option) => <option key={`unsafe-action-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-training-class-options">
                      {unsafeDbFilterOptions.trainingClass.map((option) => <option key={`unsafe-training-class-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="unsafe-observation-options">
                      {unsafeDbFilterOptions.observations.map((option) => <option key={`unsafe-observation-${option}`} value={option} />)}
                    </datalist>
                  </div>
                </div>
              )}

              {selectedServiceMenuItem === 'Incapacidades' && sgiCanEditDatasets && showDbDetailPanel && incapDemoPanel === 'bd' && (
                <div className="border border-[#eaecf0] rounded-soft overflow-hidden">
                  <div className="bg-[#f8f9fa] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Ingreso base de datos
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <DemoExcelUploadButton onFileSelected={handleDemoExcelUpload} loading={isDemoExcelLoading} />
                      <div className="text-[11px] text-gray-500">
                        {incapFilteredRecords.length} registro(s)
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[4200px] w-full text-xs table-fixed border-collapse">
                      <colgroup>
                        <col style={{ width: '104px' }} />
                        <col style={{ width: '48px' }} />
                        <col style={{ width: '52px' }} />
                        <col style={{ width: '92px' }} />
                        <col style={{ width: '210px' }} />
                        <col style={{ width: '84px' }} />
                        <col style={{ width: '128px' }} />
                        <col style={{ width: '248px' }} />
                        <col style={{ width: '118px' }} />
                        <col style={{ width: '104px' }} />
                        <col style={{ width: '104px' }} />
                        <col style={{ width: '168px' }} />
                        <col style={{ width: '112px' }} />
                        <col style={{ width: '168px' }} />
                        <col style={{ width: '64px' }} />
                        <col style={{ width: '104px' }} />
                        <col style={{ width: '104px' }} />
                        <col style={{ width: '76px' }} />
                        <col style={{ width: '240px' }} />
                        <col style={{ width: '112px' }} />
                        <col style={{ width: '168px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '64px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '64px' }} />
                        <col style={{ width: '180px' }} />
                        <col style={{ width: '104px' }} />
                      </colgroup>
                      <thead className="bg-white border-b border-[#eaecf0] text-left text-gray-600">
                        <tr className="text-[10px] uppercase tracking-wide">
                          <th className={INCAP_DB_TH_CLASS}>Fecha incapacidad</th>
                          <th className={`${INCAP_DB_TH_CLASS} text-center`}>Mes</th>
                          <th className={`${INCAP_DB_TH_CLASS} text-center`}>Año</th>
                          <th className={INCAP_DB_TH_CLASS}>Cédula</th>
                          <th className={INCAP_DB_TH_CLASS}>Nombre empleado</th>
                          <th className={INCAP_DB_TH_CLASS}>Género</th>
                          <th className={INCAP_DB_TH_CLASS}>Entidad salud</th>
                          <th className={INCAP_DB_TH_CLASS}>Entidad pagadora</th>
                          <th className={INCAP_DB_TH_CLASS}>Tipo contrato</th>
                          <th className={INCAP_DB_TH_CLASS}>Cargo</th>
                          <th className={INCAP_DB_TH_CLASS}>Fecha ingreso</th>
                          <th className={INCAP_DB_TH_CLASS}>Cliente</th>
                          <th className={INCAP_DB_TH_CLASS}>Ciudad agencia</th>
                          <th className={INCAP_DB_TH_CLASS}>Incapacidad</th>
                          <th className={`${INCAP_DB_TH_CLASS} text-right`}>Nro. días</th>
                          <th className={INCAP_DB_TH_CLASS}>Fecha inicio</th>
                          <th className={INCAP_DB_TH_CLASS}>Fecha fin</th>
                          <th className={INCAP_DB_TH_CLASS}>DX CIE10</th>
                          <th className={INCAP_DB_TH_CLASS}>Descripción DX</th>
                          <th className={INCAP_DB_TH_CLASS}>Tipo incapacidad</th>
                          <th className={INCAP_DB_TH_CLASS}>Periodo efectivo</th>
                          <th className={INCAP_DB_TH_CLASS}>Periodo inicial</th>
                          <th className={`${INCAP_DB_TH_CLASS} text-right`}>Días inicial</th>
                          <th className={INCAP_DB_TH_CLASS}>Periodo siguiente</th>
                          <th className={INCAP_DB_TH_CLASS}>Periodo final</th>
                          <th className={`${INCAP_DB_TH_CLASS} text-right`}>Días final</th>
                          <th className={INCAP_DB_TH_CLASS}>Requisito retoma</th>
                          <th className={`${INCAP_DB_TH_CLASS} text-center`}>Acciones</th>
                        </tr>
                        <tr className="border-t border-[#eef1f5] bg-[#f8f9fa] text-[10px] normal-case tracking-normal">
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input type="date" value={incapForm.incapDate} onChange={(e) => handleIncapDateChange(e.target.value)} className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input type="number" min={1} max={12} list="incap-month-options" value={incapForm.month} onChange={(e) => setIncapForm((p) => ({ ...p, month: e.target.value }))} placeholder="Mes" className={`${INCAP_DB_FIELD_CLASS} text-center`} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input type="number" list="incap-year-options" value={incapForm.year} onChange={(e) => setIncapForm((p) => ({ ...p, year: e.target.value }))} placeholder="Año" className={`${INCAP_DB_FIELD_CLASS} text-center`} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-cedula-options" value={incapForm.cedula} onChange={(e) => setIncapForm((p) => ({ ...p, cedula: e.target.value }))} placeholder="Cédula" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-employee-options" value={incapForm.employeeName} onChange={(e) => handleIncapEmployeeChange(e.target.value)} placeholder="Empleado" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-gender-options" value={incapForm.gender} onChange={(e) => setIncapForm((p) => ({ ...p, gender: e.target.value }))} placeholder="Género" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-health-options" value={incapForm.healthEntity} onChange={(e) => setIncapForm((p) => ({ ...p, healthEntity: e.target.value }))} placeholder="Entidad salud" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-payer-options" value={incapForm.payerEntity} onChange={(e) => setIncapForm((p) => ({ ...p, payerEntity: e.target.value }))} placeholder="Entidad pagadora" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-contract-options" value={incapForm.contractType} onChange={(e) => setIncapForm((p) => ({ ...p, contractType: e.target.value }))} placeholder="Contrato" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-role-options" value={incapForm.role} onChange={(e) => setIncapForm((p) => ({ ...p, role: e.target.value }))} placeholder="Cargo" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input type="date" value={incapForm.entryDate} onChange={(e) => setIncapForm((p) => ({ ...p, entryDate: e.target.value }))} className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-client-options" value={incapForm.client} onChange={(e) => setIncapForm((p) => ({ ...p, client: e.target.value }))} placeholder="Cliente" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-city-options" value={incapForm.city} onChange={(e) => setIncapForm((p) => ({ ...p, city: e.target.value }))} placeholder="Ciudad" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-incaptype-options" value={incapForm.incapType} onChange={(e) => setIncapForm((p) => ({ ...p, incapType: e.target.value }))} placeholder="Incapacidad" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input type="number" min={0} list="incap-days-options" value={incapForm.incapDays} onChange={(e) => setIncapForm((p) => ({ ...p, incapDays: e.target.value }))} placeholder="Días" className={`${INCAP_DB_FIELD_CLASS} text-right`} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input type="date" value={incapForm.startDate} onChange={(e) => setIncapForm((p) => ({ ...p, startDate: e.target.value }))} className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input type="date" value={incapForm.endDate} onChange={(e) => setIncapForm((p) => ({ ...p, endDate: e.target.value }))} className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-dx-code-options" value={incapForm.dxCode} onChange={(e) => setIncapForm((p) => ({ ...p, dxCode: e.target.value.toUpperCase() }))} placeholder="DX" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-dxdesc-options" value={incapForm.dxDescription} onChange={(e) => setIncapForm((p) => ({ ...p, dxDescription: e.target.value }))} placeholder="Descripción DX" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-incapclass-options" value={incapForm.incapClass} onChange={(e) => setIncapForm((p) => ({ ...p, incapClass: e.target.value }))} placeholder="Tipo inc." className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-effective-period-options" value={incapForm.effectivePeriod} onChange={(e) => setIncapForm((p) => ({ ...p, effectivePeriod: e.target.value }))} placeholder="Periodo efectivo" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-initial-period-options" value={incapForm.initialPeriod} onChange={(e) => setIncapForm((p) => ({ ...p, initialPeriod: e.target.value }))} placeholder="Periodo inicial" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input type="number" min={0} value={incapForm.initialDays} onChange={(e) => setIncapForm((p) => ({ ...p, initialDays: e.target.value }))} placeholder="Días" className={`${INCAP_DB_FIELD_CLASS} text-right`} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-following-period-options" value={incapForm.followingPeriod} onChange={(e) => setIncapForm((p) => ({ ...p, followingPeriod: e.target.value }))} placeholder="Periodo sig." className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-final-period-options" value={incapForm.finalPeriod} onChange={(e) => setIncapForm((p) => ({ ...p, finalPeriod: e.target.value }))} placeholder="Periodo final" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input type="number" min={0} value={incapForm.finalDays} onChange={(e) => setIncapForm((p) => ({ ...p, finalDays: e.target.value }))} placeholder="Días" className={`${INCAP_DB_FIELD_CLASS} text-right`} />
                          </th>
                          <th className="px-1 py-1 border-r border-[#eef1f5]">
                            <input list="incap-return-requirement-options" value={incapForm.returnRequirement} onChange={(e) => setIncapForm((p) => ({ ...p, returnRequirement: e.target.value }))} placeholder="Requisito retoma" className={INCAP_DB_FIELD_CLASS} />
                          </th>
                          <th className="px-1 py-1">
                            <div className="flex flex-col gap-1">
                              <button type="button" onClick={handleIncapFormSubmit} className="px-2 py-1 bg-[#006b3d] text-white rounded-soft text-[10px] font-semibold whitespace-nowrap">
                                {editingIncapId ? 'Guardar' : 'Agregar'}
                              </button>
                              {editingIncapId && (
                                <button type="button" onClick={resetIncapForm} className="px-2 py-1 border border-[#d6dce5] rounded-soft text-[10px] whitespace-nowrap bg-white">
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f5] bg-white">
                        {incapFilteredRecords.map((row) => (
                          <tr key={`incap-db-${row.id}`} className="hover:bg-[#fafbfc]">
                            <td className={INCAP_DB_TD_CLASS} title={row.incapDateLabel}>{row.incapDateLabel}</td>
                            <td className={`${INCAP_DB_TD_CLASS} text-center font-mono`} title={String(row.month)}>{row.month}</td>
                            <td className={`${INCAP_DB_TD_CLASS} text-center font-mono`} title={String(row.year)}>{row.year}</td>
                            <td className={INCAP_DB_TD_CLASS} title={String(row.cedula)}>{row.cedula}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.employeeName}>{row.employeeName}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.gender}>{row.gender}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.healthEntity}>{row.healthEntity}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.payerEntity}>{row.payerEntity}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.contractType}>{row.contractType}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.role}>{row.role}</td>
                            <td className={INCAP_DB_TD_CLASS} title={formatShortDate(row.entryDate)}>{formatShortDate(row.entryDate)}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.client}>{row.client}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.city}>{row.city}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.incapType}>{row.incapType}</td>
                            <td className={`${INCAP_DB_TD_CLASS} text-right font-mono`} title={String(row.incapDays)}>{row.incapDays}</td>
                            <td className={INCAP_DB_TD_CLASS} title={formatShortDate(row.startDate)}>{formatShortDate(row.startDate)}</td>
                            <td className={INCAP_DB_TD_CLASS} title={formatShortDate(row.endDate)}>{formatShortDate(row.endDate)}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.dxCode}>{row.dxCode}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.dxDescription}>{row.dxDescription}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.incapClass}>{row.incapClass}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.effectivePeriod}>{row.effectivePeriod}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.initialPeriod}>{row.initialPeriod}</td>
                            <td className={`${INCAP_DB_TD_CLASS} text-right font-mono`} title={String(row.initialDays)}>{row.initialDays || ''}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.followingPeriod}>{row.followingPeriod}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.finalPeriod}>{row.finalPeriod}</td>
                            <td className={`${INCAP_DB_TD_CLASS} text-right font-mono`} title={String(row.finalDays)}>{row.finalDays || ''}</td>
                            <td className={INCAP_DB_TD_CLASS} title={row.returnRequirement}>{row.returnRequirement}</td>
                            <td className="px-2 py-2 text-center align-middle border-r border-[#eef1f5] last:border-r-0">
                              <button type="button" onClick={() => handleEditIncapRecord(row)} className="px-2 py-1 border border-[#d6dce5] rounded-soft text-[10px] text-gray-700 hover:bg-gray-50 whitespace-nowrap">
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <datalist id="incap-month-options">
                      {Array.from({ length: 12 }, (_, index) => (
                        <option key={`incap-month-${index + 1}`} value={String(index + 1)} />
                      ))}
                    </datalist>
                    <datalist id="incap-year-options">
                      {incapYearOptions.map((year) => (
                        <option key={`incap-form-year-${year}`} value={String(year)} />
                      ))}
                    </datalist>
                    <datalist id="incap-cedula-options">
                      {incapDbFilterOptions.cedula.map((option) => <option key={`incap-cedula-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-employee-options">
                      {incapDbFilterOptions.employeeName.map((option) => <option key={`incap-employee-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-gender-options">
                      {incapDbFilterOptions.gender.map((option) => <option key={`incap-gender-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-health-options">
                      {incapDbFilterOptions.healthEntity.map((option) => <option key={`incap-health-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-payer-options">
                      {incapDbFilterOptions.payerEntity.map((option) => <option key={`incap-payer-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-contract-options">
                      {incapDbFilterOptions.contractType.map((option) => <option key={`incap-contract-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-role-options">
                      {incapDbFilterOptions.role.map((option) => <option key={`incap-role-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-client-options">
                      {incapDbFilterOptions.client.map((option) => <option key={`incap-client-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-city-options">
                      {incapDbFilterOptions.city.map((option) => <option key={`incap-city-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-incaptype-options">
                      {incapDbFilterOptions.incapType.map((option) => <option key={`incap-incaptype-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-days-options">
                      {incapDbFilterOptions.incapDays.map((option) => <option key={`incap-days-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-dx-code-options">
                      {incapDbFilterOptions.dxCode.map((option) => <option key={`incap-dx-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-dxdesc-options">
                      {incapDbFilterOptions.dxDescription.map((option) => <option key={`incap-dxdesc-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-incapclass-options">
                      {incapDbFilterOptions.incapClass.map((option) => <option key={`incap-incapclass-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-effective-period-options">
                      {incapDbFilterOptions.effectivePeriod.map((option) => <option key={`incap-effective-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-initial-period-options">
                      {incapDbFilterOptions.initialPeriod.map((option) => <option key={`incap-initial-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-following-period-options">
                      {incapDbFilterOptions.followingPeriod.map((option) => <option key={`incap-following-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-final-period-options">
                      {incapDbFilterOptions.finalPeriod.map((option) => <option key={`incap-final-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="incap-return-requirement-options">
                      {incapDbFilterOptions.returnRequirement.map((option) => <option key={`incap-return-${option}`} value={option} />)}
                    </datalist>
                  </div>
                </div>
              )}

              {selectedServiceMenuItem === 'Incapacidades' && sgiCanEditDatasets && showDbDetailPanel && incapDemoPanel === 'informe' && incapDemoInformeComputed && (
                <div className="border border-[#eaecf0] rounded-soft overflow-hidden">
                  <div className="bg-[#f8f9fa] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      FT-GEI-SO-016 Informe {incapDemoInformeComputed.year}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Amarillo: editable · Gris: calculado · Filas 6-14 desde BD (ARL aprobados y casos antiguos EL editables) · Filas 15-24 fórmulas legales
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-white border-b border-[#eaecf0]">
                        <tr className="text-left text-gray-600">
                          <th className="px-3 py-2 min-w-[280px] sticky left-0 bg-white z-10">Descripción</th>
                          {INCAP_INFORME_MONTH_LABELS.map((month) => (
                            <th key={`incap-informe-head-${month}`} className="px-2 py-2 text-center whitespace-nowrap">{month}</th>
                          ))}
                          <th className="px-2 py-2 text-center whitespace-nowrap bg-[#eceff3]">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f5]">
                        {incapDemoInformeComputed.rows.map((row) => (
                          <tr key={`incap-informe-row-${row.key}`} className={row.highlight === 'formula' ? 'bg-[#fafafa]' : 'bg-white'}>
                            <td className={`px-3 py-2 sticky left-0 z-10 ${row.highlight === 'yellow' ? 'bg-[#fffef0]' : row.highlight === 'gray' ? 'bg-[#eceff3]' : 'bg-white'}`}>
                              {row.label}
                            </td>
                            {row.values.map((value, index) => {
                              const isTotal = index === 12;
                              const monthIndex = index;
                              const cellClass = `${
                                row.highlight === 'yellow' && !isTotal
                                  ? 'bg-[#fff59d]'
                                  : row.highlight === 'gray' || isTotal
                                    ? 'bg-[#eceff3]'
                                    : ''
                              } px-2 py-1 text-right font-mono whitespace-nowrap`;

                              if (row.editable && !isTotal && row.key !== 'scheduledDays') {
                                const field = row.key as IncapInformeEditableField;
                                return (
                                  <td key={`${row.key}-${index}`} className={cellClass}>
                                    <input
                                      type="number"
                                      min={0}
                                      step={row.key === 'businessDays' ? 1 : 1}
                                      value={value ?? ''}
                                      onChange={(e) => handleUpdateIncapDemoInformeCell(field, monthIndex, e.target.value)}
                                      className="w-20 border border-[#d6dce5] rounded-soft px-1 py-0.5 text-right bg-[#fffef0]"
                                    />
                                  </td>
                                );
                              }

                              return (
                                <td key={`${row.key}-${index}`} className={cellClass}>
                                  {formatInformeCellValue(row.key, value)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedServiceMenuItem === 'Formación' && sgiCanEditDatasets && showDbDetailPanel && formacionDemoPanel === 'bd' && (
                <div className="border border-[#eaecf0] rounded-soft overflow-hidden">
                  <div className="bg-[#f8f9fa] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Ingreso base de datos
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRestoreFormacionInitialData}
                        className="px-3 py-1.5 rounded-soft text-xs font-semibold border border-[#d6dce5] bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Restaurar BD inicial
                      </button>
                      <DemoExcelUploadButton onFileSelected={handleDemoExcelUpload} loading={isDemoExcelLoading} />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs" style={{ minWidth: '1400px' }}>
                      <thead className="bg-white border-b border-[#eaecf0] text-left text-gray-600">
                        <tr>
                          <th className="px-3 py-2">Cédula</th>
                          <th className="px-3 py-2">Puntaje evaluación</th>
                          <th className="px-3 py-2">Cliente</th>
                          <th className="px-3 py-2 min-w-[320px]">Tema y/o contenido</th>
                          <th className="px-3 py-2">Fecha</th>
                          <th className="px-3 py-2">Mes</th>
                          <th className="px-3 py-2">Año</th>
                          <th className="px-3 py-2">Hora</th>
                          <th className="px-3 py-2">Modalidad</th>
                          <th className="px-3 py-2">Horas formación</th>
                          <th className="px-3 py-2">Acciones</th>
                        </tr>
                        <tr className="border-t border-[#eef1f5] bg-[#f8f9fa]">
                          <th className="px-2 py-2">
                            <input list="formacion-cedula-options" value={formacionForm.cedula} onChange={(e) => setFormacionForm((prev) => ({ ...prev, cedula: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input type="number" min={0} max={100} value={formacionForm.score} onChange={(e) => setFormacionForm((prev) => ({ ...prev, score: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input list="formacion-client-options" value={formacionForm.client} onChange={(e) => setFormacionForm((prev) => ({ ...prev, client: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input list="formacion-topic-options" value={formacionForm.topic} onChange={(e) => setFormacionForm((prev) => ({ ...prev, topic: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input type="date" value={formacionForm.date} onChange={(e) => setFormacionForm((prev) => ({ ...prev, date: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input type="number" min={1} max={12} value={formacionForm.month} onChange={(e) => setFormacionForm((prev) => ({ ...prev, month: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input type="number" min={2000} value={formacionForm.year} onChange={(e) => setFormacionForm((prev) => ({ ...prev, year: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input list="formacion-time-options" value={formacionForm.trainingTime} onChange={(e) => setFormacionForm((prev) => ({ ...prev, trainingTime: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input list="formacion-modality-options" value={formacionForm.modality} onChange={(e) => setFormacionForm((prev) => ({ ...prev, modality: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input type="number" min={0} step="0.5" value={formacionForm.trainingHours} onChange={(e) => setFormacionForm((prev) => ({ ...prev, trainingHours: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2 whitespace-nowrap">
                            <button type="button" onClick={handleFormacionFormSubmit} className="px-2 py-1 rounded-soft bg-[#006b3d] text-white font-semibold mr-1">
                              {editingFormacionId ? 'Guardar' : 'Agregar'}
                            </button>
                            {editingFormacionId && (
                              <button type="button" onClick={resetFormacionForm} className="px-2 py-1 rounded-soft border border-[#d6dce5] bg-white text-gray-700">
                                Cancelar
                              </button>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f5]">
                        {formacionFilteredRecords.slice(0, 250).map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2 font-mono">{row.cedula}</td>
                            <td className="px-3 py-2 font-mono">{row.score}</td>
                            <td className="px-3 py-2">{normalizeFormacionClient(row.client)}</td>
                            <td className="px-3 py-2 min-w-[320px]">{row.topic}</td>
                            <td className="px-3 py-2">{row.dateLabel}</td>
                            <td className="px-3 py-2">{row.month}</td>
                            <td className="px-3 py-2">{row.year}</td>
                            <td className="px-3 py-2">{row.trainingTime}</td>
                            <td className="px-3 py-2">{row.modality}</td>
                            <td className="px-3 py-2 font-mono">{row.trainingHours}</td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => handleEditFormacionRecord(row)} className="text-[#006b3d] font-semibold hover:underline">
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {formacionFilteredRecords.length > 250 && (
                      <p className="text-[11px] text-gray-500 px-3 py-2 border-t border-[#eaecf0]">
                        Mostrando 250 de {formacionFilteredRecords.length} registros. Use filtros de año o fechas para acotar la vista.
                      </p>
                    )}
                    <datalist id="formacion-cedula-options">
                      {formacionDbFilterOptions.cedula.map((option) => <option key={`formacion-cedula-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="formacion-client-options">
                      {formacionDbFilterOptions.client.map((option) => <option key={`formacion-client-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="formacion-topic-options">
                      {formacionDbFilterOptions.topic.map((option) => <option key={`formacion-topic-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="formacion-time-options">
                      {formacionDbFilterOptions.trainingTime.map((option) => <option key={`formacion-time-${option}`} value={option} />)}
                    </datalist>
                    <datalist id="formacion-modality-options">
                      {formacionDbFilterOptions.modality.map((option) => <option key={`formacion-modality-${option}`} value={option} />)}
                    </datalist>
                  </div>
                </div>
              )}

              {selectedServiceMenuItem === 'Formación' && sgiCanEditDatasets && showDbDetailPanel && formacionDemoPanel === 'informe' && formacionDemoInformeComputed && (
                <div className="border border-[#eaecf0] rounded-soft overflow-hidden">
                  <div className="bg-[#f8f9fa] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Informe consolidado
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Amarillo: editable (programadas) · Gris: calculado · Personal activo desde FT-GEI-SO-016 Incapacidades · Filas de %: fórmulas
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-white border-b border-[#eaecf0]">
                        <tr className="text-left text-gray-600">
                          <th className="px-3 py-2 min-w-[280px] sticky left-0 bg-white z-10">Descripción</th>
                          {FORMACION_INFORME_MONTH_LABELS.map((month) => (
                            <th key={`formacion-informe-head-${month}`} className="px-2 py-2 text-center whitespace-nowrap">{month}</th>
                          ))}
                          <th className="px-2 py-2 text-center whitespace-nowrap bg-[#eceff3]">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f5]">
                        {formacionDemoInformeComputed.rows.map((row) => (
                          <tr key={`formacion-informe-row-${row.key}`} className={row.highlight === 'formula' ? 'bg-[#fafafa]' : 'bg-white'}>
                            <td className={`px-3 py-2 sticky left-0 z-10 ${row.highlight === 'yellow' ? 'bg-[#fffef0]' : row.highlight === 'gray' ? 'bg-[#eceff3]' : 'bg-white'}`}>
                              {row.label}
                            </td>
                            {row.values.map((value, index) => {
                              const isTotal = index === 12;
                              const monthIndex = index;
                              const cellClass = `${
                                row.highlight === 'yellow' && !isTotal
                                  ? 'bg-[#fff59d]'
                                  : row.highlight === 'gray' || isTotal
                                    ? 'bg-[#eceff3]'
                                    : ''
                              } px-2 py-1 text-right font-mono whitespace-nowrap`;

                              if (row.editable && !isTotal) {
                                const field = row.key as FormacionInformeEditableField;
                                return (
                                  <td key={`${row.key}-${index}`} className={cellClass}>
                                    <input
                                      type="number"
                                      min={0}
                                      value={value ?? ''}
                                      onChange={(e) => handleUpdateFormacionDemoInformeCell(field, monthIndex, e.target.value)}
                                      className="w-20 border border-[#d6dce5] rounded-soft px-1 py-0.5 text-right bg-[#fffef0]"
                                    />
                                  </td>
                                );
                              }

                              return (
                                <td key={`${row.key}-${index}`} className={cellClass}>
                                  {formatFormacionInformeCellValue(row, value)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedServiceMenuItem === 'Accidentalidad' && sgiCanEditDatasets && showDbDetailPanel && accidentalidadDemoPanel === 'bd' && (
                <div className="border border-[#eaecf0] rounded-soft overflow-hidden">
                  <div className="bg-[#f8f9fa] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Ingreso base de datos · bd_AT_SV_IT_2026
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRestoreAccidentalidadInitialData}
                        className="px-3 py-1.5 rounded-soft text-xs font-semibold border border-[#d6dce5] bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Restaurar BD inicial
                      </button>
                      <div className="text-[11px] text-gray-500">
                        {accidentalidadFilteredRecords.length} registro(s)
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs" style={{ minWidth: '2400px' }}>
                      <thead className="bg-white border-b border-[#eaecf0] text-left text-gray-600">
                        <tr>
                          <th className="px-3 py-2">Fecha evento</th>
                          <th className="px-3 py-2">Fecha reporte</th>
                          <th className="px-3 py-2">Cédula</th>
                          <th className="px-3 py-2 min-w-[200px]">Empleado</th>
                          <th className="px-3 py-2">Contrato o cliente</th>
                          <th className="px-3 py-2">Tipo vinculación</th>
                          <th className="px-3 py-2">Tipo contratación</th>
                          <th className="px-3 py-2">Característica</th>
                          <th className="px-3 py-2">Gravedad</th>
                          <th className="px-3 py-2">Durante servicio</th>
                          <th className="px-3 py-2 min-w-[220px]">Descripción riesgo</th>
                          <th className="px-3 py-2">Acciones</th>
                        </tr>
                        <tr className="border-t border-[#eef1f5] bg-[#f8f9fa]">
                          <th className="px-2 py-2">
                            <input type="date" value={accidentalidadForm.eventDate} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, eventDate: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input type="date" value={accidentalidadForm.reportDate} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, reportDate: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input value={accidentalidadForm.cedula} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, cedula: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input value={accidentalidadForm.employeeName} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, employeeName: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input value={accidentalidadForm.client} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, client: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input value={accidentalidadForm.linkType} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, linkType: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input value={accidentalidadForm.contractType} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, contractType: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input value={accidentalidadForm.characteristic} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, characteristic: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input value={accidentalidadForm.severity} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, severity: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input value={accidentalidadForm.duringService} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, duringService: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2">
                            <input value={accidentalidadForm.riskDescription} onChange={(e) => setAccidentalidadForm((prev) => ({ ...prev, riskDescription: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" />
                          </th>
                          <th className="px-2 py-2 whitespace-nowrap">
                            <button type="button" onClick={handleAccidentalidadFormSubmit} className="px-2 py-1 rounded-soft bg-[#006b3d] text-white font-semibold mr-1">
                              {editingAccidentalidadId ? 'Guardar' : 'Agregar'}
                            </button>
                            {editingAccidentalidadId && (
                              <button type="button" onClick={resetAccidentalidadForm} className="px-2 py-1 rounded-soft border border-[#d6dce5] bg-white text-gray-700">
                                Cancelar
                              </button>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f5]">
                        {accidentalidadFilteredRecords.slice(0, 250).map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2">{row.eventDateLabel}</td>
                            <td className="px-3 py-2">{row.reportDateLabel}</td>
                            <td className="px-3 py-2 font-mono">{row.cedula}</td>
                            <td className="px-3 py-2">{row.employeeName}</td>
                            <td className="px-3 py-2">{row.client}</td>
                            <td className="px-3 py-2">{row.linkType}</td>
                            <td className="px-3 py-2">{row.contractType}</td>
                            <td className="px-3 py-2">{row.characteristic}</td>
                            <td className="px-3 py-2">{row.severity}</td>
                            <td className="px-3 py-2">{row.duringService}</td>
                            <td className="px-3 py-2 min-w-[260px]">{row.riskDescription}</td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => handleEditAccidentalidadRecord(row)} className="text-[#006b3d] font-semibold hover:underline">
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {accidentalidadFilteredRecords.length > 250 && (
                      <p className="text-[11px] text-gray-500 px-3 py-2 border-t border-[#eaecf0]">
                        Mostrando 250 de {accidentalidadFilteredRecords.length} registros. Use filtros de año o fechas para acotar la vista.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedServiceMenuItem === 'Accidentalidad' && sgiCanEditDatasets && showDbDetailPanel && accidentalidadDemoPanel === 'informe' && (
                <div className="border border-[#eaecf0] rounded-soft overflow-hidden">
                  <div className="bg-[#f8f9fa] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Informe consolidado FT-GEI-SO-017 · {accidentalidadIndicators.sourceYear}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Verde: ILI dentro de meta · Amarillo: atención · Rojo: fuera de meta
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="overflow-x-auto overflow-y-visible py-2 bg-white border border-[#eaecf0] rounded-soft p-3">
                      <div className="flex gap-3 justify-between min-w-max px-1">
                        {accidentalidadIliMetaComparison.map((month) => {
                          const iliStyles = getAccidentalidadIliStatusStyles(month.status);
                          const maxIli = Math.max(...accidentalidadIliMetaComparison.map((row) => row.ili), 0.000001);
                          const barHeight = getScaledBarHeight(month.ili, maxIli);
                          const barColor =
                            month.status === 'ok' ? '#006b3d' : month.status === 'warn' ? '#ffd000' : '#ba1a1a';
                          return (
                            <div key={`acc-db-ili-${month.label}`} className="min-w-[88px] w-[88px] flex flex-col items-center">
                              {renderSgiVerticalBar(
                                month.ili.toFixed(4),
                                barHeight,
                                barColor,
                                {
                                  barWidthClass: 'w-[52px]',
                                  title: `${month.label}: ILI ${month.ili.toFixed(6)}`
                                }
                              )}
                              <div className="text-[11px] uppercase font-semibold text-gray-600 mt-2">{month.label}</div>
                              <span className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${iliStyles.bg} ${iliStyles.text} ${iliStyles.border}`}>
                                {iliStyles.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {renderAccidentalidadInformeSections(accidentalidadInformeSections, 'acc-db-informe')}
                  </div>
                </div>
              )}

              {selectedServiceMenuItem === 'Medicina del trabajo' && sgiCanEditDatasets && showDbDetailPanel && (
                <div className="border border-[#eaecf0] rounded-soft overflow-hidden">
                  <div className="bg-[#f8f9fa] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Ingreso base de datos · Tablero control exámenes médicos
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleRestoreMedicinaInitialData}
                        className="px-2 py-1 text-[11px] font-semibold rounded-soft border border-[#d6dce5] bg-white text-gray-700 hover:bg-gray-50"
                      >
                        Restaurar datos iniciales
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-white border-b border-[#eaecf0] text-left text-gray-600">
                        <tr>
                          <th className="px-2 py-2">Documento</th>
                          <th className="px-2 py-2">Nombre</th>
                          <th className="px-2 py-2">Ciudad</th>
                          <th className="px-2 py-2">Cargo</th>
                          <th className="px-2 py-2">Contrato</th>
                          <th className="px-2 py-2">Vinculación</th>
                          <th className="px-2 py-2">F. examen</th>
                          <th className="px-2 py-2">Estado</th>
                          <th className="px-2 py-2">Vencimiento</th>
                          <th className="px-2 py-2">IPS</th>
                          <th className="px-2 py-2">Costo</th>
                          <th className="px-2 py-2">Período</th>
                          <th className="px-2 py-2">Semáforo</th>
                          <th className="px-2 py-2">Acciones</th>
                        </tr>
                        <tr className="border-t border-[#eef1f5] bg-[#f8f9fa]">
                          <th className="px-2 py-2"><input value={medicinaForm.documento} onChange={(e) => setMedicinaForm((p) => ({ ...p, documento: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input value={medicinaForm.employeeName} onChange={(e) => setMedicinaForm((p) => ({ ...p, employeeName: e.target.value }))} className="w-full min-w-[140px] border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="med-city-options" value={medicinaForm.city} onChange={(e) => setMedicinaForm((p) => ({ ...p, city: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="med-role-options" value={medicinaForm.role} onChange={(e) => setMedicinaForm((p) => ({ ...p, role: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="med-contract-options" value={medicinaForm.contract} onChange={(e) => setMedicinaForm((p) => ({ ...p, contract: e.target.value }))} className="w-full min-w-[120px] border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="med-link-options" value={medicinaForm.linkType} onChange={(e) => setMedicinaForm((p) => ({ ...p, linkType: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input type="date" value={medicinaForm.examDate} onChange={(e) => setMedicinaForm((p) => ({ ...p, examDate: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="med-status-options" value={medicinaForm.examStatus} onChange={(e) => setMedicinaForm((p) => ({ ...p, examStatus: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input type="date" value={medicinaForm.expiryDate} onChange={(e) => setMedicinaForm((p) => ({ ...p, expiryDate: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input list="med-ips-options" value={medicinaForm.ips} onChange={(e) => setMedicinaForm((p) => ({ ...p, ips: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2"><input value={medicinaForm.cost} onChange={(e) => setMedicinaForm((p) => ({ ...p, cost: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1" /></th>
                          <th className="px-2 py-2">
                            <select value={medicinaForm.periodicYears} onChange={(e) => setMedicinaForm((p) => ({ ...p, periodicYears: e.target.value }))} className="w-full border border-[#d6dce5] rounded-soft px-2 py-1">
                              <option value="1">1 año</option>
                              <option value="3">3 años</option>
                            </select>
                          </th>
                          <th className="px-2 py-2 text-[10px] text-gray-400">—</th>
                          <th className="px-2 py-2">
                            <div className="flex gap-1">
                              <button type="button" onClick={handleMedicinaFormSubmit} className="px-2 py-1 rounded-soft border border-[#006b3d] bg-[#006b3d] text-white text-[10px] font-semibold">
                                {editingMedicinaId ? 'Actualizar' : 'Registrar'}
                              </button>
                              <button type="button" onClick={resetMedicinaForm} className="px-2 py-1 rounded-soft border border-[#d6dce5] bg-white text-gray-700 text-[10px] font-semibold">
                                Limpiar
                              </button>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f5]">
                        {medicinaTrabajoRecords.slice(0, 120).map((row) => {
                          const expiryStyles = getMedicinaExpiryStylesForRecord(row, medicinaReferenceDate);
                          return (
                            <tr key={row.id} className={expiryStyles.bg}>
                              <td className="px-2 py-2 font-mono">{row.documento}</td>
                              <td className="px-2 py-2">{row.employeeName}</td>
                              <td className="px-2 py-2">{row.city}</td>
                              <td className="px-2 py-2">{row.role}</td>
                              <td className="px-2 py-2 max-w-[140px] truncate" title={row.contract}>{row.contract}</td>
                              <td className="px-2 py-2">{row.linkType}</td>
                              <td className="px-2 py-2">{row.examDateLabel}</td>
                              <td className="px-2 py-2">{row.examStatus}</td>
                              <td className="px-2 py-2">{row.expiryDateLabel}</td>
                              <td className="px-2 py-2">{row.ips}</td>
                              <td className="px-2 py-2 font-mono">{formatMedicinaCurrency(row.cost)}</td>
                              <td className="px-2 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${expiryStyles.badge}`}>
                                  {expiryStyles.label}
                                </span>
                              </td>
                              <td className="px-2 py-2">
                                <button type="button" onClick={() => handleEditMedicinaRecord(row)} className="px-2 py-1 rounded-soft border border-[#d6dce5] bg-white text-[10px] font-semibold">
                                  Editar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {medicinaTrabajoRecords.length > 120 && (
                    <p className="text-[11px] text-gray-500 px-3 py-2 border-t border-[#eaecf0]">
                      Mostrando 120 de {medicinaTrabajoRecords.length} registros en la vista de edición.
                    </p>
                  )}
                  <datalist id="med-city-options">
                    {medicinaFilterOptions.city.map((option) => <option key={`med-city-${option}`} value={option} />)}
                  </datalist>
                  <datalist id="med-contract-options">
                    {medicinaFilterOptions.contract.map((option) => <option key={`med-contract-${option}`} value={option} />)}
                  </datalist>
                  <datalist id="med-link-options">
                    {medicinaFilterOptions.linkType.map((option) => <option key={`med-link-${option}`} value={option} />)}
                  </datalist>
                  <datalist id="med-status-options">
                    {medicinaFilterOptions.examStatus.map((option) => <option key={`med-status-${option}`} value={option} />)}
                  </datalist>
                  <datalist id="med-ips-options">
                    {medicinaFilterOptions.ips.map((option) => <option key={`med-ips-${option}`} value={option} />)}
                  </datalist>
                  <datalist id="med-role-options">
                    {medicinaFilterOptions.role.map((option) => <option key={`med-role-${option}`} value={option} />)}
                  </datalist>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: INTELIGENTE OPTIMIZADOR ECOLÓGICO */}
        {activeTab === 'optimizer' && (
          <div className="space-y-6">
            
            {/* Cabecera optimizador */}
            <div className="bg-[#00502c] text-white p-5 rounded-soft border-b-2 border-[#ffd000] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-bold text-base md:text-lg">Calculadora Predictiva del Planificador de Rutas Sostenibles</h3>
                <p className="text-xs text-emerald-200 mt-1">Estimaciones basadas en el corredor vial multimodal nacional, coeficientes de resistencia aerodinámica y peajes AP.</p>
              </div>

              <div className="bg-[#006b3d] px-3.5 py-2 rounded-soft border border-emerald-700/60 font-mono text-xs flex gap-3 text-emerald-50">
                <Truck size={20} className="text-[#ffd000] self-center animate-bounce" />
                <div>
                  <span className="text-[10px] block font-sans text-emerald-300">Coeficiente Descarbonización</span>
                  <span className="font-bold text-sm">EU LEVEL: A++ SUPERIOR</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Inputs (4 Cols) */}
              <div className="lg:col-span-4 bg-white border border-[#eaecf0] p-4 rounded-soft shadow-sm h-fit">
                <h4 className="font-bold text-sm text-[#191c1d] uppercase tracking-wide border-b border-[#eaecf0] pb-2 mb-4">
                  Parámetros de Simulación de Ruta
                </h4>

                <form onSubmit={handleOptimizeRoute} className="space-y-4 text-xs">
                  {/* Origen */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Hub Origen</label>
                    <select
                      value={optOrigin}
                      onChange={(e) => setOptOrigin(e.target.value)}
                      className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-2 w-full text-xs font-semibold focus:outline-none focus:border-[#006b3d]"
                    >
                      {Object.keys(COORDINATES_MAP).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  {/* Destino */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Hub Destino</label>
                    <select
                      value={optDestination}
                      onChange={(e) => setOptDestination(e.target.value)}
                      className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-2 w-full text-xs font-semibold focus:outline-none focus:border-[#006b3d]"
                    >
                      {Object.keys(COORDINATES_MAP).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  {/* Criterio Prioritario */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Criterio Prioritario</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setOptPriority('speed')}
                        className={`text-center py-2 px-1.5 border rounded-soft text-[10px] font-bold transition-all ${
                          optPriority === 'speed' 
                            ? 'bg-[#003c21] text-[#ffd000] border-[#006b3d]' 
                            : 'bg-[#f8f9fa] border-[#eaecf0] text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        ⏱️ Tiempo AP
                      </button>

                      <button
                        type="button"
                        onClick={() => setOptPriority('sustainability')}
                        className={`text-center py-2 px-1.5 border rounded-soft text-[10px] font-bold transition-all ${
                          optPriority === 'sustainability' 
                            ? 'bg-[#003c21] text-[#ffd000] border-[#006b3d]' 
                            : 'bg-[#f8f9fa] border-[#eaecf0] text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        🌿 Eco Descarb.
                      </button>

                      <button
                        type="button"
                        onClick={() => setOptPriority('cost')}
                        className={`text-center py-2 px-1.5 border rounded-soft text-[10px] font-bold transition-all ${
                          optPriority === 'cost' 
                            ? 'bg-[#003c21] text-[#ffd000] border-[#006b3d]' 
                            : 'bg-[#f8f9fa] border-[#eaecf0] text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        💶 Bajo Peaje
                      </button>
                    </div>
                  </div>

                  {/* Peso de carga */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Peso de la Carga (Kg)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="500"
                        max="24000"
                        value={optWeight}
                        onChange={(e) => setOptWeight(Number(e.target.value))}
                        className="bg-[#f8f9fa] border border-[#eaecf0] rounded-soft p-2 w-full text-xs font-mono focus:outline-none focus:border-[#006b3d]"
                      />
                      <span className="absolute right-3 top-2 text-gray-400 font-mono text-[10px]">KG</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isOptimizing}
                    className="w-full bg-[#006b3d] text-white hover:bg-[#00502c] font-bold py-2.5 px-4 rounded-soft flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm shadow-[#ffd000]/10 disabled:opacity-50"
                  >
                    {isOptimizing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin text-[#ffd000]" />
                        <span>Analizando Corredores...</span>
                      </>
                    ) : (
                      <>
                        <Compass size={14} className="text-[#ffd000] stroke-[2.5]" />
                        <span>Calcular Ruta e Impacto Eco</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Outputs (8 Cols) */}
              <div className="lg:col-span-8 flex flex-col justify-between">
                
                {optimizedResult ? (
                  <div className="bg-white border border-[#eaecf0] p-4 rounded-soft shadow-sm flex-1 flex flex-col justify-between gap-4">
                    
                    <div>
                      <div className="flex justify-between items-center border-b border-[#eaecf0] pb-2.5">
                        <h4 className="font-bold text-sm tracking-tight text-gray-950 uppercase flex items-center gap-1.5">
                          <CheckCircle size={16} className="text-[#006b3d]" />
                          <span>Ruta Generada con Éxito</span>
                        </h4>

                        <span className="bg-[#056d3f]/10 text-[#006b3d] text-[10px] font-mono font-bold px-2 py-0.5 rounded-soft">
                          MODALIDAD: {optPriority.toUpperCase()}
                        </span>
                      </div>

                      {/* Metric Widgets Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-left">
                        {/* Distancia */}
                        <div className="bg-[#f8f9fa] p-3 border border-[#eaecf0] rounded-soft">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Distancia Radial</span>
                          <span className="font-mono text-lg font-bold text-gray-900">{optimizedResult.totalDistance} <span className="text-xs font-normal">km</span></span>
                        </div>

                        {/* Tiempo */}
                        <div className="bg-[#f8f9fa] p-3 border border-[#eaecf0] rounded-soft">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">Duración Estimada</span>
                          <span className="font-mono text-lg font-bold text-gray-900">{optimizedResult.estimatedHours} <span className="text-xs font-normal">hrs</span></span>
                        </div>

                        {/* Huella de Carbono */}
                        <div className="bg-[#f8f9fa] p-3 border border-emerald-300 rounded-soft text-left bg-emerald-50/20">
                          <span className="text-[10px] uppercase tracking-wider text-emerald-800 font-bold block flex items-center gap-0.5">
                            <Leaf size={10} className="text-[#006b3d]" /> CO2 Estimado
                          </span>
                          <span className="font-mono text-lg font-bold text-emerald-900">{optimizedResult.carbonKgs} <span className="text-xs font-normal">Kg_C</span></span>
                        </div>

                        {/* Costos de Peaje */}
                        <div className="bg-[#f8f9fa] p-3 border border-yellow-300 rounded-soft text-left bg-yellow-50/10">
                          <span className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">Costes Peaje AP</span>
                          <span className="font-mono text-lg font-bold text-[#6e5900]">
                            {optimizedResult.tollCosts > 0 ? `${optimizedResult.tollCosts} €` : '0 € (Gratis)'}
                          </span>
                        </div>
                      </div>

                      {/* Step by step manifest */}
                      <div className="mt-4">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Pasos de Desplazamiento y Controles RFID</h5>
                        
                        <div className="space-y-2 text-xs">
                          {optimizedResult.steps.map((step, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-[#f8f9fa] p-2 border border-gray-150/50 rounded-soft">
                              <span className="font-mono bg-[#006b3d] text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-gray-700 font-medium">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Preventions advice warning box */}
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-soft text-xs text-emerald-950 flex gap-2 items-start mt-2">
                      <ShieldCheck size={18} className="text-[#006b3d] mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-[#006b3d] mb-0.5">Recomendación Meteorológica e Vial:</div>
                        <p className="leading-relaxed text-[11px] text-gray-700">{optimizedResult.weatherRecommendation}</p>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-white border border-[#eaecf0] p-12 text-center text-gray-400 rounded-soft flex-1 flex flex-col justify-center items-center">
                    <Compass className="text-gray-300 mb-3" size={48} />
                    <p className="font-bold text-sm text-[#191c1d]">Simulador Inteligente Listo</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      Configure el origen, destino y su prioridad operativa (Velocidad, Huella Ecológica de Carbono o minimización de Costes Directos) en el panel de la izquierda para obtener los cálculos.
                    </p>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </main>
      </>
      )}

      {/* 5. Footer institucional */}
      <footer className="bg-white border-t border-[#eaecf0] py-4 text-xs text-gray-500 font-mono mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div>
            <span>© 2026 SGI Emprestur • Todos los derechos reservados.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-emerald-700 font-semibold">• CONTROL CENTRAL ACTIVO</span>
            <span>• LATENCY: 12ms</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
