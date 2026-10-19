<!--
  Reusable bottom sheet — scrim + slide-up panel + grab handle.
  Usage: <Sheet open={bool} onClose={fn}>{@render children()}</Sheet>
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = false,
		onClose,
		title = '',
		children
	}: {
		open: boolean;
		onClose: () => void;
		title?: string;
		children: Snippet;
	} = $props();

	function onScrimClick() {
		onClose();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="scrim" onclick={onScrimClick}></div>

	<div class="sheet" role="dialog" aria-modal="true" aria-label={title || 'Sheet'}>
		<div class="grab">
			<span class="handle"></span>
		</div>

		{#if title}
			<div class="sheet-head">
				<h2>{title}</h2>
				<button class="close" onclick={onClose} aria-label="Close">✕</button>
			</div>
		{/if}

		<div class="sheet-body">
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 900;
		animation: fadeIn 0.2s ease;
	}
	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		max-height: 85dvh;
		background: var(--card);
		border-radius: 20px 20px 0 0;
		z-index: 901;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.25s ease;
		overflow: hidden;
	}
	.grab {
		display: flex;
		justify-content: center;
		padding: 10px 0 4px;
		cursor: grab;
	}
	.handle {
		width: 36px;
		height: 4px;
		border-radius: 2px;
		background: var(--line);
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 20px 12px;
	}
	.sheet-head h2 {
		font-family: var(--serif);
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--ink);
		margin: 0;
	}
	.close {
		font-size: 1.1rem;
		color: var(--muted);
		padding: 4px 8px;
	}
	.sheet-body {
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		padding: 0 20px 24px;
		flex: 1;
	}
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes slideUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}
</style>
