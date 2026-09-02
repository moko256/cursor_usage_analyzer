import { getStringWidth, truncateText } from 'layerchart';

export const errorMinusColor = 'light-dark(' + '#868e96, #adb5bd)';
export const errorPlusColor = 'light-dark(' + '#e03131, #ff6b6b)';

// Source: https://picocss.com/docs/colors
// VSCodeでプレビューできるように+で結合している
const dailyModelColors = [
	'light-dark(' + '#748BF8, #3C71F7)',
	'light-dark(' + '#5C7EF8, #5C7EF8)',
	'light-dark(' + '#3C71F7, #748BF8)',
	'light-dark(' + '#2060DF, #8999F9)',
	'light-dark(' + '#1D59D0, #9CA7FA)',
	'light-dark(' + '#184EB8, #AEB5FB)',
	'light-dark(' + '#1343A0, #BFC3FA)',
	'light-dark(' + '#0F3888, #D0D2FA)',
	'light-dark(' + '#0F2D70, #E0E1FA)',
	'light-dark(' + '#0E2358, #F0F0FB)'
] as const;

export function getDailyModelColors(
	modelIndex: number,
	modelLength: number,
	isDark: boolean
): string {
	// dailyModelColorsの先頭から選び、かつ、黒に近い方がグラフの下側に選ばれるようにする
	const index = isDark ? modelIndex : modelLength - modelIndex;

	return dailyModelColors[index % dailyModelColors.length];
}

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
