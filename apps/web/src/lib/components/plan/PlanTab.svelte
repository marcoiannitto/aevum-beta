<!--
  PlanTab — compositor with sub-tabs: Meals / Recipes / Move.
  Free users see a gate; program users get full access.
-->
<script lang="ts">
	import { isProgram } from '$lib/stores/auth';
	import SubTabs from './SubTabs.svelte';
	import MealPlan from './MealPlan.svelte';
	import RecipeList from './RecipeList.svelte';
	import FitnessTab from './FitnessTab.svelte';

	type Sub = 'plan' | 'recipes' | 'fitness';
	let sub = $state<Sub>('plan');
</script>

{#if !$isProgram}
	<div class="gate">
		<div class="gate-icon">🔒</div>
		<h3 class="gate-title">Program Feature</h3>
		<p class="gate-text">Meal plans, recipes and workout routines are available with a full program.</p>
	</div>
{:else}
	<SubTabs active={sub} onSwitch={(s) => sub = s} />

	{#if sub === 'plan'}
		<MealPlan />
	{:else if sub === 'recipes'}
		<RecipeList />
	{:else if sub === 'fitness'}
		<FitnessTab />
	{/if}
{/if}

<style>
	.gate {
		text-align: center; padding: 50px 24px;
		border: 1px dashed var(--line);
		border-radius: 16px; margin-top: 12px;
	}
	.gate-icon { font-size: 32px; margin-bottom: 12px; }
	.gate-title { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
	.gate-text { font-size: 14px; color: var(--muted); margin: 0; line-height: 1.5; }
</style>
