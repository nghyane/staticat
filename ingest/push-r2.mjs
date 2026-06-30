// Incremental ingest -> R2, bám spec (docs/ingestion.md write order). Runs OFF
// Cloudflare (GitHub Actions) since AniList 403-blocks CF Worker IPs.
//
// Idempotent (hash-based): a per-entity content hash decides rev. Unchanged
// entities write NOTHING; changed ones get a NEW immutable meta.v{rev+1} then a
// head.json pointer bump. Immutable FIRST, pointer LAST. State lives in R2
// (_heads.json index) -> the job is stateless.
//
// Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, PAGES
import { AwsClient } from 'aws4fetch';
import { fetchAniList } from './lib/anilist.js';
import { paths, hash, buildEntities, buildListings } from './lib/contract.js';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET = 'watchdex-data', PAGES = '3' } = process.env;
const BASE = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
const aws = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY });

const POINTER = 'public, max-age=30, stale-while-revalidate=300, stale-if-error=86400';
const POPULAR = 'public, max-age=300, stale-while-revalidate=3600';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const CALENDAR = 'public, max-age=1800, stale-while-revalidate=86400';
const cacheFor = (k) =>
	/\.v\d+\.json$/.test(k) ? IMMUTABLE
	: /\/head\.json$|\/feed\/latest\/0\.json$|\/search\/head\.json$/.test(k) ? POINTER
	: k.includes('/feed/popular/') ? POPULAR
	: k.includes('/calendar/') ? CALENDAR
	: POINTER;

const key = (p) => p.replace(/^\//, '');
const r2get = async (k) => { const r = await aws.fetch(`${BASE}/${k}`); return r.ok ? r.text() : null; };
const r2put = (k, body, cc) => aws.fetch(`${BASE}/${k}`, { method: 'PUT', body, headers: { 'content-type': 'application/json', 'cache-control': cc } });
const r2del = (k) => aws.fetch(`${BASE}/${k}`, { method: 'DELETE' });
const chunked = async (items, fn, size = 20) => { for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn)); };
const now = Math.floor(Date.now() / 1000);

// 1. snapshot + derive
let seed = [];
for (let p = 1; p <= Number(PAGES); p++) seed.push(...(await fetchAniList(50, p)));
seed = [...new Map(seed.map((e) => [e.id, e])).values()];
const entities = buildEntities(seed);
const { pointers, calendars, searchIndex } = buildListings(seed);

// 2. writer state (1 read instead of N): { id: { rev, hash } }
const idx = JSON.parse((await r2get('v1/_heads.json')) || '{}');

// 3. entities — immutable meta.v{rev} FIRST (only when content changed)
const headPuts = [];
let changed = 0;
for (const e of entities) {
	const h = hash(JSON.stringify(e));
	const prev = idx[e.id];
	if (prev && prev.hash === h) continue; // unchanged → write nothing
	const rev = (prev?.rev ?? 0) + 1;
	idx[e.id] = { rev, hash: h };
	await r2put(key(paths.entityMeta(e.id, rev)), JSON.stringify({ rev, ...e }), IMMUTABLE);
	headPuts.push([key(paths.entityHead(e.id)), JSON.stringify({ id: e.id, rev, updatedAt: now, hash: h })]);
	changed++;
}

// 4. orphans (in index, no longer in snapshot) → drop pointer
const live = new Set(entities.map((e) => e.id));
const orphans = Object.keys(idx).filter((id) => !live.has(id));
for (const id of orphans) { await r2del(key(paths.entityHead(id))); delete idx[id]; }

// 5. search index — immutable index.v{ver} only when content changed
const sHead = JSON.parse((await r2get(key(paths.searchHead()))) || 'null');
const sHash = hash(JSON.stringify(searchIndex));
if (!sHead || sHead.hash !== sHash) {
	const ver = (sHead?.ver ?? 0) + 1;
	await r2put(key(paths.searchIndex(ver)), JSON.stringify(searchIndex), IMMUTABLE);
	pointers.set(paths.searchHead(), { ver, hash: sHash }); // pointer (written below)
}

// 6. listings (denormalized, rebuilt) + pointers LAST
await chunked([...pointers, ...calendars], ([p, v]) => r2put(key(p), JSON.stringify(v), cacheFor(key(p))));
await chunked(headPuts, ([k, body]) => r2put(k, body, POINTER));
await r2put('v1/_heads.json', JSON.stringify(idx), 'no-store');

console.log(`ingest: ${seed.length} titles | changed ${changed} | orphans ${orphans.length}`);
