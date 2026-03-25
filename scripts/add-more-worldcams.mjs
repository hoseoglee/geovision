#!/usr/bin/env node
/**
 * Add more worldcams entries by expanding the location mapping
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OEMBED_URL = 'https://www.youtube.com/oembed';
const TIMEOUT_MS = 10000;
const CONCURRENCY = 15;

const EXPANDED_MAP = {
  // US variations
  'united-states/new-york': { city: 'New York', country: 'US', lat: 40.7128, lng: -74.006 },
  'united-states/miami': { city: 'Miami', country: 'US', lat: 25.7617, lng: -80.1918 },
  'united-states/panama-city-beach': { city: 'Panama City Beach', country: 'US', lat: 30.1766, lng: -85.8055 },
  'united-states/miramar-beach': { city: 'Miramar Beach', country: 'US', lat: 30.3747, lng: -86.3586 },
  'united-states/deerfield-beach': { city: 'Deerfield Beach', country: 'US', lat: 26.3184, lng: -80.0998 },
  'united-states/destin': { city: 'Destin', country: 'US', lat: 30.3935, lng: -86.4958 },
  'united-states/duluth': { city: 'Duluth', country: 'US', lat: 46.7867, lng: -92.1005 },
  'united-states/mammoth-lakes': { city: 'Mammoth Lakes', country: 'US', lat: 37.6485, lng: -118.9721 },
  'united-states/white-mountains': { city: 'White Mountains', country: 'US', lat: 44.0625, lng: -71.7681 },
  'united-states/pacifica': { city: 'Pacifica', country: 'US', lat: 37.6138, lng: -122.4869 },
  'united-states/monterey': { city: 'Monterey', country: 'US', lat: 36.6002, lng: -121.8947 },
  'united-states/fort-myers-beach': { city: 'Fort Myers Beach', country: 'US', lat: 26.4528, lng: -81.9498 },
  'united-states/south-padre-island': { city: 'South Padre Island', country: 'US', lat: 26.1118, lng: -97.1681 },
  'united-states/jacksonville-beach': { city: 'Jacksonville Beach', country: 'US', lat: 30.2947, lng: -81.3931 },
  'united-states/flagstaff': { city: 'Flagstaff', country: 'US', lat: 35.1983, lng: -111.6513 },
  'united-states/steamboat-springs': { city: 'Steamboat Springs', country: 'US', lat: 40.485, lng: -106.8317 },
  'united-states/boyne-falls': { city: 'Boyne Falls', country: 'US', lat: 45.1681, lng: -84.9158 },
  'united-states/key-largo': { city: 'Key Largo', country: 'US', lat: 25.0865, lng: -80.4473 },
  'united-states/islamorada': { city: 'Islamorada', country: 'US', lat: 24.9243, lng: -80.6278 },
  'united-states/marathon': { city: 'Marathon', country: 'US', lat: 24.7136, lng: -81.0903 },
  'united-states/vineyard': { city: "Martha's Vineyard", country: 'US', lat: 41.3805, lng: -70.6456 },
  'united-states/wrightwood': { city: 'Wrightwood', country: 'US', lat: 34.3608, lng: -117.632 },
  'united-states/charlevoix': { city: 'Charlevoix', country: 'US', lat: 45.3178, lng: -85.2584 },
  'united-states/illinois': { city: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298 },
  'united-states/wyoming': { city: 'Jackson Hole', country: 'US', lat: 43.4799, lng: -110.7624 },
  'united-states/warren': { city: 'Warren', country: 'US', lat: 44.1162, lng: -72.7645 },
  'united-states/la-grange': { city: 'La Grange', country: 'US', lat: 29.9055, lng: -96.8766 },
  'united-states/germantown': { city: 'Germantown', country: 'US', lat: 39.1732, lng: -77.2716 },
  'united-states/carrabassett-valley': { city: 'Carrabassett Valley', country: 'US', lat: 45.0631, lng: -70.2131 },
  'united-states/northern-transcon': { city: 'Northern US', country: 'US', lat: 42.0, lng: -89.0 },
  // UK variations
  'united-kingdom/isle-of-wight': { city: 'Isle of Wight', country: 'GB', lat: 50.6938, lng: -1.3047 },
  'united-kingdom/blue-anchor': { city: 'Blue Anchor', country: 'GB', lat: 51.1833, lng: -3.3317 },
  'united-kingdom/swanage': { city: 'Swanage', country: 'GB', lat: 50.6084, lng: -1.9566 },
  // Caribbean
  'us-virgin-islands/saint-john': { city: 'Saint John', country: 'VI', lat: 18.3358, lng: -64.7281 },
  'us-virgin-islands/st-croix': { city: 'Saint Croix', country: 'VI', lat: 17.7266, lng: -64.8348 },
  'saint-barthelemy/saint-jean': { city: 'Saint-Jean', country: 'BL', lat: 17.9009, lng: -62.8333 },
  // South Korea
  'south-korea/seoul': { city: 'Seoul', country: 'KR', lat: 37.5665, lng: 126.978 },
  // South Africa
  'rsa/cape-town': { city: 'Cape Town', country: 'ZA', lat: -33.9249, lng: 18.4241 },
  'rsa/johannesburg': { city: 'Johannesburg', country: 'ZA', lat: -26.2041, lng: 28.0473 },
  // Greenland
  'greenland/ilulissat': { city: 'Ilulissat', country: 'GL', lat: 69.2198, lng: -51.0986 },
  'greenland/nuuk': { city: 'Nuuk', country: 'GL', lat: 64.1748, lng: -51.7384 },
  // Spain
  'spain/mallorca': { city: 'Palma de Mallorca', country: 'ES', lat: 39.5696, lng: 2.6502 },
  // Japan
  'japan': { city: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503 },
  // Scotland
  'scotland': { city: 'Edinburgh', country: 'GB', lat: 55.9533, lng: -3.1883 },
  // Ireland
  'ireland': { city: 'Dublin', country: 'IE', lat: 53.3498, lng: -6.2603 },
  // Others
  'vatican': { city: 'Vatican City', country: 'VA', lat: 41.9029, lng: 12.4534 },
  'anguilla': { city: 'The Valley', country: 'AI', lat: 18.2206, lng: -63.0686 },
  'british-virgin-islands': { city: 'Road Town', country: 'VG', lat: 18.4286, lng: -64.6185 },
};

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
  // Load existing validated
  const validated = JSON.parse(readFileSync(resolve(ROOT, 'scripts/validated-new-cctvs.json'), 'utf-8'));
  const usedIds = new Set(validated.map(v => v.videoId));

  // Load existing publicCCTVs IDs
  const content = readFileSync(resolve(ROOT, 'src/data/publicCCTVs.ts'), 'utf-8');
  const existIds = new Set();
  let m2;
  const re = /embed\/([a-zA-Z0-9_-]+)/g;
  while ((m2 = re.exec(content)) !== null) existIds.add(m2[1]);

  // Load worldcams
  const wc = JSON.parse(readFileSync(resolve(ROOT, 'scripts/worldcams-all-ids.json'), 'utf-8'));
  const nwc = JSON.parse(readFileSync(resolve(ROOT, 'scripts/new-worldcams-ids.json'), 'utf-8'));
  const all = [...wc, ...nwc];

  // Map new entries
  const newEntries = [];
  for (const item of all) {
    if (usedIds.has(item.videoId) || existIds.has(item.videoId)) continue;
    const path = (item.source || '').replace(/^\//, '');
    let loc = null;
    for (const [key, val] of Object.entries(EXPANDED_MAP)) {
      if (path.startsWith(key) || path.includes(key)) { loc = val; break; }
    }
    if (!loc) {
      const parts = path.split('/');
      for (const [key, val] of Object.entries(EXPANDED_MAP)) {
        if (key.startsWith(parts[0]) || key === parts[0]) { loc = val; break; }
      }
    }
    if (!loc) continue;

    newEntries.push({
      videoId: item.videoId,
      name: `${loc.city} Webcam`,
      city: loc.city,
      country: loc.country,
      lat: loc.lat + (Math.random() - 0.5) * 0.02,
      lng: loc.lng + (Math.random() - 0.5) * 0.02,
      type: 'webcam',
    });
  }

  console.log(`Found ${newEntries.length} new entries to validate`);

  // Validate
  let validCount = 0;
  const validEntries = [];
  let idx = 0;

  async function worker() {
    while (idx < newEntries.length) {
      const i = idx++;
      const entry = newEntries[i];
      const result = await checkYouTubeVideo(entry.videoId);
      if (result.valid) {
        validEntries.push({ ...entry, name: result.title || entry.name });
        validCount++;
      }
      process.stdout.write(`\r  [${i + 1}/${newEntries.length}] ✅ ${validCount}`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, newEntries.length) }, () => worker()));
  console.log('');

  console.log(`\n✅ ${validCount} new valid entries found`);

  // Merge with existing
  const merged = [...validated, ...validEntries];
  console.log(`📊 Total: ${merged.length} validated CCTVs`);

  // Clean long names
  for (const cctv of merged) {
    if (cctv.name && cctv.name.length > 80) {
      const parts = cctv.name.split(/[|｜\-–—]/);
      cctv.name = parts[0].trim().substring(0, 60);
    }
  }

  writeFileSync(resolve(ROOT, 'scripts/validated-new-cctvs.json'), JSON.stringify(merged, null, 2));
  console.log(`✅ Saved to scripts/validated-new-cctvs.json`);
}

main().catch(console.error);
