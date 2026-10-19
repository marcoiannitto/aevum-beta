<script lang="ts">
	import BodyBlock from './BodyBlock.svelte';
	import ExerciseTracker from '$lib/components/today/ExerciseTracker.svelte';
	import SerumBlock from '$lib/components/today/SerumBlock.svelte';
	import Ratings from '$lib/components/today/Ratings.svelte';
	import Notes from '$lib/components/today/Notes.svelte';
</script>

<div class="checkin">
	<BodyBlock />
	<SerumBlock />
	<ExerciseTracker />
	<Ratings />
	<Notes />
</div>

<style>
	.checkin {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
</style>
