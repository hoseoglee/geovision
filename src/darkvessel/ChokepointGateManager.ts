/**
 * Chokepoint Gate Manager — 해협 가상 게이트라인 + 통과 이벤트
 */

export interface ChokepointGate {
  name: string;
  centerLat: number;
  centerLng: number;
  // Gate line endpoints (visual representation)
  gateLat1: number; gateLng1: number;
  gateLat2: number; gateLng2: number;
  detectionRadiusKm: number;
  // Heading range for "inbound" (entering the chokepoint deep-water side)
  // Ships heading toward the "narrow" pass = inbound
  inboundHeadingCenter: number; // degrees
  inboundHeadingTolerance: number; // ± tolerance
  color: string; // CSS hex
}

// 6 key chokepoints with gate lines
export const CHOKEPOINT_GATES: ChokepointGate[] = [
  {
    name: 'Strait of Hormuz',
    centerLat: 26.56, centerLng: 56.25,
    gateLat1: 26.2, gateLng1: 56.0,
    gateLat2: 26.9, gateLng2: 56.5,
    detectionRadiusKm: 50,
    inboundHeadingCenter: 90, // heading east = entering Persian Gulf
    inboundHeadingTolerance: 60,
    color: '#FF6B35',
  },
  {
    name: 'Strait of Malacca',
    centerLat: 2.5, centerLng: 101.0,
    gateLat1: 1.3, gateLng1: 104.0,
    gateLat2: 3.2, gateLng2: 104.0,
    detectionRadiusKm: 50,
    inboundHeadingCenter: 315, // heading northwest = toward Indian Ocean
    inboundHeadingTolerance: 60,
    color: '#FFD700',
  },
  {
    name: 'Suez Canal',
    centerLat: 30.43, centerLng: 32.34,
    gateLat1: 30.3, gateLng1: 32.2,
    gateLat2: 30.6, gateLng2: 32.5,
    detectionRadiusKm: 30,
    inboundHeadingCenter: 0, // heading north = toward Med
    inboundHeadingTolerance: 45,
    color: '#4ECDC4',
  },
  {
    name: 'Bab el-Mandeb',
    centerLat: 12.58, centerLng: 43.33,
    gateLat1: 11.8, gateLng1: 43.3,
    gateLat2: 13.2, gateLng2: 43.4,
    detectionRadiusKm: 40,
    inboundHeadingCenter: 315, // heading northwest = toward Red Sea
    inboundHeadingTolerance: 60,
    color: '#FF4757',
  },
  {
    name: 'Bosphorus',
    centerLat: 41.12, centerLng: 29.05,
    gateLat1: 41.0, gateLng1: 28.95,
    gateLat2: 41.25, gateLng2: 29.15,
    detectionRadiusKm: 20,
    inboundHeadingCenter: 0, // heading north = toward Black Sea
    inboundHeadingTolerance: 45,
    color: '#A29BFE',
  },
  {
    name: 'Gibraltar',
    centerLat: 35.96, centerLng: -5.35,
    gateLat1: 35.8, gateLng1: -5.5,
    gateLat2: 36.15, gateLng2: -5.2,
    detectionRadiusKm: 30,
    inboundHeadingCenter: 90, // heading east = entering Med
    inboundHeadingTolerance: 60,
    color: '#74B9FF',
  },
];

/** Great-circle distance in km between two lat/lng points */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Normalize heading to 0-360 */
function normalizeHeading(h: number): number {
  return ((h % 360) + 360) % 360;
}

/** Check if heading is within ±tolerance of center */
function headingInRange(heading: number, center: number, tolerance: number): boolean {
  const diff = Math.abs(normalizeHeading(heading - center));
  return diff <= tolerance || diff >= 360 - tolerance;
}

export interface PassageCandidate {
  gateName: string;
  distanceKm: number;
  direction: 'inbound' | 'outbound';
}

/**
 * Check which gates a ship is currently inside, and determine direction.
 * Returns list of gates the ship is within detection radius of.
 */
export function checkShipGates(
  lat: number,
  lng: number,
  heading: number,
): PassageCandidate[] {
  const results: PassageCandidate[] = [];
  for (const gate of CHOKEPOINT_GATES) {
    const dist = haversineKm(lat, lng, gate.centerLat, gate.centerLng);
    if (dist <= gate.detectionRadiusKm) {
      const direction = headingInRange(heading, gate.inboundHeadingCenter, gate.inboundHeadingTolerance)
        ? 'inbound'
        : 'outbound';
      results.push({ gateName: gate.name, distanceKm: dist, direction });
    }
  }
  return results;
}
