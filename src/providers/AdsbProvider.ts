export interface MilAircraftData {
  hex: string;
  callsign: string;
  type: string;
  lat: number;
  lng: number;
  altitude: number; // feet
  heading: number;
  speed: number; // knots
  squawk: string;
  category: string;
}

// ADS-B Exchange RapidAPI — military aircraft endpoint
const ADSBX_RAPID_URL = 'https://adsbexchange-com1.p.rapidapi.com/v2/mil/';

let cachedAircraft: MilAircraftData[] = [];
let lastFetchTime = 0;

let _lastSimulated = false;
let _lastError: string | null = null;
let _lastLatency = 0;

export function getProviderMeta() {
  return { simulated: _lastSimulated, error: _lastError, latency: _lastLatency };
}

// Fallback simulation data when API is unavailable
const SIMULATED_AIRCRAFT: MilAircraftData[] = [
  { hex: 'AE1234', callsign: 'FORTE12', type: 'RQ-4 Global Hawk', lat: 36.2, lng: 129.5, altitude: 55000, heading: 45, speed: 310, squawk: '7700', category: 'A5' },
  { hex: 'AE5678', callsign: 'DOOM31', type: 'B-52H Stratofortress', lat: 35.5, lng: 126.0, altitude: 38000, heading: 270, speed: 450, squawk: '1234', category: 'A5' },
  { hex: 'AE9012', callsign: 'KNIFE72', type: 'RC-135W Rivet Joint', lat: 38.5, lng: 127.5, altitude: 32000, heading: 180, speed: 380, squawk: '2345', category: 'A5' },
  { hex: 'AE3456', callsign: 'VIPER01', type: 'F-16C Fighting Falcon', lat: 51.0, lng: 1.0, altitude: 25000, heading: 90, speed: 520, squawk: '3456', category: 'A4' },
  { hex: 'AE7890', callsign: 'SENTRY50', type: 'E-3 AWACS', lat: 33.0, lng: 44.0, altitude: 29000, heading: 320, speed: 360, squawk: '4567', category: 'A5' },
  { hex: 'AEB234', callsign: 'DRAGON50', type: 'P-8A Poseidon', lat: 25.0, lng: 120.0, altitude: 24000, heading: 200, speed: 400, squawk: '5678', category: 'A5' },
  { hex: 'AEC567', callsign: 'ATLAS01', type: 'C-17 Globemaster', lat: 49.0, lng: 8.0, altitude: 35000, heading: 60, speed: 440, squawk: '6789', category: 'A5' },
  { hex: 'AED890', callsign: 'REAPER11', type: 'MQ-9 Reaper', lat: 32.0, lng: 45.0, altitude: 18000, heading: 150, speed: 200, squawk: '7890', category: 'A3' },
];

/**
 * ADS-B Exchange에서 군용기 실시간 데이터를 가져옴
 * VITE_RAPIDAPI_KEY 없으면 시뮬레이션 데이터 사용
 */
export async function fetchMilAircraft(): Promise<MilAircraftData[]> {
  // Rate limit: 30초 이내 재호출 시 캐시 반환
  if (Date.now() - lastFetchTime < 30000 && cachedAircraft.length > 0) {
    return cachedAircraft;
  }

  const _start = Date.now();
  const rapidApiKey = import.meta.env.VITE_RAPIDAPI_KEY;

  if (!rapidApiKey || rapidApiKey === 'placeholder') {
    console.warn('[ADS-B] VITE_RAPIDAPI_KEY not set — using simulated data');
    cachedAircraft = SIMULATED_AIRCRAFT;
    lastFetchTime = Date.now();
    _lastSimulated = true; _lastError = null; _lastLatency = Date.now() - _start;
    return cachedAircraft;
  }

  try {
    const res = await fetch(ADSBX_RAPID_URL, {
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com',
      },
    });

    if (!res.ok) {
      console.warn(`[ADS-B] API ${res.status} — using cached/simulated data`);
      if (cachedAircraft.length === 0) cachedAircraft = SIMULATED_AIRCRAFT;
      _lastSimulated = cachedAircraft === SIMULATED_AIRCRAFT; _lastError = `HTTP ${res.status}`; _lastLatency = Date.now() - _start;
      return cachedAircraft;
    }

    const json = await res.json();
    const ac = json.ac || [];

    const aircraft: MilAircraftData[] = [];
    for (const a of ac) {
      const lat = a.lat;
      const lon = a.lon;
      if (lat == null || lon == null) continue;

      aircraft.push({
        hex: a.hex || '',
        callsign: (a.flight || '').trim(),
        type: a.t || 'Unknown',
        lat,
        lng: lon,
        altitude: a.alt_baro === 'ground' ? 0 : (a.alt_baro || a.alt_geom || 0),
        heading: a.track || 0,
        speed: a.gs || 0,
        squawk: a.squawk || '',
        category: a.category || '',
      });
    }

    cachedAircraft = aircraft.length > 0 ? aircraft : SIMULATED_AIRCRAFT;
    lastFetchTime = Date.now();
    _lastSimulated = aircraft.length === 0; _lastError = null; _lastLatency = Date.now() - _start;
    console.log(`[ADS-B] Fetched ${aircraft.length} military aircraft`);
    return cachedAircraft;
  } catch (e) {
    console.warn('[ADS-B] Fetch error:', e);
    if (cachedAircraft.length === 0) cachedAircraft = SIMULATED_AIRCRAFT;
    _lastSimulated = cachedAircraft === SIMULATED_AIRCRAFT; _lastError = e instanceof Error ? e.message : String(e); _lastLatency = Date.now() - _start;
    return cachedAircraft;
  }
}
