// Ingest adapter: Steam store API — KEYLESS game metadata (PC).
// featured → basic cards; appdetails → full (genres, metacritic, banner, devs).
// Same EntityMeta output; id = "game:{appId}".
const STORE = 'https://store.steampowered.com/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const src = (u) => (u ? `src:${u}` : null);
const clean = (d) => (d ? d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null);

let throttleMs = 400;
async function sget(path) {
	await sleep(throttleMs);
	const r = await fetch(`${STORE}${path}`, { headers: { accept: 'application/json' } });
	if (!r.ok) throw new Error(`Steam ${r.status} ${path}`);
	return r.json();
}

function mapCore(it) {
	return {
		id: `game:${it.id}`,
		kind: 'game',
		title: it.name,
		alt: [],
		native: null,
		year: null,
		cover: src(it.large_capsule_image ?? it.small_capsule_image ?? it.header_image) ?? 'src:',
		banner: null,
		color: null,
		genres: [],
		tags: [],
		status: 'released',
		rating: null,
		ids: { steam: it.id },
		desc: null,
		availability: [{ provider: 'Steam', region: '', kind: 'buy', url: `https://store.steampowered.com/app/${it.id}` }],
		schedule: null,
		valueAdd: { related: [], recommendations: [] },
		characters: [],
		details: { kind: 'game', platforms: [], developer: null, publisher: null, modes: [], released: null },
		_popularity: 0,
	};
}

/** Featured catalog (top sellers + new releases + specials), deduped. Keyless. */
export async function fetchGames({ throttle = 400 } = {}) {
	throttleMs = throttle;
	const f = await sget('/featuredcategories/?cc=us&l=en');
	const items = [...(f.top_sellers?.items ?? []), ...(f.new_releases?.items ?? []), ...(f.specials?.items ?? [])];
	const out = new Map();
	for (const it of items) if (it.id && it.name && !out.has(it.id)) out.set(it.id, mapCore(it));
	return [...out.values()];
}

/** Per-app full: genres, metacritic, background banner, devs/publishers, platforms.
 *  Returns null if the app isn't a game (DLC/hardware) → caller drops it. */
export async function enrichGame(meta) {
	const appid = meta.id.slice(meta.id.indexOf(':') + 1);
	const j = await sget(`/appdetails?appids=${appid}&l=en`);
	const a = j?.[appid]?.data;
	if (!a || a.type !== 'game') return null;
	meta.cover = src(a.header_image) ?? meta.cover;
	meta.banner = src(a.background_raw ?? a.background) ?? meta.banner;
	meta.genres = (a.genres ?? []).map((g) => g.description);
	meta.rating = a.metacritic?.score ?? meta.rating;
	meta.desc = clean(a.short_description);
	meta.year = parseInt(String(a.release_date?.date ?? '').match(/\d{4}/)?.[0] ?? '', 10) || null;
	meta._popularity = a.recommendations?.total ?? meta._popularity;
	meta.details = {
		kind: 'game',
		platforms: Object.keys(a.platforms ?? {}).filter((p) => a.platforms[p]),
		developer: (a.developers ?? [])[0] ?? null,
		publisher: (a.publishers ?? [])[0] ?? null,
		modes: (a.categories ?? []).map((c) => c.description).slice(0, 4),
		released: a.release_date?.date ?? null,
	};
	return meta;
}
