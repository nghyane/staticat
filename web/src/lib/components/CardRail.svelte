<script lang="ts">
	import MediaCard from './MediaCard.svelte';
	import type { CatalogEntry } from '$lib/types';
	// A titled rail of mini poster cards (detail-page Related / Recs / More-in-genre).
	// Renders nothing when empty. Uses the global .sec/.sec-h/.mini-grid utilities.
	let { title, items }: { title: string; items: CatalogEntry[] } = $props();
</script>

{#if items.length > 0}
	<section class="sec">
		<h2 class="sec-h">{title}</h2>
		<div class="mini-grid">{#each items as m (m.id)}<MediaCard a={m} mini />{/each}</div>
	</section>
{/if}
