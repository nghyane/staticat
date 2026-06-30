<script lang="ts">
	// Custom dropdown — styled trigger + popover list (native <select> can't be
	// styled). One-way value + onchange callback (avoids bind edge cases).
	let { value, options, label = 'Select', onchange }: { value: string; options: { value: string; label: string }[]; label?: string; onchange: (v: string) => void } = $props();
	let open = $state(false);
	let el: HTMLDivElement;

	const current = $derived(options.find((o) => o.value === value)?.label ?? label);
	const active = $derived(!!value);

	function pick(v: string) { onchange(v); open = false; }

	$effect(() => {
		if (!open) return;
		const onClick = (e: MouseEvent) => { if (el && !el.contains(e.target as Node)) open = false; };
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open = false; };
		window.addEventListener('click', onClick, true);
		window.addEventListener('keydown', onKey);
		return () => { window.removeEventListener('click', onClick, true); window.removeEventListener('keydown', onKey); };
	});
</script>

<div class="dd" bind:this={el}>
	<button class="trigger" class:on={open} class:active aria-haspopup="listbox" aria-expanded={open} onclick={() => (open = !open)}>
		<span>{current}</span>
		<svg class="chev" class:up={open} width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
	</button>
	{#if open}
		<ul class="menu" role="listbox" aria-label={label}>
			{#each options as o (o.value)}
				<li>
					<button class="opt" class:sel={o.value === value} role="option" aria-selected={o.value === value} onclick={() => pick(o.value)}>
						{o.label}
						{#if o.value === value}<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5 5 9l4.5-5.5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.dd { position: relative; }
	.trigger { display: inline-flex; align-items: center; gap: 0.45rem; font: inherit; font-size: var(--t-sm); color: var(--muted); background: var(--bg-soft); border: 0; border-radius: 999px; padding: 0.4rem 0.55rem 0.4rem 0.9rem; cursor: pointer; transition: background .14s, color .14s; }
	.trigger:hover { color: var(--ink); }
	.trigger.active { color: var(--ink); font-weight: 600; }
	.trigger.on { color: var(--ink); }
	.chev { color: var(--faint); transition: transform .18s; }
	.chev.up { transform: rotate(180deg); }

	.menu { position: absolute; z-index: 30; top: calc(100% + 0.4rem); left: 0; min-width: 11rem; max-height: 16rem; overflow-y: auto; list-style: none; margin: 0; padding: 0.35rem; background: var(--bg); border: 1px solid var(--line); border-radius: var(--r); box-shadow: var(--shadow); }
	.opt { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; font: inherit; font-size: var(--t-sm); text-align: left; color: var(--ink); background: none; border: 0; border-radius: var(--r-sm); padding: 0.5rem 0.7rem; cursor: pointer; }
	.opt:hover { background: var(--bg-soft); }
	.opt.sel { color: var(--accent); font-weight: 600; }
</style>
