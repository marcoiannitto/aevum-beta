<script lang="ts">
	import { toastMsg } from '$lib/stores/admin';
</script>

{#if $toastMsg}
	<div class="toast show" class:error={$toastMsg.error}>{$toastMsg.text}</div>
{/if}

<style>
	.toast {
		position: fixed;
		bottom: 24px;
		right: 24px;
		background: var(--ink);
		color: #fff;
		padding: 12px 20px;
		border-radius: 10px;
		font-size: 13px;
		z-index: 100;
		animation: slideUp 0.3s ease-out;
	}
	.toast.error {
		background: #A13024;
	}
	@keyframes slideUp {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
