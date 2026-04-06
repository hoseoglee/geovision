export interface OilPriceData {
  date: string;
  brent: number;
  wti: number;
  timestamp: number;
}

export interface CurrentOilPrice {
  brent: number;
  wti: number;
  brentChange: number; // % change from previous day
  wtiChange: number;
  lastUpdated: number;
  series: OilPriceData[]; // last 90 days
}

const CACHE_KEY = 'geo-oil-cache-v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CacheEntry {
  data: CurrentOilPrice;
  fetchedAt: number;
}

// Deterministic pseudo-random seeded by a number (LCG).
// Ensures the fallback series is stable within a calendar day.
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateFallbackData(): CurrentOilPrice {
  // Seed with current UTC date (YYYYMMDD) — refreshes daily, stable intraday.
  const today = new Date();
  const seed =
    today.getUTCFullYear() * 10000 +
    (today.getUTCMonth() + 1) * 100 +
    today.getUTCDate();
  const rand = seededRandom(seed);

  const series: OilPriceData[] = [];
  let brent = 82;
  let wti = 77;

  for (let i = 89; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000);
    brent += (rand() - 0.5) * 2;
    wti += (rand() - 0.5) * 2;
    brent = Math.max(65, Math.min(100, brent));
    wti = Math.max(60, Math.min(95, wti));
    series.push({
      date: date.toISOString().slice(0, 10),
      brent: Math.round(brent * 100) / 100,
      wti: Math.round(wti * 100) / 100,
      timestamp: date.getTime(),
    });
  }

  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  return {
    brent: last.brent,
    wti: last.wti,
    brentChange: Math.round(((last.brent - prev.brent) / prev.brent) * 10000) / 100,
    wtiChange: Math.round(((last.wti - prev.wti) / prev.wti) * 10000) / 100,
    lastUpdated: Date.now(),
    series,
  };
}

function readCache(): CurrentOilPrice | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: CurrentOilPrice): void {
  try {
    const entry: CacheEntry = { data, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable (e.g. private browsing / quota exceeded)
  }
}

interface AlphaVantageRow {
  date: string;
  value: string;
}

interface AlphaVantageResponse {
  data?: AlphaVantageRow[];
}

async function fetchCommodity(
  symbol: 'BRENT' | 'WTI',
  apiKey: string
): Promise<AlphaVantageRow[]> {
  const url =
    `https://www.alphavantage.co/query?function=${symbol}` +
    `&interval=daily&apikey=${apiKey}&outputsize=compact`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage ${symbol} HTTP ${res.status}`);
  const json: AlphaVantageResponse = await res.json();
  if (!json.data || !Array.isArray(json.data)) {
    throw new Error(`Alpha Vantage ${symbol}: unexpected response format`);
  }
  return json.data;
}

function mergeToSeries(
  brentRows: AlphaVantageRow[],
  wtiRows: AlphaVantageRow[]
): OilPriceData[] {
  // Both arrays sorted newest-first; take up to 90 entries each
  const brentMap = new Map(
    brentRows
      .filter(r => r.value !== '.' && !isNaN(parseFloat(r.value)))
      .slice(0, 90)
      .map(r => [r.date, parseFloat(r.value)])
  );
  const wtiMap = new Map(
    wtiRows
      .filter(r => r.value !== '.' && !isNaN(parseFloat(r.value)))
      .slice(0, 90)
      .map(r => [r.date, parseFloat(r.value)])
  );

  // Keep only dates present in both series, in ascending order
  const dates = Array.from(brentMap.keys())
    .filter(d => wtiMap.has(d))
    .sort();

  return dates.map(date => ({
    date,
    brent: brentMap.get(date)!,
    wti: wtiMap.get(date)!,
    timestamp: new Date(date).getTime(),
  }));
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function fetchOilPrices(): Promise<CurrentOilPrice> {
  // 1. Cache hit
  const cached = readCache();
  if (cached) return cached;

  // 2. Alpha Vantage
  const apiKey: string | undefined = import.meta.env.VITE_ALPHA_VANTAGE_KEY;
  if (apiKey) {
    try {
      const [brentRows, wtiRows] = await Promise.all([
        fetchCommodity('BRENT', apiKey),
        fetchCommodity('WTI', apiKey),
      ]);

      const series = mergeToSeries(brentRows, wtiRows);
      if (series.length < 2) throw new Error('Insufficient data points from Alpha Vantage');

      const last = series[series.length - 1];
      const prev = series[series.length - 2];

      const result: CurrentOilPrice = {
        brent: last.brent,
        wti: last.wti,
        brentChange: Math.round(((last.brent - prev.brent) / prev.brent) * 10000) / 100,
        wtiChange: Math.round(((last.wti - prev.wti) / prev.wti) * 10000) / 100,
        lastUpdated: Date.now(),
        series,
      };

      writeCache(result);
      return result;
    } catch (err) {
      console.warn('[OilPriceProvider] Alpha Vantage fetch failed, using fallback:', err);
    }
  }

  // 3. Deterministic fallback (cached for 1 hour so we retry periodically)
  const fallback = generateFallbackData();
  try {
    const entry: CacheEntry = {
      data: fallback,
      // Set fetchedAt such that the cache expires in 1 hour (not 6)
      fetchedAt: Date.now() - CACHE_TTL_MS + 60 * 60 * 1000,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
  return fallback;
}
