<!--
  LogMealButton — Full-width "Log meal" button.
  Maps to .log-btn / #openSheet from index.html.
-->
<script lang="ts">
	let { onclick }: { onclick: () => void } = $props();
</script>

<button class="log-btn" {onclick}>
	<span class="ic">
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
			<path d="M12 5v14M5 12h14"/>
		</svg>
	</span>
	Log meal
</button>

<style>
	.log-btn {
		width: 100%;
		padding: 16px;
		background: var(--ink);
		color: #fff;
		border: none;
		border-radius: 16px;
		font-size: 16px;
		font-weight: 600;
		margin-bottom: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 9px;
		cursor: pointer;
		font-family: inherit;
	}
	.log-btn:active { opacity: 0.85; }
	.ic { display: flex; }
</style>
