"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmbeddedSignupButton } from "@/components/whatsapp/embedded-signup-button";
import { LoginForm } from "./login-form";

export function LoginPanel({ next }: { next?: string }) {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    if (!turnstileSiteKey) return;
    const callbacks = globalThis as typeof globalThis & {
      wawaTurnstileSuccess?: (token: string) => void;
      wawaTurnstileReset?: () => void;
    };
    callbacks.wawaTurnstileSuccess = (token: string) => setTurnstileToken(token);
    callbacks.wawaTurnstileReset = () => setTurnstileToken("");

    return () => {
      delete callbacks.wawaTurnstileSuccess;
      delete callbacks.wawaTurnstileReset;
    };
  }, [turnstileSiteKey]);

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Using your registered phone number.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} turnstileToken={turnstileToken} />

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-muted-foreground text-xs whitespace-nowrap">New to WAWAGO?</span>
            <Separator className="flex-1" />
          </div>

          <EmbeddedSignupButton
            label="Onboard with WhatsApp"
            className="w-full"
            redirectTo={null}
          />
        </CardContent>
      </Card>
      {turnstileSiteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="flex w-full min-w-0 justify-center overflow-hidden">
            <div
              className="cf-turnstile w-full min-w-0 max-w-[350px] [&_iframe]:!max-w-full"
              data-sitekey={turnstileSiteKey}
              data-size="flexible"
              data-callback="wawaTurnstileSuccess"
              data-expired-callback="wawaTurnstileReset"
              data-error-callback="wawaTurnstileReset"
            />
          </div>
        </>
      ) : null}
    </>
  );
}