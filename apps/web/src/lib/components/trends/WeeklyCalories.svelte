<!-- v1.0.0 2026-10-26 — #37f: weekly calorie view, replaces flat bars + verdict chips -->
<script lang="ts">
	import { phaseFor } from '$lib/stores/phases';
	import { ruleFor } from '$lib/stores/rules';
	import { profile } from '$lib/stores/auth';

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

	// Day of week labels
	const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

	/** Get Monday of the ISO week for a date string */
	function monday(ds: string): string {
		const d = new Date(ds + 'T00:00:00');
		const dow = d.getDay();
		const diff = dow === 0 ? -6 : 1 - dow; // Monday = 1
		d.setDate(d.getDate() + diff);
		return d.toISOString().slice(0, 10);
	}

	/** Format week label */
	function weekLabel(mon: string, isCurrent: boolean): string {
		if (isCurrent) return 'This week';
		const d = new Date(mon + 'T00:00:00');
		const sun = new Date(d);
		sun.setDate(sun.getDate() + 6);
		const fmtD = (dt: Date) => `${dt.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()]}`;
		return `${fmtD(d)} – ${fmtD(sun)}`;
	}

	/** Is a phase a "loading" phase (no calorie limit)? */
	function isLoading(phase: string): boolean {
		return phase === 'loading' || phase === 'load';
	}

	// Current week's Monday
	const todayMon = monday(new Date().toISOString().slice(0, 10));

	// Group data by week
	const weeks = $derived.by((): WeekGroup[] => {
		if (!data.length) return [];

		// Index by date
		const byDate = new Map<string, CalDay>();
		for (const d of data) byDate.set(d.date, d);

		// Collect all weeks
		const weekMap = new Map<string, (CalDay | null)[]>();
		for (const d of data) {
			const mon = monday(d.date);
			if (!weekMap.has(mon)) weekMap.set(mon, Array(7).fill(null));
			const dt = new Date(d.date + 'T00:00:00');
			const dow = dt.getDay();
			const idx = dow === 0 ? 6 : dow - 1; // Mon=0, Sun=6
			weekMap.get(mon)![idx] = d;
		}

		// Sort weeks descending (current first)
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
				// Check if within green band
				const rule = ruleFor(d.phase, 'kcal');
				const lo = d.target * (rule?.green_lo ?? 0.9);
				const hi = d.target * (rule?.green_hi ?? 1.1);
				if (d.kcal >= lo && d.kcal <= hi) onTarget++;
			}

			return {
				label: weekLabel(mon, isCurrent),
				isCurrent,
				days,
				onTarget,
				total,
				net
			};
		});
	});

	// Bar color for a day
	function barColor(d: CalDay): string {
		if (isLoading(d.phase)) return 'var(--muted)';
		const rule = ruleFor(d.phase, 'kcal');
		const ratio = d.target > 0 ? d.kcal / d.target : 1;
		const overBudget = ratio > (rule?.amber_hi ?? 1.1);
		const underBudget = ratio < (rule?.amber_lo ?? 0.85);
		return overBudget ? 'var(--over, #A13024)' : underBudget ? 'var(--gold)' : 'var(--green, #2d6a4f)';
	}

	// Verdict text
	function verdictText(w: WeekGroup): string {
		if (w.total === 0) return 'No data';
		return `${w.onTarget} of ${w.total} on target`;
	}

	function verdictClass(w: WeekGroup): string {
		if (w.total === 0) return '';
		const pct = w.onTarget / w.total;
		return pct >= 0.7 ? 'good' : pct >= 0.4 ? 'ok' : 'poor';
	}
</script>

{#if weeks.length}
	<!-- Current week (big) -->
	{#if weeks[0]}
		{@const cw = weeks[0]}
		<div class="week current">
			<div class="week-head">
				<span class="week-label">{cw.label}</span>
				<span class="verdict {verdictClass(cw)}">{verdictText(cw)}</span>
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

	<!-- Past weeks (compact, scrollable) -->
	{#if weeks.length > 1}
		<div class="past-scroll">
			{#each weeks.slice(1) as pw}
				<div class="week past">
					<div class="week-head">
						<span class="week-label">{pw.label}</span>
						<span class="verdict {verdictClass(pw)}">{verdictText(pw)}</span>
					</div>
					<div class="bars-row mini">
						{#each pw.days as d, i}
							<div class="bar-col">
								{#if d}
									{@const maxVal = Math.max(...pw.days.filter(Boolean).map((x: CalDay) => Math.max(x.kcal, x.target)))}
									{@const kcalH = maxVal > 0 ? (d.kcal / maxVal) * 48 : 0}
									{@const targetH = maxVal > 0 ? (d.target / maxVal) * 48 : 0}
									<div class="bar-area" style="height:48px">
										<div class="target-line" style="bottom:{targetH}px"></div>
										<div class="bar" style="height:{kcalH}px;background:{barColor(d)}"></div>
									</div>
								{:else}
									<div class="bar-area empty" style="height:48px">
										<div class="bar ghost"></div>
									</div>
								{/if}
								<span class="dow">{DOW[i]}</span>
							</div>
						{/each}
					</div>
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
	.week.current { margin-bottom: 10px; }
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

	.bars-row.mini .bar { max-width: 16px; }
	.bars-row.mini .dow { font-size: 9px; }

	.past-scroll {
		display: flex; gap: 10px; overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		padding-bottom: 4px;
		scroll-snap-type: x mandatory;
	}
	.past-scroll::-webkit-scrollbar { display: none; }
	.week.past {
		min-width: 260px; flex-shrink: 0;
		scroll-snap-align: start;
	}

	.no-data { text-align: center; color: var(--muted); font-size: 13px; padding: 30px; }
</style>
