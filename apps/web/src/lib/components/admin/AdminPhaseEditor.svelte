<!-- v.1.0.0 2026-10-24 — Phase editor modal for admin (#61) -->
<script lang="ts">
	import { adminApi, toast } from '$lib/stores/admin';

	let { phase, programId, onDone, onCancel }: {
		phase: Record<string, unknown> | null;
		programId: string;
		onDone: () => void;
		onCancel: () => void;
	} = $props();

	const isNew = !phase;

	// All editable fields with defaults
	let key = $state(String(phase?.key || ''));
	let name = $state(String(phase?.name || ''));
	let sort_order = $state(Number(phase?.sort_order ?? 0));
	let color = $state(String(phase?.color || '#3E7A6A'));
	let is_program = $state(Number(phase?.is_program ?? 1));
	let inherits_rules_from = $state(String(phase?.inherits_rules_from || ''));

	// Duration
	let duration_default = $state(Number(phase?.duration_default ?? 0));
	let duration_col = $state(String(phase?.duration_col || ''));

	// Calorie strategy
	let calorie_mode = $state(String(phase?.calorie_mode || 'bar'));
	let target_mode = $state(String(phase?.target_mode || 'tdee_mult'));
	let calorie_cut = $state(Number(phase?.calorie_cut ?? 0));
	let ramp_from = $state(Number(phase?.ramp_from ?? 0));
	let ramp_days = $state(Number(phase?.ramp_days ?? 0));
	let ramp_pct = $state(String(phase?.ramp_pct || ''));

	// Bank config
	let calorie_bank = $state(Number(phase?.calorie_bank ?? 0));
	let bank_window = $state(Number(phase?.bank_window ?? 7));
	let bank_clamp_lo = $state(Number(phase?.bank_clamp_lo ?? 0.6));
	let bank_clamp_hi = $state(Number(phase?.bank_clamp_hi ?? 1.3));
	let bank_grace_days = $state(Number(phase?.bank_grace_days ?? 3));
	let weekly_tolerance = $state(Number(phase?.weekly_tolerance ?? 0.1));

	// Weight goal
	let weight_goal = $state(String(phase?.weight_goal || ''));
	let weight_goal_rate = $state(Number(phase?.weight_goal_rate ?? 0));

	// Rules
	let use_buckets = $state(Number(phase?.use_buckets ?? 0));
	let gate_fat = $state(Number(phase?.gate_fat ?? 0));
	let gate_carb = $state(Number(phase?.gate_carb ?? 0));
	let requires_serum = $state(Number(phase?.requires_serum ?? 0));
	let has_fasting = $state(Number(phase?.has_fasting ?? 0));

	// Display
	let show_in_phase_bar = $state(Number(phase?.show_in_phase_bar ?? 1));
	let show_in_recipe_chips = $state(Number(phase?.show_in_recipe_chips ?? 1));
	let food_rule_line = $state(String(phase?.food_rule_line || ''));
	let fitness_intro = $state(String(phase?.fitness_intro || ''));
	let explainer_json = $state(String(phase?.explainer_json || ''));

	// Drift (deferred, but include fields)
	let drift_enabled = $state(Number(phase?.drift_enabled ?? 0));
	let drift_review_days = $state(Number(phase?.drift_review_days ?? 14));
	let drift_step_kcal = $state(Number(phase?.drift_step_kcal ?? 50));
	let drift_band_kg = $state(Number(phase?.drift_band_kg ?? 1));
	let drift_floor_kcal = $state(Number(phase?.drift_floor_kcal ?? 1200));

	let saving = $state(false);

	async function save() {
		const k = key.trim().toLowerCase().replace(/\s+/g, '_');
		const n = name.trim();
		if (!k || !n) { toast('Key and name required', true); return; }
		saving = true;
		try {
			const payload: Record<string, unknown> = {
				key: k, name: n, program_id: programId,
				sort_order, color, is_program,
				inherits_rules_from: inherits_rules_from || null,
				duration_default: duration_default || null,
				duration_col: duration_col || null,
				calorie_mode, target_mode,
				calorie_cut: calorie_cut || null,
				ramp_from: ramp_from || null,
				ramp_days: ramp_days || null,
				ramp_pct: ramp_pct || null,
				calorie_bank, bank_window,
				bank_clamp_lo, bank_clamp_hi,
				bank_grace_days, weekly_tolerance,
				weight_goal: weight_goal || null,
				weight_goal_rate: weight_goal_rate || null,
				use_buckets, gate_fat, gate_carb,
				requires_serum, has_fasting,
				show_in_phase_bar, show_in_recipe_chips,
				food_rule_line: food_rule_line || null,
				fitness_intro: fitness_intro || null,
				explainer_json: explainer_json || null,
				drift_enabled, drift_review_days,
				drift_step_kcal, drift_band_kg, drift_floor_kcal,
			};

			// On existing phase, send _original_key so API rejects key rename
			if (!isNew) {
				payload._original_key = phase!.key;
			}

			const res = await adminApi<{ ok?: boolean; error?: string }>('admin_phase_save', payload);
			if (res.error) { toast(res.error, true); return; }
			toast(isNew ? 'Phase created' : 'Phase saved');
			onDone();
		} catch (e: unknown) {
			toast('Error: ' + (e instanceof Error ? e.message : ''), true);
		} finally {
			saving = false;
		}
	}
</script>

<div class="editor-overlay" onclick={onCancel}>
	<div class="editor" onclick|stopPropagation>
		<div class="editor-header">
			<h2>{isNew ? 'New Phase' : `Edit: ${phase?.key}`}</h2>
			<button class="close-btn" onclick={onCancel}>&times;</button>
		</div>

		<div class="editor-body">
			<!-- Identity -->
			<fieldset>
				<legend>Identity</legend>
				<div class="fg">
					<label>
						<span>Key {isNew ? '' : '(locked)'}</span>
						<input type="text" bind:value={key} disabled={!isNew} class:locked={!isNew} />
					</label>
					<label>
						<span>Name</span>
						<input type="text" bind:value={name} />
					</label>
					<label>
						<span>Color</span>
						<input type="color" bind:value={color} />
					</label>
					<label>
						<span>Sort order</span>
						<input type="number" bind:value={sort_order} />
					</label>
				</div>
				<div class="fg">
					<label class="check">
						<input type="checkbox" bind:checked={is_program} /> Is program phase
					</label>
					<label>
						<span>Inherits rules from</span>
						<input type="text" bind:value={inherits_rules_from} placeholder="e.g. stabilization" />
					</label>
				</div>
			</fieldset>

			<!-- Duration -->
			<fieldset>
				<legend>Duration</legend>
				<div class="fg">
					<label>
						<span>Default days</span>
						<input type="number" bind:value={duration_default} />
					</label>
					<label>
						<span>Duration column</span>
						<input type="text" bind:value={duration_col} placeholder="e.g. loading_days" />
					</label>
				</div>
			</fieldset>

			<!-- Calorie Strategy -->
			<fieldset>
				<legend>Calorie Strategy</legend>
				<div class="fg">
					<label>
						<span>Calorie mode</span>
						<select bind:value={calorie_mode}>
							<option value="bar">bar</option>
							<option value="none">none</option>
							<option value="range">range</option>
						</select>
					</label>
					<label>
						<span>Target mode</span>
						<select bind:value={target_mode}>
							<option value="tdee_mult">tdee_mult</option>
							<option value="ramp_then_hold">ramp_then_hold</option>
							<option value="fixed">fixed</option>
							<option value="none">none</option>
						</select>
					</label>
					<label>
						<span>TDEE cut</span>
						<input type="number" step="0.01" bind:value={calorie_cut} />
					</label>
				</div>
				<div class="fg">
					<label>
						<span>Ramp from (kcal)</span>
						<input type="number" bind:value={ramp_from} />
					</label>
					<label>
						<span>Ramp days</span>
						<input type="number" bind:value={ramp_days} />
					</label>
					<label>
						<span>Ramp % (JSON)</span>
						<input type="text" bind:value={ramp_pct} placeholder='[0.5, 0.7, 1.0]' />
					</label>
				</div>
			</fieldset>

			<!-- Bank Config -->
			<fieldset>
				<legend>Bank Config</legend>
				<div class="fg">
					<label class="check">
						<input type="checkbox" bind:checked={calorie_bank} /> Calorie bank enabled
					</label>
				</div>
				{#if calorie_bank}
					<div class="fg">
						<label>
							<span>Window (days)</span>
							<input type="number" bind:value={bank_window} />
						</label>
						<label>
							<span>Clamp low</span>
							<input type="number" step="0.01" bind:value={bank_clamp_lo} />
						</label>
						<label>
							<span>Clamp high</span>
							<input type="number" step="0.01" bind:value={bank_clamp_hi} />
						</label>
					</div>
					<div class="fg">
						<label>
							<span>Grace days</span>
							<input type="number" bind:value={bank_grace_days} />
						</label>
						<label>
							<span>Weekly tolerance</span>
							<input type="number" step="0.01" bind:value={weekly_tolerance} />
						</label>
					</div>
				{/if}
			</fieldset>

			<!-- Weight Goal -->
			<fieldset>
				<legend>Weight Goal (drift, deferred)</legend>
				<div class="fg">
					<label>
						<span>Goal</span>
						<select bind:value={weight_goal}>
							<option value="">none</option>
							<option value="lose">lose</option>
							<option value="gain">gain</option>
							<option value="maintain">maintain</option>
						</select>
					</label>
					<label>
						<span>Rate (kg/week)</span>
						<input type="number" step="0.1" bind:value={weight_goal_rate} />
					</label>
				</div>
				<div class="fg">
					<label class="check">
						<input type="checkbox" bind:checked={drift_enabled} /> Drift enabled
					</label>
					<label>
						<span>Review days</span>
						<input type="number" bind:value={drift_review_days} />
					</label>
					<label>
						<span>Step kcal</span>
						<input type="number" bind:value={drift_step_kcal} />
					</label>
					<label>
						<span>Band kg</span>
						<input type="number" step="0.1" bind:value={drift_band_kg} />
					</label>
					<label>
						<span>Floor kcal</span>
						<input type="number" bind:value={drift_floor_kcal} />
					</label>
				</div>
			</fieldset>

			<!-- Rules -->
			<fieldset>
				<legend>Rules</legend>
				<div class="fg">
					<label class="check"><input type="checkbox" bind:checked={use_buckets} /> Use food buckets</label>
					<label class="check"><input type="checkbox" bind:checked={gate_fat} /> Gate fat</label>
					<label class="check"><input type="checkbox" bind:checked={gate_carb} /> Gate carb</label>
					<label class="check"><input type="checkbox" bind:checked={requires_serum} /> Requires serum</label>
					<label class="check"><input type="checkbox" bind:checked={has_fasting} /> Has fasting</label>
				</div>
			</fieldset>

			<!-- Display -->
			<fieldset>
				<legend>Display</legend>
				<div class="fg">
					<label class="check"><input type="checkbox" bind:checked={show_in_phase_bar} /> Show in phase bar</label>
					<label class="check"><input type="checkbox" bind:checked={show_in_recipe_chips} /> Show in recipe chips</label>
				</div>
				<div class="fg">
					<label class="wide">
						<span>Food rule line</span>
						<input type="text" bind:value={food_rule_line} />
					</label>
				</div>
				<div class="fg">
					<label class="wide">
						<span>Fitness intro</span>
						<input type="text" bind:value={fitness_intro} />
					</label>
				</div>
				<div class="fg">
					<label class="wide">
						<span>Explainer JSON</span>
						<textarea bind:value={explainer_json} rows="3" placeholder='[{{"title":"...","body":"..."}}]'></textarea>
					</label>
				</div>
			</fieldset>
		</div>

		<div class="editor-footer">
			<button class="btn btn-outline" onclick={onCancel}>Cancel</button>
			<button class="btn btn-primary" onclick={save} disabled={saving}>
				{saving ? 'Saving...' : isNew ? 'Create Phase' : 'Save Phase'}
			</button>
		</div>
	</div>
</div>

<style>
	.editor-overlay {
		position: fixed; inset: 0; z-index: 100;
		background: rgba(0,0,0,0.4);
		display: flex; align-items: center; justify-content: center;
		padding: 20px;
	}
	.editor {
		background: var(--paper, #FBFAF7);
		border-radius: 14px;
		width: 100%; max-width: 720px; max-height: 90vh;
		display: flex; flex-direction: column;
		box-shadow: 0 8px 32px rgba(0,0,0,0.2);
	}
	.editor-header {
		display: flex; align-items: center; justify-content: space-between;
		padding: 16px 20px; border-bottom: 1px solid var(--line);
	}
	h2 { font-size: 16px; font-weight: 600; margin: 0; }
	.close-btn { font-size: 20px; background: none; border: none; cursor: pointer; color: var(--muted); padding: 0 4px; }

	.editor-body {
		flex: 1; overflow-y: auto; padding: 16px 20px;
		display: flex; flex-direction: column; gap: 16px;
	}

	fieldset {
		border: 1px solid var(--line, #e5e0d5);
		border-radius: 8px; padding: 12px 14px;
		margin: 0;
	}
	legend {
		font-size: 12px; font-weight: 600; color: var(--gold-deep, #8f6f1f);
		text-transform: uppercase; letter-spacing: 0.06em; padding: 0 6px;
	}
	.fg { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
	.fg:last-child { margin-bottom: 0; }
	.fg label { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 120px; }
	.fg label.wide { flex: 3; min-width: 200px; }
	.fg label.check { flex-direction: row; align-items: center; gap: 6px; font-size: 13px; min-width: auto; }
	.fg label span { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }

	input[type="text"], input[type="number"], select, textarea {
		padding: 6px 8px; border: 1px solid var(--line); border-radius: 5px;
		font-size: 13px; font-family: inherit; background: var(--card, #fff);
	}
	input[type="color"] { width: 36px; height: 28px; border: 1px solid var(--line); border-radius: 5px; cursor: pointer; padding: 2px; }
	input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--gold); }
	textarea { resize: vertical; font-size: 12px; font-family: monospace; }

	input.locked { background: #f0ece4; color: var(--muted); cursor: not-allowed; }

	.editor-footer {
		display: flex; justify-content: flex-end; gap: 10px;
		padding: 14px 20px; border-top: 1px solid var(--line);
	}

	.btn { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; }
	.btn-primary { background: var(--gold); color: var(--ink); }
	.btn-outline { border: 1px solid var(--line); color: var(--ink-soft); background: transparent; }
	.btn:hover { opacity: .85; }
	.btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
