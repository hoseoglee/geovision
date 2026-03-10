import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  SatRec,
} from 'satellite.js';

export interface SatelliteData {
  name: string;
  noradId: string;
  lat: number;
  lng: number;
  alt: number;
  satrec?: SatRec;
}

const TLE_URL =
  'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle';

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
  try {
    const res = await fetch(TLE_URL);
    if (!res.ok) return [];

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

    return satellites;
  } catch {
    return [];
  }
}
