import type { SpatialEntity } from './SpatialIndex';

export interface GeofenceVertex { lat: number; lng: number; }

export interface GeofenceDef {
  id: string;
  name: string;
  shape: 'polygon' | 'circle';
  vertices: GeofenceVertex[];
  center?: GeofenceVertex;
  radiusKm?: number;
  color: string;
  targetLayers: string[];
  enabled: boolean;
}

export interface GeofenceEventResult {
  geofenceId: string;
  geofenceName: string;
  entityId: string;
  entityLayer: string;
  eventType: 'enter' | 'exit';
  lat: number;
  lng: number;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointInPolygon(lat: number, lng: number, vertices: GeofenceVertex[]): boolean {
  const n = vertices.length;
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const vi = vertices[i], vj = vertices[j];
    let lngI = vi.lng, lngJ = vj.lng;
    if (Math.abs(lngI - lng) > 180) lngI += lngI < lng ? 360 : -360;
    if (Math.abs(lngJ - lng) > 180) lngJ += lngJ < lng ? 360 : -360;
    if (((vi.lat > lat) !== (vj.lat > lat)) && (lng < (lngJ - lngI) * (lat - vi.lat) / (vj.lat - vi.lat) + lngI)) inside = !inside;
  }
  return inside;
}

export function isInsideGeofence(lat: number, lng: number, gf: GeofenceDef): boolean {
  if (gf.shape === 'circle') {
    if (!gf.center || gf.radiusKm == null) return false;
    return haversineKm(lat, lng, gf.center.lat, gf.center.lng) <= gf.radiusKm;
  }
  return pointInPolygon(lat, lng, gf.vertices);
}

export class GeofenceMonitor {
  private insideMap: Map<string, Set<string>> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 60000;

  evaluate(geofences: GeofenceDef[], entities: SpatialEntity[]): GeofenceEventResult[] {
    const results: GeofenceEventResult[] = [];
    const now = Date.now();
    for (const gf of geofences) {
      if (!gf.enabled) continue;
      const prev = this.insideMap.get(gf.id) ?? new Set();
      const curr = new Set<string>();
      const targets = gf.targetLayers.includes('all') ? entities : entities.filter(e => gf.targetLayers.includes(e.layer));
      for (const entity of targets) {
        if (isInsideGeofence(entity.lat, entity.lng, gf)) {
          curr.add(entity.id);
          if (!prev.has(entity.id)) {
            const ck = `${gf.id}:${entity.id}`;
            const last = this.cooldowns.get(ck);
            if (!last || now - last >= this.COOLDOWN_MS) {
              results.push({ geofenceId: gf.id, geofenceName: gf.name, entityId: entity.id, entityLayer: entity.layer, eventType: 'enter', lat: entity.lat, lng: entity.lng });
              this.cooldowns.set(ck, now);
            }
          }
        }
      }
      for (const eid of prev) {
        if (!curr.has(eid)) {
          const ck = `${gf.id}:${eid}:exit`;
          const last = this.cooldowns.get(ck);
          if (!last || now - last >= this.COOLDOWN_MS) {
            const entity = entities.find(e => e.id === eid);
            if (entity) {
              results.push({ geofenceId: gf.id, geofenceName: gf.name, entityId: entity.id, entityLayer: entity.layer, eventType: 'exit', lat: entity.lat, lng: entity.lng });
              this.cooldowns.set(ck, now);
            }
          }
        }
      }
      this.insideMap.set(gf.id, curr);
    }
    if (this.cooldowns.size > 1000) {
      for (const [key, time] of this.cooldowns) { if (now - time > 300000) this.cooldowns.delete(key); }
    }
    return results;
  }

  removeGeofence(id: string): void {
    this.insideMap.delete(id);
    for (const key of this.cooldowns.keys()) { if (key.startsWith(`${id}:`)) this.cooldowns.delete(key); }
  }

  getInsideCount(geofenceId: string): number { return this.insideMap.get(geofenceId)?.size ?? 0; }
  clear(): void { this.insideMap.clear(); this.cooldowns.clear(); }
}
