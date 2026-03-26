export type OsintCategory = 'conflict' | 'disaster' | 'politics' | 'military' | 'economy' | 'health' | 'environment' | 'general';

export interface OsintData {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  category: OsintCategory;
  lat: number;
  lng: number;
  locationName: string;
  time: number;
  tone?: number;
  severity?: 'crisis' | 'disaster' | 'alert' | 'news';
}

const GDELT_URL =
  'https://api.gdeltproject.org/api/v2/geo/geo?query=&mode=PointData&format=GeoJSON&timespan=24h&maxpoints=100&sort=date';

const RELIEFWEB_URL =
  'https://api.reliefweb.int/v2/disasters?appname=geovision&filter[field]=status&filter[value]=current&limit=50&fields[include][]=name&fields[include][]=date&fields[include][]=description&fields[include][]=country&fields[include][]=primary_type&fields[include][]=status';

// Cache: 15 minutes
const CACHE_TTL = 900_000;
let _cache: OsintData[] | null = null;
let _cacheTime = 0;

let _lastSimulated = false;
let _lastError: string | null = null;
let _lastLatency = 0;

export function getProviderMeta() {
  return { simulated: _lastSimulated, error: _lastError, latency: _lastLatency };
}

// Top ~60 most commonly affected countries (iso3 → centroid)
const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  AFG: { lat: 33.93, lng: 67.71 },
  AGO: { lat: -11.20, lng: 17.87 },
  ARG: { lat: -38.42, lng: -63.62 },
  AUS: { lat: -25.27, lng: 133.78 },
  BGD: { lat: 23.68, lng: 90.36 },
  BRA: { lat: -14.24, lng: -51.93 },
  BFA: { lat: 12.24, lng: -1.56 },
  MMR: { lat: 21.91, lng: 95.96 },
  BDI: { lat: -3.37, lng: 29.92 },
  KHM: { lat: 12.57, lng: 104.99 },
  CMR: { lat: 7.37, lng: 12.35 },
  CAF: { lat: 6.61, lng: 20.94 },
  TCD: { lat: 15.45, lng: 18.73 },
  CHL: { lat: -35.68, lng: -71.54 },
  CHN: { lat: 35.86, lng: 104.20 },
  COL: { lat: 4.57, lng: -74.30 },
  COD: { lat: -4.04, lng: 21.76 },
  CUB: { lat: 21.52, lng: -77.78 },
  ECU: { lat: -1.83, lng: -78.18 },
  EGY: { lat: 26.82, lng: 30.80 },
  SLV: { lat: 13.79, lng: -88.90 },
  ETH: { lat: 9.15, lng: 40.49 },
  GTM: { lat: 15.78, lng: -90.23 },
  HTI: { lat: 18.97, lng: -72.29 },
  HND: { lat: 15.20, lng: -86.24 },
  IND: { lat: 20.59, lng: 78.96 },
  IDN: { lat: -0.79, lng: 113.92 },
  IRN: { lat: 32.43, lng: 53.69 },
  IRQ: { lat: 33.22, lng: 43.68 },
  ISR: { lat: 31.05, lng: 34.85 },
  JPN: { lat: 36.20, lng: 138.25 },
  JOR: { lat: 30.59, lng: 36.24 },
  KEN: { lat: -0.02, lng: 37.91 },
  LBN: { lat: 33.85, lng: 35.86 },
  LBY: { lat: 26.34, lng: 17.23 },
  MDG: { lat: -18.77, lng: 46.87 },
  MWI: { lat: -13.25, lng: 34.30 },
  MLI: { lat: 17.57, lng: -4.00 },
  MEX: { lat: 23.63, lng: -102.55 },
  MOZ: { lat: -18.67, lng: 35.53 },
  NPL: { lat: 28.39, lng: 84.12 },
  NER: { lat: 17.61, lng: 8.08 },
  NGA: { lat: 9.08, lng: 8.68 },
  PRK: { lat: 40.34, lng: 127.51 },
  PAK: { lat: 30.38, lng: 69.35 },
  PSE: { lat: 31.95, lng: 35.23 },
  PER: { lat: -9.19, lng: -75.02 },
  PHL: { lat: 12.88, lng: 121.77 },
  RUS: { lat: 61.52, lng: 105.32 },
  SOM: { lat: 5.15, lng: 46.20 },
  ZAF: { lat: -30.56, lng: 22.94 },
  SSD: { lat: 6.88, lng: 31.31 },
  SDN: { lat: 12.86, lng: 30.22 },
  SYR: { lat: 34.80, lng: 38.99 },
  TUR: { lat: 38.96, lng: 35.24 },
  UGA: { lat: 1.37, lng: 32.29 },
  UKR: { lat: 48.38, lng: 31.17 },
  USA: { lat: 37.09, lng: -95.71 },
  VEN: { lat: 6.42, lng: -66.59 },
  VNM: { lat: 14.06, lng: 108.28 },
  YEM: { lat: 15.55, lng: 48.52 },
};

/**
 * 키워드 기반 카테고리 매핑
 */
function classifyCategory(text: string): OsintCategory {
  const lower = text.toLowerCase();

  if (/\b(war|attack|bomb|militant|terror|armed|conflict|fighting|battle|strike|weapon)\b/.test(lower)) return 'conflict';
  if (/\b(military|army|troops|navy|defense|missile|drone|airforce|soldier)\b/.test(lower)) return 'military';
  if (/\b(earthquake|flood|hurricane|typhoon|cyclone|tsunami|landslide|wildfire|drought|volcano|disaster|storm)\b/.test(lower)) return 'disaster';
  if (/\b(election|government|policy|president|parliament|minister|political|vote|legislation|law)\b/.test(lower)) return 'politics';
  if (/\b(economy|trade|market|gdp|inflation|recession|stock|finance|bank|tariff|sanction)\b/.test(lower)) return 'economy';
  if (/\b(health|pandemic|disease|outbreak|virus|vaccine|epidemic|hospital|medical|who)\b/.test(lower)) return 'health';
  if (/\b(climate|pollution|environment|emission|carbon|deforestation|biodiversity|ocean|warming)\b/.test(lower)) return 'environment';

  return 'general';
}

/**
 * ReliefWeb primary_type → severity 매핑
 */
function classifySeverity(primaryType: string | undefined): 'crisis' | 'disaster' | 'alert' | 'news' {
  if (!primaryType) return 'alert';
  const lower = primaryType.toLowerCase();
  if (/earthquake|tsunami|cyclone|hurricane|typhoon|flood|volcano/.test(lower)) return 'disaster';
  if (/conflict|war|complex emergency/.test(lower)) return 'crisis';
  if (/epidemic|drought|storm/.test(lower)) return 'alert';
  return 'alert';
}

/**
 * 텍스트를 max length로 자름
 */
function truncate(str: string, max: number): string {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + '...';
}

/**
 * HTML 태그 제거
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * GDELT GEO 2.0 API에서 뉴스 데이터를 가져옴
 */
async function fetchGdelt(): Promise<OsintData[]> {
  const res = await fetch(GDELT_URL);
  if (!res.ok) throw new Error(`GDELT HTTP ${res.status}`);

  const json = await res.json();
  const features: any[] = json?.features;
  if (!Array.isArray(features)) return [];

  const results: OsintData[] = [];

  for (const feature of features) {
    try {
      const props = feature.properties ?? {};
      const coords = feature.geometry?.coordinates;
      if (!coords || coords.length < 2) continue;

      const lng = coords[0];
      const lat = coords[1];
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;

      // Title: prefer name, fall back to html (strip tags)
      let title = props.name ?? '';
      if (!title && props.html) {
        title = stripHtml(props.html);
      }
      if (!title) continue;

      const url = props.url ?? '';
      const tone = typeof props.tone === 'number' ? props.tone : undefined;

      // Timestamp: parse urlpubtimedate (YYYYMMDDHHMMSS format) or use now
      let time = Date.now();
      if (props.urlpubtimedate) {
        const s = String(props.urlpubtimedate);
        if (s.length >= 14) {
          const parsed = Date.parse(
            `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`
          );
          if (!isNaN(parsed)) time = parsed;
        }
      }

      const category = classifyCategory(title);

      results.push({
        id: `gdelt-${lng.toFixed(4)}-${lat.toFixed(4)}-${time}`,
        title: truncate(title, 200),
        summary: truncate(title, 200),
        url,
        source: 'GDELT',
        category,
        lat,
        lng,
        locationName: props.name ?? '',
        time,
        tone,
        severity: tone !== undefined && tone < -5 ? 'alert' : 'news',
      });
    } catch {
      // skip malformed features
      continue;
    }
  }

  return results;
}

/**
 * ReliefWeb API v2에서 재난/위기 데이터를 가져옴
 */
async function fetchReliefWeb(): Promise<OsintData[]> {
  const res = await fetch(RELIEFWEB_URL);
  if (!res.ok) throw new Error(`ReliefWeb HTTP ${res.status}`);

  const json = await res.json();
  const data: any[] = json?.data;
  if (!Array.isArray(data)) return [];

  const results: OsintData[] = [];

  for (const item of data) {
    try {
      const fields = item.fields ?? {};
      const name = fields.name ?? '';
      if (!name) continue;

      // Country → centroid
      const countries: any[] = fields.country ?? [];
      if (countries.length === 0) continue;

      const primaryCountry = countries[0];
      const iso3 = primaryCountry?.iso3;
      const centroid = iso3 ? COUNTRY_CENTROIDS[iso3] : null;
      if (!centroid) continue;

      // Description
      const description = fields.description ?? '';
      const summary = truncate(stripHtml(description), 200);

      // Date
      let time = Date.now();
      const dateArr = fields.date;
      if (Array.isArray(dateArr) && dateArr.length > 0) {
        const dateObj = dateArr[0];
        const created = dateObj?.created;
        const original = dateObj?.original;
        const dateStr = original ?? created;
        if (dateStr) {
          const parsed = Date.parse(dateStr);
          if (!isNaN(parsed)) time = parsed;
        }
      }

      const primaryType = fields.primary_type?.name ?? fields.primary_type ?? '';
      const category = classifyCategory(`${name} ${primaryType}`);
      const severity = classifySeverity(typeof primaryType === 'string' ? primaryType : primaryType?.name);

      const countryNames = countries.map((c: any) => c.name).filter(Boolean).join(', ');

      results.push({
        id: `reliefweb-${item.id ?? time}`,
        title: truncate(name, 200),
        summary: summary || truncate(name, 200),
        url: item.href ?? `https://reliefweb.int/disaster/${item.id}`,
        source: 'ReliefWeb',
        category,
        lat: centroid.lat,
        lng: centroid.lng,
        locationName: countryNames || primaryCountry?.name || '',
        time,
        severity,
      });
    } catch {
      // skip malformed items
      continue;
    }
  }

  return results;
}

/**
 * 근접 중복 제거: 같은 소스가 아닌 항목이 0.5도 이내 + 유사 제목이면 중복 판정
 */
function deduplicateByProximity(items: OsintData[]): OsintData[] {
  const result: OsintData[] = [];

  for (const item of items) {
    const isDuplicate = result.some(
      (existing) =>
        existing.source !== item.source &&
        Math.abs(existing.lat - item.lat) < 0.5 &&
        Math.abs(existing.lng - item.lng) < 0.5 &&
        existing.title.slice(0, 30).toLowerCase() === item.title.slice(0, 30).toLowerCase()
    );
    if (!isDuplicate) {
      result.push(item);
    }
  }

  return result;
}

/**
 * GDELT + ReliefWeb에서 OSINT 뉴스 데이터를 가져옴
 */
export async function fetchOsint(): Promise<OsintData[]> {
  const _start = Date.now();

  // Return cache if fresh
  if (_cache && Date.now() - _cacheTime < CACHE_TTL) {
    _lastSimulated = false; _lastError = null; _lastLatency = 0;
    return _cache;
  }

  try {
    const [gdeltResult, reliefWebResult] = await Promise.allSettled([
      fetchGdelt(),
      fetchReliefWeb(),
    ]);

    const gdeltData = gdeltResult.status === 'fulfilled' ? gdeltResult.value : [];
    const reliefWebData = reliefWebResult.status === 'fulfilled' ? reliefWebResult.value : [];

    // Collect errors
    const errors: string[] = [];
    if (gdeltResult.status === 'rejected') errors.push(`GDELT: ${gdeltResult.reason}`);
    if (reliefWebResult.status === 'rejected') errors.push(`ReliefWeb: ${reliefWebResult.reason}`);

    const combined = [...gdeltData, ...reliefWebData];
    const deduplicated = deduplicateByProximity(combined);

    // Sort by time descending
    deduplicated.sort((a, b) => b.time - a.time);

    _cache = deduplicated;
    _cacheTime = Date.now();

    _lastSimulated = false;
    _lastError = errors.length > 0 ? errors.join('; ') : null;
    _lastLatency = Date.now() - _start;

    return deduplicated;
  } catch (e) {
    _lastSimulated = false;
    _lastError = e instanceof Error ? e.message : String(e);
    _lastLatency = Date.now() - _start;
    return [];
  }
}
