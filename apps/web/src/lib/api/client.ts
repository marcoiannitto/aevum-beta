/**
 * AEVUM API Client
 * Typed wrapper around the action-based POST API.
 */

const BACKEND_URL = 'https://aevum-api-v2.marco-iannitto.workers.dev';

type RequestOptions = {
	token?: string | null;
};

export async function api<T = unknown>(
	action: string,
	payload: Record<string, unknown> = {},
	opts: RequestOptions = {}
): Promise<T> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};
	if (opts.token) {
		headers['Authorization'] = `Bearer ${opts.token}`;
	}

	const res = await fetch(BACKEND_URL, {
		method: 'POST',
		headers,
		body: JSON.stringify({ action, ...payload })
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new ApiError(res.status, text || res.statusText, action);
	}

	return res.json() as Promise<T>;
}

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
