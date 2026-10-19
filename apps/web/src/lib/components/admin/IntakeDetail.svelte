<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';
	import { onMount } from 'svelte';

	const INTAKE_LINK_BASE = 'https://app.niramaya.sg/intake.html?t=';

	let { intakeId, onBack, onEdit }: {
		intakeId: number;
		onBack: () => void;
		onEdit: (intake: Record<string, unknown>) => void;
	} = $props();

	let intake = $state<Record<string, unknown> | null>(null);
	let loading = $state(true);

	const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
		draft: { bg: '#f0ede5', color: '#6b665c' },
		sent: { bg: '#FFF3CD', color: '#856d00' },
		in_progress: { bg: '#D4EDFF', color: '#2a6496' },
		submitted: { bg: '#E8F2EF', color: '#2d6a4f' },
		review_required: { bg: '#FCE4EC', color: '#A13024' },
		approved: { bg: '#d4edda', color: '#155724' }
	};

	onMount(() => loadIntake());

	async function loadIntake() {
		loading = true;
		try {
			const res = await adminApi<Record<string, unknown>>('admin_intake_get', { id: intakeId });
			intake = res;
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			loading = false;
		}
	}

	function statusStyle(status: string) {
		const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
		return `background:${s.bg};color:${s.color}`;
	}

	async function setStatus(status: string) {
		try {
			await adminApi('admin_intake_status', { id: intakeId, status });
			toast('Status → ' + status);
			await loadIntake();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	async function copyLink() {
		if (!intake?.token) { toast('No token', true); return; }
		const url = INTAKE_LINK_BASE + intake.token;
		try {
			await navigator.clipboard.writeText(url);
			toast('Link copied');
		} catch {
			prompt('Copy this link:', url);
		}
	}

	async function resend() {
		try {
			await adminApi('admin_intake_resend', { id: intakeId });
			toast('Intake re-sent');
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	async function duplicate() {
		try {
			await adminApi('admin_intake_create', {
				full_name: intake?.full_name,
				email: intake?.email,
				phone: intake?.phone,
				dob: intake?.dob,
				weight: intake?.weight,
				height: intake?.height,
				address: intake?.address,
				postal_code: intake?.postal_code,
				referral: intake?.referral,
				goals: intake?.goals
			});
			toast('Intake duplicated');
			onBack();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	async function deleteIntake() {
		if (!confirm('Delete this intake?')) return;
		try {
			await adminApi('admin_intake_delete', { id: intakeId });
			toast('Intake deleted');
			onBack();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		}
	}

	function partAFields(): [string, unknown][] {
		if (!intake) return [];
		const skip = new Set(['id', 'token', 'status', 'created', 'updated', 'part_b', 'part_b_json']);
		return Object.entries(intake).filter(([k]) => !skip.has(k) && intake![k] != null);
	}

	function partBData(): Record<string, unknown> | null {
		if (!intake) return null;
		try {
			const raw = intake.part_b_json || intake.part_b;
			if (!raw) return null;
			return typeof raw === 'string' ? JSON.parse(raw) : raw as Record<string, unknown>;
		} catch { return null; }
	}
</script>

{#if loading}
	<div class="loading-state">Loading intake...</div>
{:else if intake}
	<div class="id-wrap">
		<!-- Status bar -->
		<div class="id-status-bar">
			<button class="btn-back" onclick={onBack}>← Back</button>
			<span class="status-badge" style={statusStyle(String(intake.status ?? 'draft'))}>
				{String(intake.status ?? 'draft').replace('_', ' ')}
			</span>
			<span class="id-label">#{intake.id}</span>
			<div style="flex:1"></div>
			<div class="id-actions">
				<button class="btn btn-outline btn-sm" onclick={copyLink} title="Copy intake link">🔗 Copy URL</button>
				{#if intake.status === 'draft'}
					<button class="btn btn-outline btn-sm" onclick={() => setStatus('sent')}>Mark Sent</button>
				{/if}
				{#if intake.status === 'submitted' || intake.status === 'review_required'}
					<button class="btn btn-primary btn-sm" onclick={() => setStatus('approved')}>✓ Approve</button>
				{/if}
				{#if intake.status !== 'draft'}
					<button class="btn btn-outline btn-sm" onclick={() => setStatus('draft')}>↩ Back to Draft</button>
				{/if}
				<button class="btn btn-outline btn-sm" onclick={() => onEdit(intake!)}>✎ Edit Part A</button>
				<button class="btn btn-outline btn-sm" onclick={resend}>↻ Re-send</button>
				<button class="btn btn-outline btn-sm" onclick={duplicate}>⊕ Duplicate</button>
				<button class="btn btn-danger btn-sm" onclick={deleteIntake}>Delete</button>
			</div>
		</div>

		<!-- Part A -->
		<div class="id-section">
			<h3>Part A — Admin Details</h3>
			<div class="id-fields">
				{#each partAFields() as [key, value]}
					<div class="id-field">
						<span class="id-field-label">{key.replace(/_/g, ' ')}</span>
						<span class="id-field-value">{value}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Part B -->
		{#if partBData()}
			{@const pb = partBData()!}
			<div class="id-section">
				<h3>Part B — Client Submission</h3>
				<div class="id-fields">
					{#each Object.entries(pb) as [key, value]}
						<div class="id-field">
							<span class="id-field-label">{key.replace(/_/g, ' ')}</span>
							<span class="id-field-value">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.loading-state { color: var(--muted); padding: 40px; text-align: center; }
	.id-wrap { padding: 20px 28px; display: flex; flex-direction: column; gap: 16px; }
	.id-status-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
	.btn-back { font-size: 13px; color: var(--muted); cursor: pointer; background: none; border: none; }
	.btn-back:hover { color: var(--ink); }
	.id-label { font-size: 12px; color: var(--muted); font-family: monospace; }
	.id-actions { display: flex; gap: 6px; flex-wrap: wrap; }
	.status-badge { display: inline-block; padding: 3px 12px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
	.id-section { background: var(--card); border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.id-section h3 { font-family: var(--serif); font-size: 15px; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid var(--line-soft); }
	.id-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
	.id-field { display: flex; flex-direction: column; gap: 2px; }
	.id-field-label { font-size: 11px; color: var(--muted); text-transform: capitalize; }
	.id-field-value { font-size: 13px; word-break: break-word; }
	.btn { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; border: none; cursor: pointer; }
	.btn-sm { padding: 5px 10px; font-size: 11px; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn-outline { border: 1px solid var(--line); color: var(--ink-soft); background: transparent; }
	.btn-danger { background: #A13024; color: #fff; }
	.btn:hover { opacity: .85; }
	@media (max-width: 600px) { .id-fields { grid-template-columns: 1fr; } .id-actions { width: 100%; } }
</style>
