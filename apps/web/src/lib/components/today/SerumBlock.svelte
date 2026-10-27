<!--
  SerumBlock — AM/PM serum toggle buttons.
  Maps to .serum-block from index.html.
  Shown only when phase requires serum (loading/activation or phReg.requires_serum).
-->
<script lang="ts">
	import { profile } from '$lib/stores/auth';
	import { currentDay, dayData, saveDay } from '$lib/stores/day';
	import { phaseFor, phReg } from '$lib/stores/phases';

	let phase = $derived(phaseFor($currentDay, $profile));
	let reg = $derived(phReg(phase.key));
	let show = $derived(
		reg ? !!reg.requires_serum : (phase.key === 'loading' || phase.key === 'activation')
	);

	function toggleAM() {
		if (!$dayData) return;
		$dayData.serumAM = !$dayData.serumAM;
		saveDay();
	}

	function togglePM() {
		if (!$dayData) return;
		$dayData.serumPM = !$dayData.serumPM;
		saveDay();
	}
</script>

{#if show}
	<div class="block serum-block">
		<div class="b-title">Serum</div>
		<div class="serum-row">
			<button class="serum-btn" class:on={$dayData?.serumAM} onclick={toggleAM}>
				<span class="ic">
					<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="4.5"/>
						<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
					</svg>
				</span>
				<span class="s-lab2">Morning</span>
			</button>
			<button class="serum-btn" class:on={$dayData?.serumPM} onclick={togglePM}>
				<span class="ic">
					<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/>
					</svg>
				</span>
				<span class="s-lab2">Evening</span>
			</button>
		</div>
	</div>
{/if}

<style>
	.block { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 2px 16px; margin-bottom: 12px; }
	.b-title { font-size: 14px; font-weight: 600; padding: 12px 0 4px; }
	.serum-row { display: flex; gap: 10px; padding: 2px 0 12px; }
	.serum-btn { flex: 1; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--line); border-radius: 12px; padding: 11px; background: var(--paper); cursor: pointer; }
	.serum-btn .ic { color: var(--muted); display: flex; }
	.serum-btn .s-lab2 { font-size: 14px; font-weight: 500; color: var(--ink-soft); }
	.serum-btn.on { background: var(--gold); border-color: var(--gold); }
	.serum-btn.on .ic, .serum-btn.on .s-lab2 { color: var(--ink); }
</style>
