/** 해저 케이블 주요 경로 */
export interface CablePath {
  name: string;
  color: string;
  points: [number, number][]; // [lng, lat]
}

export const SUBMARINE_CABLES: CablePath[] = [
  { name: 'TAT-14 (Atlantic)', color: '#00BFFF', points: [
    [-73.9, 40.7], [-50, 45], [-30, 48], [-10, 50], [-5.5, 50.4],
  ]},
  { name: 'SEA-ME-WE 3', color: '#FF6B6B', points: [
    [103.8, 1.3], [95, 5], [80, 10], [72, 15], [56, 25], [43, 12.5],
    [35, 30], [32.3, 31.2], [29, 41], [15, 37], [5, 36], [-5.3, 36],
    [-9.1, 38.7],
  ]},
  { name: 'Pacific Crossing (PC-1)', color: '#7B68EE', points: [
    [139.7, 35.7], [155, 40], [170, 42], [-180, 45], [-170, 45],
    [-150, 42], [-130, 38], [-122.4, 37.8],
  ]},
  { name: 'SAFE (S.Africa-Far East)', color: '#FFA500', points: [
    [103.8, 1.3], [90, -5], [75, -10], [55, -15], [40, -25],
    [30, -33], [18.4, -33.9],
  ]},
  { name: 'FLAG Atlantic', color: '#32CD32', points: [
    [-74, 40.7], [-60, 38], [-40, 35], [-20, 33], [-9, 33],
    [-5.3, 36], [3, 37], [10, 36],
  ]},
  { name: 'APCN-2 (Asia Pacific)', color: '#FF69B4', points: [
    [103.8, 1.3], [110, 10], [114, 22.3], [121.5, 25.0],
    [121.5, 31.2], [129.1, 35.1], [139.7, 35.7],
  ]},
  { name: 'SAm-1 (South America)', color: '#20B2AA', points: [
    [-43.2, -22.9], [-38, -12], [-35, -3], [-52, 5],
    [-60, 10], [-67, 10.5], [-80, 9],
  ]},
  { name: 'EASSy (E.Africa)', color: '#DDA0DD', points: [
    [39.3, -6.8], [43, -12], [47, -19], [49.3, -18.1],
    [55.5, -20.3], [57.5, -20.2],
  ]},
];

/** 전 세계 주요 군사 기지 */
export interface MilitaryBase {
  name: string;
  lat: number;
  lng: number;
  country: string;
  type: 'naval' | 'air' | 'army' | 'joint';
}

export const MILITARY_BASES: MilitaryBase[] = [
  { name: 'Norfolk Naval Station', lat: 36.95, lng: -76.33, country: 'US', type: 'naval' },
  { name: 'Ramstein Air Base', lat: 49.44, lng: 7.60, country: 'US', type: 'air' },
  { name: 'Diego Garcia', lat: -7.32, lng: 72.42, country: 'US/UK', type: 'joint' },
  { name: 'Yokosuka Naval Base', lat: 35.28, lng: 139.67, country: 'US', type: 'naval' },
  { name: 'Camp Humphreys', lat: 36.96, lng: 127.03, country: 'US', type: 'army' },
  { name: 'Pearl Harbor', lat: 21.35, lng: -157.97, country: 'US', type: 'naval' },
  { name: 'Guam (Andersen AFB)', lat: 13.58, lng: 144.92, country: 'US', type: 'air' },
  { name: 'Bahrain Naval Support', lat: 26.24, lng: 50.63, country: 'US', type: 'naval' },
  { name: 'Djibouti (Camp Lemmon.)', lat: 11.55, lng: 43.15, country: 'US', type: 'joint' },
  { name: 'Hainan (Yulin)', lat: 18.22, lng: 109.53, country: 'CN', type: 'naval' },
  { name: 'Vladivostok', lat: 43.12, lng: 131.88, country: 'RU', type: 'naval' },
  { name: 'Severomorsk', lat: 69.07, lng: 33.42, country: 'RU', type: 'naval' },
  { name: 'Tartus', lat: 34.89, lng: 35.89, country: 'RU', type: 'naval' },
  { name: 'Changi Naval Base', lat: 1.33, lng: 104.0, country: 'SG', type: 'naval' },
  { name: 'Portsmouth', lat: 50.80, lng: -1.10, country: 'UK', type: 'naval' },
];

/** 원자력 발전소 */
export interface NuclearPlant {
  name: string;
  lat: number;
  lng: number;
  country: string;
  reactors: number;
  status: 'active' | 'decommissioned';
}

export const NUCLEAR_PLANTS: NuclearPlant[] = [
  { name: 'Kashiwazaki-Kariwa', lat: 37.43, lng: 138.60, country: 'JP', reactors: 7, status: 'active' },
  { name: 'Bruce Power', lat: 44.33, lng: -81.60, country: 'CA', reactors: 8, status: 'active' },
  { name: 'Zaporizhzhia', lat: 47.51, lng: 34.58, country: 'UA', reactors: 6, status: 'active' },
  { name: 'Gravelines', lat: 51.01, lng: 2.11, country: 'FR', reactors: 6, status: 'active' },
  { name: 'Hanul', lat: 37.09, lng: 129.38, country: 'KR', reactors: 6, status: 'active' },
  { name: 'Kori/Shin-Kori', lat: 35.32, lng: 129.30, country: 'KR', reactors: 8, status: 'active' },
  { name: 'Fukushima Daiichi', lat: 37.42, lng: 141.03, country: 'JP', reactors: 6, status: 'decommissioned' },
  { name: 'Chernobyl', lat: 51.39, lng: 30.10, country: 'UA', reactors: 4, status: 'decommissioned' },
  { name: 'Palo Verde', lat: 33.39, lng: -112.86, country: 'US', reactors: 3, status: 'active' },
  { name: 'Vogtle', lat: 33.14, lng: -81.76, country: 'US', reactors: 4, status: 'active' },
  { name: 'Taishan', lat: 21.92, lng: 112.98, country: 'CN', reactors: 2, status: 'active' },
  { name: 'Barakah', lat: 23.96, lng: 52.26, country: 'AE', reactors: 4, status: 'active' },
  { name: 'Hinkley Point C', lat: 51.21, lng: -3.13, country: 'UK', reactors: 2, status: 'active' },
];

/** 주요 항구 */
export interface MajorPort {
  name: string;
  lat: number;
  lng: number;
  country: string;
  rank: number; // TEU ranking
}

export const MAJOR_PORTS: MajorPort[] = [
  { name: 'Shanghai', lat: 31.23, lng: 121.47, country: 'CN', rank: 1 },
  { name: 'Singapore', lat: 1.26, lng: 103.84, country: 'SG', rank: 2 },
  { name: 'Ningbo-Zhoushan', lat: 29.87, lng: 121.55, country: 'CN', rank: 3 },
  { name: 'Shenzhen', lat: 22.54, lng: 114.06, country: 'CN', rank: 4 },
  { name: 'Guangzhou', lat: 23.08, lng: 113.32, country: 'CN', rank: 5 },
  { name: 'Busan', lat: 35.10, lng: 129.04, country: 'KR', rank: 6 },
  { name: 'Qingdao', lat: 36.07, lng: 120.38, country: 'CN', rank: 7 },
  { name: 'Hong Kong', lat: 22.29, lng: 114.17, country: 'HK', rank: 8 },
  { name: 'Dubai (Jebel Ali)', lat: 25.00, lng: 55.06, country: 'AE', rank: 9 },
  { name: 'Tianjin', lat: 39.00, lng: 117.73, country: 'CN', rank: 10 },
  { name: 'Rotterdam', lat: 51.95, lng: 4.14, country: 'NL', rank: 11 },
  { name: 'Port Klang', lat: 3.00, lng: 101.39, country: 'MY', rank: 12 },
  { name: 'Antwerp', lat: 51.26, lng: 4.40, country: 'BE', rank: 13 },
  { name: 'Los Angeles', lat: 33.74, lng: -118.27, country: 'US', rank: 14 },
  { name: 'Hamburg', lat: 53.54, lng: 9.97, country: 'DE', rank: 15 },
];

/** 전략 인프라 — 석유/가스 파이프라인 */
export interface Pipeline {
  name: string;
  color: string;
  type: 'oil' | 'gas' | 'lng';
  capacity?: string; // mb/d 또는 bcm/y
  countries: string[];
  points: [number, number][]; // [lng, lat]
}

export const PIPELINES: Pipeline[] = [
  {
    name: 'BTC (Baku–Tbilisi–Ceyhan)',
    color: '#FF8C00',
    type: 'oil',
    capacity: '1.2 mb/d',
    countries: ['AZ', 'GE', 'TR'],
    points: [
      [49.87, 40.41], [46, 41.5], [43, 41.7], [41, 41.7], [38, 40.5],
      [36, 39.5], [35.55, 36.8],
    ],
  },
  {
    name: 'Druzhba (Friendship) Pipeline',
    color: '#DC143C',
    type: 'oil',
    capacity: '1.3 mb/d',
    countries: ['RU', 'BY', 'PL', 'DE', 'CZ', 'SK', 'HU'],
    points: [
      [37, 55], [32, 54], [28, 54.5], [24, 53.5], [20.5, 52.5],
      [18, 52], [15, 51.5], [12.5, 51], [10, 52],
    ],
  },
  {
    name: 'Nord Stream (Baltic)',
    color: '#9400D3',
    type: 'gas',
    capacity: '55 bcm/y',
    countries: ['RU', 'DE'],
    points: [
      [27.9, 59.8], [25, 59], [22, 57.5], [18, 56], [14, 55], [10.9, 54.5],
    ],
  },
  {
    name: 'Trans-Arabian Pipeline (Tapline)',
    color: '#FF4500',
    type: 'oil',
    capacity: '0.5 mb/d',
    countries: ['SA', 'JO', 'SY', 'LB'],
    points: [
      [49.5, 26.3], [47, 28], [45, 29.5], [42, 31], [39, 32],
      [37, 33], [36.5, 33.5], [35.5, 33.9],
    ],
  },
  {
    name: 'Kirkuk–Ceyhan Pipeline',
    color: '#FF6347',
    type: 'oil',
    capacity: '0.8 mb/d',
    countries: ['IQ', 'TR'],
    points: [
      [44.4, 35.5], [42, 36.5], [40, 37], [37, 37.5], [36, 37.5], [35.5, 36.8],
    ],
  },
  {
    name: 'TAPI Pipeline',
    color: '#32CD32',
    type: 'gas',
    capacity: '33 bcm/y',
    countries: ['TM', 'AF', 'PK', 'IN'],
    points: [
      [58.4, 37.9], [62, 36], [65, 35], [66, 34], [68, 31], [70, 30],
      [72, 28], [73, 24],
    ],
  },
  {
    name: 'East Siberia–Pacific Ocean (ESPO)',
    color: '#00CED1',
    type: 'oil',
    capacity: '1.6 mb/d',
    countries: ['RU', 'CN'],
    points: [
      [104, 52], [110, 51], [116, 50], [120, 49], [124, 48],
      [128, 48.5], [132, 48], [133, 46.7],
    ],
  },
  {
    name: 'Trans-Saharan Gas Pipeline',
    color: '#DAA520',
    type: 'gas',
    capacity: '30 bcm/y',
    countries: ['NG', 'NE', 'DZ'],
    points: [
      [3.4, 6.5], [3, 13], [4, 17], [5, 21], [6, 25], [7, 29], [6.7, 36.7],
    ],
  },
  {
    name: 'China–Russia Power of Siberia',
    color: '#FF69B4',
    type: 'gas',
    capacity: '38 bcm/y',
    countries: ['RU', 'CN'],
    points: [
      [128, 50.5], [130, 48], [131, 47], [132, 46], [134, 44],
      [131.5, 42.5],
    ],
  },
  {
    name: 'Saudi Arabia–Iran Offshore (IGAT)',
    color: '#FFA500',
    type: 'gas',
    capacity: '110 mcm/d',
    countries: ['IR', 'TR'],
    points: [
      [53, 32], [50, 34], [47, 36], [44, 37], [42, 38], [40, 39],
      [38, 40], [36.5, 41],
    ],
  },
];

/** 전략 인프라 — 정유소 / LNG 터미널 */
export interface Refinery {
  name: string;
  lat: number;
  lng: number;
  country: string;
  type: 'refinery' | 'lng_terminal' | 'lng_liquefaction';
  capacity?: string; // mb/d 또는 mtpa
}

export const REFINERIES: Refinery[] = [
  // 중동
  { name: 'Ras Tanura Refinery', lat: 26.64, lng: 50.16, country: 'SA', type: 'refinery', capacity: '0.55 mb/d' },
  { name: 'Jubail Industrial City', lat: 27.00, lng: 49.66, country: 'SA', type: 'refinery', capacity: '0.4 mb/d' },
  { name: 'Yanbu Refinery', lat: 24.09, lng: 38.05, country: 'SA', type: 'refinery', capacity: '0.4 mb/d' },
  { name: 'Abadan Refinery', lat: 30.35, lng: 48.29, country: 'IR', type: 'refinery', capacity: '0.42 mb/d' },
  { name: 'Bandar Abbas Refinery', lat: 27.18, lng: 56.27, country: 'IR', type: 'refinery', capacity: '0.32 mb/d' },
  { name: 'Mina Al Ahmadi Refinery', lat: 29.07, lng: 48.12, country: 'KW', type: 'refinery', capacity: '0.47 mb/d' },
  { name: 'Shuaiba Refinery', lat: 29.02, lng: 48.15, country: 'KW', type: 'refinery', capacity: '0.2 mb/d' },
  { name: 'Ruwais Refinery (ADNOC)', lat: 24.09, lng: 52.74, country: 'AE', type: 'refinery', capacity: '0.82 mb/d' },
  { name: 'Baiji Refinery', lat: 34.93, lng: 43.50, country: 'IQ', type: 'refinery', capacity: '0.31 mb/d' },
  { name: 'Basra Refinery', lat: 30.52, lng: 47.82, country: 'IQ', type: 'refinery', capacity: '0.14 mb/d' },
  // 아시아
  { name: 'Jamnagar Refinery (Reliance)', lat: 22.47, lng: 70.07, country: 'IN', type: 'refinery', capacity: '1.24 mb/d' },
  { name: 'Ulsan Refinery (SK)', lat: 35.54, lng: 129.39, country: 'KR', type: 'refinery', capacity: '0.84 mb/d' },
  { name: 'Jurong Island Refinery (ExxonMobil)', lat: 1.26, lng: 103.71, country: 'SG', type: 'refinery', capacity: '0.59 mb/d' },
  { name: 'Zhenhai Refinery (Sinopec)', lat: 29.97, lng: 121.72, country: 'CN', type: 'refinery', capacity: '0.46 mb/d' },
  { name: 'Quanzhou Refinery (CNOOC)', lat: 24.88, lng: 118.67, country: 'CN', type: 'refinery', capacity: '0.24 mb/d' },
  { name: 'Chiba Refinery (Eneos)', lat: 35.49, lng: 140.11, country: 'JP', type: 'refinery', capacity: '0.27 mb/d' },
  { name: 'Mailiao Complex (Formosa)', lat: 23.77, lng: 120.19, country: 'TW', type: 'refinery', capacity: '0.54 mb/d' },
  // 유럽
  { name: 'Rotterdam Refinery (Shell)', lat: 51.88, lng: 4.32, country: 'NL', type: 'refinery', capacity: '0.4 mb/d' },
  { name: 'Antwerp Refinery (TotalEnergies)', lat: 51.25, lng: 4.33, country: 'BE', type: 'refinery', capacity: '0.36 mb/d' },
  { name: 'Pernis Refinery (Shell)', lat: 51.89, lng: 4.39, country: 'NL', type: 'refinery', capacity: '0.4 mb/d' },
  { name: 'Normandy Refinery', lat: 49.49, lng: 0.22, country: 'FR', type: 'refinery', capacity: '0.32 mb/d' },
  { name: 'Priolo Gargallo (ENI)', lat: 37.16, lng: 15.22, country: 'IT', type: 'refinery', capacity: '0.32 mb/d' },
  { name: 'Kirishi Refinery', lat: 59.45, lng: 32.02, country: 'RU', type: 'refinery', capacity: '0.35 mb/d' },
  // 아메리카
  { name: 'Port Arthur Refinery (Motiva)', lat: 29.91, lng: -93.93, country: 'US', type: 'refinery', capacity: '0.63 mb/d' },
  { name: 'Galveston Bay Refinery', lat: 29.72, lng: -94.97, country: 'US', type: 'refinery', capacity: '0.45 mb/d' },
  { name: 'Pemex Salina Cruz', lat: 16.17, lng: -95.18, country: 'MX', type: 'refinery', capacity: '0.17 mb/d' },
  // LNG 터미널
  { name: 'Qatar Ras Laffan LNG', lat: 25.91, lng: 51.55, country: 'QA', type: 'lng_liquefaction', capacity: '77 mtpa' },
  { name: 'Darwin LNG (Australia)', lat: -12.50, lng: 130.55, country: 'AU', type: 'lng_liquefaction', capacity: '3.7 mtpa' },
  { name: 'Sabine Pass LNG', lat: 29.73, lng: -93.85, country: 'US', type: 'lng_liquefaction', capacity: '30 mtpa' },
  { name: 'Freeport LNG', lat: 28.79, lng: -95.31, country: 'US', type: 'lng_liquefaction', capacity: '15 mtpa' },
  { name: 'Bontang LNG (Indonesia)', lat: 0.13, lng: 117.47, country: 'ID', type: 'lng_liquefaction', capacity: '22 mtpa' },
  { name: 'Sakhalin-2 LNG', lat: 48.68, lng: 142.73, country: 'RU', type: 'lng_liquefaction', capacity: '9.6 mtpa' },
  { name: 'Hammerfest LNG (Norway)', lat: 70.74, lng: 23.73, country: 'NO', type: 'lng_liquefaction', capacity: '4.3 mtpa' },
  { name: 'Gate LNG Terminal', lat: 51.95, lng: 4.12, country: 'NL', type: 'lng_terminal', capacity: '12 bcm/y' },
  { name: 'South Hook LNG (UK)', lat: 51.68, lng: -5.04, country: 'GB', type: 'lng_terminal', capacity: '21 mtpa' },
  { name: 'Zeebrugge LNG Terminal', lat: 51.34, lng: 3.20, country: 'BE', type: 'lng_terminal', capacity: '9 bcm/y' },
];

/** 전략 인프라 — 담수화 플랜트 */
export interface DesalinationPlant {
  name: string;
  lat: number;
  lng: number;
  country: string;
  capacity: string; // m³/day
  technology: 'MSF' | 'RO' | 'MED';
}

export const DESALINATION_PLANTS: DesalinationPlant[] = [
  { name: 'Ras Al Khair (Saudi Arabia)', lat: 27.15, lng: 49.10, country: 'SA', capacity: '1,025,000 m³/d', technology: 'MSF' },
  { name: 'Shoaiba 3 (Jeddah)', lat: 21.65, lng: 38.96, country: 'SA', capacity: '880,000 m³/d', technology: 'MSF' },
  { name: 'Yanbu Phase 3', lat: 24.07, lng: 38.00, country: 'SA', capacity: '550,000 m³/d', technology: 'RO' },
  { name: 'Jebel Ali M-Station (Dubai)', lat: 24.98, lng: 55.05, country: 'AE', capacity: '636,000 m³/d', technology: 'MSF' },
  { name: 'Taweelah A1 (Abu Dhabi)', lat: 24.49, lng: 54.64, country: 'AE', capacity: '909,200 m³/d', technology: 'MSF' },
  { name: 'Marafiq (Jubail)', lat: 27.00, lng: 49.66, country: 'SA', capacity: '800,000 m³/d', technology: 'MED' },
  { name: 'Shuqaiq 3 (Red Sea)', lat: 17.75, lng: 41.61, country: 'SA', capacity: '400,000 m³/d', technology: 'RO' },
  { name: 'Sorek 1 (Israel)', lat: 31.91, lng: 34.73, country: 'IL', capacity: '624,000 m³/d', technology: 'RO' },
  { name: 'Ashdod (Israel)', lat: 31.79, lng: 34.63, country: 'IL', capacity: '100,000 m³/d', technology: 'RO' },
  { name: 'Hadera (Israel)', lat: 32.43, lng: 34.87, country: 'IL', capacity: '127,000 m³/d', technology: 'RO' },
  { name: 'Perth SWRO (Australia)', lat: -31.90, lng: 115.75, country: 'AU', capacity: '144,000 m³/d', technology: 'RO' },
  { name: 'Sydney Desalination Plant', lat: -34.09, lng: 151.15, country: 'AU', capacity: '250,000 m³/d', technology: 'RO' },
  { name: 'Carlsbad SWRO (California)', lat: 33.10, lng: -117.31, country: 'US', capacity: '189,000 m³/d', technology: 'RO' },
  { name: 'Singapore NEWater (Changi)', lat: 1.36, lng: 103.99, country: 'SG', capacity: '228,000 m³/d', technology: 'RO' },
  { name: 'Fujairah 2 (UAE)', lat: 25.13, lng: 56.35, country: 'AE', capacity: '591,000 m³/d', technology: 'MSF' },
  { name: 'Kuwait Az-Zour North', lat: 28.80, lng: 47.97, country: 'KW', capacity: '567,000 m³/d', technology: 'MSF' },
  { name: 'Barcelona Llobregat (Spain)', lat: 41.33, lng: 2.05, country: 'ES', capacity: '200,000 m³/d', technology: 'RO' },
  { name: 'Trinidad (Canary Islands)', lat: 28.32, lng: -14.01, country: 'ES', capacity: '50,000 m³/d', technology: 'RO' },
  { name: 'Ashkelon (Israel)', lat: 31.65, lng: 34.54, country: 'IL', capacity: '330,000 m³/d', technology: 'RO' },
  { name: 'Oman Barka 3', lat: 23.69, lng: 57.89, country: 'OM', capacity: '281,000 m³/d', technology: 'RO' },
];

/** 주요 해류 */
export interface OceanCurrent {
  name: string;
  color: string;
  warm: boolean;
  points: [number, number][]; // [lng, lat]
}

export const OCEAN_CURRENTS: OceanCurrent[] = [
  { name: 'Gulf Stream', warm: true, color: '#FF4500', points: [
    [-80, 25], [-78, 30], [-75, 35], [-68, 40], [-55, 45], [-40, 50], [-20, 55],
  ]},
  { name: 'Kuroshio', warm: true, color: '#FF6347', points: [
    [121, 22], [125, 25], [130, 28], [135, 32], [140, 35], [145, 38], [155, 40],
  ]},
  { name: 'Humboldt (Peru)', warm: false, color: '#4169E1', points: [
    [-75, -40], [-74, -35], [-73, -30], [-72, -25], [-73, -20], [-76, -15], [-80, -5],
  ]},
  { name: 'Benguela', warm: false, color: '#1E90FF', points: [
    [15, -35], [13, -30], [11, -25], [10, -20], [9, -15],
  ]},
  { name: 'N. Atlantic Drift', warm: true, color: '#FF8C00', points: [
    [-20, 55], [-10, 58], [0, 62], [10, 65], [20, 70],
  ]},
  { name: 'Antarctic Circumpolar', warm: false, color: '#00CED1', points: [
    [-180, -55], [-120, -58], [-60, -56], [0, -55], [60, -57], [120, -56], [180, -55],
  ]},
  { name: 'Agulhas', warm: true, color: '#DC143C', points: [
    [35, -28], [33, -32], [28, -35], [22, -37], [18, -35],
  ]},
];
