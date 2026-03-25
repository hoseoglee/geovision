import type { CCTVData } from '../providers/CCTVProvider';

/**
 * Public CCTV / Webcam dataset — YouTube live streams
 * All video IDs from worldcams.tv and other sources (2026-03-12, expanded 2026-03-25)
 * 193 cameras (excludes 24 entries already in STATIC_CCTVS in CCTVProvider.ts)
 */

export const PUBLIC_CCTVS: CCTVData[] = [
  // =================================================================
  // NEW YORK (additional cams not in STATIC_CCTVS)
  // =================================================================
  {
    id: 'nyc-times-square-express',
    name: 'Times Square Express View',
    city: 'New York',
    country: 'US',
    lat: 40.7577,
    lng: -73.9857,
    embedUrl: 'https://www.youtube.com/embed/a9J1OP_x5Rg?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'nyc-1560-broadway',
    name: '1560 Broadway View',
    city: 'New York',
    country: 'US',
    lat: 40.7591,
    lng: -73.9852,
    embedUrl: 'https://www.youtube.com/embed/4qyZLflp-sI?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'nyc-1540-broadway',
    name: '1540 Broadway View',
    city: 'New York',
    country: 'US',
    lat: 40.7588,
    lng: -73.9850,
    embedUrl: 'https://www.youtube.com/embed/nVsDt8AvfCU?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'nyc-empire-state',
    name: 'Empire State Building Obs Deck',
    city: 'New York',
    country: 'US',
    lat: 40.7484,
    lng: -73.9857,
    embedUrl: 'https://www.youtube.com/embed/TdGXlEOxuOw?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'nyc-multicam',
    name: 'NYC Multicam',
    city: 'New York',
    country: 'US',
    lat: 40.7128,
    lng: -74.0060,
    embedUrl: 'https://www.youtube.com/embed/VGnFLdQW39A?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'nyc-skyline',
    name: 'NYC Skyline',
    city: 'New York',
    country: 'US',
    lat: 40.7484,
    lng: -73.9670,
    embedUrl: 'https://www.youtube.com/embed/DTgYVa-W2O8?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'nyc-lower-manhattan',
    name: 'Lower Manhattan',
    city: 'New York',
    country: 'US',
    lat: 40.7075,
    lng: -74.0021,
    embedUrl: 'https://www.youtube.com/embed/KuzVYn1Ucbg?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // SEOUL (additional cams not in STATIC_CCTVS)
  // =================================================================
  {
    id: 'seoul-gwanghwamun',
    name: 'Gwanghwamun Boulevard',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5717,
    lng: 126.9770,
    embedUrl: 'https://www.youtube.com/embed/b-nJ9MZ3vNk?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'seoul-seokchon-lake',
    name: 'Seokchon Lake',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5079,
    lng: 127.1000,
    embedUrl: 'https://www.youtube.com/embed/UYziFFSzzMo?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'seoul-mapo-bridge',
    name: 'Mapo Bridge',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5390,
    lng: 126.9440,
    embedUrl: 'https://www.youtube.com/embed/hWyByX9fY2g?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'seoul-jamsil-bridge',
    name: 'Jamsil Bridge',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5180,
    lng: 127.0850,
    embedUrl: 'https://www.youtube.com/embed/ZopiySgQjsc?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'seoul-dongdaemun-ddp',
    name: 'Dongdaemun DDP',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5670,
    lng: 127.0095,
    embedUrl: 'https://www.youtube.com/embed/TbHWvdCkMPQ?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'seoul-hongdae',
    name: 'Hongdae Entrance',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5570,
    lng: 126.9240,
    embedUrl: 'https://www.youtube.com/embed/ee6MgrC6O8U?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'seoul-n-tower',
    name: 'N Seoul Tower',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5512,
    lng: 126.9882,
    embedUrl: 'https://www.youtube.com/embed/eKlMI70C53U?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'seoul-hangang-river',
    name: 'Hangang River',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5269,
    lng: 126.9340,
    embedUrl: 'https://www.youtube.com/embed/TSCWytmnnLI?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'seoul-namsan-view',
    name: 'Namsan View',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5514,
    lng: 126.9910,
    embedUrl: 'https://www.youtube.com/embed/J_vNwxaOtTs?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'seoul-gyeongbokgung-2',
    name: 'Gyeongbokgung 2',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5790,
    lng: 126.9770,
    embedUrl: 'https://www.youtube.com/embed/EPrqF0HOi9o?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'seoul-hangang-segang',
    name: 'Hangang Segang Bridge',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5355,
    lng: 126.9250,
    embedUrl: 'https://www.youtube.com/embed/_gmTN6ssF7I?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'seoul-gwanak-gu',
    name: 'Gwanak-gu',
    city: 'Seoul',
    country: 'KR',
    lat: 37.4780,
    lng: 126.9518,
    embedUrl: 'https://www.youtube.com/embed/9Tk248Er7pk?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // BUSAN
  // =================================================================
  {
    id: 'busan-haeundae-1',
    name: 'Haeundae Beach',
    city: 'Busan',
    country: 'KR',
    lat: 35.1587,
    lng: 129.1604,
    embedUrl: 'https://www.youtube.com/embed/2ddvxTpmKR4?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'busan-haeundae-2',
    name: 'Haeundae Beach 2',
    city: 'Busan',
    country: 'KR',
    lat: 35.1585,
    lng: 129.1610,
    embedUrl: 'https://www.youtube.com/embed/uHdl_9hsHqw?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'busan-gwangandaegyo-1',
    name: 'Gwangandaegyo Bridge',
    city: 'Busan',
    country: 'KR',
    lat: 35.1344,
    lng: 129.1187,
    embedUrl: 'https://www.youtube.com/embed/8Gl34_bZ3t8?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'busan-gwangandaegyo-2',
    name: 'Gwangandaegyo Bridge 2',
    city: 'Busan',
    country: 'KR',
    lat: 35.1340,
    lng: 129.1190,
    embedUrl: 'https://www.youtube.com/embed/GXvW-dvTbL8?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'busan-gwangandaegyo-3',
    name: 'Gwangandaegyo Bridge 3',
    city: 'Busan',
    country: 'KR',
    lat: 35.1350,
    lng: 129.1180,
    embedUrl: 'https://www.youtube.com/embed/OhXqC3pDBaU?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'busan-gwangandaegyo-4',
    name: 'Gwangandaegyo Bridge 4',
    city: 'Busan',
    country: 'KR',
    lat: 35.1348,
    lng: 129.1175,
    embedUrl: 'https://www.youtube.com/embed/fWAYIe5-C4o?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'busan-daeyeon-campus',
    name: 'Daeyeon Campus',
    city: 'Busan',
    country: 'KR',
    lat: 35.1370,
    lng: 129.1000,
    embedUrl: 'https://www.youtube.com/embed/LLx2dRw-lKM?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },

  // =================================================================
  // TOKYO - SHIBUYA (additional)
  // =================================================================
  {
    id: 'tokyo-shibuya-crossing-2',
    name: 'Shibuya Crossing Cam 2',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6590,
    lng: 139.7005,
    embedUrl: 'https://www.youtube.com/embed/8H3nRCFVR6Y?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // TOKYO - KABUKICHO (additional)
  // =================================================================
  {
    id: 'tokyo-kabukicho-3',
    name: 'Kabukicho Cam 3',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6935,
    lng: 139.7030,
    embedUrl: 'https://www.youtube.com/embed/ErHJBXTmm2Q?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // TOKYO - HANEDA AIRPORT
  // =================================================================
  {
    id: 'tokyo-haneda-terminal2',
    name: 'Haneda Terminal 2',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.5494,
    lng: 139.7798,
    embedUrl: 'https://www.youtube.com/embed/A0FCKcTuRHo?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },
  {
    id: 'tokyo-haneda-runway',
    name: 'Haneda Runway',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.5520,
    lng: 139.7830,
    embedUrl: 'https://www.youtube.com/embed/2PIdi3Xa7TY?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },
  {
    id: 'tokyo-haneda-3',
    name: 'Haneda Airport 3',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.5500,
    lng: 139.7810,
    embedUrl: 'https://www.youtube.com/embed/LZlHg3vzwe0?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },
  {
    id: 'tokyo-haneda-4',
    name: 'Haneda Airport 4',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.5510,
    lng: 139.7800,
    embedUrl: 'https://www.youtube.com/embed/2f9NOSw-FqM?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },
  {
    id: 'tokyo-haneda-5',
    name: 'Haneda Airport 5',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.5505,
    lng: 139.7815,
    embedUrl: 'https://www.youtube.com/embed/0ytmbJ6mn70?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },
  {
    id: 'tokyo-haneda-6',
    name: 'Haneda Airport 6',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.5515,
    lng: 139.7825,
    embedUrl: 'https://www.youtube.com/embed/WN4XpAU6lu0?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },

  // =================================================================
  // TOKYO - RAINBOW BRIDGE
  // =================================================================
  {
    id: 'tokyo-rainbow-bridge-1',
    name: 'Rainbow Bridge Cam 1',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6368,
    lng: 139.7636,
    embedUrl: 'https://www.youtube.com/embed/KR7qSzE1j_w?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'tokyo-rainbow-bridge-2',
    name: 'Rainbow Bridge Cam 2',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6370,
    lng: 139.7640,
    embedUrl: 'https://www.youtube.com/embed/fGOCRGXPgRY?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'tokyo-rainbow-bridge-3',
    name: 'Rainbow Bridge Cam 3',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6365,
    lng: 139.7632,
    embedUrl: 'https://www.youtube.com/embed/QE9NWdINg08?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // TOKYO - TOWER PANORAMA
  // =================================================================
  {
    id: 'tokyo-shimbashi',
    name: 'Shimbashi View',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6656,
    lng: 139.7578,
    embedUrl: 'https://www.youtube.com/embed/VM18f-IIUTw?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-sunset',
    name: 'Tokyo Sunset',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6586,
    lng: 139.7454,
    embedUrl: 'https://www.youtube.com/embed/p37X_4sf5h4?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-tower-closeup',
    name: 'Tower Closeup',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6586,
    lng: 139.7455,
    embedUrl: 'https://www.youtube.com/embed/nu6NE55_X7A?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // TOKYO - CITY VIEWS
  // =================================================================
  {
    id: 'tokyo-city-view-1',
    name: 'Tokyo City View 1',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6894,
    lng: 139.6917,
    embedUrl: 'https://www.youtube.com/embed/1Xm5bjdI5hU?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-city-view-2',
    name: 'Tokyo City View 2',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6897,
    lng: 139.6920,
    embedUrl: 'https://www.youtube.com/embed/Zhmmh7l6KEw?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-city-view-3',
    name: 'Tokyo City View 3',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6896,
    lng: 139.7008,
    embedUrl: 'https://www.youtube.com/embed/6dp-bvQ7RWo?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-city-view-4',
    name: 'Tokyo City View 4',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6800,
    lng: 139.7000,
    embedUrl: 'https://www.youtube.com/embed/lA6TaaMGgDo?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-city-view-5',
    name: 'Tokyo City View 5',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6900,
    lng: 139.7600,
    embedUrl: 'https://www.youtube.com/embed/urE7veQRlrQ?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-city-view-6',
    name: 'Tokyo City View 6',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6850,
    lng: 139.7500,
    embedUrl: 'https://www.youtube.com/embed/MwcMURMzJ7A?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-ginza',
    name: 'Tokyo Ginza',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6712,
    lng: 139.7649,
    embedUrl: 'https://www.youtube.com/embed/nvjYhbiznNk?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-shinjuku',
    name: 'Tokyo Shinjuku',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6896,
    lng: 139.6922,
    embedUrl: 'https://www.youtube.com/embed/Okc4okfC45E?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-asakusa',
    name: 'Tokyo Asakusa',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.7148,
    lng: 139.7967,
    embedUrl: 'https://www.youtube.com/embed/Zq-D5z2n0EY?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'tokyo-akihabara',
    name: 'Tokyo Akihabara',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6998,
    lng: 139.7714,
    embedUrl: 'https://www.youtube.com/embed/3KZ20aH_Oq4?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-view-11',
    name: 'Tokyo View 11',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6751,
    lng: 139.7630,
    embedUrl: 'https://www.youtube.com/embed/Ml0_q9_s_xY?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'tokyo-view-12',
    name: 'Tokyo View 12',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6816,
    lng: 139.7660,
    embedUrl: 'https://www.youtube.com/embed/ktds5GPgu6Q?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // TOKYO - BAY
  // =================================================================
  {
    id: 'tokyo-bay-1',
    name: 'Tokyo Bay Cam 1',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6200,
    lng: 139.7700,
    embedUrl: 'https://www.youtube.com/embed/zPfCPHQZvpw?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },
  {
    id: 'tokyo-bay-2',
    name: 'Tokyo Bay Cam 2',
    city: 'Tokyo',
    country: 'JP',
    lat: 35.6210,
    lng: 139.7710,
    embedUrl: 'https://www.youtube.com/embed/RIEliWw2WG4?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // OSAKA (additional cams not in STATIC_CCTVS)
  // =================================================================
  {
    id: 'osaka-nipponbashi',
    name: 'Nipponbashi',
    city: 'Osaka',
    country: 'JP',
    lat: 34.6600,
    lng: 135.5058,
    embedUrl: 'https://www.youtube.com/embed/oG3XilZ2xQ8?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'osaka-shinsaibashi',
    name: 'Shinsaibashi',
    city: 'Osaka',
    country: 'JP',
    lat: 34.6750,
    lng: 135.5020,
    embedUrl: 'https://www.youtube.com/embed/YZMZSqz9fx8?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'osaka-view-5',
    name: 'Osaka View 5',
    city: 'Osaka',
    country: 'JP',
    lat: 34.6850,
    lng: 135.5070,
    embedUrl: 'https://www.youtube.com/embed/aVAO2wSUsPo?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'osaka-koreatown',
    name: 'Osaka Koreatown',
    city: 'Osaka',
    country: 'JP',
    lat: 34.6650,
    lng: 135.5230,
    embedUrl: 'https://www.youtube.com/embed/lKZqryb7Nno?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // OSAKA AIRPORT (Itami)
  // =================================================================
  {
    id: 'itami-airport-32l',
    name: 'Itami Airport Runway 32L',
    city: 'Osaka',
    country: 'JP',
    lat: 34.7855,
    lng: 135.4385,
    embedUrl: 'https://www.youtube.com/embed/qwKh-LOkomQ?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },
  {
    id: 'itami-airport-2',
    name: 'Itami Airport 2',
    city: 'Osaka',
    country: 'JP',
    lat: 34.7850,
    lng: 135.4390,
    embedUrl: 'https://www.youtube.com/embed/054NeKG4LBg?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },
  {
    id: 'itami-airport-3',
    name: 'Itami Airport 3',
    city: 'Osaka',
    country: 'JP',
    lat: 34.7860,
    lng: 135.4380,
    embedUrl: 'https://www.youtube.com/embed/T2TQocGHH5A?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },
  {
    id: 'itami-airport-4',
    name: 'Itami Airport 4',
    city: 'Osaka',
    country: 'JP',
    lat: 34.7858,
    lng: 135.4395,
    embedUrl: 'https://www.youtube.com/embed/ybJpRrthdNM?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },
  {
    id: 'itami-airport-5',
    name: 'Itami Airport 5',
    city: 'Osaka',
    country: 'JP',
    lat: 34.7852,
    lng: 135.4388,
    embedUrl: 'https://www.youtube.com/embed/227EXwqbOVc?autoplay=1&mute=1',
    type: 'traffic',
    source: 'static',
  },

  // =================================================================
  // JAPAN - SAKURA LIVE CAMS
  // =================================================================
  {
    id: 'jp-sapporo',
    name: 'Hokkaido Sapporo',
    city: 'Sapporo',
    country: 'JP',
    lat: 43.0621,
    lng: 141.3544,
    embedUrl: 'https://www.youtube.com/embed/O7aL3u5n1gQ?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'jp-osaka-panorama',
    name: 'Osaka Panorama',
    city: 'Osaka',
    country: 'JP',
    lat: 34.6900,
    lng: 135.5020,
    embedUrl: 'https://www.youtube.com/embed/Nbs_WkWTD7M?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'jp-kyoto-view',
    name: 'Kyoto View',
    city: 'Kyoto',
    country: 'JP',
    lat: 35.0116,
    lng: 135.7681,
    embedUrl: 'https://www.youtube.com/embed/wuC8wRvXock?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'jp-okinawa',
    name: 'Okinawa',
    city: 'Okinawa',
    country: 'JP',
    lat: 26.3358,
    lng: 127.8011,
    embedUrl: 'https://www.youtube.com/embed/Zhfodg0io7M?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },
  {
    id: 'jp-mt-fuji',
    name: 'Mt. Fuji',
    city: 'Fujinomiya',
    country: 'JP',
    lat: 35.3606,
    lng: 138.7274,
    embedUrl: 'https://www.youtube.com/embed/Sv9hcJ3k5h4?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // HONG KONG (additional cams not in STATIC_CCTVS)
  // =================================================================
  {
    id: 'hk-causeway-bay',
    name: 'Causeway Bay',
    city: 'Hong Kong',
    country: 'CN',
    lat: 22.2800,
    lng: 114.1830,
    embedUrl: 'https://www.youtube.com/embed/qAUi2BOPQ1M?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'hk-sai-wan',
    name: 'Sai Wan',
    city: 'Hong Kong',
    country: 'CN',
    lat: 22.2860,
    lng: 114.1410,
    embedUrl: 'https://www.youtube.com/embed/Myy_iKyFGSY?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // LAS VEGAS (additional)
  // =================================================================
  {
    id: 'vegas-strip-3',
    name: 'The Strip Cam 3',
    city: 'Las Vegas',
    country: 'US',
    lat: 36.1100,
    lng: -115.1730,
    embedUrl: 'https://www.youtube.com/embed/0rpYZOxK34M?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // KEY WEST
  // =================================================================
  {
    id: 'keywest-hogs-breath-1',
    name: "Hog's Breath Saloon 1",
    city: 'Key West',
    country: 'US',
    lat: 24.5570,
    lng: -81.8040,
    embedUrl: 'https://www.youtube.com/embed/S605ycm0Vlk?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },
  {
    id: 'keywest-hogs-breath-2',
    name: "Hog's Breath Saloon 2",
    city: 'Key West',
    country: 'US',
    lat: 24.5572,
    lng: -81.8038,
    embedUrl: 'https://www.youtube.com/embed/_eE4GBEjjs4?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },
  {
    id: 'keywest-hogs-breath-3',
    name: "Hog's Breath Saloon 3",
    city: 'Key West',
    country: 'US',
    lat: 24.5568,
    lng: -81.8042,
    embedUrl: 'https://www.youtube.com/embed/thzfsD7VDFg?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },
  {
    id: 'keywest-sloppy-joes-1',
    name: "Sloppy Joe's Bar",
    city: 'Key West',
    country: 'US',
    lat: 24.5585,
    lng: -81.8010,
    embedUrl: 'https://www.youtube.com/embed/rbMK4p6zUwI?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },
  {
    id: 'keywest-sloppy-joes-2',
    name: "Sloppy Joe's Bar View",
    city: 'Key West',
    country: 'US',
    lat: 24.5583,
    lng: -81.8012,
    embedUrl: 'https://www.youtube.com/embed/yNpciG0zc1Q?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },

  // =================================================================
  // VENICE BEACH (LA)
  // =================================================================
  {
    id: 'venice-beach-1',
    name: 'Venice Beach Cam 1',
    city: 'Los Angeles',
    country: 'US',
    lat: 33.9850,
    lng: -118.4695,
    embedUrl: 'https://www.youtube.com/embed/EO_1LWqsCNE?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },
  {
    id: 'venice-beach-2',
    name: 'Venice Beach Cam 2',
    city: 'Los Angeles',
    country: 'US',
    lat: 33.9852,
    lng: -118.4690,
    embedUrl: 'https://www.youtube.com/embed/98jOtUeM3m8?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },
  {
    id: 'venice-beach-3',
    name: 'Venice Beach Cam 3',
    city: 'Los Angeles',
    country: 'US',
    lat: 33.9848,
    lng: -118.4698,
    embedUrl: 'https://www.youtube.com/embed/D33ZD6sRvnA?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },

  // =================================================================
  // RIO DE JANEIRO (additional cams not in STATIC_CCTVS)
  // =================================================================
  {
    id: 'rio-copacabana-2',
    name: 'Copacabana Cam 2',
    city: 'Rio de Janeiro',
    country: 'BR',
    lat: -22.9715,
    lng: -43.1820,
    embedUrl: 'https://www.youtube.com/embed/c8uRp-57pc0?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'rio-christ-redeemer-2',
    name: 'Christ Redeemer 2',
    city: 'Rio de Janeiro',
    country: 'BR',
    lat: -22.9520,
    lng: -43.2100,
    embedUrl: 'https://www.youtube.com/embed/d6LMwptYVSI?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // PORT OF ITAJAI (Brazil)
  // =================================================================
  {
    id: 'itajai-port-1',
    name: 'Port of Itajai 1',
    city: 'Itajai',
    country: 'BR',
    lat: -26.9078,
    lng: -48.6619,
    embedUrl: 'https://www.youtube.com/embed/3fPqRlwtSHM?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },
  {
    id: 'itajai-port-2',
    name: 'Port of Itajai 2',
    city: 'Itajai',
    country: 'BR',
    lat: -26.9080,
    lng: -48.6615,
    embedUrl: 'https://www.youtube.com/embed/DPX04x-cGvw?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // MIAMI (additional cams not in STATIC_CCTVS)
  // =================================================================
  {
    id: 'miami-port-3',
    name: 'Port of Miami 3',
    city: 'Miami',
    country: 'US',
    lat: 25.7740,
    lng: -80.1690,
    embedUrl: 'https://www.youtube.com/embed/3qH-qNoh4Ho?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },
  {
    id: 'miami-port-4',
    name: 'Port of Miami 4',
    city: 'Miami',
    country: 'US',
    lat: 25.7735,
    lng: -80.1685,
    embedUrl: 'https://www.youtube.com/embed/DxZziUUr6CY?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // SYDNEY
  // =================================================================
  {
    id: 'sydney-harbour-1',
    name: 'Sydney Harbour 1',
    city: 'Sydney',
    country: 'AU',
    lat: -33.8568,
    lng: 151.2153,
    embedUrl: 'https://www.youtube.com/embed/5uZa3-RMFos?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },
  {
    id: 'sydney-harbour-2',
    name: 'Sydney Harbour 2',
    city: 'Sydney',
    country: 'AU',
    lat: -33.8570,
    lng: 151.2150,
    embedUrl: 'https://www.youtube.com/embed/jshwkG1ZpP8?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },
  {
    id: 'sydney-harbour-3',
    name: 'Sydney Harbour 3',
    city: 'Sydney',
    country: 'AU',
    lat: -33.8565,
    lng: 151.2155,
    embedUrl: 'https://www.youtube.com/embed/7pcL-0Wo77U?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // BANGKOK
  // =================================================================
  {
    id: 'bangkok-sukhumvit-1',
    name: 'Sukhumvit Cam 1',
    city: 'Bangkok',
    country: 'TH',
    lat: 13.7375,
    lng: 100.5600,
    embedUrl: 'https://www.youtube.com/embed/UemFRPrl1hk?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'bangkok-sukhumvit-2',
    name: 'Sukhumvit Cam 2',
    city: 'Bangkok',
    country: 'TH',
    lat: 13.7380,
    lng: 100.5605,
    embedUrl: 'https://www.youtube.com/embed/Q71sLS8h9a4?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // PATTAYA
  // =================================================================
  {
    id: 'pattaya-city-1',
    name: 'Pattaya City 1',
    city: 'Pattaya',
    country: 'TH',
    lat: 12.9236,
    lng: 100.8825,
    embedUrl: 'https://www.youtube.com/embed/yYFSzdW0N1Q?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },
  {
    id: 'pattaya-city-2',
    name: 'Pattaya City 2',
    city: 'Pattaya',
    country: 'TH',
    lat: 12.9240,
    lng: 100.8830,
    embedUrl: 'https://www.youtube.com/embed/JpVkgmkVyRg?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },
  {
    id: 'pattaya-city-3',
    name: 'Pattaya City 3',
    city: 'Pattaya',
    country: 'TH',
    lat: 12.9245,
    lng: 100.8820,
    embedUrl: 'https://www.youtube.com/embed/gGK2pV5IF6c?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // JEJU, KOREA
  // =================================================================
  {
    id: 'jeju-beach-1',
    name: 'Jeju Island Beach View',
    city: 'Jeju',
    country: 'KR',
    lat: 33.4996,
    lng: 126.5312,
    embedUrl: 'https://www.youtube.com/embed/lMRgMgxgJFE?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // INCHEON, KOREA
  // =================================================================
  {
    id: 'incheon-airport-1',
    name: 'Incheon International Airport',
    city: 'Incheon',
    country: 'KR',
    lat: 37.4602,
    lng: 126.4407,
    embedUrl: 'https://www.youtube.com/embed/0MIbp3GXASM?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // GANGNAM, KOREA
  // =================================================================
  {
    id: 'gangnam-street-2',
    name: 'Gangnam District Street',
    city: 'Seoul',
    country: 'KR',
    lat: 37.5172,
    lng: 127.0473,
    embedUrl: 'https://www.youtube.com/embed/fA7mLxCGMB8?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // HAEUNDAE BEACH, KOREA
  // =================================================================
  {
    id: 'haeundae-beach-1',
    name: 'Haeundae Beach Live',
    city: 'Busan',
    country: 'KR',
    lat: 35.1588,
    lng: 129.1603,
    embedUrl: 'https://www.youtube.com/embed/C6lGMSuRfMI?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // GYEONGJU, KOREA
  // =================================================================
  {
    id: 'gyeongju-historic-1',
    name: 'Gyeongju Historic District',
    city: 'Gyeongju',
    country: 'KR',
    lat: 35.8562,
    lng: 129.2247,
    embedUrl: 'https://www.youtube.com/embed/KcwNMNmmq8Y?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // KYOTO, JAPAN
  // =================================================================
  {
    id: 'kyoto-temple-1',
    name: 'Kyoto Temple District',
    city: 'Kyoto',
    country: 'JP',
    lat: 35.0116,
    lng: 135.7681,
    embedUrl: 'https://www.youtube.com/embed/sywGa_KSDC8?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // SAPPORO, JAPAN
  // =================================================================
  {
    id: 'sapporo-city-1',
    name: 'Sapporo City Center',
    city: 'Sapporo',
    country: 'JP',
    lat: 43.0618,
    lng: 141.3545,
    embedUrl: 'https://www.youtube.com/embed/pKopwmu0PQI?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // FUKUOKA, JAPAN
  // =================================================================
  {
    id: 'fukuoka-city-1',
    name: 'Fukuoka City Live',
    city: 'Fukuoka',
    country: 'JP',
    lat: 33.5904,
    lng: 130.4017,
    embedUrl: 'https://www.youtube.com/embed/bJi0PBpP9BY?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // HIROSHIMA, JAPAN
  // =================================================================
  {
    id: 'hiroshima-peace-1',
    name: 'Hiroshima Peace Memorial',
    city: 'Hiroshima',
    country: 'JP',
    lat: 34.3853,
    lng: 132.4553,
    embedUrl: 'https://www.youtube.com/embed/TpB9nECTbrA?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // NAGOYA, JAPAN
  // =================================================================
  {
    id: 'nagoya-station-1',
    name: 'Nagoya Station Area',
    city: 'Nagoya',
    country: 'JP',
    lat: 35.1709,
    lng: 136.8815,
    embedUrl: 'https://www.youtube.com/embed/j7NjIPBnNaw?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // OKINAWA, JAPAN
  // =================================================================
  {
    id: 'okinawa-beach-1',
    name: 'Okinawa Tropical Beach',
    city: 'Naha',
    country: 'JP',
    lat: 26.2124,
    lng: 127.6809,
    embedUrl: 'https://www.youtube.com/embed/Cr4xQFZGozM?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // YOKOHAMA, JAPAN
  // =================================================================
  {
    id: 'yokohama-port-1',
    name: 'Yokohama Port & Bay',
    city: 'Yokohama',
    country: 'JP',
    lat: 35.4437,
    lng: 139.6380,
    embedUrl: 'https://www.youtube.com/embed/3MteSlpxCpo?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // KOBE, JAPAN
  // =================================================================
  {
    id: 'kobe-harbor-1',
    name: 'Kobe Harbor View',
    city: 'Kobe',
    country: 'JP',
    lat: 34.6901,
    lng: 135.1956,
    embedUrl: 'https://www.youtube.com/embed/g4lBhSLJQgE?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // HO CHI MINH CITY, VIETNAM
  // =================================================================
  {
    id: 'hcmc-city-1',
    name: 'Ho Chi Minh City Center',
    city: 'Ho Chi Minh City',
    country: 'VN',
    lat: 10.8231,
    lng: 106.6297,
    embedUrl: 'https://www.youtube.com/embed/IqCmxlZl-WA?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // HANOI, VIETNAM
  // =================================================================
  {
    id: 'hanoi-lake-1',
    name: 'Hanoi Hoan Kiem Lake',
    city: 'Hanoi',
    country: 'VN',
    lat: 21.0285,
    lng: 105.8542,
    embedUrl: 'https://www.youtube.com/embed/OJ9pxFnVAXI?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // SINGAPORE
  // =================================================================
  {
    id: 'singapore-bay-1',
    name: 'Singapore Marina Bay Sands',
    city: 'Singapore',
    country: 'SG',
    lat: 1.2834,
    lng: 103.8607,
    embedUrl: 'https://www.youtube.com/embed/mO4JZzJrZwA?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // KUALA LUMPUR, MALAYSIA
  // =================================================================
  {
    id: 'kl-towers-1',
    name: 'Kuala Lumpur Petronas Towers',
    city: 'Kuala Lumpur',
    country: 'MY',
    lat: 3.1579,
    lng: 101.7123,
    embedUrl: 'https://www.youtube.com/embed/vr2ZVHbgHdU?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // JAKARTA, INDONESIA
  // =================================================================
  {
    id: 'jakarta-city-1',
    name: 'Jakarta City Center',
    city: 'Jakarta',
    country: 'ID',
    lat: -6.2088,
    lng: 106.8456,
    embedUrl: 'https://www.youtube.com/embed/qPNDx8EvQIM?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // MANILA, PHILIPPINES
  // =================================================================
  {
    id: 'manila-bay-1',
    name: 'Manila Bay Sunset View',
    city: 'Manila',
    country: 'PH',
    lat: 14.5995,
    lng: 120.9842,
    embedUrl: 'https://www.youtube.com/embed/njFgA2YWDPA?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // BALI, INDONESIA
  // =================================================================
  {
    id: 'bali-beach-1',
    name: 'Bali Kuta Beach',
    city: 'Denpasar',
    country: 'ID',
    lat: -8.7195,
    lng: 115.1686,
    embedUrl: 'https://www.youtube.com/embed/8GkBqFP0c8k?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // CEBU, PHILIPPINES
  // =================================================================
  {
    id: 'cebu-city-1',
    name: 'Cebu City Live View',
    city: 'Cebu',
    country: 'PH',
    lat: 10.3157,
    lng: 123.8854,
    embedUrl: 'https://www.youtube.com/embed/aFyHVRkBDt8?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // PHNOM PENH, CAMBODIA
  // =================================================================
  {
    id: 'phnompenh-river-1',
    name: 'Phnom Penh Riverside',
    city: 'Phnom Penh',
    country: 'KH',
    lat: 11.5564,
    lng: 104.9282,
    embedUrl: 'https://www.youtube.com/embed/vqPHW1HZPB0?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // VIENTIANE, LAOS
  // =================================================================
  {
    id: 'vientiane-city-1',
    name: 'Vientiane City Center',
    city: 'Vientiane',
    country: 'LA',
    lat: 17.9757,
    lng: 102.6331,
    embedUrl: 'https://www.youtube.com/embed/oFnEzK57TB4?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // YANGON, MYANMAR
  // =================================================================
  {
    id: 'yangon-pagoda-1',
    name: 'Yangon Shwedagon Pagoda',
    city: 'Yangon',
    country: 'MM',
    lat: 16.7982,
    lng: 96.1497,
    embedUrl: 'https://www.youtube.com/embed/ZXq3qnHJCiM?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // CHIANG MAI, THAILAND
  // =================================================================
  {
    id: 'chiangmai-oldcity-1',
    name: 'Chiang Mai Old City',
    city: 'Chiang Mai',
    country: 'TH',
    lat: 18.7883,
    lng: 98.9853,
    embedUrl: 'https://www.youtube.com/embed/9yMFZwdnvGk?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // MUMBAI, INDIA
  // =================================================================
  {
    id: 'mumbai-gateway-1',
    name: 'Mumbai Gateway of India',
    city: 'Mumbai',
    country: 'IN',
    lat: 18.9220,
    lng: 72.8347,
    embedUrl: 'https://www.youtube.com/embed/bPy5O5Hk2Z8?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // DELHI, INDIA
  // =================================================================
  {
    id: 'delhi-redfort-1',
    name: 'Delhi Red Fort Area',
    city: 'New Delhi',
    country: 'IN',
    lat: 28.6562,
    lng: 77.2410,
    embedUrl: 'https://www.youtube.com/embed/rTXpBm5Cd-M?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // VARANASI, INDIA
  // =================================================================
  {
    id: 'varanasi-ganges-1',
    name: 'Varanasi Ganges River Ghats',
    city: 'Varanasi',
    country: 'IN',
    lat: 25.3176,
    lng: 82.9739,
    embedUrl: 'https://www.youtube.com/embed/vRo-G5gBjlU?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // COLOMBO, SRI LANKA
  // =================================================================
  {
    id: 'colombo-port-1',
    name: 'Colombo Port City',
    city: 'Colombo',
    country: 'LK',
    lat: 6.9271,
    lng: 79.8612,
    embedUrl: 'https://www.youtube.com/embed/HDhwkE4cGBE?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // KATHMANDU, NEPAL
  // =================================================================
  {
    id: 'kathmandu-durbar-1',
    name: 'Kathmandu Durbar Square',
    city: 'Kathmandu',
    country: 'NP',
    lat: 27.7041,
    lng: 85.3145,
    embedUrl: 'https://www.youtube.com/embed/KNtzIqYYFlA?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // SHANGHAI, CHINA
  // =================================================================
  {
    id: 'shanghai-bund-1',
    name: 'Shanghai The Bund',
    city: 'Shanghai',
    country: 'CN',
    lat: 31.2304,
    lng: 121.4737,
    embedUrl: 'https://www.youtube.com/embed/3LDLdE3kpO8?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // BEIJING, CHINA
  // =================================================================
  {
    id: 'beijing-tiananmen-1',
    name: 'Beijing Tiananmen Square',
    city: 'Beijing',
    country: 'CN',
    lat: 39.9042,
    lng: 116.4074,
    embedUrl: 'https://www.youtube.com/embed/dNF7K0P1RFk?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // TAIPEI, TAIWAN
  // =================================================================
  {
    id: 'taipei-101-1',
    name: 'Taipei 101 District',
    city: 'Taipei',
    country: 'TW',
    lat: 25.0330,
    lng: 121.5654,
    embedUrl: 'https://www.youtube.com/embed/FjKpvEo1bwA?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // SHENZHEN, CHINA
  // =================================================================
  {
    id: 'shenzhen-skyline-1',
    name: 'Shenzhen City Skyline',
    city: 'Shenzhen',
    country: 'CN',
    lat: 22.5431,
    lng: 114.0579,
    embedUrl: 'https://www.youtube.com/embed/N6NhFOxHRgg?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // MACAU
  // =================================================================
  {
    id: 'macau-casino-1',
    name: 'Macau Grand Lisboa Area',
    city: 'Macau',
    country: 'MO',
    lat: 22.1987,
    lng: 113.5439,
    embedUrl: 'https://www.youtube.com/embed/WRhNkCTbGi4?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // LONDON
  // =================================================================
  {
    id: 'london-trafalgar-square-1',
    name: 'Trafalgar Square Live',
    city: 'London',
    country: 'GB',
    lat: 51.5080,
    lng: -0.1281,
    embedUrl: 'https://www.youtube.com/embed/AdUw5RdyZxI?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // PARIS
  // =================================================================
  {
    id: 'paris-eiffel-tower-1',
    name: 'Eiffel Tower Live Cam',
    city: 'Paris',
    country: 'FR',
    lat: 48.8584,
    lng: 2.2945,
    embedUrl: 'https://www.youtube.com/embed/ByXjyp3ZLGA?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // AMSTERDAM
  // =================================================================
  {
    id: 'amsterdam-canal-1',
    name: 'Amsterdam Canal View',
    city: 'Amsterdam',
    country: 'NL',
    lat: 52.3676,
    lng: 4.9041,
    embedUrl: 'https://www.youtube.com/embed/6BWKB0J1l8E?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // ROME
  // =================================================================
  {
    id: 'rome-colosseum-1',
    name: 'Colosseum Live Webcam',
    city: 'Rome',
    country: 'IT',
    lat: 41.8902,
    lng: 12.4922,
    embedUrl: 'https://www.youtube.com/embed/yXKCGWc_pdM?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // BARCELONA
  // =================================================================
  {
    id: 'barcelona-sagrada-familia-1',
    name: 'Sagrada Familia Live',
    city: 'Barcelona',
    country: 'ES',
    lat: 41.4036,
    lng: 2.1744,
    embedUrl: 'https://www.youtube.com/embed/YdbhVHKnMws?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // BERLIN
  // =================================================================
  {
    id: 'berlin-brandenburger-tor-1',
    name: 'Brandenburg Gate Live',
    city: 'Berlin',
    country: 'DE',
    lat: 52.5163,
    lng: 13.3777,
    embedUrl: 'https://www.youtube.com/embed/KTDHBKomOlo?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // VIENNA
  // =================================================================
  {
    id: 'vienna-stephansplatz-1',
    name: 'Stephansplatz Vienna Live',
    city: 'Vienna',
    country: 'AT',
    lat: 48.2085,
    lng: 16.3731,
    embedUrl: 'https://www.youtube.com/embed/rnGYMHBnlxQ?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // ZURICH
  // =================================================================
  {
    id: 'zurich-city-center-1',
    name: 'Zurich City Center Live',
    city: 'Zurich',
    country: 'CH',
    lat: 47.3769,
    lng: 8.5417,
    embedUrl: 'https://www.youtube.com/embed/s2wRb_gPSBM?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // ISTANBUL
  // =================================================================
  {
    id: 'istanbul-bosphorus-1',
    name: 'Bosphorus Strait Live',
    city: 'Istanbul',
    country: 'TR',
    lat: 41.0082,
    lng: 28.9784,
    embedUrl: 'https://www.youtube.com/embed/GCGn7THVC8w?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // WARSAW
  // =================================================================
  {
    id: 'warsaw-old-town-1',
    name: 'Warsaw Old Town Live',
    city: 'Warsaw',
    country: 'PL',
    lat: 52.2297,
    lng: 21.0122,
    embedUrl: 'https://www.youtube.com/embed/tHMiDEkNNzI?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // PRAGUE
  // =================================================================
  {
    id: 'prague-charles-bridge-1',
    name: 'Charles Bridge Prague Live',
    city: 'Prague',
    country: 'CZ',
    lat: 50.0866,
    lng: 14.4114,
    embedUrl: 'https://www.youtube.com/embed/DVEUsNDIGEQ?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // BUDAPEST
  // =================================================================
  {
    id: 'budapest-danube-1',
    name: 'Budapest Danube Live',
    city: 'Budapest',
    country: 'HU',
    lat: 47.4979,
    lng: 19.0402,
    embedUrl: 'https://www.youtube.com/embed/F3UcJm7OM1o?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // BUCHAREST
  // =================================================================
  {
    id: 'bucharest-city-center-1',
    name: 'Bucharest City Live',
    city: 'Bucharest',
    country: 'RO',
    lat: 44.4268,
    lng: 26.1025,
    embedUrl: 'https://www.youtube.com/embed/Xnv9GqHnbrk?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // ATHENS
  // =================================================================
  {
    id: 'athens-acropolis-1',
    name: 'Acropolis Athens Live',
    city: 'Athens',
    country: 'GR',
    lat: 37.9715,
    lng: 23.7257,
    embedUrl: 'https://www.youtube.com/embed/4n7NPk5f45g?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // BELGRADE
  // =================================================================
  {
    id: 'belgrade-fortress-1',
    name: 'Belgrade Fortress Live',
    city: 'Belgrade',
    country: 'RS',
    lat: 44.8176,
    lng: 20.4633,
    embedUrl: 'https://www.youtube.com/embed/2rLtHVJhMWQ?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // ZAGREB
  // =================================================================
  {
    id: 'zagreb-ban-jelacic-square-1',
    name: 'Ban Jelacic Square Zagreb',
    city: 'Zagreb',
    country: 'HR',
    lat: 45.8150,
    lng: 15.9819,
    embedUrl: 'https://www.youtube.com/embed/e3t7HkF5m_g?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // STOCKHOLM
  // =================================================================
  {
    id: 'stockholm-gamla-stan-1',
    name: 'Gamla Stan Stockholm Live',
    city: 'Stockholm',
    country: 'SE',
    lat: 59.3251,
    lng: 18.0711,
    embedUrl: 'https://www.youtube.com/embed/RpZlSGcDrj4?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // OSLO
  // =================================================================
  {
    id: 'oslo-city-hall-1',
    name: 'Oslo City Hall Waterfront',
    city: 'Oslo',
    country: 'NO',
    lat: 59.9139,
    lng: 10.7522,
    embedUrl: 'https://www.youtube.com/embed/TnHGBoqDltU?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // HELSINKI
  // =================================================================
  {
    id: 'helsinki-market-square-1',
    name: 'Helsinki Market Square Live',
    city: 'Helsinki',
    country: 'FI',
    lat: 60.1699,
    lng: 24.9384,
    embedUrl: 'https://www.youtube.com/embed/V7oMZoExQBA?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // COPENHAGEN
  // =================================================================
  {
    id: 'copenhagen-nyhavn-1',
    name: 'Nyhavn Copenhagen Live',
    city: 'Copenhagen',
    country: 'DK',
    lat: 55.6761,
    lng: 12.5683,
    embedUrl: 'https://www.youtube.com/embed/W3wXUHE3GQk?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // REYKJAVIK
  // =================================================================
  {
    id: 'reykjavik-hallgrimskirkja-1',
    name: 'Hallgrimskirkja Reykjavik Live',
    city: 'Reykjavik',
    country: 'IS',
    lat: 64.1418,
    lng: -21.9264,
    embedUrl: 'https://www.youtube.com/embed/rSnMMFPC0Gg?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // LISBON
  // =================================================================
  {
    id: 'lisbon-belem-tower-1',
    name: 'Belem Tower Lisbon Live',
    city: 'Lisbon',
    country: 'PT',
    lat: 38.6916,
    lng: -9.2160,
    embedUrl: 'https://www.youtube.com/embed/hMAZNaOEFo8?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // NAPLES
  // =================================================================
  {
    id: 'naples-port-1',
    name: 'Naples Port Live Cam',
    city: 'Naples',
    country: 'IT',
    lat: 40.8518,
    lng: 14.2681,
    embedUrl: 'https://www.youtube.com/embed/LdpMpPvFVhU?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // DUBROVNIK
  // =================================================================
  {
    id: 'dubrovnik-old-city-1',
    name: 'Dubrovnik Old City Walls Live',
    city: 'Dubrovnik',
    country: 'HR',
    lat: 42.6507,
    lng: 18.0944,
    embedUrl: 'https://www.youtube.com/embed/GBpFMEudBYI?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // MONACO
  // =================================================================
  {
    id: 'monaco-harbor-1',
    name: 'Monaco Harbour Live Cam',
    city: 'Monaco',
    country: 'MC',
    lat: 43.7384,
    lng: 7.4246,
    embedUrl: 'https://www.youtube.com/embed/KQsccdBFqpk?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // CHICAGO
  // =================================================================
  {
    id: 'chicago-riverwalk-1',
    name: 'Chicago Riverwalk',
    city: 'Chicago',
    country: 'US',
    lat: 41.8858,
    lng: -87.6181,
    embedUrl: 'https://www.youtube.com/embed/rnHsONmGDvQ?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // SAN FRANCISCO
  // =================================================================
  {
    id: 'san-francisco-pier39-1',
    name: 'Pier 39 Fishermans Wharf',
    city: 'San Francisco',
    country: 'US',
    lat: 37.8087,
    lng: -122.4098,
    embedUrl: 'https://www.youtube.com/embed/xKnGIpRdR48?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // WASHINGTON DC
  // =================================================================
  {
    id: 'washington-dc-mall-1',
    name: 'National Mall & Capitol',
    city: 'Washington DC',
    country: 'US',
    lat: 38.8899,
    lng: -77.0091,
    embedUrl: 'https://www.youtube.com/embed/1Qzg9MHbNNw?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // TORONTO
  // =================================================================
  {
    id: 'toronto-downtown-1',
    name: 'Downtown Toronto Live',
    city: 'Toronto',
    country: 'CA',
    lat: 43.6532,
    lng: -79.3832,
    embedUrl: 'https://www.youtube.com/embed/UzBjdKfcKsM?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // VANCOUVER
  // =================================================================
  {
    id: 'vancouver-harbour-1',
    name: 'Vancouver Harbour Cam',
    city: 'Vancouver',
    country: 'CA',
    lat: 49.2827,
    lng: -123.1207,
    embedUrl: 'https://www.youtube.com/embed/Yr8BmQoEkF0?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // MONTREAL
  // =================================================================
  {
    id: 'montreal-oldport-1',
    name: 'Old Port Montreal',
    city: 'Montreal',
    country: 'CA',
    lat: 45.5017,
    lng: -73.5673,
    embedUrl: 'https://www.youtube.com/embed/tG4ShfHM7t0?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // SEATTLE
  // =================================================================
  {
    id: 'seattle-pike-place-1',
    name: 'Pike Place Market',
    city: 'Seattle',
    country: 'US',
    lat: 47.6093,
    lng: -122.3418,
    embedUrl: 'https://www.youtube.com/embed/HBvCuMqVbqU?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // BOSTON
  // =================================================================
  {
    id: 'boston-harbor-1',
    name: 'Boston Harbor Live',
    city: 'Boston',
    country: 'US',
    lat: 42.3601,
    lng: -71.0589,
    embedUrl: 'https://www.youtube.com/embed/3Y9x0MFtKJc?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // DALLAS
  // =================================================================
  {
    id: 'dallas-downtown-1',
    name: 'Dallas Downtown Skyline',
    city: 'Dallas',
    country: 'US',
    lat: 32.7767,
    lng: -96.7970,
    embedUrl: 'https://www.youtube.com/embed/cGzqdZBpD-Y?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // PHOENIX
  // =================================================================
  {
    id: 'phoenix-downtown-1',
    name: 'Phoenix City Center',
    city: 'Phoenix',
    country: 'US',
    lat: 33.4484,
    lng: -112.0740,
    embedUrl: 'https://www.youtube.com/embed/t8DfhNJm8uA?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // DENVER
  // =================================================================
  {
    id: 'denver-16th-street-1',
    name: '16th Street Mall Denver',
    city: 'Denver',
    country: 'US',
    lat: 39.7392,
    lng: -104.9903,
    embedUrl: 'https://www.youtube.com/embed/ohk_WFqmHCM?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // MEXICO CITY
  // =================================================================
  {
    id: 'mexico-city-zocalo-1',
    name: 'Zocalo Mexico City',
    city: 'Mexico City',
    country: 'MX',
    lat: 19.4326,
    lng: -99.1332,
    embedUrl: 'https://www.youtube.com/embed/XCJkX0HFpVM?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // BUENOS AIRES
  // =================================================================
  {
    id: 'buenos-aires-obelisco-1',
    name: 'Obelisco Buenos Aires',
    city: 'Buenos Aires',
    country: 'AR',
    lat: -34.6037,
    lng: -58.3816,
    embedUrl: 'https://www.youtube.com/embed/9zTvRb4vIZw?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // SANTIAGO
  // =================================================================
  {
    id: 'santiago-plaza-1',
    name: 'Plaza de Armas Santiago',
    city: 'Santiago',
    country: 'CL',
    lat: -33.4489,
    lng: -70.6693,
    embedUrl: 'https://www.youtube.com/embed/WmdKDvDFVCo?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // LIMA
  // =================================================================
  {
    id: 'lima-miraflores-1',
    name: 'Miraflores Lima Seafront',
    city: 'Lima',
    country: 'PE',
    lat: -12.1211,
    lng: -77.0282,
    embedUrl: 'https://www.youtube.com/embed/rFGmKI3YVEY?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // BOGOTA
  // =================================================================
  {
    id: 'bogota-candelaria-1',
    name: 'La Candelaria Bogota',
    city: 'Bogota',
    country: 'CO',
    lat: 4.5981,
    lng: -74.0758,
    embedUrl: 'https://www.youtube.com/embed/eWBPJbgWBWM?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // SAO PAULO
  // =================================================================
  {
    id: 'sao-paulo-paulista-1',
    name: 'Avenida Paulista Sao Paulo',
    city: 'Sao Paulo',
    country: 'BR',
    lat: -23.5505,
    lng: -46.6333,
    embedUrl: 'https://www.youtube.com/embed/pSAD6VBKpeo?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // CANCUN
  // =================================================================
  {
    id: 'cancun-beach-1',
    name: 'Cancun Hotel Zone Beach',
    city: 'Cancun',
    country: 'MX',
    lat: 21.0619,
    lng: -86.8515,
    embedUrl: 'https://www.youtube.com/embed/yFHuKLd4GfQ?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },

  // =================================================================
  // HAVANA
  // =================================================================
  {
    id: 'havana-malecon-1',
    name: 'Malecon Havana Cuba',
    city: 'Havana',
    country: 'CU',
    lat: 23.1136,
    lng: -82.3666,
    embedUrl: 'https://www.youtube.com/embed/bkHhfP3LKCA?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // PANAMA CITY
  // =================================================================
  {
    id: 'panama-city-canal-1',
    name: 'Panama Canal Miraflores',
    city: 'Panama City',
    country: 'PA',
    lat: 8.9936,
    lng: -79.5741,
    embedUrl: 'https://www.youtube.com/embed/4_K7c_Vu9nQ?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // MONTEVIDEO
  // =================================================================
  {
    id: 'montevideo-rambla-1',
    name: 'Rambla de Montevideo',
    city: 'Montevideo',
    country: 'UY',
    lat: -34.9011,
    lng: -56.1645,
    embedUrl: 'https://www.youtube.com/embed/kqNT_m9gJAs?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // CARTAGENA
  // =================================================================
  {
    id: 'cartagena-old-city-1',
    name: 'Old City Cartagena Colombia',
    city: 'Cartagena',
    country: 'CO',
    lat: 10.3910,
    lng: -75.4794,
    embedUrl: 'https://www.youtube.com/embed/vN4IzBs3XME?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // DUBAI
  // =================================================================
  {
    id: 'dubai-downtown-1',
    name: 'Downtown Dubai Burj Khalifa',
    city: 'Dubai',
    country: 'AE',
    lat: 25.1972,
    lng: 55.2744,
    embedUrl: 'https://www.youtube.com/embed/bVDHD5LPVJ4?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // ABU DHABI
  // =================================================================
  {
    id: 'abu-dhabi-corniche-1',
    name: 'Abu Dhabi Corniche',
    city: 'Abu Dhabi',
    country: 'AE',
    lat: 24.4539,
    lng: 54.3773,
    embedUrl: 'https://www.youtube.com/embed/JTzVZP8WXJU?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // DOHA
  // =================================================================
  {
    id: 'doha-corniche-1',
    name: 'Doha Corniche Waterfront',
    city: 'Doha',
    country: 'QA',
    lat: 25.2854,
    lng: 51.5310,
    embedUrl: 'https://www.youtube.com/embed/MQcvTD_5cSs?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // RIYADH
  // =================================================================
  {
    id: 'riyadh-kingdom-tower-1',
    name: 'Kingdom Centre Riyadh',
    city: 'Riyadh',
    country: 'SA',
    lat: 24.6877,
    lng: 46.6917,
    embedUrl: 'https://www.youtube.com/embed/s1Lz0AMV9S0?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // JERUSALEM
  // =================================================================
  {
    id: 'jerusalem-old-city-1',
    name: 'Western Wall Jerusalem',
    city: 'Jerusalem',
    country: 'IL',
    lat: 31.7767,
    lng: 35.2345,
    embedUrl: 'https://www.youtube.com/embed/11imjMTHMCE?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // TEL AVIV
  // =================================================================
  {
    id: 'tel-aviv-beach-1',
    name: 'Tel Aviv Beach Promenade',
    city: 'Tel Aviv',
    country: 'IL',
    lat: 32.0853,
    lng: 34.7818,
    embedUrl: 'https://www.youtube.com/embed/q_cFuBxi1gg?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },

  // =================================================================
  // MECCA
  // =================================================================
  {
    id: 'mecca-masjid-haram-1',
    name: 'Masjid al-Haram Live',
    city: 'Mecca',
    country: 'SA',
    lat: 21.4225,
    lng: 39.8262,
    embedUrl: 'https://www.youtube.com/embed/fBNtkzqUoIc?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // ISTANBUL (ASIAN SIDE)
  // =================================================================
  {
    id: 'istanbul-asian-side-1',
    name: 'Kadikoy Uskudar Istanbul',
    city: 'Istanbul',
    country: 'TR',
    lat: 41.0082,
    lng: 29.0333,
    embedUrl: 'https://www.youtube.com/embed/DzaBwlzTgNo?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // CAPE TOWN
  // =================================================================
  {
    id: 'cape-town-waterfront-1',
    name: 'V&A Waterfront Cape Town',
    city: 'Cape Town',
    country: 'ZA',
    lat: -33.9249,
    lng: 18.4241,
    embedUrl: 'https://www.youtube.com/embed/D5FLmkHNBTU?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // NAIROBI
  // =================================================================
  {
    id: 'nairobi-cbd-1',
    name: 'Nairobi CBD Live Camera',
    city: 'Nairobi',
    country: 'KE',
    lat: -1.2921,
    lng: 36.8219,
    embedUrl: 'https://www.youtube.com/embed/RB_TMzaWaAE?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // MARRAKECH
  // =================================================================
  {
    id: 'marrakech-jemaa-1',
    name: 'Jemaa el-Fna Marrakech',
    city: 'Marrakech',
    country: 'MA',
    lat: 31.6295,
    lng: -7.9811,
    embedUrl: 'https://www.youtube.com/embed/G2VVJYu_FBs?autoplay=1&mute=1',
    type: 'landmark',
    source: 'static',
  },

  // =================================================================
  // LAGOS
  // =================================================================
  {
    id: 'lagos-victoria-island-1',
    name: 'Victoria Island Lagos',
    city: 'Lagos',
    country: 'NG',
    lat: 6.4281,
    lng: 3.4219,
    embedUrl: 'https://www.youtube.com/embed/WKy7gXlbBNE?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // CAIRO
  // =================================================================
  {
    id: 'cairo-tahrir-1',
    name: 'Tahrir Square Cairo',
    city: 'Cairo',
    country: 'EG',
    lat: 30.0444,
    lng: 31.2357,
    embedUrl: 'https://www.youtube.com/embed/KHmBp3-0MgA?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // MELBOURNE
  // =================================================================
  {
    id: 'melbourne-flinders-1',
    name: 'Flinders Street Station',
    city: 'Melbourne',
    country: 'AU',
    lat: -37.8136,
    lng: 144.9631,
    embedUrl: 'https://www.youtube.com/embed/CjpiGTfHqNc?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // AUCKLAND
  // =================================================================
  {
    id: 'auckland-harbour-1',
    name: 'Auckland Harbour Bridge',
    city: 'Auckland',
    country: 'NZ',
    lat: -36.8485,
    lng: 174.7633,
    embedUrl: 'https://www.youtube.com/embed/UKSIxVt5oZU?autoplay=1&mute=1',
    type: 'port',
    source: 'static',
  },

  // =================================================================
  // BRISBANE
  // =================================================================
  {
    id: 'brisbane-southbank-1',
    name: 'South Bank Brisbane',
    city: 'Brisbane',
    country: 'AU',
    lat: -27.4698,
    lng: 153.0251,
    embedUrl: 'https://www.youtube.com/embed/4EWxVqrVuBA?autoplay=1&mute=1',
    type: 'city',
    source: 'static',
  },

  // =================================================================
  // PERTH
  // =================================================================
  {
    id: 'perth-city-beach-1',
    name: 'City Beach Perth WA',
    city: 'Perth',
    country: 'AU',
    lat: -31.9505,
    lng: 115.8605,
    embedUrl: 'https://www.youtube.com/embed/vdmUrqLqGMg?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },

  // =================================================================
  // GOLD COAST
  // =================================================================
  {
    id: 'gold-coast-surfers-paradise-1',
    name: 'Surfers Paradise Gold Coast',
    city: 'Gold Coast',
    country: 'AU',
    lat: -27.9944,
    lng: 153.4306,
    embedUrl: 'https://www.youtube.com/embed/hBLxZ55sU9M?autoplay=1&mute=1',
    type: 'webcam',
    source: 'static',
  },
];
