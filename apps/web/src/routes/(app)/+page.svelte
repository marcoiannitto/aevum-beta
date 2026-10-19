<script lang="ts">
	/**
	 * Main tracker page — replaces index.html
	 * Shell: TopBar + tab content + BottomNav
	 */
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { profile, pid, isProgram, loadStoredProfile, saveProfile, type UserProfile } from '$lib/stores/auth';
	import { currentDay, dayData, loadDay, saveDay, syncDay } from '$lib/stores/day';
	import { phaseFor, loadPhases, totalDays } from '$lib/stores/phases';
	import { loadConfig, cfg } from '$lib/stores/config';
	import { loadRules } from '$lib/stores/rules';
	import { api } from '$lib/api/client';

	import TopBar from '$lib/components/shell/TopBar.svelte';
	import BottomNav from '$lib/components/shell/BottomNav.svelte';

	// Today tab components
	import CalorieStatus from '$lib/components/today/CalorieStatus.svelte';
	import MacroGates from '$lib/components/today/MacroGates.svelte';
	import FoodBuckets from '$lib/components/today/FoodBuckets.svelte';
	import Timeline from '$lib/components/today/Timeline.svelte';
	import WaterTracker from '$lib/components/today/WaterTracker.svelte';
	import LogMealButton from '$lib/components/today/LogMealButton.svelte';
	import ExerciseTracker from '$lib/components/today/ExerciseTracker.svelte';
	import SerumBlock from '$lib/components/today/SerumBlock.svelte';
	import CheckinTab from '$lib/components/checkin/CheckinTab.svelte';
	import TrendsTab from '$lib/components/trends/TrendsTab.svelte';

	type Tab = 'today' | 'daily' | 'trends' | 'nutrition';
	let activeTab = $state<Tab>('today');

	let todayNum = $state(1);
	let booted = $state(false);

	// ── Day helpers (maps to todayDayNum / DAY_START_HOUR) ──

	function dayStartDate(): Date {
		const now = new Date();
		const hour = cfg('day_start_hour');
		if (now.getHours() < hour) {
			now.setDate(now.getDate() - 1);
		}
		return now;
	}

	function todayDayNum(): number {
		const prof = get(profile);
		if (!prof?.start_date) return 1;
		const start = new Date(prof.start_date);
		const today = dayStartDate();
		const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
		return Math.max(1, diff + 1);
	}

	// ── Navigation ──

	function goDay(n: number) {
		saveDay();
		syncDay(); // push to backend before navigating
		loadDay(n);
	}

	function prevDay() {
		if (get(currentDay) > 1) goDay(get(currentDay) - 1);
	}

	function nextDay() {
		goDay(get(currentDay) + 1);
	}

	function goToday() {
		goDay(todayNum);
	}

	function switchTab(tab: Tab) {
		activeTab = tab;
	}

	// ── Boot sequence (maps to boot() from index.html) ──

	async function boot() {
		// 1. Compute today's day number
		todayNum = todayDayNum();

		// 2. Load day data
		loadDay(todayNum);

		// 3. Load config, phases, rules in parallel (fire-and-forget)
		loadConfig();
		loadPhases();
		loadRules();

		// 4. Fetch fresh profile from server
		try {
			const d = await api<{ profile?: UserProfile }>('profile', {}, { contentType: 'text/plain;charset=utf-8' });
			if (d?.profile) {
				const prof = d.profile;
				if (prof.program === false) isProgram.set(false);
				saveProfile(prof);
				// Recalculate today after profile update
				todayNum = todayDayNum();
			}
		} catch { /* noop — local profile is good enough */ }

		booted = true;
	}

	onMount(() => {
		loadStoredProfile();
		boot();
	});
</script>

<svelte:head>
	<title>AEVUM</title>
</svelte:head>

{#if booted}
	<main class="tracker">
		<TopBar
			todayDayNum={todayNum}
			onPrevDay={prevDay}
			onNextDay={nextDay}
			onGoToday={goToday}
			onOpenProfile={() => { /* TODO: profile panel */ }}
			onOpenFoodHub={() => { /* TODO: food hub sheet */ }}
		/>

		<div class="scroll">
			{#if activeTab === 'today'}
				<div class="tabpage">
					<SerumBlock />
					<CalorieStatus />
					<MacroGates />
					<FoodBuckets />
					<Timeline />
					<WaterTracker />
					<LogMealButton onclick={() => { /* TODO: open meal logging sheet */ }} />
					<ExerciseTracker />
				</div>
			{:else if activeTab === 'daily'}
				<div class="tabpage">
					<CheckinTab />
				</div>
			{:else if activeTab === 'trends'}
				<div class="tabpage">
					<TrendsTab />
				</div>
			{:else if activeTab === 'nutrition'}
				<div class="tabpage">
					<!-- TODO: Plan tab with sub-tabs (Meals, Recipes, Move) -->
					<div class="placeholder">Plan — meals, recipes, move</div>
				</div>
			{/if}
		</div>

		<BottomNav active={activeTab} onSwitch={switchTab} />
	</main>
{:else}
	<div class="loading">
		<span class="mark">AEVUM</span>
	</div>
{/if}

<style>
	.tracker {
		min-height: 100dvh;
		padding-bottom: var(--nav-h);
	}
	.scroll {
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
	.tabpage {
		padding: 16px 18px 24px;
	}
	.placeholder {
		text-align: center;
		color: var(--muted);
		font-size: 14px;
		padding: 60px 20px;
		border: 1px dashed var(--line);
		border-radius: 16px;
		margin-top: 12px;
	}
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100dvh;
	}
	.mark {
		font-family: var(--serif);
		font-size: 24px;
		letter-spacing: 0.18em;
		color: var(--muted);
		animation: pulse 1.5s ease-in-out infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 1; }
	}
</style>
