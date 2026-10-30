<!-- v3.1.0 2026-10-30 — directional dot colors: blue=under, green=on track, red=over. Two severity tiers per side from DB rules. -->
<script lang="ts">
	import { ruleFor } from '$lib/stores/rules';

	interface CalDay {
		date: string;
		kcal: number;
		target: number;
		phase: string;
	}

	let { data = [] }: { data: CalDay[] } = $props();

	const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

	function isLoading(phase: string): boolean {
		const p = phase.toLowerCase();
		return p === 'loading' || p === 'load';
	}

	function monday(ds: string): string {
		const d = new Date(ds + 'T00:00:00');
		const dow = d.getDay();
		const diff = dow === 0 ? -6 : 1 - dow;
		d.setDate(d.getDate() + diff);
		return d.toISOString().slice(0, 10);
	}

	/** Dot color from DB rules: blue=under, green=on track, red=over. Two tiers per side. */
	function dotColor(d: CalDay): string {
		if (isLoading(d.phase)) return 'var(--muted, #ccc)';
		if (d.target <= 0) return 'var(--muted, #ccc)';
		const pct = (d.kcal / d.target) * 100;
		const rule = ruleFor(d.phase, 'kcal');
		const gLo = rule?.green_lo ?? 90;
		const gHi = rule?.green_hi ?? 105;
		const aLo = rule?.amber_lo ?? 75;
		const aHi = rule?.amber_hi ?? 115;
		if (pct >= gLo && pct <= gHi) return 'var(--green, #2d6a4f)';
		if (pct < gLo) return pct >= aLo ? 'var(--under-mild, #5B93C4)' : 'var(--under-deep, #2C5F8A)';
		return pct <= aHi ? 'var(--over-mild, #D4874D)' : 'var(--over, #A13024)';
	}

	/** Short label for the week's verdict */
	function weekVerdict(days: CalDay[]): { text: string; color: string } {
		const valid = days.filter(d => !isLoading(d.phase) && d.target > 0);
		if (!valid.length) return { text: '', color: 'var(--muted)' };
		const avgPct = valid.reduce((s, d) => s + (d.kcal / d.target) * 100, 0) / valid.length;
		const rule = ruleFor(valid[0].phase, 'kcal');
		const gLo = rule?.green_lo ?? 90;
		const gHi = rule?.green_hi ?? 105;
		const aHi = rule?.amber_hi ?? 115;

		const avgDelta = Math.round(valid.reduce((s, d) => s + d.kcal - d.target, 0) / valid.length);
		const sign = avgDelta >= 0 ? '+' : '';
		const deltaStr = `${sign}${avgDelta.toLocaleString()}`;

		if (avgPct >= gLo && avgPct <= gHi) return { text: `On track (${deltaStr})`, color: 'var(--green, #2d6a4f)' };
		if (avgPct < gLo) return { text: `Under (${deltaStr})`, color: avgPct < (rule?.amber_lo ?? 75) ? 'var(--under-deep, #2C5F8A)' : 'var(--under-mild, #5B93C4)' };
		return { text: `Over (${deltaStr})`, color: avgPct > aHi ? 'var(--over, #A13024)' : 'var(--over-mild, #D4874D)' };
	}

	const todayStr = new Date().toISOString().slice(0, 10);
	const todayMon = monday(todayStr);

	// Group data by week (Mon date as key)
	interface WeekRow { mon: string; label: string; slots: (CalDay | null)[]; isCurrent: boolean }
	const weeks = $derived.by((): WeekRow[] => {
		const weekMap = new Map<string, CalDay[]>();
		for (const d of data) {
			const mon = monday(d.date);
			if (!weekMap.has(mon)) weekMap.set(mon, []);
			weekMap.get(mon)!.push(d);
		}

		const sorted = [...weekMap.entries()]
			.sort((a, b) => b[0].localeCompare(a[0])); // newest first

		return sorted.slice(0, 12).map(([mon, days]) => {
			const slots: (CalDay | null)[] = Array(7).fill(null);
			for (const d of days) {
				const dt = new Date(d.date + 'T00:00:00');
				const dow = dt.getDay();
				slots[dow === 0 ? 6 : dow - 1] = d;
			}
			const d = new Date(mon + 'T00:00:00');
			const label = `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
			return { mon, label, slots, isCurrent: mon === todayMon };
		});
	});
</script>

{#if !data.length}
	<div class="no-data">No calorie data yet</div>
{:else}
	<!-- DOW header -->
	<div class="grid-head">
		<span class="week-label"></span>
		{#each DOW as d}
			<span class="dow">{d}</span>
		{/each}
		<span class="verdict-col"></span>
	</div>

	<!-- Week rows -->
	{#each weeks as week}
		{@const validDays = week.slots.filter((d): d is CalDay => d !== null)}
		{@const verdict = weekVerdict(validDays)}
		<div class="week-row" class:current={week.isCurrent}>
			<span class="week-label">{week.isCurrent ? 'Now' : week.label}</span>
			<div class="dots">
				{#each week.slots as d, i}
					{#if d}
						<span class="dot" style="background:{dotColor(d)}" title="{d.kcal} / {d.target} kcal"></span>
					{:else}
						<span class="dot empty"></span>
					{/if}
				{/each}
			</div>
			{#if verdict.text}
				<span class="verdict" style="color:{verdict.color}">{verdict.text}</span>
			{/if}
		</div>
	{/each}

	<!-- Legend -->
	<div class="legend">
		<span class="leg-item"><span class="leg-dot" style="background:var(--under-deep, #2C5F8A)"></span>Way under</span>
		<span class="leg-item"><span class="leg-dot" style="background:var(--under-mild, #5B93C4)"></span>Under</span>
		<span class="leg-item"><span class="leg-dot" style="background:var(--green, #2d6a4f)"></span>On track</span>
		<span class="leg-item"><span class="leg-dot" style="background:var(--over-mild, #D4874D)"></span>Over</span>
		<span class="leg-item"><span class="leg-dot" style="background:var(--over, #A13024)"></span>Way over</span>
	</div>
{/if}

<style>
	.grid-head {
		display: flex; align-items: center; gap: 0;
		padding: 0 0 6px;
	}
	.grid-head .dow {
		flex: 0 0 28px; text-align: center;
		font-size: 10px; color: var(--muted); font-weight: 500;
	}
	.grid-head .week-label { flex: 0 0 40px; }
	.grid-head .verdict-col { flex: 1; }

	.week-row {
		display: flex; align-items: center; gap: 0;
		padding: 4px 0;
	}
	.week-row.current { font-weight: 600; }

	.week-label {
		flex: 0 0 40px;
		font-size: 10px; color: var(--muted);
		white-space: nowrap; overflow: hidden;
	}

	.dots {
		display: flex; gap: 0;
	}

	.dot {
		width: 20px; height: 20px;
		border-radius: 5px;
		margin: 0 4px;
		transition: background 0.2s;
	}
	.dot.empty {
		background: var(--line-soft, #eee);
		opacity: 0.3;
	}

	.verdict {
		flex: 1;
		font-size: 11px; font-weight: 500;
		margin-left: 8px;
		white-space: nowrap;
	}

	.legend {
		display: flex; gap: 14px; justify-content: center;
		padding: 10px 0 2px;
	}
	.leg-item {
		display: flex; align-items: center; gap: 4px;
		font-size: 10px; color: var(--muted);
	}
	.leg-dot {
		width: 10px; height: 10px; border-radius: 3px;
		display: inline-block;
	}

	.no-data { text-align: center; color: var(--muted); font-size: 13px; padding: 30px; }
</style>
