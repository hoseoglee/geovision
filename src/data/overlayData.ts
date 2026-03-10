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
