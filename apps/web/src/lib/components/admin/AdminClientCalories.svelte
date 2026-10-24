<!-- v.1.0.0 2026-10-24 -- #69 Client calorie dashboard -->
<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';
	import type { ClientCalorieStatus } from '@aevum/shared';

	let clients = $state<ClientCalorieStatus[]>([]);
	let today = $state('');
	let loading = $state(true);
	let sortKey = $state<'name' | 'phase' | 'effectiveTarget' | 'lastIntake' | 'verdict'>('name');
	let sortAsc = $state(true);

	$effect(() => { load(); });

	async function load() {
		loading = true;
		try {
			const res = await adminApi<{ clients: ClientCalorieStatus[]; today: string }>('admin_client_calories');
			clients = res.clients || [];
			today = res.today || '';
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			loading = false;
		}
	}

	function toggleSort(key: typeof sortKey) {
		if (sortKey === key) { sortAsc = !sortAsc; }
		else { sortKey = key; sortAsc = true; }
	}

	let sorted = $derived((() => {
		const list = [...clients];
		list.sort((a, b) => {
			let cmp = 0;
			switch (sortKey) {
				case 'name': cmp = a.name.localeCompare(b.name); break;
				case 'phase': cmp = a.phase.localeCompare(b.phase); break;
				case 'effectiveTarget': cmp = a.effectiveTarget - b.effectiveTarget; break;
				case 'lastIntake': cmp = (a.lastIntake ?? 0) - (b.lastIntake ?? 0); break;
				case 'verdict': cmp = (a.verdict || '').localeCompare(b.verdict || ''); break;
			}
			return sortAsc ? cmp : -cmp;
		});
		return list;
	})());

	function verdictColor(v: string | null): string {
		if (v === 'on_target') return 'var(--green, #2e7d32)';
		if (v === 'surplus') return 'var(--red, #c62828)';
		if (v === 'deficit') return 'var(--amber, #e68a00)';
		return 'var(--muted)';
	}

	function verdictLabel(v: string | null): string {
		if (v === 'on_target') return 'On target';
		if (v === 'surplus') return 'Surplus';
		if (v === 'deficit') return 'Deficit';
		return '--';
	}

	function deltaLabel(c: ClientCalorieStatus): string {
		if (c.lastIntake == null) return '--';
		const d = c.lastIntake - c.effectiveTarget;
		const sign = d >= 0 ? '+' : '';
		return sign + d;
	}

	function deltaColor(c: ClientCalorieStatus): string {
		if (c.lastIntake == null) return 'var(--muted)';
		const d = Math.abs(c.lastIntake - c.effectiveTarget);
		const pct = d / c.effectiveTarget;
		if (pct <= 0.05) return 'var(--green, #2e7d32)';
		if (pct <= 0.15) return 'var(--amber, #e68a00)';
		return 'var(--red, #c62828)';
	}

	function daysAgo(dateStr: string | null): string {
		if (!dateStr || !today) return '--';
		const t = new Date(today + 'T00:00:00Z').getTime();
		const d = new Date(dateStr + 'T00:00:00Z').getTime();
		const diff = Math.floor((t - d) / 86_400_000);
		if (diff === 0) return 'Today';
		if (diff === 1) return '1d ago';
		return diff + 'd ago';
	}

	function sortArrow(key: string): string {
		if (sortKey !== key) return '';
		return sortAsc ? ' ↑' : ' ↓';
	}
</script>

<div class="cal-dash">
	<div class="list-header">
		<h2>Client Calories</h2>
		<span class="hint">{today} | {clients.length} active client{clients.length !== 1 ? 's' : ''}</span>
		<button class="btn-xs btn-outline" onclick={load} style="margin-left:auto">Refresh</button>
	</div>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else if clients.length === 0}
		<div class="loading">No active clients found</div>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th class="sortable" onclick={() => toggleSort('name')}>Client{sortArrow('name')}</th>
						<th class="sortable" onclick={() => toggleSort('phase')}>Phase{sortArrow('phase')}</th>
						<th>Day</th>
						<th>TDEE</th>
						<th class="sortable" onclick={() => toggleSort('effectiveTarget')}>Target{sortArrow('effectiveTarget')}</th>
						<th>Bank</th>
						<th class="sortable" onclick={() => toggleSort('lastIntake')}>Last intake{sortArrow('lastIntake')}</th>
						<th>Delta</th>
						<th>Last log</th>
						<th class="sortable" onclick={() => toggleSort('verdict')}>Verdict{sortArrow('verdict')}</th>
					</tr>
				</thead>
				<tbody>
					{#each sorted as c (c.userId)}
						<tr>
							<td class="name-cell">
								<strong>{c.name}</strong>
								<span class="sub">{c.programId}</span>
							</td>
							<td><span class="phase-badge">{c.phase}</span></td>
							<td class="num">{c.dayNum || '--'}</td>
							<td class="num">{c.tdee}</td>
							<td class="num">
								<strong>{c.effectiveTarget}</strong>
								{#if c.bankAdj !== 0}
									<span class="sub bank-adj" class:positive={c.bankAdj > 0}>
										{c.bankAdj > 0 ? '+' : ''}{c.bankAdj}
									</span>
								{/if}
							</td>
							<td>
								{#if c.isBankActive}
									<span class="bank-on">ON</span>
								{:else}
									<span class="bank-off">--</span>
								{/if}
							</td>
							<td class="num">{c.lastIntake ?? '--'}</td>
							<td class="num" style="color:{deltaColor(c)}">{deltaLabel(c)}</td>
							<td class="sub">{daysAgo(c.lastLogDate)}</td>
							<td>
								<span class="verdict-dot" style="color:{verdictColor(c.verdict)}">
									{verdictLabel(c.verdict)}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.cal-dash { padding: 24px 28px; }
	.list-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
	h2 { font-size: 18px; font-weight: 600; margin: 0; }
	.hint { font-size: 12px; color: var(--muted); }

	.table-wrap { overflow-x: auto; }

	table {
		width: 100%; border-collapse: collapse;
		font-size: 13px;
	}
	thead th {
		text-align: left; padding: 8px 10px;
		font-size: 11px; font-weight: 600; color: var(--muted);
		text-transform: uppercase; letter-spacing: 0.04em;
		border-bottom: 2px solid var(--line, #e5e0d5);
		white-space: nowrap; user-select: none;
	}
	th.sortable { cursor: pointer; }
	th.sortable:hover { color: var(--ink); }

	tbody tr {
		border-bottom: 1px solid var(--line, #e5e0d5);
		transition: background 0.1s;
	}
	tbody tr:hover { background: rgba(0,0,0,0.02); }

	td {
		padding: 10px 10px; vertical-align: middle;
		white-space: nowrap;
	}
	td.num { font-variant-numeric: tabular-nums; text-align: right; }

	.name-cell { display: flex; flex-direction: column; gap: 1px; }
	.name-cell strong { font-size: 13px; }
	.sub { font-size: 10px; color: var(--muted); }

	.phase-badge {
		font-size: 11px; font-weight: 500;
		padding: 2px 8px; border-radius: 6px;
		background: #f0ece4; color: var(--ink-soft);
		text-transform: capitalize;
	}

	.bank-adj { font-size: 10px; display: block; }
	.bank-adj.positive { color: var(--green, #2e7d32); }

	.bank-on {
		font-size: 10px; font-weight: 600; color: var(--green, #2e7d32);
		padding: 2px 6px; border-radius: 4px;
		background: rgba(46,125,50,0.08);
	}
	.bank-off { font-size: 10px; color: var(--muted); }

	.verdict-dot { font-size: 12px; font-weight: 600; }

	.loading { color: var(--muted); padding: 40px; text-align: center; font-size: 14px; }

	.btn-xs {
		padding: 4px 10px; border-radius: 6px; font-size: 11px;
		font-weight: 500; border: 1px solid var(--line); color: var(--ink-soft);
		background: transparent; cursor: pointer;
	}
	.btn-xs:hover { opacity: .85; }
</style>
