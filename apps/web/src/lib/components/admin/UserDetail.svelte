<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { adminApi, toast } from '$lib/stores/admin';
	import { phaseFor } from '$lib/stores/phases';
	import { programs, loadPrograms } from '$lib/stores/programs';

	let { userId, onBack }: {
		userId: number;
		onBack: () => void;
	} = $props();

	let detail = $state<Record<string, unknown> | null>(null);
	let loading = $state(true);
	let activeLogTab = $state('logs');

	// Editable fields
	let name = $state('');
	let email = $state('');
	let startDate = $state('');
	let loadingDays = $state('');
	let activationDays = $state('');
	let transitionDays = $state('');
	let stabilizationDays = $state('');
	let targetKcal = $state('');
	let targetKg = $state('');
	let sex = $state('');
	let dob = $state('');
	let height = $state('');
	let programId = $state('');
	let saving = $state(false);

	// Charts
	let weightCanvas: HTMLCanvasElement;
	let kcalCanvas: HTMLCanvasElement;
	let weightChart: unknown;
	let kcalChart: unknown;
	let ChartLib: typeof import('chart.js') | null = null;

	const LOG_TABS = ['logs', 'meals', 'notes', 'vitals'] as const;

	onMount(async () => {
		loadPrograms();
		await loadUser();
		// Dynamic Chart.js import to avoid SSR
		try {
			ChartLib = await import('chart.js');
			ChartLib.Chart.register(...ChartLib.registerables);
		} catch { /* chart.js not available */ }
	});

	onDestroy(() => {
		destroyCharts();
	});

	function destroyCharts() {
		if (weightChart && typeof (weightChart as { destroy: () => void }).destroy === 'function') (weightChart as { destroy: () => void }).destroy();
		if (kcalChart && typeof (kcalChart as { destroy: () => void }).destroy === 'function') (kcalChart as { destroy: () => void }).destroy();
		weightChart = null;
		kcalChart = null;
	}

	async function loadUser() {
		loading = true;
		try {
			const res = await adminApi<Record<string, unknown>>('admin_export', { id: userId });
			detail = res;
			const p = (res.profile || {}) as Record<string, unknown>;
			name = String(p.name ?? '');
			email = String(p.email ?? '');
			startDate = String(p.start_date ?? '');
			loadingDays = String(p.loading_days ?? '');
			activationDays = String(p.activation_days ?? '');
			transitionDays = String(p.transition_days ?? '');
			stabilizationDays = String(p.stabilization_days ?? '');
			targetKcal = String(p.current_target_kcal ?? '');
			targetKg = String(p.target_kg ?? '');
			sex = String(p.sex ?? '');
			dob = String(p.dob ?? '');
			height = String(p.height ?? '');
			programId = String(p.program_id ?? 'aevum');

			// Render charts after data loads
			setTimeout(() => renderCharts(), 100);
		} catch (e: unknown) {
			toast('Error loading user: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			loading = false;
		}
	}

	function chartOpts(unit: string) {
		return {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					backgroundColor: '#1A1A1A',
					titleFont: { size: 12 },
					bodyFont: { size: 12 },
					padding: 10,
					cornerRadius: 8,
					callbacks: {
						label: (ctx: { dataset: { label: string }; parsed: { y: number } }) =>
							ctx.dataset.label + ': ' + ctx.parsed.y + (unit === 'kg' ? ' kg' : ' kcal')
					}
				}
			},
			scales: {
				x: {
					ticks: { font: { size: 10 }, color: '#938c7d', maxTicksLimit: 15 },
					grid: { display: false }
				},
				y: {
					ticks: { font: { size: 10 }, color: '#938c7d' },
					grid: { color: 'rgba(235,229,216,0.5)' }
				}
			}
		};
	}

	function renderCharts() {
		if (!ChartLib || !detail) return;
		const logs = (detail.logs || []) as Record<string, unknown>[];
		if (!logs.length) return;
		const C = ChartLib.Chart;

		destroyCharts();

		const profile = (detail.profile || {}) as Record<string, unknown>;
		const tgtKcal = profile.current_target_kcal as number || 0;
		const tgtKg = profile.target_kg as number || 0;

		// Weight chart: filter out zero/null weights so line doesn't break
		const wPts = logs.filter(l => (l.weight as number) > 0);
		if (weightCanvas && wPts.length) {
			const pr = wPts.length > 20 ? 1 : 3;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const wDatasets: any[] = [{
				label: 'Weight (kg)',
				data: wPts.map(l => l.weight as number),
				borderColor: '#B08D2E',
				backgroundColor: 'rgba(176,141,46,0.08)',
				fill: true,
				tension: 0.3,
				pointRadius: pr,
				pointHoverRadius: 5,
				borderWidth: 2
			}];
			if (tgtKg) {
				wDatasets.push({
					label: 'Target',
					data: wPts.map(() => tgtKg),
					borderColor: 'rgba(161,48,36,0.4)',
					borderDash: [6, 4],
					pointRadius: 0,
					borderWidth: 1.5,
					fill: false
				});
			}
			weightChart = new C(weightCanvas, {
				type: 'line',
				data: { labels: wPts.map(l => 'D' + l.day), datasets: wDatasets as never },
				options: chartOpts('kg')
			});
		}

		// Calories chart: filter out zero/null kcals
		const kPts = logs.filter(l => (l.kcal as number) > 0);
		if (kcalCanvas && kPts.length) {
			const pr = kPts.length > 20 ? 1 : 3;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const kDatasets: any[] = [{
				label: 'Calories',
				data: kPts.map(l => l.kcal as number),
				borderColor: '#4a6fa5',
				backgroundColor: 'rgba(74,111,165,0.08)',
				fill: true,
				tension: 0.3,
				pointRadius: pr,
				pointHoverRadius: 5,
				borderWidth: 2
			}];
			if (tgtKcal) {
				kDatasets.push({
					label: 'Target',
					data: kPts.map(() => tgtKcal),
					borderColor: 'rgba(161,48,36,0.4)',
					borderDash: [6, 4],
					pointRadius: 0,
					borderWidth: 1.5,
					fill: false
				});
			}
			kcalChart = new C(kcalCanvas, {
				type: 'line',
				data: { labels: kPts.map(l => 'D' + l.day), datasets: kDatasets as never },
				options: chartOpts('kcal')
			});
		}
	}

	async function saveProfile() {
		saving = true;
		try {
			const payload: Record<string, unknown> = { id: userId, name, email, start_date: startDate, sex, dob, program_id: programId };
			if (loadingDays) payload.loading_days = +loadingDays;
			if (activationDays) payload.activation_days = +activationDays;
			if (transitionDays) payload.transition_days = +transitionDays;
			if (stabilizationDays) payload.stabilization_days = +stabilizationDays;
			if (targetKcal) payload.current_target_kcal = +targetKcal;
			if (targetKg) payload.target_kg = +targetKg;
			if (height) payload.height = +height;
			await adminApi('admin_update_user', payload);
			toast('User saved');
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			saving = false;
		}
	}

	async function toggleProgram() {
		if (!detail) return;
		const p = (detail.profile || {}) as Record<string, unknown>;
		const newVal = !p.program;
		try {
			await adminApi('admin_update_user', { id: userId, program: newVal });
			p.program = newVal;
			detail = { ...detail };
			toast(newVal ? 'Program enabled' : 'Program disabled');
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	async function deleteUser() {
		if (!confirm('Delete this user? This cannot be undone.')) return;
		try {
			await adminApi('admin_user_delete', { id: userId });
			toast('User deleted');
			onBack();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	function exportCSV() {
		if (!detail) return;
		const logs = (detail.logs || []) as Record<string, unknown>[];
		if (!logs.length) { toast('No logs to export', true); return; }
		const keys = Object.keys(logs[0]);
		const header = keys.join(',');
		const rows = logs.map(l => keys.map(k => {
			const v = l[k];
			if (v === null || v === undefined) return '';
			const s = String(v);
			return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
		}).join(','));
		const csv = [header, ...rows].join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `user_${userId}_logs.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// Phase helpers
	function phaseForDay(day: number): string {
		if (!detail) return '';
		const p = (detail.profile || {}) as Record<string, unknown>;
		return phaseFor(day, p).name;
	}

	// Stats
	function computeStats() {
		if (!detail) return { cw: '–', sw: '–', avgKcal: '–', daysLogged: 0, avgP: '–', avgFC: '–' };
		const logs = (detail.logs || []) as Record<string, unknown>[];
		const p = (detail.profile || {}) as Record<string, unknown>;
		const weights = logs.map(l => l.weight as number).filter(Boolean);
		const cw = weights.length ? weights[weights.length - 1] : '–';
		const sw = p.start_weight ?? '–';
		const kcals = logs.map(l => (l.kcal as number) || 0).filter(Boolean);
		const avgKcal = kcals.length ? Math.round(kcals.reduce((a, b) => a + b, 0) / kcals.length) : '–';
		const proteins = logs.map(l => (l.protein as number) || 0).filter(Boolean);
		const avgP = proteins.length ? Math.round(proteins.reduce((a, b) => a + b, 0) / proteins.length) : '–';
		const fats = logs.map(l => (l.fat as number) || 0).filter(Boolean);
		const carbs = logs.map(l => (l.carbs as number) || 0).filter(Boolean);
		const avgF = fats.length ? Math.round(fats.reduce((a, b) => a + b, 0) / fats.length) : 0;
		const avgC = carbs.length ? Math.round(carbs.reduce((a, b) => a + b, 0) / carbs.length) : 0;
		return { cw, sw, avgKcal, daysLogged: logs.length, avgP, avgFC: `${avgF}g / ${avgC}g` };
	}

	function reversedLogs(): Record<string, unknown>[] {
		if (!detail) return [];
		return [...((detail.logs || []) as Record<string, unknown>[])].reverse();
	}

	function logsWithNotes(): Record<string, unknown>[] {
		return reversedLogs().filter(l => l.notes);
	}

	function parseDayJson(log: Record<string, unknown>): Record<string, unknown>[] {
		try {
			const raw = log.day_json as string;
			if (!raw) return [];
			const parsed = JSON.parse(raw);
			return parsed.meals || parsed.m || [];
		} catch { return []; }
	}

	$effect(() => {
		if (detail && ChartLib) {
			// re-render on detail change
		}
	});
</script>

{#if loading}
	<div class="loading-state"><span>Loading user...</span></div>
{:else if detail}
	{@const stats = computeStats()}
	{@const profile = (detail.profile || {}) as Record<string, unknown>}

	<div class="ud-wrap">
		<!-- Profile bar -->
		<div class="profile-bar">
			<button class="btn-back" onclick={onBack}>← Back</button>
			<button class="btn" class:btn-primary={!profile.program} class:btn-secondary={!!profile.program} onclick={toggleProgram}>
				{profile.program ? '✓ Program' : 'Enable Program'}
			</button>
			<span class="user-id">ID: {userId}</span>
			<span class="start-label">Start: {startDate || '–'}</span>
			<div style="flex:1"></div>
			<button class="btn btn-danger" onclick={deleteUser}>Delete</button>
		</div>

		<!-- Editable fields -->
		<div class="edit-fields">
			<div class="ef-grid">
				<div class="ef-group"><label>Name</label><input type="text" bind:value={name} /></div>
				<div class="ef-group"><label>Email</label><input type="email" bind:value={email} /></div>
				<div class="ef-group"><label>Start Date</label><input type="date" bind:value={startDate} /></div>
				<div class="ef-group"><label>Loading Days</label><input type="number" bind:value={loadingDays} /></div>
				<div class="ef-group"><label>Activation Days</label><input type="number" bind:value={activationDays} /></div>
				<div class="ef-group"><label>Transition Days</label><input type="number" bind:value={transitionDays} /></div>
				<div class="ef-group"><label>Stabilization Days</label><input type="number" bind:value={stabilizationDays} /></div>
				<div class="ef-group"><label>Target kcal</label><input type="number" bind:value={targetKcal} /></div>
				<div class="ef-group"><label>Target kg</label><input type="number" bind:value={targetKg} /></div>
				<div class="ef-group"><label>Sex</label>
					<select bind:value={sex}><option value="">—</option><option value="m">M</option><option value="f">F</option></select>
				</div>
				<div class="ef-group"><label>DOB</label><input type="date" bind:value={dob} /></div>
				<div class="ef-group"><label>Height (cm)</label><input type="number" bind:value={height} /></div>
				<div class="ef-group"><label>Program</label>
					<select bind:value={programId}>
						{#each $programs as prog}
							<option value={prog.id}>{prog.name}</option>
						{/each}
						{#if !$programs.length}
							<option value={programId}>{programId}</option>
						{/if}
					</select>
				</div>
			</div>
			<button class="btn btn-primary" onclick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
		</div>

		<!-- Stats cards -->
		<div class="ud-stats">
			<div class="ud-stat"><div class="label">Current Weight</div><div class="value">{stats.cw}</div><div class="sub">kg</div></div>
			<div class="ud-stat"><div class="label">Start Weight</div><div class="value">{stats.sw}</div><div class="sub">kg</div></div>
			<div class="ud-stat"><div class="label">Avg Calories</div><div class="value">{stats.avgKcal}</div><div class="sub">kcal/day</div></div>
			<div class="ud-stat"><div class="label">Days Logged</div><div class="value">{stats.daysLogged}</div></div>
			<div class="ud-stat"><div class="label">Avg Protein</div><div class="value">{stats.avgP}</div><div class="sub">g/day</div></div>
			<div class="ud-stat"><div class="label">Avg Fat / Carbs</div><div class="value">{stats.avgFC}</div><div class="sub">g/day</div></div>
		</div>

		<!-- Charts -->
		<div class="ud-charts">
			<div class="ud-chart-card">
				<h3>Weight</h3>
				<canvas bind:this={weightCanvas}></canvas>
			</div>
			<div class="ud-chart-card">
				<h3>Calories</h3>
				<canvas bind:this={kcalCanvas}></canvas>
			</div>
		</div>

		<!-- Log tabs -->
		<div class="ud-logs">
			<div class="ud-export">
				<button class="btn btn-outline" onclick={exportCSV}>↓ Export CSV</button>
			</div>
			<div class="ud-tabs">
				{#each LOG_TABS as tab}
					<button class="ud-tab" class:active={activeLogTab === tab} onclick={() => activeLogTab = tab}>
						{tab === 'logs' ? 'Logs' : tab === 'meals' ? 'Meals' : tab === 'notes' ? 'Notes' : 'Vitals'}
					</button>
				{/each}
			</div>

			<div class="ud-log-scroll">
				{#if activeLogTab === 'logs'}
					<table>
						<thead><tr><th>Day</th><th>Date</th><th>Phase</th><th>Weight</th><th>Kcal</th><th>Protein</th><th>Fat</th><th>Carbs</th><th>Water</th><th>Exercise</th></tr></thead>
						<tbody>
							{#each reversedLogs() as log}
								<tr>
									<td>{log.day}</td><td>{log.date ?? ''}</td><td>{phaseForDay(log.day as number)}</td>
									<td>{log.weight ?? '–'}</td><td>{log.kcal ?? '–'}</td><td>{log.protein ?? '–'}</td>
									<td>{log.fat ?? '–'}</td><td>{log.carbs ?? '–'}</td><td>{log.water_ml ? log.water_ml + ' ml' : '–'}</td>
									<td>{log.exercise ?? '–'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else if activeLogTab === 'meals'}
					<table>
						<thead><tr><th>Day</th><th>Date</th><th>Meals</th></tr></thead>
						<tbody>
							{#each reversedLogs() as log}
								{@const meals = parseDayJson(log)}
								{#if meals.length}
									<tr>
										<td>{log.day}</td><td>{log.date ?? ''}</td>
										<td class="ud-meals">
											{#each meals as m}
												<div class="ud-meal-item">
													<span class="ud-meal-name">{m.name ?? m.n ?? '—'}</span>
													<span class="ud-meal-kcal">{m.kcal ?? m.k ?? 0} kcal</span>
												</div>
											{/each}
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				{:else if activeLogTab === 'notes'}
					<table>
						<thead><tr><th>Day</th><th>Date</th><th>Notes</th></tr></thead>
						<tbody>
							{#each logsWithNotes() as log}
								<tr><td>{log.day}</td><td>{log.date ?? ''}</td><td class="ud-note" title={String(log.notes)}>{log.notes}</td></tr>
							{/each}
						</tbody>
					</table>
				{:else if activeLogTab === 'vitals'}
					<table>
						<thead><tr><th>Day</th><th>Date</th><th>Weight</th><th>Waist</th><th>Serum AM</th><th>Serum PM</th><th>Energy</th><th>Hunger</th><th>Sleep</th></tr></thead>
						<tbody>
							{#each reversedLogs() as log}
								<tr>
									<td>{log.day}</td><td>{log.date ?? ''}</td><td>{log.weight ?? '–'}</td>
									<td>{log.waist ?? '–'}</td><td>{log.serum_am ?? '–'}</td><td>{log.serum_pm ?? '–'}</td>
									<td>{log.energy ?? '–'}</td><td>{log.hunger ?? '–'}</td><td>{log.sleep ?? '–'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.loading-state { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--muted); }
	.ud-wrap { padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; }
	.profile-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
	.btn-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); padding: 4px 0; margin-right: 16px; cursor: pointer; background: none; border: none; }
	.btn-back:hover { color: var(--ink); }
	.user-id { font-size: 12px; color: var(--muted); font-family: monospace; }
	.start-label { font-size: 12px; color: var(--muted); }
	.edit-fields { background: var(--card); border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.ef-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 12px; }
	.ef-group label { font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em; }
	.ef-group input, .ef-group select { width: 100%; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; font-size: 13px; }
	.ef-group input:focus, .ef-group select:focus { border-color: var(--gold); outline: none; }
	.ud-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
	.ud-stat { background: var(--card); border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.ud-stat .label { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin-bottom: 4px; }
	.ud-stat .value { font-family: var(--serif); font-size: 22px; font-weight: 500; }
	.ud-stat .sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
	.ud-charts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
	.ud-chart-card { background: var(--card); border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.ud-chart-card h3 { font-family: var(--serif); font-size: 15px; font-weight: 500; margin-bottom: 12px; }
	.ud-chart-card canvas { width: 100% !important; max-height: 240px; }
	.ud-logs { background: var(--card); border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); overflow: hidden; }
	.ud-export { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 20px 0; }
	.ud-tabs { display: flex; gap: 0; border-bottom: 2px solid var(--line); padding: 0 20px; }
	.ud-tab { padding: 10px 16px; font-size: 13px; font-weight: 500; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -2px; cursor: pointer; background: none; border-top: none; border-left: none; border-right: none; }
	.ud-tab:hover { color: var(--ink); }
	.ud-tab.active { color: var(--gold); border-bottom-color: var(--gold); }
	.ud-log-scroll { max-height: 500px; overflow-y: auto; }
	.ud-logs table { border-radius: 0; box-shadow: none; width: 100%; border-collapse: separate; border-spacing: 0; background: var(--card); }
	.ud-logs :global(thead th) { background: #f5f2ec; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); font-weight: 600; white-space: nowrap; border-bottom: 2px solid var(--line); position: sticky; top: 0; z-index: 2; }
	.ud-logs :global(tbody td) { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid var(--line-soft); }
	.ud-note { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: help; }
	.ud-meals { font-size: 12px; color: var(--ink-soft); line-height: 1.5; }
	.ud-meal-item { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; }
	.ud-meal-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.ud-meal-kcal { color: var(--muted); white-space: nowrap; }
	.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn-primary:disabled { opacity: .4; cursor: default; }
	.btn-secondary { background: var(--line); color: var(--ink-soft); }
	.btn-danger { background: #A13024; color: #fff; }
	.btn-outline { border: 1px solid var(--line); color: var(--ink-soft); background: transparent; }
	.btn:hover:not(:disabled) { opacity: .85; }
	@media (max-width: 900px) { .ud-charts { grid-template-columns: 1fr; } }
	@media (max-width: 600px) { .ud-stats { grid-template-columns: 1fr 1fr; } }
</style>
