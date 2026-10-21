<!--
  Profile Panel — slide-in side panel with view/edit mode,
  programs, reports, help docs, legal links, logout.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { profile, pid, isProgram, saveProfile, type UserProfile } from '$lib/stores/auth';
	import { logoutAndReset } from '$lib/stores/reset';
	import { api } from '$lib/api/client';
	import { actLabels, actFactors } from '$lib/stores/config';

	let {
		open = false,
		onClose
	}: {
		open: boolean;
		onClose: () => void;
	} = $props();

	let editing = $state(false);

	// Edit fields
	let editName = $state('');
	let editSex = $state('');
	let editDob = $state('');
	let editHeight = $state('');
	let editTarget = $state('');
	let editAct = $state('');
	let saving = $state(false);

	const APP_VERSION = 'v3.1.0';

	function startEdit() {
		const p = get(profile);
		if (!p) return;
		editName = p.name || '';
		editSex = p.sex || 'M';
		editDob = p.dob || '';
		editHeight = String(p.height || '');
		editTarget = String(p.target_kg ?? '');
		editAct = p.act || 'moderate';
		editing = true;
	}

	function cancelEdit() {
		editing = false;
	}

	async function saveEdit() {
		saving = true;
		const fields: Record<string, unknown> = {
			name: editName,
			sex: editSex,
			dob: editDob,
			height: +editHeight,
			target_kg: editTarget ? +editTarget : null,
			act: editAct
		};
		try {
			const resp = await api<{ user?: Record<string, unknown> }>('update_profile', fields);
			const p = get(profile);
			if (p) {
				// Merge server-recalculated values (e.g. current_target_kcal) over local fields (fix #34)
				const serverFields = resp?.user ?? {};
				saveProfile({ ...p, ...fields, ...serverFields } as UserProfile);
			}
			editing = false;
		} catch { /* noop */ }
		saving = false;
	}

	function calcAge(dob: string): number | null {
		if (!dob) return null;
		const d = new Date(dob);
		const diff = Date.now() - d.getTime();
		return Math.floor(diff / 31557600000);
	}

	/** Map stored activity value (numeric factor or string label) to display label */
	function activityLabel(act: string | number | undefined): string {
		if (!act) return '—';
		const labels = actLabels();
		const factors = actFactors();
		// If stored as string label, find it directly
		const str = String(act).toLowerCase();
		const labelIdx = labels.findIndex(l => l.toLowerCase() === str);
		if (labelIdx >= 0) return labels[labelIdx];
		// If stored as numeric factor, find closest match
		const n = parseFloat(String(act));
		if (!isNaN(n)) {
			let best = 0;
			for (let i = 1; i < factors.length; i++) {
				if (Math.abs(factors[i] - n) < Math.abs(factors[best] - n)) best = i;
			}
			return labels[best] || String(act);
		}
		return String(act);
	}

	function doLogout() {
		logoutAndReset();
		onClose();
		goto('/login');
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="scrim" onclick={onClose}></div>

	<aside class="panel" role="dialog" aria-modal="true" aria-label="Profile">
		<div class="panel-scroll">
			{#if $profile}
				<!-- Header -->
				<div class="prof-head">
					<h2 class="prof-name">{$profile.name || 'User'}</h2>
					<p class="prof-sub">{$isProgram ? 'Program member' : 'Free tracker'}</p>
				</div>

				<!-- Stats -->
				{#if !editing}
					<div class="prof-stats">
						<div class="stat-row"><span class="stat-label">Sex</span><span class="stat-val">{$profile.sex || '—'}</span></div>
						{#if $profile.dob}
							<div class="stat-row"><span class="stat-label">DOB</span><span class="stat-val">{$profile.dob}</span></div>
							<div class="stat-row"><span class="stat-label">Age</span><span class="stat-val">{calcAge($profile.dob) ?? '—'}</span></div>
						{:else if $profile.age}
							<div class="stat-row"><span class="stat-label">Age</span><span class="stat-val">{$profile.age}</span></div>
						{/if}
						<div class="stat-row"><span class="stat-label">Height</span><span class="stat-val">{$profile.height} cm</span></div>
						<div class="stat-row"><span class="stat-label">Start weight</span><span class="stat-val">{$profile.weight} kg</span></div>
						{#if $profile.target_kg}
							<div class="stat-row"><span class="stat-label">Target</span><span class="stat-val">{$profile.target_kg} kg</span></div>
						{/if}
						<div class="stat-row"><span class="stat-label">Activity</span><span class="stat-val">{activityLabel($profile.act)}</span></div>
					</div>

					<button class="btn-edit" onclick={startEdit}>Edit profile</button>
				{:else}
					<!-- Edit mode -->
					<div class="edit-form">
						<label class="field"><span>Name</span><input type="text" bind:value={editName} /></label>
						<label class="field"><span>Sex</span>
							<select bind:value={editSex}><option value="M">Male</option><option value="F">Female</option></select>
						</label>
						<label class="field"><span>Date of birth</span><input type="date" bind:value={editDob} /></label>
						<label class="field"><span>Height (cm)</span><input type="number" bind:value={editHeight} /></label>
						<label class="field"><span>Target weight (kg)</span><input type="number" bind:value={editTarget} /></label>
						<label class="field"><span>Activity level</span>
							<select bind:value={editAct}>
								{#each actLabels() as label, i}
									<option value={String(actFactors()[i])}>{label}</option>
								{/each}
							</select>
						</label>
						<div class="edit-actions">
							<button class="btn-save" onclick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
							<button class="btn-cancel" onclick={cancelEdit}>Cancel</button>
						</div>
					</div>
				{/if}

				<!-- Coach -->
				{#if $profile.coach_whatsapp}
					<div class="section">
						<h3>Coach</h3>
						<a class="link-row" href="https://wa.me/{$profile.coach_whatsapp}" target="_blank" rel="noopener">
							Chat on WhatsApp →
						</a>
					</div>
				{/if}

				<!-- Help docs -->
				<div class="section">
					<h3>Help</h3>
					<a class="link-row" href="/health-disclaimer">Health disclaimer</a>
					<a class="link-row" href="/privacy">Privacy policy</a>
					<a class="link-row" href="/terms">Terms of service</a>
				</div>

				<!-- Version + logout -->
				<div class="section footer">
					<span class="version">{APP_VERSION}</span>
					<button class="btn-logout" onclick={doLogout}>Log out</button>
				</div>
			{/if}
		</div>

		<button class="close-x" onclick={onClose} aria-label="Close panel">✕</button>
	</aside>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		z-index: 950;
		animation: fadeIn 0.2s ease;
	}
	.panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(340px, 85vw);
		background: var(--card);
		z-index: 951;
		animation: slideIn 0.25s ease;
		display: flex;
		flex-direction: column;
	}
	.panel-scroll {
		flex: 1;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		padding: 48px 20px 24px;
	}
	.close-x {
		position: absolute;
		top: 12px;
		right: 14px;
		font-size: 1.1rem;
		color: var(--muted);
		padding: 4px 8px;
	}
	.prof-head {
		margin-bottom: 20px;
	}
	.prof-name {
		font-family: var(--serif);
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
	}
	.prof-sub {
		font-size: 0.82rem;
		color: var(--muted);
		margin: 2px 0 0;
	}
	.prof-stats {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 16px;
	}
	.stat-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.88rem;
		padding: 4px 0;
		border-bottom: 1px solid var(--line-soft);
	}
	.stat-label { color: var(--muted); }
	.stat-val { font-weight: 500; }
	.btn-edit {
		width: 100%;
		padding: 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.88rem;
		color: var(--ink);
		margin-bottom: 20px;
	}
	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 0.82rem;
		color: var(--muted);
	}
	.field input, .field select {
		padding: 8px 10px;
		border: 1px solid var(--line);
		border-radius: 6px;
		font-size: 0.92rem;
		background: #fff;
		color: var(--ink);
	}
	.field input:focus, .field select:focus {
		outline: none;
		border-color: var(--gold);
	}
	.edit-actions {
		display: flex;
		gap: 10px;
	}
	.btn-save {
		flex: 1;
		padding: 10px;
		background: var(--gold);
		color: #fff;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.9rem;
	}
	.btn-save:disabled { opacity: 0.5; }
	.btn-cancel {
		flex: 1;
		padding: 10px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 0.9rem;
		color: var(--muted);
	}
	.section {
		border-top: 1px solid var(--line-soft);
		padding-top: 16px;
		margin-top: 16px;
	}
	.section h3 {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		margin-bottom: 8px;
	}
	.link-row {
		display: block;
		padding: 8px 0;
		font-size: 0.88rem;
		color: var(--ink);
		text-decoration: none;
	}
	.link-row:hover { color: var(--gold); }
	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.version {
		font-size: 0.78rem;
		color: var(--muted);
	}
	.btn-logout {
		font-size: 0.88rem;
		color: var(--over);
		padding: 6px 12px;
		border: 1px solid var(--over);
		border-radius: 6px;
	}
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes slideIn {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}
</style>
