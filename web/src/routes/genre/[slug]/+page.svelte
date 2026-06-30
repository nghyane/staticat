<script lang="ts">
	import BrowseGrid from '$lib/components/BrowseGrid.svelte';
	import { page } from '$app/state';
	import { SITE } from '$lib/site';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	// genres span every vertical — name the kinds actually present, not just anime
	const KIND_LABEL: Record<string, string> = { anime: 'anime', manga: 'manga', movie: 'movies', tv: 'TV series', game: 'games' };
	const kinds = $derived([...new Set(data.items.map((e) => e.kind))].map((k) => KIND_LABEL[k] ?? k));
	const kindList = $derived(kinds.length > 1 ? `${kinds.slice(0, -1).join(', ')} and ${kinds.at(-1)}` : (kinds[0] ?? 'titles'));
	const canonical = $derived(`${SITE}/genre/${page.params.slug}`);
	const title = $derived(`${data.name} — top ${kindList} | Watchdex`);
	const desc = $derived(`Browse the best ${data.name} ${kindList} ranked by score, with ratings and where to watch or read.`);

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: `${data.name} — ${kindList}`,
		about: desc,
		mainEntity: {
			'@type': 'ItemList',
			numberOfItems: data.items.length,
			itemListElement: data.items.slice(0, 10).map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: e.title }))
		}
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

<BrowseGrid eyebrow="Genre" title={data.name} items={data.items} />
