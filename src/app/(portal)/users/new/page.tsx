import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Create user" };

export default async function NewUserPage() {
  const currentUser = await requireUser();
  if (currentUser.type !== "MASTER") redirect("/dashboard");

  return (
    <>
      <BackBar href="/users" />
      <PageHeader title="Create user" description="Add a new user to your business account." />
      <UserForm defaultCountryCode={currentUser.country_code} />
    </>
  );
}
