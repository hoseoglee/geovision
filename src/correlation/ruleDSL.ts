/**
 * Rule DSL (Domain-Specific Language) schema and interpreter
 * - JSON-based rule definitions -> executable CorrelationRule objects
 */

import type { SpatialEntity } from './SpatialIndex';
import type { CorrelationContext, CorrelationAlert, CorrelationRule } from './rules';
import type { AlertSeverity } from '@/store/useAlertStore';

export interface RuleDSLConditionFilter {
  field: string;
  operator: '>=' | '<=' | '>' | '<' | '==' | '!=' | 'contains';
  value: number | string | boolean;
}

export interface RuleDSL {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: AlertSeverity;
  triggerLayer: string;
  targetLayer: string;
  spatialRadius: number;
  temporalWindow: number;
  cooldown: number;
  conditions: {
    triggerFilter?: RuleDSLConditionFilter;
    targetFilter?: RuleDSLConditionFilter;
    minTargetCount: number;
  };
  triggerCount: number;
  lastTriggered: number | null;
  createdAt: number;
  updatedAt: number;
  isBuiltin: boolean;
}

export const AVAILABLE_LAYERS = [
  { id: 'earthquakes', label: 'Earthquakes' },
  { id: 'ships', label: 'Ships' },
  { id: 'adsb', label: 'Military Aircraft' },
  { id: 'flights', label: 'Flights' },
  { id: 'satellites', label: 'Satellites' },
  { id: 'cctvs', label: 'CCTV Cameras' },
  { id: 'chokepoints', label: 'Chokepoints' },
  { id: 'nuclear_plants', label: 'Nuclear Plants' },
  { id: 'volcanoes', label: 'Volcanoes' },
  { id: 'wildfires', label: 'Wildfires' },
  { id: 'weather', label: 'Weather' },
] as const;

export function evaluateFilter(entity: SpatialEntity, filter: RuleDSLConditionFilter): boolean {
  const val = entity.data[filter.field];
  if (val === undefined || val === null) return false;
  switch (filter.operator) {
    case '>=': return (val as number) >= (filter.value as number);
    case '<=': return (val as number) <= (filter.value as number);
    case '>':  return (val as number) > (filter.value as number);
    case '<':  return (val as number) < (filter.value as number);
    case '==': return val === filter.value;
    case '!=': return val !== filter.value;
    case 'contains': return typeof val === 'string' && val.includes(String(filter.value));
    default: return false;
  }
}

let dslAlertCounter = 0;

export function compileDSL(dsl: RuleDSL): CorrelationRule {
  const layers = dsl.triggerLayer === dsl.targetLayer ? [dsl.triggerLayer] : [dsl.triggerLayer, dsl.targetLayer];

  return {
    id: dsl.id,
    name: dsl.name,
    description: dsl.description,
    layers,
    spatialRadius: dsl.spatialRadius,
    temporalWindow: dsl.temporalWindow,
    severity: dsl.severity,
    condition(ctx: CorrelationContext): boolean {
      if (dsl.conditions.triggerFilter) {
        if (!ctx.triggerEntity) return false;
        if (!evaluateFilter(ctx.triggerEntity, dsl.conditions.triggerFilter)) return false;
      }
      let targets = ctx.nearbyEntities.filter((e) => e.layer === dsl.targetLayer);
      if (dsl.conditions.targetFilter) {
        targets = targets.filter((e) => evaluateFilter(e, dsl.conditions.targetFilter!));
      }
      ctx.matchedEntities = targets;
      return targets.length >= dsl.conditions.minTargetCount;
    },
    generate(ctx: CorrelationContext): CorrelationAlert {
      const trigger = ctx.triggerEntity;
      const matched = ctx.matchedEntities;
      const lat = trigger?.lat ?? ctx.centerLat;
      const lng = trigger?.lng ?? ctx.centerLng;
      const triggerInfo = trigger ? `${trigger.layer}[${trigger.id}]` : `(${lat.toFixed(2)}, ${lng.toFixed(2)})`;
      const message = `${dsl.name}: ${triggerInfo} triggered. ${matched.length} ${dsl.targetLayer} entity(ies) matched within ${dsl.spatialRadius}km.`;
      const related: { id: string; layer: string; lat: number; lng: number }[] = [];
      if (trigger) related.push({ id: trigger.id, layer: trigger.layer, lat: trigger.lat, lng: trigger.lng });
      for (const e of matched.slice(0, related.length ? 4 : 5)) {
        related.push({ id: e.id, layer: e.layer, lat: e.lat, lng: e.lng });
      }
      return {
        id: `corr-${dsl.id}-${++dslAlertCounter}-${Date.now()}`,
        ruleId: dsl.id, ruleName: dsl.name, severity: dsl.severity,
        title: dsl.name.toUpperCase(), message, lat, lng,
        timestamp: Date.now(), relatedEntities: related,
      };
    },
  };
}

const VALID_SEVERITIES: AlertSeverity[] = ['critical', 'warning', 'info'];
const ID_PATTERN = /^[a-zA-Z0-9-]+$/;

export function validateRuleDSL(dsl: Partial<RuleDSL>): string[] {
  const errors: string[] = [];
  if (!dsl.id || !dsl.id.trim()) errors.push('id is required');
  else if (!ID_PATTERN.test(dsl.id)) errors.push('id must be alphanumeric with hyphens');
  if (!dsl.name || !dsl.name.trim()) errors.push('name is required');
  if (!dsl.triggerLayer || !dsl.triggerLayer.trim()) errors.push('triggerLayer is required');
  if (!dsl.targetLayer || !dsl.targetLayer.trim()) errors.push('targetLayer is required');
  if (dsl.spatialRadius == null || dsl.spatialRadius <= 0 || dsl.spatialRadius > 1000) errors.push('spatialRadius must be > 0 and <= 1000');
  if (dsl.conditions?.minTargetCount == null || dsl.conditions.minTargetCount < 1) errors.push('minTargetCount must be >= 1');
  if (!dsl.severity || !VALID_SEVERITIES.includes(dsl.severity)) errors.push('severity must be critical, warning, or info');
  return errors;
}

const now = Date.now();

export const BUILTIN_RULES_DSL: RuleDSL[] = [
  { id: 'earthquake-nuclear', name: 'Earthquake near Nuclear Plant', description: 'M5+ earthquake within 100km of a nuclear facility', enabled: true, severity: 'critical', triggerLayer: 'earthquakes', targetLayer: 'nuclear_plants', spatialRadius: 100, temporalWindow: 300, cooldown: 60, conditions: { triggerFilter: { field: 'magnitude', operator: '>=', value: 5 }, minTargetCount: 1 }, triggerCount: 0, lastTriggered: null, createdAt: now, updatedAt: now, isBuiltin: true },
  { id: 'chokepoint-congestion', name: 'Chokepoint Congestion', description: '10+ vessels within 50km of a chokepoint', enabled: true, severity: 'warning', triggerLayer: 'chokepoints', targetLayer: 'ships', spatialRadius: 50, temporalWindow: 600, cooldown: 60, conditions: { minTargetCount: 10 }, triggerCount: 0, lastTriggered: null, createdAt: now, updatedAt: now, isBuiltin: true },
  { id: 'military-cluster', name: 'Military Aircraft Cluster', description: '3+ military aircraft within 200km radius', enabled: true, severity: 'warning', triggerLayer: 'adsb', targetLayer: 'adsb', spatialRadius: 200, temporalWindow: 600, cooldown: 60, conditions: { minTargetCount: 3 }, triggerCount: 0, lastTriggered: null, createdAt: now, updatedAt: now, isBuiltin: true },
  { id: 'earthquake-cctv', name: 'Earthquake CCTV Link', description: 'M6+ earthquake with CCTV cameras in 200km radius', enabled: true, severity: 'info', triggerLayer: 'earthquakes', targetLayer: 'cctvs', spatialRadius: 200, temporalWindow: 300, cooldown: 60, conditions: { triggerFilter: { field: 'magnitude', operator: '>=', value: 6 }, minTargetCount: 1 }, triggerCount: 0, lastTriggered: null, createdAt: now, updatedAt: now, isBuiltin: true },
  { id: 'earthquake-shipping', name: 'Earthquake Shipping Impact', description: 'M5+ earthquake with 5+ vessels within 300km', enabled: true, severity: 'warning', triggerLayer: 'earthquakes', targetLayer: 'ships', spatialRadius: 300, temporalWindow: 300, cooldown: 60, conditions: { triggerFilter: { field: 'magnitude', operator: '>=', value: 5 }, minTargetCount: 5 }, triggerCount: 0, lastTriggered: null, createdAt: now, updatedAt: now, isBuiltin: true },
  { id: 'earthquake-volcano', name: 'Earthquake near Active Volcano', description: 'M4+ earthquake within 50km of an active volcano', enabled: true, severity: 'warning', triggerLayer: 'earthquakes', targetLayer: 'volcanoes', spatialRadius: 50, temporalWindow: 300, cooldown: 60, conditions: { triggerFilter: { field: 'magnitude', operator: '>=', value: 4 }, targetFilter: { field: 'status', operator: '==', value: 'active' }, minTargetCount: 1 }, triggerCount: 0, lastTriggered: null, createdAt: now, updatedAt: now, isBuiltin: true },
  { id: 'wildfire-wind', name: 'Wildfire Wind Risk', description: 'Wildfire hotspot with high wind speed nearby (placeholder)', enabled: false, severity: 'warning', triggerLayer: 'wildfires', targetLayer: 'weather', spatialRadius: 100, temporalWindow: 600, cooldown: 60, conditions: { minTargetCount: 1 }, triggerCount: 0, lastTriggered: null, createdAt: now, updatedAt: now, isBuiltin: true },
];
