// Build the R2 file set from mapped entities, bám spec/contract.yaml.
// Mirrors contract/discovery.ts (paths/toCatalogEntry/hash) for JS runtimes.
// Entity = head.json (pointer) + meta.v{rev}.json (immutable). Listings =
// CatalogEntry[] denormalized. Writer assigns rev/ver via hash (idempotent).

export const SCHEMA = 'v1';
const P = `/${SCHEMA}`;
const idPath = (id) => id.replace(':', '/'); // "anime:21" → "anime/21"

export const paths = {
	entityHead: (id) => `${P}/entity/${idPath(id)}/head.json`,
	entityMeta: (id, rev) => `${P}/entity/${idPath(id)}/meta.v${rev}.json`,
	feedLatest: (page) => `${P}/feed/latest/${page}.json`,
	feedPopular: (period) => `${P}/feed/popular/${period}.json`,
	calendar: (week) => `${P}/calendar/${week}.json`,
	searchHead: () => `${P}/search/head.json`,
	searchIndex: (ver) => `${P}/search/index.v${ver}.json`,
};

// Fast sync content hash (FNV-1a, base36) — idempotent rev/ver, no crypto dep.
export function hash(s) {
	let h = 0x811c9dc5;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
	}
	return h.toString(36);
}

const CARD_KEYS = ['id', 'kind', 'title', 'cover', 'year', 'status', 'genres', 'rating', 'alt', 'schedule'];
export function toCatalogEntry(m) {
	const c = {};
	for (const k of CARD_KEYS) c[k] = m[k];
	c.season = m.details?.season ?? null; // for /season browse
	return c;
}

function isoWeek(epochS) {
	const d = new Date(epochS * 1000);
	const day = (d.getUTCDay() + 6) % 7; // Mon=0
	d.setUTCDate(d.getUTCDate() - day + 3); // nearest Thursday
	const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
	const week = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
	return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Prune valueAdd refs to entities we actually publish → internal links never
 *  404 / leave the site (no per-ref API). Strip transient `_popularity`. */
export function buildEntities(seed) {
	const known = new Set(seed.map((e) => e.id));
	return seed.map((e) => {
		const { _popularity, _enriched, ...meta } = e; // strip transient fields
		return {
			...meta,
			valueAdd: {
				related: meta.valueAdd.related.filter((id) => known.has(id)),
				recommendations: meta.valueAdd.recommendations.filter((id) => known.has(id)),
			},
		};
	});
}

/** Denormalized listings (CatalogEntry[]) rebuilt from the snapshot:
 *  feed/latest (soonest airing), feed/popular, calendar by ISO week, and the
 *  search index content (writer versions it). */
export function buildListings(seed) {
	const card = toCatalogEntry;
	const airing = seed.filter((e) => e.schedule?.airAt).sort((a, b) => a.schedule.airAt - b.schedule.airAt);
	const popular = [...seed].sort((a, b) => (b._popularity ?? 0) - (a._popularity ?? 0));

	const pointers = new Map();
	pointers.set(paths.feedLatest(0), airing.slice(0, 60).map(card));
	for (const period of ['day', 'week', 'all']) pointers.set(paths.feedPopular(period), popular.slice(0, 40).map(card));

	const calendars = new Map();
	const byWeek = new Map();
	for (const e of airing) {
		const w = isoWeek(e.schedule.airAt);
		(byWeek.get(w) ?? byWeek.set(w, []).get(w)).push(card(e));
	}
	for (const [w, list] of byWeek) calendars.set(paths.calendar(w), list);

	const searchIndex = seed.map(card); // ALL — FE resolves related ids + name search
	return { pointers, calendars, searchIndex };
}
