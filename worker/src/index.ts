// Watchdex ingest — Cloudflare Cron Worker (the WRITE side).
// Schedule (wrangler.toml) -> pull one AniList snapshot -> assemble() the SAME
// R2 layout the SPA reads -> put to R2 (binding DATA) with per-file cache
// headers. No rebuild on data change: the SPA fetches fresh from R2 (SWR).
// The frontend never calls AniList -> read path has no third-party API dep.
import { fetchAniList } from '../../ingest/lib/anilist.js';
import { assemble } from '../../ingest/lib/contract.js';

interface R2Bucket {
	put(key: string, value: string, opts?: { httpMetadata?: { contentType?: string; cacheControl?: string } }): Promise<unknown>;
}
interface Env {
	DATA: R2Bucket;
	PAGES?: string;
	INGEST_SECRET?: string;
}

// Mirror contract/discovery.ts cacheControl. Pointers refresh fast; entities a
// touch slower; both serve instantly via stale-while-revalidate.
const POINTER = 'public, max-age=120, stale-while-revalidate=86400, stale-if-error=86400';
const ENTITY = 'public, max-age=300, stale-while-revalidate=86400';
const cacheFor = (key: string) =>
	key.endsWith('/home.json') || key.endsWith('/index.json') || key.endsWith('manifest.json') ? POINTER : ENTITY;

async function ingest(env: Env): Promise<{ files: number; titles: number }> {
	const pages = Number(env.PAGES ?? 3);
	let seed: Array<{ id: string }> = [];
	for (let p = 1; p <= pages; p++) seed.push(...(await fetchAniList(50, p)));
	seed = [...new Map(seed.map((e) => [e.id, e])).values()]; // dedupe across pages

	const files = assemble(
		{ anime: { seed, all: seed }, movie: { seed: [], all: [] }, game: { seed: [], all: [] } },
		Date.now()
	) as Map<string, unknown>;

	// R2 keys have no leading slash. Put concurrently in bounded chunks (binding
	// ops, not subrequests) so a ~150-file write stays well within Worker limits.
	const entries = [...files].map(([path, value]) => [path.replace(/^\//, ''), value] as const);
	for (let i = 0; i < entries.length; i += 25) {
		await Promise.all(
			entries.slice(i, i + 25).map(([key, value]) =>
				env.DATA.put(key, JSON.stringify(value), {
					httpMetadata: { contentType: 'application/json', cacheControl: cacheFor(key) },
				})
			)
		);
	}
	return { files: entries.length, titles: seed.length };
}

export default {
	// Cron entrypoint — runs on the schedule in wrangler.toml.
	async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
		ctx.waitUntil(ingest(env).then((r) => console.log(`ingest: ${r.titles} titles -> ${r.files} files`)));
	},
	// Manual trigger (behind a secret) + health.
	async fetch(req: Request, env: Env): Promise<Response> {
		const url = new URL(req.url);
		if (url.pathname === '/ingest') {
			if (env.INGEST_SECRET && req.headers.get('authorization') !== `Bearer ${env.INGEST_SECRET}`) {
				return new Response('unauthorized', { status: 401 });
			}
			try {
				return Response.json({ ok: true, ...(await ingest(env)) });
			} catch (e) {
				return Response.json({ ok: false, error: String(e), stack: (e as Error)?.stack?.split('\n').slice(0, 6) }, { status: 500 });
			}
		}
		return new Response('watchdex ingest worker', { status: 200 });
	},
};
