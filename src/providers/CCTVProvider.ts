// CCTV Provider — static dataset + Windy Webcams API dynamic fetching
// Static: well-known public webcams (YouTube live streams)
// Dynamic: Windy Webcams API v3 (by viewport bounding box)

export interface CCTVData {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  embedUrl: string; // iframe-embeddable URL (YouTube or Windy player)
  thumbnailUrl?: string; // Windy preview image
  type: 'traffic' | 'city' | 'port' | 'landmark' | 'webcam';
  source: 'static' | 'windy';
  heading?: number; // 카메라 방향 (0=North, 90=East, 180=South, 270=West)
  tilt?: number; // 카메라 틸트 (음수=하향, 양수=상향)
}

// ── Static YouTube live streams ─────────────────────────────
const STATIC_CCTVS: CCTVData[] = [
  // ── New York ──────────────────────────────────────────
  {
    id: 'nyc-times-square',
    name: 'Times Square',
    city: 'New York',
    country: 'US',
    lat: 40.7580,
    lng: -73.9855,
    embedUrl: 'https://www.youtube.com/embed/rnXIjl_Rzy4?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 210, // WSW — Marriott Marquis area, looking toward McDonald's & pedestrian plaza
    tilt: -35,
  },
  {
    id: 'nyc-times-square-2',
    name: 'Times Square (Broadway)',
    city: 'New York',
    country: 'US',
    lat: 40.7594,
    lng: -73.9854,
    embedUrl: 'https://www.youtube.com/embed/iiBTWU2FyFo?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 155, // SSE — Broadway 46th-47th, SE toward heart of TS
    tilt: -5,
  },

  // ── Tokyo ─────────────────────────────────────────────
  {
    id: 'tokyo-shibuya',
    name: 'Shibuya Crossing',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6596,
    lng: 139.7003,
    embedUrl: 'https://www.youtube.com/embed/dfVK7ld38Ys?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 200, // SSW — Magnet by Shibuya 109, looking down at crossing
    tilt: -45,
  },
  {
    id: 'tokyo-shibuya-2',
    name: 'Shibuya Crossing (Sky)',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6584,
    lng: 139.7005,
    embedUrl: 'https://www.youtube.com/embed/3Q5wZeTuttw?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 255, // WSW — Shibuya Sky (Scramble Square rooftop), looking down at crossing
    tilt: -55,
  },
  {
    id: 'tokyo-kabukicho',
    name: 'Shinjuku Kabukicho',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6938,
    lng: 139.7034,
    embedUrl: 'https://www.youtube.com/embed/DjdUEyjx8GM?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 350, // N — looking north down Kabukicho-ichiban-gai main strip
    tilt: -25,
  },
  {
    id: 'tokyo-kabukicho-2',
    name: 'Kabukicho (Night View)',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.694,
    lng: 139.7038,
    embedUrl: 'https://www.youtube.com/embed/gFRtAAmiFbE?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 140, // SE — Godzilla building area, looking southeast
    tilt: -20,
  },

  // ── Seoul ─────────────────────────────────────────────
  {
    id: 'seoul-banpo-bridge',
    name: 'Banpo Bridge',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5060,
    lng: 126.9960,
    embedUrl: 'https://www.youtube.com/embed/-JhoMGoAfFc?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 350, // N — south bank looking north at Banpo Bridge rainbow fountain
    tilt: -5,
  },
  {
    id: 'seoul-station',
    name: 'Seoul Station Plaza',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5547,
    lng: 126.9707,
    embedUrl: 'https://www.youtube.com/embed/DSgn-lTHJzM?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 190, // S — looking south at Seoul Station old building from plaza
    tilt: -15,
  },
  {
    id: 'seoul-lotte-world',
    name: 'Lotte World Tower',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5126,
    lng: 127.1025,
    embedUrl: 'https://www.youtube.com/embed/JIQPCfb9Qs0?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 90, // E — looking east toward Seokchon Lake
    tilt: 15,
  },
  {
    id: 'seoul-city-view',
    name: 'Gyeongbokgung Palace',
    city: 'Seoul',
    country: 'KR',
    lat: 37.572,
    lng: 126.977,
    embedUrl: 'https://www.youtube.com/embed/VBlN0MGqyz4?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 355, // N — Gwanghwamun area looking north at palace + Bugaksan mountain
    tilt: -5,
  },

  // ── Paris ─────────────────────────────────────────────
  {
    id: 'paris-eiffel-tower',
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'FR',
    lat: 48.8634,
    lng: 2.2937,
    embedUrl: 'https://www.youtube.com/embed/OzYp4NRZlwQ?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 240, // WSW — Trocadéro area, looking toward Eiffel Tower
    tilt: -5,
  },
  {
    id: 'paris-city-view',
    name: 'Paris City View',
    city: 'Paris',
    country: 'FR',
    lat: 48.8460,
    lng: 2.3460,
    embedUrl: 'https://www.youtube.com/embed/0yRlsbecXWo?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 350, // N — rooftop near Latin Quarter, looking north
    tilt: -5,
  },
  {
    id: 'paris-city-view-2',
    name: 'Paris Panorama',
    city: 'Paris',
    country: 'FR',
    lat: 48.855,
    lng: 2.348,
    embedUrl: 'https://www.youtube.com/embed/UHlDzWrBEPI?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 300, // WNW — panoramic rooftop view
    tilt: 0,
  },

  // ── London ────────────────────────────────────────────
  {
    id: 'london-walworth',
    name: 'Walworth Road',
    city: 'London',
    country: 'GB',
    lat: 51.491,
    lng: -0.0935,
    embedUrl: 'https://www.youtube.com/embed/8JCk5M_xrBs?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
    heading: 170, // S — traffic cam looking south down Walworth Road
    tilt: -20,
  },
  {
    id: 'london-west',
    name: 'West London Skyline',
    city: 'London',
    country: 'GB',
    lat: 51.5280,
    lng: -0.2230,
    embedUrl: 'https://www.youtube.com/embed/3K3jSS16qQs?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 300, // WNW — elevated skyline view from west London
    tilt: 0,
  },

  // ── Dublin ────────────────────────────────────────────
  {
    id: 'dublin-temple-bar',
    name: 'Temple Bar',
    city: 'Dublin',
    country: 'IE',
    lat: 53.3455,
    lng: -6.2643,
    embedUrl: 'https://www.youtube.com/embed/3nyPER2kzqk?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 235, // SW — looking down Temple Bar street
    tilt: -30,
  },

  // ── Las Vegas ─────────────────────────────────────────
  {
    id: 'vegas-strip',
    name: 'The Strip',
    city: 'Las Vegas',
    country: 'US',
    lat: 36.1147,
    lng: -115.1728,
    embedUrl: 'https://www.youtube.com/embed/jtvmwjzZY0c?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 200, // SSW — looking south down The Strip
    tilt: -15,
  },
  {
    id: 'vegas-strip-2',
    name: 'The Strip (South)',
    city: 'Las Vegas',
    country: 'US',
    lat: 36.112,
    lng: -115.174,
    embedUrl: 'https://www.youtube.com/embed/plsoWnyDVIY?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 20, // NNE — looking north up The Strip
    tilt: -10,
  },

  // ── Santa Monica ──────────────────────────────────────
  {
    id: 'santa-monica-pier',
    name: 'Pacific Park Pier',
    city: 'Santa Monica',
    country: 'US',
    lat: 34.0092,
    lng: -118.4973,
    embedUrl: 'https://www.youtube.com/embed/DckQwhIzMdA?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 260, // W — looking west toward Pacific Ocean from pier
    tilt: -10,
  },

  // ── Chicago ───────────────────────────────────────────
  {
    id: 'chicago-city-view',
    name: 'Chicago Skyline',
    city: 'Chicago',
    country: 'US',
    lat: 41.8781,
    lng: -87.6298,
    embedUrl: 'https://www.youtube.com/embed/E4dp1EzsJaY?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 20, // NNE — looking north-northeast along Lake Michigan shoreline
    tilt: -5,
  },

  // ── Hong Kong ─────────────────────────────────────────
  {
    id: 'hk-peak',
    name: 'Victoria Peak',
    city: 'Hong Kong',
    country: 'CN',
    lat: 22.2759,
    lng: 114.1455,
    embedUrl: 'https://www.youtube.com/embed/eaHSUjbK75o?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 30, // NNE — Victoria Peak looking north toward harbor
    tilt: -15,
  },
  {
    id: 'hk-tsim-sha-tsui',
    name: 'Tsim Sha Tsui',
    city: 'Hong Kong',
    country: 'CN',
    lat: 22.2988,
    lng: 114.1722,
    embedUrl: 'https://www.youtube.com/embed/jmwM1hA3JE0?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 180, // S — waterfront looking south toward HK Island
    tilt: -10,
  },

  // ── Osaka ─────────────────────────────────────────────
  {
    id: 'osaka-dotonbori',
    name: 'Dotonbori',
    city: 'Osaka',
    country: 'JP',
    lat: 34.6687,
    lng: 135.5025,
    embedUrl: 'https://www.youtube.com/embed/bzn2QWfOLFY?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 90, // E — looking east along Dotonbori canal
    tilt: -25,
  },
  {
    id: 'osaka-nakanoshima',
    name: 'Nakanoshima',
    city: 'Osaka',
    country: 'JP',
    lat: 34.6937,
    lng: 135.5023,
    embedUrl: 'https://www.youtube.com/embed/LPcDAtkX0-Q?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 270, // W — looking west along Nakanoshima waterfront
    tilt: -10,
  },

  // ── Kyoto ─────────────────────────────────────────────
  {
    id: 'kyoto-station',
    name: 'Kyoto Station Terminal',
    city: 'Kyoto',
    country: 'JP',
    lat: 34.9856,
    lng: 135.7584,
    embedUrl: 'https://www.youtube.com/embed/v9rQqa_VTEY?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
    heading: 355, // N — Kyoto Station bus terminal, looking north toward Kyoto Tower
    tilt: -10,
  },

  // ── Rio de Janeiro ────────────────────────────────────
  {
    id: 'rio-copacabana',
    name: 'Copacabana Beach',
    city: 'Rio de Janeiro',
    country: 'BR',
    lat: -22.9711,
    lng: -43.1826,
    embedUrl: 'https://www.youtube.com/embed/gX73YiJp-RU?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 120, // ESE — looking along beach toward Sugarloaf
    tilt: -10,
  },
  {
    id: 'rio-christ-redeemer',
    name: 'Christ the Redeemer',
    city: 'Rio de Janeiro',
    country: 'BR',
    lat: -22.9519,
    lng: -43.2105,
    embedUrl: 'https://www.youtube.com/embed/moUl-CBrXp4?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 60, // ENE — Corcovado, looking toward city and Sugarloaf
    tilt: -20,
  },

  // ── Cape Town ─────────────────────────────────────────
  {
    id: 'capetown-table-mountain',
    name: 'Table Mountain View',
    city: 'Cape Town',
    country: 'ZA',
    lat: -33.9628,
    lng: 18.4098,
    embedUrl: 'https://www.youtube.com/embed/4Zu64CmAjMo?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
    heading: 180, // S — looking south toward Table Mountain
    tilt: 10,
  },
  {
    id: 'capetown-sea-point',
    name: 'Sea Point',
    city: 'Cape Town',
    country: 'ZA',
    lat: -33.916,
    lng: 18.388,
    embedUrl: 'https://www.youtube.com/embed/Gg-UaNPlJmQ?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
    heading: 270, // W — Sea Point looking west toward Atlantic
    tilt: -5,
  },

  // ── Duluth Harbor ─────────────────────────────────────
  {
    id: 'duluth-harbor',
    name: 'Duluth Aerial Lift Bridge',
    city: 'Duluth',
    country: 'US',
    lat: 46.7783,
    lng: -92.0944,
    embedUrl: 'https://www.youtube.com/embed/HPS48TMmNag?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
    heading: 135, // SE — looking toward Lift Bridge and Lake Superior
    tilt: -10,
  },
  {
    id: 'duluth-harbor-canal',
    name: 'Duluth Ship Canal',
    city: 'Duluth',
    country: 'US',
    lat: 46.779,
    lng: -92.093,
    embedUrl: 'https://www.youtube.com/embed/BzwWjdZXymc?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
    heading: 90, // E — looking east through ship canal to Lake Superior
    tilt: -5,
  },

  // ── Port of Miami ─────────────────────────────────────
  {
    id: 'miami-port',
    name: 'Port of Miami',
    city: 'Miami',
    country: 'US',
    lat: 25.7743,
    lng: -80.17,
    embedUrl: 'https://www.youtube.com/embed/PeYZZinH1wI?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
    heading: 90, // E — looking east toward port channel
    tilt: -15,
  },
  {
    id: 'miami-port-cruise',
    name: 'Port of Miami (Cruise Terminal)',
    city: 'Miami',
    country: 'US',
    lat: 25.775,
    lng: -80.168,
    embedUrl: 'https://www.youtube.com/embed/YNDiaM0zpFc?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
    heading: 150, // SSE — cruise terminal looking toward Government Cut
    tilt: -10,
  },

  // ── Port of Southampton ───────────────────────────────
  {
    id: 'southampton-port',
    name: 'Port of Southampton',
    city: 'Southampton',
    country: 'GB',
    lat: 50.899,
    lng: -1.404,
    embedUrl: 'https://www.youtube.com/embed/QO-hO_kwwmY?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
    heading: 180, // S — looking south toward Southampton Water
    tilt: -10,
  },

  // ── Taiwan Traffic ────────────────────────────────────
  {
    id: 'taiwan-traffic',
    name: 'Taiwan Highway',
    city: 'Taipei',
    country: 'TW',
    lat: 25.033,
    lng: 121.5654,
    embedUrl: 'https://www.youtube.com/embed/pmM2CeSAx0I?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
    heading: 45, // NE — highway traffic cam
    tilt: -25,
  },
];

// ── Windy Webcams API integration ───────────────────────────
const WINDY_KEY = import.meta.env.VITE_WINDY_KEY || '';
// Dev: Vite proxy at /api/windy → api.windy.com/webcams/api/v3
// Prod: Vercel serverless function at /api/windy
const WINDY_API = '/api/windy/webcams';

// Cache for Windy webcams by area key
const windyCache = new Map<string, { data: CCTVData[]; ts: number }>();
const WINDY_CACHE_TTL = 5 * 60 * 1000; // 5 min

// All dynamically loaded Windy cams (merged from all area queries)
let windyCams: CCTVData[] = [];
let _listeners: (() => void)[] = [];

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

function areaKey(lat: number, lng: number, radiusKm: number): string {
  return `${lat.toFixed(1)},${lng.toFixed(1)},${radiusKm}`;
}

interface WindyWebcam {
  webcamId: number;
  title: string;
  status: string;
  location: {
    city: string;
    country: string;
    country_code: string;
    latitude: number;
    longitude: number;
  };
  player?: {
    day: string;
    lifetime: string;
  };
  images?: {
    current: { preview: string; thumbnail: string };
  };
  urls?: {
    detail: string;
  };
}

/** Fetch webcams from Windy API by center + radius */
export async function fetchWindyCamsByArea(
  lat: number,
  lng: number,
  radiusKm: number = 100,
): Promise<CCTVData[]> {
  if (!WINDY_KEY) return [];

  const key = areaKey(lat, lng, radiusKm);
  const cached = windyCache.get(key);
  if (cached && Date.now() - cached.ts < WINDY_CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${WINDY_API}?nearby=${lat},${lng},${radiusKm}&limit=50&include=location,urls,images,player`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Windy] API error: ${res.status}`);
      return cached?.data ?? [];
    }
    const json = await res.json();
    const cams: CCTVData[] = (json.webcams || [])
      .filter((w: WindyWebcam) => w.status === 'active')
      .map((w: WindyWebcam) => ({
        id: `windy-${w.webcamId}`,
        name: w.title,
        city: w.location.city || 'Unknown',
        country: w.location.country_code || '',
        lat: w.location.latitude,
        lng: w.location.longitude,
        embedUrl: w.player?.day || w.urls?.detail || '',
        thumbnailUrl: w.images?.current?.preview || w.images?.current?.thumbnail || '',
        type: 'webcam' as const,
        source: 'windy' as const,
      }));

    windyCache.set(key, { data: cams, ts: Date.now() });

    // Merge into global windyCams (dedupe by id)
    const existingIds = new Set(windyCams.map((c) => c.id));
    const newCams = cams.filter((c) => !existingIds.has(c.id));
    if (newCams.length > 0) {
      windyCams = [...windyCams, ...newCams];
      // Don't notify during bootstrap — bootstrap will notify once at the end
    }

    return cams;
  } catch (err) {
    console.warn('[Windy] fetch error:', err);
    return cached?.data ?? [];
  }
}

/** Pre-load major city areas to bootstrap ~1000 cams on startup */
const MAJOR_AREAS = [
  // Asia
  { lat: 35.68, lng: 139.69, r: 100 },  // Tokyo
  { lat: 37.57, lng: 126.98, r: 100 },  // Seoul
  { lat: 34.69, lng: 135.50, r: 100 },  // Osaka
  { lat: 31.23, lng: 121.47, r: 150 },  // Shanghai
  { lat: 22.28, lng: 114.16, r: 80 },   // Hong Kong
  { lat: 25.03, lng: 121.57, r: 80 },   // Taipei
  { lat: 1.35, lng: 103.82, r: 50 },    // Singapore
  { lat: 13.76, lng: 100.50, r: 80 },   // Bangkok
  // Europe
  { lat: 48.86, lng: 2.35, r: 100 },    // Paris
  { lat: 51.51, lng: -0.13, r: 100 },   // London
  { lat: 52.52, lng: 13.41, r: 100 },   // Berlin
  { lat: 41.39, lng: 2.17, r: 100 },    // Barcelona
  { lat: 45.46, lng: 9.19, r: 100 },    // Milan
  { lat: 48.21, lng: 16.37, r: 100 },   // Vienna
  { lat: 47.37, lng: 8.54, r: 100 },    // Zurich
  { lat: 59.33, lng: 18.07, r: 100 },   // Stockholm
  { lat: 55.68, lng: 12.57, r: 100 },   // Copenhagen
  { lat: 40.42, lng: -3.70, r: 100 },   // Madrid
  { lat: 41.90, lng: 12.50, r: 100 },   // Rome
  { lat: 50.08, lng: 14.44, r: 100 },   // Prague
  // Americas
  { lat: 40.76, lng: -73.98, r: 100 },  // New York
  { lat: 34.05, lng: -118.24, r: 100 }, // Los Angeles
  { lat: 41.88, lng: -87.63, r: 100 },  // Chicago
  { lat: 25.76, lng: -80.19, r: 80 },   // Miami
  { lat: 37.77, lng: -122.42, r: 80 },  // San Francisco
  { lat: -22.91, lng: -43.17, r: 80 },  // Rio de Janeiro
  { lat: -23.55, lng: -46.63, r: 80 },  // São Paulo
  // Oceania / Africa
  { lat: -33.87, lng: 151.21, r: 100 }, // Sydney
  { lat: -33.92, lng: 18.42, r: 80 },   // Cape Town
];

let _bootstrapped = false;

/** Bootstrap Windy cams from major cities (called once on CCTV overlay enable) */
export async function bootstrapWindyCams(): Promise<void> {
  if (_bootstrapped || !WINDY_KEY) return;
  _bootstrapped = true;

  try {
    // Fetch in batches of 6 to avoid rate limiting
    const batchSize = 6;
    for (let i = 0; i < MAJOR_AREAS.length; i += batchSize) {
      const batch = MAJOR_AREAS.slice(i, i + batchSize);
      await Promise.all(
        batch.map((a) => fetchWindyCamsByArea(a.lat, a.lng, a.r)),
      );
    }
    console.log(`[CCTV] Bootstrap complete: ${windyCams.length} Windy cams loaded`);
    rebuildSnapshot();
    notifyListeners();
  } catch {
    // Allow retry on next overlay toggle
    _bootstrapped = false;
  }
}

// ── Simple external store for selectedCCTV state ────────────
let _selectedCCTV: CCTVData | null = null;
let _selectedListeners: (() => void)[] = [];

export function setSelectedCCTV(cctv: CCTVData | null) {
  _selectedCCTV = cctv;
  _selectedListeners.forEach((fn) => fn());
}

export function getSelectedCCTV() {
  return _selectedCCTV;
}

export function subscribeSelectedCCTV(fn: () => void) {
  _selectedListeners.push(fn);
  return () => {
    _selectedListeners = _selectedListeners.filter((f) => f !== fn);
  };
}

// ── External store for all CCTVs (static + windy) ────────────
let _allCCTVsSnapshot: CCTVData[] = [...STATIC_CCTVS];

function rebuildSnapshot() {
  _allCCTVsSnapshot = [...STATIC_CCTVS, ...windyCams];
}

// Subscribe to windy cam updates
_listeners.push(() => {
  rebuildSnapshot();
});

export function getAllCCTVs(): CCTVData[] {
  return _allCCTVsSnapshot;
}

export function subscribeAllCCTVs(fn: () => void) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((f) => f !== fn);
  };
}

/** Returns just the static list (backwards compat) */
export function fetchCCTVs(): CCTVData[] {
  return _allCCTVsSnapshot;
}

/** Get total count */
export function getCCTVCount(): number {
  return _allCCTVsSnapshot.length;
}
