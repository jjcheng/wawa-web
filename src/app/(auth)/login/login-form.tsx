"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneNumberFields } from "@/components/phone-number-fields";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { cn, MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

function fieldError(state: LoginState, field: string) {
  return state.inputErrors?.find((error) => error.field === field)?.message;
}

function SignInButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className={cn("w-full", MEDIUM_BUTTON_HEIGHT)}
      disabled={pending}
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

  function handleCountryCodeChange(nextCountryCode: string) {
    window.localStorage.setItem("country_code", nextCountryCode);
    setCountryCode(nextCountryCode);
  }

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

      <SignInButton />
      {state.message ? (
        <p className="text-destructive text-sm">{state.message}</p>
      ) : null}
    </form>
  );
}
