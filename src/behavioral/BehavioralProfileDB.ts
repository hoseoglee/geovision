import { trajectoryDB, type PositionRecord } from '@/trajectory/TrajectoryDB';

// ---------------------------------------------------------------------------
// Geohash encoder (internal — no external dependency)
// ---------------------------------------------------------------------------

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function encodeGeohash(lat: number, lng: number, precision = 4): string {
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        idx = (idx << 1) | 1;
        lngMin = mid;
      } else {
        idx = idx << 1;
        lngMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        idx = (idx << 1) | 1;
        latMin = mid;
      } else {
        idx = idx << 1;
        latMax = mid;
      }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface BehavioralProfile {
  entityId: string;
  entityType: 'flight' | 'ship' | 'adsb';
  /** Geohash 방문 빈도맵 (precision 4, ~40km 셀) */
  geohashHits: Record<string, number>;
  /** 속도 통계 */
  speedMean: number;
  speedStddev: number;
  speedMin: number;
  speedMax: number;
  /** 고도 통계 (항공기용) */
  altitudeMean: number;
  altitudeStddev: number;
  /** 시간대별 활동 빈도 (UTC 0-23) */
  activeHours: number[]; // length 24
  /** 프로파일 메타데이터 */
  totalPoints: number;
  lastUpdated: number;
  /** 상위 방문 geohash (전체 방문의 80% 커버) */
  topGeohashes: string[];
}

export interface ProfileAnomaly {
  entityId: string;
  type: 'location' | 'speed' | 'altitude';
  description: string;
  severity: 'low' | 'medium' | 'high';
  currentValue?: number;
  expectedRange?: [number, number];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const LS_KEY = 'bfp-v1';
const MAX_PROFILES = 100;
const MIN_POINTS = 20;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[], sampleMean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((acc, v) => acc + (v - sampleMean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// BehavioralProfiler
// ---------------------------------------------------------------------------

class BehavioralProfiler {
  // -------------------------------------------------------------------------
  // computeFromHistory
  // -------------------------------------------------------------------------
  computeFromHistory(
    entityId: string,
    entityType: 'flight' | 'ship' | 'adsb',
    positions: PositionRecord[],
  ): BehavioralProfile | null {
    if (positions.length < MIN_POINTS) return null;

    // Geohash hit map
    const geohashHits: Record<string, number> = {};
    for (const p of positions) {
      const gh = encodeGeohash(p.lat, p.lng, 4);
      geohashHits[gh] = (geohashHits[gh] ?? 0) + 1;
    }

    // topGeohashes: cover 80% of total visits
    const totalHits = Object.values(geohashHits).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(geohashHits).sort((a, b) => b[1] - a[1]);
    const target = totalHits * 0.8;
    let cumulative = 0;
    const topGeohashes: string[] = [];
    for (const [gh, count] of sorted) {
      if (cumulative >= target) break;
      topGeohashes.push(gh);
      cumulative += count;
    }

    // Speed stats (exclude 0)
    const speeds = positions.map((p) => p.speed).filter((s) => s > 0);
    const speedMean = mean(speeds);
    const speedStddev = stddev(speeds, speedMean);
    const speedMin = speeds.length > 0 ? Math.min(...speeds) : 0;
    const speedMax = speeds.length > 0 ? Math.max(...speeds) : 0;

    // Altitude stats
    const altitudes = positions.map((p) => p.altitude).filter((a) => a > 0);
    const altitudeMean = mean(altitudes);
    const altitudeStddev = stddev(altitudes, altitudeMean);

    // activeHours[h]: count of positions in UTC hour h
    const activeHours: number[] = new Array(24).fill(0);
    for (const p of positions) {
      const hour = new Date(p.timestamp).getUTCHours();
      activeHours[hour]++;
    }

    return {
      entityId,
      entityType,
      geohashHits,
      speedMean,
      speedStddev,
      speedMin,
      speedMax,
      altitudeMean,
      altitudeStddev,
      activeHours,
      totalPoints: positions.length,
      lastUpdated: Date.now(),
      topGeohashes,
    };
  }

  // -------------------------------------------------------------------------
  // saveProfile
  // -------------------------------------------------------------------------
  saveProfile(profile: BehavioralProfile): void {
    const all = this.loadAllProfiles();
    all[profile.entityId] = profile;

    const ids = Object.keys(all);
    if (ids.length > MAX_PROFILES) {
      // 오래된 것부터 삭제 (lastUpdated 기준)
      const sorted = ids.sort(
        (a, b) => (all[a].lastUpdated ?? 0) - (all[b].lastUpdated ?? 0),
      );
      const toRemove = sorted.slice(0, ids.length - MAX_PROFILES);
      for (const id of toRemove) delete all[id];
    }

    localStorage.setItem(LS_KEY, JSON.stringify(all));
  }

  // -------------------------------------------------------------------------
  // loadProfile
  // -------------------------------------------------------------------------
  loadProfile(entityId: string): BehavioralProfile | null {
    const all = this.loadAllProfiles();
    return all[entityId] ?? null;
  }

  // -------------------------------------------------------------------------
  // loadAllProfiles
  // -------------------------------------------------------------------------
  loadAllProfiles(): Record<string, BehavioralProfile> {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, BehavioralProfile>;
    } catch {
      return {};
    }
  }

  // -------------------------------------------------------------------------
  // refreshProfile
  // -------------------------------------------------------------------------
  async refreshProfile(entityId: string): Promise<BehavioralProfile | null> {
    const history = await trajectoryDB.getHistory(entityId, TWO_HOURS_MS);
    if (!history.length) return null;

    const entityType = history[0].entityType;
    const profile = this.computeFromHistory(entityId, entityType, history);
    if (profile) {
      this.saveProfile(profile);
    }
    return profile;
  }

  // -------------------------------------------------------------------------
  // checkAnomaly
  // -------------------------------------------------------------------------
  checkAnomaly(
    profile: BehavioralProfile,
    current: { lat: number; lng: number; speed: number; altitude: number },
  ): ProfileAnomaly[] {
    if (profile.totalPoints < MIN_POINTS) return [];

    const anomalies: ProfileAnomaly[] = [];
    const { entityId, entityType } = profile;

    // 위치 이상
    const currentGh = encodeGeohash(current.lat, current.lng, 4);
    if (!profile.topGeohashes.includes(currentGh)) {
      anomalies.push({
        entityId,
        type: 'location',
        description: `현재 위치(${currentGh})가 일반적인 활동 구역(${profile.topGeohashes.slice(0, 3).join(', ')} 등) 밖입니다.`,
        severity: 'high',
      });
    }

    // 속도 이상
    if (profile.speedStddev > 0) {
      const speedDiff = Math.abs(current.speed - profile.speedMean);
      if (speedDiff > 2 * profile.speedStddev) {
        const lo = Math.max(0, profile.speedMean - 2 * profile.speedStddev);
        const hi = profile.speedMean + 2 * profile.speedStddev;
        anomalies.push({
          entityId,
          type: 'speed',
          description: `현재 속도(${current.speed.toFixed(1)})가 통상 범위(${lo.toFixed(1)}~${hi.toFixed(1)})를 벗어났습니다.`,
          severity: 'medium',
          currentValue: current.speed,
          expectedRange: [lo, hi],
        });
      }
    }

    // 고도 이상 (항공기만)
    if (
      (entityType === 'flight' || entityType === 'adsb') &&
      profile.altitudeStddev > 0
    ) {
      const altDiff = Math.abs(current.altitude - profile.altitudeMean);
      if (altDiff > 2 * profile.altitudeStddev) {
        const lo = Math.max(0, profile.altitudeMean - 2 * profile.altitudeStddev);
        const hi = profile.altitudeMean + 2 * profile.altitudeStddev;
        anomalies.push({
          entityId,
          type: 'altitude',
          description: `현재 고도(${current.altitude.toFixed(0)}m)가 통상 범위(${lo.toFixed(0)}~${hi.toFixed(0)}m)를 벗어났습니다.`,
          severity: 'medium',
          currentValue: current.altitude,
          expectedRange: [lo, hi],
        });
      }
    }

    return anomalies;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------
export const behavioralProfiler = new BehavioralProfiler();
