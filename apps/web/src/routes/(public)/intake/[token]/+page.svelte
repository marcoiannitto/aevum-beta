<!--
  Intake Form — 6-screen onboarding wizard.
  Token-based access, auto-save, validation, consent, completion.
  Migrated from intake.html.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { BACKEND_URL } from '$lib/api/client';

	const token = $derived(page.params.token);

	// ── State machine ──
	type State = 'loading' | 'expired' | 'invalid' | 'submitted' | 'form';
	let viewState = $state<State>('loading');
	let screen = $state(0);
	let submitting = $state(false);
	let toastMsg = $state('');
	let toastErr = $state(false);
	let toastVisible = $state(false);

	// ── Prefill (Part A from consultation) ──
	let prefill = $state<Record<string, string>>({});

	// ── Form data ──
	const DIET_OPTIONS = ['Vegetarian','Vegan','Halal','No pork','No beef','No shellfish','No nuts','Gluten-free','Other'];
	const DELIVERY_SLOTS = [
		{ id: 'early', label: 'Early (8am–11am)' },
		{ id: 'mid', label: 'Mid (11am–2pm)' },
		{ id: 'late', label: 'Late (2pm–6pm)' }
	];

	let selectedDiet = $state<string[]>([]);
	let dislikes = $state('');
	let selectedSlots = $state<string[]>([]);
	let exercise = $state('');
	let travelOn = $state(false);
	let travelFrom = $state('');
	let travelTo = $state('');
	let allergyOn = $state(false);
	let allergies = $state('');
	let medsOn = $state(false);
	let medications = $state('');
	let medicalOn = $state(false);
	let medicalConditions = $state('');
	let pregnantOn = $state(false);
	let scanDates = $state<string[]>(['','','','','']);
	let scanTime = $state('');
	let consent = $state(false);
	let ageConfirm = $state(false);
	let testimonial = $state(false);

	// ── Validation errors ──
	let errors = $state<Record<string, string>>({});

	// ── Computed ──
	const progress = $derived(Math.round((screen / 5) * 100));
	const progressLabel = $derived(screen === 0 ? 'Review' : `Step ${screen} of 5`);
	const tomorrow = $derived(() => {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		return d.toISOString().split('T')[0];
	});

	// ── Helpers ──
	function formatDate(d: string): string {
		if (!d) return '';
		try {
			const dt = new Date(d + 'T00:00:00');
			return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
		} catch { return d; }
	}

	function cleanPhone(p: string): string {
		return (p || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
	}

	function toast(msg: string, err = false) {
		toastMsg = msg;
		toastErr = err;
		toastVisible = true;
		setTimeout(() => { toastVisible = false; }, 3000);
	}

	function toggleDiet(opt: string) {
		if (selectedDiet.includes(opt)) {
			selectedDiet = selectedDiet.filter(d => d !== opt);
		} else {
			selectedDiet = [...selectedDiet, opt];
		}
	}

	function toggleSlot(id: string) {
		if (selectedSlots.includes(id)) {
			selectedSlots = selectedSlots.filter(s => s !== id);
		} else {
			selectedSlots = [...selectedSlots, id];
		}
		errors = { ...errors, delivery: '' };
	}

	function collectResponse(): Record<string, unknown> {
		return {
			food_preferences: selectedDiet,
			dislikes,
			delivery_times: selectedSlots,
			exercise,
			travel_planned: travelOn,
			travel_from: travelFrom,
			travel_to: travelTo,
			has_allergies: allergyOn,
			allergies,
			has_medications: medsOn,
			medications,
			has_medical_conditions: medicalOn,
			medical_conditions: medicalConditions,
			pregnant: pregnantOn,
			scan_dates: scanDates.filter(d => d && new Date(d) > new Date()),
			scan_time: scanTime,
			consent,
			age_confirm: ageConfirm,
			testimonial
		};
	}

	function restoreResponse(r: Record<string, unknown>) {
		if (!r) return;
		if (Array.isArray(r.food_preferences)) selectedDiet = r.food_preferences as string[];
		if (r.dislikes) dislikes = r.dislikes as string;
		if (Array.isArray(r.delivery_times)) selectedSlots = r.delivery_times as string[];
		else if (r.delivery_time) selectedSlots = [r.delivery_time as string];
		if (r.exercise) exercise = r.exercise as string;
		if (r.travel_planned) travelOn = true;
		if (r.travel_from) travelFrom = r.travel_from as string;
		if (r.travel_to) travelTo = r.travel_to as string;
		if (r.has_allergies) allergyOn = true;
		if (r.allergies) allergies = r.allergies as string;
		if (r.has_medications) medsOn = true;
		if (r.medications) medications = r.medications as string;
		if (r.has_medical_conditions) medicalOn = true;
		if (r.medical_conditions) medicalConditions = r.medical_conditions as string;
		if (r.pregnant) pregnantOn = true;
		if (Array.isArray(r.scan_dates)) {
			const sd = r.scan_dates as string[];
			scanDates = [sd[0]||'', sd[1]||'', sd[2]||'', sd[3]||'', sd[4]||''];
		}
		if (r.scan_time) scanTime = r.scan_time as string;
		if (r.consent) consent = true;
		if (r.age_confirm) ageConfirm = true;
		if (r.testimonial) testimonial = true;
	}

	// ── Navigation ──
	function goTo(s: number) {
		errors = {};
		screen = s;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function advance(fromScreen: number) {
		errors = {};
		let valid = true;

		if (fromScreen === 1) {
			if (selectedSlots.length === 0) {
				errors = { ...errors, delivery: 'Please select a delivery time' };
				valid = false;
			}
		}
		if (fromScreen === 2) {
			if (!exercise) {
				errors = { ...errors, exercise: 'Please select an option' };
				valid = false;
			}
		}
		if (fromScreen === 4) {
			const validDates = scanDates.filter(d => d && new Date(d) > new Date());
			if (validDates.length === 0) {
				errors = { ...errors, scanDate: 'Please select at least one future date' };
				valid = false;
			}
			if (!scanTime) {
				errors = { ...errors, scanTime: 'Please select a time range' };
				valid = false;
			}
		}
		if (!valid) return;

		autoSave(fromScreen + 1);
		goTo(fromScreen + 1);
	}

	// ── Auto-save ──
	let saving = false;
	async function autoSave(step: number) {
		if (saving) return;
		saving = true;
		try {
			await fetch(`${BACKEND_URL}/intake/${token}/save`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ response: collectResponse(), current_step: step })
			});
		} catch { /* noop */ }
		saving = false;
	}

	// ── Submit ──
	async function submitForm() {
		if (!consent) { toast('Please confirm the statement above', true); return; }
		if (!ageConfirm) { toast('Please confirm you are 18 or older', true); return; }

		submitting = true;
		try {
			const res = await fetch(`${BACKEND_URL}/intake/${token}/submit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ response: collectResponse() })
			});
			const data = await res.json();
			if (!res.ok) {
				toast(data.error || 'Something went wrong. Please try again.', true);
				submitting = false;
				return;
			}
			screen = 6; // done
		} catch {
			toast('Network error. Please check your connection and try again.', true);
			submitting = false;
		}
	}

	// ── Init ──
	onMount(async () => {
		try {
			const res = await fetch(`${BACKEND_URL}/intake/${token}`);
			const data = await res.json();
			if (!res.ok) {
				viewState = res.status === 410 ? 'expired' : 'invalid';
				return;
			}
			if (data.submitted) { viewState = 'submitted'; return; }

			prefill = data.prefill || {};
			restoreResponse(data.response || {});
			screen = data.current_step || 0;
			viewState = 'form';
		} catch {
			viewState = 'invalid';
		}
	});

	// ── Summary rows ──
	const summaryRows = $derived([
		['Name', prefill.full_name],
		['Email', prefill.email],
		['Date of birth', formatDate(prefill.dob || '')],
		['Weight', prefill.weight ? prefill.weight + ' kg' : ''],
		['Height', prefill.height ? prefill.height + ' cm' : ''],
		['Delivery address', prefill.address],
		['Postal code', prefill.postal_code],
	].filter(([, v]) => v) as [string, string][]);
</script>

<svelte:head>
	<title>AEVUM Intake</title>
	<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400&family=Cinzel:wght@400;600&display=swap" rel="stylesheet">
</svelte:head>

<div class="container">

	<!-- State screens -->
	{#if viewState === 'loading'}
		<div class="state-screen">
			<div class="brand"><h1>AEVUM</h1><div class="brand-sub">The science of balance</div></div>
			<div class="loader"><div class="spinner"></div><p>Loading your form…</p></div>
		</div>

	{:else if viewState === 'expired'}
		<div class="state-screen">
			<div class="brand"><h1>AEVUM</h1><div class="brand-sub">The science of balance</div></div>
			<h2>Link Expired</h2>
			<p>This link has expired. Please contact Marco to get a new one.</p>
			<a class="wa-link" href="https://wa.me/6591234567">Message Marco on WhatsApp</a>
		</div>

	{:else if viewState === 'invalid'}
		<div class="state-screen">
			<div class="brand"><h1>AEVUM</h1><div class="brand-sub">The science of balance</div></div>
			<h2>Link Not Found</h2>
			<p>This link is invalid. If you think this is an error, please contact Marco.</p>
		</div>

	{:else if viewState === 'submitted'}
		<div class="state-screen">
			<div class="brand"><h1>AEVUM</h1><div class="brand-sub">The science of balance</div></div>
			<h2>Already Submitted</h2>
			<p>You've already completed your onboarding form. Need to change something?</p>
			<a class="wa-link" href="https://wa.me/6591234567">Message Marco on WhatsApp</a>
		</div>

	{:else if viewState === 'form'}
		<div class="brand"><h1>AEVUM</h1><div class="brand-sub">The science of balance</div></div>

		<!-- Progress -->
		{#if screen <= 5}
			<div class="progress-wrap">
				<div class="progress-bar"><div class="progress-fill" style="width:{progress}%"></div></div>
				<div class="progress-label">{progressLabel}</div>
			</div>
			<p class="privacy-note">Your information is stored securely and used only to deliver your AEVUM program. We do not share your data with third parties.</p>
		{:else}
			<div class="progress-wrap">
				<div class="progress-bar"><div class="progress-fill" style="width:100%"></div></div>
				<div class="progress-label">Complete</div>
			</div>
		{/if}

		<!-- Screen 0: Summary -->
		{#if screen === 0}
			<div class="screen">
				<h3 class="screen-title">Here's what we discussed.</h3>
				<p class="screen-subtitle">Review the details from your consultation. If anything looks off, let Marco know.</p>

				<div class="summary-card">
					<h2>Your consultation summary</h2>
					{#each summaryRows as [label, val]}
						<div class="summary-row"><span class="summary-label">{label}</span><span class="summary-value">{val}</span></div>
					{/each}
					{#if prefill.goals}
						<div class="summary-goals">
							<span class="summary-label">Goals</span>
							<span class="summary-value">{prefill.goals}</span>
						</div>
					{/if}
					<div class="summary-note">
						<a href="https://wa.me/{cleanPhone(prefill.phone || '')}?text={encodeURIComponent("Hi Marco, something on my onboarding form doesn't look right.")}">
							Something's not right? Let Marco know
						</a>
					</div>
				</div>

				<div class="btn-row">
					<button class="btn btn-primary" onclick={() => goTo(1)}>Looks good, let's go</button>
				</div>
			</div>

		<!-- Screen 1: Food & Schedule -->
		{:else if screen === 1}
			<div class="screen">
				<h3 class="screen-title">Your food and schedule.</h3>
				<p class="screen-subtitle">Help us tailor your meals. This takes about 5 minutes.</p>

				<div class="field">
					<label>Any dietary preferences or restrictions?</label>
					<div class="chips">
						{#each DIET_OPTIONS as opt}
							<button class="chip" class:selected={selectedDiet.includes(opt)} onclick={() => toggleDiet(opt)}>{opt}</button>
						{/each}
					</div>
				</div>

				<div class="field">
					<label for="dislikes">Foods you dislike or want us to avoid</label>
					<textarea id="dislikes" bind:value={dislikes} placeholder="e.g. mushrooms, celery, blue cheese…" rows="2"></textarea>
				</div>

				<div class="field" class:has-error={errors.delivery}>
					<label>When would you like your meals delivered?</label>
					<div class="slots">
						{#each DELIVERY_SLOTS as s}
							<button class="slot" class:selected={selectedSlots.includes(s.id)} onclick={() => toggleSlot(s.id)}>{s.label}</button>
						{/each}
					</div>
					{#if errors.delivery}<div class="error">{errors.delivery}</div>{/if}
				</div>

				<div class="btn-row">
					<button class="btn btn-back" onclick={() => goTo(0)}>Back</button>
					<button class="btn btn-primary" onclick={() => advance(1)}>Continue</button>
				</div>
			</div>

		<!-- Screen 2: Lifestyle -->
		{:else if screen === 2}
			<div class="screen">
				<h3 class="screen-title">Your lifestyle.</h3>
				<p class="screen-subtitle">A couple of quick questions so we can adjust your plan.</p>

				<div class="field" class:has-error={errors.exercise}>
					<label for="exercise">Do you exercise regularly?</label>
					<select id="exercise" bind:value={exercise} onchange={() => { errors = { ...errors, exercise: '' }; }}>
						<option value="">Select…</option>
						<option value="none">No</option>
						<option value="light">Light (1–2x/week)</option>
						<option value="moderate">Moderate (3–4x/week)</option>
						<option value="intense">Intense (5+/week)</option>
					</select>
					{#if errors.exercise}<div class="error">{errors.exercise}</div>{/if}
				</div>

				<div class="toggle-group">
					<div class="toggle-row">
						<span class="toggle-label">Any travel planned in the next 5 weeks?</span>
						<button class="toggle" class:on={travelOn} onclick={() => { travelOn = !travelOn; }}></button>
					</div>
					{#if travelOn}
						<div class="toggle-detail open">
							<input type="date" bind:value={travelFrom} placeholder="From">
							<input type="date" bind:value={travelTo} placeholder="To">
						</div>
					{/if}
				</div>

				<div class="btn-row">
					<button class="btn btn-back" onclick={() => goTo(1)}>Back</button>
					<button class="btn btn-primary" onclick={() => advance(2)}>Continue</button>
				</div>
			</div>

		<!-- Screen 3: Health Check -->
		{:else if screen === 3}
			<div class="screen">
				<h3 class="screen-title">Health check.</h3>
				<p class="screen-subtitle">We need to know a few things to keep you safe on the program.</p>

				<div class="toggle-group">
					<div class="toggle-row">
						<span class="toggle-label">Do you have any allergies or food intolerances?</span>
						<button class="toggle" class:on={allergyOn} onclick={() => { allergyOn = !allergyOn; }}></button>
					</div>
					{#if allergyOn}
						<div class="toggle-detail open">
							<textarea bind:value={allergies} placeholder="Please describe…" rows="2"></textarea>
						</div>
					{/if}
				</div>

				<div class="toggle-group">
					<div class="toggle-row">
						<span class="toggle-label">Are you currently taking any medications?</span>
						<button class="toggle" class:on={medsOn} onclick={() => { medsOn = !medsOn; }}></button>
					</div>
					{#if medsOn}
						<div class="toggle-detail open">
							<textarea bind:value={medications} placeholder="Please list…" rows="2"></textarea>
						</div>
					{/if}
				</div>

				<div class="toggle-group">
					<div class="toggle-row">
						<span class="toggle-label">Do you have any medical conditions we should know about?</span>
						<button class="toggle" class:on={medicalOn} onclick={() => { medicalOn = !medicalOn; }}></button>
					</div>
					{#if medicalOn}
						<div class="toggle-detail open">
							<textarea bind:value={medicalConditions} placeholder="Please describe…" rows="2"></textarea>
						</div>
					{/if}
				</div>

				<div class="toggle-group">
					<div class="toggle-row">
						<span class="toggle-label">Are you pregnant or breastfeeding?</span>
						<button class="toggle" class:on={pregnantOn} onclick={() => { pregnantOn = !pregnantOn; }}></button>
					</div>
				</div>

				<div class="btn-row">
					<button class="btn btn-back" onclick={() => goTo(2)}>Back</button>
					<button class="btn btn-primary" onclick={() => advance(3)}>Continue</button>
				</div>
			</div>

		<!-- Screen 4: Getting Started -->
		{:else if screen === 4}
			<div class="screen">
				<h3 class="screen-title">Getting started.</h3>
				<p class="screen-subtitle">Pick up to 5 preferred dates for your InBody scan so we can set your baseline.</p>

				<div class="field" class:has-error={errors.scanDate}>
					<label>Preferred dates * (at least 1)</label>
					{#each [0,1,2,3,4] as i}
						<input type="date" bind:value={scanDates[i]} min={tomorrow()} style={i > 0 ? 'margin-top:8px' : ''}>
					{/each}
					{#if errors.scanDate}<div class="error">{errors.scanDate}</div>{/if}
				</div>

				<div class="field" class:has-error={errors.scanTime}>
					<label for="scanTime">Preferred time range *</label>
					<select id="scanTime" bind:value={scanTime} onchange={() => { errors = { ...errors, scanTime: '' }; }}>
						<option value="">Select…</option>
						<option value="8-10">8am – 10am</option>
						<option value="10-12">10am – 12pm</option>
						<option value="12-3">12pm – 3pm</option>
						<option value="3-5">3pm – 5pm</option>
					</select>
					{#if errors.scanTime}<div class="error">{errors.scanTime}</div>{/if}
				</div>

				<div class="btn-row">
					<button class="btn btn-back" onclick={() => goTo(3)}>Back</button>
					<button class="btn btn-primary" onclick={() => advance(4)}>Continue</button>
				</div>
			</div>

		<!-- Screen 5: Consent -->
		{:else if screen === 5}
			<div class="screen">
				<h3 class="screen-title">Almost done.</h3>
				<p class="screen-subtitle">Please review and confirm.</p>

				<div class="consent-text">
					By confirming below, I, <strong>{prefill.full_name || ''}</strong>, confirm that this information is accurate, I understand AEVUM is a wellness program (not medical treatment), and I'm happy for my anonymized results to be shared.
				</div>

				<label class="check-row">
					<input type="checkbox" bind:checked={consent}>
					<span>I confirm the above statement</span>
				</label>

				<label class="check-row">
					<input type="checkbox" bind:checked={ageConfirm}>
					<span>I confirm I am 18 or older</span>
				</label>

				<label class="check-row" style="border-top:1px solid var(--line-soft);padding-top:16px;margin-top:8px">
					<input type="checkbox" bind:checked={testimonial}>
					<span>I'd also be happy to share my experience as a testimonial (optional)</span>
				</label>

				<div class="btn-row">
					<button class="btn btn-back" onclick={() => goTo(4)}>Back</button>
					<button class="btn btn-submit" disabled={submitting} onclick={submitForm}>
						{submitting ? 'Submitting…' : 'Submit'}
					</button>
				</div>
			</div>

		<!-- Done -->
		{:else if screen === 6}
			<div class="screen">
				<div class="done-icon">✓</div>
				<h3 class="screen-title" style="text-align:center">You're in, {(prefill.full_name || '').split(' ')[0]}.</h3>
				<p class="screen-subtitle" style="text-align:center">Here's what happens next.</p>

				<ol class="done-steps">
					<li>Marco books your InBody scan (within 24h)</li>
					<li>Your personalized menu gets built (3 days)</li>
					<li>Your kit ships</li>
					<li>Day 1</li>
				</ol>

				<div class="done-note">Keep an eye on WhatsApp.</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Toast -->
<div class="toast" class:show={toastVisible} class:err={toastErr}>{toastMsg}</div>

<style>
	:global(body) { background: var(--paper, #FBFAF7); }

	.container {
		max-width: 560px;
		margin: 0 auto;
		padding: 24px 16px 60px;
		min-height: 100vh;
	}

	/* Brand */
	.brand { text-align: center; padding: 32px 0 8px; }
	.brand h1 {
		font-family: 'Cinzel Decorative', serif;
		font-size: 28px; font-weight: 400;
		letter-spacing: 6px; color: var(--ink, #1A1A1A);
	}
	.brand-sub {
		font-family: 'Cinzel', serif;
		font-size: 12px; letter-spacing: 3px;
		color: var(--muted, #938c7d);
		text-transform: uppercase; margin-top: 4px;
	}

	/* State screens */
	.state-screen { text-align: center; padding: 60px 16px; }
	.state-screen h2 {
		font-family: 'Cinzel', serif;
		font-size: 22px; font-weight: 400; margin-bottom: 12px;
	}
	.state-screen p { color: var(--muted); font-size: 15px; line-height: 1.5; }
	.wa-link { display: inline-block; margin-top: 24px; color: var(--gold); font-size: 15px; text-decoration: none; }
	.loader { margin-top: 40px; }
	.spinner {
		width: 32px; height: 32px;
		border: 2px solid var(--line, #EBE5D8);
		border-top-color: var(--gold, #B08D2E);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin: 0 auto 20px;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* Progress */
	.progress-wrap { margin: 24px 0 32px; display: flex; align-items: center; gap: 8px; }
	.progress-bar { flex: 1; height: 2px; background: var(--line); border-radius: 1px; overflow: hidden; }
	.progress-fill { height: 100%; background: var(--gold); transition: width 0.4s ease; border-radius: 1px; }
	.progress-label { font-size: 12px; color: var(--muted); white-space: nowrap; }
	.privacy-note { font-size: 13px; color: var(--muted); text-align: center; line-height: 1.5; margin-bottom: 28px; padding: 0 8px; }

	/* Screen animation */
	.screen { animation: fadeIn 0.35s ease; }
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* Screen titles */
	.screen-title {
		font-family: 'Cinzel', serif;
		font-size: 20px; font-weight: 400;
		color: var(--ink); margin-bottom: 6px;
	}
	.screen-subtitle { font-size: 14px; color: var(--muted); margin-bottom: 28px; line-height: 1.5; }

	/* Summary card */
	.summary-card {
		background: var(--card, #fff);
		border: 1px solid var(--line); border-radius: 12px;
		padding: 28px 24px; margin-bottom: 24px;
	}
	.summary-card h2 {
		font-family: 'Cinzel', serif;
		font-size: 18px; font-weight: 400;
		margin-bottom: 20px;
	}
	.summary-row {
		display: flex; justify-content: space-between;
		padding: 10px 0; border-bottom: 1px solid var(--line-soft, #F2EDE2);
		font-size: 15px;
	}
	.summary-row:last-child { border-bottom: none; }
	.summary-label { color: var(--muted); flex-shrink: 0; margin-right: 16px; }
	.summary-value { color: var(--ink); text-align: right; word-break: break-word; }
	.summary-goals { padding: 12px 0 0; font-size: 15px; line-height: 1.5; }
	.summary-goals .summary-label { display: block; margin-bottom: 6px; }
	.summary-goals .summary-value { text-align: left; }
	.summary-note { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line-soft); text-align: center; }
	.summary-note a { color: var(--gold); text-decoration: none; font-size: 14px; }

	/* Form fields */
	.field { margin-bottom: 24px; }
	.field label { display: block; font-size: 14px; font-weight: 500; color: var(--ink-soft, #4a463f); margin-bottom: 8px; }
	.field input, .field textarea, .field select {
		width: 100%; padding: 14px 16px;
		border: 1px solid var(--line); border-radius: 8px;
		font-size: 16px; color: var(--ink);
		background: var(--card, #fff);
		transition: border-color 0.2s; font-family: inherit;
	}
	.field input:focus, .field textarea:focus, .field select:focus { outline: none; border-color: var(--gold); }
	.field textarea { resize: vertical; min-height: 80px; }
	.field.has-error input, .field.has-error textarea, .field.has-error select { border-color: var(--red, #c0392b); }
	.error { font-size: 13px; color: var(--red, #c0392b); margin-top: 6px; }

	/* Chips */
	.chips { display: flex; flex-wrap: wrap; gap: 8px; }
	.chip {
		padding: 10px 16px; border: 1px solid var(--line);
		border-radius: 24px; font-size: 14px;
		color: var(--ink-soft); background: var(--card, #fff);
		cursor: pointer; transition: all 0.2s;
		min-height: 44px; display: flex; align-items: center;
		font-family: inherit;
	}
	.chip.selected { background: var(--ink, #1A1A1A); color: #fff; border-color: var(--ink); }
	.chip:active { transform: scale(0.96); }

	/* Slots */
	.slots { display: flex; flex-direction: column; gap: 8px; }
	.slot {
		padding: 16px; border: 1px solid var(--line);
		border-radius: 10px; font-size: 15px;
		color: var(--ink); background: var(--card, #fff);
		cursor: pointer; transition: all 0.2s;
		text-align: center; min-height: 44px;
		display: flex; align-items: center; justify-content: center;
		font-family: inherit;
	}
	.slot.selected {
		border-color: var(--gold);
		background: rgba(176, 141, 46, 0.06);
		font-weight: 500;
	}
	.slot:active { transform: scale(0.98); }

	/* Toggles */
	.toggle-group { margin-bottom: 20px; }
	.toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; }
	.toggle-label { font-size: 15px; color: var(--ink); flex: 1; padding-right: 16px; line-height: 1.4; }
	.toggle {
		width: 48px; height: 28px; border-radius: 14px;
		background: var(--line); cursor: pointer;
		position: relative; flex-shrink: 0;
		transition: background 0.2s; border: none;
	}
	.toggle.on { background: var(--gold); }
	.toggle::after {
		content: ''; position: absolute;
		width: 22px; height: 22px; border-radius: 50%;
		background: white; top: 3px; left: 3px;
		transition: transform 0.2s;
		box-shadow: 0 1px 3px rgba(0,0,0,0.15);
	}
	.toggle.on::after { transform: translateX(20px); }
	.toggle-detail { margin-top: 8px; }
	.toggle-detail input, .toggle-detail textarea {
		width: 100%; padding: 12px 16px;
		border: 1px solid var(--line); border-radius: 8px;
		font-size: 16px; color: var(--ink);
		background: var(--card, #fff); margin-bottom: 8px; font-family: inherit;
	}
	.toggle-detail input:focus, .toggle-detail textarea:focus { outline: none; border-color: var(--gold); }
	.toggle-detail textarea { resize: vertical; min-height: 60px; }

	/* Consent */
	.consent-text {
		font-size: 15px; line-height: 1.6;
		color: var(--ink-soft); background: var(--card, #fff);
		border: 1px solid var(--line); border-radius: 10px;
		padding: 20px; margin-bottom: 24px;
	}
	.check-row {
		display: flex; align-items: flex-start; gap: 12px;
		padding: 12px 0; cursor: pointer;
	}
	.check-row input[type="checkbox"] {
		width: 22px; height: 22px; margin-top: 1px;
		flex-shrink: 0; accent-color: var(--gold); cursor: pointer;
	}
	.check-row span { font-size: 15px; color: var(--ink); line-height: 1.4; }

	/* Buttons */
	.btn-row { display: flex; gap: 12px; margin-top: 32px; }
	.btn {
		flex: 1; padding: 16px; border: none;
		border-radius: 10px; font-size: 16px; font-weight: 500;
		cursor: pointer; min-height: 52px;
		transition: all 0.2s; font-family: inherit;
	}
	.btn-primary { background: var(--ink, #1A1A1A); color: white; }
	.btn-primary:hover { background: #2a2a2a; }
	.btn-primary:disabled { background: var(--line); color: var(--muted); cursor: not-allowed; }
	.btn-back {
		background: transparent; color: var(--muted);
		border: 1px solid var(--line);
		flex: 0 0 auto; padding: 16px 24px;
	}
	.btn-back:hover { background: var(--line-soft); }
	.btn-submit { background: var(--gold); color: white; }
	.btn-submit:hover { background: var(--gold-deep, #8f6f1f); }
	.btn-submit:disabled { background: var(--line); color: var(--muted); cursor: not-allowed; }

	/* Done */
	.done-icon { text-align: center; margin-bottom: 24px; font-size: 48px; color: var(--gold); }
	.done-steps { list-style: none; counter-reset: step; padding: 0; }
	.done-steps li {
		counter-increment: step;
		padding: 12px 0 12px 36px;
		position: relative; font-size: 15px;
		color: var(--ink-soft); line-height: 1.5;
	}
	.done-steps li::before {
		content: counter(step);
		position: absolute; left: 0;
		width: 24px; height: 24px; border-radius: 50%;
		background: var(--gold); color: white;
		font-size: 13px; display: flex;
		align-items: center; justify-content: center; font-weight: 600;
	}
	.done-note { margin-top: 24px; text-align: center; font-size: 14px; color: var(--muted); }

	/* Toast */
	.toast {
		position: fixed; bottom: 20px; left: 50%;
		transform: translateX(-50%) translateY(80px);
		background: var(--ink, #1A1A1A); color: white;
		padding: 12px 24px; border-radius: 8px;
		font-size: 14px; opacity: 0;
		transition: all 0.3s; z-index: 100;
		max-width: 90%; text-align: center;
	}
	.toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
	.toast.err { background: var(--red, #c0392b); }
</style>
