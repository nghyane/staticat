<script lang="ts">
	import '@fontsource-variable/space-grotesk';
	import '@fontsource-variable/hanken-grotesk';
	import '@fontsource/space-mono';
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	let { children } = $props();

	const tabs = [
		{ label: 'Anime', href: '/' },
		{ label: 'Movies', href: '/movie' },
		{ label: 'Games', href: '/game' }
	];

	// One shared interval drives every [data-airat] countdown. Re-queried each
	// tick so client navigation needs no re-binding. Zero layout shift: the
	// element reserves its width.
	onMount(() => {
		const pad = (n: number) => String(n).padStart(2, '0');
		const tick = () => {
			const now = Date.now() / 1000;
			for (const el of document.querySelectorAll<HTMLElement>('[data-airat]')) {
				const s = Math.floor(Number(el.dataset.airat) - now);
				if (s <= 0) { el.textContent = 'now'; el.classList.add('on'); continue; }
				const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
				el.textContent = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}:${pad(sec)}`;
				el.classList.toggle('soon', s < 3600);
			}
		};
		tick();
		const timer = setInterval(tick, 1000);
		return () => clearInterval(timer);
	});
</script>

<header class="hdr">
	<div class="wrap hdr-in">
		<a class="brand" href="/"><span class="mark"></span>watchdex</a>
		<nav class="tabs" aria-label="Sections">
			{#each tabs as t (t.href)}
				{@const on = t.href === '/' ? page.url.pathname === '/' || page.url.pathname.startsWith('/anime') : page.url.pathname.startsWith(t.href)}
				<a href={t.href} class="tab" class:on aria-current={on ? 'page' : undefined}>{t.label}</a>
			{/each}
		</nav>
		<form class="search" role="search" onsubmit={(e) => e.preventDefault()}>
			<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="m11 11 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
			<input type="search" placeholder="Search" aria-label="Search" />
		</form>
	</div>
</header>

<main>{@render children()}</main>

<footer class="ftr"><div class="wrap">Data from AniList &middot; Times in your local timezone</div></footer>

<style>
	.hdr { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
	.hdr-in { display: flex; align-items: stretch; gap: 1.5rem; height: 4rem; }
	.brand { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; letter-spacing: -0.02em; }
	.mark { width: 0.6rem; height: 0.6rem; border-radius: 50%; background: var(--accent); }
	.tabs { display: flex; align-items: stretch; gap: 0.1rem; }
	.tab { display: inline-flex; align-items: center; position: relative; font-size: var(--t-sm); font-weight: 500; color: var(--muted); padding: 0 0.6rem; transition: color .15s; }
	.tab:hover { color: var(--ink); }
	.tab.on { color: var(--ink); font-weight: 600; }
	.tab.on::after { content: ''; position: absolute; left: 0.6rem; right: 0.6rem; bottom: -1px; height: 2px; background: var(--accent); border-radius: 2px 2px 0 0; }
	.search { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; align-self: center; width: min(16rem, 32vw); height: 2.25rem; padding: 0 0.8rem; background: var(--bg-soft); border-radius: 10px; color: var(--faint); transition: box-shadow .15s; }
	.search:focus-within { box-shadow: 0 0 0 2px var(--accent); }
	.search input { flex: 1; min-width: 0; border: 0; background: none; outline: none; font: inherit; font-size: var(--t-sm); color: var(--ink); }
	.search input::placeholder { color: var(--faint); }
	main { padding-bottom: 5rem; }
	.ftr { border-top: 1px solid var(--line); color: var(--faint); font-size: var(--t-xs); padding-block: 2rem; }
	@media (max-width: 560px) { .search { width: 2.25rem; padding: 0; justify-content: center; } .search input { display: none; } .hdr-in { gap: 1rem; } }
</style>
