/**
 * Meal plan store — coach plan from API + local edits.
 * Maps to PLAN/planEdit/loadPlan/planItemsFor from index.html.
 */
import { writable, get } from 'svelte/store';
import { api } from '$lib/api/client';
import { K, pid } from './auth';

export interface PlanItem {
	meal: string;
	recipe: string;
	kcal: number;
	protein: number;
	fat: number;
	carbs: number;
	day?: number;
}

export const planData = writable<PlanItem[]>([]);
export const planLoaded = writable(false);
export const planDay = writable(1);
export const planEdit = writable<Record<number, PlanItem[]>>({});

export function loadPlanEdit(): void {
	const id = get(pid);
	if (!id) return;
	try {
		const raw = localStorage.getItem(K(id, 'planedit'));
		if (raw) planEdit.set(JSON.parse(raw));
	} catch { planEdit.set({}); }
}

export function savePlanEdit(): void {
	const id = get(pid);
	if (!id) return;
	try { localStorage.setItem(K(id, 'planedit'), JSON.stringify(get(planEdit))); } catch { /* noop */ }
}

function baseItemsFor(day: number): PlanItem[] {
	return get(planData)
		.filter(p => p.day === day)
		.map(p => ({ meal: p.meal, recipe: p.recipe, kcal: p.kcal, protein: p.protein, fat: p.fat, carbs: p.carbs }));
}

export function planItemsFor(day: number): PlanItem[] {
	const edits = get(planEdit);
	return edits[day] ? edits[day] : baseItemsFor(day);
}

export function ensureEditable(day: number): void {
	const edits = get(planEdit);
	if (!edits[day]) {
		edits[day] = baseItemsFor(day);
		planEdit.set(edits);
	}
}

export function planDaysAvailable(): number[] {
	const days = new Set(get(planData).map(p => p.day!).filter(d => d > 0));
	Object.keys(get(planEdit)).forEach(d => days.add(+d));
	return [...days].sort((a, b) => a - b);
}

export async function loadPlan(): Promise<void> {
	const id = get(pid);
	if (!id) return;

	loadPlanEdit();
	if (get(planLoaded)) return;

	// Cache first
	try {
		const cached = localStorage.getItem(K(id, 'plan_cache'));
		if (cached) {
			planData.set(JSON.parse(cached));
			planLoaded.set(true);
		}
	} catch { /* noop */ }

	// Fetch from API
	try {
		const d = await api<{ plan: PlanItem[] }>('mealplan', { id }, { contentType: 'text/plain;charset=utf-8' });
		if (d?.plan) {
			planData.set(d.plan);
			planLoaded.set(true);
			localStorage.setItem(K(id, 'plan_cache'), JSON.stringify(d.plan));
		}
	} catch { /* noop — cache is fine */ }
}
