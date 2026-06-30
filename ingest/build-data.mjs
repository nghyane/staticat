// Local seed: AniList -> Watchdex R2 layout under web/static/v1/ (R2 stand-in
// for dev). Prod runs the SAME assemble() in the Cloudflare Cron Worker -> R2.
//
// ONE source pull (the catalog snapshot). Everything else — home, refs,
// search, filters — is derived from that snapshot and served from R2. Ref
// resolution (related/recs) is pruned against the published set in assemble():
// no per-ref API call. A fuller catalog in R2 = more refs resolve, all R2-side.
// Run: node ingest/build-data.mjs
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAniList } from './lib/anilist.js';
import { assemble } from './lib/contract.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STATIC = join(ROOT, 'web', 'static');
const PAGES = Number(process.env.PAGES ?? 1); // 50 titles/page

let seed = [];
for (let p = 1; p <= PAGES; p++) seed.push(...(await fetchAniList(50, p)));
// dedupe by id (overlap across pages)
seed = [...new Map(seed.map((e) => [e.id, e])).values()];

const files = assemble(
  { anime: { seed, all: seed }, movie: { seed: [], all: [] }, game: { seed: [], all: [] } },
  Date.now()
);

await rm(join(STATIC, 'v1'), { recursive: true, force: true });
let n = 0;
for (const [p, value] of files) {
  const out = join(STATIC, p);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(value));
  n++;
}
console.log(`ingest: ${seed.length} anime (${PAGES} page) -> ${n} files`);
