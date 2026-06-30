// Ingest adapter: games — KEYLESS. SteamSpy (top games, no hardware noise) for
// the catalog + Steam appdetails for full data. Portrait library art for cards
// (consistent grid), landscape background + screenshots for the game detail UI.
const STEAMSPY = 'https://steamspy.com/api.php';
const STORE = 'https://store.steampowered.com/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const src = (u) => (u ? `src:${u}` : null);
const clean = (d) => (d ? d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null);
const cdn = (appid, f) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/${f}`;

let throttleMs = 400;
async function jget(url) {
	await sleep(throttleMs);
	const r = await fetch(url, { headers: { accept: 'application/json' } });
	if (!r.ok) throw new Error(`Steam ${r.status} ${url}`);
	return r.json();
}

function mapCore(appid, name) {
	return {
		id: `game:${appid}`,
		kind: 'game',
		title: name,
		alt: [],
		native: null,
		year: null,
		cover: `src:${cdn(appid, 'library_600x900.jpg')}`, // portrait library art
		banner: null,
		color: null,
		genres: [],
		tags: [],
		status: 'released',
		rating: null,
		ids: { steam: Number(appid) },
		desc: null,
		availability: [{ provider: 'Steam', region: '', kind: 'buy', url: `https://store.steampowered.com/app/${appid}` }],
		schedule: null,
		valueAdd: { related: [], recommendations: [] },
		characters: [],
		details: { kind: 'game', platforms: [], developer: null, publisher: null, modes: [], released: null, screenshots: [] },
		_popularity: 0,
	};
}

/** Top games by recent players (SteamSpy) — games only, no DLC/hardware. */
export async function fetchGames({ throttle = 400 } = {}) {
	throttleMs = throttle;
	const j = await jget(`${STEAMSPY}?request=top100in2weeks`);
	const out = [];
	for (const k of Object.keys(j)) { const g = j[k]; if (g?.appid && g?.name) out.push(mapCore(g.appid, g.name)); }
	return out;
}

/** Per-app full: genres, metacritic, landscape banner, screenshots, devs,
 *  platforms. Returns null for non-game apps → caller drops it. */
export async function enrichGame(meta) {
	const appid = meta.id.slice(meta.id.indexOf(':') + 1);
	const j = await jget(`${STORE}/appdetails?appids=${appid}&l=en`);
	const a = j?.[appid]?.data;
	if (!a || a.type !== 'game') return null;
	meta.banner = src(a.background_raw ?? a.background ?? a.header_image) ?? meta.banner;
	meta.genres = (a.genres ?? []).map((g) => g.description);
	meta.tags = (a.categories ?? []).map((c) => c.description).slice(0, 6);
	meta.rating = a.metacritic?.score ?? meta.rating;
	meta.desc = clean(a.short_description ?? a.about_the_game);
	meta.year = parseInt(String(a.release_date?.date ?? '').match(/\d{4}/)?.[0] ?? '', 10) || null;
	meta._popularity = a.recommendations?.total ?? meta._popularity;
	meta.details = {
		kind: 'game',
		platforms: Object.keys(a.platforms ?? {}).filter((p) => a.platforms[p]),
		developer: (a.developers ?? [])[0] ?? null,
		publisher: (a.publishers ?? [])[0] ?? null,
		modes: (a.categories ?? []).filter((c) => /player|Co-op|Multi/i.test(c.description)).map((c) => c.description).slice(0, 4),
		released: a.release_date?.date ?? null,
		screenshots: (a.screenshots ?? []).slice(0, 8).map((s) => `src:${s.path_full}`),
	};
	return meta;
}
