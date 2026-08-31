"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useNavigationProgress } from "@/components/nav/navigation-progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsView } from "@/lib/analytics-view";

export function AnalyticsViewTabs({ value }: { value: AnalyticsView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startNavigationProgress } = useNavigationProgress();

  function setView(nextView: string) {
    const params = new URLSearchParams(searchParams);
    params.set("view", nextView);
    const nextRoute = `${pathname}?${params}`;
    startNavigationProgress(nextRoute);
    router.push(nextRoute);
  }

  return (
    <Tabs value={value} onValueChange={setView} className="mb-6">
      <TabsList className="gap-1" aria-label="Analytics view">
        <TabsTrigger className="cursor-pointer" value="overall">
          Overall
        </TabsTrigger>
        <TabsTrigger className="cursor-pointer" value="phone">
          By Phone Number
        </TabsTrigger>
        <TabsTrigger className="cursor-pointer" value="template">
          By Template
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}