<!--
  FitnessTab — workout routines and movements.
  Maps to renderFitness/openRoutine/openMovement from index.html.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { loadFitness, fitRoutines, isDailyRoutine, movementById, routinesForPhase, type Routine, type Movement } from '$lib/stores/fitness';
	import { phaseFor } from '$lib/stores/phases';
	import { currentDay } from '$lib/stores/day';

	const FIT_INTRO: Record<string, string> = {
		loading: 'Ease into movement. Gentle and short.',
		activation: 'A little movement today. Pick something and follow along.',
		stabilization: 'Pick a routine and follow along at your own pace.',
		maintenance: 'Keep moving. Pick a routine that fits your day.'
	};

	let openRoutineData = $state<Routine | null>(null);
	let openMovementData = $state<Movement | null>(null);

	const cd = $derived(get(currentDay));
	const phase = $derived(phaseFor(cd));
	const phaseKey = $derived(phase?.key || 'activation');
	const intro = $derived(FIT_INTRO[phaseKey] || FIT_INTRO.activation);

	const routines = $derived(routinesForPhase(phaseKey));
	const dailyRoutines = $derived(routines.filter(isDailyRoutine));
	const workoutRoutines = $derived(routines.filter(r => !isDailyRoutine(r)));
	const featured = $derived(dailyRoutines[0] || workoutRoutines[0] || null);

	function firstMovie(r: Routine): Movement | undefined {
		for (const s of r.steps) {
			const m = movementById(s.movement_id);
			if (m?.video_url) return m;
		}
		return r.steps[0] ? movementById(r.steps[0].movement_id) : undefined;
	}

	function showRoutine(r: Routine) { openRoutineData = r; }
	function closeRoutine() { openRoutineData = null; }
	function showMovement(id: string) {
		const m = movementById(id);
		if (m) openMovementData = m;
	}
	function closeMovement() {
		openMovementData = null;
	}

	function doseLabel(s: { sets: number; reps: number; rest: number; movement_id: string }): string {
		const m = movementById(s.movement_id);
		const nm = m?.name || s.movement_id;
		if (s.reps > 0) return s.sets > 1 ? `${s.sets} × ${s.reps}` : `${s.reps} reps`;
		if (/hold|stretch|pose|dog|twist|bend|circle|walkout/i.test(nm)) return 'hold';
		return '';
	}

	onMount(() => { loadFitness(); });
</script>

<div class="fitness">
	<p class="fit-intro">{intro}</p>

	{#if !routines.length}
		<div class="fit-empty">Routines are being prepared. Check back soon.</div>
	{:else}
		<!-- Featured -->
		{#if featured}
			{@const fm = firstMovie(featured)}
			<button class="fit-feat" onclick={() => showRoutine(featured)}>
				{#if fm?.video_url}
					<video src="{fm.video_url}#t=0.4" muted playsinline preload="metadata"></video>
				{/if}
				<div class="ff-grad"></div>
				<div class="ff-content">
					<div class="ff-tag">Suggested for today</div>
					<div class="ff-title">{featured.name}</div>
					<div class="ff-meta">
						{#if featured.duration}<span class="fit-pill">▷ {featured.duration} min</span>{/if}
						<span class="fit-pill">{featured.steps.length} movements</span>
					</div>
				</div>
			</button>
		{/if}

		<!-- Daily -->
		{#if dailyRoutines.length}
			<div class="fit-sec">
				<div class="fit-sec-h">
					<div class="fit-sec-t">Daily</div>
					<div class="fit-sec-sub">Anytime</div>
				</div>
				{#each dailyRoutines as r}
					{@const m = firstMovie(r)}
					<button class="fit-row" onclick={() => showRoutine(r)}>
						<div class="fit-thumb">
							{#if m?.video_url}
								<video src="{m.video_url}#t=0.4" muted playsinline preload="metadata"></video>
							{:else}
								<div class="ic">♢</div>
							{/if}
						</div>
						<div class="fit-rbody">
							<div class="fit-rname">{r.name}</div>
							<div class="fit-rmeta">
								{#if r.duration}<span class="fit-tag">{r.duration} min</span>{/if}
								<span class="fit-tag">{r.steps.length} moves</span>
							</div>
						</div>
						<span class="fit-chev">›</span>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Workouts -->
		{#if workoutRoutines.length}
			<div class="fit-sec">
				<div class="fit-sec-h">
					<div class="fit-sec-t">Workouts</div>
					<div class="fit-sec-sub">2 to 3 a week</div>
				</div>
				<div class="fit-grid">
					{#each workoutRoutines as r}
						{@const m = firstMovie(r)}
						<button class="fit-tile" onclick={() => showRoutine(r)}>
							{#if m?.video_url}
								<video src="{m.video_url}#t=0.4" muted playsinline preload="metadata"></video>
							{/if}
							<div class="ft-grad"></div>
							<div class="ft-content">
								<div class="ft-title">{r.name}</div>
								<div class="ft-meta">{r.duration ? r.duration + ' min · ' : ''}{r.steps.length} moves</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Routine sheet -->
{#if openRoutineData}
	<div class="scrim show" onclick={closeRoutine}></div>
	<div class="sheet show">
		<div class="grab"></div>
		<button class="sheet-close" onclick={closeRoutine}>×</button>
		<h2 class="rt-title">{openRoutineData.name}</h2>
		<div class="rt-meta">
			{#if openRoutineData.duration}<span class="fit-tag">{openRoutineData.duration} min</span>{/if}
			<span class="fit-tag">{openRoutineData.steps.length} movements</span>
		</div>

		<button class="rt-start" onclick={() => { if (openRoutineData?.steps[0]) showMovement(openRoutineData.steps[0].movement_id); }}>
			▷ Start routine
		</button>

		{#each openRoutineData.steps as step, i}
			{@const m = movementById(step.movement_id)}
			<button class="rt-step" onclick={() => showMovement(step.movement_id)}>
				<span class="rs-num">{i + 1}</span>
				<div class="rs-thumb">
					{#if m?.video_url}
						<video src="{m.video_url}#t=0.4" muted playsinline preload="metadata"></video>
					{:else}
						<div class="ic">♢</div>
					{/if}
				</div>
				<div class="rs-body">
					<div class="rs-name">{m?.name || step.movement_id}</div>
					<div class="rs-dose">
						{doseLabel(step)}{step.rest > 0 ? ` · rest ${step.rest}s` : ''}
					</div>
				</div>
				<span class="rs-play">▶</span>
			</button>
		{/each}
	</div>
{/if}

<!-- Movement sheet -->
{#if openMovementData}
	<div class="scrim show" style="z-index:910" onclick={closeMovement}></div>
	<div class="sheet show" style="z-index:911">
		<div class="grab"></div>
		<button class="sheet-close" onclick={closeMovement}>×</button>
		<h2 class="rt-title">{openMovementData.name || 'Movement'}</h2>
		{#if openMovementData.video_url}
			<video class="mv-video" src={openMovementData.video_url} controls playsinline loop preload="metadata"></video>
		{/if}
		{#if openMovementData.description}
			<p class="mv-desc">{openMovementData.description}</p>
		{/if}
	</div>
{/if}

<style>
	.fitness { display: flex; flex-direction: column; gap: 12px; }
	.fit-intro { font-size: 14px; color: var(--muted); line-height: 1.5; margin-bottom: 4px; }
	.fit-empty { text-align: center; color: var(--muted); font-size: 13px; padding: 40px; }

	/* Featured card */
	.fit-feat {
		position: relative; border-radius: 16px; overflow: hidden;
		height: 180px; width: 100%; border: none; cursor: pointer;
		background: var(--ink); padding: 0;
	}
	.fit-feat video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
	.ff-grad { position: absolute; inset: 0; background: linear-gradient(transparent 40%, rgba(0,0,0,.7)); }
	.ff-content { position: absolute; bottom: 16px; left: 16px; right: 16px; color: #fff; text-align: left; }
	.ff-tag { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--gold); margin-bottom: 4px; }
	.ff-title { font-family: var(--serif); font-size: 18px; margin-bottom: 6px; }
	.ff-meta { display: flex; gap: 6px; }
	.fit-pill {
		padding: 4px 10px; border-radius: 12px;
		font-size: 11px; background: rgba(255,255,255,.15);
		color: #fff;
	}

	/* Section */
	.fit-sec { margin-top: 8px; }
	.fit-sec-h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
	.fit-sec-t { font-size: 15px; font-weight: 600; }
	.fit-sec-sub { font-size: 12px; color: var(--muted); }

	/* Row */
	.fit-row {
		display: flex; align-items: center; gap: 10px;
		padding: 10px; background: var(--card, #fff);
		border: 1px solid var(--line); border-radius: 12px;
		margin-bottom: 6px; cursor: pointer; width: 100%;
		font-family: inherit; text-align: left;
	}
	.fit-thumb {
		width: 52px; height: 52px; border-radius: 10px;
		overflow: hidden; background: var(--line); flex-shrink: 0;
	}
	.fit-thumb video { width: 100%; height: 100%; object-fit: cover; }
	.fit-thumb .ic { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--muted); }
	.fit-rbody { flex: 1; min-width: 0; }
	.fit-rname { font-size: 14px; font-weight: 500; }
	.fit-rmeta { display: flex; gap: 4px; margin-top: 2px; }
	.fit-tag { font-size: 11px; color: var(--muted); background: var(--line-soft, #f0ede8); padding: 2px 8px; border-radius: 8px; }
	.fit-chev { font-size: 18px; color: var(--muted); }

	/* Tile grid */
	.fit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.fit-tile {
		position: relative; border-radius: 14px; overflow: hidden;
		height: 140px; border: none; cursor: pointer;
		background: var(--ink); padding: 0;
	}
	.fit-tile video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
	.ft-grad { position: absolute; inset: 0; background: linear-gradient(transparent 30%, rgba(0,0,0,.7)); }
	.ft-content { position: absolute; bottom: 10px; left: 10px; right: 10px; color: #fff; text-align: left; }
	.ft-title { font-size: 14px; font-weight: 500; margin-bottom: 2px; }
	.ft-meta { font-size: 11px; opacity: .8; }

	/* Sheet overlays */
	.scrim {
		position: fixed; inset: 0; background: rgba(0,0,0,.4);
		z-index: 900; opacity: 0; pointer-events: none;
		transition: opacity .25s;
	}
	.scrim.show { opacity: 1; pointer-events: auto; }
	.sheet {
		position: fixed; bottom: 0; left: 0; right: 0;
		background: var(--paper, #FBFAF7);
		border-radius: 20px 20px 0 0;
		padding: 12px 20px calc(env(safe-area-inset-bottom) + 24px);
		max-height: 85vh; overflow-y: auto; z-index: 901;
		transform: translateY(100%); transition: transform .3s ease;
	}
	.sheet.show { transform: translateY(0); }
	.grab { width: 36px; height: 4px; border-radius: 2px; background: var(--line); margin: 0 auto 16px; }
	.sheet-close {
		position: absolute; top: 16px; right: 16px;
		width: 32px; height: 32px; border: none; background: none;
		font-size: 24px; color: var(--muted); cursor: pointer;
	}

	.rt-title { font-family: var(--serif); font-size: 20px; font-weight: 400; margin-bottom: 6px; }
	.rt-meta { display: flex; gap: 6px; margin-bottom: 16px; }
	.rt-start {
		width: 100%; padding: 14px; border: none; border-radius: 12px;
		background: var(--ink); color: #fff; font-size: 15px;
		font-weight: 500; cursor: pointer; margin-bottom: 16px;
		font-family: inherit;
	}
	.rt-step {
		display: flex; align-items: center; gap: 10px;
		padding: 10px 0; border: none; background: none;
		width: 100%; cursor: pointer; text-align: left;
		border-bottom: 1px solid var(--line);
		font-family: inherit;
	}
	.rs-num { font-size: 13px; color: var(--muted); width: 20px; text-align: center; flex-shrink: 0; }
	.rs-thumb {
		width: 44px; height: 44px; border-radius: 8px;
		overflow: hidden; background: var(--line); flex-shrink: 0;
	}
	.rs-thumb video { width: 100%; height: 100%; object-fit: cover; }
	.rs-thumb .ic { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--muted); }
	.rs-body { flex: 1; min-width: 0; }
	.rs-name { font-size: 14px; font-weight: 500; }
	.rs-dose { font-size: 12px; color: var(--muted); }
	.rs-play { font-size: 14px; color: var(--gold); }

	.mv-video { width: 100%; border-radius: 12px; margin: 12px 0; }
	.mv-desc { font-size: 14px; color: var(--ink); line-height: 1.6; }
</style>
