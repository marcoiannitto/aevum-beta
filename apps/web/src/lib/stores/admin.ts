/**
 * Admin dashboard store
 * Manages admin auth, active view, table data cache
 */
import { writable, get } from 'svelte/store';
import { api } from '$lib/api/client';

// ─── Auth ───
export const adminToken = writable<string | null>(null);
export const adminReady = writable(false);

export function initAdmin(): boolean {
	const saved = sessionStorage.getItem('aevum_admin_token');
	if (saved) {
		adminToken.set(saved);
		return true;
	}
	return false;
}

export async function adminLogin(tok: string): Promise<boolean> {
	try {
		await api('admin_users', {}, { token: tok });
		sessionStorage.setItem('aevum_admin_token', tok);
		adminToken.set(tok);
		adminReady.set(true);
		return true;
	} catch {
		return false;
	}
}

export function adminLogout() {
	sessionStorage.removeItem('aevum_admin_token');
	adminToken.set(null);
	adminReady.set(false);
	dataStore.set({});
}

// ─── API helper with admin token ───
export async function adminApi<T = unknown>(
	action: string,
	payload: Record<string, unknown> = {}
): Promise<T> {
	const tok = get(adminToken);
	return api<T>(action, payload, { token: tok });
}

// ─── Table definitions ───
export interface ColDef {
	key: string;
	label: string;
	type?: 'text' | 'number';
	w?: string;
}

export interface TableDef {
	cols: ColDef[];
	mode?: 'table' | 'cards' | 'users' | 'intakes';
	stickyCol?: boolean;
}

export const TABLES: Record<string, TableDef> = {
	rules: {
		cols: [
			{ key: 'phase', label: 'Phase', w: 'col-mid' },
			{ key: 'model', label: 'Model', w: 'col-mid' },
			{ key: 'metric', label: 'Metric', w: 'col-mid' },
			{ key: 'basis', label: 'Basis', w: 'col-narrow' },
			{ key: 'value', label: 'Value', w: 'col-narrow', type: 'number' },
			{ key: 'green_lo', label: 'Green Lo', w: 'col-narrow', type: 'number' },
			{ key: 'green_hi', label: 'Green Hi', w: 'col-narrow', type: 'number' },
			{ key: 'amber_lo', label: 'Amber Lo', w: 'col-narrow', type: 'number' },
			{ key: 'amber_hi', label: 'Amber Hi', w: 'col-narrow', type: 'number' },
			{ key: 'gated', label: 'Gated', w: 'col-narrow' },
			{ key: 'unit', label: 'Unit', w: 'col-narrow' }
		]
	},
	foods: {
		cols: [
			{ key: 'phase', label: 'Phase', w: 'col-mid' },
			{ key: 'category', label: 'Category', w: 'col-mid' },
			{ key: 'subcategory', label: 'Subcategory', w: 'col-mid' },
			{ key: 'item', label: 'Item', w: 'col-wide' },
			{ key: 'verdict', label: 'Verdict', w: 'col-narrow' },
			{ key: 'cap_g', label: 'Cap (g)', w: 'col-narrow', type: 'number' },
			{ key: 'note', label: 'Note', w: 'col-wide' }
		]
	},
	policy: {
		cols: [],
		mode: 'cards'
	},
	config: {
		cols: [
			{ key: 'key', label: 'Key', w: 'col-wide' },
			{ key: 'value', label: 'Value', w: 'col-wide' }
		]
	},
	messages: {
		cols: [
			{ key: 'id', label: 'ID', w: 'col-mid' },
			{ key: 'trigger', label: 'Trigger', w: 'col-mid' },
			{ key: 'enabled', label: 'Enabled', w: 'col-narrow' },
			{ key: 'phase', label: 'Phase', w: 'col-narrow' },
			{ key: 'priority', label: 'Pri', w: 'col-narrow', type: 'number' },
			{ key: 'title', label: 'Title', w: 'col-wide' },
			{ key: 'body', label: 'Body', w: 'col-wide' },
			{ key: 'badge', label: 'Badge', w: 'col-narrow' },
			{ key: 'frequency', label: 'Freq', w: 'col-mid' }
		]
	},
	recipes: {
		cols: [
			{ key: 'name', label: 'Name', w: 'col-wide' },
			{ key: 'protein', label: 'Protein', w: 'col-mid' },
			{ key: 'cuisine', label: 'Cuisine', w: 'col-mid' },
			{ key: 'phase', label: 'Phase', w: 'col-narrow' },
			{ key: 'kcal', label: 'Kcal', w: 'col-narrow', type: 'number' },
			{ key: 'protein_g', label: 'Prot g', w: 'col-narrow', type: 'number' },
			{ key: 'fat_g', label: 'Fat g', w: 'col-narrow', type: 'number' },
			{ key: 'carbs_g', label: 'Carbs g', w: 'col-narrow', type: 'number' },
			{ key: 'ingredients', label: 'Ingredients', w: 'col-wide' },
			{ key: 'steps', label: 'Steps', w: 'col-wide' }
		]
	},
	movements: {
		cols: [
			{ key: 'id', label: 'ID', w: 'col-mid' },
			{ key: 'name', label: 'Name', w: 'col-wide' },
			{ key: 'phase', label: 'Phase', w: 'col-narrow' },
			{ key: 'equipment', label: 'Equip', w: 'col-mid' },
			{ key: 'video_url', label: 'Video URL', w: 'col-wide' },
			{ key: 'cues', label: 'Cues', w: 'col-wide' },
			{ key: 'mistake', label: 'Mistake', w: 'col-wide' }
		]
	},
	workouts: {
		cols: [
			{ key: 'workout_id', label: 'Workout ID', w: 'col-mid' },
			{ key: 'workout_name', label: 'Name', w: 'col-wide' },
			{ key: 'phase', label: 'Phase', w: 'col-narrow' },
			{ key: 'duration_min', label: 'Min', w: 'col-narrow', type: 'number' },
			{ key: 'sort_order', label: 'Order', w: 'col-narrow', type: 'number' },
			{ key: 'movement_id', label: 'Movement', w: 'col-mid' },
			{ key: 'sets', label: 'Sets', w: 'col-narrow', type: 'number' },
			{ key: 'reps', label: 'Reps', w: 'col-narrow', type: 'number' },
			{ key: 'rest_sec', label: 'Rest s', w: 'col-narrow', type: 'number' }
		]
	},
	ingredients: {
		cols: [
			{ key: 'id', label: 'ID', w: 'col-mid' },
			{ key: 'name', label: 'Name', w: 'col-wide' },
			{ key: 'category', label: 'Category', w: 'col-mid' },
			{ key: 'per_100g_kcal', label: 'Kcal/100g', w: 'col-narrow', type: 'number' },
			{ key: 'per_100g_p', label: 'P/100g', w: 'col-narrow', type: 'number' },
			{ key: 'per_100g_f', label: 'F/100g', w: 'col-narrow', type: 'number' },
			{ key: 'per_100g_c', label: 'C/100g', w: 'col-narrow', type: 'number' },
			{ key: 'source', label: 'Source', w: 'col-narrow' }
		]
	},
	catered_menu: {
		cols: [
			{ key: 'category', label: 'Category', w: 'col-mid' },
			{ key: 'name', label: 'Name', w: 'col-wide' },
			{ key: 'per_serving_kcal', label: 'Kcal', w: 'col-narrow', type: 'number' },
			{ key: 'per_serving_p', label: 'Protein', w: 'col-narrow', type: 'number' },
			{ key: 'per_serving_f', label: 'Fat', w: 'col-narrow', type: 'number' },
			{ key: 'per_serving_c', label: 'Carbs', w: 'col-narrow', type: 'number' },
			{ key: 'serving_g', label: 'Serving g', w: 'col-narrow', type: 'number' }
		]
	},
	phases: {
		stickyCol: true,
		cols: [
			// Identity
			{ key: 'key', label: 'Key', w: 'col-mid' },
			{ key: 'program_id', label: 'Prog ID', w: 'col-mid' },
			{ key: 'name', label: 'Name', w: 'col-mid' },
			{ key: 'sort_order', label: 'Order', w: 'col-narrow', type: 'number' },
			{ key: 'color', label: 'Color', w: 'col-narrow' },
			{ key: 'is_program', label: 'Is Prog', w: 'col-narrow', type: 'number' },
			{ key: 'inherits_rules_from', label: 'Inherits', w: 'col-mid' },
			// Calories and targets
			{ key: 'calorie_mode', label: 'Cal Mode', w: 'col-mid' },
			{ key: 'target_mode', label: 'Target Mode', w: 'col-mid' },
			{ key: 'calorie_cut', label: 'TDEE Cut', w: 'col-narrow', type: 'number' },
			{ key: 'target_fixed_lo', label: 'Fixed Lo', w: 'col-narrow', type: 'number' },
			{ key: 'target_fixed_hi', label: 'Fixed Hi', w: 'col-narrow', type: 'number' },
			// Ramp
			{ key: 'ramp_from', label: 'Ramp From', w: 'col-narrow', type: 'number' },
			{ key: 'ramp_days', label: 'Ramp Days', w: 'col-narrow', type: 'number' },
			{ key: 'ramp_pct', label: 'Ramp %', w: 'col-mid' },
			// Bank
			{ key: 'calorie_bank', label: 'Has Bank', w: 'col-narrow', type: 'number' },
			{ key: 'bank_window', label: 'Bank Win', w: 'col-narrow', type: 'number' },
			{ key: 'bank_clamp_lo', label: 'Bank Lo', w: 'col-narrow', type: 'number' },
			{ key: 'bank_clamp_hi', label: 'Bank Hi', w: 'col-narrow', type: 'number' },
			// Drift
			{ key: 'drift_enabled', label: 'Drift', w: 'col-narrow', type: 'number' },
			{ key: 'drift_review_days', label: 'Review d', w: 'col-narrow', type: 'number' },
			{ key: 'drift_step_kcal', label: 'Step kcal', w: 'col-narrow', type: 'number' },
			{ key: 'drift_floor_kcal', label: 'Floor kcal', w: 'col-narrow', type: 'number' },
			{ key: 'drift_band_kg', label: 'Band kg', w: 'col-narrow', type: 'number' },
			// Phase config
			{ key: 'duration_default', label: 'Dur Days', w: 'col-narrow', type: 'number' },
			{ key: 'requires_serum', label: 'Serum', w: 'col-narrow', type: 'number' },
			{ key: 'has_fasting', label: 'Fasting', w: 'col-narrow', type: 'number' },
			{ key: 'gate_fat', label: 'Gate Fat', w: 'col-narrow', type: 'number' },
			{ key: 'gate_carb', label: 'Gate Carb', w: 'col-narrow', type: 'number' },
			{ key: 'use_buckets', label: 'Buckets', w: 'col-narrow', type: 'number' }
		]
	},
	users: {
		cols: [],
		mode: 'users'
	},
	intakes: {
		cols: [],
		mode: 'intakes'
	}
};

export const SIDEBAR_SECTIONS = [
	{
		title: 'People',
		items: [
			{ key: 'users', label: 'Users' }
		]
	},
	{
		title: 'Onboarding',
		items: [
			{ key: 'intakes', label: 'Intakes' }
		]
	},
	{
		title: 'Reference tables',
		items: [
			{ key: 'programs', label: 'Programs' },
			{ key: 'phases', label: 'Phases' },
			{ key: 'calorie_tuning', label: 'Calorie Tuning' },
			{ key: 'rules', label: 'Rules' },
			{ key: 'foods', label: 'Foods' },
			{ key: 'policy', label: 'Policy' },
			{ key: 'config', label: 'Config' }
		]
	},
	{
		title: 'Content',
		items: [
			{ key: 'messages', label: 'Messages' },
			{ key: 'recipes', label: 'Recipes' },
			{ key: 'movements', label: 'Movements' },
			{ key: 'workouts', label: 'Workouts' }
		]
	},
	{
		title: 'Meal Plan',
		items: [
			{ key: 'ingredients', label: 'Ingredients' },
			{ key: 'catered_menu', label: 'Catered Menu' }
		]
	}
];

// ─── Data cache ───
export interface TableData {
	original: Record<string, unknown>[];
	current: Record<string, unknown>[];
	dirty: boolean;
}

export const dataStore = writable<Record<string, TableData>>({});

export async function loadTableData(name: string): Promise<void> {
	let rows: Record<string, unknown>[];
	if (name === 'users') {
		const res = await adminApi<{ users?: Record<string, unknown>[] }>('admin_users');
		rows = res.users || [];
	} else if (name === 'intakes') {
		const res = await adminApi<{ intakes?: Record<string, unknown>[] }>('admin_intakes_list');
		rows = res.intakes || [];
	} else {
		const res = await adminApi<{ rows?: Record<string, unknown>[] }>('admin_list', { table: name });
		rows = res.rows || [];
	}
	dataStore.update(s => ({
		...s,
		[name]: { original: structuredClone(rows), current: rows, dirty: false }
	}));
}

export async function saveTableData(name: string): Promise<void> {
	const store = get(dataStore);
	const d = store[name];
	if (!d) return;

	const hasAutoPK = !['config'].includes(name);
	const cleanRows = d.current
		.map(r => {
			const copy = { ...r };
			for (const k of Object.keys(copy)) {
				if (copy[k] === null || copy[k] === undefined) delete copy[k];
			}
			if (hasAutoPK && typeof copy.id === 'number') delete copy.id;
			return copy;
		})
		.filter(r => Object.keys(r).length > 0);

	await adminApi('admin_seed', { table: name, rows: cleanRows });
	await loadTableData(name);
}

export function revertTableData(name: string): void {
	dataStore.update(s => {
		const d = s[name];
		if (!d) return s;
		return {
			...s,
			[name]: { ...d, current: structuredClone(d.original), dirty: false }
		};
	});
}

export function markDirty(name: string): void {
	dataStore.update(s => {
		const d = s[name];
		if (!d) return s;
		return { ...s, [name]: { ...d, dirty: true } };
	});
}

// ─── Toast ───
export const toastMsg = writable<{ text: string; error: boolean } | null>(null);
let toastTimer: ReturnType<typeof setTimeout>;

export function toast(msg: string, isError = false) {
	clearTimeout(toastTimer);
	toastMsg.set({ text: msg, error: isError });
	toastTimer = setTimeout(() => toastMsg.set(null), 2500);
}
