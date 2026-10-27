<script lang="ts">
	import { dayData, saveDay } from '$lib/stores/day';

	const weight = $derived($dayData?.weight ?? '');
	const waist = $derived($dayData?.waist ?? '');

	let showWaistTip = $state(false);

	function setWeight(e: Event) {
		if (!$dayData) return;
		$dayData.weight = (e.currentTarget as HTMLInputElement).value;
		saveDay();
	}

	function setWaist(e: Event) {
		if (!$dayData) return;
		$dayData.waist = (e.currentTarget as HTMLInputElement).value;
		saveDay();
		if (!$dayData.waist) showWaistTip = true;
	}
</script>

<section class="block">
	<h3 class="b-title">Body</h3>
	<div class="mrow">
		<span class="lab">Weight (morning)</span>
		<input
			class="mini-in"
			type="number"
			inputmode="decimal"
			placeholder="kg"
			value={weight}
			onblur={setWeight}
		/>
	</div>
	<div class="mrow">
		<span class="lab">Waist (cm)</span>
		<input
			class="mini-in"
			type="number"
			inputmode="decimal"
			placeholder="cm"
			value={waist}
			onblur={setWaist}
		/>
	</div>
	{#if showWaistTip && !waist}
		<p class="tip">Tip: tracking waist helps you see changes beyond weight.</p>
	{/if}
</section>

<style>
	.block {
		padding: 16px;
		background: var(--card, #fff);
		border: 1px solid var(--line);
		border-radius: 14px;
		margin-bottom: 12px;
	}
	.b-title {
		font-size: 14px;
		font-weight: 600;
		margin: 0 0 12px;
	}
	.mrow {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 0;
	}
	.lab {
		font-size: 14px;
		color: var(--ink);
	}
	.mini-in {
		width: 80px;
		padding: 6px 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 14px;
		text-align: right;
		font-family: inherit;
		font-variant-numeric: tabular-nums;
	}
	.tip {
		font-size: 12px;
		color: var(--muted);
		margin: 6px 0 0;
		line-height: 1.4;
	}
</style>
