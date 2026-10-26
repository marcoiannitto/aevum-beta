<!-- v2.0.0 2026-10-26 — #37f: premium redesign. This-week bars + avg/delta. Past trend line chart. -->
<script lang="ts">
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

	/** Bar color: green = within 10%, gold = under >10%, red = over >10% */
	function barColor(d: CalDay): string {
		if (isLoading(d.phase)) return 'var(--muted)';
		if (d.target <= 0) return 'var(--muted)';
		const pct = (d.kcal / d.target) * 100;
		if (pct > 110) return 'var(--over, #A13024)';
		if (pct < 90) return 'var(--gold, #C8973A)';
		return 'var(--green, #2d6a4f)';
	}

	const todayMon = monday(new Date().toISOString().slice(0, 10));

	// Current week data (Mon-Sun slots)
	const currentWeek = $derived.by(() => {
		const slots: (CalDay | null)[] = Array(7).fill(null);
		for (const d of data) {
			if (monday(d.date) !== todayMon) continue;
			const dt = new Date(d.date + 'T00:00:00');
			const dow = dt.getDay();
			slots[dow === 0 ? 6 : dow - 1] = d;
		}
		return slots;
	});

	// Current week summary
	const cwSummary = $derived.by(() => {
		const days = currentWeek.filter((d): d is CalDay => d !== null && !isLoading(d.phase));
		if (!days.length) return null;
		const avgKcal = Math.round(days.reduce((s, d) => s + d.kcal, 0) / days.length);
		const avgTarget = Math.round(days.reduce((s, d) => s + d.target, 0) / days.length);
		const delta = avgKcal - avgTarget;
		return { avgKcal, avgTarget, delta, count: days.length };
	});

	// Weekly averages for trend line (past 12 weeks, oldest first)
	interface WeekAvg { mon: string; avg: number; avgTarget: number; label: string }
	const weeklyAvgs = $derived.by((): WeekAvg[] => {
		const weekMap = new Map<string, CalDay[]>();
		for (const d of data) {
			if (isLoading(d.phase)) continue;
			const mon = monday(d.date);
			if (mon === todayMon) continue; // exclude current week
			if (!weekMap.has(mon)) weekMap.set(mon, []);
			weekMap.get(mon)!.push(d);
		}

		const sorted = [...weekMap.entries()]
			.sort((a, b) => a[0].localeCompare(b[0])) // oldest first
			.slice(-12);

		return sorted.map(([mon, days]) => {
			const avg = Math.round(days.reduce((s, d) => s + d.kcal, 0) / days.length);
			const avgTarget = Math.round(days.reduce((s, d) => s + d.target, 0) / days.length);
			const d = new Date(mon + 'T00:00:00');
			const label = `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
			return { mon, avg, avgTarget, label };
		});
	});

	// SVG trend chart dimensions
	const TW = 320;
	const TH = 100;
	const tPad = { l: 0, r: 0, t: 8, b: 20 };
	const chartW = TW - tPad.l - tPad.r;
	const chartH = TH - tPad.t - tPad.b;

	const trendMinMax = $derived.by(() => {
		if (!weeklyAvgs.length) return { min: 0, max: 100 };
		const allVals = weeklyAvgs.flatMap(w => [w.avg, w.avgTarget]);
		const min = Math.min(...allVals);
		const max = Math.max(...allVals);
		const pad = (max - min) * 0.15 || 100;
		return { min: min - pad, max: max + pad };
	});

	function tX(i: number): number {
		if (weeklyAvgs.length <= 1) return tPad.l + chartW / 2;
		return tPad.l + (i / (weeklyAvgs.length - 1)) * chartW;
	}

	function tY(val: number): number {
		const { min, max } = trendMinMax;
		const range = max - min || 1;
		return tPad.t + chartH - ((val - min) / range) * chartH;
	}

	// SVG polyline points
	const avgLine = $derived(weeklyAvgs.map((w, i) => `${tX(i)},${tY(w.avg)}`).join(' '));
	const targetY = $derived(weeklyAvgs.length ? tY(weeklyAvgs[0].avgTarget) : tPad.t + chartH / 2);
</script>

<!-- Current week: bars + summary -->
<div class="card">
	<div class="card-head">
		<span class="card-title">This week</span>
		{#if cwSummary}
			<span class="avg-line">
				Avg {cwSummary.avgKcal.toLocaleString()}
				<span class="delta {cwSummary.delta > 0 ? 'over' : 'under'}">
					{cwSummary.delta > 0 ? '↑' : '↓'}{Math.abs(cwSummary.delta).toLocaleString()}
				</span>
			</span>
		{/if}
	</div>
	<div class="bars-row">
		{#each currentWeek as d, i}
			<div class="bar-col">
				{#if d}
					{@const maxVal = Math.max(...currentWeek.filter(Boolean).map((x: CalDay) => Math.max(x.kcal, x.target)))}
					{@const maxH = 72}
					{@const kcalH = maxVal > 0 ? (d.kcal / maxVal) * maxH : 0}
					{@const targetH = maxVal > 0 ? (d.target / maxVal) * maxH : 0}
					<div class="bar-area" style="height:{maxH}px">
						<div class="target-line" style="bottom:{targetH}px"></div>
						<div class="bar" style="height:{kcalH}px;background:{barColor(d)}"></div>
					</div>
				{:else}
					<div class="bar-area empty" style="height:72px">
						<div class="bar ghost"></div>
					</div>
				{/if}
				<span class="dow">{DOW[i]}</span>
			</div>
		{/each}
	</div>
</div>

<!-- Trend: weekly averages line chart -->
{#if weeklyAvgs.length >= 2}
	<div class="card trend-card">
		<span class="card-title">Weekly trend</span>
		<svg viewBox="0 0 {TW} {TH}" width="100%" preserveAspectRatio="xMidYMid meet" class="trend-svg">
			<!-- Target reference line -->
			<line x1={tPad.l} y1={targetY} x2={TW - tPad.r} y2={targetY}
				stroke="var(--muted, #aaa)" stroke-width="1" stroke-dasharray="4 3" opacity="0.4" />
			<text x={TW - tPad.r} y={targetY - 4} font-size="8" fill="var(--muted)" text-anchor="end" font-family="system-ui">target</text>

			<!-- Average intake line -->
			<polyline points={avgLine} fill="none" stroke="var(--green, #2d6a4f)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

			<!-- Dots -->
			{#each weeklyAvgs as w, i}
				<circle cx={tX(i)} cy={tY(w.avg)} r="3" fill="var(--green, #2d6a4f)" />
			{/each}

			<!-- X labels (first, middle, last) -->
			{#each [0, Math.floor(weeklyAvgs.length / 2), weeklyAvgs.length - 1].filter((v, i, a) => a.indexOf(v) === i) as idx}
				<text x={tX(idx)} y={TH - 4} font-size="8" fill="var(--muted)" text-anchor="middle" font-family="system-ui">{weeklyAvgs[idx].label}</text>
			{/each}
		</svg>
	</div>
{/if}

{#if !data.length}
	<div class="no-data">No calorie data yet</div>
{/if}

<style>
	.card {
		background: var(--card); border: 1px solid var(--line);
		border-radius: 14px; padding: 14px;
		margin-bottom: 8px;
	}
	.card-head {
		display: flex; justify-content: space-between; align-items: center;
		margin-bottom: 12px;
	}
	.card-title { font-size: 13px; font-weight: 600; }

	.avg-line { font-size: 12px; color: var(--muted); }
	.delta { font-weight: 600; margin-left: 4px; }
	.delta.over { color: var(--over, #A13024); }
	.delta.under { color: var(--green, #2d6a4f); }

	.bars-row { display: flex; gap: 6px; justify-content: space-between; }
	.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
	.bar-area { position: relative; width: 100%; display: flex; align-items: flex-end; justify-content: center; }
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
		height: 1.5px; background: var(--muted); opacity: 0.35;
	}
	.dow { font-size: 10px; color: var(--muted); }

	.trend-card { padding: 14px 14px 8px; }
	.trend-card .card-title { display: block; margin-bottom: 8px; }
	.trend-svg { display: block; }

	.no-data { text-align: center; color: var(--muted); font-size: 13px; padding: 30px; }
</style>
