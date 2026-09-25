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
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/session";
import { formatPhoneNumber } from "@/lib/format";
import { CloseAccountButton } from "./close-account-button";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <>
      <BackBar href="/assets" />
      <PageHeader
        title="Settings"
        description="Manage your profile and login password"
      />
      <SettingsTabs />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Profile</CardTitle>
            {user.type === "MASTER" ? (
              <Badge className="bg-green-600 text-white dark:bg-green-600">Master</Badge>
            ) : null}
          </div>
          <CardDescription>
            Signed in as <strong className="font-light text-foreground">{formatPhoneNumber(user.phone_number, user.country_code)}</strong>, your phone
            number cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
      <div className="max-w-md">
        <CloseAccountButton />
      </div>
    </>
  );
}
