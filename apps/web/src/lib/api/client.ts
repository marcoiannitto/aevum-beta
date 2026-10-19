/**
 * AEVUM API Client
 * Matches the postJSON() pattern from index.html:
 * - POST with action in body
 * - Bearer token auth
 * - AbortController timeout (default 20s)
 * - 401 → clear token, throw
 * - {error} in response → throw
 */
import { get } from 'svelte/store';
import { token } from '$lib/stores/auth';
import { env } from '$env/dynamic/public';

export const BACKEND_URL = env.PUBLIC_BACKEND_URL || 'https://aevum-api-v2.marco-iannitto.workers.dev';
export const AI_URL = env.PUBLIC_AI_URL || 'https://sweet-fire-a436.marco-iannitto.workers.dev';
export const GOOGLE_CLIENT_ID = env.PUBLIC_GOOGLE_CLIENT_ID || '1030416202284-fab2qo7gorekbbjhln8dj5sfethha2ea.apps.googleusercontent.com';

export class ApiError extends Error {
	constructor(
		public status: number,
		public body: string,
		public action: string
	) {
		super(`API ${action} failed (${status}): ${body}`);
		this.name = 'ApiError';
	}
}

interface ApiOptions {
	/** Override auth token (e.g. for admin) */
	token?: string | null;
	/** Content-Type header (default: application/json) */
	contentType?: string;
	/** Timeout in ms (default: 20000) */
	timeout?: number;
	/** Skip auth header */
	noAuth?: boolean;
}

/**
 * Core API call — matches postJSON from index.html
 */
export async function api<T = unknown>(
	action: string,
	payload: Record<string, unknown> = {},
	opts: ApiOptions = {}
): Promise<T> {
	const ctl = new AbortController();
	const t = setTimeout(() => ctl.abort(), opts.timeout ?? 20_000);

	const ct = opts.contentType ?? 'application/json';
	const headers: Record<string, string> = { 'Content-Type': ct };

	if (!opts.noAuth) {
		const tok = opts.token ?? get(token);
		if (tok) headers['Authorization'] = `Bearer ${tok}`;
	}

	try {
		const res = await fetch(BACKEND_URL, {
			method: 'POST',
			headers,
			body: JSON.stringify({ action, ...payload }),
			signal: ctl.signal
		});

		if (res.status === 401) {
			token.set(null);
			throw new ApiError(401, 'Session expired', action);
		}

		if (!res.ok) {
			const errBody = await res.text().catch(() => '');
			console.error(`[AEVUM] API ${action} → ${res.status}:`, errBody);
			throw new ApiError(res.status, errBody || `http ${res.status}`, action);
		}

		const data = await res.json();
		if (data && data.error) {
			throw new ApiError(0, data.error, action);
		}
		return data as T;
	} finally {
		clearTimeout(t);
	}
}

/**
 * AI endpoint call — matches aiPost from index.html
 */
export async function aiPost<T = unknown>(
	payload: Record<string, unknown>,
	timeout = 20_000
): Promise<T> {
	const url = AI_URL || BACKEND_URL;
	const ctl = new AbortController();
	const t = setTimeout(() => ctl.abort(), timeout);

	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	const tok = get(token);
	if (tok) headers['Authorization'] = `Bearer ${tok}`;

	try {
		const res = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(payload),
			signal: ctl.signal
		});

		if (!res.ok) throw new Error(`http ${res.status}`);
		const data = await res.json();
		if (data && data.error) throw new Error(data.error);
		return data as T;
	} finally {
		clearTimeout(t);
	}
}
