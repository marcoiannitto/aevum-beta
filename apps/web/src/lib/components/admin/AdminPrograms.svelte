<!-- v.1.0.0 2026-10-24 — Programs list for admin dashboard (#60) -->
<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';

	let { onSelectProgram }: {
		onSelectProgram: (programId: string) => void;
	} = $props();

	interface Program {
		id: string;
		name: string;
		description: string;
		color: string;
		sort_order: number;
		is_active: number;
		phase_count?: number;
	}

	let programs = $state<Program[]>([]);
	let loading = $state(true);
	let showCreate = $state(false);
	let creating = $state(false);

	// Create form
	let newId = $state('');
	let newName = $state('');
	let newDesc = $state('');
	let newColor = $state('#3E7A6A');

	$effect(() => { loadPrograms(); });

	async function loadPrograms() {
		loading = true;
		try {
			const res = await adminApi<{ programs: Program[] }>('admin_programs', { sub: 'list' });
			const progs = res.programs || [];

			// Get phase counts
			const phases = await adminApi<{ rows: { program_id: string }[] }>('admin_list', { table: 'phases' });
			const counts: Record<string, number> = {};
			for (const p of phases.rows || []) {
				const pid = p.program_id || 'none';
				counts[pid] = (counts[pid] || 0) + 1;
			}
			programs = progs.map(p => ({ ...p, phase_count: counts[p.id] || 0 }));
		} catch (e: unknown) {
			toast('Error loading programs: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			loading = false;
		}
	}

	async function toggleActive(prog: Program) {
		try {
			await adminApi('admin_programs', {
				sub: 'update', id: prog.id,
				is_active: prog.is_active ? 0 : 1
			});
			toast(prog.is_active ? 'Deactivated' : 'Activated');
			await loadPrograms();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	async function createProgram() {
		const id = newId.trim().toLowerCase().replace(/\s+/g, '_');
		const name = newName.trim();
		if (!id || !name) { toast('ID and name required', true); return; }
		creating = true;
		try {
			await adminApi('admin_programs', {
				sub: 'create', id, name,
				description: newDesc.trim(),
				color: newColor
			});
			toast('Program created');
			newId = ''; newName = ''; newDesc = ''; newColor = '#3E7A6A';
			showCreate = false;
			await loadPrograms();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			creating = false;
		}
	}
</script>

<div class="programs">
	<div class="list-header">
		<h2>Programs</h2>
		<button class="btn btn-primary btn-sm" onclick={() => showCreate = !showCreate}>
			{showCreate ? 'Cancel' : '+ New Program'}
		</button>
	</div>

	{#if showCreate}
		<div class="create-form">
			<div class="form-row">
				<label>
					<span>ID (slug)</span>
					<input type="text" bind:value={newId} placeholder="e.g. keto_advanced" />
				</label>
				<label>
					<span>Name</span>
					<input type="text" bind:value={newName} placeholder="e.g. Keto Advanced" />
				</label>
			</div>
			<div class="form-row">
				<label class="wide">
					<span>Description</span>
					<input type="text" bind:value={newDesc} placeholder="Short description" />
				</label>
				<label>
					<span>Color</span>
					<input type="color" bind:value={newColor} />
				</label>
			</div>
			<button class="btn btn-primary btn-sm" onclick={createProgram} disabled={creating}>
				{creating ? 'Creating...' : 'Create'}
			</button>
		</div>
	{/if}

	{#if loading}
		<div class="loading">Loading...</div>
	{:else}
		<table class="prog-table">
			<thead>
				<tr>
					<th>Color</th>
					<th>ID</th>
					<th>Name</th>
					<th>Phases</th>
					<th>Order</th>
					<th>Active</th>
				</tr>
			</thead>
			<tbody>
				{#each programs as prog}
					<tr class="prog-row" class:inactive={!prog.is_active} onclick={() => onSelectProgram(prog.id)}>
						<td><span class="color-dot" style="background:{prog.color}"></span></td>
						<td class="mono">{prog.id}</td>
						<td>{prog.name}</td>
						<td class="center">{prog.phase_count}</td>
						<td class="center">{prog.sort_order}</td>
						<td>
							<button
								class="toggle"
								class:on={!!prog.is_active}
								onclick={(e) => { e.stopPropagation(); toggleActive(prog); }}
							>{prog.is_active ? 'ON' : 'OFF'}</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.programs { padding: 24px 28px; }
	.list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
	h2 { font-size: 18px; font-weight: 600; margin: 0; }

	.create-form {
		background: var(--card, #fff);
		border: 1px solid var(--line, #e5e0d5);
		border-radius: 10px;
		padding: 16px;
		margin-bottom: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.form-row { display: flex; gap: 12px; }
	.form-row label { display: flex; flex-direction: column; gap: 4px; flex: 1; }
	.form-row label.wide { flex: 2; }
	.form-row label span { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
	.form-row input[type="text"] {
		padding: 7px 10px; border: 1px solid var(--line); border-radius: 6px;
		font-size: 13px; font-family: inherit; background: var(--bg, #fafafa);
	}
	.form-row input[type="color"] { width: 40px; height: 32px; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; }

	.prog-table { width: 100%; border-collapse: collapse; font-size: 13px; }
	.prog-table th {
		text-align: left; padding: 8px 12px;
		font-size: 11px; font-weight: 600; color: var(--muted);
		text-transform: uppercase; letter-spacing: 0.05em;
		border-bottom: 1px solid var(--line);
	}
	.prog-table td { padding: 10px 12px; border-bottom: 1px solid var(--line-soft, #f0ece4); }
	.prog-row { cursor: pointer; transition: background 0.12s; }
	.prog-row:hover { background: #f5f2ec; }
	.prog-row.inactive { opacity: 0.5; }
	.mono { font-family: monospace; font-size: 12px; color: var(--muted); }
	.center { text-align: center; }

	.color-dot { display: inline-block; width: 14px; height: 14px; border-radius: 50%; vertical-align: middle; }

	.toggle {
		font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 10px;
		border: 1px solid var(--line); cursor: pointer; transition: all 0.15s;
		background: #f5f2ec; color: var(--muted);
	}
	.toggle.on { background: var(--gold); color: var(--ink); border-color: var(--gold); }

	.loading { color: var(--muted); padding: 40px; text-align: center; font-size: 14px; }

	.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; }
	.btn-sm { padding: 6px 12px; font-size: 12px; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn:hover { opacity: .85; }
	.btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
