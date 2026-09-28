import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";

import { Brand } from "@/components/brand";
import { EmbeddedSignupFlow } from "@/components/whatsapp/embedded-signup-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TopRightThemeToggle } from "@/components/top-right-theme-toggle";
import { serverEnv } from "@/lib/env.server";

export const metadata: Metadata = { title: "Connect WhatsApp" };

function safeNextPath(value: string | string[] | undefined) {
  const path = typeof value === "string" ? value : "";
  return /^\/(?!\/)[\w\-./?%&=]*$/.test(path) ? path : null;
}

function internalReferrerPath(referrer: string | null, host: string | null) {
  if (!referrer || !host) return null;

  try {
    const referrerUrl = new URL(referrer);
    if (referrerUrl.host !== host || referrerUrl.pathname === "/embedded-signup") return null;
    return `${referrerUrl.pathname}${referrerUrl.search}${referrerUrl.hash}`;
  } catch {
    return null;
  }
}

export default async function EmbeddedSignupPage({ searchParams }: PageProps<"/embedded-signup">) {
  const { from, next } = await searchParams;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim()
    ?? requestHeaders.get("host");
  const backPath = safeNextPath(from)
    ?? internalReferrerPath(requestHeaders.get("referer"), host);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <TopRightThemeToggle />
      {backPath ? (
        <Button asChild variant="ghost" className="fixed top-4 left-4">
          <Link href={backPath}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
      ) : null}
      <Brand />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Onboard WhatsApp Business Platform</CardTitle>
          <CardDescription>
           Get started with Meta Embedded Signup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="text-muted-foreground list-decimal space-y-2 pl-4 text-sm">
            <li>Create or select your WhatsApp Business Account.</li>
            <li>Add or select a phone number and provide profile details.</li>
            <li>Create or select a catalog if needed.</li>
            <li>Add your payment method to start messaging your customers (billed directly by Meta).</li>
          </ol>
            <EmbeddedSignupFlow
              appId={serverEnv.NEXT_PUBLIC_META_APP_ID}
              configId={serverEnv.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID}
              redirectTo={safeNextPath(next) ?? "/chats"}
              className="w-full"
            />
        </CardContent>
      </Card>
    </div>
  );
}