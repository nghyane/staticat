// Ingest adapter: Cinemeta (Stremio metadata addon) — KEYLESS movie metadata.
// Catalog → basic cards; /meta → full (background banner, genres, cast, desc).
// Same EntityMeta output as the other adapters; id = "movie:{imdbId}".
const BASE = 'https://v3-cinemeta.strem.io';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const src = (u) => (u ? `src:${u}` : null);
const clean = (d) => (d ? d.replace(/\s+/g, ' ').trim() : null);
const year = (v) => parseInt(String(v ?? '').match(/\d{4}/)?.[0] ?? '', 10) || null;
const r10 = (v) => (v ? Math.round(parseFloat(v) * 10) : null); // imdb 0-10 → 0-100

let throttleMs = 300;
async function cget(path) {
	await sleep(throttleMs);
	const r = await fetch(`${BASE}${path}`, { redirect: 'follow' });
	if (!r.ok) throw new Error(`Cinemeta ${r.status} ${path}`);
	return r.json();
}

// catalog meta (basic) → core EntityMeta. type = 'movie' | 'series'(→tv).
function mapCore(m, type = 'movie') {
	const kind = type === 'series' ? 'tv' : 'movie';
	return {
		id: `${kind}:${m.id}`,
		kind,
		title: m.name,
		alt: [],
		native: null,
		year: year(m.releaseInfo ?? m.year),
		cover: src(m.poster) ?? 'src:',
		banner: null,
		color: null,
		genres: m.genres ?? [],
		tags: [],
		status: 'released',
		rating: r10(m.imdbRating),
		ids: { imdb: m.id },
		desc: clean(m.description),
		availability: [],
		schedule: null,
		valueAdd: { related: [], recommendations: [] },
		characters: [],
		details: kind === 'tv'
			? { kind: 'tv', seasons: null, cast: [], released: null }
			: { kind: 'movie', runtime: null, director: null, cast: [], released: null },
		_popularity: r10(m.imdbRating) ?? 0,
	};
}

async function fetchCatalog(type, pages) {
	const out = new Map();
	for (let p = 0; p < pages; p++) {
		const path = p === 0 ? `/catalog/${type}/top.json` : `/catalog/${type}/top/skip=${p * 100}.json`;
		const j = await cget(path).catch(() => ({ metas: [] }));
		for (const m of j.metas ?? []) out.set(m.id, mapCore(m, type));
	}
	return [...out.values()];
}

/** Top movies / series (keyless). */
export async function fetchMovies({ pages = 2, throttle = 300 } = {}) { throttleMs = throttle; return fetchCatalog('movie', pages); }
export async function fetchSeries({ pages = 2, throttle = 300 } = {}) { throttleMs = throttle; return fetchCatalog('series', pages); }

async function enrichCinemeta(meta, type) {
	const imdb = meta.id.slice(meta.id.indexOf(':') + 1);
	const m = (await cget(`/meta/${type}/${imdb}.json`)).meta;
	if (!m) return meta;
	meta.banner = src(m.background) ?? meta.banner;
	meta.desc = clean(m.description) ?? meta.desc;
	if (m.genres?.length) meta.genres = m.genres;
	meta.year = year(m.year ?? m.releaseInfo) ?? meta.year;
	meta.rating = r10(m.imdbRating) ?? meta.rating;
	const cast = (m.cast ?? []).slice(0, 10);
	const released = m.released ?? (m.year ? String(m.year) : null);
	if (type === 'series') {
		const seasons = new Set((m.videos ?? []).map((v) => v.season).filter((s) => s > 0));
		meta.details = { kind: 'tv', seasons: seasons.size || null, cast, released };
	} else {
		meta.details = { kind: 'movie', runtime: parseInt(String(m.runtime ?? '').match(/\d+/)?.[0] ?? '', 10) || null, director: (Array.isArray(m.director) ? m.director[0] : m.director) ?? null, cast, released };
	}
	return meta;
}
export const enrichMovie = (meta) => enrichCinemeta(meta, 'movie');
export const enrichSeries = (meta) => enrichCinemeta(meta, 'series');
