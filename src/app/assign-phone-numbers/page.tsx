import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { PhoneNumber, User } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { AssignPhoneNumbersTable } from "./assign-phone-numbers-table";

export const metadata: Metadata = { title: "Assign phone numbers" };

export default async function AssignPhoneNumbersPage() {
  const user = await requireUser();
  if (user.type !== "MASTER") redirect("/dashboard");

  let phoneNumbers: PhoneNumber[] = [];
  let users: User[] = [];
  let loadError: string | null = null;
  try {
    const [phoneNumbersResponse, usersResponse] = await Promise.all([
      serverFetch<PhoneNumber[]>("/v1/admin/unassigned-phone-numbers"),
      serverFetch<User[]>("/v1/admin/users"),
    ]);
    phoneNumbers = Array.isArray(phoneNumbersResponse) ? phoneNumbersResponse : [];
    users = Array.isArray(usersResponse) ? usersResponse : [];
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Could not load unassigned phone numbers.";
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Brand />
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Assign phone numbers</CardTitle>
          <CardDescription>
            Assign your unassigned WhatsApp phone numbers to a user before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <p className="text-destructive text-sm">{loadError}</p>
          ) : (
            <AssignPhoneNumbersTable phoneNumbers={phoneNumbers} users={users} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
