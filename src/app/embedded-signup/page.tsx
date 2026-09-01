import type { Metadata } from "next";

import { Brand } from "@/components/brand";
import { EmbeddedSignupFlow } from "@/components/whatsapp/embedded-signup-flow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { serverEnv } from "@/lib/env.server";

export const metadata: Metadata = { title: "Connect WhatsApp" };

function safeNextPath(value: string | string[] | undefined) {
  const path = typeof value === "string" ? value : "";
  return /^\/(?!\/)[\w\-./?%&=]*$/.test(path) ? path : null;
}

export default async function EmbeddedSignupPage({ searchParams }: PageProps<"/embedded-signup">) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Brand />
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Onboard the WhatsApp Business Platform With CoreConcept CRM</CardTitle>
          <CardDescription>
           Get started with a few simple steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="text-muted-foreground list-decimal space-y-2 pl-4 text-sm">
            <li>Create or select your WhatsApp Business account.</li>
            <li>Add a phone number and provide profile details.</li>
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