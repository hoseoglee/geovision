/**
 * 코릴레이션 엔진 - DSL 기반 동적 규칙 지원
 */
import { SpatialIndex, type SpatialEntity } from './SpatialIndex';
import { TemporalBuffer } from './TemporalBuffer';
import { AnomalyDetector, type AnomalyResult } from './AnomalyDetector';
import { type CorrelationRule, type CorrelationContext, type CorrelationAlert } from './rules';
import { compileDSL, BUILTIN_RULES_DSL, type RuleDSL } from './ruleDSL';
import { ruleStorage } from './ruleStorage';
import { CHOKEPOINTS } from '@/data/chokepoints';
import { NUCLEAR_PLANTS } from '@/data/overlayData';
import { useAlertStore } from '@/store/useAlertStore';

export class CorrelationEngine {
  readonly spatialIndex: SpatialIndex;
  readonly temporalBuffer: TemporalBuffer;
  readonly anomalyDetector: AnomalyDetector;
  private rules: CorrelationRule[];
  private dslRules: Map<string, RuleDSL> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onCorrelation: ((alert: CorrelationAlert) => void) | null = null;
  private onAnomaly: ((result: AnomalyResult) => void) | null = null;
  private lastFired: Map<string, number> = new Map();

  constructor() {
    this.spatialIndex = new SpatialIndex(5);
    this.temporalBuffer = new TemporalBuffer();
    this.anomalyDetector = new AnomalyDetector();
    this.rules = [];
    for (const dsl of BUILTIN_RULES_DSL) this.dslRules.set(dsl.id, dsl);
    this.recompileRules();
    this.loadStaticData();
    this.loadCustomRules();
  }

  private recompileRules(): void {
    this.rules = [];
    for (const dsl of this.dslRules.values()) {
      if (dsl.enabled) this.rules.push(compileDSL(dsl));
    }
  }

  private async loadCustomRules(): Promise<void> {
    try {
      const stored = await ruleStorage.loadRules();
      for (const rule of stored) this.dslRules.set(rule.id, rule);
      this.recompileRules();
    } catch (e) { console.warn('Failed to load custom rules:', e); }
  }

  addRule(dsl: RuleDSL): void { this.dslRules.set(dsl.id, dsl); this.recompileRules(); ruleStorage.saveRule(dsl).catch(console.warn); }
  removeRule(id: string): void { this.dslRules.delete(id); this.recompileRules(); ruleStorage.deleteRule(id).catch(console.warn); }
  toggleRule(id: string, enabled: boolean): void { const d = this.dslRules.get(id); if (d) { d.enabled = enabled; d.updatedAt = Date.now(); this.recompileRules(); ruleStorage.saveRule(d).catch(console.warn); } }
  getDSLRules(): RuleDSL[] { return [...this.dslRules.values()]; }
  getDSLRule(id: string): RuleDSL | undefined { return this.dslRules.get(id); }

  private loadStaticData(): void {
    this.spatialIndex.update('chokepoints', CHOKEPOINTS.map((cp) => ({ id: `cp-${cp.name}`, layer: 'chokepoints', lat: cp.lat, lng: cp.lng, data: { name: cp.name, type: cp.type, info: cp.info } })));
    this.spatialIndex.update('nuclear_plants', NUCLEAR_PLANTS.map((np) => ({ id: `np-${np.name}`, layer: 'nuclear_plants', lat: np.lat, lng: np.lng, data: { name: np.name, country: np.country, reactors: np.reactors, status: np.status } })));
  }

  setOnCorrelation(cb: (alert: CorrelationAlert) => void): void { this.onCorrelation = cb; }
  setOnAnomaly(cb: (result: AnomalyResult) => void): void { this.onAnomaly = cb; }
  start(): void { if (this.intervalId) return; this.evaluate(); this.intervalId = setInterval(() => this.evaluate(), 10000); }
  stop(): void { if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; } }
  destroy(): void { this.stop(); this.temporalBuffer.destroy(); this.spatialIndex.clear(); this.anomalyDetector.clear(); this.lastFired.clear(); this.dslRules.clear(); }
  get isRunning(): boolean { return this.intervalId !== null; }

  updateLayer(layer: string, entities: SpatialEntity[]): void {
    this.spatialIndex.update(layer, entities);
    for (const entity of entities) this.temporalBuffer.addEvent({ id: entity.id, type: `${layer}_update`, layer, lat: entity.lat, lng: entity.lng, timestamp: Date.now(), data: entity.data });
  }

  private evaluate(): void { const now = Date.now(); this.evaluateRules(now); this.evaluateAnomalies(now); }

  private evaluateRules(now: number): void {
    const rulesByTrigger = new Map<string, CorrelationRule[]>();
    for (const rule of this.rules) { const tl = rule.layers[0]; const g = rulesByTrigger.get(tl) ?? []; g.push(rule); rulesByTrigger.set(tl, g); }
    for (const [triggerLayer, rules] of rulesByTrigger.entries()) {
      const entities = this.spatialIndex.getByLayer(triggerLayer);
      const clusters = new Set<string>();
      for (const entity of entities) {
        const selfRef = rules.some((r) => r.layers.length === 1);
        if (selfRef) { const ck = `${Math.round(entity.lat)},${Math.round(entity.lng)}`; if (clusters.has(ck)) continue; clusters.add(ck); }
        for (const rule of rules) {
          const ck = selfRef ? `${rule.id}:${Math.round(entity.lat)},${Math.round(entity.lng)}` : `${rule.id}:${entity.id}`;
          const lt = this.lastFired.get(ck); const dsl = this.dslRules.get(rule.id); const cd = (dsl?.cooldown ?? 60) * 1000;
          if (lt && now - lt < cd) continue;
          const nearby = this.spatialIndex.nearby(entity.lat, entity.lng, rule.spatialRadius);
          const ctx: CorrelationContext = { centerLat: entity.lat, centerLng: entity.lng, nearbyEntities: nearby, matchedEntities: [], triggerEntity: entity };
          if (rule.condition(ctx)) {
            const alert = rule.generate(ctx); this.lastFired.set(ck, now); this.emitCorrelation(alert);
            if (dsl) { dsl.triggerCount++; dsl.lastTriggered = now; ruleStorage.updateRuleStats(rule.id, now).catch(() => {}); }
          }
        }
      }
    }
  }

  private evaluateAnomalies(_now: number): void {
    for (const cp of this.spatialIndex.getByLayer('chokepoints')) {
      const sc = this.spatialIndex.nearby(cp.lat, cp.lng, 50).filter((e) => e.layer === 'ships').length;
      const r = this.anomalyDetector.update('chokepoint_ships', cp.id, sc, `${cp.data.name}: ship density`); if (r) this.emitAnomaly(r);
    }
    const mc = this.spatialIndex.getByLayer('adsb').length;
    const mr = this.anomalyDetector.update('military_aircraft', 'global', mc, 'Global military aircraft count'); if (mr) this.emitAnomaly(mr);
  }

  private getCategoryForRule(ruleId: string): import('@/store/useAlertStore').AlertCategory {
    const m: Record<string, import('@/store/useAlertStore').AlertCategory> = { 'earthquake-nuclear': 'nuclear', 'chokepoint-congestion': 'chokepoint', 'military-cluster': 'flight', 'earthquake-cctv': 'earthquake', 'earthquake-shipping': 'earthquake', 'earthquake-volcano': 'earthquake', 'wildfire-wind': 'system' };
    if (m[ruleId]) return m[ruleId];
    const dsl = this.dslRules.get(ruleId);
    if (dsl) { const lm: Record<string, import('@/store/useAlertStore').AlertCategory> = { earthquakes: 'earthquake', ships: 'ship', adsb: 'flight', satellites: 'satellite', chokepoints: 'chokepoint', nuclear_plants: 'nuclear' }; return lm[dsl.triggerLayer] ?? 'system'; }
    return 'system';
  }

  private emitCorrelation(alert: CorrelationAlert): void {
    if (this.onCorrelation) this.onCorrelation(alert);
    useAlertStore.getState().addAlert({ severity: alert.severity, category: this.getCategoryForRule(alert.ruleId), title: alert.title, message: alert.message, lat: alert.lat, lng: alert.lng });
  }

  private emitAnomaly(result: AnomalyResult): void {
    if (this.onAnomaly) this.onAnomaly(result);
    useAlertStore.getState().addAlert({ severity: 'warning', category: 'system', title: 'ANOMALY DETECTED', message: `${result.label}: current=${result.currentValue.toFixed(0)}, mean=${result.mean.toFixed(1)}, ${result.sigmaDeviation.toFixed(1)}sigma deviation.` });
  }
}
