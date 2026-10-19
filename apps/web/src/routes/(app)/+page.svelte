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
	import PlanTab from '$lib/components/plan/PlanTab.svelte';

	// Overlays
	import ProfilePanel from '$lib/components/profile/ProfilePanel.svelte';
	import FoodHubSheet from '$lib/components/foodhub/FoodHubSheet.svelte';
	import MealLogSheet from '$lib/components/meals/MealLogSheet.svelte';
	import PhaseSheet from '$lib/components/phases/PhaseSheet.svelte';

	type Tab = 'today' | 'daily' | 'trends' | 'nutrition';
	let activeTab = $state<Tab>('today');

	let todayNum = $state(1);
	let booted = $state(false);

	// Overlay state
	let profileOpen = $state(false);
	let foodHubOpen = $state(false);
	let mealLogOpen = $state(false);
	let mealEditIndex = $state(-1);
	let phaseSheetOpen = $state(false);

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

	// ── Lifecycle: SW, day rollover, save on hide/unload ──

	function registerSW() {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/sw.js').catch(() => {});
		}
	}

	function startDayRolloverTimer() {
		const now = new Date();
		const hour = cfg('day_start_hour');
		const next = new Date(now);
		next.setHours(hour, 0, 0, 0);
		if (next <= now) next.setDate(next.getDate() + 1);
		const ms = next.getTime() - now.getTime();
		setTimeout(() => {
			todayNum = todayDayNum();
			loadDay(todayNum);
			startDayRolloverTimer(); // schedule next
		}, ms);
	}

	function handleVisibility() {
		if (document.visibilityState === 'hidden') {
			saveDay();
			syncDay();
		} else {
			// Returning — check if day rolled over
			const newToday = todayDayNum();
			if (newToday !== todayNum) {
				todayNum = newToday;
				loadDay(todayNum);
			}
		}
	}

	function handleBeforeUnload() {
		saveDay();
		syncDay();
	}

	onMount(() => {
		loadStoredProfile();
		boot().then(() => {
			registerSW();
			startDayRolloverTimer();
		});

		document.addEventListener('visibilitychange', handleVisibility);
		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibility);
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
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
			onOpenProfile={() => { profileOpen = true; }}
			onOpenFoodHub={() => { foodHubOpen = true; }}
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
					<LogMealButton onclick={() => { mealEditIndex = -1; mealLogOpen = true; }} />
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
					<PlanTab />
				</div>
			{/if}
		</div>

		<BottomNav active={activeTab} onSwitch={switchTab} />

		<!-- Overlays -->
		<ProfilePanel open={profileOpen} onClose={() => { profileOpen = false; }} />
		<FoodHubSheet open={foodHubOpen} onClose={() => { foodHubOpen = false; }} />
		<MealLogSheet open={mealLogOpen} editIndex={mealEditIndex} onClose={() => { mealLogOpen = false; }} />
		<PhaseSheet open={phaseSheetOpen} onClose={() => { phaseSheetOpen = false; }} />
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
