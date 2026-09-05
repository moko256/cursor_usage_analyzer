export type DailyModelValue = {
	model: string;
	cost: number;
	tokens: number;
};

export type DailyValue = {
	day: string;
	cost: number;
	tokens: number;
	models: DailyModelValue[];
};

export type TokenCalendarDay = {
	day: string;
	date: Date;
	tokens: number;
};

export type TokenCalendarRange = {
	start: Date;
	end: Date;
};

export type HourlyValue = {
	hour: number;
	tokens: number;
};

export const DAY_RANGES = [1, 7, 'all'] as const;

export type DayRange = (typeof DAY_RANGES)[number];

export type ChartMetric = 'tokens' | 'cost';

export const TOKEN_BREAKDOWN_KEYS = [
	'inputWithCacheWrite',
	'inputWithoutCacheWrite',
	'cacheRead',
	'outputTokens'
] as const;

export type TokenBreakdownKey = (typeof TOKEN_BREAKDOWN_KEYS)[number];

export const TOKEN_BREAKDOWN_LABELS: Record<TokenBreakdownKey, string> = {
	inputWithCacheWrite: 'Input (w/ Cache Write)',
	inputWithoutCacheWrite: 'Input (w/o Cache Write)',
	cacheRead: 'Cache Read',
	outputTokens: 'Output Tokens'
};

export type ModelBreakdownSeriesKey = TokenBreakdownKey | 'errorMinus' | 'errorPlus';

export type ModelBreakdownValue = {
	model: string;
	cost: number;
	tokens: number;
	inputWithCacheWrite: number;
	inputWithoutCacheWrite: number;
	cacheRead: number;
	outputTokens: number;
	errorMinus: number;
	errorPlus: number;
};

export type ModelBreakdownSeries = {
	key: ModelBreakdownSeriesKey;
	label: string;
	color: string;
	value: (row: ModelBreakdownValue) => number;
};

export type RangeChartData = {
	byDay: DailyValue[];
	byHour: HourlyValue[];
	byModelBreakdown: ModelBreakdownValue[];
	totalCost: number;
	totalTokens: number;
};

/**
 * Stable color indices for every distinct model in the CSV.
 * Built once in the worker so a model keeps the same color across date ranges.
 *
 * `names` is dictionary-sorted (`localeCompare`). `names[i]` has index `i`.
 * `indexByName` is the same mapping for O(1) lookup. `count` is `names.length`.
 */
export type ModelIndexTable = {
	names: string[];
	indexByName: Record<string, number>;
	count: number;
};

export type DashboardData = {
	pointCount: number;
	totalCost: number;
	totalTokens: number;
	modelIndices: ModelIndexTable;
	ranges: { [K in DayRange]: RangeChartData };
};
