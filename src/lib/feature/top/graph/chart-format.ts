import type { ChartMetric } from './chart-types';

export const verticalChartPadding = { top: 4, right: 24, bottom: 20, left: 41 } as const;
export const verticalChartHeight = 270;

export const compactNumberFormat = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1
});

export const currencyFormat = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 2
});

const siPrefixes = [
	{ value: 1e24, symbol: 'Y' },
	{ value: 1e21, symbol: 'Z' },
	{ value: 1e18, symbol: 'E' },
	{ value: 1e15, symbol: 'P' },
	{ value: 1e12, symbol: 'T' },
	{ value: 1e9, symbol: 'G' },
	{ value: 1e6, symbol: 'M' },
	{ value: 1e3, symbol: 'k' }
] as const;

export function formatTokenAxis(value: number): string {
	if (!Number.isFinite(value)) return String(value);

	const sign = value < 0 ? '-' : '';
	const absoluteValue = Math.abs(value);
	const prefix = siPrefixes.find(({ value: prefixValue }) => absoluteValue >= prefixValue);

	if (!prefix) return `${sign}${Math.round(absoluteValue)}`;

	let roundedValue = Math.round((absoluteValue / prefix.value) * 10) / 10;
	if (roundedValue >= 1000) {
		const nextPrefix = siPrefixes[siPrefixes.indexOf(prefix) - 1];
		if (nextPrefix) {
			roundedValue = Math.round((absoluteValue / nextPrefix.value) * 10) / 10;
			return `${sign}${formatRoundedNumber(roundedValue)}${nextPrefix.symbol}`;
		}
	}

	return `${sign}${formatRoundedNumber(roundedValue)}${prefix.symbol}`;
}

function formatRoundedNumber(value: number) {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatCostAxis(value: number): string {
	if (!Number.isFinite(value)) return String(value);

	const formatted = formatTokenAxis(value);
	return formatted.startsWith('-') ? `-$${formatted.slice(1)}` : `$${formatted}`;
}

export function formatChartAxis(value: number, metric: ChartMetric): string {
	return metric === 'tokens' ? formatTokenAxis(value) : formatCostAxis(value);
}

export function formatChartValue(value: number, metric: ChartMetric): string {
	return metric === 'tokens' ? compactNumberFormat.format(value) : currencyFormat.format(value);
}

export function formatDay(value: string) {
	const date = new Date(`${value}T00:00:00Z`);
	return Number.isNaN(date.getTime())
		? value
		: new Intl.DateTimeFormat('en-US', {
				month: 'short',
				day: 'numeric',
				timeZone: 'UTC'
			}).format(date);
}

export function formatHour(value: number) {
	return `${value.toString().padStart(2, '0')}:00`;
}
