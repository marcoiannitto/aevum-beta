<!--
  FoodBuckets — Activation/Transition food bucket display (protein/veg/fruit gram tracking).
  Maps to .buckets / renderBuckets() from index.html.
  Shown only when phase uses buckets and NOT actMacros mode.
-->
<script lang="ts">
	import { profile } from '$lib/stores/auth';
	import { currentDay, dayData, totals as calcTotals } from '$lib/stores/day';
	import { phaseFor, phReg } from '$lib/stores/phases';
	import { actMacros } from '$lib/stores/rules';
	import { cfg } from '$lib/stores/config';

	let day = $derived($dayData);
	let phase = $derived(phaseFor($currentDay, $profile));
	let reg = $derived(phReg(phase.key));
	let isMacroAct = $derived(
		(reg ? reg.use_buckets : (phase.key === 'activation' || phase.key === 'transition')) && actMacros()
	);
	let isActBuckets = $derived(
		(reg ? reg.use_buckets : (phase.key === 'activation' || phase.key === 'transition')) && !actMacros()
	);

	let open = $state(false);

	const BUCKET_CAP = $derived(cfg('bucket_cap'));
	const MEALS = $derived(BUCKET_CAP / 100);

	interface ItemEntry {
		name: string;
		type: string;
		verdict: string;
		note?: string;
		grams?: number;
		kcal?: number;
		protein?: number;
		fat?: number;
		carbs?: number;
	}

	const types = [
		{ k: 'protein', lab: 'Protein foods' },
		{ k: 'veg', lab: 'Vegetables' },
		{ k: 'fruit', lab: 'Fruit' },
	] as const;

	function bucketGrams(it: ItemEntry): number {
		const gr = +(it.grams || 0);
		return (it.type === 'protein' && /egg\s*white/i.test(it.name || '')) ? gr * 0.5 : gr;
	}

	function mealsFmt(n: number): string {
		const r = Math.round(n * 2) / 2;
		return r > MEALS ? MEALS + '+' : String(r % 1 ? r : r);
	}

	interface BucketData {
		k: string;
		lab: string;
		sumGrams: number;
		used: number;
		status: string;
		fillers: ItemEntry[];
	}

	let buckets = $derived.by((): { data: BucketData[]; violations: ItemEntry[] } | null => {
		if (!isActBuckets || !day) return null;

		const items: ItemEntry[] = (day.meals || []).flatMap((m: any) => m.items || []);
		const sums: Record<string, number> = { protein: 0, veg: 0, fruit: 0 };
		const fillers: Record<string, ItemEntry[]> = { protein: [], veg: [], fruit: [] };
		const viol: ItemEntry[] = [];

		items.forEach(it => {
			const v = it.verdict || 'limited';
			if (v === 'no') { viol.push(it); return; }
			if (sums[it.type] === undefined) return;
			sums[it.type] += bucketGrams(it);
			fillers[it.type].push(it);
		});

		const data = types.map(ty => {
			const gr = sums[ty.k];
			const used = gr / 100;
			const isFruit = ty.k === 'fruit';
			const status = (!isFruit && gr > 262) ? 'over' : (gr > 222 ? 'warn' : '');
			return { k: ty.k, lab: ty.lab, sumGrams: gr, used, status, fillers: fillers[ty.k] };
		});

		return { data, violations: viol };
	});

	let t = $derived(day ? calcTotals(day) : { kcal: 0, protein: 0, fat: 0, carbs: 0, exKcal: 0 });
	let hasItems = $derived((day?.meals || []).some((m: any) => (m.items || []).length > 0));

	function itemFlag(it: ItemEntry): { cls: string; label: string } {
		const grams = +(it.grams || 0);
		const v = it.verdict || 'limited';
		const ty = it.type || 'other';
		if (v === 'no') return { cls: 'bad', label: 'Not allowed' };
		if (v === 'limited') return { cls: 'warn', label: it.note || 'Limited' };
		if (/egg\s*white/i.test(it.name || '')) {
			if (grams > 250) return { cls: 'bad', label: 'Over 6' };
			if (grams > 200) return { cls: 'warn', label: 'Near 6' };
			return { cls: 'ok', label: 'Allowed' };
		}
		const cap = (ty === 'protein' || ty === 'veg') ? { amber: 111, red: 131 } : { amber: 111, red: Infinity };
		if (grams > cap.red) return { cls: 'bad', label: 'Too much' };
		if (grams > cap.amber) return { cls: 'warn', label: `Over ${cap.amber}g` };
		return { cls: 'ok', label: 'Allowed' };
	}
</script>

{#if buckets}
	<div class="buckets" class:open role="button" tabindex="0" onclick={() => open = !open} onkeydown={(e) => e.key === 'Enter' && (open = !open)}>
		<div class="bkt-strip">
			{#each buckets.data as bkt}
				<div class="bkt {bkt.status}">
					<span class="bkt-lab">{bkt.lab}</span>
					<div class="bkt-pips">
						{#each Array(MEALS) as _, i}
							{@const frac = Math.max(0, Math.min(1, bkt.used - i))}
							<div class="pip"><span style="width:{(frac * 100).toFixed(0)}%"></span></div>
						{/each}
					</div>
					<span class="bkt-meals" translate="no">{mealsFmt(bkt.used)} of {MEALS} meals</span>
				</div>
			{/each}
		</div>

		{#if buckets.violations.length > 0}
			<div class="bkt-viol">⚠ {buckets.violations.length} item{buckets.violations.length > 1 ? 's' : ''} off protocol</div>
		{/if}

		{#if open}
			<div class="bkt-detail">
				{#each buckets.data as bkt}
					<div class="bkt-sec">{bkt.lab} · {mealsFmt(bkt.used)} of {MEALS} meals</div>
					{#if bkt.fillers.length === 0}
						<div class="mi-none">Nothing yet</div>
					{/if}
					{#each bkt.fillers as it}
						{@const f = itemFlag(it)}
						<div class="mi">
							<span class="mi-dot {f.cls}"></span>
							<span class="mi-name">{it.name} {it.grams || 0}g</span>
							{#if f.cls === 'warn' || f.cls === 'bad'}
								<span class="mi-flag {f.cls}">{f.label}</span>
							{/if}
						</div>
					{/each}
				{/each}
				{#if buckets.violations.length > 0}
					<div class="bkt-sec bad">Off protocol</div>
					{#each buckets.violations as it}
						{@const f = itemFlag(it)}
						<div class="mi">
							<span class="mi-dot bad"></span>
							<span class="mi-name">{it.name} {it.grams || 0}g</span>
							<span class="mi-flag bad">{f.label}</span>
						</div>
					{/each}
				{/if}
				<div class="bkt-totals" translate="no"><b>{t.kcal}</b> kcal<span class="sep">·</span>{t.protein}P<span class="sep">·</span>{t.fat}F<span class="sep">·</span>{t.carbs}C</div>
			</div>
		{:else if hasItems}
			<div class="bkt-more">Tap for detail</div>
		{/if}
	</div>
{/if}

<style>
	.buckets { margin-top: 14px; cursor: pointer; }
	.bkt-strip { display: flex; gap: 10px; }
	.bkt { flex: 1; display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--line); border-radius: 14px; padding: 11px 12px; background: var(--card); }
	.bkt-lab { font-size: 12px; color: var(--muted); line-height: 1.1; }
	.bkt-pips { display: flex; gap: 5px; }
	.pip { flex: 1; height: 8px; border-radius: 4px; background: var(--line-soft); overflow: hidden; }
	.pip > span { display: block; height: 100%; background: #4a7c59; transition: width 0.35s ease; }
	.bkt-meals { font-size: 12px; color: var(--ink-soft); }
	.bkt.warn { border-color: #eBD9A8; background: var(--warn-bg); }
	.bkt.warn .bkt-lab, .bkt.warn .bkt-meals { color: var(--warn); }
	.bkt.warn .pip > span { background: var(--warn); }
	.bkt.over { border-color: #e9c9c1; background: var(--over-bg); }
	.bkt.over .bkt-lab, .bkt.over .bkt-meals { color: var(--over); }
	.bkt.over .pip > span { background: var(--over); }
	.bkt-viol { margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: var(--over-bg); color: var(--over); font-size: 14px; font-weight: 600; border: 1px solid #e9c9c1; text-align: center; }
	.bkt-more { text-align: center; font-size: 11px; color: var(--muted); margin-top: 9px; letter-spacing: 0.02em; }
	.bkt-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line-soft); display: flex; flex-direction: column; gap: 5px; }
	.bkt-sec { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); margin-top: 8px; }
	.bkt-sec.bad { color: var(--over); }
	.mi-none { font-size: 13px; color: var(--muted); padding: 1px 0; }
	.mi { display: flex; align-items: center; gap: 8px; font-size: 13px; }
	.mi-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
	.mi-dot.ok { background: #4a7c59; }
	.mi-dot.warn { background: var(--warn); }
	.mi-dot.bad { background: var(--over); }
	.mi-name { color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.mi-flag { margin-left: auto; flex-shrink: 0; font-size: 12px; font-weight: 600; }
	.mi-flag.warn { color: var(--warn); }
	.mi-flag.bad { color: var(--over); }
	.bkt-totals { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--line-soft); font-size: 13px; color: var(--ink-soft); text-align: center; }
	.bkt-totals b { font-family: var(--serif); font-weight: 500; }
	.bkt-totals .sep { color: var(--line); margin: 0 5px; }
</style>
