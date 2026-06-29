// Shared ingest logic: AniList -> contract entities. Used by BOTH the local
// seed script (ingest/build-data.mjs, writes a file) and the Cloudflare Cron
// Worker (worker/src, writes R2). Pure: fetch + map, no I/O target.
const ENDPOINT = 'https://graphql.anilist.co';

const QUERY = `
query ($perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(type: ANIME, sort: TRENDING_DESC, status_in: [RELEASING], isAdult: false) {
      id idMal
      title { romaji english native }
      description(asHtml: false)
      coverImage { large color }
      bannerImage
      averageScore
      format episodes duration status season seasonYear
      genres
      studios(isMain: true) { nodes { name } }
      nextAiringEpisode { episode airingAt }
      externalLinks { site url type }
    }
  }
}`;

const FORMAT = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special', MUSIC: 'Music' };
const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);

function map(m) {
  const romaji = m.title?.romaji ?? m.title?.english ?? `Anime ${m.id}`;
  return {
    id: m.id, idMal: m.idMal ?? null, slug: `${slugify(romaji)}-${m.id}`,
    title: romaji, english: m.title?.english ?? null, native: m.title?.native ?? null,
    description: m.description ? m.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : null,
    cover: m.coverImage?.large ?? '', color: m.coverImage?.color ?? null, banner: m.bannerImage ?? null,
    score: m.averageScore ?? null,
    format: m.format ? (FORMAT[m.format] ?? m.format) : null, episodes: m.episodes ?? null, duration: m.duration ?? null,
    status: m.status ?? 'RELEASING', season: m.season ? titleCase(m.season) : null, year: m.seasonYear ?? null,
    genres: m.genres ?? [], studio: m.studios?.nodes?.[0]?.name ?? null,
    nextEp: m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, airingAt: m.nextAiringEpisode.airingAt } : null,
    streams: (m.externalLinks ?? []).filter((l) => l.type === 'STREAMING').slice(0, 4).map((l) => ({ site: l.site, url: l.url })),
  };
}

/** Fetch + map currently-airing anime (the contract entity array). */
export async function fetchAniList(perPage = 48) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { perPage } }),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = await res.json();
  return (json?.data?.Page?.media ?? []).map(map);
}
