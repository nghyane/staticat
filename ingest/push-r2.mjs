// Incremental ingest -> R2 (the WRITE side). Runs OFF Cloudflare (GitHub
// Actions / any non-CF node) since AniList 403-blocks CF Worker IPs.
//
// Pulls one AniList snapshot, assembles the /v1 layout, and writes ONLY the
// files that changed since last run (delta) via the R2 S3 API. Most entities
// are unchanged between runs, so a typical run touches home/index + a handful
// of entities + the hash map — not the whole catalog.
//
// Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, PAGES
// Run: npm i aws4fetch && node ingest/push-r2.mjs
import { AwsClient } from 'aws4fetch';
import { fetchAniList } from './lib/anilist.js';
import { assemble, diff } from './lib/contract.js';

const {
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_BUCKET = 'watchdex-data', PAGES = '3',
} = process.env;

const BASE = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
const aws = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY });

const POINTER = 'public, max-age=120, stale-while-revalidate=86400, stale-if-error=86400';
const ENTITY = 'public, max-age=300, stale-while-revalidate=86400';
const cacheFor = (k) => (/\/(home|index)\.json$|manifest\.json$/.test(k) ? POINTER : ENTITY);
const key = (p) => p.replace(/^\//, '');

const r2get = async (k) => { const r = await aws.fetch(`${BASE}/${k}`); return r.ok ? r.text() : null; };
const r2put = (k, body, cc) => aws.fetch(`${BASE}/${k}`, { method: 'PUT', body, headers: { 'content-type': 'application/json', 'cache-control': cc } });
const r2del = (k) => aws.fetch(`${BASE}/${k}`, { method: 'DELETE' });

// 1. snapshot
let seed = [];
for (let p = 1; p <= Number(PAGES); p++) seed.push(...(await fetchAniList(50, p)));
seed = [...new Map(seed.map((e) => [e.id, e])).values()];

// 2. assemble + diff against last run
const files = assemble({ anime: { seed, all: seed }, movie: { seed: [], all: [] }, game: { seed: [], all: [] } }, Date.now());
const prev = JSON.parse((await r2get('v1/_hashes.json')) || '{}');
const { puts, hashes, dels } = diff(files, prev);

// 3. write ONLY changed (bounded concurrency), then orphans, then the hash map
const entries = [...puts];
for (let i = 0; i < entries.length; i += 20) {
  await Promise.all(entries.slice(i, i + 20).map(([p, json]) => r2put(key(p), json, cacheFor(p))));
}
await Promise.all(dels.filter((p) => p !== '/v1/_hashes.json').map((p) => r2del(key(p))));
await r2put('v1/_hashes.json', JSON.stringify(hashes), 'no-store');

console.log(`ingest: ${seed.length} titles | changed ${puts.size}/${files.size} | deleted ${dels.length}`);
