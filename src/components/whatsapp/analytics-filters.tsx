"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigationProgress } from "@/components/nav/navigation-progress";
import { ANALYTICS_GRANULARITIES, ANALYTICS_RANGES } from "@/lib/analytics-range";
import { toast } from "sonner";

export function AnalyticsFilters({
  range,
  granularity,
  maxRangeDays,
  allowHalfHour = true,
  allowMonth = true,
}: {
  range: string;
  granularity: string;
  maxRangeDays?: number;
  allowHalfHour?: boolean;
  allowMonth?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startNavigationProgress } = useNavigationProgress();

  function isValidGranularity(nextRange: string, nextGranularity: string) {
    if (nextRange === "7") return (allowHalfHour && nextGranularity === "HALF_HOUR") || nextGranularity === "DAY";
    if (nextRange === "30") return nextGranularity === "DAY";
    if (nextRange === "90") return nextGranularity === "DAY" || (allowMonth && nextGranularity === "MONTH");
    return nextRange === "365" ? allowMonth && nextGranularity === "MONTH" : false;
  }

  function defaultGranularity(nextRange: string) {
    return nextRange === "90" || nextRange === "365" ? (allowMonth ? "MONTH" : "DAY") : "DAY";
  }

  function setParam(key: string, value: string) {
    if (key === "range" && maxRangeDays !== undefined && Number(value) > maxRangeDays) {
      toast.info("You can select up to last 90 days");
      return;
    }
    const nextRange = key === "range" ? value : range;
    const nextGranularity = key === "granularity" ? value : granularity;
    if (key === "granularity" && !isValidGranularity(nextRange, nextGranularity)) {
      toast.info("That date range and granularity combination is not available.");
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    if (key === "range" && !isValidGranularity(nextRange, nextGranularity)) {
      params.set("granularity", defaultGranularity(nextRange));
    }
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute, { scroll: false });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={range} onValueChange={(value) => setParam("range", value)}>
        <SelectTrigger className="w-40" aria-label="Date range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ANALYTICS_RANGES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={granularity} onValueChange={(value) => setParam("granularity", value)}>
        <SelectTrigger className="w-32" aria-label="Granularity">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ANALYTICS_GRANULARITIES
            .filter((option) => allowHalfHour || option !== "HALF_HOUR")
            .filter((option) => allowMonth || option !== "MONTH")
            .map((option) => (
            <SelectItem key={option} value={option}>
              {option === "HALF_HOUR" ? "By half-hour" : option === "DAY" ? "By day" : "By month"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
