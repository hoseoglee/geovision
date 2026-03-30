/**
 * AnomalyHaloDetector — geohash 셀별 밀도 이상 탐지
 *
 * 히트맵 레이어의 각 셀 밀도를 롤링 통계로 추적하여
 * 평소 대비 급증(surge, z > +2σ) 또는 급감(void, z < -2σ) 셀을 감지한다.
 *
 * 특징:
 * - precision 3+ 셀만 추적 (precision 2는 너무 광역이라 의미 없음)
 * - 최소 5 샘플 이상 쌓인 후 판정 (초기 세션 안정화)
 * - 레이어당 maxCells 제한으로 메모리 관리
 */
import { RollingStats } from '@/correlation/AnomalyDetector';
import { geohashDecode } from '@/correlation/SpatialIndex';

export interface HaloCell {
  geohash: string;
  lat: number;
  lng: number;
  /** z-score: 양수=급증, 음수=급감 */
  zScore: number;
  type: 'surge' | 'void';
  density: number;
}

export class AnomalyHaloDetector {
  private stats: Map<string, Map<string, RollingStats>> = new Map();
  private currentDensity: Map<string, Map<string, number>> = new Map();
  private readonly windowMs: number;
  private readonly maxCellsPerLayer: number;

  constructor(windowMs = 30 * 60 * 1000, maxCellsPerLayer = 3000) {
    this.windowMs = windowMs;
    this.maxCellsPerLayer = maxCellsPerLayer;
  }

  /** 레이어의 현재 geohash 셀 밀도를 업데이트한다. precision < 3 셀은 무시. */
  update(layerId: string, cells: Map<string, number>, precision: number): void {
    // precision 2 이하는 셀이 너무 커서 의미 있는 이상 탐지 불가
    if (precision < 3) return;

    if (!this.stats.has(layerId)) {
      this.stats.set(layerId, new Map());
      this.currentDensity.set(layerId, new Map());
    }
    const layerStats = this.stats.get(layerId)!;
    const layerCurrent = this.currentDensity.get(layerId)!;

    layerCurrent.clear();
    for (const [hash, density] of cells) {
      let rs = layerStats.get(hash);
      if (!rs) {
        if (layerStats.size >= this.maxCellsPerLayer) continue;
        rs = new RollingStats(this.windowMs);
        layerStats.set(hash, rs);
      }
      rs.push(density);
      layerCurrent.set(hash, density);
    }
  }

  /**
   * z-score >= threshold 인 이상 셀 목록을 반환한다.
   * |zScore| 내림차순으로 정렬하여 상위 maxCells개만 반환 (시각 노이즈 방지).
   */
  getHaloCells(layerId: string, threshold = 2.0, maxCells = 20): HaloCell[] {
    const layerStats = this.stats.get(layerId);
    const layerCurrent = this.currentDensity.get(layerId);
    if (!layerStats || !layerCurrent) return [];

    const results: HaloCell[] = [];
    for (const [hash, rs] of layerStats) {
      if (rs.count < 5) continue;
      const stddev = rs.stddev;
      if (stddev === 0) continue;

      const currentVal = layerCurrent.get(hash) ?? 0;
      const zScore = (currentVal - rs.mean) / stddev;

      if (Math.abs(zScore) >= threshold) {
        const { lat, lng } = geohashDecode(hash);
        results.push({
          geohash: hash,
          lat,
          lng,
          zScore,
          type: zScore > 0 ? 'surge' : 'void',
          density: currentVal,
        });
      }
    }

    results.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
    return results.slice(0, maxCells);
  }

  clear(): void {
    this.stats.clear();
    this.currentDensity.clear();
  }
}
