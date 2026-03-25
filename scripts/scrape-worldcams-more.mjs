#!/usr/bin/env node
/**
 * Scrape worldcams.tv for MORE YouTube video IDs
 * This scrapes the paginated listing pages to discover camera URLs,
 * then fetches each camera page for video IDs
 */

const CONCURRENCY = 15;
const BASE = 'https://worldcams.tv';

async function fetchHtml(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return '';
    return await res.text();
  } catch { return ''; }
}

async function discoverCameraPages() {
  const pages = new Set();

  // Category pages
  const categories = [
    '/cities/', '/beaches/', '/airports/', '/sights/', '/traffic/',
    '/ships/', '/trains/', '/animals/', '/aquariums/', '/mountains/',
    '/water/', '/bars/', '/birds/', '/religion/', '/space/'
  ];

  // Country pages (paginated)
  const countries = [
    '/united-states/', '/united-kingdom/', '/japan/', '/netherlands/',
    '/germany/', '/canada/', '/italy/', '/spain/', '/thailand/',
    '/brazil/', '/china/', '/france/', '/australia/', '/south-korea/',
    '/ireland/', '/israel/', '/turkey/', '/russia/', '/portugal/',
    '/greece/', '/norway/', '/sweden/', '/finland/', '/austria/',
    '/switzerland/', '/mexico/', '/argentina/', '/chile/', '/colombia/',
    '/peru/', '/new-zealand/', '/singapore/', '/taiwan/', '/philippines/',
    '/indonesia/', '/india/', '/south-africa/', '/egypt/', '/morocco/',
    '/kenya/', '/united-arab-emirates/', '/qatar/', '/saudi-arabia/'
  ];

  const allUrls = [];

  // Fetch category and country pages (with pagination)
  for (const path of [...categories, ...countries]) {
    for (let page = 1; page <= 5; page++) {
      const suffix = page > 1 ? `?page=${page}` : '';
      allUrls.push(`${BASE}${path}${suffix}`);
    }
  }

  console.log(`Discovering camera pages from ${allUrls.length} listing pages...`);

  let idx = 0;
  async function worker() {
    while (idx < allUrls.length) {
      const i = idx++;
      const html = await fetchHtml(allUrls[i]);
      // Extract camera page links
      const regex = /href="(\/[a-z-]+\/[a-z-]+\/[a-z0-9-]+)"/g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        if (!match[1].includes('?') && !match[1].includes('page')) {
          pages.add(match[1]);
        }
      }
      process.stdout.write(`\r[${i+1}/${allUrls.length}] Discovered ${pages.size} camera pages`);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  console.log();

  return [...pages];
}

async function extractVideoIds(cameraPages) {
  const allResults = [];
  let idx = 0;

  async function worker() {
    while (idx < cameraPages.length) {
      const i = idx++;
      const html = await fetchHtml(`${BASE}${cameraPages[i]}`);
      const ids = new Set();
      const regex = /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g;
      let match;
      while ((match = regex.exec(html)) !== null) {
        ids.add(match[1]);
      }
      for (const id of ids) {
        allResults.push({ videoId: id, source: cameraPages[i] });
      }
      if (i % 20 === 0) {
        process.stdout.write(`\r[${i+1}/${cameraPages.length}] Found ${allResults.length} IDs`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  console.log(`\r[${cameraPages.length}/${cameraPages.length}] Found ${allResults.length} IDs total`);

  return allResults;
}

async function main() {
  // Step 1: Discover all camera pages
  const cameraPages = await discoverCameraPages();
  console.log(`Found ${cameraPages.length} unique camera pages\n`);

  // Step 2: Extract video IDs from each
  console.log('Extracting video IDs...');
  const results = await extractVideoIds(cameraPages);

  // Deduplicate
  const seen = new Set();
  const unique = results.filter(r => {
    if (seen.has(r.videoId)) return false;
    seen.add(r.videoId);
    return true;
  });

  console.log(`\nTotal unique video IDs: ${unique.length}`);

  const { writeFileSync } = await import('fs');
  writeFileSync('scripts/worldcams-all-ids.json', JSON.stringify(unique, null, 2));
  console.log('Saved to scripts/worldcams-all-ids.json');
}

main().catch(console.error);
