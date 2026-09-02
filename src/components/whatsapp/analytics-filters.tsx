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
import { ANALYTICS_RANGES } from "@/lib/analytics-range";

export function AnalyticsFilters({ range }: { range: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startNavigationProgress } = useNavigationProgress();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
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
    </div>
  );
}
