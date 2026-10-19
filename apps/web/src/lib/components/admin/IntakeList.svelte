<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';

	let { onSelectIntake, onNewIntake }: {
		onSelectIntake: (id: number) => void;
		onNewIntake: () => void;
	} = $props();

	let intakes = $state<Record<string, unknown>[]>([]);
	let loading = $state(true);

	const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
		draft: { bg: '#f0ede5', color: '#6b665c' },
		sent: { bg: '#FFF3CD', color: '#856d00' },
		in_progress: { bg: '#D4EDFF', color: '#2a6496' },
		submitted: { bg: '#E8F2EF', color: '#2d6a4f' },
		review_required: { bg: '#FCE4EC', color: '#A13024' },
		approved: { bg: '#d4edda', color: '#155724' }
	};

	export async function refresh() {
		loading = true;
		try {
			const res = await adminApi<{ rows: Record<string, unknown>[] }>('admin_intakes_list');
			intakes = res.rows || [];
		} catch (e: unknown) {
			toast('Error loading intakes: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			loading = false;
		}
	}

	import { onMount } from 'svelte';
	onMount(() => refresh());

	function statusStyle(status: string) {
		const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
		return `background:${s.bg};color:${s.color}`;
	}

	function formatDate(d: unknown): string {
		if (!d) return '–';
		return String(d).slice(0, 10);
	}
</script>

<div class="intake-list">
	<div class="list-actions">
		<button class="btn btn-primary" onclick={onNewIntake}>+ New Intake</button>
	</div>

	{#if loading}
		<div class="loading-state">Loading intakes...</div>
	{:else if !intakes.length}
		<div class="empty-state">No intakes yet</div>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Email</th>
					<th>Status</th>
					<th>Created</th>
					<th>Updated</th>
				</tr>
			</thead>
			<tbody>
				{#each intakes as intake}
					<tr class="intake-row" onclick={() => onSelectIntake(intake.id as number)}>
						<td>{intake.full_name ?? '–'}</td>
						<td>{intake.email ?? '–'}</td>
						<td>
							<span class="status-badge" style={statusStyle(String(intake.status ?? 'draft'))}>
								{String(intake.status ?? 'draft').replace('_', ' ')}
							</span>
						</td>
						<td>{formatDate(intake.created)}</td>
						<td>{formatDate(intake.updated)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.intake-list { padding: 20px 28px; }
	.list-actions { margin-bottom: 16px; }
	.loading-state, .empty-state { color: var(--muted); padding: 40px; text-align: center; }
	table { width: 100%; border-collapse: separate; border-spacing: 0; background: var(--card); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	thead th { background: #f5f2ec; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); font-weight: 600; white-space: nowrap; border-bottom: 2px solid var(--line); }
	tbody td { padding: 8px 12px; border-bottom: 1px solid var(--line-soft); font-size: 13px; }
	.intake-row { cursor: pointer; transition: background .15s; }
	.intake-row:hover { background: #f5f0e5 !important; }
	.status-badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
	.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn:hover { opacity: .85; }
</style>
