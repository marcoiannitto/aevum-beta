<!--
  LineChart — reusable SVG line chart with touch/mouse scrubbing.
  Maps to lineChart() + wireChartTaps() from index.html.
-->
<script lang="ts">
	interface DataPoint {
		day: number;
		v: number;
	}

	let {
		data = [],
		unit = 'kg',
		target = null as number | null,
		band = null as { center: number; green: number; amber: number } | null,
		height = 160
	}: {
		data: DataPoint[];
		unit?: string;
		target?: number | null;
		band?: { center: number; green: number; amber: number } | null;
		height?: number;
	} = $props();

	const W = 440;
	const padL = 32;
	const padR = 16;
	const padT = 16;
	const padB = 24;

	let readout = $state('');
	let scrubX = $state<number | null>(null);

	const chartW = W - padL - padR;
	const chartH = height - padT - padB;

	const range = $derived.by(() => {
		if (!data.length) return { minD: 1, maxD: 1, minV: 0, maxV: 100 };
		const days = data.map(d => d.day);
		const vals = data.map(d => d.v);
		let minV = Math.min(...vals);
		let maxV = Math.max(...vals);
		if (target != null) { minV = Math.min(minV, target); maxV = Math.max(maxV, target); }
		if (band) { minV = Math.min(minV, band.center - band.amber); maxV = Math.max(maxV, band.center + band.amber); }
		const pad = (maxV - minV) * 0.1 || 1;
		return { minD: Math.min(...days), maxD: Math.max(...days), minV: minV - pad, maxV: maxV + pad };
	});

	function xOf(day: number) {
		const span = range.maxD - range.minD || 1;
		return padL + ((day - range.minD) / span) * chartW;
	}
	function yOf(v: number) {
		const span = range.maxV - range.minV || 1;
		return padT + chartH - ((v - range.minV) / span) * chartH;
	}

	const linePath = $derived(
		data.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.day).toFixed(1)},${yOf(p.v).toFixed(1)}`).join(' ')
	);

	const dots = $derived(data.map(p => ({ cx: xOf(p.day), cy: yOf(p.v), d: p.day, v: p.v })));

	const targetY = $derived(target != null ? yOf(target) : null);

	// Y-axis labels (5 ticks)
	const yTicks = $derived.by(() => {
		const ticks: { y: number; label: string }[] = [];
		const span = range.maxV - range.minV;
		for (let i = 0; i <= 4; i++) {
			const v = range.minV + (span * i) / 4;
			ticks.push({ y: yOf(v), label: v.toFixed(1) });
		}
		return ticks;
	});

	// X-axis labels
	const xLabels = $derived.by(() => {
		const labels: { x: number; label: string }[] = [];
		const span = range.maxD - range.minD || 1;
		const step = Math.max(1, Math.ceil(span / 6));
		for (let d = range.minD; d <= range.maxD; d += step) {
			labels.push({ x: xOf(d), label: `D${d}` });
		}
		return labels;
	});

	function setDefault() {
		if (!data.length) { readout = ''; return; }
		const last = data[data.length - 1];
		const prev = data.length > 1 ? data[data.length - 2] : null;
		const delta = prev ? last.v - prev.v : null;
		const dStr = delta != null ? ` · ${delta > 0 ? '▲' : delta < 0 ? '▼' : ''}${Math.abs(delta).toFixed(1)}` : '';
		readout = `Day ${last.day} · ${last.v} ${unit}${dStr}`;
	}

	$effect(() => { data; setDefault(); });

	function nearest(clientX: number, svg: SVGSVGElement) {
		const rect = svg.getBoundingClientRect();
		const svgX = ((clientX - rect.left) / rect.width) * W;
		let best = 0, bd = 1e9;
		dots.forEach((p, i) => { const d = Math.abs(p.cx - svgX); if (d < bd) { bd = d; best = i; } });
		return best;
	}

	function scrub(e: MouseEvent | TouchEvent, svg: SVGSVGElement) {
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const idx = nearest(clientX, svg);
		const p = data[idx];
		scrubX = dots[idx].cx;
		const prev = idx > 0 ? data[idx - 1] : null;
		const delta = prev ? p.v - prev.v : null;
		const dStr = delta != null ? ` · ${delta > 0 ? '▲' : delta < 0 ? '▼' : ''}${Math.abs(delta).toFixed(1)}` : '';
		readout = `Day ${p.day} · ${p.v} ${unit}${dStr}`;
	}

	function endScrub() {
		scrubX = null;
		setDefault();
	}

	let svgEl: SVGSVGElement;
</script>

{#if data.length >= 2}
	<div class="chart-readout">{@html readout}</div>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<svg
		bind:this={svgEl}
		viewBox="0 0 {W} {height}"
		width="100%"
		preserveAspectRatio="xMidYMid meet"
		class="line-chart"
		onmousedown={(e) => scrub(e, svgEl)}
		onmousemove={(e) => { if (e.buttons) scrub(e, svgEl); }}
		onmouseup={endScrub}
		ontouchstart={(e) => scrub(e, svgEl)}
		ontouchmove={(e) => scrub(e, svgEl)}
		ontouchend={endScrub}
	>
		<!-- Y grid -->
		{#each yTicks as tick}
			<line x1={padL} y1={tick.y} x2={W - padR} y2={tick.y} stroke="var(--line)" stroke-width="0.5" />
			<text x={padL - 4} y={tick.y + 3} font-size="9" fill="var(--muted)" text-anchor="end" font-family="sans-serif">{tick.label}</text>
		{/each}

		<!-- X labels -->
		{#each xLabels as lbl}
			<text x={lbl.x} y={height - 4} font-size="9" fill="var(--muted)" text-anchor="middle" font-family="sans-serif">{lbl.label}</text>
		{/each}

		<!-- Band (stabilization) -->
		{#if band}
			<rect x={padL} y={yOf(band.center + band.green)} width={chartW} height={yOf(band.center - band.green) - yOf(band.center + band.green)} fill="#2d6a4f" opacity="0.08" />
			<rect x={padL} y={yOf(band.center + band.amber)} width={chartW} height={yOf(band.center + band.green) - yOf(band.center + band.amber)} fill="#B08D2E" opacity="0.06" />
			<rect x={padL} y={yOf(band.center - band.green)} width={chartW} height={yOf(band.center - band.amber) - yOf(band.center - band.green)} fill="#B08D2E" opacity="0.06" />
		{/if}

		<!-- Target line -->
		{#if targetY != null}
			<line x1={padL} y1={targetY} x2={W - padR} y2={targetY} stroke="var(--gold)" stroke-width="1" stroke-dasharray="4 3" opacity="0.6" />
			<text x={W - padR} y={targetY - 4} font-size="9" fill="var(--gold)" text-anchor="end" font-family="sans-serif">Target {target} {unit}</text>
		{/if}

		<!-- Line -->
		<path d={linePath} fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

		<!-- Dots -->
		{#each dots as dot}
			<circle cx={dot.cx} cy={dot.cy} r="3" fill="var(--gold)" />
		{/each}

		<!-- First/last labels -->
		{#if dots.length}
			<text x={dots[0].cx} y={dots[0].cy - 8} font-size="10" fill="var(--ink)" text-anchor="start" font-family="var(--serif)" font-weight="500">{data[0].v}</text>
			<text x={dots[dots.length - 1].cx} y={dots[dots.length - 1].cy - 8} font-size="10" fill="var(--ink)" text-anchor="end" font-family="var(--serif)" font-weight="500">{data[data.length - 1].v}</text>
		{/if}

		<!-- Scrub line -->
		{#if scrubX != null}
			<line x1={scrubX} y1={padT} x2={scrubX} y2={height - padB} stroke="var(--ink)" stroke-width="1" opacity="0.4" />
		{/if}
	</svg>
{:else if data.length === 1}
	<div class="single-val">
		<span class="sv-num">{data[0].v}</span>
		<span class="sv-unit">{unit}</span>
		<span class="sv-note">Day {data[0].day} — need 2+ points for chart</span>
	</div>
{:else}
	<div class="no-data">No data yet</div>
{/if}

<style>
	.line-chart { touch-action: none; cursor: crosshair; }
	.chart-readout {
		font-size: 12px; color: var(--muted);
		text-align: center; margin-bottom: 4px;
		font-variant-numeric: tabular-nums;
	}
	.chart-readout :global(b) { color: var(--ink); }
	.single-val { text-align: center; padding: 20px; }
	.sv-num { font-family: var(--serif); font-size: 28px; font-weight: 500; }
	.sv-unit { font-size: 14px; color: var(--muted); }
	.sv-note { display: block; font-size: 12px; color: var(--muted); margin-top: 4px; }
	.no-data { text-align: center; color: var(--muted); font-size: 13px; padding: 30px; }
</style>
