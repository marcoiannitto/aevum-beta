<script lang="ts">
	import { profile } from '$lib/stores/auth';
	import { currentDay, dayData, totals as calcTotals } from '$lib/stores/day';
	import { effectiveTarget, calorieBank } from '$lib/stores/calorie';
	import { phases, phaseFor, phReg } from '$lib/stores/phases';

	// Subscribe to $phases so Svelte 5 re-runs deriveds when phase registry updates (fix #35)
	const ph = $derived(($phases, phaseFor($currentDay, $profile)));
	const reg = $derived(($phases, phReg(ph.key)));
	const t = $derived($dayData ? calcTotals($dayData) : { kcal: 0, protein: 0, fat: 0, carbs: 0, exKcal: 0 });
	const target = $derived(($phases, effectiveTarget($currentDay, $profile)));
	const bank = $derived(reg?.calorie_bank ? calorieBank($currentDay) : 0);
	const adjusted = $derived(target + bank);
	const pct = $derived(adjusted > 0 ? Math.min(t.kcal / adjusted, 1.5) : 0);
	const remaining = $derived(Math.max(0, adjusted - t.kcal));

	// Ring SVG params
	const R = 70;
	const C = 2 * Math.PI * R;
	const stroke = $derived(C * (1 - Math.min(pct, 1)));
	const ringColor = $derived(
		pct > 1.1 ? 'var(--over)' :
		pct > 0.95 ? 'var(--warn)' :
		'var(--gold)'
	);
</script>

<div class="cal-ring">
	<svg viewBox="0 0 160 160" class="ring-svg">
		<circle cx="80" cy="80" r={R} fill="none" stroke="var(--line)" stroke-width="8" />
		<circle
			cx="80" cy="80" r={R}
			fill="none"
			stroke={ringColor}
			stroke-width="8"
			stroke-dasharray={C}
			stroke-dashoffset={stroke}
			stroke-linecap="round"
			transform="rotate(-90 80 80)"
		/>
	</svg>
	<div class="ring-inner">
		<span class="cal-eaten">{t.kcal}</span>
		<span class="cal-label">of {adjusted} kcal</span>
		{#if remaining > 0}
			<span class="cal-remain">{remaining} left</span>
		{:else}
			<span class="cal-over">Over by {Math.abs(remaining)}</span>
		{/if}
	</div>
</div>

{#if bank !== 0}
	<p class="bank-note">
		Bank: {bank > 0 ? '+' : ''}{bank} kcal
		(target {target} {bank > 0 ? '+' : ''}{bank} = {adjusted})
	</p>
{/if}

<div class="macro-row">
	<div class="macro">
		<span class="macro-val">{t.protein}g</span>
		<span class="macro-lbl">Protein</span>
	</div>
	<div class="macro">
		<span class="macro-val">{t.fat}g</span>
		<span class="macro-lbl">Fat</span>
	</div>
	<div class="macro">
		<span class="macro-val">{t.carbs}g</span>
		<span class="macro-lbl">Carbs</span>
	</div>
	{#if t.exKcal > 0}
		<div class="macro">
			<span class="macro-val">-{t.exKcal}</span>
			<span class="macro-lbl">Exercise</span>
		</div>
	{/if}
</div>

<style>
	.cal-ring {
		position: relative;
		width: 160px;
		height: 160px;
		margin: 16px auto 8px;
	}
	.ring-svg {
		width: 100%;
		height: 100%;
	}
	.ring-inner {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.cal-eaten {
		font-family: var(--serif);
		font-size: 28px;
		font-weight: 700;
		line-height: 1;
	}
	.cal-label {
		font-size: 11px;
		color: var(--muted);
	}
	.cal-remain {
		font-size: 11px;
		color: var(--ok);
		margin-top: 2px;
	}
	.cal-over {
		font-size: 11px;
		color: var(--over);
		margin-top: 2px;
	}
	.bank-note {
		text-align: center;
		font-size: 11px;
		color: var(--muted);
		margin: 0 0 8px;
	}
	.macro-row {
		display: flex;
		justify-content: center;
		gap: 20px;
		padding: 0 16px 16px;
	}
	.macro {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	.macro-val {
		font-size: 15px;
		font-weight: 600;
	}
	.macro-lbl {
		font-size: 11px;
		color: var(--muted);
	}
</style>
