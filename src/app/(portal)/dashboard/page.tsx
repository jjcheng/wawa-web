import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

import { DashboardSection } from "./dashboard-section";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type {
  Dashboard,
  PhoneNumber,
  PhoneNumberListResponse,
} from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime, formatPhoneNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  let phoneNumbers: PhoneNumber[] = [];
  const emptyDashboard: Dashboard = {
    active_phone_numbers: undefined,
    active_customers: undefined,
  };
  const personalDashboard = emptyDashboard;
  const businessDashboard = emptyDashboard;
  let loadError: string | null = null;
  try {
    const phoneNumberResponse = await serverFetch<PhoneNumberListResponse>(
      "/v1/wa/user-phone-numbers",
      { query: { page: "1", page_size: "10" } },
    );
    phoneNumbers = phoneNumberResponse.items ?? [];
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your WhatsApp numbers.";
  }

  return (
    <>
      <PageHeader
        title={`Welcome back${user.name ? `, ${user.name}` : ""}`}
        description="Your WhatsApp CRM at a glance."
      />

      {user.type === "MASTER" ? (
        <Tabs defaultValue="business-account" className="space-y-4">
          <TabsList aria-label="Dashboard overview">
            <TabsTrigger value="business-account">Business Account</TabsTrigger>
            <TabsTrigger value="my-number">My Number</TabsTrigger>
          </TabsList>
          <TabsContent value="business-account">
            <DashboardSection dashboard={businessDashboard} businessAccount showUsageLinks />
          </TabsContent>
          <TabsContent value="my-number">
            <DashboardSection dashboard={personalDashboard} showUsageLinks />
          </TabsContent>
        </Tabs>
      ) : (
        <DashboardSection dashboard={personalDashboard} />
      )}

      <div className="mt-6 grid hidden gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">WhatsApp numbers</CardTitle>
            <CardDescription>Numbers assigned to your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadError ? (
              <p className="text-destructive text-sm">{loadError}</p>
            ) : phoneNumbers.length === 0 ? (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  No WhatsApp Business number is connected yet.
                </p>
                <Button asChild size="sm">
                  <Link href="/connect">Start onboarding</Link>
                </Button>
              </div>
            ) : (
              phoneNumbers.slice(0, 5).map((number) => (
                <div
                  key={number.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{number.name || "Unnamed number"}</p>
                    <p className="text-muted-foreground">
                      {formatPhoneNumber(number.phone_number)}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatDateTime(number.last_update)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Your WAWAGO CRM profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Phone</span>
              <span>{formatPhoneNumber(user.phone_number, user.country_code)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Role</span>
              <span>{user.type || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span>{user.status || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Member since</span>
              <span>{formatDateTime(user.entry_date)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
