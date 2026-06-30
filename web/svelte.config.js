import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Adapter lives in vite.config.ts (this SvelteKit version configures it there).
/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess()
};
