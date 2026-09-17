import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "@/components/settings-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { User } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const currentUser = await requireUser();
  if (currentUser.type !== "MASTER") redirect("/settings/profile");

  let users: User[] = [];
  let loadError: string | null = null;

  try {
    const response = await serverFetch<User[]>("/v1/admin/users");
    users = Array.isArray(response) ? response : [];
  } catch (error) {
    loadError = error instanceof ApiError ? error.message : "Could not load users.";
  }

  return (
    <>
      <PageHeader title="Account Settings" description="Manage users in your account." />
      <SettingsTabs isMaster />

      {loadError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : (
        <>
          <Card className="rounded-md py-0">
            <CardContent className="overflow-x-auto p-0">
              <UsersTable users={users} currentUserId={currentUser.id} />
            </CardContent>
          </Card>
          <p className="mt-3 text-sm text-muted-foreground">MASTER users cannot be updated.</p>
        </>
      )}
    </>
  );
}
