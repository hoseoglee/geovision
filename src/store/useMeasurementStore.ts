import { create } from 'zustand';
import { useGeofenceStore } from './useGeofenceStore';

export type MeasureMode = 'distance' | 'area' | 'rangeRing' | null;
export type MeasureUnit = 'km' | 'nm' | 'mi';

export interface MeasurePoint {
  lat: number;
  lng: number;
}

export interface Measurement {
  id: string;
  type: 'distance' | 'area' | 'rangeRing';
  points: MeasurePoint[];
  /** km 단위 결과 (거리 또는 면적 km²) */
  result: number;
  /** 다중 웨이포인트 시 구간별 거리 (km) */
  segments?: number[];
}

const UNIT_FACTORS: Record<MeasureUnit, { factor: number; label: string }> = {
  km: { factor: 1, label: 'km' },
  nm: { factor: 0.539957, label: 'NM' },
  mi: { factor: 0.621371, label: 'mi' },
};

const RANGE_RING_RADII_KM = [50, 100, 200, 500];

interface MeasurementState {
  mode: MeasureMode;
  unit: MeasureUnit;
  points: MeasurePoint[];
  measurements: Measurement[];
  rangeRingRadii: number[];
  /** 마우스 이동 중 임시 좌표 (라이브 프리뷰용) */
  cursorPoint: MeasurePoint | null;

  startMeasure: (mode: MeasureMode) => void;
  addPoint: (point: MeasurePoint) => void;
  setCursorPoint: (point: MeasurePoint | null) => void;
  finishMeasure: () => void;
  cancelMeasure: () => void;
  removeMeasurement: (id: string) => void;
  clearAll: () => void;
  setUnit: (unit: MeasureUnit) => void;
  toggleMode: (mode: Exclude<MeasureMode, null>) => void;
}

function gid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** 대권거리 (Haversine) km */
export function haversineKm(p1: MeasurePoint, p2: MeasurePoint): number {
  const R = 6371;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 구면 다각형 면적 (km²) — Spherical Excess */
export function sphericalAreaKm2(points: MeasurePoint[]): number {
  if (points.length < 3) return 0;
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const n = points.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const k = (i + 2) % n;
    const lat1 = toRad(points[i].lat), lng1 = toRad(points[i].lng);
    const lat2 = toRad(points[j].lat), lng2 = toRad(points[j].lng);
    const lat3 = toRad(points[k].lat), lng3 = toRad(points[k].lng);
    sum += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    void lat3; void lng3;
  }
  // Shoelace on sphere approximation
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = toRad(points[i].lat), lng1 = toRad(points[i].lng);
    const lat2 = toRad(points[j].lat), lng2 = toRad(points[j].lng);
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs(area * R * R / 2);
  return area;
}

export function convertUnit(km: number, unit: MeasureUnit): number {
  return km * UNIT_FACTORS[unit].factor;
}

export function unitLabel(unit: MeasureUnit): string {
  return UNIT_FACTORS[unit].label;
}

export function formatDistance(km: number, unit: MeasureUnit): string {
  const val = convertUnit(km, unit);
  if (val < 1) return `${(val * 1000).toFixed(0)} m`;
  if (val < 100) return `${val.toFixed(2)} ${unitLabel(unit)}`;
  return `${val.toFixed(1)} ${unitLabel(unit)}`;
}

export function formatArea(km2: number, unit: MeasureUnit): string {
  const factor = UNIT_FACTORS[unit].factor;
  const val = km2 * factor * factor;
  if (val < 1) return `${(val * 1e6).toFixed(0)} m²`;
  return `${val.toFixed(2)} ${unitLabel(unit)}²`;
}

export const useMeasurementStore = create<MeasurementState>((set, get) => ({
  mode: null,
  unit: 'km',
  points: [],
  measurements: [],
  rangeRingRadii: RANGE_RING_RADII_KM,
  cursorPoint: null,

  startMeasure: (mode) => {
    // 측정 모드와 geofence 드로잉 모드는 상호 배제
    if (mode) useGeofenceStore.getState().cancelDrawing();
    set({ mode, points: [], cursorPoint: null });
  },

  addPoint: (point) => {
    const { mode, points } = get();
    if (!mode) return;
    if (mode === 'rangeRing') {
      // Range ring: 1 click → finish
      const m: Measurement = { id: gid('rr'), type: 'rangeRing', points: [point], result: 0 };
      set((s) => ({ measurements: [...s.measurements, m], mode: null, points: [], cursorPoint: null }));
      return;
    }
    set({ points: [...points, point] });
  },

  setCursorPoint: (point) => set({ cursorPoint: point }),

  finishMeasure: () => {
    const { mode, points } = get();
    if (!mode || points.length < 2) return;

    if (mode === 'distance') {
      const segments: number[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        segments.push(haversineKm(points[i], points[i + 1]));
      }
      const total = segments.reduce((a, b) => a + b, 0);
      const m: Measurement = { id: gid('dist'), type: 'distance', points: [...points], result: total, segments };
      set((s) => ({ measurements: [...s.measurements, m], mode: null, points: [], cursorPoint: null }));
    } else if (mode === 'area') {
      if (points.length < 3) return;
      const area = sphericalAreaKm2(points);
      const m: Measurement = { id: gid('area'), type: 'area', points: [...points], result: area };
      set((s) => ({ measurements: [...s.measurements, m], mode: null, points: [], cursorPoint: null }));
    }
  },

  cancelMeasure: () => set({ mode: null, points: [], cursorPoint: null }),

  removeMeasurement: (id) => set((s) => ({ measurements: s.measurements.filter((m) => m.id !== id) })),

  clearAll: () => set({ measurements: [], mode: null, points: [], cursorPoint: null }),

  setUnit: (unit) => set({ unit }),

  toggleMode: (mode) => {
    const current = get().mode;
    if (current === mode) {
      set({ mode: null, points: [], cursorPoint: null });
    } else {
      if (mode) useGeofenceStore.getState().cancelDrawing();
      set({ mode, points: [], cursorPoint: null });
    }
  },
}));
