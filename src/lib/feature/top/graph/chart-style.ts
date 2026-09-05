import { getStringWidth, truncateText } from 'layerchart/utils/string';

export const errorMinusColor = 'light-dark(' + '#868e96, #adb5bd)';
export const errorPlusColor = 'light-dark(' + '#e03131, #ff6b6b)';

/** Lightness added from Pico primary at the top of a stack (bottom stays at `l`). */
const modelColorLightnessLift = {
	light: '32%',
	dark: '40%'
} as const;

/**
 * 0 at the bottom of a stacked series, 1 at the top. A single series stays on the
 * primary stop so it matches `--pico-primary` / `--pico-primary-background`.
 */
export function modelColorStop(modelIndex: number, modelLength: number): number {
	if (modelLength <= 1) return 0;

	return modelIndex / (modelLength - 1);
}

/**
 * Stacked model / breakdown color. Hue and saturation come from Pico via CSS
 * `hsl(from …)`; JS only supplies the lightness stop so darker shades sit at the
 * bottom. `light-dark()` switches theme without a JS media query.
 */
export function getDailyModelColors(modelIndex: number, modelLength: number): string {
	const stop = Number(modelColorStop(modelIndex, modelLength).toFixed(4));

	return (
		'light-dark(' +
		`hsl(from var(--pico-primary) h s calc(l + ${stop} * ${modelColorLightnessLift.light})), ` +
		`hsl(from var(--pico-primary-background) h s calc(l + ${stop} * ${modelColorLightnessLift.dark}))` +
		')'
	);
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
