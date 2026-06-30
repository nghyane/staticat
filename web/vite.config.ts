import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Hybrid on Cloudflare Pages: SEO landings (/, /[type], /genre/*)
			// prerender to static HTML (served pure-CDN, no compute); other routes
			// are a client-routed SPA. adapter-cloudflare's _worker.js + _routes.json
			// handle the SPA fallback natively — no _redirects, no 200.html dance.
			adapter: adapter(),

			// The SPA shell is served at arbitrary URL depths (/anime/x,
			// /season/y/z ...), so asset refs must be root-absolute (/_app/...).
			// Relative refs (the default) break for routes deeper than one level.
			paths: { relative: false }
		})
	]
});
