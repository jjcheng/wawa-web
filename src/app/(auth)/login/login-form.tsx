"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CountryCodeSelect } from "@/components/country-code-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { cn, MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

function fieldError(state: LoginState, field: string) {
  return state.inputErrors?.find((error) => error.field === field)?.message;
}

function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className={cn("w-full", MEDIUM_BUTTON_HEIGHT)} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Sign in
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />

      {state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="phone_number">Phone number</Label>
        <div className="flex gap-2">
          <CountryCodeSelect name="country_code" />
          <Input
            id="phone_number"
            name="phone_number"
            inputMode="tel"
            autoComplete="username"
            placeholder="enter your phone number"
            className={cn("flex-1", MEDIUM_BUTTON_HEIGHT)}
            aria-invalid={Boolean(fieldError(state, "phone_number"))}
            required
          />
        </div>
        {fieldError(state, "country_code") ? (
          <p className="text-destructive text-sm">{fieldError(state, "country_code")}</p>
        ) : null}
        {fieldError(state, "phone_number") ? (
          <p className="text-destructive text-sm">{fieldError(state, "phone_number")}</p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Select country code and enter the phone number without it.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="enter your password"
          autoComplete="current-password"
          className={MEDIUM_BUTTON_HEIGHT}
          aria-invalid={Boolean(fieldError(state, "password"))}
          required
        />
        {fieldError(state, "password") ? (
          <p className="text-destructive text-sm">{fieldError(state, "password")}</p>
        ) : null}
      </div>

      <SignInButton />
    </form>
  );
}
