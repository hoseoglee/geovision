export interface TyphoonForecastPoint {
  lat: number;
  lng: number;
  time: string; // ISO string
}

export interface TyphoonData {
  name: string;
  category: number;
  lat: number;
  lng: number;
  windSpeed: number; // knots
  pressure: number;  // hPa
  forecastPath: TyphoonForecastPoint[];
}

const NOAA_URL = 'https://www.nhc.noaa.gov/CurrentSurges.json';

let _lastSimulated = false;
let _lastError: string | null = null;
let _lastLatency = 0;

export function getProviderMeta() {
  return { simulated: _lastSimulated, error: _lastError, latency: _lastLatency };
}

function generateSimulationData(): TyphoonData[] {
  const now = Date.now();
  return [
    {
      name: 'TYPHOON MIRINAE',
      category: 3,
      lat: 18.5,
      lng: 132.2,
      windSpeed: 110,
      pressure: 955,
      forecastPath: Array.from({ length: 20 }, (_, i) => ({
        lat: 18.5 + i * 0.8,
        lng: 132.2 - i * 0.5,
        time: new Date(now + i * 6 * 3600000).toISOString(),
      })),
    },
    {
      name: 'HURRICANE DELTA',
      category: 2,
      lat: 22.1,
      lng: -86.3,
      windSpeed: 95,
      pressure: 968,
      forecastPath: Array.from({ length: 20 }, (_, i) => ({
        lat: 22.1 + i * 0.6,
        lng: -86.3 + i * 0.3,
        time: new Date(now + i * 6 * 3600000).toISOString(),
      })),
    },
    {
      name: 'CYCLONE AMPHAN',
      category: 4,
      lat: 14.8,
      lng: 87.5,
      windSpeed: 130,
      pressure: 940,
      forecastPath: Array.from({ length: 20 }, (_, i) => ({
        lat: 14.8 + i * 0.9,
        lng: 87.5 + i * 0.2,
        time: new Date(now + i * 6 * 3600000).toISOString(),
      })),
    },
  ];
}

/**
 * NOAA에서 활성 태풍 데이터를 가져옴.
 * API 접근 실패 시 시뮬레이션 데이터를 반환.
 */
export async function fetchTyphoons(): Promise<TyphoonData[]> {
  const _start = Date.now();
  try {
    const res = await fetch(NOAA_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) { _lastSimulated = true; _lastError = `HTTP ${res.status}`; _lastLatency = Date.now() - _start; return generateSimulationData(); }

    const json = await res.json();
    const features: any[] = json?.features;
    if (!features || features.length === 0) { _lastSimulated = true; _lastError = null; _lastLatency = Date.now() - _start; return generateSimulationData(); }

    const typhoons: TyphoonData[] = [];
    for (const feature of features) {
      const props = feature.properties;
      const coords = feature.geometry?.coordinates;
      if (!coords) continue;

      typhoons.push({
        name: props?.STORMNAME || props?.name || 'UNKNOWN',
        category: props?.SSNUM ?? props?.category ?? 1,
        lat: coords[1],
        lng: coords[0],
        windSpeed: props?.MAXWIND ?? props?.wind ?? 65,
        pressure: props?.MINPRES ?? props?.pressure ?? 980,
        forecastPath: [],
      });
    }

    if (typhoons.length > 0) {
      _lastSimulated = false; _lastError = null; _lastLatency = Date.now() - _start;
      return typhoons;
    }
    _lastSimulated = true; _lastError = null; _lastLatency = Date.now() - _start;
    return generateSimulationData();
  } catch (e) {
    _lastSimulated = true; _lastError = e instanceof Error ? e.message : String(e); _lastLatency = Date.now() - _start;
    return generateSimulationData();
  }
}
