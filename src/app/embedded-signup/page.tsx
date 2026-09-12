import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";

import { Brand } from "@/components/brand";
import { EmbeddedSignupFlow } from "@/components/whatsapp/embedded-signup-flow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
          <CardTitle>Onboard the WhatsApp Business Platform With CoreConcept WhatsApp CRM</CardTitle>
          <CardDescription>
           Get started with a few simple steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="text-muted-foreground list-decimal space-y-2 pl-4 text-sm">
            <li>Create or select your WhatsApp Business account.</li>
            <li>Add or select a phone number and provide profile details.</li>
            <li>Add your payment method to start messaging your customers (billed directly by Meta).</li>
          </ol>
            <EmbeddedSignupFlow
              appId={serverEnv.NEXT_META_APP_ID}
              configId={serverEnv.NEXT_META_EMBEDDED_SIGNUP_CONFIG_ID}
              redirectTo={safeNextPath(next) ?? "/dashboard"}
              className="w-full"
            />
        </CardContent>
      </Card>
    </div>
  );
}