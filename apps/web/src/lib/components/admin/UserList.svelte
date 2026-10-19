<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';

	let { users, onSelectUser, onRefresh }: {
		users: Record<string, unknown>[];
		onSelectUser: (userId: number) => void;
		onRefresh: () => void;
	} = $props();

	let showCreateForm = $state(false);
	let creating = $state(false);

	// Create form fields
	let fname = $state('');
	let email = $state('');
	let phone = $state('');
	let sex = $state('');
	let dob = $state('');
	let height = $state('');
	let weight = $state('');
	let targetKg = $state('');

	function resetForm() {
		fname = ''; email = ''; phone = ''; sex = ''; dob = '';
		height = ''; weight = ''; targetKg = '';
		showCreateForm = false;
	}

	async function createUser() {
		if (!fname || !email) { toast('Name and email required', true); return; }
		creating = true;
		try {
			await adminApi('admin_user_create', {
				name: fname, email, phone, sex, dob,
				height: height ? +height : undefined,
				start_weight: weight ? +weight : undefined,
				target_kg: targetKg ? +targetKg : undefined
			});
			toast('User created');
			resetForm();
			onRefresh();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : 'Unknown'), true);
		} finally {
			creating = false;
		}
	}
</script>

<div class="user-list">
	<div class="list-actions">
		<button class="btn btn-primary" onclick={() => showCreateForm = !showCreateForm}>
			{showCreateForm ? 'Cancel' : '+ New User'}
		</button>
	</div>

	{#if showCreateForm}
		<div class="create-form">
			<h3>Create User</h3>
			<div class="if-grid">
				<div class="if-group">
					<label>Name</label>
					<input type="text" bind:value={fname} placeholder="Full name" />
				</div>
				<div class="if-group">
					<label>Email</label>
					<input type="email" bind:value={email} placeholder="email@example.com" />
				</div>
				<div class="if-group">
					<label>Phone</label>
					<input type="text" bind:value={phone} placeholder="+65..." />
				</div>
				<div class="if-group">
					<label>Sex</label>
					<select bind:value={sex}>
						<option value="">—</option>
						<option value="M">Male</option>
						<option value="F">Female</option>
					</select>
				</div>
				<div class="if-group">
					<label>Date of Birth</label>
					<input type="date" bind:value={dob} />
				</div>
				<div class="if-group">
					<label>Height (cm)</label>
					<input type="number" bind:value={height} />
				</div>
				<div class="if-group">
					<label>Weight (kg)</label>
					<input type="number" bind:value={weight} />
				</div>
				<div class="if-group">
					<label>Target (kg)</label>
					<input type="number" bind:value={targetKg} />
				</div>
			</div>
			<div class="form-actions">
				<button class="btn btn-primary" onclick={createUser} disabled={creating}>
					{creating ? 'Creating...' : 'Create'}
				</button>
				<button class="btn btn-outline" onclick={resetForm}>Cancel</button>
			</div>
		</div>
	{/if}

	<table>
		<thead>
			<tr>
				<th>Name</th>
				<th>Email</th>
				<th>Type</th>
				<th>Start wt</th>
				<th>Logs</th>
				<th>Last Day</th>
				<th>Created</th>
			</tr>
		</thead>
		<tbody>
			{#each users as user}
				<tr class="user-row" onclick={() => onSelectUser(user.id as number)}>
					<td>{user.name ?? ''}</td>
					<td>{user.email ?? ''}</td>
					<td>
						{#if user.program}
							<span class="user-badge badge-program">Program</span>
						{:else}
							<span class="user-badge badge-free">Free</span>
						{/if}
					</td>
					<td>{user.start_weight ?? '–'}</td>
					<td>{user.log_count ?? '–'}</td>
					<td>{user.last_day ?? '–'}</td>
					<td>{user.created ? String(user.created).slice(0, 10) : '–'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.user-list { padding: 20px 28px; }
	.list-actions { margin-bottom: 16px; }
	.create-form {
		background: var(--card);
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 16px;
		box-shadow: 0 1px 3px rgba(0,0,0,.06);
	}
	.create-form h3 {
		font-family: var(--serif);
		font-size: 16px;
		margin-bottom: 14px;
	}
	.if-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
	.if-group label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 4px; }
	.if-group input, .if-group select {
		width: 100%; padding: 10px 12px; border: 1px solid var(--line);
		border-radius: 8px; font-size: 14px; background: var(--card);
	}
	.if-group input:focus, .if-group select:focus { border-color: var(--gold); outline: none; }
	.form-actions { display: flex; gap: 10px; margin-top: 16px; }
	table {
		width: 100%; border-collapse: separate; border-spacing: 0;
		background: var(--card); border-radius: 12px;
		box-shadow: 0 1px 3px rgba(0,0,0,.06);
	}
	thead th {
		background: #f5f2ec; text-align: left; padding: 10px 12px;
		font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
		color: var(--muted); font-weight: 600; white-space: nowrap;
		border-bottom: 2px solid var(--line);
	}
	tbody td {
		padding: 8px 12px; border-bottom: 1px solid var(--line-soft);
		font-size: 13px;
	}
	.user-row { cursor: pointer; transition: background .15s; }
	.user-row:hover { background: #f5f0e5 !important; }
	.user-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
	.badge-program { background: #E8F2EF; color: #2d6a4f; }
	.badge-free { background: var(--line-soft); color: var(--muted); }
	.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn-primary:disabled { opacity: .4; cursor: default; }
	.btn-outline { border: 1px solid var(--line); color: var(--ink-soft); background: transparent; }
	.btn:hover:not(:disabled) { opacity: .85; }
	@media (max-width: 600px) { .if-grid { grid-template-columns: 1fr; } }
</style>
