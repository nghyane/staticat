<script lang="ts">
	import BrowseGrid from '$lib/components/BrowseGrid.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { genreQuery } from '$lib/data';
	import { SITE } from '$lib/site';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	// genres span every vertical — name the kinds actually present (baked at build)
	const KIND_LABEL: Record<string, string> = { anime: 'anime', manga: 'manga', movie: 'movies', tv: 'TV series', game: 'games' };
	const kinds = $derived(data.kinds.map((k) => KIND_LABEL[k] ?? k));
	const kindList = $derived(kinds.length > 1 ? `${kinds.slice(0, -1).join(', ')} and ${kinds.at(-1)}` : (kinds[0] ?? 'titles'));
	const canonical = $derived(`${SITE}/genre/${data.slug}`);
	const title = $derived(`${data.name} — top ${kindList} | Watchdex`);
	const desc = $derived(`Browse the best ${data.name} ${kindList} ranked by score, with ratings and where to watch or read.`);

	// grid hydrates fresh from R2 — prerendered HTML bakes only the skeleton above
	const q = createQuery(() => genreQuery(data.slug));
	const items = $derived(q.data ?? []);

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: `${data.name} — ${kindList}`,
		about: desc
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={desc} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonical} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={desc} />
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`}
</svelte:head>

<BrowseGrid eyebrow="Genre" title={data.name} {items} count={data.count} />
