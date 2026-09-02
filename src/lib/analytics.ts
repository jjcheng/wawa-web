import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type {
  MessageAnalytics,
  MessageAnalyticsDataPoint,
  TemplateAnalytics,
} from "@/lib/api/types";

export function flattenMessagePoints(analytics?: MessageAnalytics | null) {
  return analytics?.data_points ?? [];
}

export function totalMessages(
  points: MessageAnalyticsDataPoint[],
  key: "sent" | "delivered" | "received",
) {
  return points.reduce((sum, point) => sum + (point[key] ?? 0), 0);
}

export function flattenTemplatePoints(analytics?: TemplateAnalytics[] | null) {
  return (analytics ?? []).flatMap((entry) => entry.data_points ?? []);
}

export function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

export async function loadAnalytics<T>(
  path: string,
  query: Record<string, string | string[]>,
) {
  try {
    return { data: await serverFetch<T>(path, { query }), error: null as string | null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof ApiError ? error.message : "Could not load analytics.",
    };
  }
}
