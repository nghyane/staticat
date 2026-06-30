// Ingest adapter: Jikan (MAL API) -> EntityMeta (contract/discovery.ts).
// No key, not CF-blocked. id = MAL id (crawler-independent). Same output shape
// as anilist.js — only this file changes when swapping source. Rate limit ~3/s
// → sequential with throttle + 429 retry. Schedule is computed from `broadcast`
// (AniList's exact nextAiringEpisode has no Jikan equivalent).
const JIKAN = 'https://api.jikan.moe/v4';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const src = (url) => (url ? `src:${url}` : null);
const aid = (mal) => `anime:${mal}`;
const titleCase = (s) => (s ? s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()) : s);
const clean = (d) => (d ? d.replace(/\s+/g, ' ').trim() : null);
const STATUS = { 'Currently Airing': 'airing', 'Finished Airing': 'finished', 'Not yet aired': 'upcoming' };
const DAYS = { Sundays: 0, Mondays: 1, Tuesdays: 2, Wednesdays: 3, Thursdays: 4, Fridays: 5, Saturdays: 6 };

let throttleMs = 400; // ~2.5/s, under Jikan's 3/s
async function jget(path) {
	for (let attempt = 0; attempt < 4; attempt++) {
		await sleep(throttleMs);
		const r = await fetch(`${JIKAN}${path}`, { headers: { accept: 'application/json' } });
		if (r.status === 429) { await sleep(1500 * (attempt + 1)); continue; } // backoff
		if (!r.ok) throw new Error(`Jikan ${r.status} ${path}`);
		return (await r.json()).data;
	}
	throw new Error(`Jikan rate-limited: ${path}`);
}

// Next broadcast time (epoch s) + estimated episode, from broadcast slot. JST
// (Asia/Tokyo, +9, no DST) covers the vast majority of anime broadcasts.
function computeSchedule(b, aired, episodes, status) {
	if (status !== 'airing' || !b?.day || !b?.time || DAYS[b.day] === undefined) return null;
	const wd = DAYS[b.day];
	const [hh, mm] = b.time.split(':').map(Number);
	const TZ = 9 * 3600 * 1000;
	const nowMs = Date.now();
	const jstNow = new Date(nowMs + TZ);
	const add = (wd - jstNow.getUTCDay() + 7) % 7;
	const cand = Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() + add, hh, mm);
	let airMs = cand - TZ; // JST clock → real UTC
	if (airMs <= nowMs) airMs += 7 * 86400 * 1000;
	const airAt = Math.floor(airMs / 1000);
	let nextEp = null;
	const from = aired?.from ? Math.floor(Date.parse(aired.from) / 1000) : null;
	if (from) { nextEp = Math.max(1, Math.floor((airAt - from) / 604800) + 1); if (episodes) nextEp = Math.min(nextEp, episodes); }
	return { nextEp, airAt };
}

const durationMin = (d) => { const m = d && d.match(/(\d+)\s*min/); return m ? Number(m[1]) : null; };

// List item (seasons/now, top/anime) -> core EntityMeta. relations/recs/chars/
// availability are filled by enrich().
function mapCore(m) {
	const title = m.title ?? m.title_english ?? `Anime ${m.mal_id}`;
	const alt = [...new Set([m.title_english, ...(m.title_synonyms ?? [])].filter((x) => x && x !== title))];
	const status = STATUS[m.status] ?? 'unknown';
	return {
		id: aid(m.mal_id),
		kind: 'anime',
		title,
		alt,
		native: m.title_japanese ?? null,
		year: m.year ?? m.aired?.prop?.from?.year ?? null,
		cover: src(m.images?.webp?.large_image_url ?? m.images?.jpg?.large_image_url) ?? 'src:',
		banner: null, // Jikan has no banner image
		color: null,
		genres: (m.genres ?? []).map((g) => g.name),
		tags: [...(m.themes ?? []), ...(m.demographics ?? [])].map((t) => t.name).slice(0, 6),
		status,
		rating: m.score ? Math.round(m.score * 10) : null,
		ids: { mal: m.mal_id },
		desc: clean(m.synopsis),
		availability: [],
		schedule: computeSchedule(m.broadcast, m.aired, m.episodes, status),
		valueAdd: { related: [], recommendations: [] },
		characters: [],
		details: {
			kind: 'anime',
			format: m.type ?? null,
			episodes: m.episodes ?? null,
			duration: durationMin(m.duration),
			studio: m.studios?.[0]?.name ?? null,
			source: m.source ?? null,
			season: m.season ? titleCase(m.season) : null, // year appended by the detail page
			aired: m.aired?.string ?? null,
		},
		_popularity: m.members ?? 0, // transient — feed/popular ordering
	};
}

// Per-entity enrichment: relations, recommendations, characters, streaming.
export async function enrich(meta) {
	const mal = meta.id.slice(meta.id.indexOf(':') + 1);
	const [rel, rec, chars, stream] = await Promise.all([
		jget(`/anime/${mal}/relations`).catch(() => []),
		jget(`/anime/${mal}/recommendations`).catch(() => []),
		jget(`/anime/${mal}/characters`).catch(() => []),
		jget(`/anime/${mal}/streaming`).catch(() => []),
	]);
	meta.valueAdd.related = (rel ?? []).flatMap((g) => g.entry.filter((e) => e.type === 'anime').map((e) => aid(e.mal_id)));
	meta.valueAdd.recommendations = (rec ?? []).slice(0, 6).map((r) => aid(r.entry.mal_id));
	meta.characters = (chars ?? []).slice(0, 8).map((c) => ({
		name: c.character?.name ?? '', image: src(c.character?.images?.webp?.image_url ?? c.character?.images?.jpg?.image_url) ?? 'src:',
		role: c.role ?? '', va: c.voice_actors?.[0]?.person?.name ?? null, vaImage: src(c.voice_actors?.[0]?.person?.images?.jpg?.image_url),
	})).filter((c) => c.name);
	meta.availability = (stream ?? []).map((s) => ({ provider: s.name, region: '', kind: 'sub', url: s.url }));
	return meta;
}

/** List only (seasons/now + top/anime) → core EntityMeta, deduped. Fast (few
 *  calls, no per-entity). Drives schedule/feed; enrichment is added separately. */
export async function fetchList({ airingPages = 2, popularPages = 2, throttle = 400 } = {}) {
	throttleMs = throttle;
	const out = new Map();
	for (let p = 1; p <= airingPages; p++) for (const m of await jget(`/seasons/now?page=${p}`)) out.set(m.mal_id, mapCore(m));
	for (let p = 1; p <= popularPages; p++) for (const m of await jget(`/top/anime?page=${p}`)) if (!out.has(m.mal_id)) out.set(m.mal_id, mapCore(m));
	return [...out.values()];
}

/** Full catalog: list + enrich (bounded by enrichLimit). Local: Infinity. */
export async function fetchCatalog({ enrichLimit = Infinity, ...opts } = {}) {
	const metas = await fetchList(opts);
	for (let i = 0; i < metas.length && i < enrichLimit; i++) await enrich(metas[i]);
	return metas;
}
