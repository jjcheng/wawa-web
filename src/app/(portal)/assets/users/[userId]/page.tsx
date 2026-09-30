import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ApiErrorToast } from "@/components/api-error-toast";
import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { toApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-client";
import type { User } from "@/lib/api/types";
import { requireUser } from "@/lib/auth/session";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Edit user" };

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const currentUser = await requireUser();
  if (currentUser.type !== "MASTER") redirect("/chats");

  const { userId } = await params;
  const { tab } = await searchParams;
  const initialTab = tab === "assigned-phone-numbers" ? "assigned-phone-numbers" : "profile";

  let user: User | null = null;
  let loadError: string | null = null;
  try {
    user = await serverFetch<User>(`/v1/admin/users/${userId}`);
  } catch (error) {
    loadError = toApiError(error).message;
  }

  return (
    <>
      <BackBar href="/assets/users" />
      <PageHeader title="Edit user" description="Update this user's profile." />
      <ApiErrorToast message={loadError} />
      {user ? <UserForm user={user} initialTab={initialTab} /> : null}
    </>
  );
}
