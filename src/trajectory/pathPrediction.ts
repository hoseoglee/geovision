const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function destinationPoint(
  lat: number,
  lng: number,
  bearing: number,
  distanceKm: number
): { lat: number; lng: number } {
  const d = distanceKm / EARTH_RADIUS_KM;
  const brng = toRad(bearing);
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

export function predictLinearPath(
  lat: number,
  lng: number,
  heading: number,
  speed: number,
  durationMinutes = 30,
  stepMinutes = 5
): Array<{ lat: number; lng: number; time: number }> {
  const points: Array<{ lat: number; lng: number; time: number }> = [];
  const steps = Math.floor(durationMinutes / stepMinutes);

  for (let i = 1; i <= steps; i++) {
    const elapsedSec = i * stepMinutes * 60;
    const distanceKm = (speed * elapsedSec) / 1000;
    const dest = destinationPoint(lat, lng, heading, distanceKm);
    points.push({ lat: dest.lat, lng: dest.lng, time: elapsedSec });
  }

  return points;
}

const KNOTS_TO_MS = 0.514444;

export function predictGreatCirclePath(
  lat: number,
  lng: number,
  heading: number,
  speed: number,
  durationMinutes = 30,
  stepMinutes = 5
): Array<{ lat: number; lng: number; time: number }> {
  return predictLinearPath(
    lat,
    lng,
    heading,
    speed * KNOTS_TO_MS,
    durationMinutes,
    stepMinutes
  );
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function angleDifference(a: number, b: number): number {
  const diff = normalizeAngle(a) - normalizeAngle(b);
  return Math.abs(((diff + 180) % 360 + 360) % 360 - 180);
}

export function detectRouteDeviation(
  history: Array<{ lat: number; lng: number; heading: number; timestamp: number }>,
  thresholdDegrees: number
): {
  deviated: boolean;
  deviationAngle: number;
  deviationPoint: { lat: number; lng: number } | null;
} {
  if (history.length < 2) {
    return { deviated: false, deviationAngle: 0, deviationPoint: null };
  }

  let totalChange = 0;
  let maxChange = 0;
  let maxIdx = -1;

  for (let i = 1; i < history.length; i++) {
    const change = angleDifference(history[i].heading, history[i - 1].heading);
    totalChange += change;
    if (change > maxChange) {
      maxChange = change;
      maxIdx = i;
    }
  }

  const avgChange = totalChange / (history.length - 1);
  const deviated = avgChange > thresholdDegrees;

  return {
    deviated,
    deviationAngle: Math.round(avgChange * 100) / 100,
    deviationPoint: deviated && maxIdx >= 0
      ? { lat: history[maxIdx].lat, lng: history[maxIdx].lng }
      : null,
  };
}
