<script lang="ts">
	import { onMount } from 'svelte';
	import {
		TABLES, SIDEBAR_SECTIONS, dataStore,
		loadTableData, saveTableData, revertTableData, markDirty,
		adminApi, toast
	} from '$lib/stores/admin';
	import AdminSidebar from '$lib/components/admin/AdminSidebar.svelte';
	import DataTable from '$lib/components/admin/DataTable.svelte';
	import PolicyCards from '$lib/components/admin/PolicyCards.svelte';
	import UserList from '$lib/components/admin/UserList.svelte';
	import UserDetail from '$lib/components/admin/UserDetail.svelte';
	import IntakeList from '$lib/components/admin/IntakeList.svelte';
	import IntakeDetail from '$lib/components/admin/IntakeDetail.svelte';
	import IntakeForm from '$lib/components/admin/IntakeForm.svelte';
	import MealPlanBuilder from '$lib/components/admin/MealPlanBuilder.svelte';
	import BodyScans from '$lib/components/admin/BodyScans.svelte';
	import AdminPrograms from '$lib/components/admin/AdminPrograms.svelte';
	import AdminProgramDetail from '$lib/components/admin/AdminProgramDetail.svelte';
	import AdminPhaseEditor from '$lib/components/admin/AdminPhaseEditor.svelte';

	// View state
	let activeTable = $state('rules');
	let view = $state<'table' | 'users' | 'user_detail' | 'intakes' | 'intake_detail' | 'intake_form' | 'mealplan' | 'body_scans' | 'programs' | 'program_detail' | 'phase_editor'>('table');
	let selectedUserId = $state<number>(0);
	let selectedIntakeId = $state<number>(0);
	let editingIntake = $state<Record<string, unknown> | null>(null);

	// Programs
	let selectedProgramId = $state('');
	let editingPhase = $state<Record<string, unknown> | null>(null);
	let editorProgramId = $state('');

	// Users
	let users = $state<Record<string, unknown>[]>([]);

	// Intake list ref
	let intakeListRef: IntakeList;

	// Track user profile for meal plan / body scans
	let userProfile = $state<Record<string, unknown>>({});

	onMount(() => {
		selectTable('rules');
	});

	async function selectTable(key: string) {
		activeTable = key;

		const tableDef = TABLES[key];

		// Special views by key or mode
		if (key === 'programs') {
			view = 'programs';
			return;
		}
		if (key === 'users' || tableDef?.mode === 'users') {
			view = 'users';
			await loadUsers();
			return;
		}
		if (key === 'intakes' || tableDef?.mode === 'intakes') {
			view = 'intakes';
			return;
		}

		if (!tableDef) {
			view = 'table';
			return;
		}

		view = 'table';
		if (!$dataStore[key]) {
			await loadTableData(key);
		}
	}

	async function loadUsers() {
		try {
			const res = await adminApi<{ users: Record<string, unknown>[] }>('admin_users');
			users = res.users || [];
		} catch (e: unknown) {
			toast('Error loading users: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	function handleSelectUser(userId: number) {
		selectedUserId = userId;
		view = 'user_detail';
	}

	function handleBackFromUser() {
		view = 'users';
		loadUsers();
	}

	// Intakes
	function handleSelectIntake(id: number) {
		selectedIntakeId = id;
		view = 'intake_detail';
	}

	function handleNewIntake() {
		editingIntake = null;
		view = 'intake_form';
	}

	function handleEditIntake(intake: Record<string, unknown>) {
		editingIntake = intake;
		view = 'intake_form';
	}

	function handleIntakeFormDone() {
		view = 'intakes';
		intakeListRef?.refresh();
	}

	// Meal plan — accessed from user detail
	function openMealPlan(userId: number, profile: Record<string, unknown>) {
		selectedUserId = userId;
		userProfile = profile;
		view = 'mealplan';
	}

	function openBodyScans(userId: number) {
		selectedUserId = userId;
		view = 'body_scans';
	}

	// Programs
	function handleSelectProgram(programId: string) {
		selectedProgramId = programId;
		view = 'program_detail';
	}

	function handleEditPhase(phase: Record<string, unknown> | null, programId: string) {
		editingPhase = phase;
		editorProgramId = programId;
		view = 'phase_editor';
	}

	function handlePhaseEditorDone() {
		view = 'program_detail';
	}

	// Table editing
	function handleCellChange(rowIdx: number, key: string, value: string) {
		const td = $dataStore[activeTable];
		if (!td) return;
		td.current[rowIdx][key] = value;
		markDirty(activeTable);
	}

	function handleAddRow() {
		const td = $dataStore[activeTable];
		if (!td) return;
		const row: Record<string, unknown> = {};
		TABLES[activeTable]?.cols.forEach(c => { row[c.key] = ''; });
		td.current = [...td.current, row];
		markDirty(activeTable);
	}

	function handleDeleteRow(idx: number) {
		const td = $dataStore[activeTable];
		if (!td) return;
		td.current = td.current.filter((_, i) => i !== idx);
		markDirty(activeTable);
	}

	function handlePolicyChange(phase: string, value: string) {
		const td = $dataStore[activeTable];
		if (!td) return;
		const row = td.current.find(r => r.phase === phase);
		if (row) {
			row.content = value;
		} else {
			td.current = [...td.current, { phase, content: value }];
		}
		markDirty(activeTable);
	}

	async function handleSave() {
		await saveTableData(activeTable);
	}

	function handleRevert() {
		revertTableData(activeTable);
	}

	// Derived
	function currentTableDef() { return TABLES[activeTable]; }
	function currentData() { return $dataStore[activeTable]; }
	function isDirty() { return $dataStore[activeTable]?.dirty ?? false; }
</script>

<svelte:head>
	<title>AEVUM Admin</title>
</svelte:head>

<div class="admin-shell">
	<AdminSidebar {activeTable} onSelect={selectTable} />

	<main class="admin-main">
		<!-- Save/revert bar for tables -->
		{#if view === 'table' && isDirty()}
			<div class="save-bar">
				<span class="save-label">Unsaved changes</span>
				<button class="btn btn-outline btn-sm" onclick={handleRevert}>Revert</button>
				<button class="btn btn-primary btn-sm" onclick={handleSave}>Save</button>
			</div>
		{/if}

		{#if view === 'table'}
			{@const def = currentTableDef()}
			{@const data = currentData()}
			{#if def && data}
				{#if def.mode === 'cards'}
					<PolicyCards rows={data.current} onPolicyChange={handlePolicyChange} />
				{:else}
					<DataTable
						tableName={activeTable}
						cols={def.cols}
						rows={data.current}
						stickyCol={true}
						onCellChange={handleCellChange}
						onAddRow={handleAddRow}
						onDeleteRow={handleDeleteRow}
					/>
				{/if}
			{:else}
				<div class="loading-state">Loading...</div>
			{/if}
		{:else if view === 'users'}
			<UserList {users} onSelectUser={handleSelectUser} onRefresh={loadUsers} />
		{:else if view === 'user_detail'}
			<UserDetail userId={selectedUserId} onBack={handleBackFromUser} />
		{:else if view === 'intakes'}
			<IntakeList bind:this={intakeListRef} onSelectIntake={handleSelectIntake} onNewIntake={handleNewIntake} />
		{:else if view === 'intake_detail'}
			<IntakeDetail intakeId={selectedIntakeId} onBack={() => { view = 'intakes'; intakeListRef?.refresh(); }} onEdit={handleEditIntake} />
		{:else if view === 'intake_form'}
			<IntakeForm intake={editingIntake} onDone={handleIntakeFormDone} onCancel={() => view = 'intakes'} />
		{:else if view === 'mealplan'}
			<MealPlanBuilder userId={selectedUserId} profile={userProfile} />
		{:else if view === 'body_scans'}
			<BodyScans userId={selectedUserId} />
		{:else if view === 'programs'}
			<AdminPrograms onSelectProgram={handleSelectProgram} />
		{:else if view === 'program_detail'}
			<AdminProgramDetail programId={selectedProgramId} onBack={() => view = 'programs'} onEditPhase={handleEditPhase} />
		{:else if view === 'phase_editor'}
			<AdminPhaseEditor phase={editingPhase} programId={editorProgramId} onDone={handlePhaseEditorDone} onCancel={() => view = 'program_detail'} />
		{/if}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: var(--sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
		color: var(--ink, #1A1A1A);
		background: var(--paper, #FBFAF7);
	}
	.admin-shell {
		display: flex;
		min-height: 100vh;
	}
	.admin-main {
		flex: 1;
		overflow-y: auto;
		background: var(--paper);
		position: relative;
	}
	.save-bar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 28px;
		background: #fffbea;
		border-bottom: 1px solid var(--gold);
	}
	.save-label { font-size: 13px; font-weight: 500; color: var(--gold-deep, #8f6f1f); flex: 1; }
	.loading-state { color: var(--muted); padding: 60px; text-align: center; font-size: 14px; }

	.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; }
	.btn-sm { padding: 6px 12px; font-size: 12px; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn-outline { border: 1px solid var(--line); color: var(--ink-soft); background: transparent; }
	.btn:hover { opacity: .85; }
</style>
