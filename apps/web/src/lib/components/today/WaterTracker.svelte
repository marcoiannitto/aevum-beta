<script lang="ts">
	import { dayData, saveDay } from '$lib/stores/day';
	import { cfg } from '$lib/stores/config';

	const glassMl = $derived(cfg('glass_ml'));
	const water = $derived($dayData?.water ?? 0);
	const glasses = $derived(glassMl > 0 ? Math.floor(water / glassMl) : 0);
	const TARGET = 8;

	function addGlass() {
		if (!$dayData) return;
		$dayData.water = water + glassMl;
		saveDay();
	}

	function removeGlass() {
		if (!$dayData || water <= 0) return;
		$dayData.water = Math.max(0, water - glassMl);
		saveDay();
	}
</script>

<section class="water">
	<div class="sec-header">
		<h3>Water</h3>
		<span class="water-count">{glasses} / {TARGET} glasses</span>
	</div>
	<div class="glasses-row">
		{#each Array(TARGET) as _, i}
			<button
				class="glass"
				class:filled={i < glasses}
				onclick={i < glasses ? removeGlass : addGlass}
			>
				<svg viewBox="0 0 24 32" class="glass-icon">
					<path d="M4 2h16l-2 28H6z" fill={i < glasses ? 'var(--water)' : 'none'} stroke="var(--line)" stroke-width="1.5"/>
				</svg>
			</button>
		{/each}
	</div>
	<p class="ml-label">{water} ml</p>
</section>

<style>
	.water {
		padding: 0 18px 16px;
	}
	.sec-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}
	h3 {
		font-size: 14px;
		font-weight: 600;
		margin: 0;
	}
	.water-count {
		font-size: 12px;
		color: var(--muted);
	}
	.glasses-row {
		display: flex;
		gap: 4px;
		justify-content: center;
	}
	.glass {
		width: 32px;
		height: 40px;
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 2px;
	}
	.glass-icon {
		width: 100%;
		height: 100%;
	}
	.ml-label {
		text-align: center;
		font-size: 11px;
		color: var(--muted);
		margin: 4px 0 0;
	}
</style>
