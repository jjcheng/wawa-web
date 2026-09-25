import type { Metadata } from "next";

import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Set your password" };

function safeNextPath(value: string | string[] | undefined) {
  const path = typeof value === "string" ? value : "";
  return /^\/(?!\/)[\w\-./?%&=]*$/.test(path) ? path : "/chats";
}

export default async function SetPasswordPage({ searchParams }: PageProps<"/set-password">) {
  await requireUser();
  const { next } = await searchParams;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Brand />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>
            Your WhatsApp account is connected. Choose a password to finish setting up your WAWAGO account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm next={safeNextPath(next)} />
        </CardContent>
      </Card>
    </div>
  );
}
