export const ANALYTICS_GRANULARITIES = ["HALF_HOUR", "DAY", "MONTH"] as const;
export type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITIES)[number];

export const ANALYTICS_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
] as const;

const DEFAULT_RANGE_DAYS = 30;
const DEFAULT_GRANULARITY: AnalyticsGranularity = "DAY";
const TEMPLATE_ANALYTICS_MAX_DAYS = 89;
const ANALYTICS_TIME_ZONE = "Asia/Singapore";

const analyticsDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ANALYTICS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function resolveRangeDays(value?: string) {
  const days = Number(value);
  return ANALYTICS_RANGES.some((range) => range.value === value) && Number.isFinite(days)
    ? days
    : DEFAULT_RANGE_DAYS;
}

export function resolveGranularity(value?: string): AnalyticsGranularity {
  const upper = value?.toUpperCase();
  return ANALYTICS_GRANULARITIES.includes(upper as AnalyticsGranularity)
    ? (upper as AnalyticsGranularity)
    : DEFAULT_GRANULARITY;
}

/** The API takes Unix seconds and requires end > start. */
export function toUnixRange(days: number, now = new Date()) {
  const end = Math.floor(now.getTime() / 1000);
  return { start: end - days * 24 * 60 * 60, end };
}

export function templateAnalyticsStart(start: number, end: number) {
  return Math.max(start, end - TEMPLATE_ANALYTICS_MAX_DAYS * 24 * 60 * 60);
}

export function formatAnalyticsDate(timestamp: number) {
  return analyticsDateFormatter.format(new Date(timestamp * 1000));
}
