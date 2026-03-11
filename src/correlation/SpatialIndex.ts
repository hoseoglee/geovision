/**
 * Geohash 기반 공간 인덱스
 * - precision 5 (~5km 셀)
 * - 외부 라이브러리 없이 직접 구현
 */

// Geohash base32 문자열
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export interface SpatialEntity {
  id: string;
  layer: string;
  lat: number;
  lng: number;
  data: Record<string, unknown>;
}

/** lat/lng → geohash 문자열 (precision 자릿수) */
export function geohashEncode(lat: number, lng: number, precision = 5): string {
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch |= (1 << (4 - bit));
        lngMin = mid;
      } else {
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isLng = !isLng;
    bit++;
    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/** geohash → { lat, lng } 중심점 */
export function geohashDecode(hash: string): { lat: number; lng: number } {
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  let isLng = true;

  for (const c of hash) {
    const idx = BASE32.indexOf(c);
    if (idx < 0) break;
    for (let bit = 4; bit >= 0; bit--) {
      if (isLng) {
        const mid = (lngMin + lngMax) / 2;
        if (idx & (1 << bit)) { lngMin = mid; } else { lngMax = mid; }
      } else {
        const mid = (latMin + latMax) / 2;
        if (idx & (1 << bit)) { latMin = mid; } else { latMax = mid; }
      }
      isLng = !isLng;
    }
  }
  return {
    lat: (latMin + latMax) / 2,
    lng: (lngMin + lngMax) / 2,
  };
}

/** geohash 8방위 이웃 셀 계산 */
export function geohashNeighbors(hash: string): string[] {
  const center = geohashDecode(hash);
  // precision 5 셀 크기 약 0.044° lat, 0.055° lng
  const precision = hash.length;
  const latStep = 180 / Math.pow(2, Math.ceil(precision * 5 / 2));
  const lngStep = 360 / Math.pow(2, Math.floor(precision * 5 / 2));

  const offsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  const result: string[] = [];
  for (const [dlat, dlng] of offsets) {
    const lat = center.lat + dlat * latStep * 2;
    const lng = center.lng + dlng * lngStep * 2;
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      result.push(geohashEncode(lat, lng, precision));
    }
  }
  return result;
}

/** Haversine 거리 (km) */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 반경 km를 커버하는 데 필요한 geohash ring 수 계산 */
function ringsForRadius(radiusKm: number): number {
  // precision 5: ~5km 셀 → 100km = ~20셀 = ~10 rings
  const cellSizeKm = 5;
  const rings = Math.ceil(radiusKm / cellSizeKm) + 1;
  // 성능 보호: 최대 30 rings (~150km 실효 반경)으로 제한
  return Math.min(rings, 30);
}

export class SpatialIndex {
  private precision: number;
  // geohash → SpatialEntity[]
  private index: Map<string, SpatialEntity[]> = new Map();
  // layer → Set<geohash> (레이어별 점유 셀 추적, 갱신 시 정리용)
  private layerCells: Map<string, Set<string>> = new Map();

  constructor(precision = 5) {
    this.precision = precision;
  }

  /** 레이어별 엔티티 일괄 갱신 */
  update(layer: string, entities: SpatialEntity[]): void {
    // 기존 레이어 데이터 제거
    const oldCells = this.layerCells.get(layer);
    if (oldCells) {
      for (const cell of oldCells) {
        const arr = this.index.get(cell);
        if (arr) {
          const filtered = arr.filter((e) => e.layer !== layer);
          if (filtered.length === 0) {
            this.index.delete(cell);
          } else {
            this.index.set(cell, filtered);
          }
        }
      }
    }

    // 새 데이터 삽입
    const newCells = new Set<string>();
    for (const entity of entities) {
      const hash = geohashEncode(entity.lat, entity.lng, this.precision);
      newCells.add(hash);
      const arr = this.index.get(hash);
      if (arr) {
        arr.push(entity);
      } else {
        this.index.set(hash, [entity]);
      }
    }
    this.layerCells.set(layer, newCells);
  }

  /** 반경 radiusKm 내의 엔티티 조회 */
  nearby(lat: number, lng: number, radiusKm: number): SpatialEntity[] {
    const results: SpatialEntity[] = [];
    const visited = new Set<string>();
    const rings = ringsForRadius(radiusKm);

    // BFS로 중심에서 rings만큼 확장
    const centerHash = geohashEncode(lat, lng, this.precision);
    visited.add(centerHash);

    // 간단한 BFS: rings 횟수만큼 확장
    let frontier = [centerHash];
    for (let r = 0; r < rings; r++) {
      const nextFrontier: string[] = [];
      for (const h of frontier) {
        // 이 셀의 엔티티 수집
        const entities = this.index.get(h);
        if (entities) {
          for (const e of entities) {
            if (haversineKm(lat, lng, e.lat, e.lng) <= radiusKm) {
              results.push(e);
            }
          }
        }
        // 이웃 셀 확장
        for (const n of geohashNeighbors(h)) {
          if (!visited.has(n)) {
            visited.add(n);
            nextFrontier.push(n);
          }
        }
      }
      frontier = nextFrontier;
    }

    // 마지막 frontier의 엔티티도 수집
    for (const h of frontier) {
      const entities = this.index.get(h);
      if (entities) {
        for (const e of entities) {
          if (haversineKm(lat, lng, e.lat, e.lng) <= radiusKm) {
            results.push(e);
          }
        }
      }
    }

    return results;
  }

  /** 특정 레이어의 모든 엔티티 가져오기 */
  getByLayer(layer: string): SpatialEntity[] {
    const cells = this.layerCells.get(layer);
    if (!cells) return [];
    const results: SpatialEntity[] = [];
    for (const cell of cells) {
      const entities = this.index.get(cell);
      if (entities) {
        for (const e of entities) {
          if (e.layer === layer) results.push(e);
        }
      }
    }
    return results;
  }

  /** 전체 엔티티 수 */
  get size(): number {
    let count = 0;
    for (const arr of this.index.values()) {
      count += arr.length;
    }
    return count;
  }

  /** 전체 초기화 */
  clear(): void {
    this.index.clear();
    this.layerCells.clear();
  }
}
