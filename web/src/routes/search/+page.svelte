<script lang="ts">
	import MediaCard from '$lib/components/MediaCard.svelte';
	import Select from '$lib/components/Select.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import type { PageData } from './$types';
	import type { CatalogEntry } from '$lib/types';

	let { data }: { data: PageData } = $props();

	const PAGE_SIZE = 30;
	const KINDS = [{ v: '', l: 'All' }, { v: 'anime', l: 'Anime' }, { v: 'manga', l: 'Manga' }, { v: 'movie', l: 'Movies' }, { v: 'game', l: 'Games' }];

	const p0 = page.url.searchParams;
	let q = $state(p0.get('q') ?? '');
	let kind = $state(p0.get('kind') ?? '');
	let genre = $state(p0.get('genre') ?? '');
	let status = $state(p0.get('status') ?? '');
	let sort = $state(p0.get('sort') ?? 'rating');
	let pageNum = $state(Number(p0.get('page')) || 1);

	// genre options scoped to the active kind
	const genreOptions = $derived.by(() => {
		const c = new Map<string, number>();
		for (const e of data.index) if (!kind || e.kind === kind) for (const g of e.genres) c.set(g, (c.get(g) ?? 0) + 1);
		const opts = [...c.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => ({ value: g, label: g }));
		return [{ value: '', label: 'All genres' }, ...opts];
	});
	const statusOptions = [
		{ value: '', label: 'Any status' },
		{ value: 'airing', label: 'Airing / Publishing' },
		{ value: 'upcoming', label: 'Upcoming' },
		{ value: 'finished', label: 'Finished' }
	];
	const sortOptions = [
		{ value: 'rating', label: 'Top rated' },
		{ value: 'year', label: 'Newest' },
		{ value: 'title', label: 'A–Z' }
	];

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
			(e) => (!kind || e.kind === kind) && (!genre || e.genres.includes(genre)) && (!status || e.status === status) && (!term || score(e, term) > 0)
		);
		if (term) return list.sort((a, b) => score(b, term) - score(a, term) || (b.rating ?? 0) - (a.rating ?? 0));
		if (sort === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title));
		if (sort === 'year') return [...list].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
		return [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
	});

	const total = $derived(results.length);
	const pages = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));
	const clampedPage = $derived(Math.min(pageNum, pages));
	const shown = $derived(results.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE));

	// reset to page 1 whenever the query/filters change
	let lastKey = $state('');
	$effect(() => {
		const key = `${q}|${kind}|${genre}|${status}|${sort}`;
		if (key !== lastKey) { lastKey = key; pageNum = 1; }
	});

	// shareable URL — only after mount (replaceState needs the client router ready)
	let mounted = $state(false);
	onMount(() => (mounted = true));
	$effect(() => {
		const sp = new URLSearchParams();
		if (q.trim()) sp.set('q', q.trim());
		if (kind) sp.set('kind', kind);
		if (genre) sp.set('genre', genre);
		if (status) sp.set('status', status);
		if (!q.trim() && sort !== 'rating') sp.set('sort', sort);
		if (clampedPage > 1) sp.set('page', String(clampedPage));
		const qs = sp.toString();
		if (!mounted) return;
		try { replaceState(qs ? `/search?${qs}` : '/search', {}); } catch { /* router not ready */ }
	});

	// windowed page numbers with ellipsis
	const pageList = $derived.by(() => {
		const set = new Set([1, pages, clampedPage, clampedPage - 1, clampedPage + 1, clampedPage - 2, clampedPage + 2].filter((n) => n >= 1 && n <= pages));
		const arr = [...set].sort((a, b) => a - b);
		const out: (number | '…')[] = [];
		for (let i = 0; i < arr.length; i++) { if (i && arr[i] - arr[i - 1] > 1) out.push('…'); out.push(arr[i]); }
		return out;
	});
	function go(n: number) { pageNum = Math.min(Math.max(1, n), pages); if (typeof scrollTo === 'function') scrollTo({ top: 0 }); }
</script>

<svelte:head>
	<title>{q ? `${q} — search` : 'Search anime & manga'} | Watchdex</title>
	<meta name="description" content="Search anime and manga by title, genre and status." />
</svelte:head>

<div class="wrap page">
	<div class="searchbar">
		<svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="m11 11 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
		<!-- svelte-ignore a11y_autofocus -->
		<input type="search" placeholder="Search anime & manga…" aria-label="Search" bind:value={q} autofocus />
		{#if q}<button class="clear" aria-label="Clear" onclick={() => (q = '')}>&times;</button>{/if}
	</div>

	<div class="bar">
		<div class="segmented" role="tablist" aria-label="Type">
			{#each KINDS as k}
				<button class="seg" class:on={kind === k.v} role="tab" aria-selected={kind === k.v} onclick={() => (kind = k.v)}>{k.l}</button>
			{/each}
		</div>
		<Select value={genre} options={genreOptions} label="All genres" onchange={(v) => (genre = v)} />
		<Select value={status} options={statusOptions} label="Any status" onchange={(v) => (status = v)} />
		{#if !q.trim()}<Select value={sort} options={sortOptions} label="Top rated" onchange={(v) => (sort = v)} />{/if}
		<span class="count">{total} result{total === 1 ? '' : 's'}</span>
	</div>

	{#if total > 0}
		<div class="grid">{#each shown as a (a.id)}<MediaCard {a} />{/each}</div>

		{#if pages > 1}
			<nav class="pager" aria-label="Pagination">
				<button class="pg" disabled={clampedPage === 1} onclick={() => go(clampedPage - 1)} aria-label="Previous">&lsaquo;</button>
				{#each pageList as n}
					{#if n === '…'}<span class="dots">…</span>
					{:else}<button class="pg" class:on={n === clampedPage} onclick={() => go(n)} aria-current={n === clampedPage ? 'page' : undefined}>{n}</button>{/if}
				{/each}
				<button class="pg" disabled={clampedPage === pages} onclick={() => go(clampedPage + 1)} aria-label="Next">&rsaquo;</button>
			</nav>
		{/if}
	{:else}
		<p class="empty">No {kind || 'titles'} match. Try a different title or clear filters.</p>
	{/if}
</div>

<style>
	.page { padding-top: 2.5rem; }
	.searchbar { display: flex; align-items: center; gap: 0.75rem; padding: 0 1.1rem; height: 3.5rem; background: var(--bg-soft); border-radius: var(--r); color: var(--faint); transition: box-shadow .15s; }
	.searchbar:focus-within { box-shadow: 0 0 0 2px var(--accent); }
	.searchbar input { flex: 1; min-width: 0; border: 0; background: none; outline: none; font: inherit; font-size: var(--t-lg); color: var(--ink); }
	.searchbar input::placeholder { color: var(--faint); }
	.clear { border: 0; background: none; cursor: pointer; color: var(--faint); font-size: 1.5rem; line-height: 1; padding: 0 .25rem; }
	.clear:hover { color: var(--ink); }

	.bar { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem; margin: 1.25rem 0 2rem; }
	.segmented { display: inline-flex; background: var(--bg-soft); border-radius: 999px; padding: 3px; }
	.seg { font: inherit; font-size: var(--t-sm); cursor: pointer; border: 0; background: none; color: var(--muted); padding: 0.35rem 0.9rem; border-radius: 999px; transition: background .14s, color .14s; }
	.seg.on { background: var(--bg); color: var(--ink); font-weight: 600; box-shadow: var(--shadow); }
	.count { margin-left: auto; font-size: var(--t-sm); color: var(--faint); }

	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(142px, 1fr)); gap: 1.9rem 1.2rem; }
	@media (max-width: 560px) { .grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 1.4rem 0.8rem; } .count { margin-left: 0; width: 100%; } }
	.empty { color: var(--muted); padding: 4rem 0; text-align: center; }

	.pager { display: flex; align-items: center; justify-content: center; gap: 0.3rem; margin: 3rem 0 1rem; }
	.pg { font: inherit; font-size: var(--t-sm); min-width: 2.25rem; height: 2.25rem; padding: 0 0.6rem; border: 1px solid var(--line); background: var(--bg); color: var(--ink); border-radius: var(--r-sm); cursor: pointer; transition: background .14s, border-color .14s; }
	.pg:hover:not(:disabled) { background: var(--bg-soft); }
	.pg.on { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
	.pg:disabled { color: var(--faint); cursor: default; }
	.dots { color: var(--faint); padding: 0 0.2rem; }
</style>
