<!-- v.1.0.0 2026-10-24 — Program detail + phases list for admin (#60) -->
<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';

	let { programId, onBack, onEditPhase }: {
		programId: string;
		onBack: () => void;
		onEditPhase: (phase: Record<string, unknown> | null, programId: string) => void;
	} = $props();

	interface Program {
		id: string;
		name: string;
		description: string;
		color: string;
		sort_order: number;
		is_active: number;
	}

	interface Phase {
		key: string;
		name: string;
		sort_order: number;
		color: string;
		calorie_mode: string;
		target_mode: string;
		calorie_bank: number;
		is_program: number;
		duration_default: number;
		[k: string]: unknown;
	}

	let program = $state<Program | null>(null);
	let phases = $state<Phase[]>([]);
	let loading = $state(true);
	let saving = $state(false);

	// Editable fields
	let editName = $state('');
	let editDesc = $state('');
	let editOrder = $state(0);
	let editColor = $state('#3E7A6A');

	$effect(() => { load(); });

	async function load() {
		loading = true;
		try {
			const res = await adminApi<{ programs: Program[] }>('admin_programs', { sub: 'list' });
			const prog = (res.programs || []).find(p => p.id === programId);
			if (!prog) { toast('Program not found', true); onBack(); return; }
			program = prog;
			editName = prog.name;
			editDesc = prog.description || '';
			editOrder = prog.sort_order;
			editColor = prog.color || '#3E7A6A';

			const pRes = await adminApi<{ rows: Phase[] }>('admin_list', { table: 'phases' });
			phases = (pRes.rows || [])
				.filter(p => p.program_id === programId)
				.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			loading = false;
		}
	}

	async function saveProgram() {
		saving = true;
		try {
			await adminApi('admin_programs', {
				sub: 'update', id: programId,
				name: editName.trim(),
				description: editDesc.trim(),
				sort_order: editOrder,
				color: editColor
			});
			toast('Program saved');
			await load();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			saving = false;
		}
	}

	async function deletePhase(key: string) {
		if (!confirm(`Delete phase "${key}"? This cannot be undone.`)) return;
		try {
			const res = await adminApi<{ ok?: boolean; error?: string }>('admin_phase_delete', { key });
			if (res.error) { toast(res.error, true); return; }
			toast('Phase deleted');
			await load();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}
</script>

<div class="detail">
	<button class="back-btn" onclick={onBack}>&larr; Programs</button>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if program}
		<div class="prog-header">
			<span class="color-dot" style="background:{editColor}"></span>
			<h2>{program.id}</h2>
		</div>

		<div class="edit-card">
			<div class="form-row">
				<label>
					<span>Name</span>
					<input type="text" bind:value={editName} />
				</label>
				<label>
					<span>Sort order</span>
					<input type="number" bind:value={editOrder} />
				</label>
				<label>
					<span>Color</span>
					<input type="color" bind:value={editColor} />
				</label>
			</div>
			<label class="wide">
				<span>Description</span>
				<input type="text" bind:value={editDesc} />
			</label>
			<button class="btn btn-primary btn-sm" onclick={saveProgram} disabled={saving}>
				{saving ? 'Saving...' : 'Save Program'}
			</button>
		</div>

		<div class="phases-header">
			<h3>Phases ({phases.length})</h3>
			<button class="btn btn-primary btn-sm" onclick={() => onEditPhase(null, programId)}>
				+ Add Phase
			</button>
		</div>

		{#if phases.length === 0}
			<div class="empty">No phases yet. Add one to get started.</div>
		{:else}
			<table class="phase-table">
				<thead>
					<tr>
						<th>Order</th>
						<th>Key</th>
						<th>Name</th>
						<th>Color</th>
						<th>Cal Mode</th>
						<th>Target Mode</th>
						<th>Bank</th>
						<th>Duration</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each phases as ph}
						<tr class="phase-row" onclick={() => onEditPhase(ph, programId)}>
							<td class="center">{ph.sort_order ?? ''}</td>
							<td class="mono">{ph.key}</td>
							<td>{ph.name}</td>
							<td><span class="color-dot sm" style="background:{ph.color || '#ccc'}"></span></td>
							<td>{ph.calorie_mode || '-'}</td>
							<td>{ph.target_mode || '-'}</td>
							<td class="center">{ph.calorie_bank ? 'Yes' : '-'}</td>
							<td class="center">{ph.duration_default || '-'}</td>
							<td>
								<button class="del-btn" onclick|stopPropagation={() => deletePhase(ph.key)} title="Delete phase">
									&times;
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{/if}
</div>

<style>
	.detail { padding: 24px 28px; }
	.back-btn {
		font-size: 13px; color: var(--muted); background: none; border: none;
		cursor: pointer; padding: 0; margin-bottom: 16px;
	}
	.back-btn:hover { color: var(--gold); }

	.prog-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
	h2 { font-size: 18px; font-weight: 600; margin: 0; font-family: monospace; }
	h3 { font-size: 15px; font-weight: 600; margin: 0; }

	.edit-card {
		background: var(--card, #fff);
		border: 1px solid var(--line, #e5e0d5);
		border-radius: 10px;
		padding: 16px;
		margin-bottom: 24px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.form-row { display: flex; gap: 12px; }
	.form-row label, label.wide { display: flex; flex-direction: column; gap: 4px; flex: 1; }
	.form-row label span, label.wide span { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
	input[type="text"], input[type="number"] {
		padding: 7px 10px; border: 1px solid var(--line); border-radius: 6px;
		font-size: 13px; font-family: inherit; background: var(--bg, #fafafa);
	}
	input[type="color"] { width: 40px; height: 32px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; }

	.phases-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }

	.phase-table { width: 100%; border-collapse: collapse; font-size: 13px; }
	.phase-table th {
		text-align: left; padding: 8px 10px;
		font-size: 11px; font-weight: 600; color: var(--muted);
		text-transform: uppercase; letter-spacing: 0.05em;
		border-bottom: 1px solid var(--line);
	}
	.phase-table td { padding: 9px 10px; border-bottom: 1px solid var(--line-soft, #f0ece4); }
	.phase-row { cursor: pointer; transition: background 0.12s; }
	.phase-row:hover { background: #f5f2ec; }
	.mono { font-family: monospace; font-size: 12px; color: var(--muted); }
	.center { text-align: center; }

	.color-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; vertical-align: middle; }
	.color-dot.sm { width: 12px; height: 12px; }

	.del-btn {
		font-size: 16px; color: var(--muted); background: none; border: none;
		cursor: pointer; padding: 2px 6px; border-radius: 4px;
	}
	.del-btn:hover { background: #fce4e4; color: #c0392b; }

	.empty { color: var(--muted); padding: 24px; text-align: center; font-size: 13px; }
	.loading { color: var(--muted); padding: 40px; text-align: center; font-size: 14px; }

	.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; }
	.btn-sm { padding: 6px 12px; font-size: 12px; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn:hover { opacity: .85; }
	.btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
