export const ANALYTICS_VIEWS = ["overall", "phone", "template"] as const;
export type AnalyticsView = (typeof ANALYTICS_VIEWS)[number];

export function resolveAnalyticsView(value?: string): AnalyticsView {
  return ANALYTICS_VIEWS.includes(value as AnalyticsView)
    ? (value as AnalyticsView)
    : "overall";
}