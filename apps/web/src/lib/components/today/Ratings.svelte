<script lang="ts">
	import { dayData, saveDay } from '$lib/stores/day';

	const energy = $derived($dayData?.energy ?? 0);
	const hunger = $derived($dayData?.hunger ?? 0);
	const sleep = $derived($dayData?.sleep ?? 0);

	function set(field: 'energy' | 'hunger' | 'sleep', val: number) {
		if (!$dayData) return;
		$dayData[field] = val;
		saveDay();
	}

	const rows: { key: 'energy' | 'hunger' | 'sleep'; label: string; lo: string; hi: string }[] = [
		{ key: 'energy', label: 'Energy', lo: 'Low', hi: 'High' },
		{ key: 'hunger', label: 'Hunger', lo: 'None', hi: 'Starving' },
		{ key: 'sleep', label: 'Sleep', lo: 'Poor', hi: 'Great' }
	];

	function valFor(key: 'energy' | 'hunger' | 'sleep') {
		if (key === 'energy') return energy;
		if (key === 'hunger') return hunger;
		return sleep;
	}
</script>

<section class="ratings">
	<h3>How do you feel?</h3>
	{#each rows as row}
		{@const val = valFor(row.key)}
		<div class="rating-row">
			<label class="rating-label">{row.label}</label>
			<div class="slider-wrap">
				<span class="bound">{row.lo}</span>
				<input
					type="range"
					min="0"
					max="10"
					value={val}
					oninput={(e) => set(row.key, +e.currentTarget.value)}
					class="slider"
				/>
				<span class="bound">{row.hi}</span>
			</div>
			<span class="val">{val}/10</span>
		</div>
	{/each}
</section>

<style>
	.ratings { padding: 0 18px 16px; }
	h3 { font-size: 14px; font-weight: 600; margin: 0 0 10px; }
	.rating-row {
		display: flex; align-items: center; gap: 8px;
		margin-bottom: 8px;
	}
	.rating-label {
		width: 56px; font-size: 13px; font-weight: 500; flex-shrink: 0;
	}
	.slider-wrap {
		flex: 1; display: flex; align-items: center; gap: 6px;
	}
	.bound { font-size: 10px; color: var(--muted); white-space: nowrap; }
	.slider {
		flex: 1; height: 4px;
		-webkit-appearance: none; appearance: none;
		background: var(--line); border-radius: 2px; outline: none;
	}
	.slider::-webkit-slider-thumb {
		-webkit-appearance: none; appearance: none;
		width: 18px; height: 18px; border-radius: 50%;
		background: var(--gold); cursor: pointer;
	}
	.slider::-moz-range-thumb {
		width: 18px; height: 18px; border-radius: 50%;
		background: var(--gold); cursor: pointer; border: none;
	}
	.val {
		width: 32px; text-align: right;
		font-size: 12px; color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
</style>
