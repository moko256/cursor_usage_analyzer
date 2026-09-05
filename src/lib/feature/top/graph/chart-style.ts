import { interpolateLab, interpolateRgb } from 'd3-interpolate';
import { interpolatePuBu, schemeObservable10 } from 'd3-scale-chromatic';
import { getStringWidth, truncateText } from 'layerchart/utils/string';

export const errorMinusColor = 'light-dark(' + '#868e96, #adb5bd)';
export const errorPlusColor = 'light-dark(' + '#e03131, #ff6b6b)';

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

/** 5 heat colors for the token calendar (scaleThreshold bins). Light → dark. */
export const TOKEN_CALENDAR_COLORS = [0, 0.25, 0.5, 0.75, 1].map((stop) => interpolatePuBu(stop));

/** Single-series hourly bar color. */
export const HOURLY_TOKEN_COLOR = interpolatePuBu(0.7);

/**
 * Mirrors LayerChart's `.lc-axis-tick-label` rule so a measured width matches the drawn one.
 * `getStringWidth` only assigns the properties it is handed, but types them as a whole
 * `CSSStyleDeclaration`.
 */
const tickLabelStyle = { fontSize: '10px', fontWeight: '300' } as unknown as CSSStyleDeclaration;

/** Keeps an unusually long model name from squeezing the bars out of the plot area. */
const maxModelLabelWidth = 180;

/** Separates a model name from the plot area: LayerChart's default tick length plus breathing room. */
const modelLabelGap = 8;

/** Room for the outermost value tick label, which is centred on the end of the value axis. */
const valueLabelInset = 24;

export function truncateModelLabel(model: string) {
	return truncateText(model, { maxWidth: maxModelLabelWidth, style: tickLabelStyle });
}

/**
 * LayerChart reserves a fixed 20px on the left of a chart, which fits the short numeric ticks of a
 * vertical chart but not the model names a horizontal one puts there: tick labels are drawn
 * right-aligned from the plot origin, so anything wider lands outside the SVG and is clipped away.
 * Top and bottom repeat LayerChart's own defaults, which have to be restated once `padding` is set.
 */
export function modelAxisPadding(models: string[]) {
	const labelWidth = models.reduce((widest, model) => Math.max(widest, measureLabel(model)), 0);

	return {
		top: 4,
		right: valueLabelInset,
		bottom: 20,
		left: Math.ceil(Math.min(labelWidth, maxModelLabelWidth)) + modelLabelGap
	};
}

function measureLabel(text: string) {
	return getStringWidth(text, tickLabelStyle) ?? text.length * 6;
}
