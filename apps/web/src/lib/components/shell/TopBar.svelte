<!--
  TopBar — name, food hub button, day navigation, phase chip, phase progress bar.
  Maps to .topbar / .daybar / .phasebar from index.html.
-->
<script lang="ts">
	import { profile } from '$lib/stores/auth';
	import { currentDay, dayData } from '$lib/stores/day';
	import { phaseFor, phasesList, phaseLens } from '$lib/stores/phases';
	import { get } from 'svelte/store';

	interface Props {
		onOpenProfile?: () => void;
		onOpenFoodHub?: () => void;
		onPrevDay?: () => void;
		onNextDay?: () => void;
		onGoToday?: () => void;
		todayDayNum?: number;
	}

	let { onOpenProfile, onOpenFoodHub, onPrevDay, onNextDay, onGoToday, todayDayNum = 1 }: Props = $props();

	let phase = $derived(phaseFor($currentDay, $profile));
	let isToday = $derived($currentDay === todayDayNum);

	// Phase bar segments
	let segments = $derived.by(() => {
		const list = get(phasesList);
		const lens = phaseLens($profile);
		if (!list.length) return [];

		const total = Object.values(lens).reduce((s, v) => s + v, 0);
		if (total <= 0) return [];

		let cum = 0;
		return list
			.filter((ph) => lens[ph.key] > 0)
			.map((ph) => {
				const dur = lens[ph.key] ?? 0;
				const pct = (dur / total) * 100;
				const filled = Math.min(Math.max(($currentDay - cum) / dur, 0), 1) * 100;
				cum += dur;
				return { key: ph.key, color: ph.color, pct, filled };
			});
	});
</script>

<header class="topbar">
	<div class="line1">
		<button class="who" onclick={onOpenProfile}>{$profile?.name || 'AEVUM'}</button>
		<button class="fc-open" onclick={onOpenFoodHub}>Food</button>
	</div>

	<div class="daybar">
		<button class="arrow" onclick={onPrevDay} aria-label="Previous day">‹</button>
		<div class="center">
			<div class="dnum">Day {$currentDay}</div>
			<button class="phase tappable" style="color:{phase.color}">{phase.name}</button>
			{#if !isToday}
				<button class="today-jump" onclick={onGoToday}>Back to today</button>
			{/if}
		</div>
		<button class="arrow" onclick={onNextDay} aria-label="Next day">›</button>
	</div>

	{#if segments.length > 0}
		<div class="phasebar">
			{#each segments as seg (seg.key)}
				<div class="ph-seg" style="width:{seg.pct}%;background:#e8e4dc;">
					<div class="ph-fill" style="width:{seg.filled}%;background:{seg.color};"></div>
				</div>
			{/each}
		</div>
	{/if}
</header>

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		background: rgba(251, 250, 247, 0.92);
		backdrop-filter: saturate(180%) blur(12px);
		-webkit-backdrop-filter: saturate(180%) blur(12px);
		border-bottom: 1px solid var(--line);
		padding: calc(env(safe-area-inset-top) + 10px) 18px 0;
	}
	.line1 {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.who {
		font-family: var(--serif);
		font-size: 17px;
		letter-spacing: 0.04em;
		font-weight: 500;
	}
	.fc-open {
		font-size: 13px;
		color: var(--gold);
		font-weight: 500;
	}
	.daybar {
		display: flex;
		align-items: center;
		margin-top: 10px;
		padding-bottom: 8px;
	}
	.arrow {
		font-size: 28px;
		line-height: 1;
		color: var(--muted);
		padding: 4px 8px;
		-webkit-tap-highlight-color: transparent;
	}
	.center {
		flex: 1;
		text-align: center;
	}
	.dnum {
		font-family: var(--serif);
		font-size: 16px;
		font-weight: 500;
		letter-spacing: 0.02em;
	}
	.phase {
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-top: 2px;
	}
	.today-jump {
		display: block;
		margin: 4px auto 0;
		font-size: 12px;
		color: var(--gold);
		font-weight: 500;
	}
	.phasebar {
		display: flex;
		gap: 2px;
		height: 4px;
		border-radius: 2px;
		overflow: hidden;
		margin-bottom: 6px;
	}
	.ph-seg {
		position: relative;
		border-radius: 2px;
		overflow: hidden;
	}
	.ph-fill {
		position: absolute;
		inset: 0;
		border-radius: 2px;
		transition: width 0.3s ease;
	}
</style>
