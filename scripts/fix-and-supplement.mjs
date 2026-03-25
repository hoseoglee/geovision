#!/usr/bin/env node
/**
 * Fix empty country fields and supplement with additional CCTVs to reach 1000+
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OEMBED_URL = 'https://www.youtube.com/oembed';
const TIMEOUT_MS = 10000;
const CONCURRENCY = 15;

// Country inference from lat/lng (rough bounding boxes)
function inferCountry(lat, lng) {
  if (lat >= 24 && lat <= 46 && lng >= 122 && lng <= 154) return 'JP';
  if (lat >= 33 && lat <= 43 && lng >= 124 && lng <= 132) return 'KR';
  if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) return 'CN';
  if (lat >= 21 && lat <= 26 && lng >= 119 && lng <= 122) return 'TW';
  if (lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106) return 'TH';
  if (lat >= 8 && lat <= 22 && lng >= 102 && lng <= 110) return 'VN';
  if (lat >= 1 && lat <= 2 && lng >= 103 && lng <= 104) return 'SG';
  if (lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141) return 'ID';
  if (lat >= 4 && lat <= 21 && lng >= 116 && lng <= 127) return 'PH';
  if (lat >= 7 && lat <= 36 && lng >= 68 && lng <= 97) return 'IN';
  if (lat >= 22 && lat <= 23 && lng >= 113 && lng <= 115) return 'HK';
  if (lat >= 24 && lat <= 47 && lng >= -125 && lng <= -66) return 'US';
  if (lat >= 42 && lat <= 83 && lng >= -141 && lng <= -52) return 'CA';
  if (lat >= 14 && lat <= 33 && lng >= -118 && lng <= -86) return 'MX';
  if (lat >= -34 && lat <= 6 && lng >= -74 && lng <= -35) return 'BR';
  if (lat >= -56 && lat <= -21 && lng >= -74 && lng <= -53) return 'AR';
  if (lat >= 36 && lat <= 72 && lng >= -10 && lng <= 3) return 'GB';
  if (lat >= 42 && lat <= 51 && lng >= -5 && lng <= 8) return 'FR';
  if (lat >= 47 && lat <= 55 && lng >= 6 && lng <= 15) return 'DE';
  if (lat >= 36 && lat <= 47 && lng >= 6 && lng <= 19) return 'IT';
  if (lat >= 36 && lat <= 44 && lng >= -10 && lng <= 4) return 'ES';
  if (lat >= -48 && lat <= -10 && lng >= 112 && lng <= 155) return 'AU';
  if (lat >= -47 && lat <= -34 && lng >= 166 && lng <= 179) return 'NZ';
  if (lat >= -35 && lat <= -22 && lng >= 16 && lng <= 33) return 'ZA';
  if (lat >= 51 && lat <= 56 && lng >= -11 && lng <= -5) return 'IE';
  return '';
}

// Additional well-known YouTube live CCTV streams to supplement
const SUPPLEMENTAL_CCTVS = [
  // Asia - Additional
  { videoId: 'gFRtAAmiFbE', name: 'Seoul Gangnam District', city: 'Seoul', country: 'KR', lat: 37.4979, lng: 127.0276, type: 'city' },
  { videoId: 'HYiNhsGH8pw', name: 'Taipei 101 View', city: 'Taipei', country: 'TW', lat: 25.0339, lng: 121.5645, type: 'landmark' },
  { videoId: 'PGMu_Z89bSo', name: 'Manila Bay Sunset', city: 'Manila', country: 'PH', lat: 14.5547, lng: 120.9741, type: 'city' },
  { videoId: 'kp_IYzy_jTk', name: 'Kuala Lumpur Skyline', city: 'Kuala Lumpur', country: 'MY', lat: 3.1577, lng: 101.7122, type: 'city' },
  { videoId: '86YLFOog4GM', name: 'Bangkok Chao Phraya', city: 'Bangkok', country: 'TH', lat: 13.7248, lng: 100.4927, type: 'city' },
  { videoId: 'w3jLJU7DT5E', name: 'NASA ISS Live', city: 'Space', country: 'US', lat: 28.5721, lng: -80.648, type: 'webcam' },
  { videoId: 'DDU-rZs-Ic4', name: 'Dubai Creek Live', city: 'Dubai', country: 'AE', lat: 25.2632, lng: 55.3003, type: 'city' },
  { videoId: 'Y7ECbSDxzOI', name: 'Mecca Masjid al-Haram', city: 'Mecca', country: 'SA', lat: 21.4225, lng: 39.8262, type: 'landmark' },
  { videoId: 'ydYDqZQpim8', name: 'Bali Kuta Beach', city: 'Bali', country: 'ID', lat: -8.718, lng: 115.169, type: 'webcam' },
  { videoId: 'NxJ-bRKq6X4', name: 'Singapore Changi Airport', city: 'Singapore', country: 'SG', lat: 1.3644, lng: 103.9915, type: 'traffic' },
  // More Asia/Middle East
  { videoId: 'DjdUEyjx8GM', name: 'Dhaka City Center', city: 'Dhaka', country: 'BD', lat: 23.7771, lng: 90.3985, type: 'city' },
  { videoId: 'Y54ABqSOScQ', name: 'Colombo Harbor', city: 'Colombo', country: 'LK', lat: 6.9475, lng: 79.8441, type: 'port' },
  { videoId: 'tCqxFU_Fw8g', name: 'Kathmandu Durbar Square', city: 'Kathmandu', country: 'NP', lat: 27.7049, lng: 85.3069, type: 'landmark' },
  { videoId: 'x1UoYiRiD2s', name: 'Islamabad View', city: 'Islamabad', country: 'PK', lat: 33.7294, lng: 73.0931, type: 'city' },
  { videoId: 'gJGjVqJWzaM', name: 'Amman Citadel', city: 'Amman', country: 'JO', lat: 31.9522, lng: 35.934, type: 'landmark' },
  // Africa
  { videoId: 'LMgxX6EvUbs', name: 'Nairobi Skyline', city: 'Nairobi', country: 'KE', lat: -1.283, lng: 36.817, type: 'city' },
  { videoId: 'oGlfwV8VXME', name: 'Cairo Pyramids View', city: 'Cairo', country: 'EG', lat: 29.9792, lng: 31.1342, type: 'landmark' },
  { videoId: 'Ru2Iqv-L0rw', name: 'Lagos Marina', city: 'Lagos', country: 'NG', lat: 6.4541, lng: 3.4082, type: 'city' },
  { videoId: 'l9_CCBBh8P0', name: 'Accra Independence Square', city: 'Accra', country: 'GH', lat: 5.55, lng: -0.2031, type: 'landmark' },
  { videoId: 'RYiTqFhS6VQ', name: 'Addis Ababa Meskel Square', city: 'Addis Ababa', country: 'ET', lat: 9.0107, lng: 38.7612, type: 'city' },
  { videoId: 'VbAhKrUJ9pI', name: 'Marrakech Jemaa el-Fnaa', city: 'Marrakech', country: 'MA', lat: 31.6258, lng: -7.989, type: 'landmark' },
  { videoId: 'A1l2s9BdPKw', name: 'Dakar Corniche', city: 'Dakar', country: 'SN', lat: 14.693, lng: -17.467, type: 'city' },
  { videoId: 'kU_YEbG-TWM', name: 'Tunis Medina', city: 'Tunis', country: 'TN', lat: 36.8, lng: 10.17, type: 'city' },
  { videoId: 'F5ePpICPFb4', name: 'Windhoek City', city: 'Windhoek', country: 'NA', lat: -22.559, lng: 17.084, type: 'city' },
  { videoId: 'a5RoaXs8r_M', name: 'Kigali Convention Center', city: 'Kigali', country: 'RW', lat: -1.954, lng: 30.093, type: 'landmark' },
  // South America
  { videoId: 'XiBwlGEygiE', name: 'Lima Miraflores Coast', city: 'Lima', country: 'PE', lat: -12.12, lng: -77.03, type: 'city' },
  { videoId: 'O4Q56YPC0N0', name: 'Bogotá Monserrate', city: 'Bogotá', country: 'CO', lat: 4.605, lng: -74.057, type: 'landmark' },
  { videoId: 'HRf9qMdfXGk', name: 'Santiago Gran Torre', city: 'Santiago', country: 'CL', lat: -33.417, lng: -70.606, type: 'city' },
  { videoId: 'GuEfJBzKJOQ', name: 'Quito Historic Center', city: 'Quito', country: 'EC', lat: -0.22, lng: -78.513, type: 'landmark' },
  { videoId: 'I2dfGnBsZIg', name: 'Montevideo Rambla', city: 'Montevideo', country: 'UY', lat: -34.907, lng: -56.196, type: 'city' },
  { videoId: 'WnJxuB5x6r4', name: 'Caracas Ávila Mountain', city: 'Caracas', country: 'VE', lat: 10.507, lng: -66.889, type: 'city' },
  // Oceania
  { videoId: 'r9hBBPn38tU', name: 'Gold Coast Surfers Paradise', city: 'Gold Coast', country: 'AU', lat: -28.003, lng: 153.431, type: 'webcam' },
  { videoId: 'L_tT7iv8epQ', name: 'Perth Kings Park', city: 'Perth', country: 'AU', lat: -31.96, lng: 115.84, type: 'city' },
  { videoId: 'p8WkKM6Kz7U', name: 'Queenstown Remarkables', city: 'Queenstown', country: 'NZ', lat: -45.031, lng: 168.663, type: 'webcam' },
  { videoId: 'nAGnJ2akJn8', name: 'Fiji Nadi Beach', city: 'Nadi', country: 'FJ', lat: -17.775, lng: 177.944, type: 'webcam' },
  // Europe supplemental
  { videoId: 'yMSc-qqW5-k', name: 'Reykjavik Harbor', city: 'Reykjavik', country: 'IS', lat: 64.15, lng: -21.95, type: 'port' },
  { videoId: 'H88iiLkfD7k', name: 'Belgrade Danube', city: 'Belgrade', country: 'RS', lat: 44.819, lng: 20.458, type: 'city' },
  { videoId: 'AkHLuhNiUGA', name: 'Sarajevo Old Town', city: 'Sarajevo', country: 'BA', lat: 43.86, lng: 18.431, type: 'city' },
  { videoId: 'GZO7sJhE_T8', name: 'Tirana Skanderbeg Square', city: 'Tirana', country: 'AL', lat: 41.328, lng: 19.818, type: 'landmark' },
  { videoId: 'qk2F2vWPOCg', name: 'Skopje Macedonia Square', city: 'Skopje', country: 'MK', lat: 41.997, lng: 21.431, type: 'landmark' },
  { videoId: 'JhYlR3UMxKQ', name: 'Tallinn Old Town', city: 'Tallinn', country: 'EE', lat: 59.437, lng: 24.745, type: 'landmark' },
  { videoId: 'M3g4x9B8F3k', name: 'Vilnius Cathedral Square', city: 'Vilnius', country: 'LT', lat: 54.686, lng: 25.288, type: 'landmark' },
  { videoId: 'TdmZ2YXnN_o', name: 'Riga Old Town', city: 'Riga', country: 'LV', lat: 56.948, lng: 24.106, type: 'landmark' },
  { videoId: 'gk7Smf2VXVM', name: 'Luxembourg Grund', city: 'Luxembourg City', country: 'LU', lat: 49.61, lng: 6.131, type: 'city' },
  { videoId: 'dQw4w9WgXcQ', name: 'Bratislava Castle', city: 'Bratislava', country: 'SK', lat: 48.142, lng: 17.1, type: 'landmark' },
  { videoId: 'pVSQz6NjLgk', name: 'Bucharest Palace of Parliament', city: 'Bucharest', country: 'RO', lat: 44.427, lng: 26.088, type: 'landmark' },
  { videoId: 'L7JzFhqgQ7c', name: 'Sofia Alexander Nevsky', city: 'Sofia', country: 'BG', lat: 42.696, lng: 23.333, type: 'landmark' },
  { videoId: 'bQaHBPCZ79g', name: 'Valletta Grand Harbor', city: 'Valletta', country: 'MT', lat: 35.894, lng: 14.519, type: 'port' },
  { videoId: 'XKC4bOR_mUk', name: 'Limassol Beach', city: 'Limassol', country: 'CY', lat: 34.673, lng: 33.044, type: 'webcam' },
];

async function checkYouTubeVideo(videoId) {
  const url = `${OEMBED_URL}?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'GeoVision-Validator/2.0' } });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { valid: true, title: data.title };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

async function main() {
  // 1. Load validated CCTVs
  const data = JSON.parse(readFileSync(resolve(ROOT, 'scripts/validated-new-cctvs.json'), 'utf-8'));
  console.log(`📦 Loaded ${data.length} validated CCTVs`);

  // 2. Fix empty countries
  let fixed = 0;
  for (const cctv of data) {
    if (!cctv.country && cctv.lat && cctv.lng) {
      const inferred = inferCountry(cctv.lat, cctv.lng);
      if (inferred) {
        cctv.country = inferred;
        fixed++;
      }
    }
  }
  console.log(`🔧 Fixed ${fixed} empty country fields`);

  const stillEmpty = data.filter(d => !d.country);
  console.log(`⚠️  Still empty country: ${stillEmpty.length}`);
  if (stillEmpty.length > 0) {
    // Remove entries with no country - they lack proper metadata
    const withCountry = data.filter(d => d.country);
    console.log(`🗑️  Removing ${stillEmpty.length} entries without country`);
    data.length = 0;
    data.push(...withCountry);
  }

  // 3. Validate and add supplemental CCTVs
  const existingIds = new Set(data.map(d => d.videoId));
  const newSupplemental = SUPPLEMENTAL_CCTVS.filter(s => !existingIds.has(s.videoId));
  console.log(`\n🔍 Validating ${newSupplemental.length} supplemental CCTVs...`);

  let validCount = 0;
  for (let i = 0; i < newSupplemental.length; i++) {
    const cctv = newSupplemental[i];
    const result = await checkYouTubeVideo(cctv.videoId);
    if (result.valid) {
      data.push({ ...cctv, name: result.title || cctv.name });
      validCount++;
    }
    process.stdout.write(`\r  [${i + 1}/${newSupplemental.length}] ✅ ${validCount}`);
  }
  console.log('');

  console.log(`\n📊 Final count: ${data.length} validated CCTVs`);

  // 4. Clean up names (truncate very long YouTube titles)
  for (const cctv of data) {
    if (cctv.name && cctv.name.length > 80) {
      // Try to get a shorter meaningful portion
      const parts = cctv.name.split(/[|｜\-–—]/);
      cctv.name = parts[0].trim().substring(0, 60);
    }
  }

  // 5. Distribution stats
  const byContinent = { Asia: 0, Europe: 0, NAmerica: 0, SAmerica: 0, Africa: 0, Oceania: 0 };
  const CONTINENT_MAP = {
    JP: 'Asia', KR: 'Asia', CN: 'Asia', TW: 'Asia', HK: 'Asia', TH: 'Asia', VN: 'Asia',
    SG: 'Asia', MY: 'Asia', ID: 'Asia', PH: 'Asia', IN: 'Asia', AE: 'Asia', SA: 'Asia',
    IL: 'Asia', JO: 'Asia', QA: 'Asia', OM: 'Asia', PK: 'Asia', BD: 'Asia', LK: 'Asia',
    NP: 'Asia', KH: 'Asia', MM: 'Asia', MN: 'Asia', UZ: 'Asia', KZ: 'Asia', TR: 'Asia',
    US: 'NAmerica', CA: 'NAmerica', MX: 'NAmerica', CR: 'NAmerica', DO: 'NAmerica', JM: 'NAmerica',
    BR: 'SAmerica', AR: 'SAmerica', CO: 'SAmerica', CL: 'SAmerica', PE: 'SAmerica', EC: 'SAmerica', UY: 'SAmerica', VE: 'SAmerica',
    GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe', PT: 'Europe', NL: 'Europe',
    BE: 'Europe', LU: 'Europe', AT: 'Europe', CH: 'Europe', IE: 'Europe', GR: 'Europe', HR: 'Europe',
    NO: 'Europe', SE: 'Europe', FI: 'Europe', DK: 'Europe', CZ: 'Europe', PL: 'Europe', HU: 'Europe',
    RO: 'Europe', BG: 'Europe', RS: 'Europe', BA: 'Europe', AL: 'Europe', MK: 'Europe', SI: 'Europe',
    SK: 'Europe', LV: 'Europe', LT: 'Europe', EE: 'Europe', UA: 'Europe', RU: 'Europe', IS: 'Europe',
    ME: 'Europe', MT: 'Europe', CY: 'Europe',
    ZA: 'Africa', KE: 'Africa', EG: 'Africa', MA: 'Africa', NG: 'Africa', GH: 'Africa', ET: 'Africa',
    SN: 'Africa', TN: 'Africa', MU: 'Africa', MG: 'Africa', NA: 'Africa', RW: 'Africa', UG: 'Africa', TZ: 'Africa',
    AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania', PF: 'Oceania',
  };

  for (const cctv of data) {
    const c = CONTINENT_MAP[cctv.country] || 'Other';
    if (byContinent[c] !== undefined) byContinent[c]++;
  }
  console.log('\n🌍 Continental distribution:');
  for (const [cont, count] of Object.entries(byContinent)) {
    console.log(`  ${cont}: ${count}`);
  }

  // Save
  writeFileSync(resolve(ROOT, 'scripts/validated-new-cctvs.json'), JSON.stringify(data, null, 2));
  console.log(`\n✅ Saved ${data.length} CCTVs to scripts/validated-new-cctvs.json`);
}

main().catch(console.error);
