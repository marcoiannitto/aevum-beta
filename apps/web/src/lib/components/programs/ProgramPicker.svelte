<!--
  Program Picker — bottom sheet to switch between programs.
  Shows program cards with color accent, name, description, radio selection.
-->
<script lang="ts">
	import { get } from 'svelte/store';
	import Sheet from '$lib/components/ui/Sheet.svelte';
	import { profile, isProgram } from '$lib/stores/auth';
	import { programs, switchProgram, currentProgramId, loadPrograms } from '$lib/stores/programs';

	let {
		open = false,
		onClose
	}: {
		open: boolean;
		onClose: () => void;
	} = $props();

	let switching = $state('');
	let error = $state('');
	let loading = $state(false);

	// Load programs fresh every time picker opens
	$effect(() => {
		if (open) {
			loading = true;
			loadPrograms().finally(() => { loading = false; });
		}
	});

	async function pick(programId: string) {
		if (programId === currentProgramId()) return;
		error = '';

		// AEVUM gate: directed program, not self-service
		if (programId === 'aevum') {
			error = 'AEVUM is a directed program. Contact Marco to enroll.';
			return;
		}

		// Paid-only gate: all programs except "tracker" require paid subscription
		if (programId !== 'tracker' && !get(isProgram)) {
			error = 'This program requires a paid subscription.';
			return;
		}

		switching = programId;
		const result = await switchProgram(programId);
		switching = '';
		if (result.ok) {
			onClose();
		} else {
			error = result.error || 'Failed to switch program';
		}
	}
</script>

<Sheet {open} {onClose} title="Switch Program">
	{#if error}
		<div class="error">{error}</div>
	{/if}

	<div class="program-list">
		{#if loading && !$programs.length}
			<p class="loading-text">Loading programs…</p>
		{/if}
		{#each $programs as prog}
			{@const active = prog.id === currentProgramId()}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="prog-card"
				class:active
				class:switching={switching === prog.id}
				onclick={() => pick(prog.id)}
				style="--prog-color: {prog.color}"
			>
				<div class="prog-accent"></div>
				<div class="prog-body">
					<div class="prog-header">
						<span class="prog-name">{prog.name}</span>
						<span class="prog-radio">
							{#if switching === prog.id}
								<span class="spinner"></span>
							{:else if active}
								<span class="radio-fill"></span>
							{:else}
								<span class="radio-empty"></span>
							{/if}
						</span>
					</div>
					{#if prog.description}
						<p class="prog-desc">{prog.description}</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</Sheet>

<style>
	.loading-text {
		text-align: center;
		color: var(--muted);
		font-size: 0.88rem;
		padding: 20px 0;
	}
	.error {
		background: rgba(200, 60, 60, 0.1);
		color: var(--over);
		font-size: 0.82rem;
		padding: 8px 12px;
		border-radius: 8px;
		margin-bottom: 12px;
	}
	.program-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.prog-card {
		display: flex;
		border-radius: 12px;
		overflow: hidden;
		background: var(--paper);
		cursor: pointer;
		transition: box-shadow 0.15s ease, transform 0.1s ease;
		border: 1.5px solid transparent;
	}
	.prog-card:active {
		transform: scale(0.98);
	}
	.prog-card.active {
		border-color: var(--prog-color);
		box-shadow: 0 0 0 1px var(--prog-color);
	}
	.prog-accent {
		width: 5px;
		flex-shrink: 0;
		background: var(--prog-color);
	}
	.prog-body {
		flex: 1;
		padding: 14px 14px 14px 12px;
	}
	.prog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 4px;
	}
	.prog-name {
		font-family: var(--serif);
		font-weight: 600;
		font-size: 0.95rem;
		letter-spacing: 0.02em;
	}
	.prog-desc {
		font-size: 0.8rem;
		color: var(--muted);
		line-height: 1.4;
		margin: 0;
	}
	.prog-radio {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
	}
	.radio-fill {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid var(--prog-color);
		background: var(--prog-color);
		box-shadow: inset 0 0 0 3px var(--card);
	}
	.radio-empty {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid var(--line);
	}
	.spinner {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 2px solid var(--line);
		border-top-color: var(--prog-color);
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
