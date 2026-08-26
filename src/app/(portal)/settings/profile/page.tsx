import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "@/components/settings-tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { formatPhoneNumber } from "@/lib/format";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader title="Settings" description="Manage your CoreConcept Tech account." />
      <SettingsTabs />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Signed in as {formatPhoneNumber(user.phone_number)} — your phone number cannot be
            changed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </>
  );
}
