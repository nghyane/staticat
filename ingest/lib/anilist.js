// Ingest: AniList -> Watchdex DISCOVERY contract (contract/discovery.ts).
// Producer for both the local seed (build-data.mjs -> web/static) and the
// Cloudflare Cron Worker (-> R2). Emits Entity (rich); toCard/toRef derive the
// lite shapes so listings never drift from detail.
const ENDPOINT = 'https://graphql.anilist.co';

const MINI = `id type format title { romaji english } coverImage { medium }`;
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
      recommendations(sort: RATING_DESC, perPage: 6) { nodes { mediaRecommendation { ${MINI} averageScore } } }
      characters(sort: [ROLE, RELEVANCE], perPage: 8) {
        edges { role node { name { full } image { medium } } voiceActors(language: JAPANESE, sort: RELEVANCE) { name { full } image { medium } } }
      }
    }
  }
}`;

const FORMAT = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special', MUSIC: 'Music' };
const REL = { PREQUEL: 'Prequel', SEQUEL: 'Sequel', SIDE_STORY: 'Side story', PARENT: 'Parent', SPIN_OFF: 'Spin-off', ALTERNATIVE: 'Alternative', ADAPTATION: 'Adaptation', SUMMARY: 'Summary', CHARACTER: 'Character', OTHER: 'Other', SOURCE: 'Source' };
const STATUS = { RELEASING: 'airing', FINISHED: 'finished', NOT_YET_RELEASED: 'upcoming', CANCELLED: 'cancelled', HIATUS: 'airing' };
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
const fmt = (f) => (f ? FORMAT[f] ?? f : null);
const clean = (d) => (d ? d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null);

// Ref — minimal thumbnail for recs/relations.
function ref(n) {
  const t = n.title?.romaji ?? n.title?.english ?? `#${n.id}`;
  const id = String(n.id);
  return { kind: 'anime', id, slug: `${slugify(t)}-${id}`, title: t, cover: n.coverImage?.medium ?? '', meta: fmt(n.format) };
}

// Full Entity (rich). Card fields live at the top so toCard() is a pure pick.
function mapEntity(m) {
  const title = m.title?.romaji ?? m.title?.english ?? `Anime ${m.id}`;
  const id = String(m.id);
  const format = fmt(m.format);
  const episodes = m.episodes ?? null;
  const year = m.seasonYear ?? null;
  const aired = m.startDate?.year ? `${m.startDate.month ? MONTHS[m.startDate.month] + ' ' : ''}${m.startDate.year}` : null;
  const studios = (m.studios?.edges ?? []).map((e) => e.node.name);
  return {
    // ── Card core ──
    kind: 'anime',
    id,
    slug: `${slugify(title)}-${id}`,
    title,
    cover: m.coverImage?.large ?? '',
    color: m.coverImage?.color ?? null,
    score: m.averageScore ?? null,
    year,
    status: STATUS[m.status] ?? 'unknown',
    genres: m.genres ?? [],
    meta: [format, episodes ? `${episodes} eps` : null, year].filter(Boolean).join(' · '),
    next: m.nextAiringEpisode ? { label: `EP ${m.nextAiringEpisode.episode}`, at: m.nextAiringEpisode.airingAt } : null,
    // ── Entity rich ──
    english: m.title?.english ?? null,
    native: m.title?.native ?? null,
    synonyms: m.synonyms ?? [],
    description: clean(m.description),
    banner: m.bannerImage ?? null,
    popularity: m.popularity ?? null,
    favourites: m.favourites ?? null,
    tags: (m.tags ?? []).filter((t) => !t.isMediaSpoiler).sort((a, b) => b.rank - a.rank).slice(0, 6).map((t) => t.name),
    details: {
      kind: 'anime',
      format,
      episodes,
      duration: m.duration ?? null,
      studios,
      studio: (m.studios?.edges ?? []).find((e) => e.isMain)?.node.name ?? studios[0] ?? null,
      source: m.source ? titleCase(m.source.replace(/_/g, ' ')) : null,
      season: m.season ? titleCase(m.season) : null,
      aired,
    },
    streams: (m.externalLinks ?? []).filter((l) => l.type === 'STREAMING').slice(0, 5).map((l) => ({ site: l.site, url: l.url })),
    related: (m.relations?.edges ?? []).filter((e) => e.node.type === 'ANIME').slice(0, 6).map((e) => ({ ...ref(e.node), relation: REL[e.relationType] ?? titleCase((e.relationType ?? '').replace(/_/g, ' ')) })),
    recommendations: (m.recommendations?.nodes ?? []).map((n) => n.mediaRecommendation).filter((n) => n && n.type === 'ANIME').slice(0, 6).map(ref),
    characters: (m.characters?.edges ?? []).map((e) => ({ name: e.node?.name?.full ?? '', image: e.node?.image?.medium ?? '', role: titleCase(e.role ?? ''), va: e.voiceActors?.[0]?.name?.full ?? null, vaImage: e.voiceActors?.[0]?.image?.medium ?? null })).filter((c) => c.name),
  };
}

const CARD_KEYS = ['kind', 'id', 'slug', 'title', 'cover', 'color', 'score', 'year', 'status', 'genres', 'meta', 'next'];
/** Derive a lite Card from an Entity — pure pick, never hand-written. */
export function toCard(e) {
  const c = {};
  for (const k of CARD_KEYS) c[k] = e[k];
  return c;
}

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      // AniList 403s requests from datacenter IPs with no/default UA. A
      // descriptive identifying UA gets the Cloudflare Worker through.
      'user-agent': 'Watchdex/1.0 (+https://watchdex.pages.dev; contact admin)',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  const json = await res.json();
  if (json.errors) throw new Error(`AniList: ${JSON.stringify(json.errors).slice(0, 200)}`);
  return json;
}

/** Pull the catalog snapshot. The ONLY place that touches AniList — everything
 *  downstream (home, refs, search, filters) is derived from this and served
 *  from R2. perPage up to 50; paginate via `page` for a fuller catalog. */
export async function fetchAniList(perPage = 30, page = 1) {
  const json = await gql(QUERY, { perPage, page });
  return (json?.data?.Page?.media ?? []).map(mapEntity);
}
