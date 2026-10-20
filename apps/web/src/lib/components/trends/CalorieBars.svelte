<!--
  CalorieBars — daily calorie vs target bar chart.
  Maps to collectMacroDays + calorie bar rendering from index.html.
-->
<script lang="ts">
	import { phaseFor } from '$lib/stores/phases';
	import { ruleFor } from '$lib/stores/rules';
	import { profile } from '$lib/stores/auth';

	interface DayBar {
		day: number;
		kcal: number;
		target: number;
	}

	let { data = [], height = 140 }: { data: DayBar[]; height?: number } = $props();

	const W = 440;
	const padL = 32;
	const padR = 16;
	const padT = 8;
	const padB = 24;

	const chartW = W - padL - padR;
	const chartH = height - padT - padB;

	const maxVal = $derived(Math.max(...data.map(d => Math.max(d.kcal, d.target)), 100));

	function x(i: number): number {
		if (data.length <= 1) return padL + chartW / 2;
		return padL + (i / (data.length - 1)) * chartW;
	}

	function yH(val: number): number {
		return (val / maxVal) * chartH;
	}

	const barW = $derived(Math.max(4, Math.min(16, chartW / data.length * 0.6)));

	const bars = $derived(data.map((d, i) => {
		const cx = x(i);
		const kcalH = yH(d.kcal);
		const targetH = yH(d.target);
		const ph = phaseFor(d.day, $profile);
		const rule = ruleFor(ph.key, 'kcal');
		const overBudget = d.kcal > d.target * (rule?.amber_hi ?? 1.1);
		const underBudget = d.kcal < d.target * (rule?.amber_lo ?? 0.85);
		return {
			cx,
			kcalH,
			targetH,
			kcal: d.kcal,
			target: d.target,
			day: d.day,
			fill: overBudget ? 'var(--red, #A13024)' : underBudget ? 'var(--gold)' : 'var(--green, #2d6a4f)'
		};
	}));

	// X labels — show every Nth day
	const xLabels = $derived.by(() => {
		const step = Math.max(1, Math.ceil(data.length / 7));
		return data.filter((_, i) => i % step === 0).map((d, _, arr) => ({
			x: x(data.indexOf(d)),
			label: `D${d.day}`
		}));
	});
</script>

{#if data.length >= 1}
	<svg viewBox="0 0 {W} {height}" width="100%" preserveAspectRatio="xMidYMid meet" class="cal-bars">
		<!-- X labels -->
		{#each xLabels as lbl}
			<text x={lbl.x} y={height - 4} font-size="9" fill="var(--muted)" text-anchor="middle" font-family="sans-serif">{lbl.label}</text>
		{/each}

		{#each bars as b}
			<!-- Target bar (background) -->
			<rect
				x={b.cx - barW / 2 - 1}
				y={padT + chartH - b.targetH}
				width={barW + 2}
				height={b.targetH}
				fill="var(--line)"
				rx="2"
			/>
			<!-- Actual bar -->
			<rect
				x={b.cx - barW / 2}
				y={padT + chartH - b.kcalH}
				width={barW}
				height={b.kcalH}
				fill={b.fill}
				rx="2"
				opacity="0.85"
			/>
		{/each}
	</svg>
{:else}
	<div class="no-data">No calorie data yet</div>
{/if}

<style>
	.cal-bars { display: block; }
	.no-data { text-align: center; color: var(--muted); font-size: 13px; padding: 30px; }
</style>
