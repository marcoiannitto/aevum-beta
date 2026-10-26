<!-- v1.1.0 2026-10-26 — #37f: fix on-target calc (pct not ratio), simplify past weeks to text rows -->
<script lang="ts">
	import { ruleFor } from '$lib/stores/rules';

	interface CalDay {
		date: string;
		kcal: number;
		target: number;
		phase: string;
	}

	interface WeekGroup {
		label: string;
		isCurrent: boolean;
		days: (CalDay | null)[];   // Mon-Sun, null = no data
		onTarget: number;
		total: number;
		net: number;               // sum(kcal - target)
	}

	let { data = [] }: { data: CalDay[] } = $props();

	const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

	/** Is a phase a "loading" phase (no calorie limit)? */
	function isLoading(phase: string): boolean {
		const p = phase.toLowerCase();
		return p === 'loading' || p === 'load';
	}

	/** Get Monday of the ISO week for a date string */
	function monday(ds: string): string {
		const d = new Date(ds + 'T00:00:00');
		const dow = d.getDay();
		const diff = dow === 0 ? -6 : 1 - dow;
		d.setDate(d.getDate() + diff);
		return d.toISOString().slice(0, 10);
	}

	/** Format week label */
	function weekLabel(mon: string, isCurrent: boolean): string {
		if (isCurrent) return 'This week';
		const d = new Date(mon + 'T00:00:00');
		const sun = new Date(d);
		sun.setDate(sun.getDate() + 6);
		const fmt = (dt: Date) => `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`;
		return `${fmt(d)} – ${fmt(sun)}`;
	}

	/** Percentage of target (100 = exactly on target) */
	function pctOfTarget(d: CalDay): number {
		return d.target > 0 ? (d.kcal / d.target) * 100 : 100;
	}

	/** Is this day within the green band? */
	function isOnTarget(d: CalDay): boolean {
		if (isLoading(d.phase)) return false;
		const rule = ruleFor(d.phase, 'kcal');
		const p = pctOfTarget(d);
		return p >= (rule?.green_lo ?? 90) && p <= (rule?.green_hi ?? 110);
	}

	const todayMon = monday(new Date().toISOString().slice(0, 10));

	// Group data by week
	const weeks = $derived.by((): WeekGroup[] => {
		if (!data.length) return [];

		const weekMap = new Map<string, (CalDay | null)[]>();
		for (const d of data) {
			const mon = monday(d.date);
			if (!weekMap.has(mon)) weekMap.set(mon, Array(7).fill(null));
			const dt = new Date(d.date + 'T00:00:00');
			const dow = dt.getDay();
			const idx = dow === 0 ? 6 : dow - 1;
			weekMap.get(mon)![idx] = d;
		}

		const sorted = [...weekMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

		return sorted.map(([mon, days]) => {
			const isCurrent = mon === todayMon;
			let onTarget = 0;
			let total = 0;
			let net = 0;

			for (const d of days) {
				if (!d || isLoading(d.phase)) continue;
				total++;
				net += d.kcal - d.target;
				if (isOnTarget(d)) onTarget++;
			}

			return { label: weekLabel(mon, isCurrent), isCurrent, days, onTarget, total, net };
		});
	});

	// Bar color for a day
	function barColor(d: CalDay): string {
		if (isLoading(d.phase)) return 'var(--muted)';
		const rule = ruleFor(d.phase, 'kcal');
		const p = pctOfTarget(d);
		const over = p > (rule?.amber_hi ?? 115);
		const under = p < (rule?.amber_lo ?? 75);
		return over ? 'var(--over, #A13024)' : under ? 'var(--gold)' : 'var(--green, #2d6a4f)';
	}

	function verdictClass(w: WeekGroup): string {
		if (w.total === 0) return '';
		const p = w.onTarget / w.total;
		return p >= 0.7 ? 'good' : p >= 0.4 ? 'ok' : 'poor';
	}
</script>

{#if weeks.length}
	<!-- Current week (bars) -->
	{#if weeks[0]}
		{@const cw = weeks[0]}
		<div class="week current">
			<div class="week-head">
				<span class="week-label">{cw.label}</span>
				{#if cw.total > 0}
					<span class="verdict {verdictClass(cw)}">{cw.onTarget} of {cw.total} on target</span>
				{/if}
			</div>
			<div class="bars-row">
				{#each cw.days as d, i}
					<div class="bar-col">
						{#if d}
							{@const maxH = 80}
							{@const maxVal = Math.max(...cw.days.filter(Boolean).map((x: CalDay) => Math.max(x.kcal, x.target)))}
							{@const kcalH = maxVal > 0 ? (d.kcal / maxVal) * maxH : 0}
							{@const targetH = maxVal > 0 ? (d.target / maxVal) * maxH : 0}
							<div class="bar-area" style="height:{maxH}px">
								<div class="target-line" style="bottom:{targetH}px"></div>
								<div class="bar" style="height:{kcalH}px;background:{barColor(d)}"></div>
							</div>
						{:else}
							<div class="bar-area empty" style="height:80px">
								<div class="bar ghost"></div>
							</div>
						{/if}
						<span class="dow">{DOW[i]}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Past weeks (simple text rows) -->
	{#if weeks.length > 1}
		<div class="past-weeks">
			{#each weeks.slice(1) as pw}
				<div class="past-row">
					<span class="past-label">{pw.label}</span>
					{#if pw.total > 0}
						<span class="verdict {verdictClass(pw)}">{pw.onTarget} of {pw.total} on target</span>
					{:else}
						<span class="verdict">No data</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
{:else}
	<div class="no-data">No calorie data yet</div>
{/if}

<style>
	.week {
		background: var(--card); border: 1px solid var(--line);
		border-radius: 14px; padding: 14px;
	}
	.week-head {
		display: flex; justify-content: space-between; align-items: center;
		margin-bottom: 12px;
	}
	.week-label { font-size: 13px; font-weight: 600; }
	.verdict {
		font-size: 11px; font-weight: 500;
		padding: 2px 8px; border-radius: 6px;
	}
	.verdict.good { background: #e8f5e9; color: var(--green, #2d6a4f); }
	.verdict.ok { background: #fff3e0; color: #e65100; }
	.verdict.poor { background: #fce4e4; color: var(--over, #A13024); }

	.bars-row {
		display: flex; gap: 6px; justify-content: space-between;
	}
	.bar-col {
		flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
	}
	.bar-area {
		position: relative; width: 100%; display: flex; align-items: flex-end; justify-content: center;
	}
	.bar {
		width: 70%; max-width: 24px; border-radius: 4px 4px 2px 2px;
		transition: height 0.3s ease;
	}
	.bar.ghost {
		width: 70%; max-width: 24px; height: 8px;
		background: var(--line-soft, #eee); border-radius: 4px; opacity: 0.4;
	}
	.target-line {
		position: absolute; left: 10%; right: 10%;
		height: 1.5px; background: var(--muted);
		opacity: 0.35;
	}
	.dow { font-size: 10px; color: var(--muted); }

	/* Past weeks: simple list */
	.past-weeks {
		display: flex; flex-direction: column; gap: 0;
		margin-top: 8px;
		background: var(--card); border: 1px solid var(--line);
		border-radius: 14px; overflow: hidden;
	}
	.past-row {
		display: flex; justify-content: space-between; align-items: center;
		padding: 10px 14px;
	}
	.past-row + .past-row { border-top: 1px solid var(--line); }
	.past-label { font-size: 13px; color: var(--ink); }

	.no-data { text-align: center; color: var(--muted); font-size: 13px; padding: 30px; }
</style>
