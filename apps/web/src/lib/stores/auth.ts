/**
 * Auth store — matches existing localStorage keys from index.html
 *
 * Token key:   aevum_auth_token
 * Profile key: aevum_{pid}_profile
 * Last ID key: aevum_last_id
 */
import { writable, derived, get } from 'svelte/store';

const AUTH_KEY = 'aevum_auth_token';
const LAST_ID_KEY = 'aevum_last_id';

function safeGet(key: string): string | null {
	if (typeof window === 'undefined') return null;
	try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, val: string | null) {
	if (typeof window === 'undefined') return;
	try {
		if (val === null) localStorage.removeItem(key);
		else localStorage.setItem(key, val);
	} catch { /* noop */ }
}

/** Scoped localStorage key: aevum_{pid}_{suffix} */
export function K(pid: string, suffix: string): string {
	return `aevum_${pid}_${suffix}`;
}

// --- Stores ---

export const token = writable<string | null>(safeGet(AUTH_KEY));
export const pid = writable<string>(safeGet(LAST_ID_KEY) ?? '');
export const isProgram = writable<boolean>(true);

export interface UserProfile {
	name: string;
	sex: string;
	dob?: string;
	age?: number;
	height: number;
	weight: number;
	act: string;
	need?: number;
	target_kg?: number | null;
	start_date?: string;
	activation_days?: number;
	loading_days?: number;
	transition_days?: number;
	stabilization_days?: number;
	stab_target_weight?: number;
	maint_target_weight?: number;
	current_target_kcal?: number;
	prev_target_kcal?: number;
	last_review_date?: string;
	last_change_reason?: string;
	maintenance_mode?: string;
	maintenance_diet?: string;
	phase_mode?: string;
	program?: boolean;
	coach_whatsapp?: string;
	[key: string]: unknown;
}

export const profile = writable<UserProfile | null>(null);

// Persist token
token.subscribe((val) => safeSet(AUTH_KEY, val));

// Persist pid
pid.subscribe((val) => {
	if (val) safeSet(LAST_ID_KEY, val);
});

// Load profile from scoped localStorage
export function loadStoredProfile(): UserProfile | null {
	const id = get(pid);
	if (!id) return null;
	const raw = safeGet(K(id, 'profile'));
	if (!raw) return null;
	try {
		const p = JSON.parse(raw) as UserProfile;
		if (p.program === false) isProgram.set(false);
		profile.set(p);
		return p;
	} catch { return null; }
}

// Save profile to scoped localStorage
export function saveProfile(p: UserProfile) {
	const id = get(pid);
	if (!id) return;
	profile.set(p);
	if (p.program === false) isProgram.set(false);
	else if (p.program === true) isProgram.set(true);
	safeSet(K(id, 'profile'), JSON.stringify(p));
}

export const isLoggedIn = derived(token, ($t) => !!$t);

export function logout() {
	// resetAllStores is in reset.ts to avoid circular deps.
	// Callers should import { resetAllStores } from './reset' and call it before logout(),
	// or use the combined logoutAndReset() from reset.ts.
	token.set(null);
	profile.set(null);
	pid.set('');
}
