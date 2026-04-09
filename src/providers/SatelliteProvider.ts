import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  SatRec,
} from 'satellite.js';

export type SensorType = 'optical' | 'radar' | 'sigint' | 'weather' | 'comms';

export interface SatelliteData {
  name: string;
  noradId: string;
  lat: number;
  lng: number;
  alt: number;
  satrec?: SatRec;
  sensorHalfAngleDeg?: number;
  sensorType?: SensorType;
}

// 알려진 위성의 센서 데이터베이스 (NORAD ID → 센서 정보)
export const SATELLITE_SENSOR_DB: Record<string, { type: SensorType; halfAngleDeg: number }> = {
  '25544': { type: 'optical', halfAngleDeg: 30 },  // ISS
  '20580': { type: 'optical', halfAngleDeg: 5 },   // Hubble Space Telescope
  '39634': { type: 'radar',   halfAngleDeg: 20 },  // Sentinel-1A
  '44087': { type: 'radar',   halfAngleDeg: 20 },  // Sentinel-1B
  '40697': { type: 'optical', halfAngleDeg: 15 },  // Sentinel-2A
  '42063': { type: 'optical', halfAngleDeg: 15 },  // Sentinel-2B
  '41866': { type: 'weather', halfAngleDeg: 50 },  // GOES-16
  '43226': { type: 'weather', halfAngleDeg: 50 },  // GOES-17
  '43013': { type: 'weather', halfAngleDeg: 50 },  // NOAA-20
  '33591': { type: 'weather', halfAngleDeg: 50 },  // NOAA-19
  '28654': { type: 'weather', halfAngleDeg: 50 },  // MetOp-A
  '38771': { type: 'weather', halfAngleDeg: 50 },  // MetOp-B
  '43689': { type: 'weather', halfAngleDeg: 50 },  // MetOp-C
  '37849': { type: 'optical', halfAngleDeg: 2 },   // Pleiades-1A
  '38755': { type: 'optical', halfAngleDeg: 2 },   // Pleiades-1B
  '49044': { type: 'optical', halfAngleDeg: 2 },   // Pleiades Neo 3
  '49396': { type: 'optical', halfAngleDeg: 2 },   // Pleiades Neo 4
  '43106': { type: 'sigint',  halfAngleDeg: 45 },  // Zuma (classified)
  '43657': { type: 'sigint',  halfAngleDeg: 45 },  // NROL-71
};

const TLE_URL =
  'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';

let _lastSimulated = false;
let _lastError: string | null = null;
let _lastLatency = 0;

export function getProviderMeta() {
  return { simulated: _lastSimulated, error: _lastError, latency: _lastLatency };
}

/**
 * TLE 텍스트를 파싱하여 [name, line1, line2] 튜플 배열로 변환
 */
function parseTleText(text: string): [string, string, string][] {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const result: [string, string, string][] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    result.push([lines[i], lines[i + 1], lines[i + 2]]);
  }
  return result;
}

/**
 * satrec + Date → 위경도/고도 계산
 */
export function propagateSatellite(
  satrec: SatRec,
  date: Date,
): { lat: number; lng: number; alt: number } | null {
  const posVel = propagate(satrec, date);
  if (
    typeof posVel.position === 'boolean' ||
    posVel.position === undefined
  ) {
    return null;
  }

  const gmst = gstime(date);
  const geo = eciToGeodetic(posVel.position, gmst);

  const lat = (geo.latitude * 180) / Math.PI;
  const lng = (geo.longitude * 180) / Math.PI;
  const alt = geo.height; // km

  return { lat, lng, alt };
}

/**
 * CelesTrak에서 TLE 데이터를 가져와 현재 위치를 계산
 */
export async function fetchSatellites(): Promise<SatelliteData[]> {
  const _start = Date.now();
  try {
    const res = await fetch(TLE_URL);
    if (!res.ok) {
      _lastSimulated = false; _lastError = `HTTP ${res.status}`; _lastLatency = Date.now() - _start;
      return [];
    }

    const text = await res.text();
    const tles = parseTleText(text);
    const now = new Date();
    const satellites: SatelliteData[] = [];

    for (const [name, line1, line2] of tles) {
      try {
        const satrec = twoline2satrec(line1, line2);
        const pos = propagateSatellite(satrec, now);
        if (!pos) continue;

        // NORAD ID: TLE line1의 3~7번째 문자
        const noradId = line1.substring(2, 7).trim();

        satellites.push({
          name: name.trim(),
          noradId,
          lat: pos.lat,
          lng: pos.lng,
          alt: pos.alt,
          satrec,
        });
      } catch {
        // 개별 위성 파싱 실패 시 스킵
      }
    }

    _lastSimulated = false; _lastError = null; _lastLatency = Date.now() - _start;
    return satellites;
  } catch (e) {
    _lastError = e instanceof Error ? e.message : String(e); _lastLatency = Date.now() - _start;
    return [];
  }
}
