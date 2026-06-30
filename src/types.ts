/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GpsPoint {
  x: number; // 0 to 100 for grid percentages
  y: number; // 0 to 100 for grid percentages
}

export type ShipmentStatus = 'transit' | 'scheduled' | 'delivered' | 'delayed';

export interface Shipment {
  id: string; // e.g., TRK-98302-ESP
  origin: string;
  originCoords: GpsPoint;
  destination: string;
  destinationCoords: GpsPoint;
  status: ShipmentStatus;
  cargo: string;
  weight: number; // kg
  temperature: number | null; // Celsius (if null, dry-van cargo)
  driverName: string;
  vehicleLicence: string;
  eta: string;
  progress: number; // 0 to 100
  warningNote: string | null;
  sensorAnomaly: boolean;
}

export type DriverStatus = 'available' | 'on_duty' | 'resting' | 'over_limit';

export interface Driver {
  id: string;
  name: string;
  licenseType: string;
  hoursDrivenToday: number; // Max 8 hours before warning
  safetyScore: number; // 0 to 100
  avatarUrl: string;
  status: DriverStatus;
  activeShipmentId: string | null;
}

export interface FleetVehicle {
  id: string;
  model: string;
  licence: string;
  fuelLevel: number; // percentage
  type: 'electric' | 'diesel' | 'hybrid';
  coolantTemp: number; // Celsius
  status: 'active' | 'idle' | 'maintenance';
}

export interface IncidentAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  shipmentId: string | null;
  checked: boolean;
}

export interface OptimizedRoute {
  steps: string[];
  totalDistance: number; // km
  estimatedHours: number;
  tollCosts: number; // EUR
  carbonKgs: number;
  weatherRecommendation: string;
  restStopCount: number;
}
