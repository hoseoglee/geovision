/**
 * 정보전 탐지기 — 비정상 확산 패턴 감지
 *
 * 탐지 패턴:
 * 1. 동시 다지점 폭발: 동일 카테고리 뉴스가 지리적으로 분산된 위치에서 동시에 급증
 * 2. 확산 속도 이상: 특정 카테고리의 뉴스 밀도가 통계적 기준(2σ)을 초과
 * 3. 역방향 전파: 사건 발생지보다 원격지에서 먼저 또는 더 강하게 보도
 */

import { RollingStats } from './AnomalyDetector';
import type { OsintData } from '@/providers/OsintProvider';

export interface SpreadPattern {
  id: string;
  category: string;
  patternType: 'simultaneous-multinode' | 'velocity-spike' | 'reverse-propagation';
  severity: 'critical' | 'warning';
  title: string;
  message: string;
  suspiciousNodes: Array<{ lat: number; lng: number; label: string }>;
  detectedAt: number;
  sigmaDeviation: number;
  nodeCount: number;
}

export interface InfoWarfareConfig {
  enabled: boolean;
  sigmaThreshold: number;       // default: 2.0
  simultaneousWindowMs: number; // default: 30min
  minNodesForFlag: number;      // default: 3
  minSampleSize: number;        // default: 5
  minSpreadKm: number;          // default: 3000
}

export const DEFAULT_IW_CONFIG: InfoWarfareConfig = {
  enabled: true,
  sigmaThreshold: 2.0,
  simultaneousWindowMs: 30 * 60 * 1000,
  minNodesForFlag: 3,
  minSampleSize: 5,
  minSpreadKm: 3000,
};

/** 대략 1000km 셀로 지역 양자화 */
function quantizeRegion(lat: number, lng: number): string {
  return `${Math.round(lat / 9) * 9},${Math.round(lng / 18) * 18}`;
}

/** Haversine 거리 (km) */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class InfoWarfareDetector {
  private config: InfoWarfareConfig;
  // 카테고리별 속도 통계 (1h 롤링 윈도우)
  private velocityStats = new Map<string, RollingStats>();
  // 쿨다운: 패턴 키 → 마지막 발화 시각
  private lastFired = new Map<string, number>();
  private readonly COOLDOWN_MS = 10 * 60 * 1000; // 10분

  constructor(config: Partial<InfoWarfareConfig> = {}) {
    this.config = { ...DEFAULT_IW_CONFIG, ...config };
  }

  updateConfig(patch: Partial<InfoWarfareConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  getConfig(): InfoWarfareConfig {
    return { ...this.config };
  }

  /**
   * OSINT 데이터를 분석하여 새로 감지된 패턴 목록을 반환한다.
   * 호출자(InfoWarfareMonitor)가 주기적으로 호출한다.
   */
  analyze(items: OsintData[]): SpreadPattern[] {
    if (!this.config.enabled || items.length === 0) return [];

    const now = Date.now();
    const windowStart = now - this.config.simultaneousWindowMs;
    const recent = items.filter((i) => i.time >= windowStart);

    // 카테고리별 그룹화
    const byCategory = new Map<string, OsintData[]>();
    for (const item of recent) {
      const arr = byCategory.get(item.category) ?? [];
      arr.push(item);
      byCategory.set(item.category, arr);
    }

    const results: SpreadPattern[] = [];

    for (const [category, catItems] of byCategory) {
      const v = this._detectVelocitySpike(category, catItems, now);
      if (v) results.push(v);

      const m = this._detectSimultaneousMultiNode(category, catItems, now);
      if (m) results.push(m);

      const r = this._detectReversePropagation(category, catItems, now);
      if (r) results.push(r);
    }

    return results;
  }

  // ─── 패턴 1: 속도 급등 ────────────────────────────────────────────────────

  private _detectVelocitySpike(
    category: string,
    items: OsintData[],
    now: number,
  ): SpreadPattern | null {
    const ck = `velocity:${category}`;
    if (this._onCooldown(ck, now)) return null;

    let stats = this.velocityStats.get(category);
    if (!stats) {
      stats = new RollingStats(60 * 60 * 1000); // 1h
      this.velocityStats.set(category, stats);
    }

    const count = items.length;
    const isAnomaly = stats.isAnomaly(count, this.config.sigmaThreshold);
    const sigma = stats.stddev > 0 ? Math.abs(count - stats.mean) / stats.stddev : 0;

    stats.push(count, now);

    if (!isAnomaly || stats.count < this.config.minSampleSize) return null;

    this.lastFired.set(ck, now);
    return {
      id: `iw-velocity-${category}-${now}`,
      category,
      patternType: 'velocity-spike',
      severity: sigma >= this.config.sigmaThreshold * 2 ? 'critical' : 'warning',
      title: `INFOWAR: ${category.toUpperCase()} 속도 급등`,
      message: `${category} 뉴스 ${count}건 / 30분 (${sigma.toFixed(1)}σ, 평균 ${stats.mean.toFixed(1)}건)`,
      suspiciousNodes: items
        .slice(0, 12)
        .map((i) => ({ lat: i.lat, lng: i.lng, label: i.title.slice(0, 50) })),
      detectedAt: now,
      sigmaDeviation: sigma,
      nodeCount: count,
    };
  }

  // ─── 패턴 2: 동시 다지점 폭발 ────────────────────────────────────────────

  private _detectSimultaneousMultiNode(
    category: string,
    items: OsintData[],
    now: number,
  ): SpreadPattern | null {
    if (items.length < this.config.minNodesForFlag) return null;

    const ck = `multinode:${category}`;
    if (this._onCooldown(ck, now)) return null;

    const regions = new Set(items.map((i) => quantizeRegion(i.lat, i.lng)));
    if (regions.size < this.config.minNodesForFlag) return null;

    // 최대 분산 거리 확인
    let maxDist = 0;
    for (let i = 0; i < Math.min(items.length, 20); i++) {
      for (let j = i + 1; j < Math.min(items.length, 20); j++) {
        const d = distanceKm(items[i].lat, items[i].lng, items[j].lat, items[j].lng);
        if (d > maxDist) maxDist = d;
      }
    }
    if (maxDist < this.config.minSpreadKm) return null;

    this.lastFired.set(ck, now);
    const sigma = regions.size / this.config.minNodesForFlag;
    return {
      id: `iw-multinode-${category}-${now}`,
      category,
      patternType: 'simultaneous-multinode',
      severity: regions.size >= this.config.minNodesForFlag * 2 ? 'critical' : 'warning',
      title: `INFOWAR: ${category.toUpperCase()} 코디네이티드 캠페인 의심`,
      message: `${items.length}건 ${category} 뉴스가 ${regions.size}개 지역에서 동시 보도 (최대 분산 ${Math.round(maxDist)}km) — 조율된 미디어 활동 의심`,
      suspiciousNodes: items.map((i) => ({ lat: i.lat, lng: i.lng, label: i.title.slice(0, 50) })),
      detectedAt: now,
      sigmaDeviation: sigma,
      nodeCount: items.length,
    };
  }

  // ─── 패턴 3: 역방향 전파 ─────────────────────────────────────────────────

  private _detectReversePropagation(
    category: string,
    items: OsintData[],
    now: number,
  ): SpreadPattern | null {
    if (items.length < 4) return null;

    const ck = `reverse:${category}`;
    if (this._onCooldown(ck, now)) return null;

    const sorted = [...items].sort((a, b) => a.time - b.time);

    // 초기 25% 보도의 중심 = 진원지 추정
    const earlyCount = Math.max(1, Math.floor(sorted.length * 0.25));
    const earlyItems = sorted.slice(0, earlyCount);
    const lateItems = sorted.slice(earlyCount);

    const epicLat = earlyItems.reduce((s, i) => s + i.lat, 0) / earlyItems.length;
    const epicLng = earlyItems.reduce((s, i) => s + i.lng, 0) / earlyItems.length;

    const earlyAvgDist =
      earlyItems.reduce((s, i) => s + distanceKm(epicLat, epicLng, i.lat, i.lng), 0) /
      earlyItems.length;
    const lateAvgDist =
      lateItems.reduce((s, i) => s + distanceKm(epicLat, epicLng, i.lat, i.lng), 0) /
      Math.max(1, lateItems.length);

    // 역방향: 초기 보도가 진원지에서 더 멀다 (정상: 가까운 곳이 먼저)
    if (earlyAvgDist <= lateAvgDist * 1.5 || earlyAvgDist < 1000) return null;

    const ratio = earlyAvgDist / Math.max(1, lateAvgDist);

    this.lastFired.set(ck, now);
    return {
      id: `iw-reverse-${category}-${now}`,
      category,
      patternType: 'reverse-propagation',
      severity: ratio > 3 ? 'critical' : 'warning',
      title: `INFOWAR: ${category.toUpperCase()} 역방향 전파 감지`,
      message: `초기 보도 진원지 평균 ${Math.round(earlyAvgDist)}km — 정상 확산(근접→원격)과 반대 패턴. 정보전 징후.`,
      suspiciousNodes: earlyItems.map((i) => ({
        lat: i.lat,
        lng: i.lng,
        label: i.title.slice(0, 50),
      })),
      detectedAt: now,
      sigmaDeviation: ratio,
      nodeCount: items.length,
    };
  }

  private _onCooldown(key: string, now: number): boolean {
    const lt = this.lastFired.get(key);
    return lt !== undefined && now - lt < this.COOLDOWN_MS;
  }

  clear(): void {
    this.velocityStats.clear();
    this.lastFired.clear();
  }
}

/** 싱글톤 인스턴스 */
export const infoWarfareDetector = new InfoWarfareDetector();
