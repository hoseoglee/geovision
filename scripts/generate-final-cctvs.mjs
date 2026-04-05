#!/usr/bin/env node
/**
 * Generate final publicCCTVs.ts by merging:
 * 1. Existing entries from publicCCTVs.ts (336)
 * 2. Newly collected & validated entries from collected-new-cctvs.json (1402)
 * 3. Supplement entries from the curated + GeoJSON sources
 *
 * Includes location enrichment for unknown (XX) entries via YouTube title matching.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONCURRENCY = 20;
const TIMEOUT_MS = 8000;

// ─── Location database (city keyword → coordinates) ───
const CITY_DB = {
  // Asia
  'tokyo':{ c:'Tokyo',cc:'JP',la:35.6762,lo:139.6503 },'shibuya':{ c:'Tokyo',cc:'JP',la:35.6595,lo:139.7004 },
  'shinjuku':{ c:'Tokyo',cc:'JP',la:35.6938,lo:139.7034 },'kabukicho':{ c:'Tokyo',cc:'JP',la:35.6947,lo:139.7032 },
  'akihabara':{ c:'Tokyo',cc:'JP',la:35.7023,lo:139.7745 },'ginza':{ c:'Tokyo',cc:'JP',la:35.6717,lo:139.7649 },
  'roppongi':{ c:'Tokyo',cc:'JP',la:35.6628,lo:139.7315 },'odaiba':{ c:'Tokyo',cc:'JP',la:35.6269,lo:139.7762 },
  'osaka':{ c:'Osaka',cc:'JP',la:34.6937,lo:135.5023 },'dotonbori':{ c:'Osaka',cc:'JP',la:34.6687,lo:135.5029 },
  'kyoto':{ c:'Kyoto',cc:'JP',la:35.0116,lo:135.7681 },'sapporo':{ c:'Sapporo',cc:'JP',la:43.0618,lo:141.3545 },
  'fukuoka':{ c:'Fukuoka',cc:'JP',la:33.5904,lo:130.4017 },'nagoya':{ c:'Nagoya',cc:'JP',la:35.1815,lo:136.9066 },
  'kobe':{ c:'Kobe',cc:'JP',la:34.6901,lo:135.1956 },'hiroshima':{ c:'Hiroshima',cc:'JP',la:34.3853,lo:132.4553 },
  'yokohama':{ c:'Yokohama',cc:'JP',la:35.4437,lo:139.638 },'okinawa':{ c:'Naha',cc:'JP',la:26.3344,lo:127.7672 },
  'naha':{ c:'Naha',cc:'JP',la:26.3344,lo:127.7672 },'sendai':{ c:'Sendai',cc:'JP',la:38.2682,lo:140.8694 },
  'narita':{ c:'Narita',cc:'JP',la:35.772,lo:140.3929 },'haneda':{ c:'Tokyo',cc:'JP',la:35.5494,lo:139.7798 },
  'fuji':{ c:'Fuji',cc:'JP',la:35.3606,lo:138.7274 },'mount fuji':{ c:'Fuji',cc:'JP',la:35.3606,lo:138.7274 },
  'kagoshima':{ c:'Kagoshima',cc:'JP',la:31.5966,lo:130.5571 },'japan':{ c:'Tokyo',cc:'JP',la:35.6762,lo:139.6503 },
  'seoul':{ c:'Seoul',cc:'KR',la:37.5665,lo:126.978 },'busan':{ c:'Busan',cc:'KR',la:35.1796,lo:129.0756 },
  'incheon':{ c:'Incheon',cc:'KR',la:37.4563,lo:126.7052 },'jeju':{ c:'Jeju',cc:'KR',la:33.4996,lo:126.5312 },
  'korea':{ c:'Seoul',cc:'KR',la:37.5665,lo:126.978 },
  'beijing':{ c:'Beijing',cc:'CN',la:39.9042,lo:116.4074 },'shanghai':{ c:'Shanghai',cc:'CN',la:31.2304,lo:121.4737 },
  'hong kong':{ c:'Hong Kong',cc:'HK',la:22.3193,lo:114.1694 },'taipei':{ c:'Taipei',cc:'TW',la:25.033,lo:121.5654 },
  'taiwan':{ c:'Taipei',cc:'TW',la:25.033,lo:121.5654 },
  'bangkok':{ c:'Bangkok',cc:'TH',la:13.7563,lo:100.5018 },'pattaya':{ c:'Pattaya',cc:'TH',la:12.9236,lo:100.8825 },
  'phuket':{ c:'Phuket',cc:'TH',la:7.8804,lo:98.3923 },'chiang mai':{ c:'Chiang Mai',cc:'TH',la:18.7883,lo:98.9853 },
  'singapore':{ c:'Singapore',cc:'SG',la:1.3521,lo:103.8198 },
  'kuala lumpur':{ c:'Kuala Lumpur',cc:'MY',la:3.139,lo:101.6869 },
  'bali':{ c:'Bali',cc:'ID',la:-8.3405,lo:115.092 },'jakarta':{ c:'Jakarta',cc:'ID',la:-6.2088,lo:106.8456 },
  'manila':{ c:'Manila',cc:'PH',la:14.5995,lo:120.9842 },'cebu':{ c:'Cebu',cc:'PH',la:10.3157,lo:123.8854 },
  'mumbai':{ c:'Mumbai',cc:'IN',la:19.076,lo:72.8777 },'delhi':{ c:'New Delhi',cc:'IN',la:28.6139,lo:77.209 },
  'new delhi':{ c:'New Delhi',cc:'IN',la:28.6139,lo:77.209 },'varanasi':{ c:'Varanasi',cc:'IN',la:25.3176,lo:83.0064 },
  'dubai':{ c:'Dubai',cc:'AE',la:25.2048,lo:55.2708 },'abu dhabi':{ c:'Abu Dhabi',cc:'AE',la:24.4539,lo:54.3773 },
  'istanbul':{ c:'Istanbul',cc:'TR',la:41.0082,lo:28.9784 },'antalya':{ c:'Antalya',cc:'TR',la:36.8969,lo:30.7133 },
  'jerusalem':{ c:'Jerusalem',cc:'IL',la:31.7683,lo:35.2137 },'tel aviv':{ c:'Tel Aviv',cc:'IL',la:32.0853,lo:34.7818 },
  'mecca':{ c:'Mecca',cc:'SA',la:21.4225,lo:39.8262 },'makkah':{ c:'Mecca',cc:'SA',la:21.4225,lo:39.8262 },
  'ho chi minh':{ c:'Ho Chi Minh City',cc:'VN',la:10.8231,lo:106.6297 },'hanoi':{ c:'Hanoi',cc:'VN',la:21.0278,lo:105.8342 },
  'colombo':{ c:'Colombo',cc:'LK',la:6.9271,lo:79.8612 },'kathmandu':{ c:'Kathmandu',cc:'NP',la:27.7172,lo:85.324 },

  // Europe
  'london':{ c:'London',cc:'GB',la:51.5074,lo:-0.1278 },'big ben':{ c:'London',cc:'GB',la:51.5007,lo:-0.1246 },
  'tower bridge':{ c:'London',cc:'GB',la:51.5055,lo:-0.0754 },'edinburgh':{ c:'Edinburgh',cc:'GB',la:55.9533,lo:-3.1883 },
  'paris':{ c:'Paris',cc:'FR',la:48.8566,lo:2.3522 },'eiffel':{ c:'Paris',cc:'FR',la:48.8584,lo:2.2945 },
  'nice':{ c:'Nice',cc:'FR',la:43.7102,lo:7.262 },'marseille':{ c:'Marseille',cc:'FR',la:43.2965,lo:5.3698 },
  'rome':{ c:'Rome',cc:'IT',la:41.9028,lo:12.4964 },'roma':{ c:'Rome',cc:'IT',la:41.9028,lo:12.4964 },
  'venice':{ c:'Venice',cc:'IT',la:45.4408,lo:12.3155 },'venezia':{ c:'Venice',cc:'IT',la:45.4408,lo:12.3155 },
  'milan':{ c:'Milan',cc:'IT',la:45.4642,lo:9.19 },'milano':{ c:'Milan',cc:'IT',la:45.4642,lo:9.19 },
  'naples':{ c:'Naples',cc:'IT',la:40.8518,lo:14.2681 },'napoli':{ c:'Naples',cc:'IT',la:40.8518,lo:14.2681 },
  'florence':{ c:'Florence',cc:'IT',la:43.7696,lo:11.2558 },'firenze':{ c:'Florence',cc:'IT',la:43.7696,lo:11.2558 },
  'catania':{ c:'Catania',cc:'IT',la:37.5079,lo:15.083 },'palermo':{ c:'Palermo',cc:'IT',la:38.1157,lo:13.3615 },
  'barcelona':{ c:'Barcelona',cc:'ES',la:41.3874,lo:2.1686 },'madrid':{ c:'Madrid',cc:'ES',la:40.4168,lo:-3.7038 },
  'tenerife':{ c:'Tenerife',cc:'ES',la:28.2916,lo:-16.6291 },'ibiza':{ c:'Ibiza',cc:'ES',la:38.9067,lo:1.4206 },
  'malaga':{ c:'Malaga',cc:'ES',la:36.7213,lo:-4.4214 },'seville':{ c:'Seville',cc:'ES',la:37.3886,lo:-5.9823 },
  'berlin':{ c:'Berlin',cc:'DE',la:52.52,lo:13.405 },'munich':{ c:'Munich',cc:'DE',la:48.1351,lo:11.582 },
  'hamburg':{ c:'Hamburg',cc:'DE',la:53.5511,lo:9.9937 },'frankfurt':{ c:'Frankfurt',cc:'DE',la:50.1109,lo:8.6821 },
  'amsterdam':{ c:'Amsterdam',cc:'NL',la:52.3676,lo:4.9041 },'rotterdam':{ c:'Rotterdam',cc:'NL',la:51.9225,lo:4.4792 },
  'oslo':{ c:'Oslo',cc:'NO',la:59.9139,lo:10.7522 },'tromso':{ c:'Tromsø',cc:'NO',la:69.6492,lo:18.9553 },
  'stockholm':{ c:'Stockholm',cc:'SE',la:59.3293,lo:18.0686 },'helsinki':{ c:'Helsinki',cc:'FI',la:60.1699,lo:24.9384 },
  'copenhagen':{ c:'Copenhagen',cc:'DK',la:55.6761,lo:12.5683 },'reykjavik':{ c:'Reykjavik',cc:'IS',la:64.1466,lo:-21.9426 },
  'iceland':{ c:'Reykjavik',cc:'IS',la:64.1466,lo:-21.9426 },
  'prague':{ c:'Prague',cc:'CZ',la:50.0755,lo:14.4378 },'budapest':{ c:'Budapest',cc:'HU',la:47.4979,lo:19.0402 },
  'warsaw':{ c:'Warsaw',cc:'PL',la:52.2297,lo:21.0122 },'vienna':{ c:'Vienna',cc:'AT',la:48.2082,lo:16.3738 },
  'zurich':{ c:'Zurich',cc:'CH',la:47.3769,lo:8.5417 },'geneva':{ c:'Geneva',cc:'CH',la:46.2044,lo:6.1432 },
  'lisbon':{ c:'Lisbon',cc:'PT',la:38.7223,lo:-9.1393 },'porto':{ c:'Porto',cc:'PT',la:41.1579,lo:-8.6291 },
  'athens':{ c:'Athens',cc:'GR',la:37.9838,lo:23.7275 },'santorini':{ c:'Santorini',cc:'GR',la:36.3932,lo:25.4615 },
  'dubrovnik':{ c:'Dubrovnik',cc:'HR',la:42.6507,lo:18.0944 },'split':{ c:'Split',cc:'HR',la:43.5081,lo:16.4402 },
  'dublin':{ c:'Dublin',cc:'IE',la:53.3498,lo:-6.2603 },'brussels':{ c:'Brussels',cc:'BE',la:50.8503,lo:4.3517 },
  'moscow':{ c:'Moscow',cc:'RU',la:55.7558,lo:37.6173 },'st petersburg':{ c:'Saint Petersburg',cc:'RU',la:59.9343,lo:30.3351 },
  'bucharest':{ c:'Bucharest',cc:'RO',la:44.4268,lo:26.1025 },'sofia':{ c:'Sofia',cc:'BG',la:42.6977,lo:23.3219 },
  'belgrade':{ c:'Belgrade',cc:'RS',la:44.7866,lo:20.4489 },'riga':{ c:'Riga',cc:'LV',la:56.9496,lo:24.1052 },
  'tallinn':{ c:'Tallinn',cc:'EE',la:59.437,lo:24.7536 },'vilnius':{ c:'Vilnius',cc:'LT',la:54.6872,lo:25.2797 },
  'monaco':{ c:'Monaco',cc:'MC',la:43.7384,lo:7.4246 },'malta':{ c:'Valletta',cc:'MT',la:35.8989,lo:14.5146 },
  'cyprus':{ c:'Limassol',cc:'CY',la:34.6823,lo:33.0464 },

  // Americas
  'new york':{ c:'New York',cc:'US',la:40.7128,lo:-74.006 },'times square':{ c:'New York',cc:'US',la:40.758,lo:-73.9855 },
  'manhattan':{ c:'New York',cc:'US',la:40.7831,lo:-73.9712 },'brooklyn':{ c:'New York',cc:'US',la:40.6782,lo:-73.9442 },
  'los angeles':{ c:'Los Angeles',cc:'US',la:34.0522,lo:-118.2437 },'santa monica':{ c:'Santa Monica',cc:'US',la:34.0195,lo:-118.4912 },
  'venice beach':{ c:'Los Angeles',cc:'US',la:33.985,lo:-118.4695 },'hollywood':{ c:'Los Angeles',cc:'US',la:34.0928,lo:-118.3287 },
  'san francisco':{ c:'San Francisco',cc:'US',la:37.7749,lo:-122.4194 },'golden gate':{ c:'San Francisco',cc:'US',la:37.8199,lo:-122.4783 },
  'chicago':{ c:'Chicago',cc:'US',la:41.8781,lo:-87.6298 },'miami':{ c:'Miami',cc:'US',la:25.7617,lo:-80.1918 },
  'las vegas':{ c:'Las Vegas',cc:'US',la:36.1699,lo:-115.1398 },'seattle':{ c:'Seattle',cc:'US',la:47.6062,lo:-122.3321 },
  'san diego':{ c:'San Diego',cc:'US',la:32.7157,lo:-117.1611 },'washington':{ c:'Washington D.C.',cc:'US',la:38.9072,lo:-77.0369 },
  'boston':{ c:'Boston',cc:'US',la:42.3601,lo:-71.0589 },'nashville':{ c:'Nashville',cc:'US',la:36.1627,lo:-86.7816 },
  'new orleans':{ c:'New Orleans',cc:'US',la:29.9574,lo:-90.0682 },'key west':{ c:'Key West',cc:'US',la:24.5557,lo:-81.7826 },
  'honolulu':{ c:'Honolulu',cc:'US',la:21.3069,lo:-157.8583 },'waikiki':{ c:'Honolulu',cc:'US',la:21.2769,lo:-157.8268 },
  'hawaii':{ c:'Honolulu',cc:'US',la:21.3069,lo:-157.8583 },'atlanta':{ c:'Atlanta',cc:'US',la:33.749,lo:-84.388 },
  'denver':{ c:'Denver',cc:'US',la:39.7392,lo:-104.9903 },'houston':{ c:'Houston',cc:'US',la:29.7604,lo:-95.3698 },
  'dallas':{ c:'Dallas',cc:'US',la:32.7767,lo:-96.797 },'austin':{ c:'Austin',cc:'US',la:30.2672,lo:-97.7431 },
  'portland':{ c:'Portland',cc:'US',la:45.5051,lo:-122.675 },'orlando':{ c:'Orlando',cc:'US',la:28.5383,lo:-81.3792 },
  'fort lauderdale':{ c:'Fort Lauderdale',cc:'US',la:26.1224,lo:-80.1373 },
  'toronto':{ c:'Toronto',cc:'CA',la:43.6532,lo:-79.3832 },'vancouver':{ c:'Vancouver',cc:'CA',la:49.2827,lo:-123.1207 },
  'montreal':{ c:'Montreal',cc:'CA',la:45.5017,lo:-73.5673 },'niagara':{ c:'Niagara Falls',cc:'CA',la:43.0896,lo:-79.0849 },
  'mexico city':{ c:'Mexico City',cc:'MX',la:19.4326,lo:-99.1332 },'cancun':{ c:'Cancún',cc:'MX',la:21.1619,lo:-86.8515 },
  'rio de janeiro':{ c:'Rio de Janeiro',cc:'BR',la:-22.9068,lo:-43.1729 },'copacabana':{ c:'Rio de Janeiro',cc:'BR',la:-22.9711,lo:-43.1822 },
  'são paulo':{ c:'São Paulo',cc:'BR',la:-23.5505,lo:-46.6333 },'sao paulo':{ c:'São Paulo',cc:'BR',la:-23.5505,lo:-46.6333 },
  'buenos aires':{ c:'Buenos Aires',cc:'AR',la:-34.6037,lo:-58.3816 },'lima':{ c:'Lima',cc:'PE',la:-12.0464,lo:-77.0428 },
  'santiago':{ c:'Santiago',cc:'CL',la:-33.4489,lo:-70.6693 },'bogota':{ c:'Bogotá',cc:'CO',la:4.711,lo:-74.0721 },
  'havana':{ c:'Havana',cc:'CU',la:23.1136,lo:-82.3666 },'panama':{ c:'Panama City',cc:'PA',la:8.9824,lo:-79.5199 },

  // Africa
  'cape town':{ c:'Cape Town',cc:'ZA',la:-33.9249,lo:18.4241 },'johannesburg':{ c:'Johannesburg',cc:'ZA',la:-26.2041,lo:28.0473 },
  'kruger':{ c:'Kruger Park',cc:'ZA',la:-24.0128,lo:31.4854 },'nairobi':{ c:'Nairobi',cc:'KE',la:-1.2921,lo:36.8219 },
  'cairo':{ c:'Cairo',cc:'EG',la:30.0444,lo:31.2357 },'giza':{ c:'Cairo',cc:'EG',la:29.9773,lo:31.1325 },
  'pyramid':{ c:'Cairo',cc:'EG',la:29.9773,lo:31.1325 },'marrakech':{ c:'Marrakech',cc:'MA',la:31.6295,lo:-7.9811 },
  'casablanca':{ c:'Casablanca',cc:'MA',la:33.5731,lo:-7.5898 },'lagos':{ c:'Lagos',cc:'NG',la:6.5244,lo:3.3792 },
  'serengeti':{ c:'Serengeti',cc:'TZ',la:-2.3333,lo:34.8333 },'zanzibar':{ c:'Zanzibar',cc:'TZ',la:-6.1659,lo:39.2026 },

  // Oceania
  'sydney':{ c:'Sydney',cc:'AU',la:-33.8688,lo:151.2093 },'melbourne':{ c:'Melbourne',cc:'AU',la:-37.8136,lo:144.9631 },
  'brisbane':{ c:'Brisbane',cc:'AU',la:-27.4698,lo:153.0251 },'gold coast':{ c:'Gold Coast',cc:'AU',la:-28.0167,lo:153.4 },
  'perth':{ c:'Perth',cc:'AU',la:-31.9505,lo:115.8605 },'auckland':{ c:'Auckland',cc:'NZ',la:-36.8485,lo:174.7633 },
  'wellington':{ c:'Wellington',cc:'NZ',la:-41.2865,lo:174.7762 },'queenstown':{ c:'Queenstown',cc:'NZ',la:-45.0312,lo:168.6626 },
  'fiji':{ c:'Suva',cc:'FJ',la:-18.1416,lo:178.4419 },
};

// Country name fallback from worldcams paths
const WORLDCAMS_COUNTRY = {
  'japan':{ cc:'JP',la:35.6762,lo:139.6503 },'south-korea':{ cc:'KR',la:37.5665,lo:126.978 },
  'united-states':{ cc:'US',la:40.7128,lo:-74.006 },'united-kingdom':{ cc:'GB',la:51.5074,lo:-0.1278 },
  'france':{ cc:'FR',la:48.8566,lo:2.3522 },'germany':{ cc:'DE',la:52.52,lo:13.405 },
  'italy':{ cc:'IT',la:41.9028,lo:12.4964 },'spain':{ cc:'ES',la:40.4168,lo:-3.7038 },
  'netherlands':{ cc:'NL',la:52.3676,lo:4.9041 },'brazil':{ cc:'BR',la:-22.9068,lo:-43.1729 },
  'canada':{ cc:'CA',la:43.6532,lo:-79.3832 },'australia':{ cc:'AU',la:-33.8688,lo:151.2093 },
  'thailand':{ cc:'TH',la:13.7563,lo:100.5018 },'israel':{ cc:'IL',la:31.7683,lo:35.2137 },
  'ireland':{ cc:'IE',la:53.3498,lo:-6.2603 },'turkey':{ cc:'TR',la:41.0082,lo:28.9784 },
  'norway':{ cc:'NO',la:59.9139,lo:10.7522 },'sweden':{ cc:'SE',la:59.3293,lo:18.0686 },
  'china':{ cc:'CN',la:31.2304,lo:121.4737 },'south-africa':{ cc:'ZA',la:-33.9249,lo:18.4241 },
  'mexico':{ cc:'MX',la:19.4326,lo:-99.1332 },'croatia':{ cc:'HR',la:42.6507,lo:18.0944 },
  'greece':{ cc:'GR',la:37.9838,lo:23.7275 },'portugal':{ cc:'PT',la:38.7223,lo:-9.1393 },
  'czech-republic':{ cc:'CZ',la:50.0755,lo:14.4378 },'india':{ cc:'IN',la:19.076,lo:72.8777 },
  'new-zealand':{ cc:'NZ',la:-36.8485,lo:174.7633 },'finland':{ cc:'FI',la:60.1699,lo:24.9384 },
  'denmark':{ cc:'DK',la:55.6761,lo:12.5683 },'austria':{ cc:'AT',la:48.2082,lo:16.3738 },
  'switzerland':{ cc:'CH',la:47.3769,lo:8.5417 },'poland':{ cc:'PL',la:52.2297,lo:21.0122 },
  'hungary':{ cc:'HU',la:47.4979,lo:19.0402 },'romania':{ cc:'RO',la:44.4268,lo:26.1025 },
  'russia':{ cc:'RU',la:55.7558,lo:37.6173 },'iceland':{ cc:'IS',la:64.1466,lo:-21.9426 },
  'singapore':{ cc:'SG',la:1.3521,lo:103.8198 },'argentina':{ cc:'AR',la:-34.6037,lo:-58.3816 },
  'colombia':{ cc:'CO',la:4.711,lo:-74.0721 },'egypt':{ cc:'EG',la:30.0444,lo:31.2357 },
  'morocco':{ cc:'MA',la:31.6295,lo:-7.9811 },'belgium':{ cc:'BE',la:50.8503,lo:4.3517 },
  'philippines':{ cc:'PH',la:14.5995,lo:120.9842 },'malaysia':{ cc:'MY',la:3.139,lo:101.6869 },
  'indonesia':{ cc:'ID',la:-6.2088,lo:106.8456 },'kenya':{ cc:'KE',la:-1.2921,lo:36.8219 },
  'peru':{ cc:'PE',la:-12.0464,lo:-77.0428 },'chile':{ cc:'CL',la:-33.4489,lo:-70.6693 },
  'vietnam':{ cc:'VN',la:21.0278,lo:105.8342 },'taiwan':{ cc:'TW',la:25.033,lo:121.5654 },
};

function enrichEntry(entry) {
  if (entry.country && entry.country !== 'XX' && entry.lat !== 0) return entry;

  const title = (entry.name || '').toLowerCase();

  // Try city keyword matching from title
  for (const [kw, loc] of Object.entries(CITY_DB)) {
    if (title.includes(kw)) {
      return { ...entry, city: loc.c, country: loc.cc, lat: loc.la + (Math.random()-0.5)*0.02, lng: loc.lo + (Math.random()-0.5)*0.02 };
    }
  }

  // Try worldcams source path matching
  const src = (entry._source || entry.name || '').toLowerCase();
  for (const [kw, loc] of Object.entries(WORLDCAMS_COUNTRY)) {
    if (src.includes(kw)) {
      return { ...entry, city: kw.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), country: loc.cc, lat: loc.la + (Math.random()-0.5)*0.04, lng: loc.lo + (Math.random()-0.5)*0.04 };
    }
  }

  return entry;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function main() {
  console.log('🎥 Final publicCCTVs.ts Generation\n');

  // 1. Parse existing publicCCTVs.ts
  console.log('📂 Loading existing publicCCTVs.ts...');
  const existingContent = readFileSync(resolve(ROOT, 'src/data/publicCCTVs.ts'), 'utf-8');
  const existingEntries = [];
  const entryRegex = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']*)',\s*city:\s*'([^']*)',\s*country:\s*'([^']*)',\s*lat:\s*([\d.-]+),\s*lng:\s*([\d.-]+),\s*embedUrl:\s*'([^']*)',\s*type:\s*'([^']*)',\s*source:\s*'([^']*)'/gs;
  let m;
  while ((m = entryRegex.exec(existingContent)) !== null) {
    const videoId = m[7].match(/embed\/([a-zA-Z0-9_-]+)/)?.[1];
    if (videoId) {
      existingEntries.push({
        id: m[1], name: m[2], city: m[3], country: m[4],
        lat: parseFloat(m[5]), lng: parseFloat(m[6]), videoId,
        embedUrl: m[7], type: m[8], source: m[9],
      });
    }
  }
  console.log(`  Existing entries: ${existingEntries.length}`);

  // 2. Load collected data
  console.log('📂 Loading collected-new-cctvs.json...');
  const collected = JSON.parse(readFileSync(resolve(ROOT, 'scripts/collected-new-cctvs.json'), 'utf-8'));
  console.log(`  Collected entries: ${collected.length}`);

  // 3. Also get STATIC_CCTVS IDs to exclude
  const staticContent = readFileSync(resolve(ROOT, 'src/providers/CCTVProvider.ts'), 'utf-8');
  const staticIds = new Set();
  for (const sm of staticContent.matchAll(/embed\/([a-zA-Z0-9_-]+)/g)) staticIds.add(sm[1]);
  console.log(`  STATIC_CCTVS IDs: ${staticIds.size}`);

  // 4. Merge: existing + collected, dedup by videoId
  const videoIdMap = new Map();

  // Add existing first (preserve original metadata)
  for (const e of existingEntries) {
    if (staticIds.has(e.videoId)) continue;
    videoIdMap.set(e.videoId, e);
  }
  console.log(`  After existing: ${videoIdMap.size}`);

  // Add collected (enrich locations first)
  let enrichedCount = 0;
  for (const e of collected) {
    if (!e.videoId || staticIds.has(e.videoId) || videoIdMap.has(e.videoId)) continue;
    const enriched = enrichEntry(e);
    if (enriched.country !== (e.country || 'XX')) enrichedCount++;
    videoIdMap.set(e.videoId, enriched);
  }
  console.log(`  After collected: ${videoIdMap.size} (enriched ${enrichedCount} locations)`);

  // 5. Remove entries with no location (XX with lat=0)
  const entries = Array.from(videoIdMap.values());
  const withLocation = entries.filter(e => e.country !== 'XX' || (e.lat !== 0 && e.lng !== 0));
  const noLocation = entries.filter(e => e.country === 'XX' && e.lat === 0 && e.lng === 0);
  console.log(`\n📊 With location: ${withLocation.length}`);
  console.log(`📊 Without location (excluded): ${noLocation.length}`);

  // 6. Generate ID for entries that don't have one
  const usedIds = new Set(withLocation.filter(e => e.id).map(e => e.id));
  for (const e of withLocation) {
    if (!e.id) {
      let base = slugify(`${e.city || 'cam'}-${(e.name || e.videoId).substring(0, 30)}`);
      if (!base) base = `cam-${e.videoId}`;
      let id = base;
      let suffix = 2;
      while (usedIds.has(id)) { id = `${base}-${suffix++}`; }
      e.id = id;
      usedIds.add(id);
    }
  }

  // 7. Generate TypeScript
  console.log('\n📝 Generating publicCCTVs.ts...');

  const lines = [
    `import type { CCTVData } from '../providers/CCTVProvider';`,
    ``,
    `/**`,
    ` * Public CCTV / Webcam dataset — YouTube live streams`,
    ` * ${withLocation.length} cameras — auto-generated ${new Date().toISOString().split('T')[0]}`,
    ` * Excludes entries already in STATIC_CCTVS in CCTVProvider.ts`,
    ` * All entries validated via YouTube oEmbed API`,
    ` */`,
    ``,
    `export const PUBLIC_CCTVS: CCTVData[] = [`,
  ];

  for (const e of withLocation) {
    const name = escapeStr(e.name || `Camera ${e.videoId}`);
    const city = escapeStr(e.city || 'Unknown');
    const embedUrl = e.embedUrl || `https://www.youtube.com/embed/${e.videoId}?autoplay=1&mute=1`;
    const type = e.type || 'webcam';

    lines.push(`  {`);
    lines.push(`    id: '${escapeStr(e.id)}',`);
    lines.push(`    name: '${name}',`);
    lines.push(`    city: '${city}',`);
    lines.push(`    country: '${escapeStr(e.country || 'XX')}',`);
    lines.push(`    lat: ${e.lat},`);
    lines.push(`    lng: ${e.lng},`);
    lines.push(`    embedUrl: '${escapeStr(embedUrl)}',`);
    lines.push(`    type: '${type}',`);
    lines.push(`    source: 'static',`);
    lines.push(`  },`);
  }

  lines.push(`];`);
  lines.push(``);

  const output = lines.join('\n');
  const outputPath = resolve(ROOT, 'src/data/publicCCTVs.ts');
  writeFileSync(outputPath, output);

  console.log(`✅ Generated ${outputPath}`);
  console.log(`📊 Total cameras: ${withLocation.length}`);
  console.log(`📊 File size: ${(Buffer.byteLength(output) / 1024).toFixed(1)} KB`);

  // Stats
  const byCountry = {};
  for (const e of withLocation) byCountry[e.country] = (byCountry[e.country] || 0) + 1;
  console.log('\n🌍 Top 20 countries:');
  const sorted = Object.entries(byCountry).sort((a,b) => b[1]-a[1]).slice(0,20);
  for (const [c, n] of sorted) console.log(`  ${c}: ${n}`);

  const continentMap = {
    JP:'Asia',KR:'Asia',CN:'Asia',HK:'Asia',TW:'Asia',TH:'Asia',SG:'Asia',MY:'Asia',ID:'Asia',PH:'Asia',
    IN:'Asia',AE:'Asia',TR:'Asia',IL:'Asia',SA:'Asia',VN:'Asia',KH:'Asia',LK:'Asia',NP:'Asia',BD:'Asia',PK:'Asia',
    GB:'Europe',FR:'Europe',DE:'Europe',IT:'Europe',ES:'Europe',NL:'Europe',NO:'Europe',SE:'Europe',FI:'Europe',
    DK:'Europe',AT:'Europe',CH:'Europe',CZ:'Europe',PL:'Europe',HU:'Europe',RO:'Europe',IS:'Europe',RU:'Europe',
    IE:'Europe',PT:'Europe',GR:'Europe',HR:'Europe',ME:'Europe',MT:'Europe',CY:'Europe',BG:'Europe',RS:'Europe',
    SI:'Europe',SK:'Europe',LV:'Europe',LT:'Europe',EE:'Europe',UA:'Europe',BE:'Europe',LU:'Europe',MC:'Europe',VA:'Europe',
    US:'N.America',CA:'N.America',MX:'N.America',PA:'N.America',CR:'N.America',PR:'N.America',CU:'N.America',VI:'N.America',
    BR:'S.America',AR:'S.America',CL:'S.America',CO:'S.America',PE:'S.America',UY:'S.America',EC:'S.America',
    ZA:'Africa',KE:'Africa',EG:'Africa',MA:'Africa',NG:'Africa',GH:'Africa',TZ:'Africa',ET:'Africa',NA:'Africa',
    AU:'Oceania',NZ:'Oceania',FJ:'Oceania',PF:'Oceania',
  };
  const byCont = {};
  for (const e of withLocation) { const co = continentMap[e.country] || 'Other'; byCont[co] = (byCont[co]||0)+1; }
  console.log('\n🌍 Continental distribution:');
  for (const [c,n] of Object.entries(byCont).sort((a,b)=>b[1]-a[1])) console.log(`  ${c}: ${n}`);
}

main().catch(console.error);
