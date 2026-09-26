import type { Metadata } from "next";

import { Brand } from "@/components/brand";
import { TopRightThemeToggle } from "@/components/top-right-theme-toggle";
import { EmbeddedSignupButton } from "@/components/whatsapp/embedded-signup-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the authenticated WAWAGO portal for WhatsApp CRM management.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 overflow-x-hidden p-6">
      <TopRightThemeToggle />
      <Brand />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Use your registered WhatsApp Business Account number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={typeof next === "string" ? next : undefined} />

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              New to WAWAGO?
            </span>
            <Separator className="flex-1" />
          </div>

          <EmbeddedSignupButton
            label="Onboard with WhatsApp"
            className="w-full"
            redirectTo={null}
          />
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-xs">
        © {new Date().getFullYear()} CoreConcept Pte Ltd
      </p>
    </div>
  );
}
