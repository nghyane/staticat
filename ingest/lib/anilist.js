// Ingest: AniList -> Watchdex EntityMeta (contract/discovery.ts, bám spec).
// The ONLY place that touches AniList; everything downstream is derived from
// this snapshot and served from R2. AniList 403s CF Worker IPs + blank UAs.
const ENDPOINT = 'https://graphql.anilist.co';

const MINI = `id type title { romaji english } coverImage { medium }`;
const QUERY = `
query ($perPage: Int, $page: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: TRENDING_DESC, status_in: [RELEASING], isAdult: false) {
      id idMal
      title { romaji english native }
      synonyms
      description(asHtml: false)
      coverImage { large color } bannerImage
      averageScore popularity favourites
      format episodes duration status source season seasonYear
      startDate { year month day }
      genres
      tags { name rank isMediaSpoiler }
      studios { edges { isMain node { name } } }
      nextAiringEpisode { episode airingAt }
      externalLinks { site url type }
      relations { edges { relationType node { ${MINI} } } }
      recommendations(sort: RATING_DESC, perPage: 6) { nodes { mediaRecommendation { ${MINI} } } }
      characters(sort: [ROLE, RELEVANCE], perPage: 8) {
        edges { role node { name { full } image { medium } } voiceActors(language: JAPANESE, sort: RELEVANCE) { name { full } image { medium } } }
      }
    }
  }
}`;

const FORMAT = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special', MUSIC: 'Music' };
const STATUS = { RELEASING: 'airing', FINISHED: 'finished', NOT_YET_RELEASED: 'upcoming', CANCELLED: 'cancelled', HIATUS: 'airing' };
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
const fmt = (f) => (f ? FORMAT[f] ?? f : null);
const clean = (d) => (d ? d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null);
const src = (url) => (url ? `src:${url}` : null); // blob token (Data⟂Blob)
const aid = (n) => `anime:${n}`;

// EntityMeta (immutable per rev — rev is assigned by the writer, not here).
function mapEntity(m) {
	const title = m.title?.romaji ?? m.title?.english ?? `Anime ${m.id}`;
	const alt = [...new Set([m.title?.english, ...(m.synonyms ?? [])].filter((x) => x && x !== title))];
	return {
		id: aid(m.id),
		kind: 'anime',
		title,
		alt,
		native: m.title?.native ?? null,
		year: m.seasonYear ?? null,
		cover: src(m.coverImage?.large) ?? 'src:',
		banner: src(m.bannerImage),
		color: m.coverImage?.color ?? null,
		genres: m.genres ?? [],
		tags: (m.tags ?? []).filter((t) => !t.isMediaSpoiler).sort((a, b) => b.rank - a.rank).slice(0, 6).map((t) => t.name),
		status: STATUS[m.status] ?? 'unknown',
		rating: m.averageScore ?? null,
		ids: { anilist: m.id, ...(m.idMal ? { mal: m.idMal } : {}) },
		desc: clean(m.description),
		availability: (m.externalLinks ?? []).filter((l) => l.type === 'STREAMING').slice(0, 6).map((l) => ({ provider: l.site, region: '', kind: 'sub', url: l.url })),
		schedule: m.nextAiringEpisode ? { nextEp: m.nextAiringEpisode.episode, airAt: m.nextAiringEpisode.airingAt } : null,
		valueAdd: {
			related: (m.relations?.edges ?? []).filter((e) => e.node?.type === 'ANIME').map((e) => aid(e.node.id)),
			recommendations: (m.recommendations?.nodes ?? []).map((n) => n.mediaRecommendation).filter((n) => n?.type === 'ANIME').map((n) => aid(n.id)),
		},
		characters: (m.characters?.edges ?? [])
			.map((e) => ({ name: e.node?.name?.full ?? '', image: src(e.node?.image?.medium) ?? 'src:', role: titleCase(e.role ?? ''), va: e.voiceActors?.[0]?.name?.full ?? null, vaImage: src(e.voiceActors?.[0]?.image?.medium) }))
			.filter((c) => c.name),
		details: {
			kind: 'anime',
			format: fmt(m.format),
			episodes: m.episodes ?? null,
			duration: m.duration ?? null,
			studio: (m.studios?.edges ?? []).find((e) => e.isMain)?.node.name ?? (m.studios?.edges?.[0]?.node.name ?? null),
			source: m.source ? titleCase(m.source.replace(/_/g, ' ')) : null,
			season: m.season ? titleCase(m.season) : null,
			aired: m.startDate?.year ? `${m.startDate.month ? MONTHS[m.startDate.month] + ' ' : ''}${m.startDate.year}` : null,
		},
		// transient (not part of the contract; the writer uses it for ordering, then drops)
		_popularity: m.popularity ?? 0,
	};
}

// AniList hard-blocks CF Worker egress (403). RELAY_URL routes the POST through
// a non-CF relay; unset = direct (local / GitHub Actions egress).
async function gql(query, variables, relayUrl) {
	const res = await fetch(relayUrl || ENDPOINT, {
		method: 'POST',
		headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'Watchdex/1.0 (+https://watchdex.pages.dev)' },
		body: JSON.stringify({ query, variables }),
	});
	if (!res.ok) throw new Error(`AniList HTTP ${res.status}: ${await res.text().catch(() => '')}`);
	const json = await res.json();
	if (json.errors) throw new Error(`AniList: ${JSON.stringify(json.errors).slice(0, 200)}`);
	return json;
}

export async function fetchAniList(perPage = 30, page = 1, relayUrl = '') {
	const json = await gql(QUERY, { perPage, page }, relayUrl);
	return (json?.data?.Page?.media ?? []).map(mapEntity);
}
