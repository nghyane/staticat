// Watchdex ingest — Cloudflare Cron Worker (ALT to GitHub Actions).
// AniList 403-blocks CF Worker IPs, so this path needs RELAY_URL (a non-CF
// relay, ingest/relay.ts). Same spec write model as ingest/push-r2.mjs:
// idempotent rev via hash, immutable meta.v{rev} first, head pointer last —
// but writes via the R2 binding (no S3 creds). GitHub Actions is the default;
// keep this only if you set up a relay.
import { fetchAniList, fetchPopular } from '../../ingest/lib/anilist.js';
import { paths, hash, buildEntities, buildListings } from '../../ingest/lib/contract.js';

interface R2Bucket {
	get(key: string): Promise<{ text(): Promise<string> } | null>;
	put(key: string, value: string, opts?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>;
	delete(key: string): Promise<unknown>;
}
interface Env { DATA: R2Bucket; AIRING_PAGES?: string; POPULAR_PAGES?: string; INGEST_SECRET?: string; RELAY_URL?: string }

const POINTER = 'public, max-age=30, stale-while-revalidate=300, stale-if-error=86400';
const POPULAR = 'public, max-age=300, stale-while-revalidate=3600';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const CALENDAR = 'public, max-age=1800, stale-while-revalidate=86400';
const cacheFor = (k: string) =>
	/\.v\d+\.json$/.test(k) ? IMMUTABLE
	: /\/head\.json$|\/feed\/latest\/0\.json$|\/search\/head\.json$/.test(k) ? POINTER
	: k.includes('/feed/popular/') ? POPULAR
	: k.includes('/calendar/') ? CALENDAR
	: POINTER;
const key = (p: string) => p.replace(/^\//, '');

async function ingest(env: Env): Promise<{ titles: number; changed: number }> {
	const air = Number(env.AIRING_PAGES ?? 3), pop = Number(env.POPULAR_PAGES ?? 4);
	let seed: any[] = [];
	for (let p = 1; p <= air; p++) seed.push(...(await fetchAniList(50, p, env.RELAY_URL ?? '')));
	for (let p = 1; p <= pop; p++) seed.push(...(await fetchPopular(50, p, env.RELAY_URL ?? '')));
	seed = [...new Map(seed.map((e) => [e.id, e])).values()];

	const entities = buildEntities(seed);
	const { pointers, calendars, searchIndex } = buildListings(seed);
	const get = async (k: string) => (await env.DATA.get(k))?.text() ?? null;
	const put = (k: string, v: string) => env.DATA.put(k, v, { httpMetadata: { contentType: 'application/json', cacheControl: cacheFor(k) } });
	const now = Math.floor(Date.now() / 1000);

	const idx = JSON.parse((await get('v1/_heads.json')) || '{}');
	const headPuts: [string, string][] = [];
	let changed = 0;
	for (const e of entities) {
		const h = hash(JSON.stringify(e));
		const prev = idx[e.id];
		if (prev && prev.hash === h) continue;
		const rev = (prev?.rev ?? 0) + 1;
		idx[e.id] = { rev, hash: h };
		await put(key(paths.entityMeta(e.id, rev)), JSON.stringify({ rev, ...e }));
		headPuts.push([key(paths.entityHead(e.id)), JSON.stringify({ id: e.id, rev, updatedAt: now, hash: h })]);
		changed++;
	}
	const live = new Set(entities.map((e) => e.id));
	for (const id of Object.keys(idx).filter((i) => !live.has(i))) { await env.DATA.delete(key(paths.entityHead(id))); delete idx[id]; }

	const sHead = JSON.parse((await get(key(paths.searchHead()))) || 'null');
	const sHash = hash(JSON.stringify(searchIndex));
	if (!sHead || sHead.hash !== sHash) {
		const ver = (sHead?.ver ?? 0) + 1;
		await put(key(paths.searchIndex(ver)), JSON.stringify(searchIndex));
		pointers.set(paths.searchHead(), { ver, hash: sHash });
	}
	for (const [p, v] of [...pointers, ...calendars]) await put(key(p), JSON.stringify(v));
	for (const [k, body] of headPuts) await put(k, body);
	await env.DATA.put('v1/_heads.json', JSON.stringify(idx), { httpMetadata: { cacheControl: 'no-store' } });
	return { titles: seed.length, changed };
}

export default {
	async scheduled(_e: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
		ctx.waitUntil(ingest(env).then((r) => console.log(`ingest: ${r.titles} titles, ${r.changed} changed`)));
	},
	async fetch(req: Request, env: Env): Promise<Response> {
		if (new URL(req.url).pathname === '/ingest') {
			if (env.INGEST_SECRET && req.headers.get('authorization') !== `Bearer ${env.INGEST_SECRET}`) return new Response('unauthorized', { status: 401 });
			try { return Response.json({ ok: true, ...(await ingest(env)) }); }
			catch (e) { return Response.json({ ok: false, error: String(e) }, { status: 500 }); }
		}
		return new Response('watchdex ingest worker', { status: 200 });
	},
};
