"use client";

import { MessagesSquare, Phone, Send, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Dashboard } from "@/lib/api/types";

const dashboardRequests = new Map<string, Promise<Dashboard>>();

export function DashboardSection({
  dashboard,
  businessAccount,
  showUsageLinks = false,
}: {
  dashboard: Dashboard;
  businessAccount?: boolean;
  showUsageLinks?: boolean;
}) {
  const requestKey = businessAccount ? "business" : "personal";
  const [sectionDashboard, setSectionDashboard] = useState(dashboard);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    const request = dashboardRequests.get(requestKey) ?? apiFetch<Dashboard>("v1/account/users/me/dashboard", {
      query: { business_account: businessAccount ? "true" : "false" },
    });
    dashboardRequests.set(requestKey, request);
    request
      .then(setSectionDashboard)
      .catch((error) => setDashboardError(toApiError(error).message))
      .finally(() => setLoadingDashboard(false));
  }, [businessAccount, requestKey]);

  const stats = [
    { label: "Connected phone numbers", value: sectionDashboard.active_phone_numbers, icon: Phone, href: "/phone-numbers" },
    { label: "Active customers", value: sectionDashboard.active_customers, icon: Users, href: "/customers" },
    { label: "Messages sent (30d)", value: sectionDashboard.messages_sent_last_30_days, icon: Send, href: showUsageLinks ? "/usage" : undefined },
    { label: "Messages delivered (30d)", value: sectionDashboard.messages_delivered_last_30_days, icon: MessagesSquare, href: showUsageLinks ? "/usage" : undefined },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const card = (
          <Card
            size="sm"
            className={stat.href ? "transition-colors group-hover:bg-accent/50" : undefined}
          >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2">
            <CardDescription>{stat.label}</CardDescription>
            <stat.icon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent className="px-3 pb-2">
            {loadingDashboard ? (
              <Loader2 className="text-muted-foreground size-5 animate-spin" aria-label="Loading" />
            ) : (
              <p className="text-2xl font-semibold">{stat.value ?? "-"}</p>
            )}
            {dashboardError ? (
              <p className="text-destructive mt-1 text-xs">{dashboardError}</p>
            ) : null}
          </CardContent>
          </Card>
        );

        return stat.href ? (
          <Link
            key={stat.label}
            href={stat.href}
            aria-label={`Go to ${stat.label}`}
            className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {card}
          </Link>
        ) : (
          <div key={stat.label}>{card}</div>
        );
      })}
    </div>
  );
}
