// SPA baseline: render on the client, fetch the R2 contract at runtime. Site
// works fully without SSR. SSR can be flipped on per-route later (set ssr=true
// + swap to adapter-cloudflare) using the SAME components — no rewrite.
export const ssr = false;
export const prerender = false;
