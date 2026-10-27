/**
 * Rules store — phase-specific macro/calorie rules from backend.
 * Mirrors RULES/ruleFor/bandClass/loadRules from index.html.
 */
import { writable, get } from 'svelte/store';
import { api } from '$lib/api/client';
import { pid, K } from './auth';
import { ruleParent } from './phases';

// --- Types ---

export interface RuleEntry {
	phase: string;
	model: string;
	metric: string;
	basis: string;
	target: number | null;
	green_lo: number | null;
	green_hi: number | null;
	amber_lo: number | null;
	amber_hi: number | null;
	gated: boolean | number | string;
	unit: string;
	[key: string]: unknown;
}

export interface RulesData {
	model: string; // 'buckets' | 'macros'
	rules: RuleEntry[];
}

// --- Store ---

export const rules = writable<RulesData>({ model: 'buckets', rules: [] });

// --- Functions ---

/** Find a rule for a given phase + metric, with inheritance fallback */
export function ruleFor(phaseKey: string, metric: string, model?: string): RuleEntry | undefined {
	const { rules: list } = get(rules);
	// Try direct match first
	let found = list.find(
		(r) => r.phase === phaseKey && r.metric === metric && (model == null || r.model === model)
	);
	// Fall back to inherited parent phase
	if (!found) {
		const parent = ruleParent(phaseKey);
		if (parent !== phaseKey) {
			found = list.find(
				(r) => r.phase === parent && r.metric === metric && (model == null || r.model === model)
			);
		}
	}
	return found;
}

/** Determine band class from value vs rule thresholds.
 *  Supports one-sided bounds: if green_hi is null, any value >= green_lo is ok
 *  (lower-bound-only metric, e.g. fat in recomposition). Vice versa for upper-only. */
export function bandClass(value: number, rule: RuleEntry): string {
	// --- green check (supports one-sided bounds) ---
	const hasLo = rule.green_lo != null;
	const hasHi = rule.green_hi != null;
	if (hasLo && hasHi) {
		if (value >= rule.green_lo! && value <= rule.green_hi!) return 'ok';
	} else if (hasLo && !hasHi) {
		if (value >= rule.green_lo!) return 'ok';   // lower-bound only
	} else if (!hasLo && hasHi) {
		if (value <= rule.green_hi!) return 'ok';   // upper-bound only
	}

	// --- amber check (supports one-sided bounds) ---
	const hasALo = rule.amber_lo != null;
	const hasAHi = rule.amber_hi != null;
	if (hasALo && hasAHi) {
		if (value >= rule.amber_lo! && value <= rule.amber_hi!) return 'warn';
	} else if (hasALo && !hasAHi) {
		if (value >= rule.amber_lo!) return 'warn';
	} else if (!hasALo && hasAHi) {
		if (value <= rule.amber_hi!) return 'warn';
	}

	// --- over (beyond green bounds) ---
	if (hasHi && value > rule.green_hi!) return 'over';
	if (hasLo && value < rule.green_lo!) return 'over';
	return '';
}

/** Is this client on macros model (vs buckets)? */
export function actMacros(): boolean {
	return get(rules).model === 'macros';
}

/** Load rules from backend */
export function loadRules(): void {
	const id = get(pid);
	if (!id) return;

	// Cache
	const cacheKey = K(id, 'rules');
	try {
		const cached = localStorage.getItem(cacheKey);
		if (cached) rules.set(JSON.parse(cached));
	} catch { /* noop */ }

	api<RulesData>('rules', { id }, { contentType: 'text/plain;charset=utf-8' })
		.then((data) => {
			if (data?.rules) {
				// Coerce gated to boolean
				data.rules = data.rules.map((r) => ({ ...r, gated: !!r.gated }));
				rules.set(data);
				try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* noop */ }
			}
		})
		.catch((err) => { console.error('[AEVUM] loadRules failed:', err.message || err); });
}
