// ONE-OFF (local): AniList → static supplement map for the bits Jikan lacks
// (banner image, cover color). AniList blocks CF Workers, so this runs LOCALLY
// (no relay, no key); it writes a single _supplements.json that the worker
// reads from R2 and applies every run. Banners are static → run once; re-run to
// cover new titles. (Schedule is NOT supplemented here — it changes weekly, so
// the worker keeps the live Jikan estimate.)
//
// Run:  node ingest/supplement-anilist.mjs
//       wrangler r2 object put watchdex-data/v1/_supplements.json \
//         --file ingest/_supplements.json --content-type application/json
import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSupplements } from './lib/anilist.js';

const R2 = process.env.DATA_BASE ?? 'https://pub-9b90fa87aa1a44fa8c4ccccf49ace9b0.r2.dev';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '_supplements.json');

// catalog ids from the published search index
const head = await (await fetch(`${R2}/v1/search/head.json`)).json();
const index = await (await fetch(`${R2}/v1/search/index.v${head.ver}.json`)).json();
const malOf = (id) => id.slice(id.indexOf(':') + 1);

const supp = {};
for (const [kind, type] of [['anime', 'ANIME'], ['manga', 'MANGA']]) {
	const ids = index.filter((e) => e.kind === kind).map((e) => malOf(e.id));
	if (!ids.length) continue;
	const got = await fetchSupplements(ids, type); // local egress → AniList ok
	for (const [mal, v] of got) if (v.banner || v.color) supp[`${kind}:${mal}`] = { banner: v.banner, color: v.color };
	console.log(`${kind}: ${ids.length} ids → ${[...got].filter(([, v]) => v.banner).length} banners`);
}

await writeFile(OUT, JSON.stringify(supp));
console.log(`supplements: ${Object.keys(supp).length} entities -> ${OUT}`);
