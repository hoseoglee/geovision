export interface Landmark {
  name: string;
  latitude: number;
  longitude: number;
}

export interface City {
  name: string;
  latitude: number;
  longitude: number;
  landmarks: Landmark[];
}

export const cities: City[] = [
  {
    name: "서울",
    latitude: 37.5665,
    longitude: 126.978,
    landmarks: [
      { name: "경복궁", latitude: 37.5796, longitude: 126.977 },
      { name: "남산타워", latitude: 37.5512, longitude: 126.9882 },
      { name: "롯데월드타워", latitude: 37.5126, longitude: 127.1026 },
    ],
  },
  {
    name: "도쿄",
    latitude: 35.6762,
    longitude: 139.6503,
    landmarks: [
      { name: "도쿄타워", latitude: 35.6586, longitude: 139.7454 },
      { name: "센소지", latitude: 35.7148, longitude: 139.7967 },
      { name: "도쿄 스카이트리", latitude: 35.7101, longitude: 139.8107 },
    ],
  },
  {
    name: "워싱턴 DC",
    latitude: 38.9072,
    longitude: -77.0369,
    landmarks: [
      { name: "백악관", latitude: 38.8977, longitude: -77.0365 },
      { name: "링컨 기념관", latitude: 38.8893, longitude: -77.0502 },
      { name: "워싱턴 기념탑", latitude: 38.8895, longitude: -77.0353 },
    ],
  },
  {
    name: "런던",
    latitude: 51.5074,
    longitude: -0.1278,
    landmarks: [
      { name: "빅 벤", latitude: 51.5007, longitude: -0.1246 },
      { name: "타워 브리지", latitude: 51.5055, longitude: -0.0754 },
      { name: "버킹엄 궁전", latitude: 51.5014, longitude: -0.1419 },
    ],
  },
  {
    name: "두바이",
    latitude: 25.2048,
    longitude: 55.2708,
    landmarks: [
      { name: "부르즈 할리파", latitude: 25.1972, longitude: 55.2744 },
      { name: "팜 주메이라", latitude: 25.1124, longitude: 55.139 },
      { name: "두바이 몰", latitude: 25.1985, longitude: 55.2796 },
    ],
  },
  {
    name: "파리",
    latitude: 48.8566,
    longitude: 2.3522,
    landmarks: [
      { name: "에펠탑", latitude: 48.8584, longitude: 2.2945 },
      { name: "루브르 박물관", latitude: 48.8606, longitude: 2.3376 },
      { name: "개선문", latitude: 48.8738, longitude: 2.295 },
    ],
  },
  {
    name: "뉴욕",
    latitude: 40.7128,
    longitude: -74.006,
    landmarks: [
      { name: "자유의 여신상", latitude: 40.6892, longitude: -74.0445 },
      { name: "엠파이어 스테이트 빌딩", latitude: 40.7484, longitude: -73.9857 },
      { name: "센트럴 파크", latitude: 40.7829, longitude: -73.9654 },
    ],
  },
  {
    name: "시드니",
    latitude: -33.8688,
    longitude: 151.2093,
    landmarks: [
      { name: "시드니 오페라하우스", latitude: -33.8568, longitude: 151.2153 },
      { name: "하버 브리지", latitude: -33.8523, longitude: 151.2108 },
      { name: "본다이 비치", latitude: -33.8908, longitude: 151.2743 },
    ],
  },
  {
    name: "싱가포르",
    latitude: 1.3521,
    longitude: 103.8198,
    landmarks: [
      { name: "마리나 베이 샌즈", latitude: 1.2834, longitude: 103.8607 },
      { name: "머라이언", latitude: 1.2868, longitude: 103.8545 },
      { name: "가든스 바이 더 베이", latitude: 1.2816, longitude: 103.8636 },
    ],
  },
  {
    name: "카이로",
    latitude: 30.0444,
    longitude: 31.2357,
    landmarks: [
      { name: "기자 피라미드", latitude: 29.9792, longitude: 31.1342 },
      { name: "스핑크스", latitude: 29.9753, longitude: 31.1376 },
      { name: "이집트 박물관", latitude: 30.0478, longitude: 31.2336 },
    ],
  },
];
