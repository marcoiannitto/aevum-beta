<script lang="ts">
	const PHASES = ['loading', 'activation', 'transition', 'stabilization', 'maintenance', 'tracker', 'recomposition'];

	let { rows, onPolicyChange }: {
		rows: Record<string, unknown>[];
		onPolicyChange: (phase: string, value: string) => void;
	} = $props();

	function getContent(phase: string): string {
		const row = rows.find(r => r.phase === phase);
		return (row?.content as string) ?? '';
	}
</script>

<div class="policy-cards">
	{#each PHASES as phase}
		<div class="policy-card">
			<h3>{phase}</h3>
			<textarea
				value={getContent(phase)}
				oninput={(e) => onPolicyChange(phase, (e.target as HTMLTextAreaElement).value)}
				placeholder="Policy for {phase} phase..."
			></textarea>
		</div>
	{/each}
</div>

<style>
	.policy-cards {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 20px 28px;
	}
	.policy-card {
		background: var(--card);
		border-radius: 12px;
		padding: 20px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}
	.policy-card h3 {
		font-family: var(--serif);
		font-size: 16px;
		margin-bottom: 10px;
		text-transform: capitalize;
	}
	.policy-card textarea {
		width: 100%;
		min-height: 200px;
		padding: 12px;
		border: 1px solid var(--line);
		border-radius: 8px;
		font-size: 13px;
		line-height: 1.6;
		resize: vertical;
		font-family: inherit;
		color: var(--ink);
	}
	.policy-card textarea:focus {
		border-color: var(--gold);
		outline: none;
	}
</style>
