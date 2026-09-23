"use client";

import { Loader2 } from "lucide-react";
import Script from "next/script";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneNumberFields } from "@/components/phone-number-fields";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { toast } from "@/lib/toast";
import { cn, MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "flexible";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (container?: string | HTMLElement) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

function fieldError(state: LoginState, field: string) {
  return state.inputErrors?.find((error) => error.field === field)?.message;
}

function subscribeToHydration() {
  return () => {};
}

function useHydrated() {
  return useSyncExternalStore(subscribeToHydration, () => true, () => false);
}

function SignInButton({ turnstileToken }: { turnstileToken: string }) {
  const { pending } = useFormStatus();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <Button
      type="submit"
      className={cn("w-full", MEDIUM_BUTTON_HEIGHT)}
      disabled={pending || Boolean(turnstileSiteKey && !turnstileToken)}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Sign in
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  const [countryCode, setCountryCode] = useState<string | undefined>(undefined);
  // React resets uncontrolled <form action> fields after the action runs, so keep this controlled
  // to preserve the phone number when a login attempt fails.
  const [phoneNumber, setPhoneNumber] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const hydrated = useHydrated();

  function handleCountryCodeChange(nextCountryCode: string) {
    window.localStorage.setItem("country_code", nextCountryCode);
    setCountryCode(nextCountryCode);
  }

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileReady || !turnstileRef.current || !window.turnstile) return;
    if (turnstileWidgetIdRef.current) return;

    const widgetId = window.turnstile.render(turnstileRef.current, {
      sitekey: turnstileSiteKey,
      action: "login",
      theme: "auto",
      size: "flexible",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    turnstileWidgetIdRef.current = widgetId;

    return () => {
      window.turnstile?.remove?.(widgetId);
      turnstileWidgetIdRef.current = null;
    };
  }, [turnstileReady, turnstileSiteKey]);

  useEffect(() => {
    if (state.message) {
      toast.error(state.message);
      queueMicrotask(() => setTurnstileToken(""));
      if (turnstileWidgetIdRef.current) window.turnstile?.reset(turnstileWidgetIdRef.current);
    }
  }, [state.message]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="phone_number">Phone number</Label>
        <PhoneNumberFields
          countryName="country_code"
          phoneName="phone_number"
          countryValue={countryCode}
          onCountryChange={handleCountryCodeChange}
          phoneValue={phoneNumber}
          onPhoneChange={(event) => setPhoneNumber(event.target.value)}
          phoneAutoComplete="username"
          countryError={fieldError(state, "country_code")}
          phoneError={fieldError(state, "phone_number")}
          phoneAriaInvalid={Boolean(fieldError(state, "phone_number"))}
          phoneRequired
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          className={MEDIUM_BUTTON_HEIGHT}
          aria-invalid={Boolean(fieldError(state, "password"))}
          required
        />
        {fieldError(state, "password") ? (
          <p className="text-destructive text-sm">{fieldError(state, "password")}</p>
        ) : null}
      </div>

      {hydrated && turnstileSiteKey ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="afterInteractive"
            async
            defer
            onLoad={() => setTurnstileReady(true)}
          />
          <div
            ref={turnstileRef}
          />
        </>
      ) : null}

      <SignInButton turnstileToken={turnstileToken} />
      {state.message ? (
        <p className="text-destructive text-sm">{state.message}</p>
      ) : null}
    </form>
  );
}
