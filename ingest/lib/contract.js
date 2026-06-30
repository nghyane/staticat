// Assemble the R2 file set from mapped entities. Shared by the local seed
// (build-data.mjs -> fs) and the Cloudflare Cron Worker (-> R2): both call
// assemble() then iterate path->json. Mirrors contract/discovery.ts.
import { toCard } from './anilist.js';

export const SCHEMA = 'v1';
export const KINDS = ['anime', 'movie', 'game'];
const P = `/${SCHEMA}`;

// Fast sync content hash (FNV-1a, base36). Good enough for change detection;
// no crypto dep so it runs anywhere (node / worker / Deno).
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h.toString(36);
}

/** Delta: given the assembled files and the previous content hashes, return
 *  only the files that CHANGED (puts), the new hash map, and orphans to delete.
 *  Lets the writer touch ~home/index + changed entities instead of rewriting
 *  the whole catalog every run (immutable + ghi-delta). */
export function diff(files, prevHashes = {}) {
  const hashes = {};
  const puts = new Map();
  for (const [path, value] of files) {
    const json = JSON.stringify(value);
    const h = hash(json);
    hashes[path] = h;
    if (prevHashes[path] !== h) puts.set(path, json);
  }
  const dels = Object.keys(prevHashes).filter((p) => !(p in hashes));
  return { puts, hashes, dels };
}

export const paths = {
  manifest: () => `${P}/manifest.json`,
  index: (k) => `${P}/${k}/index.json`,
  home: (k) => `${P}/${k}/home.json`,
  entity: (k, id) => `${P}/${k}/entity/${id}.json`,
};

function seasonLabel(entities) {
  const counts = new Map();
  for (const e of entities) {
    if (!e.next) continue;
    const s = e.details?.season && e.year ? `${e.details.season} ${e.year}` : null;
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'This season';
}

/** Keep only refs whose entity we actually wrote → internal links never 404
 *  and never leave the site. */
function pruneRefs(entity, known) {
  return {
    ...entity,
    related: entity.related.filter((r) => known.has(r.id)),
    recommendations: entity.recommendations.filter((r) => known.has(r.id)),
  };
}

/** byKind: { [kind]: { seed: Entity[], all: Entity[] } }.
 *  seed = curated set driving home (airing/trending). all = every entity we
 *  publish (seed + expanded refs). Returns Map<path, json> for every file. */
export function assemble(byKind, buildAt) {
  const files = new Map();
  const dataVersion = String(buildAt);
  files.set(paths.manifest(), { schema: SCHEMA, buildAt, verticals: KINDS });

  for (const kind of KINDS) {
    const { seed = [], all = [] } = byKind[kind] ?? {};
    const known = new Set(all.map((e) => e.id));

    // home/featured/trending come from the curated seed (its order = trending)
    const seedCards = seed.map(toCard);
    const airing = seedCards.filter((c) => c.next).sort((a, b) => a.next.at - b.next.at);
    const trending = seedCards.slice(0, 18);
    const featured = seedCards.find((c) => c.next) ?? seedCards[0] ?? null;

    files.set(paths.index(kind), {
      kind, dataVersion, updatedAt: buildAt,
      counts: { total: all.length, airing: airing.length }, facets: [],
    });
    files.set(paths.home(kind), {
      kind, season: seasonLabel(seed), airingCount: airing.length,
      featured, airing: airing.slice(0, 40), trending,
    });
    for (const e of all) files.set(paths.entity(kind, e.id), pruneRefs(e, known));
  }
  return files;
}
