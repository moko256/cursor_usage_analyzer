/**
 * LayerChart renderer used by the dashboard charts.
 *
 * `svg` is the smallest of `layerchart/svg`, `layerchart/html`, and
 * `layerchart/canvas` for this app's production inline bundle. Re-measure with:
 * `node ./scripts/compare-layerchart-renderers.mjs`.
 *
 * `layerchart/html` re-exports the agnostic `BarChart`, which pulls every layer
 * implementation, so it is the largest of the three here.
 */
export { Bar, BarChart, Bars, Calendar, Chart, Layer, Rect, Tooltip } from 'layerchart/svg';
