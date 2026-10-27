<!--
  FitnessPanel — phase-aware routines list.
  Maps to renderFitness() from index.html.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { fitnessLoaded, loadFitness, routinesForPhase, isDailyRoutine, movementById, type Routine } from '$lib/stores/fitness';
	import { phaseFor, phReg } from '$lib/stores/phases';
	import { currentDay } from '$lib/stores/day';

	let selected = $state<Routine | null>(null);

	const currentPhase = $derived(phaseFor(get(currentDay)));
	const intro = $derived((phReg(currentPhase.key) as Record<string, unknown> | null)?.fitness_intro as string || '');
	const routines = $derived(routinesForPhase(currentPhase.key));
	const dailies = $derived(routines.filter(isDailyRoutine));
	const workouts = $derived(routines.filter(r => !isDailyRoutine(r)));
	const featured = $derived(routines[0] || null);

	function openRoutine(r: Routine) { selected = r; }
	function closeSheet() { selected = null; }

	onMount(() => { loadFitness(); });
</script>

<!-- Phase intro -->
{#if intro}
	<div class="fp-intro">{intro}</div>
{/if}

{#if !get(fitnessLoaded)}
	<div class="fp-empty">Loading routines…</div>
{:else if !routines.length}
	<div class="fp-empty">No routines for {currentPhase.name}.</div>
{:else}
	<!-- Featured -->
	{#if featured}
		<button class="fp-featured" onclick={() => openRoutine(featured)}>
			<span class="fp-badge">Featured</span>
			<span class="fp-fname">{featured.name}</span>
			<span class="fp-fmeta">{featured.duration} min · {featured.steps.length} movements</span>
		</button>
	{/if}

	<!-- Daily routines -->
	{#if dailies.length}
		<h4 class="fp-section">Daily</h4>
		<div class="fp-list">
			{#each dailies as r}
				<button class="fp-card" onclick={() => openRoutine(r)}>
					<span class="fp-cname">{r.name}</span>
					<span class="fp-cmeta">{r.duration} min</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Workouts -->
	{#if workouts.length}
		<h4 class="fp-section">Workouts</h4>
		<div class="fp-list">
			{#each workouts as r}
				<button class="fp-card" onclick={() => openRoutine(r)}>
					<span class="fp-cname">{r.name}</span>
					<span class="fp-cmeta">{r.duration} min · {r.steps.length} exercises</span>
				</button>
			{/each}
		</div>
	{/if}
{/if}

<!-- Routine detail sheet -->
{#if selected}
	<div class="sheet-bg" onclick={closeSheet} role="presentation"></div>
	<div class="sheet">
		<div class="sheet-handle"></div>
		<h3 class="sheet-title">{selected.name}</h3>
		<div class="fp-cmeta" style="margin-bottom:14px">{selected.duration} min · {selected.steps.length} movements</div>

		<div class="fp-steps">
			{#each selected.steps as step, i}
				{@const mov = movementById(step.movement_id)}
				<div class="fp-step">
					<span class="fp-step-num">{i + 1}</span>
					<div class="fp-step-body">
						<span class="fp-step-name">{mov?.name || step.movement_id}</span>
						{#if step.reps > 0}
							<span class="fp-step-detail">{step.sets} × {step.reps} · {step.rest}s rest</span>
						{:else}
							<span class="fp-step-detail">Follow along</span>
						{/if}
						{#if mov?.video_url}
							<a class="fp-video" href={mov.video_url} target="_blank" rel="noopener">▶ Video</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<button class="sheet-close" onclick={closeSheet}>Close</button>
	</div>
{/if}

<style>
	.fp-intro {
		font-size: 14px; color: var(--muted);
		padding: 12px 14px; background: var(--card, #fff);
		border: 1px solid var(--line); border-radius: 12px;
		margin-bottom: 14px; line-height: 1.5;
	}
	.fp-empty { text-align: center; color: var(--muted); font-size: 13px; padding: 30px; }

	.fp-featured {
		display: flex; flex-direction: column; gap: 4px;
		width: 100%; text-align: left;
		padding: 18px; background: var(--gold);
		color: #fff; border: none; border-radius: 14px;
		cursor: pointer; font-family: inherit;
		margin-bottom: 16px;
	}
	.fp-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.8; }
	.fp-fname { font-size: 17px; font-weight: 600; }
	.fp-fmeta { font-size: 13px; opacity: 0.8; }

	.fp-section {
		font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;
		color: var(--muted); margin: 0 0 8px; font-weight: 600;
	}
	.fp-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
	.fp-card {
		display: flex; justify-content: space-between; align-items: center;
		width: 100%; text-align: left;
		padding: 14px; background: var(--card, #fff);
		border: 1px solid var(--line); border-radius: 12px;
		cursor: pointer; font-family: inherit;
	}
	.fp-cname { font-size: 15px; font-weight: 500; }
	.fp-cmeta { font-size: 13px; color: var(--muted); }

	/* Sheet */
	.sheet-bg { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 90; }
	.sheet {
		position: fixed; bottom: 0; left: 0; right: 0;
		background: var(--paper, #fff);
		border-radius: 20px 20px 0 0;
		padding: 20px 20px 32px;
		max-height: 80dvh; overflow-y: auto;
		z-index: 91;
	}
	.sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: var(--line); margin: 0 auto 14px; }
	.sheet-title { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
	.sheet-close {
		width: 100%; margin-top: 16px; padding: 12px;
		border: 1px solid var(--line); border-radius: 12px;
		background: var(--card, #fff); font-size: 14px;
		cursor: pointer; font-family: inherit;
	}

	.fp-steps { display: flex; flex-direction: column; gap: 10px; }
	.fp-step { display: flex; gap: 12px; align-items: flex-start; }
	.fp-step-num {
		width: 26px; height: 26px; flex-shrink: 0;
		display: flex; align-items: center; justify-content: center;
		background: var(--line-soft, #f0ede8); border-radius: 50%;
		font-size: 12px; font-weight: 600;
	}
	.fp-step-body { display: flex; flex-direction: column; gap: 2px; }
	.fp-step-name { font-size: 14px; font-weight: 500; }
	.fp-step-detail { font-size: 12px; color: var(--muted); }
	.fp-video {
		font-size: 12px; color: var(--gold);
		text-decoration: none; font-weight: 600;
	}
</style>
