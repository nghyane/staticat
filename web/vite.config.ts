import adapter from '@sveltejs/adapter-static';
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

			// Hybrid: SEO landings (/, /[type], /genre/*) prerender to real HTML;
			// everything else is a client-routed SPA. The fallback gets its own
			// name (200.html) so it doesn't clobber the prerendered index.html;
			// static/_redirects routes unmatched paths to it with a 200.
			adapter: adapter({ fallback: '200.html' })
		})
	]
});
