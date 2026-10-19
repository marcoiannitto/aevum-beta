<script lang="ts">
	import { dayData, saveDay } from '$lib/stores/day';

	const notes = $derived($dayData?.notes ?? '');

	function update(e: Event) {
		if (!$dayData) return;
		$dayData.notes = (e.currentTarget as HTMLTextAreaElement).value;
		saveDay();
	}
</script>

<section class="notes">
	<h3>Notes</h3>
	<textarea
		class="notes-area"
		placeholder="How was your day?"
		value={notes}
		onblur={update}
		rows="3"
	></textarea>
</section>

<style>
	.notes { padding: 0 18px 24px; }
	h3 { font-size: 14px; font-weight: 600; margin: 0 0 8px; }
	.notes-area {
		width: 100%; padding: 10px 12px;
		border: 1px solid var(--line); border-radius: 10px;
		font-size: 14px; font-family: inherit;
		resize: vertical; min-height: 60px;
		background: var(--card, #fff);
	}
</style>
