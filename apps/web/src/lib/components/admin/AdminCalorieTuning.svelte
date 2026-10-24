<!-- v.1.0.0 2026-10-24 — #68 Calorie tuning flat table across all programs -->
<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';

	interface PhaseRow {
		key: string;
		program_id: string;
		name: string;
		sort_order: number;
		calorie_mode: string;
		target_mode: string;
		calorie_cut: number;
		calorie_bank: number;
		bank_window: number;
		bank_clamp_lo: number;
		bank_clamp_hi: number;
		bank_grace_days: number;
		weekly_tolerance: number;
		ramp_from: number;
		ramp_days: number;
		[k: string]: unknown;
	}

	interface Program {
		id: string;
		name: string;
		color: string;
		is_active: number;
	}

	let phases = $state<PhaseRow[]>([]);
	let programs = $state<Program[]>([]);
	let loading = $state(true);
	let savingKey = $state<string | null>(null);
	let dirty = $state<Set<string>>(new Set());

	// Snapshot of original values for dirty detection
	let originals = $state<Map<string, string>>(new Map());

	$effect(() => { load(); });

	async function load() {
		loading = true;
		try {
			const [pRes, phRes] = await Promise.all([
				adminApi<{ programs: Program[] }>('admin_programs', { sub: 'list' }),
				adminApi<{ rows: PhaseRow[] }>('admin_list', { table: 'phases' }),
			]);
			programs = pRes.programs || [];
			phases = (phRes.rows || []).sort((a, b) => {
				if (a.program_id !== b.program_id) return a.program_id.localeCompare(b.program_id);
				return (a.sort_order || 0) - (b.sort_order || 0);
			});
			// Snapshot originals
			const snap = new Map<string, string>();
			for (const ph of phases) snap.set(ph.key, JSON.stringify(tuningFields(ph)));
			originals = snap;
			dirty = new Set();
		} catch (e: unknown) {
			toast('Error loading: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			loading = false;
		}
	}

	function tuningFields(ph: PhaseRow) {
		return {
			calorie_mode: ph.calorie_mode,
			target_mode: ph.target_mode,
			calorie_cut: ph.calorie_cut,
			calorie_bank: ph.calorie_bank,
			bank_window: ph.bank_window,
			bank_clamp_lo: ph.bank_clamp_lo,
			bank_clamp_hi: ph.bank_clamp_hi,
			bank_grace_days: ph.bank_grace_days,
			weekly_tolerance: ph.weekly_tolerance,
			ramp_from: ph.ramp_from,
			ramp_days: ph.ramp_days,
		};
	}

	function programFor(id: string): Program | undefined {
		return programs.find(p => p.id === id);
	}

	function markDirty(key: string) {
		const ph = phases.find(p => p.key === key);
		if (!ph) return;
		const cur = JSON.stringify(tuningFields(ph));
		const orig = originals.get(key);
		if (cur !== orig) {
			dirty = new Set([...dirty, key]);
		} else {
			const next = new Set(dirty);
			next.delete(key);
			dirty = next;
		}
	}

	async function savePhase(ph: PhaseRow) {
		savingKey = ph.key;
		try {
			const payload: Record<string, unknown> = { ...ph, _original_key: ph.key };
			const res = await adminApi<{ ok?: boolean; error?: string }>('admin_phase_save', payload);
			if (res.error) { toast(res.error, true); return; }
			toast(`${ph.key} saved`);
			// Update snapshot
			originals.set(ph.key, JSON.stringify(tuningFields(ph)));
			const next = new Set(dirty);
			next.delete(ph.key);
			dirty = next;
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			savingKey = null;
		}
	}

	function revertPhase(key: string) {
		const orig = originals.get(key);
		if (!orig) return;
		const vals = JSON.parse(orig);
		const ph = phases.find(p => p.key === key);
		if (!ph) return;
		Object.assign(ph, vals);
		const next = new Set(dirty);
		next.delete(key);
		dirty = next;
	}

	// Group phases by program
	let grouped = $derived((() => {
		const map = new Map<string, PhaseRow[]>();
		for (const ph of phases) {
			const pid = ph.program_id || 'none';
			if (!map.has(pid)) map.set(pid, []);
			map.get(pid)!.push(ph);
		}
		return map;
	})());
</script>

<div class="tuning">
	<div class="list-header">
		<h2>Calorie Tuning</h2>
		<span class="hint">Edit calorie strategy params across all programs</span>
	</div>

	{#if loading}
		<div class="loading">Loading...</div>
	{:else}
		{#each [...grouped.entries()] as [progId, progPhases]}
			{@const prog = programFor(progId)}
			<div class="prog-group">
				<div class="prog-label">
					{#if prog}
						<span class="color-dot" style="background:{prog.color}"></span>
						<strong>{prog.name}</strong>
						<span class="prog-id">{prog.id}</span>
						{#if !prog.is_active}<span class="inactive-badge">inactive</span>{/if}
					{:else}
						<strong>{progId}</strong>
					{/if}
				</div>

				<div class="phase-cards">
					{#each progPhases as ph (ph.key)}
						<div class="phase-card" class:is-dirty={dirty.has(ph.key)}>
							<div class="card-header">
								<span class="phase-key">{ph.key}</span>
								<span class="phase-name">{ph.name}</span>
								{#if dirty.has(ph.key)}
									<div class="card-actions">
										<button class="btn-xs btn-outline" onclick={() => revertPhase(ph.key)}>Revert</button>
										<button class="btn-xs btn-primary" onclick={() => savePhase(ph)} disabled={savingKey === ph.key}>
											{savingKey === ph.key ? 'Saving...' : 'Save'}
										</button>
									</div>
								{/if}
							</div>

							<div class="fields">
								<!-- Target mode -->
								<label>
									<span>Target mode</span>
									<select bind:value={ph.target_mode} onchange={() => markDirty(ph.key)}>
										<option value="tdee_mult">tdee_mult</option>
										<option value="ramp_then_hold">ramp_then_hold</option>
										<option value="fixed">fixed</option>
										<option value="none">none</option>
									</select>
								</label>

								<label>
									<span>Cal mode</span>
									<select bind:value={ph.calorie_mode} onchange={() => markDirty(ph.key)}>
										<option value="bar">bar</option>
										<option value="range">range</option>
										<option value="none">none</option>
									</select>
								</label>

								<label>
									<span>TDEE cut</span>
									<input type="number" step="0.01" bind:value={ph.calorie_cut} oninput={() => markDirty(ph.key)} />
								</label>

								{#if ph.target_mode === 'ramp_then_hold'}
									<label>
										<span>Ramp from</span>
										<input type="number" bind:value={ph.ramp_from} oninput={() => markDirty(ph.key)} />
									</label>
									<label>
										<span>Ramp days</span>
										<input type="number" bind:value={ph.ramp_days} oninput={() => markDirty(ph.key)} />
									</label>
								{/if}
							</div>

							<!-- Bank config -->
							<div class="bank-section">
								<label class="check">
									<input type="checkbox" checked={!!ph.calorie_bank}
										onchange={(e) => { ph.calorie_bank = (e.target as HTMLInputElement).checked ? 1 : 0; markDirty(ph.key); }} />
									<span class="check-label">Calorie bank</span>
								</label>

								{#if ph.calorie_bank}
									<div class="fields bank-fields">
										<label>
											<span>Window</span>
											<input type="number" bind:value={ph.bank_window} oninput={() => markDirty(ph.key)} />
										</label>
										<label>
											<span>Clamp lo</span>
											<input type="number" step="0.01" bind:value={ph.bank_clamp_lo} oninput={() => markDirty(ph.key)} />
										</label>
										<label>
											<span>Clamp hi</span>
											<input type="number" step="0.01" bind:value={ph.bank_clamp_hi} oninput={() => markDirty(ph.key)} />
										</label>
										<label>
											<span>Grace days</span>
											<input type="number" bind:value={ph.bank_grace_days} oninput={() => markDirty(ph.key)} />
										</label>
										<label>
											<span>Tolerance</span>
											<input type="number" step="0.01" bind:value={ph.weekly_tolerance} oninput={() => markDirty(ph.key)} />
										</label>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	.tuning { padding: 24px 28px; }
	.list-header { margin-bottom: 20px; }
	h2 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
	.hint { font-size: 12px; color: var(--muted); }

	.prog-group { margin-bottom: 28px; }
	.prog-label {
		display: flex; align-items: center; gap: 8px;
		margin-bottom: 12px; font-size: 14px;
	}
	.prog-label strong { font-weight: 600; }
	.prog-id { font-family: monospace; font-size: 11px; color: var(--muted); }
	.inactive-badge {
		font-size: 10px; padding: 2px 6px; border-radius: 6px;
		background: #f0ece4; color: var(--muted); text-transform: uppercase;
		letter-spacing: 0.04em; font-weight: 600;
	}

	.color-dot {
		display: inline-block; width: 12px; height: 12px;
		border-radius: 50%; flex-shrink: 0;
	}

	.phase-cards {
		display: flex; flex-direction: column; gap: 10px;
	}

	.phase-card {
		background: var(--card, #fff);
		border: 1px solid var(--line, #e5e0d5);
		border-radius: 10px;
		padding: 14px 16px;
		transition: border-color 0.15s;
	}
	.phase-card.is-dirty {
		border-color: var(--gold);
	}

	.card-header {
		display: flex; align-items: center; gap: 10px;
		margin-bottom: 10px;
	}
	.phase-key {
		font-family: monospace; font-size: 12px; color: var(--muted);
		background: #f0ece4; padding: 2px 7px; border-radius: 4px;
	}
	.phase-name { font-size: 13px; font-weight: 500; }
	.card-actions { margin-left: auto; display: flex; gap: 6px; }

	.fields {
		display: flex; gap: 10px; flex-wrap: wrap;
		margin-bottom: 8px;
	}
	.bank-fields { margin-top: 6px; }

	.fields label {
		display: flex; flex-direction: column; gap: 3px;
		min-width: 90px; flex: 1; max-width: 140px;
	}
	.fields label span {
		font-size: 10px; font-weight: 600; color: var(--muted);
		text-transform: uppercase; letter-spacing: 0.04em;
	}

	input[type="number"], select {
		padding: 5px 7px; border: 1px solid var(--line); border-radius: 5px;
		font-size: 13px; font-family: inherit; background: var(--bg, #fafafa);
		width: 100%; box-sizing: border-box;
	}
	input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--gold); }

	.bank-section { margin-top: 4px; }
	.check {
		display: flex; align-items: center; gap: 6px;
		font-size: 13px; cursor: pointer;
	}
	.check-label { font-size: 12px; font-weight: 500; color: var(--ink-soft); }

	.btn-xs {
		padding: 4px 10px; border-radius: 6px; font-size: 11px;
		font-weight: 500; border: none; cursor: pointer;
	}
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn-outline { border: 1px solid var(--line); color: var(--ink-soft); background: transparent; }
	.btn-xs:hover { opacity: .85; }
	.btn-xs:disabled { opacity: .5; cursor: not-allowed; }

	.loading { color: var(--muted); padding: 40px; text-align: center; font-size: 14px; }
</style>
