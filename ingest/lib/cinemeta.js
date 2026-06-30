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

// catalog meta (basic) → core EntityMeta
function mapCore(m) {
	return {
		id: `movie:${m.id}`,
		kind: 'movie',
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
		details: { kind: 'movie', runtime: null, director: null },
		_popularity: r10(m.imdbRating) ?? 0,
	};
}

/** Top movies (keyless). Cinemeta 'top' catalog ≈ 100 with skip paging. */
export async function fetchMovies({ pages = 2, throttle = 300 } = {}) {
	throttleMs = throttle;
	const out = new Map();
	for (let p = 0; p < pages; p++) {
		const path = p === 0 ? `/catalog/movie/top.json` : `/catalog/movie/top/skip=${p * 100}.json`;
		const j = await cget(path).catch(() => ({ metas: [] }));
		for (const m of j.metas ?? []) out.set(m.id, mapCore(m));
	}
	return [...out.values()];
}

/** Per-movie full meta: background (banner), description, genres, runtime, director. */
export async function enrichMovie(meta) {
	const imdb = meta.id.slice(meta.id.indexOf(':') + 1);
	const m = (await cget(`/meta/movie/${imdb}.json`)).meta;
	if (!m) return meta;
	meta.banner = src(m.background) ?? meta.banner;
	meta.desc = clean(m.description) ?? meta.desc;
	if (m.genres?.length) meta.genres = m.genres;
	meta.year = year(m.year ?? m.releaseInfo) ?? meta.year;
	meta.rating = r10(m.imdbRating) ?? meta.rating;
	meta.details = {
		kind: 'movie',
		runtime: parseInt(String(m.runtime ?? '').match(/\d+/)?.[0] ?? '', 10) || null,
		director: (Array.isArray(m.director) ? m.director[0] : m.director) ?? null,
	};
	return meta;
}
