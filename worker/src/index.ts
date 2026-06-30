// Watchdex ingest — Cloudflare Cron Worker (ALT to GitHub Actions).
// AniList 403-blocks CF Worker IPs, so this path needs RELAY_URL (a non-CF
// relay, ingest/relay.ts). Same spec write model as ingest/push-r2.mjs:
// idempotent rev via hash, immutable meta.v{rev} first, head pointer last —
// but writes via the R2 binding (no S3 creds). GitHub Actions is the default;
// keep this only if you set up a relay.
import { fetchList, enrich } from '../../ingest/lib/jikan.js';
import { paths, hash, buildEntities, buildListings } from '../../ingest/lib/contract.js';

interface R2Bucket {
	get(key: string): Promise<{ text(): Promise<string> } | null>;
	put(key: string, value: string, opts?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>;
	delete(key: string): Promise<unknown>;
}
interface Env { DATA: R2Bucket; AIRING_PAGES?: string; POPULAR_PAGES?: string; ENRICH_LIMIT?: string; INGEST_SECRET?: string }

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

async function ingest(env: Env): Promise<{ titles: number; changed: number; enriched: number }> {
	const air = Number(env.AIRING_PAGES ?? 2), pop = Number(env.POPULAR_PAGES ?? 2), lim = Number(env.ENRICH_LIMIT ?? 30);
	const get = async (k: string) => (await env.DATA.get(k))?.text() ?? null;
	const put = (k: string, v: string) => env.DATA.put(k, v, { httpMetadata: { contentType: 'application/json', cacheControl: cacheFor(k) } });
	const now = Math.floor(Date.now() / 1000);
	const idx = JSON.parse((await get('v1/_heads.json')) || '{}'); // { id: { rev, hash, enriched } }

	// 1. fast list (schedule/feed) — no per-entity calls
	const core = await fetchList({ airingPages: air, popularPages: pop, throttle: 380 });

	// 2. carry prev enrichment forward; enrich un-enriched ones up to budget
	//    (progressive — every run fully completes a slice). Schedule stays fresh.
	let budget = lim, enriched = 0;
	const metas: any[] = [];
	for (const c of core) {
		const prev = idx[c.id];
		let meta = c;
		if (prev) {
			const pm = JSON.parse((await get(key(paths.entityMeta(c.id, prev.rev)))) || 'null');
			if (pm) meta = { ...c, banner: c.banner ?? pm.banner, characters: pm.characters, valueAdd: pm.valueAdd, availability: pm.availability };
			if (!prev.enriched && budget > 0) { await enrich(meta); meta._enriched = true; budget--; enriched++; }
			else if (prev.enriched) meta._enriched = true;
		} else if (budget > 0) {
			await enrich(meta); meta._enriched = true; budget--; enriched++;
		}
		metas.push(meta);
	}

	const entities = buildEntities(metas);
	const { pointers, calendars, searchIndex } = buildListings(metas);
	const enrichedOf = new Map(metas.map((m) => [m.id, !!m._enriched]));

	// 3. immutable meta.v{rev} first (only changed), pointer head last
	const headPuts: [string, string][] = [];
	let changed = 0;
	for (const e of entities) {
		const h = hash(JSON.stringify(e));
		const prev = idx[e.id];
		const en = enrichedOf.get(e.id) ?? prev?.enriched ?? false;
		if (prev && prev.hash === h && prev.enriched === en) continue;
		const rev = (prev?.rev ?? 0) + 1;
		idx[e.id] = { rev, hash: h, enriched: en };
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
	return { titles: core.length, changed, enriched };
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
