/**
 * HeatmapLayer — CesiumJS GroundPrimitive 기반 히트맵 렌더러
 *
 * 엔티티 좌표를 geohash 셀로 집계 → 밀도 기반 색상 그래디언트 사각형으로 렌더링.
 * 카메라 고도에 따라 geohash precision을 적응적으로 조절한다.
 */
import * as Cesium from 'cesium';
import { geohashEncode, geohashDecode } from '@/correlation/SpatialIndex';
import type { HaloCell } from './AnomalyHaloDetector';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight?: number; // 기본 1
}

export interface HeatmapConfig {
  /** 히트맵 셀 투명도 (0-1) */
  opacity: number;
  /** 강도 배수 (1=기본, 높을수록 색이 진함) */
  intensity: number;
  /** 색상 팔레트 */
  palette: 'thermal' | 'viridis' | 'plasma';
}

const DEFAULT_CONFIG: HeatmapConfig = {
  opacity: 0.55,
  intensity: 1.0,
  palette: 'thermal',
};

/** 카메라 고도 → geohash precision 매핑 */
export function precisionForAltitude(altitude: number): number {
  if (altitude > 8_000_000) return 2;  // ~600km cells
  if (altitude > 3_000_000) return 3;  // ~150km cells
  if (altitude > 500_000) return 4;    // ~30km cells
  return 5;                             // ~5km cells
}

/** geohash precision → 셀 크기(도) 계산 */
function cellSizeDegrees(precision: number): { latSize: number; lngSize: number } {
  const latBits = Math.floor(precision * 5 / 2);
  const lngBits = Math.ceil(precision * 5 / 2);
  return {
    latSize: 180 / Math.pow(2, latBits),
    lngSize: 360 / Math.pow(2, lngBits),
  };
}

// ── 색상 팔레트 ──

type ColorRamp = [number, number, number][]; // [r, g, b] 0-255

const PALETTES: Record<string, ColorRamp> = {
  thermal: [
    [0, 0, 80],       // 최저: 진한 파랑
    [0, 60, 200],     // 파랑
    [0, 180, 220],    // 시안
    [50, 220, 100],   // 초록
    [220, 220, 0],    // 노랑
    [255, 140, 0],    // 주황
    [255, 40, 0],     // 빨강
    [200, 0, 0],      // 진한 빨강
  ],
  viridis: [
    [68, 1, 84],
    [72, 35, 116],
    [64, 67, 135],
    [52, 94, 141],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
    [253, 231, 37],
  ],
  plasma: [
    [13, 8, 135],
    [84, 2, 163],
    [139, 10, 165],
    [185, 50, 137],
    [219, 92, 104],
    [244, 136, 73],
    [254, 188, 43],
    [240, 249, 33],
  ],
};

/** 0-1 사이의 t값을 색상으로 보간 */
function samplePalette(t: number, palette: string): Cesium.Color {
  const ramp = PALETTES[palette] || PALETTES.thermal;
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (ramp.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, ramp.length - 1);
  const frac = idx - lo;

  const r = (ramp[lo][0] + (ramp[hi][0] - ramp[lo][0]) * frac) / 255;
  const g = (ramp[lo][1] + (ramp[hi][1] - ramp[lo][1]) * frac) / 255;
  const b = (ramp[lo][2] + (ramp[hi][2] - ramp[lo][2]) * frac) / 255;

  return new Cesium.Color(r, g, b, 1.0);
}

/** 포인트 배열 → geohash 셀별 밀도 맵 */
export function aggregatePoints(
  points: HeatmapPoint[],
  precision: number,
): Map<string, number> {
  const cells = new Map<string, number>();
  for (const p of points) {
    const hash = geohashEncode(p.lat, p.lng, precision);
    cells.set(hash, (cells.get(hash) ?? 0) + (p.weight ?? 1));
  }
  return cells;
}

/**
 * 히트맵 GroundPrimitive 생성
 *
 * @returns Cesium.GroundPrimitive 또는 null (데이터가 없을 때)
 */
export function createHeatmapPrimitive(
  points: HeatmapPoint[],
  cameraAltitude: number,
  config: Partial<HeatmapConfig> = {},
): Cesium.GroundPrimitive | null {
  if (points.length === 0) return null;

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const precision = precisionForAltitude(cameraAltitude);
  const cells = aggregatePoints(points, precision);

  if (cells.size === 0) return null;

  // 최대 밀도 계산 (강도 배수 적용)
  let maxDensity = 0;
  for (const count of cells.values()) {
    if (count > maxDensity) maxDensity = count;
  }
  if (maxDensity === 0) return null;

  // intensity 적용: 낮은 값도 눈에 잘 보이도록
  const effectiveMax = maxDensity / cfg.intensity;

  const { latSize, lngSize } = cellSizeDegrees(precision);
  const instances: Cesium.GeometryInstance[] = [];

  for (const [hash, count] of cells) {
    const center = geohashDecode(hash);
    const t = Math.min(count / effectiveMax, 1.0);

    // 밀도가 매우 낮은 셀은 스킵 (노이즈 제거)
    if (t < 0.05) continue;

    const color = samplePalette(t, cfg.palette);
    color.alpha = cfg.opacity * (0.3 + 0.7 * t); // 밀도에 비례하여 투명도 증가

    const west = Cesium.Math.toRadians(center.lng - lngSize / 2);
    const east = Cesium.Math.toRadians(center.lng + lngSize / 2);
    const south = Cesium.Math.toRadians(center.lat - latSize / 2);
    const north = Cesium.Math.toRadians(center.lat + latSize / 2);

    instances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: new Cesium.Rectangle(west, south, east, north),
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
        },
      }),
    );
  }

  if (instances.length === 0) return null;

  return new Cesium.GroundPrimitive({
    geometryInstances: instances,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      translucent: true,
    }),
    asynchronous: true,
    classificationType: Cesium.ClassificationType.BOTH,
  });
}

/**
 * 이상치 셀에 맥동 Halo GroundPrimitive를 생성한다.
 *
 * surge (z > +2σ): 오렌지/노란 글로우
 * void  (z < -2σ): 청록색 글로우
 *
 * @param pulseFactor 0~1, sin 변조값 — 맥동 효과용
 */
export function createHaloPrimitive(
  haloCells: HaloCell[],
  cameraAltitude: number,
  pulseFactor = 1.0,
): Cesium.GroundPrimitive | null {
  if (haloCells.length === 0) return null;

  const precision = precisionForAltitude(cameraAltitude);
  const { latSize, lngSize } = cellSizeDegrees(precision);
  const instances: Cesium.GeometryInstance[] = [];

  for (const cell of haloCells) {
    const strength = Math.min(Math.abs(cell.zScore) / 5.0, 1.0); // zScore 5 이상이면 최대
    const alpha = (0.2 + 0.5 * strength) * (0.35 + 0.65 * pulseFactor);

    let r: number, g: number, b: number;
    if (cell.type === 'surge') {
      // 급증: 노란색 → 오렌지 (strength에 따라)
      r = 1.0;
      g = 0.75 - 0.3 * strength;
      b = 0.0;
    } else {
      // 급감: 청록색
      r = 0.0;
      g = 0.85;
      b = 1.0;
    }

    const color = new Cesium.Color(r, g, b, alpha);

    // 원래 셀보다 40% 크게 → 글로우 halo 효과
    const scale = 1.4;
    const west = Cesium.Math.toRadians(cell.lng - (lngSize * scale) / 2);
    const east = Cesium.Math.toRadians(cell.lng + (lngSize * scale) / 2);
    const south = Cesium.Math.toRadians(cell.lat - (latSize * scale) / 2);
    const north = Cesium.Math.toRadians(cell.lat + (latSize * scale) / 2);

    instances.push(
      new Cesium.GeometryInstance({
        geometry: new Cesium.RectangleGeometry({
          rectangle: new Cesium.Rectangle(west, south, east, north),
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
        },
      }),
    );
  }

  if (instances.length === 0) return null;

  return new Cesium.GroundPrimitive({
    geometryInstances: instances,
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      translucent: true,
    }),
    asynchronous: true,
    classificationType: Cesium.ClassificationType.BOTH,
  });
}
