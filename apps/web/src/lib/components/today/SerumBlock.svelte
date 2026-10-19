<script lang="ts">
	import { dayData, saveDay } from '$lib/stores/day';
	import { currentDay } from '$lib/stores/day';
	import { profile } from '$lib/stores/auth';
	import { phaseFor, phReg } from '$lib/stores/phases';

	const phase = $derived(phaseFor($currentDay, $profile));
	const reg = $derived(phReg(phase.key));
	const showSerum = $derived(reg?.serum === true);

	const am = $derived($dayData?.serumAM ?? false);
	const pm = $derived($dayData?.serumPM ?? false);

	function toggle(slot: 'serumAM' | 'serumPM') {
		if (!$dayData) return;
		$dayData[slot] = !$dayData[slot];
		saveDay();
	}
</script>

{#if showSerum}
	<section class="serum">
		<h3>Serum</h3>
		<div class="serum-row">
			<button class="serum-btn" class:done={am} onclick={() => toggle('serumAM')}>
				<span class="check">{am ? '✓' : ''}</span>
				AM
			</button>
			<button class="serum-btn" class:done={pm} onclick={() => toggle('serumPM')}>
				<span class="check">{pm ? '✓' : ''}</span>
				PM
			</button>
		</div>
	</section>
{/if}

<style>
	.serum { padding: 0 18px 16px; }
	h3 { font-size: 14px; font-weight: 600; margin: 0 0 8px; }
	.serum-row { display: flex; gap: 10px; }
	.serum-btn {
		flex: 1; display: flex; align-items: center; justify-content: center;
		gap: 6px; padding: 10px;
		border: 1px solid var(--line); border-radius: 10px;
		background: var(--card, #fff); font-size: 14px; font-weight: 500;
		cursor: pointer; transition: all 0.15s;
	}
	.serum-btn.done {
		border-color: var(--gold); background: rgba(176, 141, 46, 0.08);
		color: var(--gold);
	}
	.check { font-size: 16px; width: 18px; }
</style>
