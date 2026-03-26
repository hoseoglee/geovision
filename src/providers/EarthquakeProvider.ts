export interface EarthquakeData {
  id: string;
  magnitude: number;
  place: string;
  lat: number;
  lng: number;
  depth: number;
  time: number;
}

// M4.0 이상만 조회 — 사람이 체감할 수 있는 규모의 지진만 표시
const USGS_URL =
  'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=100&orderby=time&minmagnitude=4';

let _lastSimulated = false;
let _lastError: string | null = null;
let _lastLatency = 0;

export function getProviderMeta() {
  return { simulated: _lastSimulated, error: _lastError, latency: _lastLatency };
}

/**
 * USGS API에서 최근 지진 데이터를 가져옴
 */
export async function fetchEarthquakes(): Promise<EarthquakeData[]> {
  const _start = Date.now();
  try {
    const res = await fetch(USGS_URL);
    if (!res.ok) {
      _lastSimulated = false; _lastError = `HTTP ${res.status}`; _lastLatency = Date.now() - _start;
      return [];
    }

    const json = await res.json();
    const features: any[] = json.features;
    if (!features) return [];

    const earthquakes: EarthquakeData[] = [];

    for (const feature of features) {
      const props = feature.properties;
      const coords = feature.geometry?.coordinates;

      if (!coords || coords.length < 3) continue;

      earthquakes.push({
        id: feature.id ?? '',
        magnitude: props.mag ?? 0,
        place: props.place ?? '',
        lng: coords[0],
        lat: coords[1],
        depth: coords[2],
        time: props.time ?? 0,
      });
    }

    _lastSimulated = false; _lastError = null; _lastLatency = Date.now() - _start;
    return earthquakes;
  } catch (e) {
    _lastError = e instanceof Error ? e.message : String(e); _lastLatency = Date.now() - _start;
    return [];
  }
}
