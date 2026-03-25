#!/usr/bin/env node
/**
 * Merge all CCTV sources, deduplicate, validate via YouTube oEmbed,
 * and output a final validated JSON ready for publicCCTVs.ts generation.
 *
 * Usage: node scripts/merge-and-validate.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONCURRENCY = 15;
const OEMBED_URL = 'https://www.youtube.com/oembed';
const TIMEOUT_MS = 10000;

// ─── Location mapping for worldcams paths ───
const WORLDCAMS_LOCATION_MAP = {
  // Americas
  'mexico/quintana-roo': { city: 'Playa del Carmen', country: 'MX', lat: 20.6296, lng: -87.0739 },
  'mexico/cancun': { city: 'Cancún', country: 'MX', lat: 21.1619, lng: -86.8515 },
  'mexico/mexico-city': { city: 'Mexico City', country: 'MX', lat: 19.4326, lng: -99.1332 },
  'usa/new-york': { city: 'New York', country: 'US', lat: 40.7128, lng: -74.006 },
  'usa/los-angeles': { city: 'Los Angeles', country: 'US', lat: 34.0522, lng: -118.2437 },
  'usa/miami': { city: 'Miami', country: 'US', lat: 25.7617, lng: -80.1918 },
  'usa/chicago': { city: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298 },
  'usa/las-vegas': { city: 'Las Vegas', country: 'US', lat: 36.1699, lng: -115.1398 },
  'usa/san-francisco': { city: 'San Francisco', country: 'US', lat: 37.7749, lng: -122.4194 },
  'usa/hawaii': { city: 'Honolulu', country: 'US', lat: 21.3069, lng: -157.8583 },
  'usa/florida': { city: 'Orlando', country: 'US', lat: 28.5383, lng: -81.3792 },
  'usa/texas': { city: 'Houston', country: 'US', lat: 29.7604, lng: -95.3698 },
  'usa/washington': { city: 'Washington D.C.', country: 'US', lat: 38.9072, lng: -77.0369 },
  'usa/seattle': { city: 'Seattle', country: 'US', lat: 47.6062, lng: -122.3321 },
  'usa/boston': { city: 'Boston', country: 'US', lat: 42.3601, lng: -71.0589 },
  'usa/denver': { city: 'Denver', country: 'US', lat: 39.7392, lng: -104.9903 },
  'canada/toronto': { city: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832 },
  'canada/vancouver': { city: 'Vancouver', country: 'CA', lat: 49.2827, lng: -123.1207 },
  'canada/montreal': { city: 'Montreal', country: 'CA', lat: 45.5017, lng: -73.5673 },
  'brazil/rio-de-janeiro': { city: 'Rio de Janeiro', country: 'BR', lat: -22.9068, lng: -43.1729 },
  'brazil/sao-paulo': { city: 'São Paulo', country: 'BR', lat: -23.5505, lng: -46.6333 },
  'argentina/buenos-aires': { city: 'Buenos Aires', country: 'AR', lat: -34.6037, lng: -58.3816 },
  'colombia/bogota': { city: 'Bogotá', country: 'CO', lat: 4.711, lng: -74.0721 },
  'chile/santiago': { city: 'Santiago', country: 'CL', lat: -33.4489, lng: -70.6693 },
  'peru/lima': { city: 'Lima', country: 'PE', lat: -12.0464, lng: -77.0428 },
  'costa-rica': { city: 'San José', country: 'CR', lat: 9.9281, lng: -84.0907 },
  'dominican-republic': { city: 'Punta Cana', country: 'DO', lat: 18.5601, lng: -68.3725 },
  'jamaica': { city: 'Montego Bay', country: 'JM', lat: 18.4762, lng: -77.8939 },
  // Europe
  'spain/tenerife': { city: 'Tenerife', country: 'ES', lat: 28.2916, lng: -16.6291 },
  'spain/barcelona': { city: 'Barcelona', country: 'ES', lat: 41.3874, lng: 2.1686 },
  'spain/madrid': { city: 'Madrid', country: 'ES', lat: 40.4168, lng: -3.7038 },
  'spain/mallorca': { city: 'Palma de Mallorca', country: 'ES', lat: 39.5696, lng: 2.6502 },
  'spain/costa-del-sol': { city: 'Málaga', country: 'ES', lat: 36.7213, lng: -4.4217 },
  'spain/canary-islands': { city: 'Las Palmas', country: 'ES', lat: 28.1235, lng: -15.4363 },
  'france/paris': { city: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
  'france/nice': { city: 'Nice', country: 'FR', lat: 43.7102, lng: 7.262 },
  'france/marseille': { city: 'Marseille', country: 'FR', lat: 43.2965, lng: 5.3698 },
  'italy/rome': { city: 'Rome', country: 'IT', lat: 41.9028, lng: 12.4964 },
  'italy/venice': { city: 'Venice', country: 'IT', lat: 45.4408, lng: 12.3155 },
  'italy/milan': { city: 'Milan', country: 'IT', lat: 45.4642, lng: 9.19 },
  'italy/naples': { city: 'Naples', country: 'IT', lat: 40.8518, lng: 14.2681 },
  'italy/florence': { city: 'Florence', country: 'IT', lat: 43.7696, lng: 11.2558 },
  'germany/berlin': { city: 'Berlin', country: 'DE', lat: 52.52, lng: 13.405 },
  'germany/munich': { city: 'Munich', country: 'DE', lat: 48.1351, lng: 11.582 },
  'germany/hamburg': { city: 'Hamburg', country: 'DE', lat: 53.5511, lng: 9.9937 },
  'netherlands/amsterdam': { city: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041 },
  'uk/london': { city: 'London', country: 'GB', lat: 51.5074, lng: -0.1278 },
  'uk/edinburgh': { city: 'Edinburgh', country: 'GB', lat: 55.9533, lng: -3.1883 },
  'ireland/dublin': { city: 'Dublin', country: 'IE', lat: 53.3498, lng: -6.2603 },
  'portugal/lisbon': { city: 'Lisbon', country: 'PT', lat: 38.7223, lng: -9.1393 },
  'portugal/porto': { city: 'Porto', country: 'PT', lat: 41.1579, lng: -8.6291 },
  'greece/athens': { city: 'Athens', country: 'GR', lat: 37.9838, lng: 23.7275 },
  'greece/santorini': { city: 'Santorini', country: 'GR', lat: 36.3932, lng: 25.4615 },
  'greece/mykonos': { city: 'Mykonos', country: 'GR', lat: 37.4467, lng: 25.3289 },
  'croatia/dubrovnik': { city: 'Dubrovnik', country: 'HR', lat: 42.6507, lng: 18.0944 },
  'croatia/split': { city: 'Split', country: 'HR', lat: 43.5081, lng: 16.4402 },
  'norway/oslo': { city: 'Oslo', country: 'NO', lat: 59.9139, lng: 10.7522 },
  'norway/tromso': { city: 'Tromsø', country: 'NO', lat: 69.6492, lng: 18.9553 },
  'sweden/stockholm': { city: 'Stockholm', country: 'SE', lat: 59.3293, lng: 18.0686 },
  'finland/helsinki': { city: 'Helsinki', country: 'FI', lat: 60.1699, lng: 24.9384 },
  'denmark/copenhagen': { city: 'Copenhagen', country: 'DK', lat: 55.6761, lng: 12.5683 },
  'austria/vienna': { city: 'Vienna', country: 'AT', lat: 48.2082, lng: 16.3738 },
  'switzerland/zurich': { city: 'Zurich', country: 'CH', lat: 47.3769, lng: 8.5417 },
  'switzerland/geneva': { city: 'Geneva', country: 'CH', lat: 46.2044, lng: 6.1432 },
  'czech-republic/prague': { city: 'Prague', country: 'CZ', lat: 50.0755, lng: 14.4378 },
  'poland/warsaw': { city: 'Warsaw', country: 'PL', lat: 52.2297, lng: 21.0122 },
  'poland/krakow': { city: 'Kraków', country: 'PL', lat: 50.0647, lng: 19.945 },
  'hungary/budapest': { city: 'Budapest', country: 'HU', lat: 47.4979, lng: 19.0402 },
  'romania/bucharest': { city: 'Bucharest', country: 'RO', lat: 44.4268, lng: 26.1025 },
  'turkey/istanbul': { city: 'Istanbul', country: 'TR', lat: 41.0082, lng: 28.9784 },
  'turkey/antalya': { city: 'Antalya', country: 'TR', lat: 36.8969, lng: 30.7133 },
  'iceland/reykjavik': { city: 'Reykjavik', country: 'IS', lat: 64.1466, lng: -21.9426 },
  'russia/moscow': { city: 'Moscow', country: 'RU', lat: 55.7558, lng: 37.6173 },
  'russia/saint-petersburg': { city: 'Saint Petersburg', country: 'RU', lat: 59.9343, lng: 30.3351 },
  'montenegro': { city: 'Budva', country: 'ME', lat: 42.2911, lng: 18.8403 },
  'malta': { city: 'Valletta', country: 'MT', lat: 35.8989, lng: 14.5146 },
  'cyprus': { city: 'Limassol', country: 'CY', lat: 34.6823, lng: 33.0464 },
  'bulgaria/sofia': { city: 'Sofia', country: 'BG', lat: 42.6977, lng: 23.3219 },
  'serbia/belgrade': { city: 'Belgrade', country: 'RS', lat: 44.7866, lng: 20.4489 },
  'bosnia': { city: 'Sarajevo', country: 'BA', lat: 43.8563, lng: 18.4131 },
  'albania': { city: 'Tirana', country: 'AL', lat: 41.3275, lng: 19.8187 },
  'north-macedonia': { city: 'Skopje', country: 'MK', lat: 41.9973, lng: 21.428 },
  'slovenia/ljubljana': { city: 'Ljubljana', country: 'SI', lat: 46.0569, lng: 14.5058 },
  'slovakia/bratislava': { city: 'Bratislava', country: 'SK', lat: 48.1486, lng: 17.1077 },
  'latvia/riga': { city: 'Riga', country: 'LV', lat: 56.9496, lng: 24.1052 },
  'lithuania/vilnius': { city: 'Vilnius', country: 'LT', lat: 54.6872, lng: 25.2797 },
  'estonia/tallinn': { city: 'Tallinn', country: 'EE', lat: 59.437, lng: 24.7536 },
  'ukraine/kyiv': { city: 'Kyiv', country: 'UA', lat: 50.4501, lng: 30.5234 },
  'belgium/brussels': { city: 'Brussels', country: 'BE', lat: 50.8503, lng: 4.3517 },
  'luxembourg': { city: 'Luxembourg City', country: 'LU', lat: 49.6117, lng: 6.1319 },
  // Asia
  'japan/tokyo': { city: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503 },
  'japan/osaka': { city: 'Osaka', country: 'JP', lat: 34.6937, lng: 135.5023 },
  'japan/kyoto': { city: 'Kyoto', country: 'JP', lat: 35.0116, lng: 135.7681 },
  'japan/hokkaido': { city: 'Sapporo', country: 'JP', lat: 43.0618, lng: 141.3545 },
  'japan/okinawa': { city: 'Naha', country: 'JP', lat: 26.2124, lng: 127.6809 },
  'japan/fukuoka': { city: 'Fukuoka', country: 'JP', lat: 33.5904, lng: 130.4017 },
  'south-korea/seoul': { city: 'Seoul', country: 'KR', lat: 37.5665, lng: 126.978 },
  'south-korea/busan': { city: 'Busan', country: 'KR', lat: 35.1796, lng: 129.0756 },
  'china/beijing': { city: 'Beijing', country: 'CN', lat: 39.9042, lng: 116.4074 },
  'china/shanghai': { city: 'Shanghai', country: 'CN', lat: 31.2304, lng: 121.4737 },
  'china/hong-kong': { city: 'Hong Kong', country: 'HK', lat: 22.3193, lng: 114.1694 },
  'taiwan/taipei': { city: 'Taipei', country: 'TW', lat: 25.033, lng: 121.5654 },
  'thailand/bangkok': { city: 'Bangkok', country: 'TH', lat: 13.7563, lng: 100.5018 },
  'thailand/phuket': { city: 'Phuket', country: 'TH', lat: 7.8804, lng: 98.3923 },
  'thailand/pattaya': { city: 'Pattaya', country: 'TH', lat: 12.9236, lng: 100.8825 },
  'vietnam/hanoi': { city: 'Hanoi', country: 'VN', lat: 21.0278, lng: 105.8342 },
  'vietnam/ho-chi-minh': { city: 'Ho Chi Minh City', country: 'VN', lat: 10.8231, lng: 106.6297 },
  'singapore': { city: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198 },
  'malaysia/kuala-lumpur': { city: 'Kuala Lumpur', country: 'MY', lat: 3.139, lng: 101.6869 },
  'indonesia/bali': { city: 'Bali', country: 'ID', lat: -8.3405, lng: 115.092 },
  'indonesia/jakarta': { city: 'Jakarta', country: 'ID', lat: -6.2088, lng: 106.8456 },
  'philippines/manila': { city: 'Manila', country: 'PH', lat: 14.5995, lng: 120.9842 },
  'philippines/cebu': { city: 'Cebu', country: 'PH', lat: 10.3157, lng: 123.8854 },
  'india/mumbai': { city: 'Mumbai', country: 'IN', lat: 19.076, lng: 72.8777 },
  'india/delhi': { city: 'New Delhi', country: 'IN', lat: 28.6139, lng: 77.209 },
  'india/bangalore': { city: 'Bangalore', country: 'IN', lat: 12.9716, lng: 77.5946 },
  'india/kolkata': { city: 'Kolkata', country: 'IN', lat: 22.5726, lng: 88.3639 },
  'sri-lanka/colombo': { city: 'Colombo', country: 'LK', lat: 6.9271, lng: 79.8612 },
  'nepal/kathmandu': { city: 'Kathmandu', country: 'NP', lat: 27.7172, lng: 85.324 },
  'cambodia/phnom-penh': { city: 'Phnom Penh', country: 'KH', lat: 11.5564, lng: 104.9282 },
  'myanmar/yangon': { city: 'Yangon', country: 'MM', lat: 16.8661, lng: 96.1951 },
  'uae/dubai': { city: 'Dubai', country: 'AE', lat: 25.2048, lng: 55.2708 },
  'uae/abu-dhabi': { city: 'Abu Dhabi', country: 'AE', lat: 24.4539, lng: 54.3773 },
  'israel/tel-aviv': { city: 'Tel Aviv', country: 'IL', lat: 32.0853, lng: 34.7818 },
  'israel/jerusalem': { city: 'Jerusalem', country: 'IL', lat: 31.7683, lng: 35.2137 },
  'jordan/amman': { city: 'Amman', country: 'JO', lat: 31.9454, lng: 35.9284 },
  'qatar/doha': { city: 'Doha', country: 'QA', lat: 25.2854, lng: 51.531 },
  'saudi-arabia/riyadh': { city: 'Riyadh', country: 'SA', lat: 24.7136, lng: 46.6753 },
  'oman/muscat': { city: 'Muscat', country: 'OM', lat: 23.5859, lng: 58.4059 },
  'pakistan/islamabad': { city: 'Islamabad', country: 'PK', lat: 33.6844, lng: 73.0479 },
  'pakistan/karachi': { city: 'Karachi', country: 'PK', lat: 24.8607, lng: 67.0011 },
  'bangladesh/dhaka': { city: 'Dhaka', country: 'BD', lat: 23.8103, lng: 90.4125 },
  'mongolia/ulaanbaatar': { city: 'Ulaanbaatar', country: 'MN', lat: 47.8864, lng: 106.9057 },
  'uzbekistan/tashkent': { city: 'Tashkent', country: 'UZ', lat: 41.2995, lng: 69.2401 },
  'kazakhstan/almaty': { city: 'Almaty', country: 'KZ', lat: 43.2551, lng: 76.9126 },
  // Africa
  'south-africa/cape-town': { city: 'Cape Town', country: 'ZA', lat: -33.9249, lng: 18.4241 },
  'south-africa/johannesburg': { city: 'Johannesburg', country: 'ZA', lat: -26.2041, lng: 28.0473 },
  'kenya/nairobi': { city: 'Nairobi', country: 'KE', lat: -1.2921, lng: 36.8219 },
  'egypt/cairo': { city: 'Cairo', country: 'EG', lat: 30.0444, lng: 31.2357 },
  'morocco/marrakech': { city: 'Marrakech', country: 'MA', lat: 31.6295, lng: -7.9811 },
  'morocco/casablanca': { city: 'Casablanca', country: 'MA', lat: 33.5731, lng: -7.5898 },
  'tanzania/dar-es-salaam': { city: 'Dar es Salaam', country: 'TZ', lat: -6.7924, lng: 39.2083 },
  'nigeria/lagos': { city: 'Lagos', country: 'NG', lat: 6.5244, lng: 3.3792 },
  'ghana/accra': { city: 'Accra', country: 'GH', lat: 5.6037, lng: -0.187 },
  'ethiopia/addis-ababa': { city: 'Addis Ababa', country: 'ET', lat: 9.0245, lng: 38.7468 },
  'senegal/dakar': { city: 'Dakar', country: 'SN', lat: 14.7167, lng: -17.4677 },
  'tunisia/tunis': { city: 'Tunis', country: 'TN', lat: 36.8065, lng: 10.1815 },
  'mauritius': { city: 'Port Louis', country: 'MU', lat: -20.1609, lng: 57.5012 },
  'madagascar/antananarivo': { city: 'Antananarivo', country: 'MG', lat: -18.8792, lng: 47.5079 },
  'namibia/windhoek': { city: 'Windhoek', country: 'NA', lat: -22.5609, lng: 17.0658 },
  'rwanda/kigali': { city: 'Kigali', country: 'RW', lat: -1.9403, lng: 29.8739 },
  'uganda/kampala': { city: 'Kampala', country: 'UG', lat: 0.3476, lng: 32.5825 },
  // Oceania
  'australia/sydney': { city: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093 },
  'australia/melbourne': { city: 'Melbourne', country: 'AU', lat: -37.8136, lng: 144.9631 },
  'australia/brisbane': { city: 'Brisbane', country: 'AU', lat: -27.4698, lng: 153.0251 },
  'australia/perth': { city: 'Perth', country: 'AU', lat: -31.9505, lng: 115.8605 },
  'australia/gold-coast': { city: 'Gold Coast', country: 'AU', lat: -28.0167, lng: 153.4 },
  'new-zealand/auckland': { city: 'Auckland', country: 'NZ', lat: -36.8485, lng: 174.7633 },
  'new-zealand/wellington': { city: 'Wellington', country: 'NZ', lat: -41.2865, lng: 174.7762 },
  'new-zealand/queenstown': { city: 'Queenstown', country: 'NZ', lat: -45.0312, lng: 168.6626 },
  'fiji': { city: 'Suva', country: 'FJ', lat: -18.1416, lng: 178.4419 },
  'french-polynesia/tahiti': { city: 'Papeete', country: 'PF', lat: -17.5516, lng: -149.5585 },
  'hawaii': { city: 'Honolulu', country: 'US', lat: 21.3069, lng: -157.8583 },
};

// ─── Load all sources ───
function loadJSON(path) {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, path), 'utf-8'));
  } catch {
    return [];
  }
}

function extractExistingVideoIds() {
  const content = readFileSync(resolve(ROOT, 'src/data/publicCCTVs.ts'), 'utf-8');
  const ids = new Set();
  const regex = /embed\/([a-zA-Z0-9_-]+)/g;
  let m;
  while ((m = regex.exec(content)) !== null) ids.add(m[1]);

  // Also extract from CCTVProvider.ts (STATIC_CCTVS)
  const provContent = readFileSync(resolve(ROOT, 'src/providers/CCTVProvider.ts'), 'utf-8');
  while ((m = regex.exec(provContent)) !== null) ids.add(m[1]);

  return ids;
}

function resolveWorldcamLocation(source) {
  if (!source) return null;
  const path = source.replace(/^\//, '');
  // Try exact and partial matches
  for (const [key, loc] of Object.entries(WORLDCAMS_LOCATION_MAP)) {
    if (path.startsWith(key) || path.includes(key)) return loc;
  }
  // Try country-level match
  const parts = path.split('/');
  for (const [key, loc] of Object.entries(WORLDCAMS_LOCATION_MAP)) {
    if (key.startsWith(parts[0])) return loc;
  }
  return null;
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function checkYouTubeVideo(videoId) {
  const url = `${OEMBED_URL}?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'GeoVision-Validator/2.0' } });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { valid: true, status: 'ok', title: data.title };
    }
    return { valid: false, status: `http_${res.status}` };
  } catch (err) {
    clearTimeout(timeout);
    return { valid: false, status: err.name === 'AbortError' ? 'timeout' : 'error' };
  }
}

async function validateBatch(cctvs, label) {
  console.log(`\n🔍 Validating ${cctvs.length} ${label}...`);
  const results = [];
  let idx = 0;
  let valid = 0, invalid = 0;

  async function worker() {
    while (idx < cctvs.length) {
      const i = idx++;
      const cctv = cctvs[i];
      const result = await checkYouTubeVideo(cctv.videoId);
      results[i] = { ...cctv, ...result };
      if (result.valid) valid++; else invalid++;
      const pct = Math.round(((i + 1) / cctvs.length) * 100);
      process.stdout.write(`\r  [${pct}%] ✅ ${valid} / ❌ ${invalid} / Total ${i + 1}/${cctvs.length}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cctvs.length) }, () => worker()));
  process.stdout.write('\n');
  return results;
}

async function main() {
  console.log('🎥 GeoVision CCTV Merge & Validate Pipeline\n');

  // 1. Load all sources
  const sources = {
    americas: loadJSON('scripts/cctvs-americas.json'),
    europe: loadJSON('scripts/cctvs-europe.json'),
    africaOceania: loadJSON('scripts/cctvs-africa-oceania.json'),
    japan: loadJSON('japan_cameras_268.json'),
    americasAlt: loadJSON('americas_cameras.json'),
    europeanAlt: loadJSON('european_youtube_webcams.json'),
    collected: loadJSON('scripts/collected-cctvs.json'),
    worldcams: loadJSON('scripts/worldcams-all-ids.json'),
    worldcamsNew: loadJSON('scripts/new-worldcams-ids.json'),
  };

  for (const [name, data] of Object.entries(sources)) {
    console.log(`  📦 ${name}: ${data.length} entries`);
  }

  // 2. Get existing video IDs to exclude
  const existingIds = extractExistingVideoIds();
  console.log(`\n  🔒 Existing video IDs (publicCCTVs + static): ${existingIds.size}`);

  // 3. Merge all into a single map keyed by videoId
  const mergedMap = new Map();

  function addEntries(entries, sourceName) {
    for (const entry of entries) {
      const videoId = entry.videoId || (() => {
        const m = (entry.embedUrl || '').match(/embed\/([a-zA-Z0-9_-]+)/);
        return m ? m[1] : null;
      })();
      if (!videoId || existingIds.has(videoId) || mergedMap.has(videoId)) continue;

      // Normalize entry
      const normalized = {
        videoId,
        name: entry.name || `Camera ${videoId}`,
        city: entry.city || '',
        country: entry.country || '',
        lat: entry.lat || 0,
        lng: entry.lng || 0,
        type: entry.type || 'webcam',
        _source: sourceName,
      };
      mergedMap.set(videoId, normalized);
    }
  }

  // Add structured sources first (they have better metadata)
  addEntries(sources.americas, 'americas');
  addEntries(sources.europe, 'europe');
  addEntries(sources.africaOceania, 'africa-oceania');
  addEntries(sources.japan, 'japan');
  addEntries(sources.americasAlt, 'americas-alt');
  addEntries(sources.europeanAlt, 'european-alt');
  addEntries(sources.collected, 'collected');

  // Add worldcams with location resolution
  for (const wc of [...sources.worldcams, ...sources.worldcamsNew]) {
    if (!wc.videoId || existingIds.has(wc.videoId) || mergedMap.has(wc.videoId)) continue;
    const loc = resolveWorldcamLocation(wc.source);
    if (!loc) continue; // Skip if we can't resolve location
    mergedMap.set(wc.videoId, {
      videoId: wc.videoId,
      name: `${loc.city} Webcam`,
      city: loc.city,
      country: loc.country,
      lat: loc.lat + (Math.random() - 0.5) * 0.02, // Slight offset to avoid overlap
      lng: loc.lng + (Math.random() - 0.5) * 0.02,
      type: 'webcam',
      _source: 'worldcams',
    });
  }

  console.log(`\n📊 Merged unique new CCTVs: ${mergedMap.size}`);

  // 4. Validate all
  const allCCTVs = Array.from(mergedMap.values());
  const results = await validateBatch(allCCTVs, 'merged CCTVs');

  const validCCTVs = results.filter(r => r.valid);
  const invalidCCTVs = results.filter(r => !r.valid);

  console.log(`\n📊 Validation Results:`);
  console.log(`  ✅ Valid: ${validCCTVs.length}`);
  console.log(`  ❌ Invalid: ${invalidCCTVs.length}`);
  console.log(`  📊 Pass rate: ${Math.round((validCCTVs.length / results.length) * 100)}%`);

  // 5. Clean up and output
  const output = validCCTVs.map(({ valid: _, status, title, _source, ...rest }) => ({
    ...rest,
    name: title || rest.name, // Use YouTube title if available
  }));

  // Stats by region
  const byCountry = {};
  for (const c of output) {
    byCountry[c.country] = (byCountry[c.country] || 0) + 1;
  }
  console.log(`\n🌍 Distribution by country (top 20):`);
  const sorted = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [country, count] of sorted) {
    console.log(`  ${country}: ${count}`);
  }

  // Save results
  const outputPath = resolve(ROOT, 'scripts/validated-new-cctvs.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved ${output.length} validated CCTVs to scripts/validated-new-cctvs.json`);

  // Save invalid for reference
  const invalidPath = resolve(ROOT, 'scripts/invalid-cctvs.json');
  writeFileSync(invalidPath, JSON.stringify(invalidCCTVs.map(({ valid: _, ...r }) => r), null, 2));
  console.log(`❌ Saved ${invalidCCTVs.length} invalid CCTVs to scripts/invalid-cctvs.json`);
}

main().catch(console.error);
