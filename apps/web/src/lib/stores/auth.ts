/**
 * Auth store
 * Manages JWT token and user session state.
 */
import { writable, derived } from 'svelte/store';

const TOKEN_KEY = 'aevum_token';
const PROFILE_KEY = 'aevum_profile';

function createAuthStore() {
	let storedToken: string | null = null;
	let storedProfile: Record<string, unknown> | null = null;

	if (typeof window !== 'undefined') {
		try {
			storedToken = localStorage.getItem(TOKEN_KEY);
			const raw = localStorage.getItem(PROFILE_KEY);
			if (raw) storedProfile = JSON.parse(raw);
		} catch {
			// SSR or storage unavailable
		}
	}

	const token = writable<string | null>(storedToken);
	const profile = writable<Record<string, unknown> | null>(storedProfile);

	// Persist token changes
	token.subscribe((val) => {
		if (typeof window === 'undefined') return;
		try {
			if (val) localStorage.setItem(TOKEN_KEY, val);
			else localStorage.removeItem(TOKEN_KEY);
		} catch { /* noop */ }
	});

	profile.subscribe((val) => {
		if (typeof window === 'undefined') return;
		try {
			if (val) localStorage.setItem(PROFILE_KEY, JSON.stringify(val));
			else localStorage.removeItem(PROFILE_KEY);
		} catch { /* noop */ }
	});

	function logout() {
		token.set(null);
		profile.set(null);
	}

	return { token, profile, logout };
}

export const auth = createAuthStore();
export const isLoggedIn = derived(auth.token, ($t) => !!$t);
