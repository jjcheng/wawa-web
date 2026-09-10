"use client";

import { MessagesSquare, Phone, Plus, Send, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { Dashboard } from "@/lib/api/types";

const dashboardRequests = new Map<string, Promise<Dashboard>>();

export function DashboardSection({
  dashboard,
  businessAccount,
  showPhoneNumbersLink = true,
}: {
  dashboard: Dashboard;
  businessAccount?: boolean;
  showPhoneNumbersLink?: boolean;
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
    { label: "Connected phone numbers", value: sectionDashboard.active_phone_numbers, icon: Phone, href: showPhoneNumbersLink ? "/numbers" : undefined },
    { label: "Active customers", value: sectionDashboard.active_customers, icon: Users, href: "/customers" },
    { label: "Messages sent (30d)", value: sectionDashboard.messages_sent_last_30_days, icon: Send },
    { label: "Messages delivered (30d)", value: sectionDashboard.messages_delivered_last_30_days, icon: MessagesSquare },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} size="sm" className="relative">
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
          {stat.href ? (
            <Button asChild size="icon-xs" variant="default" className="absolute right-3 bottom-3 rounded-full shadow-sm">
              <Link href={stat.href} aria-label={`Go to ${stat.label}`} title={`Go to ${stat.label}`}>
                <Plus />
              </Link>
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
