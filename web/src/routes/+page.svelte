<script lang="ts">
	import HomeView from '$lib/components/HomeView.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Watchdex — anime airing schedule & where to watch</title>
	<meta name="description" content="When the next episode airs and where to watch it. Updated every day." />
</svelte:head>

<HomeView home={data.home} />
