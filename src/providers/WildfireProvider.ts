export interface WildfireData {
  lat: number;
  lng: number;
  brightness: number;
  confidence: string;
  acq_date: string;
  acq_time: string;
  satellite: string;
}

const FIRMS_URL =
  'https://firms.modaps.eosdis.nasa.gov/api/country/csv/VIIRS_SNPP_NRT/world/1';

let _lastSimulated = false;
let _lastError: string | null = null;
let _lastLatency = 0;

export function getProviderMeta() {
  return { simulated: _lastSimulated, error: _lastError, latency: _lastLatency };
}

function generateSimulationData(): WildfireData[] {
  const today = new Date().toISOString().split('T')[0];
  return [
    { lat: -33.8, lng: 150.2, brightness: 380, confidence: 'high', acq_date: today, acq_time: '0230', satellite: 'VIIRS' },
    { lat: 37.2, lng: -119.5, brightness: 355, confidence: 'high', acq_date: today, acq_time: '0900', satellite: 'VIIRS' },
    { lat: 39.5, lng: -121.4, brightness: 342, confidence: 'high', acq_date: today, acq_time: '0845', satellite: 'VIIRS' },
    { lat: -1.5, lng: 116.0, brightness: 368, confidence: 'high', acq_date: today, acq_time: '0600', satellite: 'VIIRS' },
    { lat: -15.3, lng: -47.9, brightness: 340, confidence: 'nominal', acq_date: today, acq_time: '1500', satellite: 'VIIRS' },
    { lat: 62.5, lng: 129.0, brightness: 325, confidence: 'nominal', acq_date: today, acq_time: '0400', satellite: 'VIIRS' },
    { lat: -19.8, lng: 23.5, brightness: 310, confidence: 'nominal', acq_date: today, acq_time: '1200', satellite: 'VIIRS' },
    { lat: 38.7, lng: 22.5, brightness: 305, confidence: 'nominal', acq_date: today, acq_time: '1100', satellite: 'VIIRS' },
    { lat: 56.3, lng: 84.2, brightness: 298, confidence: 'nominal', acq_date: today, acq_time: '0700', satellite: 'VIIRS' },
    { lat: -8.5, lng: 112.7, brightness: 290, confidence: 'nominal', acq_date: today, acq_time: '0530', satellite: 'VIIRS' },
  ];
}

function parseCsv(text: string): WildfireData[] {
  const lines = text.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',');
  const latIdx = header.indexOf('latitude');
  const lngIdx = header.indexOf('longitude');
  const brightIdx = header.indexOf('bright_ti4');
  const confIdx = header.indexOf('confidence');
  const dateIdx = header.indexOf('acq_date');
  const timeIdx = header.indexOf('acq_time');
  const satIdx = header.indexOf('satellite');

  if (latIdx < 0 || lngIdx < 0) return [];

  const results: WildfireData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < header.length) continue;

    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    if (isNaN(lat) || isNaN(lng)) continue;

    results.push({
      lat,
      lng,
      brightness: parseFloat(cols[brightIdx]) || 300,
      confidence: cols[confIdx] || 'nominal',
      acq_date: cols[dateIdx] || '',
      acq_time: cols[timeIdx] || '',
      satellite: cols[satIdx] || 'VIIRS',
    });
  }

  return results;
}

/**
 * NASA FIRMS에서 최근 24시간 산불 핫스팟 데이터 조회.
 * CORS 실패 또는 에러 시 시뮬레이션 fallback.
 */
export async function fetchWildfires(): Promise<WildfireData[]> {
  const _start = Date.now();
  try {
    const res = await fetch(FIRMS_URL, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) { _lastSimulated = true; _lastError = `HTTP ${res.status}`; _lastLatency = Date.now() - _start; return generateSimulationData(); }

    const text = await res.text();
    const fires = parseCsv(text);

    if (fires.length === 0) { _lastSimulated = true; _lastError = null; _lastLatency = Date.now() - _start; return generateSimulationData(); }

    // confidence 높은 순으로 정렬, 상위 200개만
    fires.sort((a, b) => {
      const order: Record<string, number> = { high: 0, nominal: 1, low: 2 };
      const oa = order[a.confidence] ?? 1;
      const ob = order[b.confidence] ?? 1;
      if (oa !== ob) return oa - ob;
      return b.brightness - a.brightness;
    });

    _lastSimulated = false; _lastError = null; _lastLatency = Date.now() - _start;
    return fires.slice(0, 200);
  } catch (e) {
    _lastSimulated = true; _lastError = e instanceof Error ? e.message : String(e); _lastLatency = Date.now() - _start;
    return generateSimulationData();
  }
}
