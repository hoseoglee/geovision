export interface FlightData {
  callsign: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
  heading: number;
  onGround: boolean;
}

// OpenSky Network — 비인증 시 5초 쿨다운, 인증 시 제한 완화
const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

// adsbexchange.com 대안 — RapidAPI 키 있으면 사용
const ADSBX_RAPID_URL = 'https://adsbexchange-com1.p.rapidapi.com/v2/mil/';

/**
 * OpenSky Network API에서 실시간 항공편 데이터를 가져옴
 * 캐시: 마지막 성공 데이터를 보관하여 API 실패 시 재사용
 */
let cachedFlights: FlightData[] = [];
let lastFetchTime = 0;

export async function fetchFlights(): Promise<FlightData[]> {
  // OpenSky rate limit 보호: 10초 이내 재호출 시 캐시 반환
  if (Date.now() - lastFetchTime < 10000 && cachedFlights.length > 0) {
    return cachedFlights;
  }

  try {
    const res = await fetch(OPENSKY_URL);
    if (!res.ok) {
      console.warn(`OpenSky API ${res.status} — using cached data (${cachedFlights.length} flights)`);
      return cachedFlights;
    }

    const json = await res.json();
    const states: unknown[][] | null = json.states;
    if (!states) return cachedFlights;

    const flights: FlightData[] = [];

    for (const s of states) {
      const lat = s[6];
      const lng = s[5];

      if (lat == null || lng == null) continue;

      flights.push({
        callsign: typeof s[1] === 'string' ? s[1].trim() : '',
        lat: lat as number,
        lng: lng as number,
        altitude: (s[7] as number) ?? 0,
        velocity: (s[9] as number) ?? 0,
        heading: (s[10] as number) ?? 0,
        onGround: (s[8] as boolean) ?? false,
      });
    }

    cachedFlights = flights;
    lastFetchTime = Date.now();
    return flights;
  } catch {
    return cachedFlights;
  }
}
