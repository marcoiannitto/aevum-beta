<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { token, pid, isProgram, loadStoredProfile, saveProfile } from '$lib/stores/auth';
	import { api, GOOGLE_CLIENT_ID } from '$lib/api/client';
	import { actLabels, actFactors } from '$lib/stores/config';
	import { programs, loadPrograms } from '$lib/stores/programs';
	import type { UserProfile } from '$lib/stores/auth';

	let view = $state<'main' | 'token' | 'free'>('main');
	let error = $state('');
	let loading = $state(false);

	// Token login
	let tokenInput = $state('');

	// Free user registration
	let freeName = $state('');
	let freeSex = $state('M');
	let freeDob = $state('');
	let freeHeight = $state('');
	let freeWeight = $state('');
	let freeAct = $state('1.55');

	let googleLoaded = $state(false);

	onMount(() => {
		// Already logged in?
		if ($token && $pid) {
			goto('/');
			return;
		}

		// Check for Google OAuth redirect (id_token in URL hash)
		const hash = location.hash;
		if (hash?.includes('id_token=')) {
			const params = new URLSearchParams(hash.substring(1));
			const idToken = params.get('id_token');
			if (idToken) {
				history.replaceState(null, '', location.pathname + location.search);
				handleGoogleResponse(idToken);
				return;
			}
		}

		// Load programs list (no auth needed) for #54 locked picker
		loadPrograms();

		// Load Google Identity Services
		loadGoogleScript();
	});

	function loadGoogleScript() {
		if (!GOOGLE_CLIENT_ID) return;
		if (document.getElementById('gsi-script')) {
			initGoogleButton();
			return;
		}
		const s = document.createElement('script');
		s.id = 'gsi-script';
		s.src = 'https://accounts.google.com/gsi/client';
		s.onload = () => initGoogleButton();
		document.head.appendChild(s);
	}

	function initGoogleButton() {
		if (!window.google?.accounts?.id) return;
		googleLoaded = true;
		google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: (resp: { credential: string }) => handleGoogleResponse(resp.credential)
		});

		// Render the button after the DOM element exists
		requestAnimationFrame(() => {
			const wrap = document.getElementById('g-btn-wrap');
			if (wrap) {
				google.accounts.id.renderButton(wrap, {
					type: 'standard',
					theme: 'outline',
					size: 'large',
					width: 320,
					text: 'continue_with',
					shape: 'pill'
				});
			}
		});
	}

	async function handleGoogleResponse(idToken: string) {
		error = '';
		loading = true;
		try {
			const d = await api<{
				token: string;
				id: string;
				needs_profile?: boolean;
				error?: string;
			}>('auth_google', { id_token: idToken });

			if (d.error) {
				error = d.error;
				loading = false;
				return;
			}

			$token = d.token;
			$pid = d.id;

			if (d.needs_profile) {
				// New Google user → show free registration form
				isProgram.set(false);
				view = 'free';
				loading = false;
				return;
			}

			await loginAndBoot();
		} catch (e: unknown) {
			error = (e as Error).message || 'Connection error';
			loading = false;
		}
	}

	async function handleTokenLogin() {
		const tok = tokenInput.trim();
		if (!tok) { error = 'Paste your token above'; return; }

		error = '';
		loading = true;

		try {
			$token = tok;
			const d = await api<{
				id: string;
				program?: boolean;
				error?: string;
			}>('login', { token: tok });

			if (d.error) {
				$token = null;
				error = d.error;
				loading = false;
				return;
			}

			$pid = d.id;
			if (d.program === false) isProgram.set(false);

			await loginAndBoot();
		} catch (e: unknown) {
			$token = null;
			error = (e as Error).message || 'Connection error';
			loading = false;
		}
	}

	async function handleFreeRegister() {
		if (!freeName.trim() || !freeDob || !freeHeight || !freeWeight) {
			error = 'Fill all fields';
			return;
		}

		error = '';
		loading = true;

		try {
			const d = await api<{
				token?: string;
				id?: string;
				ok?: boolean;
				error?: string;
			}>('register', {
				name: freeName.trim(),
				sex: freeSex,
				dob: freeDob,
				height: +freeHeight,
				weight: +freeWeight,
				act: freeAct
			});

			if (d.error) { error = d.error; loading = false; return; }

			if (d.token) $token = d.token;
			if (d.id) $pid = d.id;

			isProgram.set(false);

			// Fetch server-normalized profile (correct sex case, activity factor, etc.)
			try {
				const p = await api<{ profile: UserProfile }>('profile', {}, { contentType: 'text/plain;charset=utf-8' });
				if (p?.profile) {
					saveProfile({ ...p.profile, program: false });
				}
			} catch {
				// Fallback: build profile from register response + form inputs
				saveProfile({
					id: d.id!, name: freeName.trim(), sex: d.sex ?? freeSex,
					act: d.act ?? +freeAct, dob: freeDob, height: +freeHeight,
					start_weight: +freeWeight, program: false
				} as UserProfile);
			}

			goto('/');
		} catch (e: unknown) {
			error = (e as Error).message || 'Connection error';
			loading = false;
		}
	}

	async function loginAndBoot() {
		// Try loading local profile
		let prof = loadStoredProfile();
		if (!prof) {
			// Fetch from server
			try {
				const d = await api<{ profile: UserProfile }>('profile', {}, { contentType: 'text/plain;charset=utf-8' });
				if (d?.profile) {
					prof = d.profile;
					if (prof.program === false) isProgram.set(false);
					saveProfile(prof);
				}
			} catch { /* noop */ }
		}
		goto('/');
	}

	function onTokenKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleTokenLogin();
	}
</script>

<svelte:head>
	<title>AEVUM — Sign in</title>
</svelte:head>

<div class="login-screen">
	<div class="login-card">
		<h1 class="brand">AEVUM</h1>
		<p class="tagline">Your metabolic reset, tracked.</p>

		{#if error}
			<p class="err">{error}</p>
		{/if}

		{#if view === 'main'}
			<!-- Google Sign-In -->
			<div id="g-btn-wrap" class="g-wrap"></div>

			{#if !googleLoaded}
				<button class="btn-outline" disabled>Loading Google Sign-In…</button>
			{/if}

			<div class="divider"><span>or</span></div>

			<button class="btn-outline" onclick={() => { view = 'token'; error = ''; }}>
				Sign in with token
			</button>

			<button class="btn-link" onclick={() => { view = 'free'; error = ''; }}>
				Track without a program →
			</button>

		{:else if view === 'token'}
			<label class="field">
				<span>Your access token</span>
				<input
					type="text"
					bind:value={tokenInput}
					placeholder="Paste token here"
					onkeydown={onTokenKeydown}
					autocomplete="off"
				/>
			</label>

			<button class="btn-primary" onclick={handleTokenLogin} disabled={loading}>
				{loading ? 'Checking…' : 'Log in'}
			</button>

			<button class="btn-link" onclick={() => { view = 'main'; error = ''; }}>
				← Back
			</button>

		{:else if view === 'free'}
			<p class="sub">Quick setup — no program needed</p>

			<label class="field">
				<span>Name</span>
				<input type="text" bind:value={freeName} placeholder="Your name" />
			</label>

			<div class="row">
				<label class="field half">
					<span>Sex</span>
					<select bind:value={freeSex}>
						<option value="M">Male</option>
						<option value="F">Female</option>
					</select>
				</label>
				<label class="field half">
					<span>Date of birth</span>
					<input type="date" bind:value={freeDob} />
				</label>
			</div>

			<div class="row">
				<label class="field half">
					<span>Height (cm)</span>
					<input type="number" bind:value={freeHeight} placeholder="175" />
				</label>
				<label class="field half">
					<span>Weight (kg)</span>
					<input type="number" bind:value={freeWeight} placeholder="80" />
				</label>
			</div>

			<label class="field">
				<span>Activity level</span>
				<select bind:value={freeAct}>
					{#each actLabels() as label, i}
						<option value={String(actFactors()[i])}>{label}</option>
					{/each}
				</select>
			</label>

			<!-- #54: Locked program picker — show available programs as disabled -->
			{#if $programs.length > 0}
				<div class="prog-locked-section">
					<span class="prog-locked-label">Programs — available with a subscription</span>
					<div class="prog-locked-list">
						{#each $programs as prog}
							<div class="prog-locked-card" style="border-left: 3px solid {prog.color}">
								<span class="prog-locked-name">{prog.name}</span>
								{#if prog.description}
									<span class="prog-locked-desc">{prog.description}</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<button class="btn-primary" onclick={handleFreeRegister} disabled={loading}>
				{loading ? 'Setting up…' : 'Start tracking'}
			</button>

			<button class="btn-link" onclick={() => { view = 'main'; error = ''; }}>
				← Back
			</button>
		{/if}
	</div>
</div>

<style>
	.login-screen {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		padding: 24px 16px;
		background: var(--paper);
	}
	.login-card {
		width: 100%;
		max-width: 380px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}
	.brand {
		font-family: var(--serif);
		font-size: 2rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: var(--ink);
		margin: 0;
	}
	.tagline {
		font-size: 0.9rem;
		color: var(--muted);
		margin: -8px 0 8px;
	}
	.sub {
		font-size: 0.85rem;
		color: var(--muted);
		margin: 0;
	}
	.err {
		background: #fef2f2;
		color: #a13024;
		padding: 8px 12px;
		border-radius: 8px;
		font-size: 0.85rem;
		width: 100%;
		text-align: center;
		margin: 0;
	}
	.g-wrap {
		width: 100%;
		max-width: 320px;
		display: flex;
		justify-content: center;
	}
	.divider {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--muted);
		font-size: 0.8rem;
	}
	.divider::before, .divider::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--line);
	}
	.field {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.85rem;
		color: var(--muted);
	}
	.field input, .field select {
		padding: 10px 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 1rem;
		background: #fff;
		color: var(--ink);
		font-family: inherit;
	}
	.field input:focus, .field select:focus {
		outline: none;
		border-color: var(--gold);
	}
	.row {
		width: 100%;
		display: flex;
		gap: 12px;
	}
	.half {
		flex: 1;
	}
	.btn-primary {
		width: 100%;
		padding: 12px;
		border: none;
		border-radius: 8px;
		background: var(--gold);
		color: #fff;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
	}
	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.btn-outline {
		width: 100%;
		max-width: 320px;
		padding: 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: #fff;
		color: var(--ink);
		font-size: 0.95rem;
		cursor: pointer;
		font-family: inherit;
	}
	.btn-outline:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-link {
		background: none;
		border: none;
		color: var(--gold);
		font-size: 0.85rem;
		cursor: pointer;
		padding: 4px;
		font-family: inherit;
	}
	/* #54: Locked program cards */
	.prog-locked-section {
		width: 100%;
		margin: 4px 0;
	}
	.prog-locked-label {
		display: block;
		font-size: 0.75rem;
		color: var(--muted);
		margin-bottom: 6px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.prog-locked-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.prog-locked-card {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 12px;
		background: #f5f5f5;
		border-radius: 8px;
		opacity: 0.55;
	}
	.prog-locked-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--ink);
	}
	.prog-locked-desc {
		font-size: 0.78rem;
		color: var(--muted);
	}
</style>
