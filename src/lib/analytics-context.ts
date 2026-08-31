import "server-only";

import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { BusinessAccount } from "@/lib/api/types";
import { resolveGranularity, resolveRangeDays, toUnixRange } from "@/lib/analytics-range";
import { toWabaOptions, type WabaOption } from "@/lib/waba-options";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

/** Resolves the WABA/range/granularity filters shared by the analytics pages. */
export async function resolveAnalyticsContext(params: SearchParams) {
  const rangeDays = resolveRangeDays(first(params.range));
  const granularity = resolveGranularity(first(params.granularity));

  let wabas: WabaOption[] = [];
  let wabaError: string | null = null;
  try {
    const businessAccounts =
      (await serverFetch<BusinessAccount[]>("/v1/wa/business-accounts")) ?? [];
    wabas = toWabaOptions(businessAccounts);
  } catch (error) {
    wabaError =
      error instanceof ApiError ? error.message : "Could not load your business accounts.";
  }

  const requested = first(params.meta_waba_id);
  const selected =
    (requested && wabas.some((waba) => waba.metaWabaId === requested)
      ? requested
      : wabas[0]?.metaWabaId) ?? "";

  const { start, end } = toUnixRange(rangeDays);

  return {
    wabas,
    wabaError,
    selected,
    rangeDays,
    granularity,
    start,
    end,
    query: {
      meta_waba_id: selected,
      start: String(start),
      end: String(end),
      granularity,
    },
  };
}
