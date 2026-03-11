/**
 * 코릴레이션 규칙 엔진
 * - 5개 내장 규칙
 * - SpatialIndex + TemporalBuffer를 활용한 조건 평가
 */

import type { SpatialEntity } from './SpatialIndex';
import type { AlertSeverity } from '@/store/useAlertStore';

export interface CorrelationContext {
  // 규칙 평가 시 제공되는 컨텍스트
  centerLat: number;
  centerLng: number;
  nearbyEntities: SpatialEntity[];
  matchedEntities: SpatialEntity[]; // 조건에 맞는 엔티티
  triggerEntity?: SpatialEntity;    // 트리거 엔티티 (예: 지진)
}

export interface CorrelationAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  lat: number;
  lng: number;
  timestamp: number;
  relatedEntities: { id: string; layer: string; lat: number; lng: number }[];
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  layers: string[];
  spatialRadius: number;    // km
  temporalWindow: number;   // seconds
  condition: (ctx: CorrelationContext) => boolean;
  severity: AlertSeverity;
  generate: (ctx: CorrelationContext) => CorrelationAlert;
}

let ruleAlertCounter = 0;

function makeAlertId(ruleId: string): string {
  return `corr-${ruleId}-${++ruleAlertCounter}-${Date.now()}`;
}

// ── 내장 규칙 5개 ───────────────────────────────────────

/** 1. earthquake-nuclear: M5+ 지진 & 반경 100km 내 원전 */
const earthquakeNuclear: CorrelationRule = {
  id: 'earthquake-nuclear',
  name: 'Earthquake near Nuclear Plant',
  description: 'M5+ earthquake within 100km of a nuclear facility',
  layers: ['earthquakes', 'nuclear_plants'],
  spatialRadius: 100,
  temporalWindow: 300,
  severity: 'critical',
  condition: (ctx) => {
    if (!ctx.triggerEntity) return false;
    const mag = ctx.triggerEntity.data.magnitude as number;
    if (mag < 5) return false;
    const nuclearNearby = ctx.nearbyEntities.filter((e) => e.layer === 'nuclear_plants');
    ctx.matchedEntities = nuclearNearby;
    return nuclearNearby.length > 0;
  },
  generate: (ctx) => {
    const quake = ctx.triggerEntity!;
    const plants = ctx.matchedEntities.map((e) => e.data.name as string).join(', ');
    return {
      id: makeAlertId('earthquake-nuclear'),
      ruleId: 'earthquake-nuclear',
      ruleName: 'Earthquake near Nuclear Plant',
      severity: 'critical',
      title: 'SEISMIC-NUCLEAR PROXIMITY',
      message: `M${(quake.data.magnitude as number).toFixed(1)} earthquake near ${quake.data.place}. Nuclear facilities in range: ${plants}. Monitoring reactor status.`,
      lat: quake.lat,
      lng: quake.lng,
      timestamp: Date.now(),
      relatedEntities: [quake, ...ctx.matchedEntities].map((e) => ({
        id: e.id, layer: e.layer, lat: e.lat, lng: e.lng,
      })),
    };
  },
};

/** 2. chokepoint-congestion: 초크포인트 반경 50km에 선박 10척 이상 */
const chokepointCongestion: CorrelationRule = {
  id: 'chokepoint-congestion',
  name: 'Chokepoint Congestion',
  description: '10+ vessels within 50km of a chokepoint',
  layers: ['chokepoints', 'ships'],
  spatialRadius: 50,
  temporalWindow: 600,
  severity: 'warning',
  condition: (ctx) => {
    if (!ctx.triggerEntity || ctx.triggerEntity.layer !== 'chokepoints') return false;
    const ships = ctx.nearbyEntities.filter((e) => e.layer === 'ships');
    ctx.matchedEntities = ships;
    return ships.length >= 10;
  },
  generate: (ctx) => {
    const cp = ctx.triggerEntity!;
    const shipCount = ctx.matchedEntities.length;
    return {
      id: makeAlertId('chokepoint-congestion'),
      ruleId: 'chokepoint-congestion',
      ruleName: 'Chokepoint Congestion',
      severity: 'warning',
      title: 'CHOKEPOINT CONGESTION',
      message: `${cp.data.name}: ${shipCount} vessels detected within 50km. Traffic density elevated.`,
      lat: cp.lat,
      lng: cp.lng,
      timestamp: Date.now(),
      relatedEntities: [cp, ...ctx.matchedEntities.slice(0, 5)].map((e) => ({
        id: e.id, layer: e.layer, lat: e.lat, lng: e.lng,
      })),
    };
  },
};

/** 3. military-cluster: 반경 200km에 군용기 3기 이상 */
const militaryCluster: CorrelationRule = {
  id: 'military-cluster',
  name: 'Military Aircraft Cluster',
  description: '3+ military aircraft within 200km radius',
  layers: ['adsb'],
  spatialRadius: 200,
  temporalWindow: 600,
  severity: 'warning',
  condition: (ctx) => {
    if (!ctx.triggerEntity || ctx.triggerEntity.layer !== 'adsb') return false;
    const milAircraft = ctx.nearbyEntities.filter((e) => e.layer === 'adsb');
    ctx.matchedEntities = milAircraft;
    return milAircraft.length >= 3;
  },
  generate: (ctx) => {
    const count = ctx.matchedEntities.length;
    const types = [...new Set(ctx.matchedEntities.map((e) => e.data.type as string))].join(', ');
    return {
      id: makeAlertId('military-cluster'),
      ruleId: 'military-cluster',
      ruleName: 'Military Aircraft Cluster',
      severity: 'warning',
      title: 'MILITARY CONCENTRATION',
      message: `${count} military aircraft clustered within 200km. Types: ${types || 'Unknown'}. Monitoring activity pattern.`,
      lat: ctx.centerLat,
      lng: ctx.centerLng,
      timestamp: Date.now(),
      relatedEntities: ctx.matchedEntities.slice(0, 5).map((e) => ({
        id: e.id, layer: e.layer, lat: e.lat, lng: e.lng,
      })),
    };
  },
};

/** 4. earthquake-cctv: M6+ 지진 시 진앙 반경 200km CCTV 존재 */
const earthquakeCctv: CorrelationRule = {
  id: 'earthquake-cctv',
  name: 'Earthquake CCTV Link',
  description: 'M6+ earthquake with CCTV cameras in 200km radius',
  layers: ['earthquakes', 'cctvs'],
  spatialRadius: 200,
  temporalWindow: 300,
  severity: 'info',
  condition: (ctx) => {
    if (!ctx.triggerEntity) return false;
    const mag = ctx.triggerEntity.data.magnitude as number;
    if (mag < 6) return false;
    const cctvs = ctx.nearbyEntities.filter((e) => e.layer === 'cctvs');
    ctx.matchedEntities = cctvs;
    return cctvs.length > 0;
  },
  generate: (ctx) => {
    const quake = ctx.triggerEntity!;
    const camCount = ctx.matchedEntities.length;
    const camNames = ctx.matchedEntities.slice(0, 3).map((e) => e.data.name as string).join(', ');
    return {
      id: makeAlertId('earthquake-cctv'),
      ruleId: 'earthquake-cctv',
      ruleName: 'Earthquake CCTV Link',
      severity: 'info',
      title: 'SEISMIC-CCTV AUTO LINK',
      message: `M${(quake.data.magnitude as number).toFixed(1)} near ${quake.data.place}. ${camCount} camera(s) available: ${camNames}.`,
      lat: quake.lat,
      lng: quake.lng,
      timestamp: Date.now(),
      relatedEntities: [quake, ...ctx.matchedEntities.slice(0, 3)].map((e) => ({
        id: e.id, layer: e.layer, lat: e.lat, lng: e.lng,
      })),
    };
  },
};

/** 5. earthquake-shipping: M5+ 지진 & 반경 300km 내 선박 5척 이상 */
const earthquakeShipping: CorrelationRule = {
  id: 'earthquake-shipping',
  name: 'Earthquake Shipping Impact',
  description: 'M5+ earthquake with 5+ vessels within 300km',
  layers: ['earthquakes', 'ships'],
  spatialRadius: 300,
  temporalWindow: 300,
  severity: 'warning',
  condition: (ctx) => {
    if (!ctx.triggerEntity) return false;
    const mag = ctx.triggerEntity.data.magnitude as number;
    if (mag < 5) return false;
    const ships = ctx.nearbyEntities.filter((e) => e.layer === 'ships');
    ctx.matchedEntities = ships;
    return ships.length >= 5;
  },
  generate: (ctx) => {
    const quake = ctx.triggerEntity!;
    const shipCount = ctx.matchedEntities.length;
    return {
      id: makeAlertId('earthquake-shipping'),
      ruleId: 'earthquake-shipping',
      ruleName: 'Earthquake Shipping Impact',
      severity: 'warning',
      title: 'SEISMIC-SHIPPING THREAT',
      message: `M${(quake.data.magnitude as number).toFixed(1)} near ${quake.data.place}. ${shipCount} vessels within 300km. Tsunami/routing impact possible.`,
      lat: quake.lat,
      lng: quake.lng,
      timestamp: Date.now(),
      relatedEntities: [quake, ...ctx.matchedEntities.slice(0, 5)].map((e) => ({
        id: e.id, layer: e.layer, lat: e.lat, lng: e.lng,
      })),
    };
  },
};

/** 6. earthquake-volcano: M4+ 지진 & 반경 50km 내 활화산 */
const earthquakeVolcano: CorrelationRule = {
  id: 'earthquake-volcano',
  name: 'Earthquake near Active Volcano',
  description: 'M4+ earthquake within 50km of an active volcano',
  layers: ['earthquakes', 'volcanoes'],
  spatialRadius: 50,
  temporalWindow: 300,
  severity: 'warning',
  condition: (ctx) => {
    if (!ctx.triggerEntity) return false;
    const mag = ctx.triggerEntity.data.magnitude as number;
    if (mag < 4) return false;
    const volcanoes = ctx.nearbyEntities.filter(
      (e) => e.layer === 'volcanoes' && e.data.status === 'active',
    );
    ctx.matchedEntities = volcanoes;
    return volcanoes.length > 0;
  },
  generate: (ctx) => {
    const quake = ctx.triggerEntity!;
    const names = ctx.matchedEntities.map((e) => e.data.name as string).join(', ');
    return {
      id: makeAlertId('earthquake-volcano'),
      ruleId: 'earthquake-volcano',
      ruleName: 'Earthquake near Active Volcano',
      severity: 'warning',
      title: 'SEISMIC-VOLCANIC PROXIMITY',
      message: `M${(quake.data.magnitude as number).toFixed(1)} earthquake near ${quake.data.place}. Active volcanoes in range: ${names}. Monitoring volcanic activity.`,
      lat: quake.lat,
      lng: quake.lng,
      timestamp: Date.now(),
      relatedEntities: [quake, ...ctx.matchedEntities].map((e) => ({
        id: e.id, layer: e.layer, lat: e.lat, lng: e.lng,
      })),
    };
  },
};

/** 7. wildfire-wind: placeholder (향후 바람 데이터 연동 시 활성화) */
const wildfireWind: CorrelationRule = {
  id: 'wildfire-wind',
  name: 'Wildfire Wind Risk',
  description: 'Wildfire hotspot with high wind speed nearby (placeholder)',
  layers: ['wildfires', 'weather'],
  spatialRadius: 100,
  temporalWindow: 600,
  severity: 'warning',
  condition: () => {
    // placeholder — 향후 weather 데이터와 wildfire 데이터 조합 시 구현
    return false;
  },
  generate: (ctx) => ({
    id: makeAlertId('wildfire-wind'),
    ruleId: 'wildfire-wind',
    ruleName: 'Wildfire Wind Risk',
    severity: 'warning',
    title: 'WILDFIRE-WIND RISK',
    message: 'High wind detected near active wildfire zone.',
    lat: ctx.centerLat,
    lng: ctx.centerLng,
    timestamp: Date.now(),
    relatedEntities: [],
  }),
};

/** 모든 내장 규칙 */
export const BUILTIN_RULES: CorrelationRule[] = [
  earthquakeNuclear,
  chokepointCongestion,
  militaryCluster,
  earthquakeCctv,
  earthquakeShipping,
  earthquakeVolcano,
  wildfireWind,
];
