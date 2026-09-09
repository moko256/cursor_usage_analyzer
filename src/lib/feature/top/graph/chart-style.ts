import { interpolateLab, interpolateRgb } from 'd3-interpolate';
import { interpolatePuBu, schemeObservable10 } from 'd3-scale-chromatic';

/** Wrap width for horizontal model-name tick labels (`tickLabelProps.width`). */
export const modelTickLabelWidth = 100;

/** Fallback character width when splitting hyphenated ids to fit `modelTickLabelWidth`. */
const modelTickLabelCharWidth = 6;

/**
 * Setting `width` would otherwise enable LayerChart's default maxWidth truncation.
 * `truncate: false` keeps the full name so `width` wraps instead of ellipsizing.
 */
export const modelTickLabelProps = {
	width: modelTickLabelWidth,
	textAnchor: 'end' as const,
	truncate: false
};

/**
 * LayerChart wraps on whitespace/`\\n` and does not split a single token. Model ids are hyphenated
 * with no spaces, so insert line breaks at hyphens that would overflow `modelTickLabelWidth`.
 */
export function wrapModelTickLabel(model: string) {
	const maxChars = Math.max(1, Math.floor(modelTickLabelWidth / modelTickLabelCharWidth));
	const parts = String(model).split('-');
	const lines: string[] = [];
	let current = '';

	for (const part of parts) {
		const next = current ? `${current}-${part}` : part;
		if (current && next.length > maxChars) {
			lines.push(`${current}-`);
			current = part;
		} else {
			current = next;
		}
	}

	if (current) lines.push(current);
	return lines.join('\n');
}

export const errorMinusColor = 'light-dark(' + '#868e96, #adb5bd)';
export const errorPlusColor = 'light-dark(' + '#e03131, #ff6b6b)';

/** Keep tooltips within the viewport instead of the chart container. */
export const chartTooltipRootProps = { contained: 'window' as const };

const tokenBreakdownGradientStart = interpolatePuBu(0.2);

const modelColorStops = 10;

/** Lab-interpolate schemeObservable10 between stop k and k+1 (k=9 wraps to 0). */
function interpolateObservable10(stop: number): string {
	const scaled = stop * 9;
	const k = Math.floor(scaled);
	const t = scaled % 1;
	const next = (k + 1) % schemeObservable10.length;

	return interpolateLab(schemeObservable10[k], schemeObservable10[next])(t);
}

/** Per-model color from schemeObservable10. Fewer than 10 models pick from a 10-stop palette. */
export function getDailyModelColors(modelIndex: number, modelLength: number): string {
	const stop = Math.min(modelIndex / Math.max(modelLength, modelColorStops), 1);

	return interpolateObservable10(stop);
}

/**
 * Token-type color within a model: interpolateRgb(interpolatePuBu(0.2), modelColor).
 * First key is the PuBu stop; last key is the model color.
 */
export function getTokenBreakdownColor(
	tokenIndex: number,
	tokenCount: number,
	modelColor: string
): string {
	const stop = tokenCount <= 1 ? 1 : tokenIndex / (tokenCount - 1);

	return interpolateRgb(tokenBreakdownGradientStart, modelColor)(stop);
}

/**
 * 5 heat colors for the token calendar (scaleThreshold bins).
 * Light: light → dark as tokens increase. Dark: reversed so high usage is brighter.
 */
export const TOKEN_CALENDAR_COLORS = [0, 0.25, 0.5, 0.75, 1].map(
	(stop) => 'light-dark(' + interpolatePuBu(stop) + ', ' + interpolatePuBu(1 - stop) + ')'
);

/** Single-series hourly bar color. */
export const HOURLY_TOKEN_COLOR = interpolatePuBu(0.7);

/** Separates wrapped model names from the plot area: tick length plus breathing room. */
const modelLabelGap = 8;

/** Room for the outermost value tick label, which is centred on the end of the value axis. */
const valueLabelInset = 24;

/**
 * LayerChart reserves a fixed 20px on the left of a chart, which fits the short numeric ticks of a
 * vertical chart but not the model names a horizontal one puts there: tick labels are drawn
 * right-aligned from the plot origin, so anything wider lands outside the SVG and is clipped away.
 * Top and bottom repeat LayerChart's own defaults, which have to be restated once `padding` is set.
 * Left padding matches `modelTickLabelWidth` so wrapped labels stay inside the chart.
 */
export const modelAxisPadding = {
	top: 4,
	right: valueLabelInset,
	bottom: 20,
	left: modelTickLabelWidth + modelLabelGap
} as const;
