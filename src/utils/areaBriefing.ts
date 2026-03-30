import type { SpatialIndex } from '@/correlation/SpatialIndex';

export interface AreaBriefingResult {
  lat: number;
  lng: number;
  radiusKm: number;
  generatedAt: number;
  locationName: string;
  sections: BriefingSection[];
  text: string;
  summary: string;
}

export interface BriefingSection {
  icon: string;
  title: string;
  count: number;
  items: string[];
  total: number; // total found (items may be top-3 only)
}

/** Haversine distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Generate a rough location name from lat/lng */
function inferLocationName(lat: number, lng: number): string {
  // Very rough region detection
  if (lat > 60) return `Arctic Region (${lat.toFixed(1)}°N, ${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'W'})`;
  if (lat < -60) return `Antarctic Region (${Math.abs(lat).toFixed(1)}°S, ${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'W'})`;

  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}

function bearingToCardinal(bearing: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((bearing % 360) + 360) % 360 / 45) % 8];
}

export function generateAreaBriefing(
  lat: number,
  lng: number,
  radiusKm: number,
  spatialIndex: SpatialIndex
): AreaBriefingResult {
  const nearby = spatialIndex.nearby(lat, lng, radiusKm);
  const now = Date.now();

  // Group by layer
  const byLayer = new Map<string, typeof nearby>();
  for (const e of nearby) {
    const arr = byLayer.get(e.layer) ?? [];
    arr.push(e);
    byLayer.set(e.layer, arr);
  }

  // Sort each layer by distance to center
  for (const arr of byLayer.values()) {
    arr.sort((a, b) => haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng));
  }

  const sections: BriefingSection[] = [];

  // ── AIRCRAFT (flights) ──
  const flights = byLayer.get('flights') ?? [];
  if (flights.length > 0) {
    const top = flights.slice(0, 3);
    const items = top.map((e) => {
      const d = e.data as Record<string, unknown>;
      const cs = (d.callsign as string || 'UNKN').trim();
      const alt = typeof d.altitude === 'number' ? `${(d.altitude / 1000).toFixed(1)}km` : '?';
      const spd = typeof d.velocity === 'number' ? `${(d.velocity * 3.6).toFixed(0)}km/h` : '?';
      const hdg = typeof d.heading === 'number' ? bearingToCardinal(d.heading) : '';
      const dist = haversineKm(lat, lng, e.lat, e.lng).toFixed(0);
      return `${cs} · ${alt} · ${spd}${hdg ? ` → ${hdg}` : ''} · ${dist}km away`;
    });
    sections.push({ icon: '✈', title: 'AIR TRAFFIC', count: top.length, total: flights.length, items });
  }

  // ── MILITARY AIRCRAFT (adsb) ──
  const adsb = byLayer.get('adsb') ?? [];
  if (adsb.length > 0) {
    const top = adsb.slice(0, 3);
    const items = top.map((e) => {
      const d = e.data as Record<string, unknown>;
      const cs = (d.callsign as string || d.hex as string || 'UNKN');
      const type = d.type as string || '';
      const alt = typeof d.altitude === 'number' ? `FL${Math.round(d.altitude / 100)}` : '?';
      const dist = haversineKm(lat, lng, e.lat, e.lng).toFixed(0);
      return `${cs}${type ? ` (${type})` : ''} · ${alt} · ${dist}km away`;
    });
    sections.push({ icon: '🛩', title: 'MILITARY AIRCRAFT', count: top.length, total: adsb.length, items });
  }

  // ── MARITIME (ships) ──
  const ships = byLayer.get('ships') ?? [];
  if (ships.length > 0) {
    const top = ships.slice(0, 3);
    const items = top.map((e) => {
      const d = e.data as Record<string, unknown>;
      const name = d.name as string || 'UNKNOWN';
      const type = (d.shipType as string || '').toUpperCase();
      const spd = typeof d.speed === 'number' ? `${d.speed.toFixed(1)}kn` : '?';
      const dist = haversineKm(lat, lng, e.lat, e.lng).toFixed(0);
      return `${name}${type ? ` · ${type}` : ''} · ${spd} · ${dist}km away`;
    });
    sections.push({ icon: '⚓', title: 'MARITIME', count: top.length, total: ships.length, items });
  }

  // ── SATELLITES ──
  const satellites = byLayer.get('satellites') ?? [];
  if (satellites.length > 0) {
    const top = satellites.slice(0, 3);
    const items = top.map((e) => {
      const d = e.data as Record<string, unknown>;
      const name = d.name as string || 'UNKN';
      const alt = typeof d.alt === 'number' ? `${d.alt.toFixed(0)}km alt` : '';
      const dist = haversineKm(lat, lng, e.lat, e.lng).toFixed(0);
      return `${name}${alt ? ` · ${alt}` : ''} · ${dist}km away`;
    });
    sections.push({ icon: '🛰', title: 'SATELLITES OVERHEAD', count: top.length, total: satellites.length, items });
  }

  // ── SEISMIC (earthquakes) ──
  const earthquakes = byLayer.get('earthquakes') ?? [];
  if (earthquakes.length > 0) {
    const top = earthquakes.slice(0, 3);
    const items = top.map((e) => {
      const d = e.data as Record<string, unknown>;
      const mag = d.magnitude ?? d.mag ?? '?';
      const place = d.place as string || '';
      const dist = haversineKm(lat, lng, e.lat, e.lng).toFixed(0);
      return `M${mag}${place ? ` · ${place}` : ''} · ${dist}km away`;
    });
    sections.push({ icon: '🌋', title: 'SEISMIC EVENTS', count: top.length, total: earthquakes.length, items });
  }

  // ── OSINT NEWS ──
  const osint = byLayer.get('osint') ?? [];
  if (osint.length > 0) {
    // Sort by recency (newer first)
    const sorted = [...osint].sort((a, b) => {
      const ta = (a.data.time as number) ?? 0;
      const tb = (b.data.time as number) ?? 0;
      return tb - ta;
    });
    const top = sorted.slice(0, 3);
    const items = top.map((e) => {
      const d = e.data as Record<string, unknown>;
      const title = d.title as string || 'Unknown event';
      const src = d.source as string || '';
      const cat = d.category as string || '';
      return `[${(cat || src).toUpperCase()}] ${title.slice(0, 80)}${title.length > 80 ? '…' : ''}`;
    });
    sections.push({ icon: '📰', title: 'OSINT INTELLIGENCE', count: top.length, total: osint.length, items });
  }

  // ── CHOKEPOINTS ──
  const chokepoints = byLayer.get('chokepoints') ?? [];
  if (chokepoints.length > 0) {
    const top = chokepoints.slice(0, 3);
    const items = top.map((e) => {
      const d = e.data as Record<string, unknown>;
      const name = d.name as string || 'Unknown';
      const type = d.type as string || '';
      const dist = haversineKm(lat, lng, e.lat, e.lng).toFixed(0);
      return `${name}${type ? ` (${type})` : ''} · ${dist}km away`;
    });
    sections.push({ icon: '🔱', title: 'STRATEGIC CHOKEPOINTS', count: top.length, total: chokepoints.length, items });
  }

  // ── NUCLEAR PLANTS ──
  const nukes = byLayer.get('nuclear_plants') ?? [];
  if (nukes.length > 0) {
    const top = nukes.slice(0, 3);
    const items = top.map((e) => {
      const d = e.data as Record<string, unknown>;
      const name = d.name as string || 'Unknown';
      const country = d.country as string || '';
      const dist = haversineKm(lat, lng, e.lat, e.lng).toFixed(0);
      return `${name}${country ? ` · ${country}` : ''} · ${dist}km away`;
    });
    sections.push({ icon: '☢', title: 'NUCLEAR INFRASTRUCTURE', count: top.length, total: nukes.length, items });
  }

  // ── SUMMARY ──
  const locationName = inferLocationName(lat, lng);
  const totalItems = nearby.length;

  const summaryParts: string[] = [];
  if (flights.length) summaryParts.push(`${flights.length} aircraft`);
  if (adsb.length) summaryParts.push(`${adsb.length} military`);
  if (ships.length) summaryParts.push(`${ships.length} vessels`);
  if (satellites.length) summaryParts.push(`${satellites.length} satellites`);
  if (earthquakes.length) summaryParts.push(`${earthquakes.length} seismic`);
  if (osint.length) summaryParts.push(`${osint.length} OSINT events`);
  if (chokepoints.length) summaryParts.push(`${chokepoints.length} chokepoints`);
  if (nukes.length) summaryParts.push(`${nukes.length} nuclear sites`);

  const summary = totalItems === 0
    ? 'No sensor data detected in this area.'
    : `${summaryParts.join(', ')} detected within ${radiusKm}km.`;

  // ── BUILD FULL TEXT ──
  const lines: string[] = [];
  lines.push(`AREA INTELLIGENCE BRIEFING`);
  lines.push(`${'━'.repeat(40)}`);
  lines.push(`📍 ${locationName}`);
  lines.push(`⊕  Radius: ${radiusKm} km`);
  lines.push(`🕐 ${new Date(now).toISOString().replace('T', ' ').slice(0, 16)} UTC`);
  lines.push(`${'━'.repeat(40)}`);
  lines.push('');
  lines.push('SITUATION SUMMARY');
  lines.push(summary);
  lines.push('');

  for (const s of sections) {
    lines.push(`${s.icon} ${s.title} (${s.total})`);
    for (const item of s.items) lines.push(`  • ${item}`);
    if (s.total > s.count) lines.push(`  … and ${s.total - s.count} more`);
    lines.push('');
  }

  if (sections.length === 0) {
    lines.push('No active sensor data in this area.');
    lines.push('Try expanding the search radius or activating more layers.');
  }

  return {
    lat, lng, radiusKm, generatedAt: now, locationName, sections, summary,
    text: lines.join('\n'),
  };
}
