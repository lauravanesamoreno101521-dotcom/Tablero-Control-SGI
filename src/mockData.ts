/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shipment, Driver, FleetVehicle, IncidentAlert, GpsPoint } from './types.ts';

// Spanish logistic nodes for our map rendering
export const COORDINATES_MAP: Record<string, GpsPoint> = {
  'Madrid': { x: 50, y: 50 },
  'Barcelona': { x: 86, y: 28 },
  'Valencia': { x: 78, y: 56 },
  'Sevilla': { x: 26, y: 81 },
  'Bilbao': { x: 45, y: 12 },
  'Zaragoza': { x: 69, y: 32 },
  'Vigo': { x: 10, y: 20 },
  'Valladolid': { x: 38, y: 35 },
  'Málaga': { x: 36, y: 88 },
  'Alicante': { x: 74, y: 66 }
};

export const INITIAL_SHIPMENTS: Shipment[] = [
  {
    id: 'TRK-5421-ESP',
    origin: 'Sevilla',
    originCoords: COORDINATES_MAP['Sevilla'],
    destination: 'Madrid',
    destinationCoords: COORDINATES_MAP['Madrid'],
    status: 'transit',
    cargo: 'Componentes Aeroespaciales Airbus',
    weight: 4500,
    temperature: null,
    driverName: 'Carlos Alcaraz',
    vehicleLicence: 'M-2023-TX',
    eta: '14:30 Hoy',
    progress: 65,
    warningNote: null,
    sensorAnomaly: false
  },
  {
    id: 'TRK-9831-ESP',
    origin: 'Barcelona',
    originCoords: COORDINATES_MAP['Barcelona'],
    destination: 'Valencia',
    destinationCoords: COORDINATES_MAP['Valencia'],
    status: 'delayed',
    cargo: 'Vacunas y Plasma Refrigerado',
    weight: 1200,
    temperature: -18,
    driverName: 'Marta Ortega',
    vehicleLicence: 'B-4521-YY',
    eta: '18:45 Hoy (Retrasado)',
    progress: 30,
    warningNote: 'Retención total de 60 minutos en AP-7 cerca de Castellón por accidente.',
    sensorAnomaly: false
  },
  {
    id: 'TRK-3392-ESP',
    origin: 'Zaragoza',
    originCoords: COORDINATES_MAP['Zaragoza'],
    destination: 'Bilbao',
    destinationCoords: COORDINATES_MAP['Bilbao'],
    status: 'scheduled',
    cargo: 'Componentes Electrónicos de Alta Precisión',
    weight: 8200,
    temperature: null,
    driverName: 'Julio Iglesias',
    vehicleLicence: 'Z-7811-AM',
    eta: 'Mañana 08:00',
    progress: 0,
    warningNote: null,
    sensorAnomaly: false
  },
  {
    id: 'TRK-1093-ESP',
    origin: 'Madrid',
    originCoords: COORDINATES_MAP['Madrid'],
    destination: 'Barcelona',
    destinationCoords: COORDINATES_MAP['Barcelona'],
    status: 'transit',
    cargo: 'Fresas Ecológicas de Huelva',
    weight: 12000,
    temperature: 4.2,
    driverName: 'Sofia Vergara',
    vehicleLicence: 'M-9009-FL',
    eta: '17:15 Hoy',
    progress: 45,
    warningNote: null,
    sensorAnomaly: false
  },
  {
    id: 'TRK-8821-ESP',
    origin: 'Madrid',
    originCoords: COORDINATES_MAP['Madrid'],
    destination: 'Vigo',
    destinationCoords: COORDINATES_MAP['Vigo'],
    status: 'delivered',
    cargo: 'Repuestos Automotrices de Estructura',
    weight: 15200,
    temperature: null,
    driverName: 'Roberto Sanchez',
    vehicleLicence: 'M-1801-BB',
    eta: 'Entregado hace 1 hora',
    progress: 100,
    warningNote: null,
    sensorAnomaly: false
  },
  {
    id: 'TRK-7711-ESP',
    origin: 'Valencia',
    originCoords: COORDINATES_MAP['Valencia'],
    destination: 'Bilbao',
    destinationCoords: COORDINATES_MAP['Bilbao'],
    status: 'transit',
    cargo: 'Celdas de Litio Tipo Solid-State',
    weight: 6100,
    temperature: 24.8, // Battery temperature rising, unsafe!
    driverName: 'Alejandrina Diaz',
    vehicleLicence: 'V-3310-CX',
    eta: '12:15 Hoy',
    progress: 88,
    warningNote: 'TEMPERATURA ELEVADA: Supera regulaciones de seguridad para celdas de combustible (Max 22°C).',
    sensorAnomaly: true
  }
];

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'DRV-001',
    name: 'Carlos Alcaraz',
    licenseType: 'C+E Carga Pesada',
    hoursDrivenToday: 5.2,
    safetyScore: 96,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    status: 'on_duty',
    activeShipmentId: 'TRK-5421-ESP'
  },
  {
    id: 'DRV-002',
    name: 'Marta Ortega',
    licenseType: 'C+E Químicos & Termocontrol',
    hoursDrivenToday: 7.8, // close to limit!
    safetyScore: 92,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    status: 'on_duty',
    activeShipmentId: 'TRK-9831-ESP'
  },
  {
    id: 'DRV-003',
    name: 'Julio Iglesias',
    licenseType: 'C+E Mercancías Peligrosas',
    hoursDrivenToday: 0.0,
    safetyScore: 99,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    status: 'available',
    activeShipmentId: null
  },
  {
    id: 'DRV-004',
    name: 'Sofia Vergara',
    licenseType: 'C+E Carga Refrigeraciones',
    hoursDrivenToday: 6.1,
    safetyScore: 89,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    status: 'on_duty',
    activeShipmentId: 'TRK-1093-ESP'
  },
  {
    id: 'DRV-005',
    name: 'Roberto Sanchez',
    licenseType: 'C+E Camiones Pesados',
    hoursDrivenToday: 8.4, // over 8.0 safety threshold!
    safetyScore: 94,
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150',
    status: 'over_limit',
    activeShipmentId: null
  },
  {
    id: 'DRV-006',
    name: 'Alejandrina Diaz',
    licenseType: 'C+E ADR Mercancías Especiales',
    hoursDrivenToday: 4.5,
    safetyScore: 95,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    status: 'on_duty',
    activeShipmentId: 'TRK-7711-ESP'
  }
];

export const INITIAL_VEHICLES: FleetVehicle[] = [
  {
    id: 'VHC-01',
    model: 'Volvo FH Electric 540',
    licence: 'M-2023-TX',
    fuelLevel: 42,
    type: 'electric',
    coolantTemp: 34,
    status: 'active'
  },
  {
    id: 'VHC-02',
    model: 'Scania S770 V8 Hybrid',
    licence: 'B-4521-YY',
    fuelLevel: 21,
    type: 'hybrid',
    coolantTemp: 84,
    status: 'active'
  },
  {
    id: 'VHC-03',
    model: 'Volvo FH16 Globetrotter',
    licence: 'Z-7811-AM',
    fuelLevel: 95,
    type: 'diesel',
    coolantTemp: 18,
    status: 'idle'
  },
  {
    id: 'VHC-04',
    model: 'Tesla Semi Gen 2 Prototype',
    licence: 'M-9009-FL',
    fuelLevel: 66,
    type: 'electric',
    coolantTemp: 28,
    status: 'active'
  },
  {
    id: 'VHC-05',
    model: 'Mercedes Actros Gigaspace',
    licence: 'M-1801-BB',
    fuelLevel: 10,
    type: 'diesel',
    coolantTemp: 91,
    status: 'maintenance'
  },
  {
    id: 'VHC-06',
    model: 'Daf XG+ Cryo-Shield',
    licence: 'V-3310-CX',
    fuelLevel: 89,
    type: 'electric',
    coolantTemp: 31,
    status: 'active'
  }
];

export const INITIAL_ALERTS: IncidentAlert[] = [
  {
    id: 'AL-001',
    severity: 'critical',
    title: 'Anomalía Térmica Activa: TRK-7711-ESP',
    description: 'Temperatura interna de bateria de litio alcanzó 24.8°C (Límite crítico nominal es 22°C). Sensor de remolque reporta alerta de disipación activa.',
    timestamp: 'Hace 5 min',
    shipmentId: 'TRK-7711-ESP',
    checked: false
  },
  {
    id: 'AL-002',
    severity: 'warning',
    title: 'Retraso de Tránsito: TRK-9831-ESP',
    description: 'La unidad Marta Ortega reporta 60 minutos de retención vial en la provincia de Castellón por accidente externo en AP-7.',
    timestamp: 'Hace 12 min',
    shipmentId: 'TRK-9831-ESP',
    checked: false
  },
  {
    id: 'AL-003',
    severity: 'critical',
    title: 'Exceso Horas Tacógrafo: Roberto Sanchez',
    description: 'Tiempo total de conducción del chófer alcanzó 8.4 horas continuas (Máxima legal recomendada es 8.0h). Parada urgente obligatoria requerida.',
    timestamp: 'Hace 20 min',
    shipmentId: null,
    checked: false
  }
];
