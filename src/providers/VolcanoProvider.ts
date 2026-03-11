export interface VolcanoData {
  name: string;
  lat: number;
  lng: number;
  country: string;
  elevation: number;
  status: 'active' | 'dormant';
  lastEruption: string;
}

/** 활화산 20개 정적 데이터 (Smithsonian GVP 기준) */
const VOLCANOES: VolcanoData[] = [
  { name: 'Kilauea', lat: 19.41, lng: -155.29, country: 'US', elevation: 1247, status: 'active', lastEruption: '2023' },
  { name: 'Etna', lat: 37.75, lng: 14.99, country: 'IT', elevation: 3357, status: 'active', lastEruption: '2023' },
  { name: 'Fuji', lat: 35.36, lng: 138.73, country: 'JP', elevation: 3776, status: 'dormant', lastEruption: '1707' },
  { name: 'Vesuvius', lat: 40.82, lng: 14.43, country: 'IT', elevation: 1281, status: 'dormant', lastEruption: '1944' },
  { name: 'Krakatoa', lat: -6.10, lng: 105.42, country: 'ID', elevation: 813, status: 'active', lastEruption: '2023' },
  { name: 'Pinatubo', lat: 15.13, lng: 120.35, country: 'PH', elevation: 1486, status: 'dormant', lastEruption: '1991' },
  { name: 'Merapi', lat: -7.54, lng: 110.45, country: 'ID', elevation: 2968, status: 'active', lastEruption: '2023' },
  { name: 'Eyjafjallajökull', lat: 63.63, lng: -19.62, country: 'IS', elevation: 1651, status: 'dormant', lastEruption: '2010' },
  { name: 'Sakurajima', lat: 31.59, lng: 130.66, country: 'JP', elevation: 1117, status: 'active', lastEruption: '2024' },
  { name: 'Popocatépetl', lat: 19.02, lng: -98.62, country: 'MX', elevation: 5426, status: 'active', lastEruption: '2024' },
  { name: 'Taal', lat: 14.00, lng: 120.99, country: 'PH', elevation: 311, status: 'active', lastEruption: '2022' },
  { name: 'Agung', lat: -8.34, lng: 115.51, country: 'ID', elevation: 3142, status: 'active', lastEruption: '2019' },
  { name: 'Mayon', lat: 13.26, lng: 123.69, country: 'PH', elevation: 2462, status: 'active', lastEruption: '2024' },
  { name: 'Stromboli', lat: 38.79, lng: 15.21, country: 'IT', elevation: 924, status: 'active', lastEruption: '2024' },
  { name: 'Nyiragongo', lat: -1.52, lng: 29.25, country: 'CD', elevation: 3470, status: 'active', lastEruption: '2021' },
  { name: 'Erebus', lat: -77.53, lng: 167.15, country: 'AQ', elevation: 3794, status: 'active', lastEruption: '2024' },
  { name: 'Villarrica', lat: -39.42, lng: -71.93, country: 'CL', elevation: 2860, status: 'active', lastEruption: '2024' },
  { name: 'Cotopaxi', lat: -0.68, lng: -78.44, country: 'EC', elevation: 5897, status: 'active', lastEruption: '2023' },
  { name: 'Semeru', lat: -8.11, lng: 112.92, country: 'ID', elevation: 3676, status: 'active', lastEruption: '2024' },
  { name: 'Sinabung', lat: 3.17, lng: 98.39, country: 'ID', elevation: 2460, status: 'active', lastEruption: '2021' },
];

/**
 * 정적 활화산 데이터 반환
 */
export function fetchVolcanoes(): VolcanoData[] {
  return VOLCANOES;
}
