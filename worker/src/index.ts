// Watchdex ingest — Cloudflare Cron Worker.
// Schedule (wrangler.toml) -> fetch AniList -> write contract to R2 (binding DATA).
// Light job (1 GraphQL call + 1 R2 put) so it fits Worker limits. The frontend
// reads R2, never AniList -> read path has no third-party API dependency.
import { fetchAniList } from '../../ingest/lib/anilist.js';

interface Env {
  DATA: { put(key: string, value: string, opts?: unknown): Promise<unknown> };
}

async function ingest(env: Env): Promise<number> {
  const media = await fetchAniList(48);
  await env.DATA.put('v1/airing.json', JSON.stringify(media), {
    httpMetadata: { contentType: 'application/json', cacheControl: 'public, max-age=60, stale-while-revalidate=600' },
  });
  return media.length;
}

export default {
  // Cron entrypoint — runs on the schedule in wrangler.toml.
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(ingest(env).then((n) => console.log(`ingest: wrote ${n} entities`)));
  },
  // Manual trigger / health (protect /ingest behind a secret in prod).
  async fetch(req: Request, env: Env): Promise<Response> {
    if (new URL(req.url).pathname === '/ingest') {
      const wrote = await ingest(env);
      return Response.json({ ok: true, wrote });
    }
    return new Response('watchdex ingest worker', { status: 200 });
  },
};
