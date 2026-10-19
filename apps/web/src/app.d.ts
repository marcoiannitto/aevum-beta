/// <reference types="@sveltejs/kit" />

declare namespace App {
	interface Platform {
		env: {
			// Cloudflare bindings if needed
		};
		context: {
			waitUntil(promise: Promise<unknown>): void;
		};
		caches: CacheStorage & { default: Cache };
	}
}
