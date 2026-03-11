/**
 * 코릴레이션 엔진
 * - 10초 간격 실행 루프
 * - SpatialIndex + TemporalBuffer + Rules 조합
 * - 결과를 useCorrelationStore + useAlertStore에 저장
 */

import { SpatialIndex, type SpatialEntity } from './SpatialIndex';
import { TemporalBuffer, type TemporalEvent } from './TemporalBuffer';
import { AnomalyDetector, type AnomalyResult } from './AnomalyDetector';
import { BUILTIN_RULES, type CorrelationRule, type CorrelationContext, type CorrelationAlert } from './rules';
import { CHOKEPOINTS } from '@/data/chokepoints';
import { NUCLEAR_PLANTS } from '@/data/overlayData';
import { useAlertStore } from '@/store/useAlertStore';

export class CorrelationEngine {
  readonly spatialIndex: SpatialIndex;
  readonly temporalBuffer: TemporalBuffer;
  readonly anomalyDetector: AnomalyDetector;
  private rules: CorrelationRule[];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onCorrelation: ((alert: CorrelationAlert) => void) | null = null;
  private onAnomaly: ((result: AnomalyResult) => void) | null = null;
  // 중복 방지: ruleId → 마지막 발생 시각
  private lastFired: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 60000; // 같은 규칙은 60초 쿨다운

  constructor() {
    this.spatialIndex = new SpatialIndex(5);
    this.temporalBuffer = new TemporalBuffer();
    this.anomalyDetector = new AnomalyDetector();
    this.rules = [...BUILTIN_RULES];

    // 정적 데이터 초기 로드 (초크포인트, 원전)
    this.loadStaticData();
  }

  /** 정적 데이터를 공간 인덱스에 로드 */
  private loadStaticData(): void {
    const cpEntities: SpatialEntity[] = CHOKEPOINTS.map((cp) => ({
      id: `cp-${cp.name}`,
      layer: 'chokepoints',
      lat: cp.lat,
      lng: cp.lng,
      data: { name: cp.name, type: cp.type, info: cp.info },
    }));
    this.spatialIndex.update('chokepoints', cpEntities);

    const npEntities: SpatialEntity[] = NUCLEAR_PLANTS.map((np) => ({
      id: `np-${np.name}`,
      layer: 'nuclear_plants',
      lat: np.lat,
      lng: np.lng,
      data: { name: np.name, country: np.country, reactors: np.reactors, status: np.status },
    }));
    this.spatialIndex.update('nuclear_plants', npEntities);
  }

  /** 코릴레이션 결과 콜백 등록 */
  setOnCorrelation(cb: (alert: CorrelationAlert) => void): void {
    this.onCorrelation = cb;
  }

  /** 이상 탐지 결과 콜백 등록 */
  setOnAnomaly(cb: (result: AnomalyResult) => void): void {
    this.onAnomaly = cb;
  }

  /** 엔진 시작 (10초 간격) */
  start(): void {
    if (this.intervalId) return;
    this.evaluate(); // 즉시 1회 실행
    this.intervalId = setInterval(() => this.evaluate(), 10000);
  }

  /** 엔진 정지 */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** 엔진 파괴 (리소스 정리) */
  destroy(): void {
    this.stop();
    this.temporalBuffer.destroy();
    this.spatialIndex.clear();
    this.anomalyDetector.clear();
    this.lastFired.clear();
  }

  get isRunning(): boolean {
    return this.intervalId !== null;
  }

  /** 레이어 데이터 업데이트 (Globe에서 호출) */
  updateLayer(layer: string, entities: SpatialEntity[]): void {
    this.spatialIndex.update(layer, entities);

    // 시간 버퍼에 이벤트 기록
    for (const entity of entities) {
      this.temporalBuffer.addEvent({
        id: entity.id,
        type: `${layer}_update`,
        layer,
        lat: entity.lat,
        lng: entity.lng,
        timestamp: Date.now(),
        data: entity.data,
      });
    }
  }

  /** 메인 평가 루프 */
  private evaluate(): void {
    const now = Date.now();

    // 1. 규칙 기반 코릴레이션 평가
    this.evaluateRules(now);

    // 2. 통계 기반 이상 탐지
    this.evaluateAnomalies(now);
  }

  /** 규칙 평가 */
  private evaluateRules(now: number): void {
    // 지진 트리거 규칙 (earthquake-nuclear, earthquake-cctv, earthquake-shipping)
    const earthquakes = this.spatialIndex.getByLayer('earthquakes');
    for (const quake of earthquakes) {
      for (const rule of this.rules) {
        if (!rule.layers.includes('earthquakes')) continue;

        // 쿨다운 체크 (규칙+트리거 키)
        const cooldownKey = `${rule.id}:${quake.id}`;
        const lastTime = this.lastFired.get(cooldownKey);
        if (lastTime && now - lastTime < this.COOLDOWN_MS) continue;

        const nearby = this.spatialIndex.nearby(quake.lat, quake.lng, rule.spatialRadius);
        const ctx: CorrelationContext = {
          centerLat: quake.lat,
          centerLng: quake.lng,
          nearbyEntities: nearby,
          matchedEntities: [],
          triggerEntity: quake,
        };

        if (rule.condition(ctx)) {
          const alert = rule.generate(ctx);
          this.lastFired.set(cooldownKey, now);
          this.emitCorrelation(alert);
        }
      }
    }

    // 초크포인트 트리거 규칙 (chokepoint-congestion)
    const chokepoints = this.spatialIndex.getByLayer('chokepoints');
    for (const cp of chokepoints) {
      const rule = this.rules.find((r) => r.id === 'chokepoint-congestion');
      if (!rule) continue;

      const cooldownKey = `${rule.id}:${cp.id}`;
      const lastTime = this.lastFired.get(cooldownKey);
      if (lastTime && now - lastTime < this.COOLDOWN_MS) continue;

      const nearby = this.spatialIndex.nearby(cp.lat, cp.lng, rule.spatialRadius);
      const ctx: CorrelationContext = {
        centerLat: cp.lat,
        centerLng: cp.lng,
        nearbyEntities: nearby,
        matchedEntities: [],
        triggerEntity: cp,
      };

      if (rule.condition(ctx)) {
        const alert = rule.generate(ctx);
        this.lastFired.set(cooldownKey, now);
        this.emitCorrelation(alert);
      }
    }

    // 화산 근접 지진 규칙 (earthquake-volcano)
    for (const quake of earthquakes) {
      const rule = this.rules.find((r) => r.id === 'earthquake-volcano');
      if (!rule) continue;

      const cooldownKey = `${rule.id}:${quake.id}`;
      const lastTime = this.lastFired.get(cooldownKey);
      if (lastTime && now - lastTime < this.COOLDOWN_MS) continue;

      const nearby = this.spatialIndex.nearby(quake.lat, quake.lng, rule.spatialRadius);
      const ctx: CorrelationContext = {
        centerLat: quake.lat,
        centerLng: quake.lng,
        nearbyEntities: nearby,
        matchedEntities: [],
        triggerEntity: quake,
      };

      if (rule.condition(ctx)) {
        const alert = rule.generate(ctx);
        this.lastFired.set(cooldownKey, now);
        this.emitCorrelation(alert);
      }
    }

    // 군용기 클러스터 규칙
    const milAircraft = this.spatialIndex.getByLayer('adsb');
    const evaluatedClusters = new Set<string>();
    for (const ac of milAircraft) {
      const rule = this.rules.find((r) => r.id === 'military-cluster');
      if (!rule) continue;

      // 중복 클러스터 방지: 이미 평가된 클러스터 영역 스킵
      const clusterKey = `${Math.round(ac.lat)},${Math.round(ac.lng)}`;
      if (evaluatedClusters.has(clusterKey)) continue;
      evaluatedClusters.add(clusterKey);

      const cooldownKey = `${rule.id}:${clusterKey}`;
      const lastTime = this.lastFired.get(cooldownKey);
      if (lastTime && now - lastTime < this.COOLDOWN_MS) continue;

      const nearby = this.spatialIndex.nearby(ac.lat, ac.lng, rule.spatialRadius);
      const ctx: CorrelationContext = {
        centerLat: ac.lat,
        centerLng: ac.lng,
        nearbyEntities: nearby,
        matchedEntities: [],
        triggerEntity: ac,
      };

      if (rule.condition(ctx)) {
        const alert = rule.generate(ctx);
        this.lastFired.set(cooldownKey, now);
        this.emitCorrelation(alert);
      }
    }
  }

  /** 이상 탐지 평가 */
  private evaluateAnomalies(_now: number): void {
    // 초크포인트별 선박 수
    const chokepoints = this.spatialIndex.getByLayer('chokepoints');
    for (const cp of chokepoints) {
      const nearby = this.spatialIndex.nearby(cp.lat, cp.lng, 50);
      const shipCount = nearby.filter((e) => e.layer === 'ships').length;
      const result = this.anomalyDetector.update(
        'chokepoint_ships',
        cp.id,
        shipCount,
        `${cp.data.name}: ship density`,
      );
      if (result) this.emitAnomaly(result);
    }

    // 군용기 출현 빈도 (전역)
    const milCount = this.spatialIndex.getByLayer('adsb').length;
    const milResult = this.anomalyDetector.update(
      'military_aircraft',
      'global',
      milCount,
      'Global military aircraft count',
    );
    if (milResult) this.emitAnomaly(milResult);
  }

  /** 규칙 ID → Alert 카테고리 매핑 */
  private static readonly RULE_CATEGORY: Record<string, import('@/store/useAlertStore').AlertCategory> = {
    'earthquake-nuclear': 'nuclear',
    'chokepoint-congestion': 'chokepoint',
    'military-cluster': 'flight',
    'earthquake-cctv': 'earthquake',
    'earthquake-shipping': 'earthquake',
    'earthquake-volcano': 'earthquake',
    'wildfire-wind': 'system',
  };

  /** 코릴레이션 알림 발행 */
  private emitCorrelation(alert: CorrelationAlert): void {
    if (this.onCorrelation) {
      this.onCorrelation(alert);
    }

    // 기존 Alert 시스템에도 연동
    useAlertStore.getState().addAlert({
      severity: alert.severity,
      category: CorrelationEngine.RULE_CATEGORY[alert.ruleId] ?? 'system',
      title: alert.title,
      message: alert.message,
      lat: alert.lat,
      lng: alert.lng,
    });
  }

  /** 이상 탐지 알림 발행 */
  private emitAnomaly(result: AnomalyResult): void {
    if (this.onAnomaly) {
      this.onAnomaly(result);
    }

    useAlertStore.getState().addAlert({
      severity: 'warning',
      category: 'system',
      title: 'ANOMALY DETECTED',
      message: `${result.label}: current=${result.currentValue.toFixed(0)}, mean=${result.mean.toFixed(1)}, ${result.sigmaDeviation.toFixed(1)}sigma deviation.`,
    });
  }
}
