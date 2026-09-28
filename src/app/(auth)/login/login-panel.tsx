"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

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

type TurnstileOptions = {
  sitekey: string;
  size: "flexible";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function LoginPanel({ next }: { next?: string }) {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const turnstile = window.turnstile;
    const container = turnstileContainerRef.current;
    if (!turnstileSiteKey || !turnstileReady || !turnstile || !container) return;

    const widgetId = turnstile.render(container, {
      sitekey: turnstileSiteKey,
      size: "flexible",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });

    return () => turnstile.remove(widgetId);
  }, [turnstileReady, turnstileSiteKey]);

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
          <Script
            id="cloudflare-turnstile"
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            onReady={() => setTurnstileReady(true)}
          />
          <div className="flex w-full min-w-0 justify-center overflow-hidden">
            <div
              ref={turnstileContainerRef}
              className="w-full min-w-0 max-w-[350px] [&_iframe]:!max-w-full"
            />
          </div>
        </>
      ) : null}
    </>
  );
}