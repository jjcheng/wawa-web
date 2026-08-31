import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type {
  ConversationAnalytics,
  MessageAnalytics,
  MessageAnalyticsDataPoint,
  TemplateAnalytics,
} from "@/lib/api/types";

export function flattenMessagePoints(analytics?: MessageAnalytics | null) {
  return analytics?.data_points ?? [];
}

/** Currency lives on the parent entry, so fold it into each point. */
export function flattenCostPoints(analytics?: ConversationAnalytics | null) {
  return (analytics?.data ?? []).flatMap((entry) =>
    (entry.data_points ?? []).map((point) => ({
      ...point,
      currency: point.currency || entry.currency,
    })),
  );
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

export function formatCost(value: number, currency?: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
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
