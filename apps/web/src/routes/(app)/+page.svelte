<script lang="ts">
	/**
	 * Main tracker page — replaces index.html
	 * Shell: TopBar + tab content + BottomNav
	 */
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { profile, pid, isProgram, loadStoredProfile, saveProfile, type UserProfile } from '$lib/stores/auth';
	import { hydrateFromBackend, migrateToDateKeys } from '$lib/stores/day';
	import { currentDay, currentDate, dayData, loadDay, loadDate, saveDay, syncDay, setTargetStamper } from '$lib/stores/day';
	import { effectiveTarget, baseTarget } from '$lib/stores/calorie';
	import { phaseFor, loadPhases, totalDays } from '$lib/stores/phases';
	import { loadConfig, cfg } from '$lib/stores/config';
	import { loadRules } from '$lib/stores/rules';
	import { loadPrograms } from '$lib/stores/programs';
	import { effToday } from '$lib/helpers/date';
	import { api } from '$lib/api/client';

	import TopBar from '$lib/components/shell/TopBar.svelte';
	import BottomNav from '$lib/components/shell/BottomNav.svelte';

	// Today tab components
	import CalorieStatus from '$lib/components/today/CalorieStatus.svelte';
	import Timeline from '$lib/components/today/Timeline.svelte';
	import WaterTracker from '$lib/components/today/WaterTracker.svelte';
	import LogMealButton from '$lib/components/today/LogMealButton.svelte';

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

	let booted = $state(false);

	// Overlay state
	let profileOpen = $state(false);
	let foodHubOpen = $state(false);
	let mealLogOpen = $state(false);
	let mealEditIndex = $state(-1);
	let phaseSheetOpen = $state(false);

	// ── Navigation (date-first) ──

	function goDate(date: Date) {
		saveDay();
		syncDay();
		loadDate(date);
	}

	function prevDay() {
		const d = new Date(get(currentDate));
		d.setDate(d.getDate() - 1);
		goDate(d);
	}

	function nextDay() {
		const d = new Date(get(currentDate));
		d.setDate(d.getDate() + 1);
		goDate(d);
	}

	function goToday() {
		goDate(effToday());
	}

	function switchTab(tab: Tab) {
		activeTab = tab;
	}

	// ── Boot sequence (maps to boot() from index.html) ──

	async function boot() {
		// Register target stamper (avoids circular import day ↔ calorie)
		setTargetStamper((dayNum) => ({
			effective: effectiveTarget(dayNum),
			base: baseTarget(dayNum),
		}));

		// 1. Start with today's date from the phone
		const today = effToday();
		loadDate(today);

		// 2. Load config, phases, rules, programs in parallel (fire-and-forget)
		loadConfig();
		loadPrograms();
		loadPhases();
		loadRules();

		// 3. Fetch fresh profile from server
		try {
			const d = await api<{ profile?: UserProfile }>('profile', {}, { contentType: 'text/plain;charset=utf-8' });
			if (d?.profile) {
				const prof = d.profile;
				if (prof.program === false) isProgram.set(false);
				saveProfile(prof);
				// Migrate old day-number keys to date keys (one-time, after profile loads)
				migrateToDateKeys();
				// Re-load today with updated profile (day number may now resolve)
				loadDate(today);
			}
		} catch { /* noop, local profile is good enough */ }

		// 4. Hydrate day data from backend into localStorage
		await hydrateFromBackend(get(currentDay) || 1);

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
			loadDate(effToday());
			startDayRolloverTimer();
		}, ms);
	}

	function handleVisibility() {
		if (!booted) return;                // F-1: never save/sync before boot finishes
		if (document.visibilityState === 'hidden') {
			saveDay();
			syncDay();
		} else {
			// Returning: check if day rolled over
			const today = effToday();
			const viewing = get(currentDate);
			if (today.toDateString() !== viewing.toDateString()) {
				loadDate(today);
			}
		}
	}

	function handleBeforeUnload() {
		if (!booted) return;                // F-1: guard unload too
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
					<WaterTracker />
					<LogMealButton onclick={() => { mealEditIndex = -1; mealLogOpen = true; }} />
					<Timeline />
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
		max-width: 520px;
		margin: 0 auto;
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
