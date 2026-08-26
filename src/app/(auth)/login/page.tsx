import type { Metadata } from "next";

import { Brand } from "@/components/brand";
import { EmbeddedSignupButton } from "@/components/whatsapp/embedded-signup-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { serverEnv } from "@/lib/env.server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <Brand />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          {/* <CardDescription>
            Use the phone number registered with your WhatsApp Business account.
          </CardDescription> */}
        </CardHeader>
        <CardContent>
          <LoginForm next={typeof next === "string" ? next : undefined} />

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              New to CoreConcept WhatsApp CRM?
            </span>
            <Separator className="flex-1" />
          </div>

          <EmbeddedSignupButton
            appId={serverEnv.NEXT_META_APP_ID}
            configId={serverEnv.NEXT_META_EMBEDDED_SIGNUP_CONFIG_ID}
            label="Onboard with WhatsApp Business Number"
            className="w-full"
            redirectTo={null}
          />
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        © {new Date().getFullYear()} CoreConcept Tech
      </p>
    </div>
  );
}
