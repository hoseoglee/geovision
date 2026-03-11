/**
 * 통계 기반 이상 탐지
 * - Welford's online algorithm으로 이동평균 + 표준편차 계산
 * - 2sigma 이상 편차 시 anomaly 판정
 * - 30분 윈도우 (슬라이딩)
 */

/** Welford의 온라인 알고리즘을 활용한 롤링 통계 */
export class RollingStats {
  private windowMs: number;
  private samples: { value: number; timestamp: number }[] = [];
  private _count = 0;
  private _mean = 0;
  private _m2 = 0;

  constructor(windowMs = 30 * 60 * 1000) {
    this.windowMs = windowMs;
  }

  /** 새 샘플 추가 */
  push(value: number, timestamp = Date.now()): void {
    this.samples.push({ value, timestamp });
    this._count++;
    const delta = value - this._mean;
    this._mean += delta / this._count;
    const delta2 = value - this._mean;
    this._m2 += delta * delta2;

    // 윈도우 밖 샘플 정리 — 통계값 재계산
    this.evict(timestamp);
  }

  /** 만료 샘플 제거 및 통계 재계산 */
  private evict(now: number): void {
    const cutoff = now - this.windowMs;
    const oldLen = this.samples.length;
    this.samples = this.samples.filter((s) => s.timestamp >= cutoff);

    if (this.samples.length < oldLen) {
      // 제거된 항목이 있으면 통계 재계산 (Welford는 삭제에 비효율적이므로 재계산)
      this.recalculate();
    }
  }

  /** 전체 통계 재계산 */
  private recalculate(): void {
    this._count = this.samples.length;
    if (this._count === 0) {
      this._mean = 0;
      this._m2 = 0;
      return;
    }
    let mean = 0;
    let m2 = 0;
    let n = 0;
    for (const s of this.samples) {
      n++;
      const delta = s.value - mean;
      mean += delta / n;
      const delta2 = s.value - mean;
      m2 += delta * delta2;
    }
    this._mean = mean;
    this._m2 = m2;
  }

  get mean(): number { return this._mean; }
  get variance(): number { return this._count > 1 ? this._m2 / (this._count - 1) : 0; }
  get stddev(): number { return Math.sqrt(this.variance); }
  get count(): number { return this._count; }

  /** 최근 값이 2sigma 이상 편차인지 판정 */
  isAnomaly(value: number, sigmaThreshold = 2): boolean {
    if (this._count < 5) return false; // 샘플 부족
    const deviation = Math.abs(value - this._mean);
    return deviation > sigmaThreshold * this.stddev;
  }

  /** 전체 초기화 */
  clear(): void {
    this.samples = [];
    this._count = 0;
    this._mean = 0;
    this._m2 = 0;
  }
}

export type AnomalyMetric = 'chokepoint_ships' | 'region_aircraft' | 'military_aircraft';

export interface AnomalyResult {
  metric: AnomalyMetric;
  label: string;
  currentValue: number;
  mean: number;
  stddev: number;
  sigmaDeviation: number;
}

export class AnomalyDetector {
  // metric_key → RollingStats
  private stats: Map<string, RollingStats> = new Map();
  private windowMs: number;

  constructor(windowMs = 30 * 60 * 1000) {
    this.windowMs = windowMs;
  }

  /** 지표 업데이트 및 이상 판정 */
  update(metric: AnomalyMetric, key: string, value: number, label: string): AnomalyResult | null {
    const fullKey = `${metric}:${key}`;
    let rs = this.stats.get(fullKey);
    if (!rs) {
      rs = new RollingStats(this.windowMs);
      this.stats.set(fullKey, rs);
    }

    const isAnomaly = rs.isAnomaly(value);
    const result: AnomalyResult | null = isAnomaly ? {
      metric,
      label,
      currentValue: value,
      mean: rs.mean,
      stddev: rs.stddev,
      sigmaDeviation: rs.stddev > 0 ? Math.abs(value - rs.mean) / rs.stddev : 0,
    } : null;

    rs.push(value);
    return result;
  }

  /** 전체 초기화 */
  clear(): void {
    this.stats.clear();
  }
}
