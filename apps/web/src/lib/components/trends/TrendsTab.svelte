<!--
  TrendsTab — composes weight/waist charts, stat cards, calorie bars, phase strip.
  Maps to renderTrends() + collectMacroDays() from index.html.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import { pid, profile } from '$lib/stores/auth';
	import { K } from '$lib/stores/auth';
	import { phases, phaseFor, phReg } from '$lib/stores/phases';
	import { totals, type DayData } from '$lib/stores/day';
	import { effectiveTarget, calorieBank } from '$lib/stores/calorie';
	import { totalDays, phaseLens, phasesList } from '$lib/stores/phases';

	// Touch $phases to track phase registry updates for reactivity (fix #35)
	$effect(() => { void $phases; });
	import { ruleFor } from '$lib/stores/rules';

	import LineChart from './LineChart.svelte';
	import StatRow from './StatRow.svelte';
	import CalorieBars from './CalorieBars.svelte';
	import PhaseStrip from './PhaseStrip.svelte';

	// Collect series from localStorage
	interface WPoint { day: number; v: number }
	interface CalBar { day: number; kcal: number; target: number }
	interface PhaseBand { from: number; to: number; color: string; name: string }

	/** Scan localStorage for the highest day number with data */
	function highestDataDay(): number {
		if (typeof window === 'undefined') return 0;
		const id = get(pid);
		if (!id) return 0;
		let max = 0;
		const prefix = `aevum_${id}_day_`;
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith(prefix)) {
				const num = parseInt(key.slice(prefix.length), 10);
				if (!isNaN(num) && num > max) max = num;
			}
		}
		return max;
	}

	const maxDay = $derived(Math.max(totalDays($profile), highestDataDay()) || 31);

	/** Compute phase bands for chart overlays */
	const phaseBands = $derived.by((): PhaseBand[] => {
		const lens = phaseLens($profile);
		const list = get(phasesList);
		if (!list.length) return [];

		const bands: PhaseBand[] = [];
		let cum = 0;
		for (const ph of list) {
			const dur = lens[ph.key] ?? 0;
			if (dur > 0) {
				bands.push({ from: cum + 1, to: cum + dur, color: ph.color, name: ph.name });
				cum += dur;
			}
		}
		// Post-program: extend last phase to maxDay
		if (cum < maxDay) {
			const currentPh = phaseFor(cum + 1, $profile);
			const reg = phReg(currentPh.key);
			bands.push({
				from: cum + 1,
				to: maxDay,
				color: reg?.color ?? currentPh.color,
				name: reg?.name ?? currentPh.name
			});
		}
		return bands;
	});

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
					const target = effectiveTarget(d);
					const reg = phReg(phaseFor(d, $profile).key);
					const bankAdj = reg?.calorie_bank ? calorieBank(d) : 0;
					calories.push({ day: d, kcal: t.kcal, target: target + bankAdj });
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
		const targetW = $profile?.target_kg;

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
				delta: `${totalChange > 0 ? '▲' : totalChange < 0 ? '▼' : '—'} ${Math.abs(totalChange).toFixed(1)} kg total`,
				deltaClass: (totalChange < 0 ? 'down' : totalChange > 0 ? 'up' : 'flat') as 'up' | 'down' | 'flat'
			}
		];

		if (targetW && +targetW > 0) {
			const remaining = last.v - +targetW;
			stats.push({
				label: 'To target',
				value: `${Math.abs(remaining).toFixed(1)} kg`,
				delta: remaining > 0 ? `${remaining.toFixed(1)} kg to go` : 'Target reached!',
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
				delta: `${change > 0 ? '▲' : change < 0 ? '▼' : '—'} ${Math.abs(change).toFixed(1)} cm total`,
				deltaClass: (change < 0 ? 'down' : change > 0 ? 'up' : 'flat') as 'up' | 'down' | 'flat'
			}
		];
	});

	// Calorie compliance
	const compliance = $derived.by(() => {
		const c = series.calories;
		if (!c.length) return null;
		const within = c.filter(d => {
			const ph = phaseFor(d.day, $profile);
			const rule = ruleFor(ph.key, 'kcal');
			const lo = d.target * (rule?.green_lo ?? 0.9);
			const hi = d.target * (rule?.green_hi ?? 1.1);
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
			target={$profile?.target_kg ? +$profile.target_kg : null}
			{phaseBands}
		/>
	</section>

	<!-- Waist section (show with 2+ points) -->
	{#if series.waist.length >= 2}
		<section class="chart-section">
			<h3>Waist</h3>
			<StatRow stats={waistStats} />
			<LineChart data={series.waist} unit="cm" height={120} {phaseBands} />
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
