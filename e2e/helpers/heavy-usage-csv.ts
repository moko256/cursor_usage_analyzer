const MODELS = [
	'gpt-5.6-luna-high',
	'claude-4.5-sonnet-thinking',
	'composer-2.5',
	'grok-4',
	'gemini-3-flash',
	'gpt-5',
	'cursor-small',
	'claude-4-opus'
] as const;

const HEADER =
	'Date,Model,Input (w/ Cache Write),Input (w/o Cache Write),Cache Read,Output Tokens,Total Tokens,Cost';

/** Realistic multi-month Cursor export used to stress range-switch rendering. */
export function buildHeavyUsageCsv(options?: { days?: number; models?: readonly string[] }) {
	const dayCount = options?.days ?? 180;
	const models = options?.models ?? MODELS;
	const end = Date.UTC(2026, 8, 6, 18, 0, 0);
	const lines = [HEADER];

	for (let dayOffset = dayCount - 1; dayOffset >= 0; dayOffset -= 1) {
		const dayStart = end - dayOffset * 86_400_000;
		for (const [modelIndex, model] of models.entries()) {
			if (dayOffset % (modelIndex + 3) === 0) continue;

			const tokens = 8_000 + ((dayOffset * 1_700 + modelIndex * 4_100) % 180_000);
			const inputW = Math.round(tokens * 0.12);
			const inputWo = Math.round(tokens * 0.05);
			const cacheRead = Math.round(tokens * 0.7);
			const output = tokens - inputW - inputWo - cacheRead;
			const cost = (tokens / 80_000).toFixed(2);
			const hour = 8 + ((dayOffset + modelIndex) % 12);
			const date = new Date(dayStart + hour * 3_600_000).toISOString();
			lines.push(`${date},${model},${inputW},${inputWo},${cacheRead},${output},${tokens},${cost}`);
		}
	}

	return lines.join('\n');
}
