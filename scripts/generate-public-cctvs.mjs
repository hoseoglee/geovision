#!/usr/bin/env node
/**
 * Generate publicCCTVs.ts from validated JSON data + existing entries.
 * Merges existing publicCCTVs.ts entries with new validated CCTVs,
 * deduplicates by videoId, and outputs a complete TypeScript file.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function extractVideoId(embedUrl) {
  const m = embedUrl.match(/embed\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

function escapeSingleQuotes(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function main() {
  // 1. Parse existing publicCCTVs.ts
  const existingContent = readFileSync(resolve(ROOT, 'src/data/publicCCTVs.ts'), 'utf-8');
  const existingCCTVs = [];

  // More robust parsing - extract each object block
  const objectRegex = /\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gs;
  const fieldRegex = {
    id: /id:\s*'([^']*)'/,
    name: /name:\s*'([^']*)'/,
    city: /city:\s*'([^']*)'/,
    country: /country:\s*'([^']*)'/,
    lat: /lat:\s*([-\d.]+)/,
    lng: /lng:\s*([-\d.]+)/,
    embedUrl: /embedUrl:\s*'([^']*)'/,
    type: /type:\s*'([^']*)'/,
    source: /source:\s*'([^']*)'/,
  };

  let match;
  while ((match = objectRegex.exec(existingContent)) !== null) {
    const block = match[0];
    if (!block.includes("embedUrl:")) continue;

    const entry = {};
    for (const [key, regex] of Object.entries(fieldRegex)) {
      const m = block.match(regex);
      if (m) entry[key] = key === 'lat' || key === 'lng' ? parseFloat(m[1]) : m[1];
    }
    if (entry.id && entry.embedUrl) {
      existingCCTVs.push(entry);
    }
  }

  console.log(`📂 Parsed ${existingCCTVs.length} existing CCTVs`);

  // 2. Load new validated CCTVs
  const newCCTVs = JSON.parse(readFileSync(resolve(ROOT, 'scripts/validated-new-cctvs.json'), 'utf-8'));
  console.log(`📦 Loaded ${newCCTVs.length} new validated CCTVs`);

  // 3. Merge, deduplicate by videoId
  const seenVideoIds = new Set();
  const seenIds = new Set();
  const allCCTVs = [];

  // Add existing first (they have priority)
  for (const cctv of existingCCTVs) {
    const videoId = extractVideoId(cctv.embedUrl);
    if (videoId) seenVideoIds.add(videoId);
    seenIds.add(cctv.id);
    allCCTVs.push(cctv);
  }

  // Add new ones
  let addedNew = 0;
  for (const cctv of newCCTVs) {
    if (seenVideoIds.has(cctv.videoId)) continue;
    seenVideoIds.add(cctv.videoId);

    // Generate unique ID
    let baseId = slugify(`${cctv.city || cctv.country}-${cctv.name}`);
    if (!baseId) baseId = `cam-${cctv.videoId.substring(0, 8)}`;
    let id = baseId;
    let counter = 2;
    while (seenIds.has(id)) {
      id = `${baseId}-${counter++}`;
    }
    seenIds.add(id);

    allCCTVs.push({
      id,
      name: cctv.name || `${cctv.city} Webcam`,
      city: cctv.city || '',
      country: cctv.country || '',
      lat: cctv.lat,
      lng: cctv.lng,
      embedUrl: `https://www.youtube.com/embed/${cctv.videoId}?autoplay=1&mute=1`,
      type: cctv.type || 'webcam',
      source: 'static',
    });
    addedNew++;
  }

  console.log(`✅ Added ${addedNew} new CCTVs`);
  console.log(`📊 Total: ${allCCTVs.length} CCTVs`);

  // 4. Stats
  const byContinent = { Asia: 0, Europe: 0, 'N. America': 0, 'S. America': 0, Africa: 0, Oceania: 0, Other: 0 };
  const CONTINENT = {
    JP: 'Asia', KR: 'Asia', CN: 'Asia', TW: 'Asia', HK: 'Asia', TH: 'Asia', VN: 'Asia',
    SG: 'Asia', MY: 'Asia', ID: 'Asia', PH: 'Asia', IN: 'Asia', AE: 'Asia', SA: 'Asia',
    IL: 'Asia', JO: 'Asia', QA: 'Asia', OM: 'Asia', PK: 'Asia', BD: 'Asia', LK: 'Asia',
    NP: 'Asia', KH: 'Asia', MM: 'Asia', MN: 'Asia', UZ: 'Asia', KZ: 'Asia', TR: 'Asia',
    US: 'N. America', CA: 'N. America', MX: 'N. America', CR: 'N. America', DO: 'N. America',
    JM: 'N. America', VI: 'N. America', BL: 'N. America', AI: 'N. America', VG: 'N. America',
    BR: 'S. America', AR: 'S. America', CO: 'S. America', CL: 'S. America', PE: 'S. America',
    EC: 'S. America', UY: 'S. America', VE: 'S. America',
    GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe', PT: 'Europe', NL: 'Europe',
    BE: 'Europe', LU: 'Europe', AT: 'Europe', CH: 'Europe', IE: 'Europe', GR: 'Europe', HR: 'Europe',
    NO: 'Europe', SE: 'Europe', FI: 'Europe', DK: 'Europe', CZ: 'Europe', PL: 'Europe', HU: 'Europe',
    RO: 'Europe', BG: 'Europe', RS: 'Europe', BA: 'Europe', AL: 'Europe', MK: 'Europe', SI: 'Europe',
    SK: 'Europe', LV: 'Europe', LT: 'Europe', EE: 'Europe', UA: 'Europe', RU: 'Europe', IS: 'Europe',
    ME: 'Europe', MT: 'Europe', CY: 'Europe', VA: 'Europe', GL: 'Europe',
    ZA: 'Africa', KE: 'Africa', EG: 'Africa', MA: 'Africa', NG: 'Africa', GH: 'Africa', ET: 'Africa',
    SN: 'Africa', TN: 'Africa', MU: 'Africa', MG: 'Africa', NA: 'Africa', RW: 'Africa', UG: 'Africa', TZ: 'Africa',
    AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania', PF: 'Oceania',
  };
  for (const c of allCCTVs) {
    const cont = CONTINENT[c.country] || 'Other';
    byContinent[cont]++;
  }
  console.log('\n🌍 Distribution:');
  for (const [cont, count] of Object.entries(byContinent)) {
    if (count > 0) console.log(`  ${cont}: ${count}`);
  }

  // 5. Generate TypeScript
  const date = new Date().toISOString().split('T')[0];
  let ts = `// Auto-generated CCTV data — ${allCCTVs.length} cameras
// Last updated: ${date}
// Excludes entries already in STATIC_CCTVS in CCTVProvider.ts
import type { CCTVData } from '../providers/CCTVProvider';

export const PUBLIC_CCTVS: CCTVData[] = [\n`;

  for (const cctv of allCCTVs) {
    const name = escapeSingleQuotes(cctv.name);
    const city = escapeSingleQuotes(cctv.city);
    ts += `  {\n`;
    ts += `    id: '${cctv.id}',\n`;
    ts += `    name: '${name}',\n`;
    ts += `    city: '${city}',\n`;
    ts += `    country: '${cctv.country}',\n`;
    ts += `    lat: ${cctv.lat},\n`;
    ts += `    lng: ${cctv.lng},\n`;
    ts += `    embedUrl: '${cctv.embedUrl}',\n`;
    ts += `    type: '${cctv.type}',\n`;
    ts += `    source: 'static',\n`;
    ts += `  },\n`;
  }

  ts += `];\n`;

  writeFileSync(resolve(ROOT, 'src/data/publicCCTVs.ts'), ts);
  console.log(`\n✅ Generated src/data/publicCCTVs.ts (${allCCTVs.length} cameras, ${(ts.length / 1024).toFixed(0)} KB)`);
}

main();
