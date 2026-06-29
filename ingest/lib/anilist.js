// Shared ingest: AniList -> rich contract entities. Used by the local seed
// (ingest/build-data.mjs -> file) and the Cloudflare Cron Worker (-> R2).
const ENDPOINT = 'https://graphql.anilist.co';

const MINI = `id type format title { romaji english } coverImage { medium }`;
const QUERY = `
query ($perPage: Int) {
  Page(page: 1, perPage: $perPage) {
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
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
const fmt = (f) => (f ? FORMAT[f] ?? f : null);

function mini(n) {
  const t = n.title?.romaji ?? n.title?.english ?? `#${n.id}`;
  return { id: n.id, slug: `${slugify(t)}-${n.id}`, title: t, cover: n.coverImage?.medium ?? '', format: fmt(n.format), type: n.type };
}

function map(m) {
  const romaji = m.title?.romaji ?? m.title?.english ?? `Anime ${m.id}`;
  const start = m.startDate?.year ? `${m.startDate.month ? MONTHS[m.startDate.month] + ' ' : ''}${m.startDate.year}` : null;
  return {
    id: m.id, idMal: m.idMal ?? null, slug: `${slugify(romaji)}-${m.id}`,
    title: romaji, english: m.title?.english ?? null, native: m.title?.native ?? null,
    synonyms: m.synonyms ?? [],
    description: m.description ? m.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null,
    cover: m.coverImage?.large ?? '', color: m.coverImage?.color ?? null, banner: m.bannerImage ?? null,
    score: m.averageScore ?? null, popularity: m.popularity ?? null, favourites: m.favourites ?? null,
    format: fmt(m.format), episodes: m.episodes ?? null, duration: m.duration ?? null,
    status: m.status ?? 'RELEASING', source: m.source ? titleCase(m.source.replace(/_/g, ' ')) : null,
    season: m.season ? titleCase(m.season) : null, year: m.seasonYear ?? null, aired: start,
    genres: m.genres ?? [],
    tags: (m.tags ?? []).filter((t) => !t.isMediaSpoiler).sort((a, b) => b.rank - a.rank).slice(0, 6).map((t) => t.name),
    studios: (m.studios?.edges ?? []).map((e) => e.node.name),
    studio: (m.studios?.edges ?? []).find((e) => e.isMain)?.node.name ?? (m.studios?.edges?.[0]?.node.name ?? null),
    nextEp: m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, airingAt: m.nextAiringEpisode.airingAt } : null,
    streams: (m.externalLinks ?? []).filter((l) => l.type === 'STREAMING').slice(0, 5).map((l) => ({ site: l.site, url: l.url })),
    relations: (m.relations?.edges ?? []).filter((e) => e.node.type === 'ANIME').slice(0, 6).map((e) => ({ ...mini(e.node), relation: REL[e.relationType] ?? titleCase((e.relationType ?? '').replace(/_/g, ' ')) })),
    recommendations: (m.recommendations?.nodes ?? []).map((n) => n.mediaRecommendation).filter((n) => n && n.type === 'ANIME').slice(0, 6).map(mini),
    characters: (m.characters?.edges ?? []).map((e) => ({ name: e.node?.name?.full ?? '', image: e.node?.image?.medium ?? '', role: titleCase(e.role ?? ''), va: e.voiceActors?.[0]?.name?.full ?? null, vaImage: e.voiceActors?.[0]?.image?.medium ?? null })).filter((c) => c.name),
  };
}

export async function fetchAniList(perPage = 30) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { perPage } }),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  const json = await res.json();
  if (json.errors) throw new Error(`AniList: ${JSON.stringify(json.errors).slice(0, 200)}`);
  return (json?.data?.Page?.media ?? []).map(map);
}
