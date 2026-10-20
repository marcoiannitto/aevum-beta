<!--
  WaterTracker — SVG vessel with animated fill, litres display, +/- buttons.
  Maps to .water-block / renderWater() from index.html.
-->
<script lang="ts">
	import { dayData, saveDay, currentDay } from '$lib/stores/day';
	import { cfg } from '$lib/stores/config';
	import { phaseFor } from '$lib/stores/phases';
	import { ruleFor } from '$lib/stores/rules';

	const GLASS_ML = $derived(cfg('glass_ml'));
	const glasses = $derived($dayData?.water ?? 0);
	const litres = $derived(glasses * GLASS_ML / 1000);

	function waterGoalL(): number {
		const pk = phaseFor($currentDay).key;
		const rule = ruleFor(pk, 'water');

		if (rule && rule.target != null && rule.target > 0) {
			// Backend already scales per_kg_target_weight rules.
			// Fixed rules return the value as-is.
			// Round to 1 decimal for display.
			return Math.round(rule.target * 10) / 10;
		}

		// Fallback: 2.5L (should not hit once migration 0017 runs)
		return 2.5;
	}

	const goalL = $derived(waterGoalL());
	const goalGlasses = $derived(Math.ceil(goalL * 1000 / GLASS_ML));
	const met = $derived(glasses >= goalGlasses);

	// SVG fill
	const H = 84;
	const pct = $derived(goalGlasses > 0 ? Math.min(1, glasses / goalGlasses) : 0);
	const fillH = $derived(pct * H);
	const fillY = $derived(H - fillH);

	function fmtLitres(l: number): string {
		return l.toFixed(l % 1 ? 1 : 0).replace(/\.0$/, '');
	}

	function addGlass() {
		if (!$dayData) return;
		$dayData.water = glasses + 1;
		saveDay();
	}

	function removeGlass() {
		if (!$dayData || glasses <= 0) return;
		$dayData.water = glasses - 1;
		saveDay();
	}
</script>

<div class="block water-block" class:goal={met}>
	<div class="b-title">
		<span>Water</span>
		<span class="w-goalmark">{met ? `✓ ${goalL.toFixed(1)} L` : ''}</span>
	</div>
	<div class="water-main">
		<div class="vessel">
			<svg viewBox="0 0 60 84" width="42" height="60">
				<defs>
					<clipPath id="glassclip">
						<path d="M14 6 h32 l-3 72 a3 3 0 0 1 -3 3 h-20 a3 3 0 0 1 -3 -3 z"/>
					</clipPath>
				</defs>
				<rect
					class="water-fill"
					x="0" y={fillY.toFixed(1)}
					width="60" height={fillH.toFixed(1)}
					fill="#3E6B8A"
					clip-path="url(#glassclip)"
				/>
				<path
					d="M14 6 h32 l-3 72 a3 3 0 0 1 -3 3 h-20 a3 3 0 0 1 -3 -3 z"
					fill="none" stroke="#C9C2B2" stroke-width="2"
				/>
			</svg>
		</div>
		<div class="water-info">
			<div class="w-amount">
				<span class="num">{fmtLitres(litres)}</span>
				<span class="w-unit"> / {goalL.toFixed(1)} L</span>
			</div>
			<div class="w-glasses">{glasses} of {goalGlasses} glasses</div>
		</div>
		<div class="water-btns">
			<button class="w-minus" onclick={removeGlass} disabled={glasses <= 0}>−</button>
			<button class="w-plus" onclick={addGlass}>+</button>
		</div>
	</div>
</div>

<style>
	.block { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 2px 16px; margin-bottom: 12px; }
	.b-title { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 600; padding: 12px 0 4px; }
	.w-goalmark { font-size: 12px; color: var(--gold-deep); font-weight: 600; }
	.water-main { display: flex; align-items: center; gap: 14px; padding: 4px 4px 14px; }
	.vessel { flex-shrink: 0; }
	.water-info { flex: 1; min-width: 0; }
	.w-amount { font-family: var(--serif); font-size: 26px; font-weight: 500; line-height: 1; }
	.w-amount .w-unit { font-size: 14px; color: var(--muted); font-family: var(--sans); }
	.w-glasses { font-size: 13px; color: var(--ink-soft); margin-top: 5px; }
	.water-btns { display: flex; gap: 8px; flex-shrink: 0; }
	.w-minus, .w-plus { width: 46px; height: 46px; border-radius: 12px; font-size: 22px; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; }
	.w-minus { border: 1px solid var(--line); color: var(--ink-soft); background: var(--card); }
	.w-minus:disabled { opacity: 0.3; cursor: not-allowed; }
	.w-plus { border: 1px solid var(--water, #3E6B8A); background: var(--water, #3E6B8A); color: #fff; }
	.water-block.goal { border-color: var(--gold); }
	.water-block.goal .vessel :global(path[stroke]) { stroke: var(--gold); }
	.water-fill { transition: y 0.4s ease, height 0.4s ease; }
</style>
