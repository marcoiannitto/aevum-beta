/// <reference types="@sveltejs/kit" />

declare namespace App {
	interface Platform {
		env: {
			DB?: D1Database;
		};
		context: {
			waitUntil(promise: Promise<unknown>): void;
		};
		caches: CacheStorage & { default: Cache };
	}
}

// Google Identity Services
declare interface Window {
	google?: typeof google;
}

declare const google: {
	accounts: {
		id: {
			initialize(config: Record<string, unknown>): void;
			renderButton(element: HTMLElement, config: Record<string, unknown>): void;
			prompt(): void;
		};
	};
};
