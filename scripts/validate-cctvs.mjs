#!/usr/bin/env node
/**
 * CCTV Stream Validator
 * Validates YouTube live stream availability using oEmbed API
 * Usage: node scripts/validate-cctvs.mjs [--file path] [--existing] [--report]
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 20;
const OEMBED_URL = 'https://www.youtube.com/oembed';
const TIMEOUT_MS = 10000;

// Parse CLI args
const args = process.argv.slice(2);
const flags = {
  file: args.find((_, i) => args[i - 1] === '--file') || null,
  existing: args.includes('--existing'),
  report: args.includes('--report'),
  removeInvalid: args.includes('--remove-invalid'),
};

/**
 * Extract YouTube video ID from embed URL
 */
function extractVideoId(embedUrl) {
  const match = embedUrl.match(/\/embed\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Check if a YouTube video is available via oEmbed
 * Returns: { valid: boolean, status: string, title?: string }
 */
async function checkYouTubeVideo(videoId) {
  const url = `${OEMBED_URL}?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GeoVision-CCTV-Validator/1.0' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return { valid: true, status: 'ok', title: data.title };
    } else if (res.status === 401 || res.status === 403) {
      return { valid: false, status: 'restricted' };
    } else if (res.status === 404) {
      return { valid: false, status: 'not_found' };
    } else {
      return { valid: false, status: `http_${res.status}` };
    }
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { valid: false, status: 'timeout' };
    }
    return { valid: false, status: 'error' };
  }
}

/**
 * Check non-YouTube URL via HEAD request
 */
async function checkNonYouTubeUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return { valid: res.ok, status: res.ok ? 'ok' : `http_${res.status}` };
  } catch (err) {
    clearTimeout(timeout);
    return { valid: false, status: err.name === 'AbortError' ? 'timeout' : 'error' };
  }
}

/**
 * Validate a single CCTV entry
 */
async function validateCCTV(cctv) {
  // Support both embedUrl format and direct videoId format
  const videoId = cctv.videoId || extractVideoId(cctv.embedUrl || '');
  if (videoId) {
    const result = await checkYouTubeVideo(videoId);
    return { ...cctv, videoId, ...result };
  } else if (cctv.embedUrl) {
    const result = await checkNonYouTubeUrl(cctv.embedUrl);
    return { ...cctv, videoId: null, ...result };
  } else {
    return { ...cctv, videoId: null, valid: false, status: 'no_url' };
  }
}

/**
 * Run validation with concurrency control
 */
async function validateAll(cctvs) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < cctvs.length) {
      const i = idx++;
      const result = await validateCCTV(cctvs[i]);
      results[i] = result;
      const symbol = result.valid ? '✓' : '✗';
      const pct = Math.round(((i + 1) / cctvs.length) * 100);
      process.stdout.write(`\r[${pct}%] ${symbol} ${cctvs[i].id || cctvs[i].name} (${result.status})`);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, cctvs.length) }, () => worker());
  await Promise.all(workers);
  process.stdout.write('\n');

  return results;
}

/**
 * Parse existing publicCCTVs.ts to extract CCTV data
 */
function parseExistingCCTVs() {
  const filePath = resolve(__dirname, '../src/data/publicCCTVs.ts');
  const content = readFileSync(filePath, 'utf-8');

  const cctvs = [];
  // Match each object in the array
  const regex = /\{[^}]*id:\s*'([^']+)'[^}]*name:\s*'([^']+)'[^}]*embedUrl:\s*'([^']+)'[^}]*\}/gs;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const block = match[0];
    const id = match[1];
    const name = match[2];
    const embedUrl = match[3];

    cctvs.push({ id, name, embedUrl });
  }

  return cctvs;
}

/**
 * Parse a JSON file with CCTV data
 */
function parseCCTVFile(filePath) {
  const content = readFileSync(resolve(filePath), 'utf-8');
  return JSON.parse(content);
}

// Main
async function main() {
  console.log('🎥 GeoVision CCTV Stream Validator\n');

  let cctvs;

  if (flags.existing) {
    console.log('📂 Validating existing PUBLIC_CCTVS...');
    cctvs = parseExistingCCTVs();
  } else if (flags.file) {
    console.log(`📂 Validating CCTVs from ${flags.file}...`);
    cctvs = parseCCTVFile(flags.file);
  } else {
    console.log('Usage:');
    console.log('  node validate-cctvs.mjs --existing          # Validate existing publicCCTVs.ts');
    console.log('  node validate-cctvs.mjs --file data.json    # Validate from JSON file');
    console.log('  Add --report to save JSON report');
    process.exit(0);
  }

  console.log(`Found ${cctvs.length} CCTVs to validate\n`);

  const results = await validateAll(cctvs);

  const valid = results.filter(r => r.valid);
  const invalid = results.filter(r => !r.valid);

  console.log(`\n📊 Results:`);
  console.log(`  ✅ Valid: ${valid.length}`);
  console.log(`  ❌ Invalid: ${invalid.length}`);
  console.log(`  📊 Pass rate: ${Math.round((valid.length / results.length) * 100)}%`);

  if (invalid.length > 0) {
    console.log(`\n❌ Invalid streams:`);
    for (const r of invalid) {
      console.log(`  - ${r.id || r.name}: ${r.status} (${r.embedUrl})`);
    }
  }

  if (flags.report) {
    const reportPath = resolve(__dirname, `../cctv-validation-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify({ valid, invalid, summary: { total: results.length, valid: valid.length, invalid: invalid.length } }, null, 2));
    console.log(`\n📝 Report saved to: ${reportPath}`);
  }

  // Output valid CCTVs for piping
  if (flags.file && !flags.existing) {
    const validPath = resolve(__dirname, `../cctv-validated.json`);
    writeFileSync(validPath, JSON.stringify(valid.map(({ videoId, valid: _, status, title, ...rest }) => rest), null, 2));
    console.log(`✅ Validated CCTVs saved to: ${validPath}`);
  }

  process.exit(invalid.length > 0 ? 1 : 0);
}

main().catch(console.error);
