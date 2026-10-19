<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';

	let { intake = null, onDone, onCancel }: {
		intake?: Record<string, unknown> | null;
		onDone: () => void;
		onCancel: () => void;
	} = $props();

	let saving = $state(false);
	let fullName = $state('');
	let email = $state('');
	let phone = $state('');
	let dob = $state('');
	let weight = $state('');
	let height = $state('');
	let address = $state('');
	let postalCode = $state('');
	let referral = $state('');
	let goals = $state('');

	// Populate if editing
	import { onMount } from 'svelte';
	onMount(() => {
		if (intake) {
			fullName = String(intake.full_name ?? '');
			email = String(intake.email ?? '');
			phone = String(intake.phone ?? '');
			dob = String(intake.dob ?? '');
			weight = String(intake.weight ?? '');
			height = String(intake.height ?? '');
			address = String(intake.address ?? '');
			postalCode = String(intake.postal_code ?? '');
			referral = String(intake.referral ?? '');
			goals = String(intake.goals ?? '');
		}
	});

	async function save() {
		if (!fullName || !email) { toast('Name and email required', true); return; }
		saving = true;
		try {
			const payload: Record<string, unknown> = {
				full_name: fullName, email, phone, dob,
				weight: weight ? +weight : undefined,
				height: height ? +height : undefined,
				address, postal_code: postalCode, referral, goals
			};
			if (intake?.id) {
				await adminApi('admin_intake_update', { id: intake.id, ...payload });
				toast('Intake updated');
			} else {
				await adminApi('admin_intake_create', payload);
				toast('Intake created');
			}
			onDone();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			saving = false;
		}
	}
</script>

<div class="intake-form">
	<div class="if-header">
		<h2>{intake ? 'Edit Intake' : 'New Intake'}</h2>
	</div>
	<div class="if-card">
		<div class="if-grid">
			<div class="if-group"><label>Full Name *</label><input type="text" bind:value={fullName} /></div>
			<div class="if-group"><label>Email *</label><input type="email" bind:value={email} /></div>
			<div class="if-group"><label>Phone</label><input type="text" bind:value={phone} /></div>
			<div class="if-group"><label>Date of Birth</label><input type="date" bind:value={dob} /></div>
			<div class="if-group"><label>Weight (kg)</label><input type="number" bind:value={weight} /></div>
			<div class="if-group"><label>Height (cm)</label><input type="number" bind:value={height} /></div>
			<div class="if-group if-full"><label>Address</label><input type="text" bind:value={address} /></div>
			<div class="if-group"><label>Postal Code</label><input type="text" bind:value={postalCode} /></div>
			<div class="if-group"><label>Referral</label><input type="text" bind:value={referral} /></div>
			<div class="if-group if-full"><label>Goals</label><textarea bind:value={goals} rows="3"></textarea></div>
		</div>
		<div class="if-actions">
			<button class="btn btn-primary" onclick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
			<button class="btn btn-outline" onclick={onCancel}>Cancel</button>
		</div>
	</div>
</div>

<style>
	.intake-form { padding: 20px 28px; }
	.if-header { margin-bottom: 16px; }
	.if-header h2 { font-family: var(--serif); font-size: 18px; }
	.if-card { background: var(--card); border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
	.if-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
	.if-full { grid-column: 1 / -1; }
	.if-group label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .04em; }
	.if-group input, .if-group textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; font-size: 14px; font-family: inherit; }
	.if-group input:focus, .if-group textarea:focus { border-color: var(--gold); outline: none; }
	.if-actions { display: flex; gap: 10px; margin-top: 20px; }
	.btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn-primary:disabled { opacity: .4; cursor: default; }
	.btn-outline { border: 1px solid var(--line); color: var(--ink-soft); background: transparent; }
	.btn:hover:not(:disabled) { opacity: .85; }
	@media (max-width: 600px) { .if-grid { grid-template-columns: 1fr; } }
</style>
