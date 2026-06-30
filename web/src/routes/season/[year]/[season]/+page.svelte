<script lang="ts">
	import BrowseGrid from '$lib/components/BrowseGrid.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.label} anime — season | Watchdex</title>
	<meta name="description" content={`All anime from the ${data.label} season, with scores and where to watch.`} />
</svelte:head>

<BrowseGrid eyebrow="Season" title={data.label} items={data.items} />
