<svelte:head>
	<title>Health Disclaimer - AEVUM</title>
</svelte:head>

<main class="legal">
	<a class="back" href="javascript:history.back()">← Back</a>
	<h1>Health Disclaimer</h1>
	<p class="updated">Last updated: October 2026</p>

	<h2>Not medical advice</h2>
	<p>AEVUM is a wellness tracking tool designed for general information and educational purposes only. It is not a medical device, and nothing in this app constitutes medical advice, diagnosis, or treatment.</p>

	<h2>Calorie and nutrition estimates</h2>
	<p>All calorie targets, macro breakdowns, and nutritional estimates provided by this app are approximations based on standard formulas and AI-assisted analysis. They may not reflect your individual needs. Actual nutritional values may vary depending on preparation methods, portion sizes, and ingredient sources.</p>

	<h2>Consult your doctor</h2>
	<p>Before starting any dietary program, changing your eating habits, or following the targets suggested by this app, consult a qualified healthcare professional. This is especially important if you:</p>
	<ul>
		<li>Have a pre-existing medical condition</li>
		<li>Are pregnant or breastfeeding</li>
		<li>Take prescription medication</li>
		<li>Have a history of eating disorders</li>
		<li>Are under 18 years of age</li>
	</ul>

	<h2>Supplements</h2>
	<p>If your program includes supplements (such as the AEVUM serum), these are not medicines and are not intended to treat, cure, or prevent any disease. Always consult your healthcare provider before taking any supplement.</p>

	<h2>Exercise</h2>
	<p>The movement suggestions in this app are designed for generally healthy adults. If you experience dizziness, pain, shortness of breath, or any unusual symptoms during exercise, stop immediately and seek medical attention.</p>

	<h2>Assumption of risk</h2>
	<p>By using this app, you acknowledge that dietary changes and exercise carry inherent risks. You assume full responsibility for your health decisions and agree that Niramaya Pte Ltd and its affiliates are not liable for any injury, loss, or damage arising from your use of this app.</p>

	<h2>Not a substitute for professional care</h2>
	<p>This app does not replace the advice of a doctor, dietitian, or other qualified health professional. If you have concerns about your health, seek professional medical advice promptly.</p>

	<div class="foot">AEVUM by Niramaya Pte Ltd</div>
</main>

<style>
	.legal {
		max-width: 560px;
		margin: 0 auto;
		padding: 40px 20px 60px;
	}
	.back {
		display: inline-block;
		font-size: 13px;
		color: var(--gold-deep, #8f6f1f);
		text-decoration: none;
		margin-bottom: 24px;
	}
	.back:hover { text-decoration: underline; }
	h1 {
		font-family: var(--serif);
		font-size: 1.6rem;
		font-weight: 500;
		margin-bottom: 6px;
		letter-spacing: -0.01em;
	}
	.updated {
		font-size: 12px;
		color: var(--muted);
		margin-bottom: 28px;
	}
	h2 {
		font-family: var(--serif);
		font-size: 1.1rem;
		font-weight: 500;
		margin: 28px 0 10px;
	}
	p {
		margin-bottom: 14px;
		color: var(--ink-soft, #4a463f);
	}
	ul {
		margin: 0 0 14px 20px;
		color: var(--ink-soft, #4a463f);
	}
	li { margin-bottom: 6px; }
	.foot {
		margin-top: 40px;
		padding-top: 20px;
		border-top: 1px solid var(--line);
		font-size: 12px;
		color: var(--muted);
		text-align: center;
	}
</style>
