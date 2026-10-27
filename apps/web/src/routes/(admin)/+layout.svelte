<script lang="ts">
	import { onMount } from 'svelte';
	import { initAdmin, adminReady, adminLogin, adminLogout, adminApi } from '$lib/stores/admin';
	import Toast from '$lib/components/admin/Toast.svelte';

	let { children } = $props();
	let ready = $state(false);
	let showLogin = $state(false);
	let loginToken = $state('');
	let loginError = $state('');
	let checking = $state(true);

	onMount(async () => {
		const stored = sessionStorage.getItem('aevum_admin_token');
		if (stored) {
			const ok = await adminLogin(stored);
			if (ok) {
				ready = true;
			} else {
				adminLogout();
				showLogin = true;
			}
		} else {
			showLogin = true;
		}
		checking = false;
	});

	async function handleLogin() {
		loginError = '';
		if (!loginToken.trim()) { loginError = 'Token required'; return; }
		const ok = await adminLogin(loginToken.trim());
		if (ok) {
			ready = true;
			showLogin = false;
		} else {
			adminLogout();
			loginError = 'Invalid token';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleLogin();
	}
</script>

{#if checking}
	<div class="loading"><div class="spinner"></div></div>
{:else if showLogin}
	<div class="login-screen">
		<div class="login-card">
			<div class="login-brand">AEVUM</div>
			<div class="login-sub">ADMIN</div>
			<div class="login-field">
				<input
					type="password"
					bind:value={loginToken}
					placeholder="Admin token"
					onkeydown={handleKeydown}
					autofocus
				/>
			</div>
			{#if loginError}
				<div class="login-error">{loginError}</div>
			{/if}
			<button class="login-btn" onclick={handleLogin}>Sign in</button>
		</div>
	</div>
{:else if ready}
	{@render children()}
{/if}

<Toast />

<style>
	.loading { display: flex; align-items: center; justify-content: center; height: 100vh; background: #141311; }
	.spinner { width: 32px; height: 32px; border: 3px solid #2a2820; border-top-color: var(--gold, #B08D2E); border-radius: 50%; animation: spin .8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	.login-screen {
		display: flex; align-items: center; justify-content: center;
		height: 100vh; background: #141311;
	}
	.login-card {
		text-align: center; padding: 48px 40px; width: 340px;
	}
	.login-brand {
		font-family: var(--serif, 'Fraunces', serif);
		font-size: 28px; color: #fff; letter-spacing: .16em;
	}
	.login-sub {
		font-size: 10px; color: #B08D2E; letter-spacing: .24em;
		margin-top: 4px; margin-bottom: 40px;
	}
	.login-field input {
		width: 100%; padding: 14px 16px; border: 1px solid #2a2820;
		border-radius: 10px; background: #1e1d1a; color: #e9e5dc;
		font-size: 14px; text-align: center; letter-spacing: .04em;
	}
	.login-field input:focus { border-color: #B08D2E; outline: none; }
	.login-field input::placeholder { color: #6b665c; }
	.login-error {
		color: #e57373; font-size: 12px; margin-top: 10px;
	}
	.login-btn {
		margin-top: 20px; width: 100%; padding: 12px;
		background: #B08D2E; color: #141311; border: none;
		border-radius: 10px; font-size: 14px; font-weight: 600;
		cursor: pointer; letter-spacing: .04em;
	}
	.login-btn:hover { opacity: .9; }
</style>
