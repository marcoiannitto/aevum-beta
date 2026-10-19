<svelte:head>
	<title>Terms of Use - AEVUM</title>
</svelte:head>

<main class="legal">
	<a class="back" href="javascript:history.back()">← Back</a>
	<h1>Terms of Use</h1>
	<p class="updated">Last updated: October 2026</p>

	<h2>Acceptance</h2>
	<p>By creating an account and using the AEVUM app ("the App"), you agree to these Terms of Use, the Privacy Policy, and the Health Disclaimer. If you do not agree, do not use the App.</p>

	<h2>The service</h2>
	<p>AEVUM is a wellness tracking app operated by Niramaya Pte Ltd ("we", "us"). The App provides tools for tracking daily nutrition, weight, waist measurement, hydration, exercise, and related wellness metrics. Some features use AI to estimate calorie and macro content of meals.</p>

	<h2>Eligibility</h2>
	<p>You must be at least 18 years old to use the App. By using the App, you confirm that you meet this requirement.</p>

	<h2>Your account</h2>
	<p>You are responsible for maintaining the accuracy of the information you provide and for all activity under your account. The App stores data locally on your device and, for program participants, syncs to a cloud database.</p>

	<h2>Not medical advice</h2>
	<p>The App does not provide medical advice, diagnosis, or treatment. All calorie targets, nutritional estimates, and wellness suggestions are approximations for informational purposes only. See our <a href="/health-disclaimer">Health Disclaimer</a> for full details.</p>

	<h2>AI-generated content</h2>
	<p>Some features of the App use artificial intelligence to estimate nutritional content, suggest meals, and generate shopping lists. These are estimates and may contain inaccuracies. You should verify nutritional information independently if accuracy is important for your health.</p>

	<h2>Acceptable use</h2>
	<p>You agree not to:</p>
	<ul>
		<li>Use the App for any unlawful purpose</li>
		<li>Attempt to access other users' data</li>
		<li>Reverse-engineer, decompile, or disassemble the App</li>
		<li>Use automated tools to access or scrape the App</li>
	</ul>

	<h2>Intellectual property</h2>
	<p>All content, design, and code in the App are owned by Niramaya Pte Ltd or its licensors. You may not reproduce, distribute, or create derivative works without written permission.</p>

	<h2>Data and privacy</h2>
	<p>Your use of the App is also governed by our <a href="/privacy">Privacy Policy</a>. By using the App, you consent to the collection and use of your data as described in that policy.</p>

	<h2>Limitation of liability</h2>
	<p>The App is provided "as is" without warranties of any kind. To the fullest extent permitted by law, Niramaya Pte Ltd shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App, including but not limited to health outcomes, data loss, or service interruptions.</p>

	<h2>Changes</h2>
	<p>We may update these Terms from time to time. Continued use of the App after changes constitutes acceptance. Material changes will be communicated through the App.</p>

	<h2>Governing law</h2>
	<p>These Terms are governed by the laws of the Republic of Singapore.</p>

	<h2>Contact</h2>
	<p>For questions about these Terms, contact:<br>
	Niramaya Pte Ltd<br>
	Email: hello@niramaya.sg</p>

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
	:global(a) {
		color: var(--gold-deep, #8f6f1f);
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
