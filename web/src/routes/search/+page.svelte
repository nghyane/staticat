<script lang="ts">
	import MediaCard from '$lib/components/MediaCard.svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import type { PageData } from './$types';
	import type { CatalogEntry } from '$lib/types';

	let { data }: { data: PageData } = $props();

	let q = $state(page.url.searchParams.get('q') ?? '');
	let genre = $state(page.url.searchParams.get('genre') ?? '');
	let status = $state(page.url.searchParams.get('status') ?? '');
	let sort = $state<'rating' | 'title' | 'year'>('rating');

	// top genres present in the catalog (by frequency)
	const genres = (() => {
		const c = new Map<string, number>();
		for (const e of data.index) for (const g of e.genres) c.set(g, (c.get(g) ?? 0) + 1);
		return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([g]) => g);
	})();
	const STATUSES = ['airing', 'upcoming', 'finished'] as const;

	function score(e: CatalogEntry, term: string): number {
		const t = e.title.toLowerCase();
		if (t === term) return 100;
		if (t.startsWith(term)) return 80;
		if (t.includes(term)) return 60;
		if ((e.alt ?? []).some((a) => a.toLowerCase().includes(term))) return 40;
		return 0;
	}

	const results = $derived.by(() => {
		const term = q.trim().toLowerCase();
		let list = data.index.filter(
			(e) => (!genre || e.genres.includes(genre)) && (!status || e.status === status) && (!term || score(e, term) > 0)
		);
		if (term) list = list.sort((a, b) => score(b, term) - score(a, term) || (b.rating ?? 0) - (a.rating ?? 0));
		else if (sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
		else if (sort === 'year') list = [...list].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
		else list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
		return list.slice(0, 120);
	});

	// keep the URL shareable
	$effect(() => {
		const p = new URLSearchParams();
		if (q.trim()) p.set('q', q.trim());
		if (genre) p.set('genre', genre);
		if (status) p.set('status', status);
		const qs = p.toString();
		replaceState(qs ? `/search?${qs}` : '/search', {});
	});

	const toggle = (cur: string, v: string) => (cur === v ? '' : v);
</script>

<svelte:head>
	<title>{q ? `${q} — search` : 'Search anime'} | Watchdex</title>
	<meta name="description" content="Search anime by title, genre and status." />
</svelte:head>

<div class="wrap page">
	<div class="searchbar">
		<svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="m11 11 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
		<!-- svelte-ignore a11y_autofocus -->
		<input type="search" placeholder="Search anime by title…" aria-label="Search anime" bind:value={q} autofocus />
	</div>

	<div class="filters">
		<div class="chips">
			{#each STATUSES as s}
				<button class="chip" class:on={status === s} onclick={() => (status = toggle(status, s))}>{s[0].toUpperCase() + s.slice(1)}</button>
			{/each}
		</div>
		<div class="chips">
			{#each genres as g}
				<button class="chip" class:on={genre === g} onclick={() => (genre = toggle(genre, g))}>{g}</button>
			{/each}
		</div>
		<div class="meta">
			<span class="count">{results.length} result{results.length === 1 ? '' : 's'}</span>
			{#if !q.trim()}
				<label class="sort">Sort
					<select bind:value={sort}>
						<option value="rating">Rating</option>
						<option value="year">Newest</option>
						<option value="title">A–Z</option>
					</select>
				</label>
			{/if}
		</div>
	</div>

	{#if results.length > 0}
		<div class="grid">{#each results as a (a.id)}<MediaCard {a} />{/each}</div>
	{:else}
		<p class="empty">No anime match. Try a different title or clear filters.</p>
	{/if}
</div>

<style>
	.page { padding-top: 2.5rem; }
	.searchbar { display: flex; align-items: center; gap: 0.75rem; padding: 0 1.1rem; height: 3.5rem; background: var(--bg-soft); border-radius: var(--r); color: var(--faint); transition: box-shadow .15s; }
	.searchbar:focus-within { box-shadow: 0 0 0 2px var(--accent); }
	.searchbar input { flex: 1; min-width: 0; border: 0; background: none; outline: none; font: inherit; font-size: var(--t-lg); color: var(--ink); }
	.searchbar input::placeholder { color: var(--faint); }

	.filters { display: flex; flex-direction: column; gap: 0.75rem; margin: 1.5rem 0 2rem; }
	.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
	.chip { font-family: inherit; cursor: pointer; font-size: var(--t-xs); color: var(--muted); background: var(--bg-soft); border: 0; padding: 0.35rem 0.75rem; border-radius: 999px; transition: background .14s, color .14s; }
	.chip:hover { color: var(--ink); }
	.chip.on { background: var(--accent); color: #fff; }
	.meta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 0.25rem; }
	.count { font-size: var(--t-sm); color: var(--faint); }
	.sort { font-size: var(--t-sm); color: var(--muted); display: inline-flex; align-items: center; gap: 0.4rem; }
	.sort select { font: inherit; font-size: var(--t-sm); color: var(--ink); border: 1px solid var(--line); background: var(--bg); border-radius: var(--r-sm); padding: 0.25rem 0.5rem; }

	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(142px, 1fr)); gap: 1.9rem 1.2rem; }
	@media (max-width: 560px) { .grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 1.4rem 0.8rem; } }
	.empty { color: var(--muted); padding: 4rem 0; text-align: center; }
</style>
