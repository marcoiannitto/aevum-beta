<!--
  Phase Sheet — shows phase overview with timeline, current phase info,
  and phase explainer text from the registry.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import Sheet from '$lib/components/ui/Sheet.svelte';
	import { profile, isProgram } from '$lib/stores/auth';
	import { currentDay } from '$lib/stores/day';
	import { phaseFor, phaseLens, phasesList, totalDays, type PhaseConfig } from '$lib/stores/phases';

	let {
		open = false,
		onClose
	}: {
		open: boolean;
		onClose: () => void;
	} = $props();

	function currentPhase() {
		return phaseFor(get(currentDay));
	}

	function buildTimeline(): { key: string; name: string; color: string; days: number; startDay: number; active: boolean }[] {
		const lens = phaseLens();
		const list = get(phasesList);
		const day = get(currentDay);
		const result: { key: string; name: string; color: string; days: number; startDay: number; active: boolean }[] = [];

		let cum = 0;
		for (const ph of list) {
			const dur = lens[ph.key] ?? ph.duration_default ?? 0;
			if (!dur && !ph.duration_default) continue;
			const start = cum + 1;
			cum += dur;
			result.push({
				key: ph.key,
				name: ph.name,
				color: ph.key === 'maintenance' ? '#3E7A6A' : ph.color,
				days: dur,
				startDay: start,
				active: day >= start && day <= cum
			});
		}
		return result;
	}

	function explainerFor(key: string): Record<string, unknown> | null {
		const list = get(phasesList);
		const ph = list.find((p) => p.key === key);
		return ph?.explainer && Object.keys(ph.explainer).length ? ph.explainer : null;
	}
</script>

<Sheet {open} {onClose} title="Your Journey">
	{@const phase = currentPhase()}
	{@const timeline = buildTimeline()}
	{@const total = totalDays()}
	{@const dayNum = get(currentDay)}

	<!-- Current phase badge -->
	<div class="current-badge" style="--phase-color: {phase.color}">
		<span class="badge-dot" style="background: {phase.color}"></span>
		<div>
			<strong>Day {dayNum}</strong> · {phase.name}
			{#if total > 0}
				<span class="of-total">of {total} days</span>
			{/if}
		</div>
	</div>

	<!-- Timeline bar -->
	{#if timeline.length > 0}
		<div class="timeline">
			{#each timeline as seg}
				<div
					class="tl-seg"
					class:active={seg.active}
					style="flex: {seg.days}; background: {seg.color}; opacity: {seg.active ? 1 : 0.35}"
					title="{seg.name}: {seg.days} days"
				></div>
			{/each}
		</div>

		<!-- Phase legend -->
		<div class="legend">
			{#each timeline as seg}
				<div class="legend-item" class:active={seg.active}>
					<span class="leg-dot" style="background: {seg.color}"></span>
					<span class="leg-name">{seg.name}</span>
					<span class="leg-days">{seg.days}d</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Explainer -->
	{@const exp = explainerFor(phase.key)}
	{#if exp}
		<div class="explainer">
			{#if exp.title}
				<h3>{exp.title}</h3>
			{/if}
			{#if exp.description}
				<p>{exp.description}</p>
			{/if}
			{#if exp.tips && Array.isArray(exp.tips)}
				<ul>
					{#each exp.tips as tip}
						<li>{tip}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{:else}
		<div class="explainer">
			<h3>{phase.name} Phase</h3>
			{#if phase.key === 'loading'}
				<p>Eat freely for 2 days. Build up reserves before the activation phase begins.</p>
			{:else if phase.key === 'activation' || phase.key === 'transition'}
				<p>Follow the strict protocol. Limited food choices, 500–700 kcal/day. Your body enters ketosis and starts using stored fat.</p>
			{:else if phase.key === 'stabilization'}
				<p>Gradually reintroduce foods. Your metabolism resets to a new setpoint. Weigh daily and stay within the stabilization band.</p>
			{:else if phase.key === 'maintenance'}
				<p>Maintain your results with balanced eating. Use the calorie bank and weekly average to keep weight stable.</p>
			{:else}
				<p>Track your nutrition and stay on course.</p>
			{/if}
		</div>
	{/if}
</Sheet>

<style>
	.current-badge {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px;
		background: var(--paper);
		border-radius: 10px;
		margin-bottom: 16px;
	}
	.badge-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.current-badge strong {
		font-family: var(--serif);
		font-size: 1rem;
	}
	.of-total {
		font-size: 0.82rem;
		color: var(--muted);
		margin-left: 4px;
	}
	.timeline {
		display: flex;
		height: 8px;
		border-radius: 4px;
		overflow: hidden;
		gap: 2px;
		margin-bottom: 12px;
	}
	.tl-seg {
		border-radius: 3px;
		min-width: 4px;
		transition: opacity 0.2s;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 16px;
		margin-bottom: 20px;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.78rem;
		color: var(--muted);
	}
	.legend-item.active {
		color: var(--ink);
		font-weight: 600;
	}
	.leg-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.leg-days {
		font-size: 0.72rem;
		opacity: 0.7;
	}
	.explainer {
		background: var(--paper);
		border-radius: 10px;
		padding: 16px;
	}
	.explainer h3 {
		font-family: var(--serif);
		font-size: 0.95rem;
		font-weight: 600;
		margin-bottom: 8px;
	}
	.explainer p {
		font-size: 0.88rem;
		color: var(--ink-soft);
		line-height: 1.5;
	}
	.explainer ul {
		margin-top: 8px;
		padding-left: 18px;
	}
	.explainer li {
		font-size: 0.85rem;
		color: var(--ink-soft);
		margin-bottom: 4px;
	}
</style>
