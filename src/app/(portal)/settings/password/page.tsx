import type { Metadata } from "next";

import { BackBar } from "@/components/back-bar";
import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "@/components/settings-tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordForm } from "./password-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Password" };

export default async function PasswordPage() {
  await requireUser();

  return (
    <>
      <BackBar href="/assets" />
      <PageHeader title="Settings" description="Manage your profile and login password" />
      <SettingsTabs />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>
            You will stay signed in on this device after changing your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </>
  );
}
