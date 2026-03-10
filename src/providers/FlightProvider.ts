export interface FlightData {
  callsign: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
  heading: number;
  onGround: boolean;
}

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

/**
 * OpenSky Network API에서 실시간 항공편 데이터를 가져옴
 *
 * states 배열 인덱스:
 *  1  = callsign
 *  5  = longitude
 *  6  = latitude
 *  7  = baro_altitude (m)
 *  8  = on_ground
 *  9  = velocity (m/s)
 *  10 = true_track (heading, degrees)
 */
export async function fetchFlights(): Promise<FlightData[]> {
  try {
    const res = await fetch(OPENSKY_URL);
    if (!res.ok) return [];

    const json = await res.json();
    const states: unknown[][] | null = json.states;
    if (!states) return [];

    const flights: FlightData[] = [];

    for (const s of states) {
      const lat = s[6];
      const lng = s[5];

      // 위경도가 없으면 스킵
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

    return flights;
  } catch {
    return [];
  }
}
