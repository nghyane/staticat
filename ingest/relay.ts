// AniList relay — runs OFF Cloudflare (Deno Deploy / Val.town / any non-CF host).
// Cloudflare Worker egress IPs are 403-blocked by AniList ("manually blocked"),
// so the cron Worker can't fetch AniList directly. It POSTs the GraphQL body
// here instead; this forwards from a non-CF IP and returns the response.
// Stateless, tiny, free. Set RELAY_SECRET to keep it from being an open proxy.
//
// Deploy (pick one):
//   Deno Deploy:  deployctl deploy --entrypoint ingest/relay.ts
//   Val.town:     paste as an HTTP val (export default the handler)
// Then on the worker:  wrangler secret put RELAY_URL  (= the relay's URL)

const ANILIST = 'https://graphql.anilist.co';

const handler = async (req: Request): Promise<Response> => {
	if (req.method !== 'POST') return new Response('AniList relay', { status: 200 });

	const secret = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get('RELAY_SECRET');
	if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
		return new Response('unauthorized', { status: 401 });
	}

	const upstream = await fetch(ANILIST, {
		method: 'POST',
		headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'Watchdex-relay/1.0 (+https://watchdex.pages.dev)' },
		body: await req.text(),
	});
	return new Response(upstream.body, {
		status: upstream.status,
		headers: { 'content-type': 'application/json' },
	});
};

// Deno Deploy entrypoint. Val.town: `export default handler` is also picked up.
// @ts-ignore — Deno global exists on the relay host, not in this repo's tsconfig.
if (typeof Deno !== 'undefined' && Deno.serve) Deno.serve(handler);
export default handler;
