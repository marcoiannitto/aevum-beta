<!-- v4.0.0 2026-10-30 — Calendar month view with directional dot colors. Blue=under, green=on track, red=over. -->
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
	const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

	function isLoading(phase: string): boolean {
		const p = phase.toLowerCase();
		return p === 'loading' || p === 'load';
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

	/** Weekly verdict: avg daily delta with direction label */
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
		const deltaStr = `avg ${sign}${avgDelta.toLocaleString()}/day`;

		if (avgPct >= gLo && avgPct <= gHi) return { text: deltaStr, color: 'var(--green, #2d6a4f)' };
		if (avgPct < gLo) return { text: deltaStr, color: avgPct < (rule?.amber_lo ?? 75) ? 'var(--under-deep, #2C5F8A)' : 'var(--under-mild, #5B93C4)' };
		return { text: deltaStr, color: avgPct > aHi ? 'var(--over, #A13024)' : 'var(--over-mild, #D4874D)' };
	}

	// ── Month navigation ──

	const today = new Date();
	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth()); // 0-indexed

	function prevMonth() {
		if (viewMonth === 0) { viewMonth = 11; viewYear--; }
		else viewMonth--;
	}

	function nextMonth() {
		if (viewMonth === 11) { viewMonth = 0; viewYear++; }
		else viewMonth++;
	}

	const isCurrentMonth = $derived(viewYear === today.getFullYear() && viewMonth === today.getMonth());
	const todayStr = today.toISOString().slice(0, 10);

	// Build lookup from data
	const byDate = $derived.by(() => {
		const map = new Map<string, CalDay>();
		for (const d of data) map.set(d.date, d);
		return map;
	});

	// ── Calendar grid for the viewed month ──

	interface CalWeek {
		cells: { date: string; day: number; inMonth: boolean; data: CalDay | null; isToday: boolean }[];
	}

	const calWeeks = $derived.by((): CalWeek[] => {
		const firstDay = new Date(viewYear, viewMonth, 1);
		const lastDay = new Date(viewYear, viewMonth + 1, 0);
		const daysInMonth = lastDay.getDate();

		// Monday-based: 0=Mon, 6=Sun
		let startDow = firstDay.getDay();
		startDow = startDow === 0 ? 6 : startDow - 1;

		const weeks: CalWeek[] = [];
		let currentWeek: CalWeek['cells'] = [];

		// Fill leading empty cells (days from previous month)
		for (let i = 0; i < startDow; i++) {
			const d = new Date(viewYear, viewMonth, 1 - (startDow - i));
			const ds = fmt(d);
			currentWeek.push({ date: ds, day: d.getDate(), inMonth: false, data: byDate.get(ds) ?? null, isToday: ds === todayStr });
		}

		// Fill month days
		for (let day = 1; day <= daysInMonth; day++) {
			const d = new Date(viewYear, viewMonth, day);
			const ds = fmt(d);
			currentWeek.push({ date: ds, day, inMonth: true, data: byDate.get(ds) ?? null, isToday: ds === todayStr });

			if (currentWeek.length === 7) {
				weeks.push({ cells: currentWeek });
				currentWeek = [];
			}
		}

		// Fill trailing empty cells
		if (currentWeek.length > 0) {
			let trailing = 1;
			while (currentWeek.length < 7) {
				const d = new Date(viewYear, viewMonth + 1, trailing++);
				const ds = fmt(d);
				currentWeek.push({ date: ds, day: d.getDate(), inMonth: false, data: byDate.get(ds) ?? null, isToday: ds === todayStr });
			}
			weeks.push({ cells: currentWeek });
		}

		return weeks;
	});

	function fmt(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${dd}`;
	}
</script>

{#if !data.length}
	<div class="no-data">No calorie data yet</div>
{:else}
	<!-- Month header with navigation -->
	<div class="month-nav">
		<button class="nav-arrow" onclick={prevMonth} aria-label="Previous month">‹</button>
		<span class="month-title" translate="no">{MONTHS[viewMonth]} {viewYear}</span>
		<button class="nav-arrow" onclick={nextMonth} aria-label="Next month" disabled={isCurrentMonth}>›</button>
	</div>

	<!-- DOW header -->
	<div class="cal-head">
		<span class="week-label"></span>
		{#each DOW as d}
			<span class="dow">{d}</span>
		{/each}
		<span class="verdict-col"></span>
	</div>

	<!-- Calendar weeks -->
	{#each calWeeks as week}
		{@const weekDays = week.cells.filter(c => c.data !== null).map(c => c.data!)}
		{@const verdict = weekVerdict(weekDays)}
		{@const monDay = week.cells[0].day}
		<div class="cal-row">
			<span class="week-label" translate="no">{monDay}</span>
			<div class="cal-cells">
				{#each week.cells as cell}
					{#if cell.data}
						<span
							class="dot"
							class:out={!cell.inMonth}
							class:today-ring={cell.isToday}
							style="background:{dotColor(cell.data)}"
							title="{cell.data.kcal} / {cell.data.target} kcal"
						></span>
					{:else}
						<span class="dot empty" class:out={!cell.inMonth}></span>
					{/if}
				{/each}
			</div>
			{#if verdict.text}
				<span class="verdict" style="color:{verdict.color}" translate="no">{verdict.text}</span>
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
	.month-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 0 0 10px;
	}
	.nav-arrow {
		font-size: 22px;
		line-height: 1;
		color: var(--muted);
		padding: 4px 8px;
		-webkit-tap-highlight-color: transparent;
		background: none;
		border: none;
		cursor: pointer;
	}
	.nav-arrow:disabled {
		opacity: 0.25;
		cursor: default;
	}
	.month-title {
		font-family: var(--serif);
		font-size: 15px;
		font-weight: 500;
		letter-spacing: 0.02em;
		min-width: 140px;
		text-align: center;
	}

	.cal-head {
		display: flex;
		align-items: center;
		padding: 0 0 4px;
	}
	.cal-head .dow {
		flex: 1;
		text-align: center;
		font-size: 10px;
		color: var(--muted);
		font-weight: 500;
	}
	.cal-head .verdict-col {
		flex: 0 0 90px;
	}

	.week-label {
		flex: 0 0 22px;
		font-size: 10px;
		color: var(--muted);
		text-align: right;
		padding-right: 4px;
		font-variant-numeric: tabular-nums;
	}

	.cal-row {
		display: flex;
		align-items: center;
		padding: 3px 0;
	}

	.cal-cells {
		display: flex;
		flex: 1;
	}

	.dot {
		flex: 1;
		aspect-ratio: 1;
		max-width: 28px;
		margin: 0 2px;
		border-radius: 5px;
		transition: background 0.2s;
	}
	.dot.empty {
		background: var(--line-soft, #eee);
		opacity: 0.2;
	}
	.dot.out {
		opacity: 0.25;
	}
	.dot.today-ring {
		outline: 2px solid var(--gold, #C8973A);
		outline-offset: 1px;
	}

	.verdict {
		flex: 0 0 90px;
		font-size: 10px;
		font-weight: 500;
		text-align: right;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.legend {
		display: flex;
		gap: 10px;
		justify-content: center;
		padding: 10px 0 2px;
		flex-wrap: wrap;
	}
	.leg-item {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 9px;
		color: var(--muted);
	}
	.leg-dot {
		width: 8px;
		height: 8px;
		border-radius: 3px;
		display: inline-block;
	}

	.no-data {
		text-align: center;
		color: var(--muted);
		font-size: 13px;
		padding: 30px;
	}
</style>
