// CCTV Provider — static dataset of well-known public webcams worldwide
// All embed URLs are real YouTube live streams sourced from worldcams.tv and similar aggregators

export interface CCTVData {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  embedUrl: string; // iframe-embeddable URL
  type: 'traffic' | 'city' | 'port' | 'landmark';
}

const CCTVS: CCTVData[] = [
  // ── New York ──────────────────────────────────────────
  {
    id: 'nyc-times-square',
    name: 'Times Square',
    city: 'New York',
    country: 'US',
    lat: 40.758,
    lng: -73.9855,
    embedUrl: 'https://www.youtube.com/embed/rnXIjl_Rzy4?autoplay=1&mute=1',
    type: 'landmark',
  },
  {
    id: 'nyc-times-square-2',
    name: 'Times Square (Broadway)',
    city: 'New York',
    country: 'US',
    lat: 40.7591,
    lng: -73.9845,
    embedUrl: 'https://www.youtube.com/embed/iiBTWU2FyFo?autoplay=1&mute=1',
    type: 'city',
  },

  // ── Tokyo ─────────────────────────────────────────────
  {
    id: 'tokyo-shibuya',
    name: 'Shibuya Crossing',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6595,
    lng: 139.7004,
    embedUrl: 'https://www.youtube.com/embed/dfVK7ld38Ys?autoplay=1&mute=1',
    type: 'landmark',
  },
  {
    id: 'tokyo-shibuya-2',
    name: 'Shibuya Crossing (Sky)',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6598,
    lng: 139.7007,
    embedUrl: 'https://www.youtube.com/embed/3Q5wZeTuttw?autoplay=1&mute=1',
    type: 'city',
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
  },

  // ── Seoul ─────────────────────────────────────────────
  {
    id: 'seoul-banpo-bridge',
    name: 'Banpo Bridge',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5083,
    lng: 126.9961,
    embedUrl: 'https://www.youtube.com/embed/-JhoMGoAfFc?autoplay=1&mute=1',
    type: 'landmark',
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
  },
  {
    id: 'seoul-city-view',
    name: 'Seoul Skyline',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5665,
    lng: 126.978,
    embedUrl: 'https://www.youtube.com/embed/VBlN0MGqyz4?autoplay=1&mute=1',
    type: 'city',
  },

  // ── Paris ─────────────────────────────────────────────
  {
    id: 'paris-eiffel-tower',
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'FR',
    lat: 48.8584,
    lng: 2.2945,
    embedUrl: 'https://www.youtube.com/embed/OzYp4NRZlwQ?autoplay=1&mute=1',
    type: 'landmark',
  },
  {
    id: 'paris-city-view',
    name: 'Paris City View',
    city: 'Paris',
    country: 'FR',
    lat: 48.8566,
    lng: 2.3522,
    embedUrl: 'https://www.youtube.com/embed/0yRlsbecXWo?autoplay=1&mute=1',
    type: 'city',
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
  },
  {
    id: 'london-west',
    name: 'West London Skyline',
    city: 'London',
    country: 'GB',
    lat: 51.5074,
    lng: -0.1878,
    embedUrl: 'https://www.youtube.com/embed/3K3jSS16qQs?autoplay=1&mute=1',
    type: 'city',
  },

  // ── Dublin ────────────────────────────────────────────
  {
    id: 'dublin-temple-bar',
    name: 'Temple Bar',
    city: 'Dublin',
    country: 'IE',
    lat: 53.3454,
    lng: -6.2634,
    embedUrl: 'https://www.youtube.com/embed/3nyPER2kzqk?autoplay=1&mute=1',
    type: 'landmark',
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
  },
];

// ── Simple external store for selectedCCTV state ────────
let _selectedCCTV: CCTVData | null = null;
let _listeners: (() => void)[] = [];

export function setSelectedCCTV(cctv: CCTVData | null) {
  _selectedCCTV = cctv;
  _listeners.forEach((fn) => fn());
}

export function getSelectedCCTV() {
  return _selectedCCTV;
}

export function subscribeSelectedCCTV(fn: () => void) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((f) => f !== fn);
  };
}

/** Returns the full list of known public CCTVs */
export function fetchCCTVs(): CCTVData[] {
  return CCTVS;
}
