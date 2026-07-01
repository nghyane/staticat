<script lang="ts">
	import '@fontsource-variable/space-grotesk/index.css';
	import '@fontsource-variable/hanken-grotesk/index.css';
	import '@fontsource/space-mono/index.css';
	import '../app.css';
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { makeQueryClient } from '$lib/data';

	let { children } = $props();
	const queryClient = makeQueryClient();
	let menuOpen = $state(false);
	afterNavigate(() => (menuOpen = false)); // close drawer on navigation

	// content verticals (what you're browsing) — separate axis from tools
	const verticals = [
		{ label: 'Anime', href: '/' },
		{ label: 'Manga', href: '/manga' },
		{ label: 'Movies', href: '/movie' },
		{ label: 'TV', href: '/tv' },
		{ label: 'Games', href: '/game' }
	];
	const isOn = (href: string) => (href === '/' ? page.url.pathname === '/' || page.url.pathname.startsWith('/anime') : page.url.pathname.startsWith(href));
</script>

<QueryClientProvider client={queryClient}>
<header class="hdr">
	<div class="wrap hdr-in">
		<a class="brand" href="/"><span class="mark"></span>watchdex</a>
		<nav class="verticals" aria-label="Browse by type">
			{#each verticals as v (v.href)}
				{@const on = isOn(v.href)}
				<a href={v.href} class="tab" class:on aria-current={on ? 'page' : undefined}>{v.label}</a>
			{/each}
		</nav>

		<div class="tools">
			<a href="/calendar" class="tool" class:on={page.url.pathname.startsWith('/calendar')} aria-current={page.url.pathname.startsWith('/calendar') ? 'page' : undefined}>
				<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
				<span>Schedule</span>
			</a>
			<a class="search" class:on={page.url.pathname.startsWith('/search')} href="/search" aria-label="Search anime & manga">
				<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="m11 11 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
				<span class="ph">Search</span>
			</a>
			<button class="burger" aria-label="Menu" aria-expanded={menuOpen} onclick={() => (menuOpen = !menuOpen)}>
				{#if menuOpen}<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
				{:else}<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>{/if}
			</button>
		</div>
	</div>
	{#if menuOpen}
		<nav class="drawer" aria-label="Menu">
			<div class="wrap">
				{#each verticals as v (v.href)}<a href={v.href} class="d-link" class:on={isOn(v.href)}>{v.label}</a>{/each}
				<a href="/calendar" class="d-link" class:on={page.url.pathname.startsWith('/calendar')}>Schedule</a>
			</div>
		</nav>
	{/if}
</header>

<main>{@render children()}</main>

<footer class="ftr"><div class="wrap">Data from MyAnimeList &middot; Times in your local timezone</div></footer>
</QueryClientProvider>

<style>
	.hdr { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
	.hdr-in { display: flex; align-items: stretch; gap: 1.5rem; height: 4rem; }
	.brand { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; letter-spacing: -0.02em; }
	.mark { width: 0.6rem; height: 0.6rem; border-radius: 50%; background: var(--accent); }
	/* content verticals (the type axis) */
	.verticals { display: flex; align-items: stretch; gap: 0.1rem; }
	.tab { display: inline-flex; align-items: center; gap: 0.3rem; position: relative; font-size: var(--t-sm); font-weight: 500; color: var(--muted); padding: 0 0.6rem; transition: color .15s; }
	.tab:hover { color: var(--ink); }
	.tab.on { color: var(--ink); font-weight: 600; }
	.tab.on::after { content: ''; position: absolute; left: 0.6rem; right: 0.6rem; bottom: -1px; height: 2px; background: var(--accent); border-radius: 2px 2px 0 0; }

	/* tools (the find/view axis) — right-aligned group */
	.tools { display: flex; align-items: center; gap: 0.4rem; margin-left: auto; }
	.tool { display: inline-flex; align-items: center; gap: 0.4rem; height: 2.25rem; padding: 0 0.8rem; font-size: var(--t-sm); font-weight: 500; color: var(--muted); border-radius: 10px; transition: color .15s, background .15s; }
	.tool:hover { color: var(--ink); background: var(--bg-soft); }
	.tool.on { color: var(--accent); }
	.tool svg { color: var(--faint); }
	.tool.on svg, .tool:hover svg { color: currentColor; }

	.search { display: flex; align-items: center; gap: 0.5rem; align-self: center; width: min(13rem, 26vw); height: 2.25rem; padding: 0 0.8rem; background: var(--bg-soft); border-radius: 10px; color: var(--faint); font-size: var(--t-sm); transition: color .15s, box-shadow .15s; }
	.search:hover { color: var(--muted); }
	.search.on { color: var(--muted); }
	.search:focus-visible { box-shadow: 0 0 0 2px var(--accent); color: var(--muted); }
	.search .ph { flex: 1; min-width: 0; }

	/* mobile menu */
	.burger { display: none; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; border: 0; background: none; color: var(--ink); cursor: pointer; border-radius: 10px; }
	.burger:hover { background: var(--bg-soft); }
	.drawer { border-top: 1px solid var(--line); background: var(--bg); padding: 0.5rem 0 0.75rem; }
	.drawer .wrap { display: flex; flex-direction: column; }
	.d-link { padding: 0.7rem 0.25rem; font-size: var(--t-md); font-weight: 500; color: var(--muted); }
	.d-link.on { color: var(--ink); font-weight: 600; }

	main { padding-bottom: 5rem; }
	.ftr { border-top: 1px solid var(--line); color: var(--faint); font-size: var(--t-xs); padding-block: 2rem; }
	/* below 760px: collapse verticals + Schedule into the drawer */
	@media (max-width: 760px) {
		.verticals, .tool { display: none; }
		.burger { display: inline-flex; }
	}
	@media (max-width: 560px) { .search { width: 2.25rem; padding: 0; justify-content: center; } .search .ph { display: none; } .hdr-in { gap: 1rem; } }
</style>
