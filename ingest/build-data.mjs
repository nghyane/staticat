// Local seed: AniList -> spec layout under web/static/v1/ (R2 stand-in, dev).
// Fresh build → every entity rev=1, search ver=1. The R2 incremental writer
// (push-r2.mjs) does idempotent rev/ver bumps against published state.
// Run: node ingest/build-data.mjs   (PAGES=n for a fuller snapshot)
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchList, fetchMangaList, enrich } from './lib/jikan.js';
import { fetchMovies, enrichMovie, fetchSeries, enrichSeries } from './lib/cinemeta.js';
import { fetchGames, enrichGame } from './lib/steam.js';
import { paths, hash, buildEntities, buildListings } from './lib/contract.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STATIC = join(ROOT, 'web', 'static');
const AIRING_PAGES = Number(process.env.AIRING_PAGES ?? 2);
const POPULAR_PAGES = Number(process.env.POPULAR_PAGES ?? 2);
const MANGA_PAGES = Number(process.env.MANGA_PAGES ?? 2);
const now = Math.floor(Date.now() / 1000);

// Jikan: anime (airing→feed/calendar, popular→depth) + manga; full enrich locally.
const raw = [
	...(await fetchList({ airingPages: AIRING_PAGES, popularPages: POPULAR_PAGES })),
	...(await fetchMangaList({ pages: MANGA_PAGES })),
	...(await fetchMovies({ pages: Number(process.env.MOVIE_PAGES ?? 2) }).catch(() => [])),
	...(await fetchSeries({ pages: Number(process.env.MOVIE_PAGES ?? 2) }).catch(() => [])),
	...(await fetchGames().catch(() => []))
];
const enrichBy = (m) => (m.kind === 'movie' ? enrichMovie(m) : m.kind === 'tv' ? enrichSeries(m) : m.kind === 'game' ? enrichGame(m) : enrich(m));
const seed = [];
for (const m of raw) if ((await enrichBy(m)) !== null) seed.push(m); // drop non-game apps

const entities = buildEntities(seed);
const { pointers, calendars, searchIndex } = buildListings(seed);

// path -> json (immutable first, pointers last — matches write order)
const files = new Map();
for (const e of entities) {
	const h = hash(JSON.stringify(e));
	files.set(paths.entityMeta(e.id, 1), { rev: 1, ...e }); // immutable
	files.set(paths.entityHead(e.id), { id: e.id, rev: 1, updatedAt: now, hash: h }); // pointer
}
files.set(paths.searchIndex(1), searchIndex); // immutable
files.set(paths.searchHead(), { ver: 1, hash: hash(JSON.stringify(searchIndex)) }); // pointer
for (const [p, v] of pointers) files.set(p, v);
for (const [p, v] of calendars) files.set(p, v);

await rm(join(STATIC, 'v1'), { recursive: true, force: true });
let n = 0;
for (const [p, value] of files) {
	const out = join(STATIC, p);
	await mkdir(dirname(out), { recursive: true });
	await writeFile(out, JSON.stringify(value));
	n++;
}
console.log(`ingest: ${seed.length} anime -> ${n} files (rev=1, ver=1)`);
