"use client";

import { Loader2 } from "lucide-react";
import Script from "next/script";
import { useActionState, useEffect, useRef, useState } from "react";
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
    onTurnstileSuccess?: (token: string) => void;
    onTurnstileExpired?: () => void;
    onTurnstileError?: () => void;
  }
}

function fieldError(state: LoginState, field: string) {
  return state.inputErrors?.find((error) => error.field === field)?.message;
}

function SignInButton() {
  const { pending } = useFormStatus();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileToken = useTurnstileToken();

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

function useTurnstileToken() {
  const [token, setToken] = useState("");

  useEffect(() => {
    window.onTurnstileSuccess = setToken;
    window.onTurnstileExpired = () => setToken("");
    window.onTurnstileError = () => setToken("");

    return () => {
      delete window.onTurnstileSuccess;
      delete window.onTurnstileExpired;
      delete window.onTurnstileError;
    };
  }, []);

  return token;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  const [countryCode, setCountryCode] = useState<string | undefined>(undefined);
  // React resets uncontrolled <form action> fields after the action runs, so keep this controlled
  // to preserve the phone number when a login attempt fails.
  const [phoneNumber, setPhoneNumber] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileReady, setTurnstileReady] = useState(() =>
    typeof window !== "undefined" && Boolean(window.turnstile),
  );

  function handleCountryCodeChange(nextCountryCode: string) {
    window.localStorage.setItem("country_code", nextCountryCode);
    setCountryCode(nextCountryCode);
  }

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileReady || !turnstileRef.current || !window.turnstile) return;

    const widgetId = window.turnstile.render(turnstileRef.current, {
      sitekey: turnstileSiteKey,
      theme: "auto",
      size: "flexible",
      callback: (token) => window.onTurnstileSuccess?.(token),
      "expired-callback": () => window.onTurnstileExpired?.(),
      "error-callback": () => window.onTurnstileError?.(),
    });

    return () => window.turnstile?.remove?.(widgetId);
  }, [turnstileReady, turnstileSiteKey]);

  useEffect(() => {
    if (state.message) {
      toast.error(state.message);
      window.onTurnstileExpired?.();
      if (turnstileRef.current) window.turnstile?.reset(turnstileRef.current);
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

      {turnstileSiteKey ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            async
            defer
            onReady={() => setTurnstileReady(true)}
          />
          <div
            ref={turnstileRef}
          />
        </>
      ) : null}

      <SignInButton />
      {state.message ? (
        <p className="text-destructive text-sm">{state.message}</p>
      ) : null}
    </form>
  );
}
