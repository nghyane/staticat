<script lang="ts">
	import BrowseGrid from '$lib/components/BrowseGrid.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.name} anime — browse | Watchdex</title>
	<meta name="description" content={`Browse ${data.name} anime by score, with airing schedule and where to watch.`} />
</svelte:head>

<BrowseGrid eyebrow="Genre" title={data.name} items={data.items} />
