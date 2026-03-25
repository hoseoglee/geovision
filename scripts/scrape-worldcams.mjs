#!/usr/bin/env node
/**
 * Scrape worldcams.tv for YouTube video IDs
 * Fetches camera pages and extracts embedded YouTube video IDs
 */

const CONCURRENCY = 10;
const BASE = 'https://worldcams.tv';

// Camera pages to scrape (from site navigation)
const CAMERA_PAGES = [
  // Japan
  '/japan/tokyo/shibuya-crossing', '/japan/tokyo/kabukicho', '/japan/tokyo/haneda-airport',
  '/japan/tokyo/narita-airport', '/japan/tokyo/rainbow-bridge', '/japan/tokyo/tower-panorama',
  '/japan/tokyo/bay', '/japan/osaka/airport', '/japan/osaka/skyline',
  '/japan/fukuoka/airport', '/japan/railways', '/japan/kusatsu/yubatake-hot-spring',
  '/japan/iwaki/umineko-shouten-store', '/japan/awaji-island/monkey-center',
  '/japan/okinawa/beaches', '/japan/nagano/monkey-park',
  // Korea
  '/south-korea/seoul/city-views', '/south-korea/busan/city-views',
  // USA
  '/united-states/new-york/times-square', '/united-states/new-york/city-views',
  '/united-states/los-angeles/venice-beach', '/united-states/las-vegas/strip',
  '/united-states/miami/port', '/united-states/houston/city-views',
  '/united-states/key-west/duval-street', '/united-states/key-west/hogs-breath-saloon',
  '/united-states/key-west/sloppy-joes-bar', '/united-states/key-west/mallory-square',
  '/united-states/key-west/irish-kevins-bar', '/united-states/key-west/schooner-wharf-bar',
  '/united-states/fort-lauderdale/elbo-room-bar', '/united-states/fort-lauderdale/new-river',
  '/united-states/hollywood/beach', '/united-states/clearwater/beach',
  '/united-states/dania-beach/pier', '/united-states/key-west/robbies-marina-of-islamorada',
  '/united-states/key-west/two-friends-patio-restaurant',
  '/united-states/panama-city/schooners-hill-bar', '/united-states/panama-city/sharkys-beachfront-restaurant',
  '/united-states/san-francisco/castro-street', '/united-states/san-francisco/bay',
  '/united-states/los-angeles/airport', '/united-states/santa-monica/pacific-park',
  '/united-states/tehachapi/railroad', '/united-states/tehachapi/depot-railroad-museum',
  '/united-states/san-diego/waterfront', '/united-states/san-diego/zoo-apes',
  '/united-states/san-diego/zoo-elephants', '/united-states/san-diego/zoo-polar-bears',
  '/united-states/san-diego/zoo-pandas', '/united-states/los-angeles/skid-row',
  '/united-states/anaheim/disneyland-park', '/united-states/chicago/city-views',
  '/united-states/san-bernardino/big-bear-valley-bald-eagles',
  '/united-states/los-angeles/kitten-rescue-sanctuary',
  // Europe
  '/france/paris/eiffel-tower', '/united-kingdom/london/city-views',
  '/united-kingdom/london/abbey-road', '/germany/berlin/city-views',
  '/italy/venice/grand-canal', '/netherlands/amsterdam/dam-square',
  '/ireland/dublin/city-views', '/spain/tenerife/airport', '/spain/tenerife/resorts',
  '/italy/catania/city-views', '/italy/portofino/port', '/italy/como/lake',
  '/italy/assisi/city-views', '/italy/palermo/city-views', '/italy/milan/duomo',
  '/italy/venice/rialto-bridge', '/italy/venice/st-marks-square',
  '/spain/malaga/port', '/spain/barcelona/port', '/spain/ibiza/strip',
  '/netherlands/rotterdam/port', '/netherlands/schiphol/airport',
  '/germany/hamburg/port', '/germany/munich/marienplatz',
  '/france/nice/promenade', '/france/marseille/port',
  // Middle East
  '/israel/jerusalem/western-wall', '/israel/tel-aviv/beach',
  '/turkey/istanbul/bosphorus', '/turkey/istanbul/city-views',
  // Asia
  '/thailand/bangkok/city-views', '/thailand/pattaya/city-views',
  '/thailand/phuket/beach', '/china/hong-kong/city-views',
  '/china/shanghai/bund',
  // Americas
  '/canada/toronto/city-views', '/canada/niagara-falls/falls',
  '/canada/vancouver/harbour', '/brazil/rio-de-janeiro/copacabana',
  '/brazil/rio-de-janeiro/christ-the-redeemer', '/brazil/rio-de-janeiro/airport',
  '/brazil/itajai/port',
  // Australia
  '/australia/sydney/harbour', '/australia/gold-coast/beach',
  // Africa
  '/south-africa/kruger-park/wildlife', '/south-africa/cape-town/waterfront',
];

async function fetchPage(path) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const html = await res.text();

    // Extract YouTube video IDs from embed URLs
    const ids = new Set();
    const regex = /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      ids.add(match[1]);
    }

    // Also check for video IDs in data attributes or JS
    const jsRegex = /["']([a-zA-Z0-9_-]{11})["']\s*[,)]/g;
    // This is too broad, skip it

    return [...ids].map(id => ({ videoId: id, source: path }));
  } catch (err) {
    return [];
  }
}

async function main() {
  console.log(`Scraping ${CAMERA_PAGES.length} worldcams.tv pages...`);

  const allResults = [];
  let idx = 0;

  async function worker() {
    while (idx < CAMERA_PAGES.length) {
      const i = idx++;
      const path = CAMERA_PAGES[i];
      const results = await fetchPage(path);
      allResults.push(...results);
      process.stdout.write(`\r[${i+1}/${CAMERA_PAGES.length}] Found ${allResults.length} IDs so far`);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  console.log();

  // Deduplicate
  const seen = new Set();
  const unique = allResults.filter(r => {
    if (seen.has(r.videoId)) return false;
    seen.add(r.videoId);
    return true;
  });

  console.log(`\nTotal unique video IDs: ${unique.length}`);

  // Output
  const { writeFileSync } = await import('fs');
  writeFileSync('scripts/worldcams-ids.json', JSON.stringify(unique, null, 2));
  console.log('Saved to scripts/worldcams-ids.json');

  // Print all IDs
  for (const r of unique) {
    console.log(`${r.videoId} <- ${r.source}`);
  }
}

main().catch(console.error);
