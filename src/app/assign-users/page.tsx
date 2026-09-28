import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { TopRightThemeToggle } from "@/components/top-right-theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { PhoneNumber, User } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { AssignUsersForm } from "./assign-users-form";

export const metadata: Metadata = { title: "Assign users" };

export default async function AssignUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ phone_number_id?: string }>;
}) {
  const currentUser = await requireUser();
  if (currentUser.type !== "MASTER") redirect("/dashboard");

  const { phone_number_id: phoneNumberId } = await searchParams;
  if (!phoneNumberId || !/^\d+$/.test(phoneNumberId)) redirect("/assets/phone-numbers");

  let phoneNumber: PhoneNumber | null = null;
  let users: User[] = [];
  let assignedUserIds: number[] = [];
  let loadError: string | null = null;
  try {
    const [phoneNumberResponse, usersResponse, assignedUsersResponse] = await Promise.all([
      serverFetch<PhoneNumber>(`/v1/wa/phone-numbers/${phoneNumberId}`),
      serverFetch<User[]>("/v1/admin/users"),
      serverFetch<Array<{ user_id?: number | string } | User>>(
        "/v1/admin/assigned-users",
        { query: { phone_number_id: phoneNumberId } },
      ),
    ]);
    phoneNumber = phoneNumberResponse;
    users = Array.isArray(usersResponse) ? usersResponse : [];
    assignedUserIds = (Array.isArray(assignedUsersResponse) ? assignedUsersResponse : [])
      .map((entry) => {
        const assignment = entry as { user_id?: number | string; id?: number | string };
        const candidate = assignment.user_id ?? assignment.id;
        const parsed = Number(candidate);
        return Number.isFinite(parsed) ? parsed : null;
      })
      .filter((value): value is number => value !== null);
  } catch (error) {
    loadError = toApiError(error).message;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <TopRightThemeToggle />
      <Brand />
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Assign users To {phoneNumber?.name || phoneNumber?.display_phone_number || "this phone number"}</CardTitle>
          <CardDescription>
            All assigned users can access this number.
          </CardDescription>
          <CardAction>
            <Button asChild size="sm">
              <Link href="/assets/users/new">Add user</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <p className="text-destructive text-sm">{loadError}</p>
          ) : phoneNumber ? (
            <AssignUsersForm
              phoneNumberId={Number(phoneNumberId)}
              users={users}
              assignedUserIds={assignedUserIds}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}