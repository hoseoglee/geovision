#!/usr/bin/env node
/**
 * Collect 1000+ NEW YouTube live CCTV IDs not already in publicCCTVs.ts
 * Sources: worldcams.tv scraping, GeoJSON repo, curated list
 * Validates via oEmbed and outputs directly to publicCCTVs.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONCURRENCY = 20;
const TIMEOUT_MS = 8000;

// Load ALL existing IDs
const existingIds = new Set(JSON.parse(readFileSync('/tmp/existing-video-ids.json', 'utf-8')));
console.log(`🔒 Existing IDs to exclude: ${existingIds.size}\n`);

// ─── Fetch helpers ───
async function fetchText(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
    clearTimeout(t);
    return r.ok ? await r.text() : null;
  } catch { clearTimeout(t); return null; }
}

function extractYTIds(html) {
  if (!html) return [];
  const ids = new Set();
  for (const m of html.matchAll(/youtube\.com\/(?:embed|watch\?v=|live\/)([a-zA-Z0-9_-]{11})/g)) ids.add(m[1]);
  for (const m of html.matchAll(/youtu\.be\/([a-zA-Z0-9_-]{11})/g)) ids.add(m[1]);
  return [...ids];
}

async function validateId(videoId) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'GeoVision/3.0' } });
    clearTimeout(t);
    if (r.ok) { const d = await r.json(); return { valid: true, title: d.title }; }
    return { valid: false };
  } catch { clearTimeout(t); return { valid: false }; }
}

// ─── Source 1: Scrape worldcams.tv ───
async function scrapeWorldcams() {
  console.log('📡 Scraping worldcams.tv...');
  const allIds = new Map();

  // Discover pages from categories and countries
  const seeds = [
    '/cities/', '/traffic/', '/water/', '/sights/', '/trains/', '/ships/', '/mountains/', '/other/',
    '/japan/', '/south-korea/', '/united-states/', '/united-kingdom/', '/france/', '/germany/',
    '/italy/', '/spain/', '/netherlands/', '/brazil/', '/canada/', '/australia/', '/thailand/',
    '/china/', '/india/', '/mexico/', '/russia/', '/turkey/', '/israel/', '/ireland/',
    '/portugal/', '/greece/', '/croatia/', '/norway/', '/sweden/', '/finland/', '/denmark/',
    '/austria/', '/switzerland/', '/czech-republic/', '/poland/', '/hungary/', '/romania/',
    '/iceland/', '/south-africa/', '/egypt/', '/morocco/', '/new-zealand/', '/singapore/',
    '/malaysia/', '/indonesia/', '/philippines/', '/vietnam/', '/taiwan/', '/hong-kong/',
    '/uae/', '/argentina/', '/chile/', '/colombia/', '/peru/',
  ];

  const cameraPages = new Set();
  for (const seed of seeds) {
    const html = await fetchText(`https://worldcams.tv${seed}`);
    if (!html) continue;
    for (const m of html.matchAll(/href="(\/[^"]+?)"/g)) {
      const p = m[1];
      if (p.split('/').filter(Boolean).length >= 2 && !p.includes('.') && !p.startsWith('/map') && !p.startsWith('/search'))
        cameraPages.add(p);
    }
    for (const id of extractYTIds(html)) allIds.set(id, seed);
  }

  console.log(`  Found ${cameraPages.size} pages to scrape`);

  // Scrape pages
  const pages = [...cameraPages];
  let idx = 0;
  async function worker() {
    while (idx < pages.length) {
      const i = idx++;
      const html = await fetchText(`https://worldcams.tv${pages[i]}`);
      if (html) for (const id of extractYTIds(html)) allIds.set(id, pages[i]);
      if ((i+1) % 50 === 0) process.stdout.write(`\r  ${i+1}/${pages.length} pages, ${allIds.size} IDs`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\r  ✅ ${pages.length} pages → ${allIds.size} IDs`);
  return allIds;
}

// ─── Source 2: GeoJSON repo ───
async function fetchGeoJSON() {
  console.log('📡 Fetching GeoJSON repo...');
  try {
    const text = await fetchText('https://raw.githubusercontent.com/willytop8/Live-Environment-Streams/main/streams.geojson');
    if (!text) { console.log('  ⚠️ Failed to fetch'); return []; }
    const data = JSON.parse(text);
    const entries = [];
    for (const f of data.features || []) {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0];
      for (const key of Object.keys(p)) {
        for (const m of String(p[key]).matchAll(/(?:embed\/|watch\?v=|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/g)) {
          entries.push({
            videoId: m[1], name: p.name || `Camera ${m[1]}`,
            city: p.city || '', country: p.country_code || 'XX',
            lat: coords[1], lng: coords[0], type: p.environment || 'webcam',
          });
        }
      }
    }
    // Dedup
    const seen = new Set();
    const unique = entries.filter(e => { if (seen.has(e.videoId)) return false; seen.add(e.videoId); return true; });
    console.log(`  ✅ ${unique.length} YouTube entries`);
    return unique;
  } catch (e) { console.log(`  ⚠️ Error: ${e.message}`); return []; }
}

// ─── Source 3: Worldcamnetwork.live ───
async function scrapeWCN() {
  console.log('📡 Scraping worldcamnetwork.live...');
  const allIds = new Map();
  for (const p of ['/', '/city/', '/skyline/', '/traffic/', '/beach/', '/port/', '/airport/']) {
    const html = await fetchText(`https://worldcamnetwork.live${p}`);
    if (html) for (const id of extractYTIds(html)) allIds.set(id, p);
  }
  console.log(`  ✅ ${allIds.size} IDs`);
  return allIds;
}

// ─── Location enrichment ───
const CITY_DB = {
  'tokyo':{c:'Tokyo',cc:'JP',la:35.6762,lo:139.6503},'shibuya':{c:'Tokyo',cc:'JP',la:35.6595,lo:139.7004},
  'shinjuku':{c:'Tokyo',cc:'JP',la:35.6938,lo:139.7034},'osaka':{c:'Osaka',cc:'JP',la:34.6937,lo:135.5023},
  'kyoto':{c:'Kyoto',cc:'JP',la:35.0116,lo:135.7681},'sapporo':{c:'Sapporo',cc:'JP',la:43.0618,lo:141.3545},
  'fukuoka':{c:'Fukuoka',cc:'JP',la:33.5904,lo:130.4017},'nagoya':{c:'Nagoya',cc:'JP',la:35.1815,lo:136.9066},
  'hiroshima':{c:'Hiroshima',cc:'JP',la:34.3853,lo:132.4553},'yokohama':{c:'Yokohama',cc:'JP',la:35.4437,lo:139.638},
  'okinawa':{c:'Naha',cc:'JP',la:26.3344,lo:127.7672},'sendai':{c:'Sendai',cc:'JP',la:38.2682,lo:140.8694},
  'fuji':{c:'Fuji',cc:'JP',la:35.3606,lo:138.7274},'kagoshima':{c:'Kagoshima',cc:'JP',la:31.5966,lo:130.5571},
  'japan':{c:'Tokyo',cc:'JP',la:35.6762,lo:139.6503},
  'seoul':{c:'Seoul',cc:'KR',la:37.5665,lo:126.978},'busan':{c:'Busan',cc:'KR',la:35.1796,lo:129.0756},
  'korea':{c:'Seoul',cc:'KR',la:37.5665,lo:126.978},
  'beijing':{c:'Beijing',cc:'CN',la:39.9042,lo:116.4074},'shanghai':{c:'Shanghai',cc:'CN',la:31.2304,lo:121.4737},
  'hong kong':{c:'Hong Kong',cc:'HK',la:22.3193,lo:114.1694},'taipei':{c:'Taipei',cc:'TW',la:25.033,lo:121.5654},
  'bangkok':{c:'Bangkok',cc:'TH',la:13.7563,lo:100.5018},'pattaya':{c:'Pattaya',cc:'TH',la:12.9236,lo:100.8825},
  'phuket':{c:'Phuket',cc:'TH',la:7.8804,lo:98.3923},'singapore':{c:'Singapore',cc:'SG',la:1.3521,lo:103.8198},
  'kuala lumpur':{c:'Kuala Lumpur',cc:'MY',la:3.139,lo:101.6869},
  'bali':{c:'Bali',cc:'ID',la:-8.3405,lo:115.092},'jakarta':{c:'Jakarta',cc:'ID',la:-6.2088,lo:106.8456},
  'manila':{c:'Manila',cc:'PH',la:14.5995,lo:120.9842},'cebu':{c:'Cebu',cc:'PH',la:10.3157,lo:123.8854},
  'mumbai':{c:'Mumbai',cc:'IN',la:19.076,lo:72.8777},'delhi':{c:'New Delhi',cc:'IN',la:28.6139,lo:77.209},
  'dubai':{c:'Dubai',cc:'AE',la:25.2048,lo:55.2708},'istanbul':{c:'Istanbul',cc:'TR',la:41.0082,lo:28.9784},
  'jerusalem':{c:'Jerusalem',cc:'IL',la:31.7683,lo:35.2137},'tel aviv':{c:'Tel Aviv',cc:'IL',la:32.0853,lo:34.7818},
  'mecca':{c:'Mecca',cc:'SA',la:21.4225,lo:39.8262},'makkah':{c:'Mecca',cc:'SA',la:21.4225,lo:39.8262},
  'london':{c:'London',cc:'GB',la:51.5074,lo:-0.1278},'edinburgh':{c:'Edinburgh',cc:'GB',la:55.9533,lo:-3.1883},
  'paris':{c:'Paris',cc:'FR',la:48.8566,lo:2.3522},'eiffel':{c:'Paris',cc:'FR',la:48.8584,lo:2.2945},
  'nice':{c:'Nice',cc:'FR',la:43.7102,lo:7.262},'marseille':{c:'Marseille',cc:'FR',la:43.2965,lo:5.3698},
  'rome':{c:'Rome',cc:'IT',la:41.9028,lo:12.4964},'venice':{c:'Venice',cc:'IT',la:45.4408,lo:12.3155},
  'milan':{c:'Milan',cc:'IT',la:45.4642,lo:9.19},'naples':{c:'Naples',cc:'IT',la:40.8518,lo:14.2681},
  'florence':{c:'Florence',cc:'IT',la:43.7696,lo:11.2558},'catania':{c:'Catania',cc:'IT',la:37.5079,lo:15.083},
  'barcelona':{c:'Barcelona',cc:'ES',la:41.3874,lo:2.1686},'madrid':{c:'Madrid',cc:'ES',la:40.4168,lo:-3.7038},
  'tenerife':{c:'Tenerife',cc:'ES',la:28.2916,lo:-16.6291},'malaga':{c:'Malaga',cc:'ES',la:36.7213,lo:-4.4214},
  'berlin':{c:'Berlin',cc:'DE',la:52.52,lo:13.405},'munich':{c:'Munich',cc:'DE',la:48.1351,lo:11.582},
  'hamburg':{c:'Hamburg',cc:'DE',la:53.5511,lo:9.9937},'frankfurt':{c:'Frankfurt',cc:'DE',la:50.1109,lo:8.6821},
  'amsterdam':{c:'Amsterdam',cc:'NL',la:52.3676,lo:4.9041},'rotterdam':{c:'Rotterdam',cc:'NL',la:51.9225,lo:4.4792},
  'oslo':{c:'Oslo',cc:'NO',la:59.9139,lo:10.7522},'stockholm':{c:'Stockholm',cc:'SE',la:59.3293,lo:18.0686},
  'helsinki':{c:'Helsinki',cc:'FI',la:60.1699,lo:24.9384},'copenhagen':{c:'Copenhagen',cc:'DK',la:55.6761,lo:12.5683},
  'reykjavik':{c:'Reykjavik',cc:'IS',la:64.1466,lo:-21.9426},'iceland':{c:'Reykjavik',cc:'IS',la:64.1466,lo:-21.9426},
  'prague':{c:'Prague',cc:'CZ',la:50.0755,lo:14.4378},'budapest':{c:'Budapest',cc:'HU',la:47.4979,lo:19.0402},
  'warsaw':{c:'Warsaw',cc:'PL',la:52.2297,lo:21.0122},'vienna':{c:'Vienna',cc:'AT',la:48.2082,lo:16.3738},
  'zurich':{c:'Zurich',cc:'CH',la:47.3769,lo:8.5417},'lisbon':{c:'Lisbon',cc:'PT',la:38.7223,lo:-9.1393},
  'athens':{c:'Athens',cc:'GR',la:37.9838,lo:23.7275},'santorini':{c:'Santorini',cc:'GR',la:36.3932,lo:25.4615},
  'dubrovnik':{c:'Dubrovnik',cc:'HR',la:42.6507,lo:18.0944},'dublin':{c:'Dublin',cc:'IE',la:53.3498,lo:-6.2603},
  'brussels':{c:'Brussels',cc:'BE',la:50.8503,lo:4.3517},'moscow':{c:'Moscow',cc:'RU',la:55.7558,lo:37.6173},
  'new york':{c:'New York',cc:'US',la:40.7128,lo:-74.006},'times square':{c:'New York',cc:'US',la:40.758,lo:-73.9855},
  'los angeles':{c:'Los Angeles',cc:'US',la:34.0522,lo:-118.2437},'san francisco':{c:'San Francisco',cc:'US',la:37.7749,lo:-122.4194},
  'chicago':{c:'Chicago',cc:'US',la:41.8781,lo:-87.6298},'miami':{c:'Miami',cc:'US',la:25.7617,lo:-80.1918},
  'las vegas':{c:'Las Vegas',cc:'US',la:36.1699,lo:-115.1398},'seattle':{c:'Seattle',cc:'US',la:47.6062,lo:-122.3321},
  'san diego':{c:'San Diego',cc:'US',la:32.7157,lo:-117.1611},'washington':{c:'Washington D.C.',cc:'US',la:38.9072,lo:-77.0369},
  'boston':{c:'Boston',cc:'US',la:42.3601,lo:-71.0589},'nashville':{c:'Nashville',cc:'US',la:36.1627,lo:-86.7816},
  'new orleans':{c:'New Orleans',cc:'US',la:29.9574,lo:-90.0682},'key west':{c:'Key West',cc:'US',la:24.5557,lo:-81.7826},
  'honolulu':{c:'Honolulu',cc:'US',la:21.3069,lo:-157.8583},'waikiki':{c:'Honolulu',cc:'US',la:21.2769,lo:-157.8268},
  'hawaii':{c:'Honolulu',cc:'US',la:21.3069,lo:-157.8583},'denver':{c:'Denver',cc:'US',la:39.7392,lo:-104.9903},
  'houston':{c:'Houston',cc:'US',la:29.7604,lo:-95.3698},'dallas':{c:'Dallas',cc:'US',la:32.7767,lo:-96.797},
  'austin':{c:'Austin',cc:'US',la:30.2672,lo:-97.7431},'portland':{c:'Portland',cc:'US',la:45.5051,lo:-122.675},
  'toronto':{c:'Toronto',cc:'CA',la:43.6532,lo:-79.3832},'vancouver':{c:'Vancouver',cc:'CA',la:49.2827,lo:-123.1207},
  'montreal':{c:'Montreal',cc:'CA',la:45.5017,lo:-73.5673},'niagara':{c:'Niagara Falls',cc:'CA',la:43.0896,lo:-79.0849},
  'mexico city':{c:'Mexico City',cc:'MX',la:19.4326,lo:-99.1332},'cancun':{c:'Cancún',cc:'MX',la:21.1619,lo:-86.8515},
  'rio de janeiro':{c:'Rio de Janeiro',cc:'BR',la:-22.9068,lo:-43.1729},'copacabana':{c:'Rio de Janeiro',cc:'BR',la:-22.9711,lo:-43.1822},
  'são paulo':{c:'São Paulo',cc:'BR',la:-23.5505,lo:-46.6333},'sao paulo':{c:'São Paulo',cc:'BR',la:-23.5505,lo:-46.6333},
  'buenos aires':{c:'Buenos Aires',cc:'AR',la:-34.6037,lo:-58.3816},'lima':{c:'Lima',cc:'PE',la:-12.0464,lo:-77.0428},
  'santiago':{c:'Santiago',cc:'CL',la:-33.4489,lo:-70.6693},'bogota':{c:'Bogotá',cc:'CO',la:4.711,lo:-74.0721},
  'cape town':{c:'Cape Town',cc:'ZA',la:-33.9249,lo:18.4241},'johannesburg':{c:'Johannesburg',cc:'ZA',la:-26.2041,lo:28.0473},
  'nairobi':{c:'Nairobi',cc:'KE',la:-1.2921,lo:36.8219},'cairo':{c:'Cairo',cc:'EG',la:30.0444,lo:31.2357},
  'marrakech':{c:'Marrakech',cc:'MA',la:31.6295,lo:-7.9811},'lagos':{c:'Lagos',cc:'NG',la:6.5244,lo:3.3792},
  'sydney':{c:'Sydney',cc:'AU',la:-33.8688,lo:151.2093},'melbourne':{c:'Melbourne',cc:'AU',la:-37.8136,lo:144.9631},
  'brisbane':{c:'Brisbane',cc:'AU',la:-27.4698,lo:153.0251},'perth':{c:'Perth',cc:'AU',la:-31.9505,lo:115.8605},
  'auckland':{c:'Auckland',cc:'NZ',la:-36.8485,lo:174.7633},'wellington':{c:'Wellington',cc:'NZ',la:-41.2865,lo:174.7762},
  'bergen':{c:'Bergen',cc:'NO',la:60.3913,lo:5.3221},'galway':{c:'Galway',cc:'IE',la:53.2707,lo:-9.0568},
  'cork':{c:'Cork',cc:'IE',la:51.8985,lo:-8.4756},'plymouth':{c:'Plymouth',cc:'GB',la:50.3755,lo:-4.1427},
  'webcam':{c:'',cc:'',la:0,lo:0},
};

const WC_COUNTRY = {
  'japan':{cc:'JP',la:35.6762,lo:139.6503},'south-korea':{cc:'KR',la:37.5665,lo:126.978},
  'united-states':{cc:'US',la:40.7128,lo:-74.006},'united-kingdom':{cc:'GB',la:51.5074,lo:-0.1278},
  'france':{cc:'FR',la:48.8566,lo:2.3522},'germany':{cc:'DE',la:52.52,lo:13.405},
  'italy':{cc:'IT',la:41.9028,lo:12.4964},'spain':{cc:'ES',la:40.4168,lo:-3.7038},
  'netherlands':{cc:'NL',la:52.3676,lo:4.9041},'brazil':{cc:'BR',la:-22.9068,lo:-43.1729},
  'canada':{cc:'CA',la:43.6532,lo:-79.3832},'australia':{cc:'AU',la:-33.8688,lo:151.2093},
  'thailand':{cc:'TH',la:13.7563,lo:100.5018},'israel':{cc:'IL',la:31.7683,lo:35.2137},
  'ireland':{cc:'IE',la:53.3498,lo:-6.2603},'turkey':{cc:'TR',la:41.0082,lo:28.9784},
  'norway':{cc:'NO',la:59.9139,lo:10.7522},'sweden':{cc:'SE',la:59.3293,lo:18.0686},
  'china':{cc:'CN',la:31.2304,lo:121.4737},'south-africa':{cc:'ZA',la:-33.9249,lo:18.4241},
  'mexico':{cc:'MX',la:19.4326,lo:-99.1332},'croatia':{cc:'HR',la:42.6507,lo:18.0944},
  'greece':{cc:'GR',la:37.9838,lo:23.7275},'portugal':{cc:'PT',la:38.7223,lo:-9.1393},
  'india':{cc:'IN',la:19.076,lo:72.8777},'russia':{cc:'RU',la:55.7558,lo:37.6173},
  'poland':{cc:'PL',la:52.2297,lo:21.0122},'hungary':{cc:'HU',la:47.4979,lo:19.0402},
  'romania':{cc:'RO',la:44.4268,lo:26.1025},'czech-republic':{cc:'CZ',la:50.0755,lo:14.4378},
  'finland':{cc:'FI',la:60.1699,lo:24.9384},'denmark':{cc:'DK',la:55.6761,lo:12.5683},
  'austria':{cc:'AT',la:48.2082,lo:16.3738},'switzerland':{cc:'CH',la:47.3769,lo:8.5417},
  'iceland':{cc:'IS',la:64.1466,lo:-21.9426},'philippines':{cc:'PH',la:14.5995,lo:120.9842},
  'malaysia':{cc:'MY',la:3.139,lo:101.6869},'indonesia':{cc:'ID',la:-6.2088,lo:106.8456},
  'singapore':{cc:'SG',la:1.3521,lo:103.8198},'vietnam':{cc:'VN',la:21.0278,lo:105.8342},
  'taiwan':{cc:'TW',la:25.033,lo:121.5654},'new-zealand':{cc:'NZ',la:-36.8485,lo:174.7633},
  'argentina':{cc:'AR',la:-34.6037,lo:-58.3816},'colombia':{cc:'CO',la:4.711,lo:-74.0721},
  'chile':{cc:'CL',la:-33.4489,lo:-70.6693},'peru':{cc:'PE',la:-12.0464,lo:-77.0428},
  'egypt':{cc:'EG',la:30.0444,lo:31.2357},'morocco':{cc:'MA',la:31.6295,lo:-7.9811},
  'kenya':{cc:'KE',la:-1.2921,lo:36.8219},'belgium':{cc:'BE',la:50.8503,lo:4.3517},
};

function enrichFromTitle(title, sourcePath) {
  const t = (title || '').toLowerCase();
  for (const [kw, loc] of Object.entries(CITY_DB)) {
    if (kw && t.includes(kw) && loc.cc) {
      return { city: loc.c, country: loc.cc, lat: loc.la + (Math.random()-0.5)*0.02, lng: loc.lo + (Math.random()-0.5)*0.02 };
    }
  }
  // Try source path
  const sp = (sourcePath || '').toLowerCase().replace(/^\//, '');
  for (const [kw, loc] of Object.entries(WC_COUNTRY)) {
    if (sp.startsWith(kw) || sp.includes('/' + kw)) {
      return { city: kw.split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' '), country: loc.cc, lat: loc.la + (Math.random()-0.5)*0.04, lng: loc.lo + (Math.random()-0.5)*0.04 };
    }
  }
  return null;
}

function escapeStr(s) { return (s||'').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

async function main() {
  // Collect from sources
  const [wcIds, geojson, wcnIds] = await Promise.all([
    scrapeWorldcams(),
    fetchGeoJSON(),
    scrapeWCN(),
  ]);

  // Merge all new candidates
  const candidates = new Map();

  // GeoJSON (best metadata)
  for (const e of geojson) {
    if (!existingIds.has(e.videoId) && !candidates.has(e.videoId)) candidates.set(e.videoId, e);
  }
  console.log(`\nAfter GeoJSON: ${candidates.size} new`);

  // Worldcams
  for (const [id, src] of wcIds) {
    if (!existingIds.has(id) && !candidates.has(id))
      candidates.set(id, { videoId: id, name: `Webcam`, city: '', country: 'XX', lat: 0, lng: 0, type: 'webcam', _source: src });
  }
  console.log(`After worldcams: ${candidates.size} new`);

  // WCN
  for (const [id, src] of wcnIds) {
    if (!existingIds.has(id) && !candidates.has(id))
      candidates.set(id, { videoId: id, name: `Webcam`, city: '', country: 'XX', lat: 0, lng: 0, type: 'webcam', _source: src });
  }
  console.log(`After WCN: ${candidates.size} new`);

  // Validate
  const toValidate = Array.from(candidates.values());
  console.log(`\n🔍 Validating ${toValidate.length} new candidates...`);

  const results = [];
  let idx = 0, valid = 0, invalid = 0;
  async function worker() {
    while (idx < toValidate.length) {
      const i = idx++;
      const r = await validateId(toValidate[i].videoId);
      results[i] = { ...toValidate[i], ...r };
      if (r.valid) valid++; else invalid++;
      if ((i+1)%50===0 || i+1===toValidate.length)
        process.stdout.write(`\r  [${Math.round((i+1)/toValidate.length*100)}%] ✅${valid} ❌${invalid} (${i+1}/${toValidate.length})`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, toValidate.length) }, () => worker()));
  console.log();

  const validResults = results.filter(r => r.valid);
  console.log(`\n✅ Valid new: ${validResults.length}`);
  console.log(`❌ Invalid: ${results.length - validResults.length}`);

  // Enrich locations
  let enrichedCount = 0;
  for (const e of validResults) {
    if (e.title) e.name = e.title;
    const loc = enrichFromTitle(e.name || e.title, e._source);
    if (loc) { Object.assign(e, loc); enrichedCount++; }
  }
  console.log(`🌍 Enriched ${enrichedCount} locations from titles`);

  // Filter: only include entries with location data
  const withLocation = validResults.filter(e => e.country !== 'XX' && e.lat !== 0);
  const noLocation = validResults.filter(e => e.country === 'XX' || e.lat === 0);
  console.log(`📊 With location: ${withLocation.length}`);
  console.log(`📊 Without location: ${noLocation.length}`);

  // Now append to publicCCTVs.ts
  console.log(`\n📝 Appending ${withLocation.length} entries to publicCCTVs.ts...`);

  const existingContent = readFileSync(resolve(ROOT, 'src/data/publicCCTVs.ts'), 'utf-8');
  // Remove the closing ];
  const contentBase = existingContent.replace(/\];\s*$/, '');

  // Generate entries
  const usedIds = new Set();
  for (const m of existingContent.matchAll(/id:\s*'([^']+)'/g)) usedIds.add(m[1]);

  const newLines = [`  // ═══════════════════════════════════════════════════`,
    `  // GEO-001: ${withLocation.length} new cameras added ${new Date().toISOString().split('T')[0]}`,
    `  // ═══════════════════════════════════════════════════`];

  for (const e of withLocation) {
    let id = slugify(`${e.city || 'cam'}-${(e.name || e.videoId).substring(0, 30)}`);
    if (!id) id = `cam-${e.videoId}`;
    let finalId = id;
    let suffix = 2;
    while (usedIds.has(finalId)) { finalId = `${id}-${suffix++}`; }
    usedIds.add(finalId);

    newLines.push(`  {`);
    newLines.push(`    id: '${escapeStr(finalId)}',`);
    newLines.push(`    name: '${escapeStr(e.name || `Camera ${e.videoId}`)}',`);
    newLines.push(`    city: '${escapeStr(e.city || 'Unknown')}',`);
    newLines.push(`    country: '${escapeStr(e.country)}',`);
    newLines.push(`    lat: ${e.lat},`);
    newLines.push(`    lng: ${e.lng},`);
    newLines.push(`    embedUrl: 'https://www.youtube.com/embed/${e.videoId}?autoplay=1&mute=1',`);
    newLines.push(`    type: '${e.type || 'webcam'}',`);
    newLines.push(`    source: 'static',`);
    newLines.push(`  },`);
  }

  const finalContent = contentBase + newLines.join('\n') + '\n];\n';

  // Update the comment at the top
  const finalWithCount = finalContent.replace(
    /\d+ cameras \(excludes/,
    `${existingIds.size + withLocation.length} cameras (excludes`
  );

  writeFileSync(resolve(ROOT, 'src/data/publicCCTVs.ts'), finalWithCount);

  // Count final
  const finalIds = new Set();
  for (const m of finalWithCount.matchAll(/embed\/([a-zA-Z0-9_-]+)/g)) finalIds.add(m[1]);

  console.log(`\n✅ publicCCTVs.ts updated!`);
  console.log(`📊 Previous: ${existingIds.size} cameras`);
  console.log(`📊 Added: ${withLocation.length} cameras`);
  console.log(`📊 New total: ${finalIds.size} cameras`);
  console.log(`📊 File size: ${(Buffer.byteLength(finalWithCount) / 1024).toFixed(1)} KB`);

  // Also save the no-location entries for potential future enrichment
  writeFileSync(resolve(ROOT, 'scripts/underrepresented-streams.json'),
    JSON.stringify(noLocation.map(({valid:_,title,...r})=>({...r,name:title||r.name})), null, 2));
  console.log(`💾 Saved ${noLocation.length} unlocated streams to scripts/underrepresented-streams.json`);
}

main().catch(console.error);
