/**
 * Dark Vessel Detection — AIS 신호 30분+ 끊김 감지
 */

export const DARK_GAP_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export interface DarkGapEvent {
  id: string; // `${mmsi}-${gapStartTime}`
  mmsi: string;
  shipName: string;
  shipType: string;
  gapStartTime: number;
  gapDurationMs: number;
  lastKnownLat: number;
  lastKnownLng: number;
  resumeLat: number | null; // null = still dark
  resumeLng: number | null;
  isOngoing: boolean;
}

/**
 * Compute dark gaps from a ship track map.
 * shipTracks: Map<mmsi, { name, type, lastSeenTime, lat, lng, resumedAt?, resumeLat?, resumeLng? }>
 * Called by useDarkVesselStore every 60s.
 */
export function computeDarkGaps(
  shipTracks: Map<string, {
    name: string;
    type: string;
    lastSeenTime: number;
    lat: number;
    lng: number;
    resumedAt?: number;
    resumeLat?: number;
    resumeLng?: number;
  }>
): DarkGapEvent[] {
  const now = Date.now();
  const events: DarkGapEvent[] = [];

  for (const [mmsi, track] of shipTracks) {
    const gapMs = now - track.lastSeenTime;
    if (gapMs < DARK_GAP_THRESHOLD_MS) continue;

    events.push({
      id: `${mmsi}-${track.lastSeenTime}`,
      mmsi,
      shipName: track.name,
      shipType: track.type,
      gapStartTime: track.lastSeenTime,
      gapDurationMs: gapMs,
      lastKnownLat: track.lat,
      lastKnownLng: track.lng,
      resumeLat: track.resumeLat ?? null,
      resumeLng: track.resumeLng ?? null,
      isOngoing: !track.resumedAt,
    });
  }

  return events;
}
