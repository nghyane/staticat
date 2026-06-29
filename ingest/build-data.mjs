// Local dev seed: AniList -> contract file (app/src/data/v1/airing.json).
// Prod uses the SAME mapping via the Cloudflare Cron Worker (worker/) -> R2.
// Run: node ingest/build-data.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAniList } from './lib/anilist.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'app', 'src', 'data', 'v1', 'airing.json');

const media = await fetchAniList(48);
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(media));
console.log(`ingest: wrote ${media.length} entities -> ${OUT}`);
