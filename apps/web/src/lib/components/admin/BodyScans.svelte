<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';
	import { onMount } from 'svelte';

	let { userId }: { userId: number } = $props();

	const SCAN_FIELDS: { key: string; label: string; type: string; options?: string[] }[] = [
		{ key: 'scan_date', label: 'Date', type: 'date' },
		{ key: 'scan_type', label: 'Type', type: 'select', options: ['InBody', 'BIA-ACC', 'Other'] },
		{ key: 'scan_height', label: 'Height (cm)', type: 'number' },
		{ key: 'scan_weight', label: 'Weight (kg)', type: 'number' },
		{ key: 'scan_bmi', label: 'BMI', type: 'number' },
		{ key: 'body_fat_pct', label: 'Body Fat %', type: 'number' },
		{ key: 'fat_mass', label: 'Fat Mass (kg)', type: 'number' },
		{ key: 'smm', label: 'SMM (kg)', type: 'number' },
		{ key: 'tbw', label: 'TBW (L)', type: 'number' },
		{ key: 'scan_bmr', label: 'BMR', type: 'number' },
		{ key: 'visceral_fat', label: 'Visceral Fat', type: 'number' },
		{ key: 'body_score', label: 'Body Score', type: 'number' }
	];

	const GOOD_DOWN = new Set(['body_fat_pct', 'fat_mass', 'visceral_fat', 'scan_bmi', 'scan_weight']);
	const NUMERIC_FIELDS = SCAN_FIELDS.filter(f => f.type === 'number');

	let scans = $state<Record<string, unknown>[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingId = $state<number | null>(null);

	// Form state
	let formData = $state<Record<string, string>>({});
	let refRanges = $state<Record<string, { min: string; max: string }>>({});
	let saving = $state(false);

	onMount(() => loadScans());

	async function loadScans() {
		loading = true;
		try {
			const res = await adminApi<{ rows: Record<string, unknown>[] }>('admin_scan_list', { user_id: userId });
			scans = res.rows || [];
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {};
		refRanges = {};
		for (const f of NUMERIC_FIELDS) refRanges[f.key] = { min: '', max: '' };
		editingId = null;
		showForm = false;
	}

	function openNew() {
		resetForm();
		showForm = true;
	}

	function openEdit(scan: Record<string, unknown>) {
		formData = {};
		for (const f of SCAN_FIELDS) formData[f.key] = String(scan[f.key] ?? '');
		editingId = scan.id as number;

		// Parse reference ranges
		refRanges = {};
		for (const f of NUMERIC_FIELDS) refRanges[f.key] = { min: '', max: '' };
		try {
			const ref = scan.reference_json ? (typeof scan.reference_json === 'string' ? JSON.parse(scan.reference_json) : scan.reference_json) as Record<string, { min?: number; max?: number }> : {};
			for (const [k, v] of Object.entries(ref)) {
				if (refRanges[k]) {
					refRanges[k] = { min: String(v.min ?? ''), max: String(v.max ?? '') };
				}
			}
		} catch { /* ignore */ }

		showForm = true;
	}

	async function saveScan() {
		if (!formData.scan_date) { toast('Date required', true); return; }
		saving = true;
		try {
			const payload: Record<string, unknown> = { user_id: userId };
			if (editingId) payload.id = editingId;
			for (const f of SCAN_FIELDS) {
				if (formData[f.key]) {
					payload[f.key] = f.type === 'number' ? +formData[f.key] : formData[f.key];
				}
			}
			// Build reference_json
			const ref: Record<string, { min?: number; max?: number }> = {};
			for (const f of NUMERIC_FIELDS) {
				const r = refRanges[f.key];
				if (r && (r.min || r.max)) {
					ref[f.key] = {};
					if (r.min) ref[f.key].min = +r.min;
					if (r.max) ref[f.key].max = +r.max;
				}
			}
			if (Object.keys(ref).length) payload.reference_json = JSON.stringify(ref);

			await adminApi('admin_scan_save', payload);
			toast(editingId ? 'Scan updated' : 'Scan saved');
			resetForm();
			await loadScans();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			saving = false;
		}
	}

	async function deleteScan(id: number) {
		if (!confirm('Delete this scan?')) return;
		try {
			await adminApi('admin_scan_delete', { id, user_id: userId });
			toast('Scan deleted');
			await loadScans();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	// Comparison table helpers
	function getRef(): Record<string, { min?: number; max?: number }> {
		if (!scans.length) return {};
		const latest = scans[scans.length - 1];
		try {
			const raw = latest.reference_json;
			return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, { min?: number; max?: number }> : {};
		} catch { return {}; }
	}

	function deltaColor(field: string, delta: number): string {
		if (delta === 0) return 'var(--muted)';
		const isGoodDown = GOOD_DOWN.has(field);
		if (delta < 0) return isGoodDown ? 'var(--green)' : 'var(--red)';
		return isGoodDown ? 'var(--red)' : 'var(--green)';
	}

	function outOfRange(val: number, ref: { min?: number; max?: number } | undefined): boolean {
		if (!ref) return false;
		if (ref.min !== undefined && val < ref.min) return true;
		if (ref.max !== undefined && val > ref.max) return true;
		return false;
	}
</script>

<div class="bs-wrap">
	<div class="bs-actions">
		<button class="btn btn-primary" onclick={openNew}>+ New Scan</button>
	</div>

	{#if showForm}
		<div class="bs-form">
			<h3>{editingId ? 'Edit Scan' : 'New Scan'}</h3>
			<div class="bs-grid">
				{#each SCAN_FIELDS as field}
					<div class="bs-group">
						<label>{field.label}</label>
						{#if field.type === 'select'}
							<select bind:value={formData[field.key]}>
								<option value="">—</option>
								{#each field.options ?? [] as opt}
									<option value={opt}>{opt}</option>
								{/each}
							</select>
						{:else}
							<input type={field.type} bind:value={formData[field.key]} />
						{/if}
					</div>
				{/each}
			</div>

			<h4>Reference Ranges</h4>
			<div class="bs-grid">
				{#each NUMERIC_FIELDS as field}
					<div class="bs-ref-group">
						<label>{field.label}</label>
						<div class="ref-inputs">
							<input type="number" placeholder="Min" bind:value={refRanges[field.key].min} />
							<span>–</span>
							<input type="number" placeholder="Max" bind:value={refRanges[field.key].max} />
						</div>
					</div>
				{/each}
			</div>

			<div class="bs-form-actions">
				<button class="btn btn-primary" onclick={saveScan} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
				<button class="btn btn-outline" onclick={resetForm}>Cancel</button>
			</div>
		</div>
	{/if}

	{#if loading}
		<div class="loading-state">Loading scans...</div>
	{:else if scans.length}
		{@const ref = getRef()}
		<div class="bs-comparison">
			<h3>Scan Comparison</h3>
			<div class="bs-table-scroll">
				<table>
					<thead>
						<tr>
							<th>Field</th>
							{#each scans as scan}
								<th>
									{scan.scan_date ?? '—'}
									<br /><span class="scan-type">{scan.scan_type ?? ''}</span>
								</th>
							{/each}
							<th>Reference</th>
							{#if scans.length >= 2}
								<th>Δ (last 2)</th>
							{/if}
						</tr>
					</thead>
					<tbody>
						{#each NUMERIC_FIELDS as field}
							<tr>
								<td class="field-label">{field.label}</td>
								{#each scans as scan}
									{@const val = scan[field.key] as number}
									<td class:out-of-range={val != null && outOfRange(val, ref[field.key])}>
										{val ?? '–'}
									</td>
								{/each}
								<td class="ref-cell">
									{#if ref[field.key]}
										{ref[field.key].min ?? '–'} – {ref[field.key].max ?? '–'}
									{:else}
										–
									{/if}
								</td>
								{#if scans.length >= 2}
									{@const prev = scans[scans.length - 2][field.key] as number}
									{@const curr = scans[scans.length - 1][field.key] as number}
									{@const delta = (curr != null && prev != null) ? Math.round((curr - prev) * 100) / 100 : 0}
									<td class="delta-cell" style="color:{deltaColor(field.key, delta)}">
										{delta > 0 ? '+' : ''}{delta || '–'}
									</td>
								{/if}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="scan-actions-row">
				{#each scans as scan}
					<div class="scan-action-cell">
						<button class="btn btn-outline btn-xs" onclick={() => openEdit(scan)}>Edit</button>
						<button class="btn btn-danger btn-xs" onclick={() => deleteScan(scan.id as number)}>Delete</button>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="empty-state">No body scans yet</div>
	{/if}
</div>

<style>
	.bs-wrap { padding: 20px 28px; display: flex; flex-direction: column; gap: 16px; }
	.bs-actions { display: flex; gap: 8px; }
	.loading-state, .empty-state { color: var(--muted); padding: 40px; text-align: center; }

	/* Form */
	.bs-form { background: var(--card); border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.bs-form h3 { font-family: var(--serif); font-size: 16px; margin-bottom: 14px; }
	.bs-form h4 { font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin: 16px 0 10px; }
	.bs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
	.bs-group label, .bs-ref-group label { font-size: 11px; color: var(--muted); display: block; margin-bottom: 4px; }
	.bs-group input, .bs-group select { width: 100%; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; font-size: 13px; }
	.bs-group input:focus, .bs-group select:focus { border-color: var(--gold); outline: none; }
	.ref-inputs { display: flex; align-items: center; gap: 4px; }
	.ref-inputs input { width: 70px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 4px; font-size: 12px; }
	.ref-inputs span { color: var(--muted); font-size: 12px; }
	.bs-form-actions { display: flex; gap: 10px; margin-top: 16px; }

	/* Comparison table */
	.bs-comparison { background: var(--card); border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.bs-comparison h3 { font-family: var(--serif); font-size: 16px; margin-bottom: 14px; }
	.bs-table-scroll { overflow-x: auto; }
	table { width: 100%; border-collapse: separate; border-spacing: 0; }
	thead th { background: #f5f2ec; text-align: center; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); font-weight: 600; white-space: nowrap; border-bottom: 2px solid var(--line); }
	tbody td { padding: 8px 12px; border-bottom: 1px solid var(--line-soft); font-size: 13px; text-align: center; }
	.field-label { text-align: left !important; font-weight: 500; white-space: nowrap; }
	.out-of-range { color: var(--red) !important; font-weight: 600; }
	.ref-cell { color: var(--muted); font-size: 12px; }
	.delta-cell { font-weight: 600; }
	.scan-type { font-size: 10px; color: var(--muted); }
	.scan-actions-row { display: flex; gap: 8px; margin-top: 10px; justify-content: center; }
	.scan-action-cell { display: flex; gap: 4px; }

	.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; }
	.btn-xs { padding: 3px 8px; font-size: 11px; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn-primary:disabled { opacity: .4; cursor: default; }
	.btn-outline { border: 1px solid var(--line); color: var(--ink-soft); background: transparent; }
	.btn-danger { background: #A13024; color: #fff; }
	.btn:hover:not(:disabled) { opacity: .85; }
	@media (max-width: 600px) { .bs-grid { grid-template-columns: 1fr 1fr; } }
</style>
