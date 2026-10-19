<!--
  TrendsTab — composes weight/waist charts, stat cards, calorie bars, phase strip.
  Maps to renderTrends() + collectMacroDays() from index.html.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import { pid, profile } from '$lib/stores/auth';
	import { K } from '$lib/stores/auth';
	import { phaseFor } from '$lib/stores/phases';
	import { totals, type DayData } from '$lib/stores/day';
	import { effectiveTarget } from '$lib/stores/calorie';
	import { totalDays } from '$lib/stores/phases';

	import LineChart from './LineChart.svelte';
	import StatRow from './StatRow.svelte';
	import CalorieBars from './CalorieBars.svelte';
	import PhaseStrip from './PhaseStrip.svelte';

	// Collect series from localStorage
	interface WPoint { day: number; v: number }
	interface CalBar { day: number; kcal: number; target: number }

	const maxDay = $derived(totalDays($profile) || 31);

	function collectSeries() {
		const id = get(pid);
		if (!id) return { weight: [], waist: [], calories: [] };

		const weight: WPoint[] = [];
		const waist: WPoint[] = [];
		const calories: CalBar[] = [];

		for (let d = 1; d <= maxDay + 5; d++) {
			try {
				const raw = localStorage.getItem(K(id, `day_${d}`));
				if (!raw) continue;
				const dd = JSON.parse(raw) as DayData;

				if (dd.weight && +dd.weight > 0) {
					weight.push({ day: d, v: +dd.weight });
				}
				if (dd.waist && +dd.waist > 0) {
					waist.push({ day: d, v: +dd.waist });
				}

				const t = totals(dd);
				if (t.kcal > 0) {
					calories.push({ day: d, kcal: t.kcal, target: effectiveTarget(d) });
				}
			} catch { continue; }
		}

		return { weight, waist, calories };
	}

	// Reactive: re-collect when profile changes (start_date etc.)
	const series = $derived.by(() => {
		// Touch profile to trigger reactivity
		void $profile;
		return collectSeries();
	});

	// Weight stats
	const weightStats = $derived.by(() => {
		const w = series.weight;
		if (!w.length) return [];

		const first = w[0];
		const last = w[w.length - 1];
		const totalChange = last.v - first.v;
		const targetW = $profile?.target_weight;

		const stats = [
			{
				label: 'Start',
				value: `${first.v} kg`
			},
			{
				label: 'Current',
				value: `${last.v} kg`
			},
			{
				label: 'Change',
				value: `${totalChange > 0 ? '+' : ''}${totalChange.toFixed(1)} kg`,
				delta: totalChange > 0 ? '▲' : totalChange < 0 ? '▼' : '—',
				deltaClass: (totalChange < 0 ? 'down' : totalChange > 0 ? 'up' : 'flat') as 'up' | 'down' | 'flat'
			}
		];

		if (targetW && +targetW > 0) {
			const remaining = last.v - +targetW;
			stats.push({
				label: 'To target',
				value: `${remaining > 0 ? '' : '+'}${Math.abs(remaining).toFixed(1)} kg`,
				delta: remaining > 0 ? `${remaining.toFixed(1)} to go` : 'Reached!',
				deltaClass: (remaining <= 0 ? 'down' : 'flat') as 'up' | 'down' | 'flat'
			});
		}

		return stats;
	});

	// Waist stats
	const waistStats = $derived.by(() => {
		const w = series.waist;
		if (w.length < 2) return [];

		const first = w[0];
		const last = w[w.length - 1];
		const change = last.v - first.v;

		return [
			{ label: 'Start', value: `${first.v} cm` },
			{ label: 'Current', value: `${last.v} cm` },
			{
				label: 'Change',
				value: `${change > 0 ? '+' : ''}${change.toFixed(1)} cm`,
				delta: change > 0 ? '▲' : change < 0 ? '▼' : '—',
				deltaClass: (change < 0 ? 'down' : change > 0 ? 'up' : 'flat') as 'up' | 'down' | 'flat'
			}
		];
	});

	// Calorie compliance
	const compliance = $derived.by(() => {
		const c = series.calories;
		if (!c.length) return null;
		const within = c.filter(d => {
			const lo = d.target * 0.9;
			const hi = d.target * 1.1;
			return d.kcal >= lo && d.kcal <= hi;
		}).length;
		return Math.round((within / c.length) * 100);
	});

	// CSV export
	function exportCSV() {
		const id = get(pid);
		if (!id) return;

		let csv = 'Day,Weight,Waist,Kcal,Protein,Fat,Carbs,Water,Energy,Hunger,Sleep\n';
		for (let d = 1; d <= maxDay + 5; d++) {
			try {
				const raw = localStorage.getItem(K(id, `day_${d}`));
				if (!raw) continue;
				const dd = JSON.parse(raw) as DayData;
				const t = totals(dd);
				csv += `${d},${dd.weight || ''},${dd.waist || ''},${t.kcal},${t.protein},${t.fat},${t.carbs},${dd.water},${dd.energy},${dd.hunger},${dd.sleep}\n`;
			} catch { continue; }
		}

		const blob = new Blob([csv], { type: 'text/csv' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'aevum-trends.csv';
		a.click();
		URL.revokeObjectURL(a.href);
	}
</script>

<div class="trends">
	<PhaseStrip />

	<!-- Weight section -->
	<section class="chart-section">
		<h3>Weight</h3>
		<StatRow stats={weightStats} />
		<LineChart
			data={series.weight}
			unit="kg"
			target={$profile?.target_weight ? +$profile.target_weight : null}
		/>
	</section>

	<!-- Waist section (show with 2+ points) -->
	{#if series.waist.length >= 2}
		<section class="chart-section">
			<h3>Waist</h3>
			<StatRow stats={waistStats} />
			<LineChart data={series.waist} unit="cm" height={120} />
		</section>
	{/if}

	<!-- Calorie section -->
	<section class="chart-section">
		<h3>
			Calories
			{#if compliance != null}
				<span class="compliance">{compliance}% on target</span>
			{/if}
		</h3>
		<CalorieBars data={series.calories} />
	</section>

	<!-- Export -->
	<button class="export-btn" onclick={exportCSV}>
		Export CSV
	</button>
</div>

<style>
	.trends {
		display: flex; flex-direction: column; gap: 4px;
	}
	.chart-section {
		padding: 14px;
		background: var(--card, #fff);
		border: 1px solid var(--line);
		border-radius: 14px;
		margin-bottom: 8px;
	}
	h3 {
		font-size: 14px; font-weight: 600;
		margin: 0 0 10px;
		display: flex; align-items: center; gap: 8px;
	}
	.compliance {
		font-size: 11px; font-weight: 400;
		color: var(--green, #2d6a4f);
		background: #e8f5e9; padding: 2px 8px;
		border-radius: 6px;
	}
	.export-btn {
		width: 100%; padding: 12px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--card, #fff);
		font-size: 14px;
		color: var(--ink);
		cursor: pointer;
		font-family: inherit;
		margin-top: 4px;
	}
	.export-btn:active { opacity: 0.7; }
</style>
