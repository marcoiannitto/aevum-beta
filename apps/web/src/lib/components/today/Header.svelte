<script lang="ts">
	import { profile, isProgram } from '$lib/stores/auth';
	import { currentDay } from '$lib/stores/day';
	import { currentDate } from '$lib/stores/day';
	import { phaseFor } from '$lib/stores/phases';
	import { fmtShort, effToday, todayDayNum } from '$lib/helpers/date';

	let { onPrev, onNext, onToday }: {
		onPrev: () => void;
		onNext: () => void;
		onToday: () => void;
	} = $props();

	const ph = $derived(phaseFor($currentDay, $profile));
	const dayNum = $derived($currentDay);
	const today = $derived(effToday());
	const isToday = $derived(
		$currentDate.toDateString() === today.toDateString()
	);
</script>

<header class="topbar">
	<div class="line1">
		<span class="mark">AEVUM</span>
		<span class="who">{$profile?.name || 'Profile'}</span>
	</div>
	<div class="line2">
		<button class="nav-btn" onclick={onPrev}>‹</button>
		<div class="day-info">
			<span class="day-label">
				{fmtShort($currentDate)}
				{#if $isProgram && dayNum > 0}
					<span class="dday-date">Day {dayNum}</span>
				{/if}
			</span>
			{#if $isProgram && dayNum > 0}
				<span class="phase-badge" style:color={ph.color}>
					<span class="phase-dot" style:background={ph.color}></span>
					{ph.name}
				</span>
			{/if}
		</div>
		<button class="nav-btn" onclick={onNext}>›</button>
	</div>
	{#if !isToday}
		<button class="today-btn" onclick={onToday}>Today</button>
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
		padding: calc(env(safe-area-inset-top) + 10px) 18px 12px;
	}
	.line1 {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.mark {
		font-family: var(--serif);
		font-size: 17px;
		letter-spacing: 0.18em;
	}
	.who {
		font-size: 13px;
		color: var(--muted);
		cursor: pointer;
	}
	.line2 {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8px;
	}
	.nav-btn {
		width: 36px;
		height: 36px;
		border: 1px solid var(--line);
		border-radius: 50%;
		background: transparent;
		font-size: 18px;
		color: var(--ink);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.nav-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.day-info {
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.day-label {
		font-family: var(--serif);
		font-size: 16px;
		font-weight: 600;
	}
	.dday-date {
		display: block;
		font-size: 11px;
		color: var(--muted);
		font-weight: 400;
		font-family: var(--sans, sans-serif);
	}
	.phase-badge {
		font-size: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
	}
	.phase-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
	}
	.today-btn {
		display: block;
		margin: 8px auto 0;
		padding: 4px 16px;
		border: 1px solid var(--gold);
		border-radius: 16px;
		background: transparent;
		color: var(--gold);
		font-size: 12px;
		cursor: pointer;
	}
</style>
