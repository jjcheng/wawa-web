import { MessagesSquare, Phone, Send, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { PhoneNumber } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime, formatPhoneNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  let phoneNumbers: PhoneNumber[] = [];
  let loadError: string | null = null;
  try {
    phoneNumbers = (await serverFetch<PhoneNumber[]>("/v1/wa/user-phone-numbers")) ?? [];
  } catch (error) {
    loadError =
      error instanceof ApiError ? error.message : "Could not load your WhatsApp numbers.";
  }

  const stats = [
    { label: "Connected numbers", value: String(phoneNumbers.length), icon: Phone },
    { label: "Contacts", value: "1,284", icon: Users, preview: true },
    { label: "Open conversations", value: "37", icon: MessagesSquare, preview: true },
    { label: "Messages sent (30d)", value: "8,912", icon: Send, preview: true },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back${user.name ? `, ${user.name}` : ""}`}
        description="Your WhatsApp CRM at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardDescription>{stat.label}</CardDescription>
              <stat.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{stat.value}</p>
              {stat.preview ? (
                <Badge variant="secondary" className="mt-2">
                  Preview
                </Badge>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
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
            <CardDescription>Your CoreConcept CRM profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Phone</span>
              <span>{formatPhoneNumber(user.phone_number)}</span>
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
