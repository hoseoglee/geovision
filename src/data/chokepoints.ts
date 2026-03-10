/** 전략적 초크포인트/해협 데이터 */
export interface Chokepoint {
  name: string;
  lat: number;
  lng: number;
  type: 'strait' | 'canal' | 'cape' | 'base';
  info: string;
}

export const CHOKEPOINTS: Chokepoint[] = [
  { name: 'Strait of Hormuz', lat: 26.56, lng: 56.25, type: 'strait', info: '21M bbl/day oil transit' },
  { name: 'Strait of Malacca', lat: 2.5, lng: 101.0, type: 'strait', info: '25% global trade route' },
  { name: 'Suez Canal', lat: 30.43, lng: 32.34, type: 'canal', info: '12% global trade' },
  { name: 'Panama Canal', lat: 9.08, lng: -79.68, type: 'canal', info: '5% global trade' },
  { name: 'Bab el-Mandeb', lat: 12.58, lng: 43.33, type: 'strait', info: 'Red Sea chokepoint' },
  { name: 'Bosphorus', lat: 41.12, lng: 29.05, type: 'strait', info: 'Black Sea access' },
  { name: 'Gibraltar', lat: 35.96, lng: -5.35, type: 'strait', info: 'Med–Atlantic gateway' },
  { name: 'Cape of Good Hope', lat: -34.35, lng: 18.47, type: 'cape', info: 'Alt Suez route' },
  { name: 'Taiwan Strait', lat: 24.0, lng: 118.5, type: 'strait', info: 'Strategic flashpoint' },
  { name: 'Danish Straits', lat: 55.7, lng: 12.6, type: 'strait', info: 'Baltic Sea access' },
  { name: 'Lombok Strait', lat: -8.5, lng: 115.7, type: 'strait', info: 'Alt Malacca route' },
  { name: 'Tsugaru Strait', lat: 41.6, lng: 140.8, type: 'strait', info: 'Japan Sea access' },
];
