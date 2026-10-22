/**
 * Date helpers — day number ↔ date, formatting
 */
import { get } from 'svelte/store';
import { profile } from '$lib/stores/auth';
import { cfg } from '$lib/stores/config';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** Effective "today" adjusted for day_start_hour */
export function effToday(): Date {
	const now = new Date();
	const h = cfg('day_start_hour');
	if (now.getHours() < h) {
		now.setDate(now.getDate() - 1);
	}
	return now;
}

export function effTodayISO(): string {
	const d = effToday();
	return d.toISOString().slice(0, 10);
}

/** Convert day number to Date using profile.start_date */
export function dayToDate(dayNum: number): Date | null {
	const p = get(profile);
	if (!p?.start_date) return null;
	const start = new Date(p.start_date + 'T00:00:00');
	if (isNaN(start.getTime())) return null;
	const d = new Date(start);
	d.setDate(d.getDate() + dayNum - 1);
	return d;
}

/** Convert a Date to a day number (0 if no start_date) */
export function dateToDayNum(date: Date): number {
	const p = get(profile);
	if (!p?.start_date) return 0;
	const start = new Date(p.start_date + 'T00:00:00');
	if (isNaN(start.getTime())) return 0;
	const diff = Math.floor((date.getTime() - start.getTime()) / 86400000);
	return diff + 1;
}

/** Today's day number (or 0 if no start_date) */
export function todayDayNum(): number {
	const p = get(profile);
	if (!p?.start_date) return 0;
	return dateToDayNum(effToday());
}

/** Format date as "Mon 14 Jan" */
export function fmtShort(d: Date): string {
	return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Format date as "14 Jan 2025" */
export function fmtLong(d: Date): string {
	return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format time as "HH:MM" */
export function fmtTime(ts: number): string {
	const d = new Date(ts);
	return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
