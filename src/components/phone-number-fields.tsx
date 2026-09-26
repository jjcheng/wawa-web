"use client";

import type { ChangeEventHandler } from "react";

import { CountryCodeSelect } from "@/components/country-code-select";
import { Input } from "@/components/ui/input";
import { cn, MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

export function PhoneNumberFields({
  countryName,
  phoneName,
  countryValue,
  onCountryChange,
  phoneValue,
  onPhoneChange,
  phoneId,
  phonePlaceholder = "Enter phone number, no country code",
  phoneAutoComplete,
  phoneAriaInvalid,
  phoneRequired,
  phoneMaxLength,
  countryError,
  phoneError,
  className,
}: {
  countryName: string;
  phoneName: string;
  countryValue?: string;
  onCountryChange?: (value: string) => void;
  phoneValue?: string;
  onPhoneChange?: ChangeEventHandler<HTMLInputElement>;
  phoneId?: string;
  phonePlaceholder?: string;
  phoneAutoComplete?: string;
  phoneAriaInvalid?: boolean;
  phoneRequired?: boolean;
  phoneMaxLength?: number;
  countryError?: string;
  phoneError?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div
        className={cn(
          "border-input focus-within:border-ring focus-within:ring-ring/50 has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-destructive/20 flex items-stretch overflow-hidden rounded-lg border bg-transparent transition-colors focus-within:ring-3",
        )}
      >
        <CountryCodeSelect
          name={countryName}
          value={countryValue}
          onValueChange={onCountryChange}
          className="w-24 shrink-0 rounded-none border-0 border-r border-input bg-transparent focus-visible:border-input focus-visible:ring-0 dark:bg-transparent"
          aria-invalid={Boolean(countryError)}
        />
        <Input
          id={phoneId ?? phoneName}
          name={phoneName}
          type="tel"
          inputMode="tel"
          autoComplete={phoneAutoComplete}
          placeholder={phonePlaceholder}
          value={phoneValue}
          onKeyDown={(event) => {
            if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;
            if (!/\d/.test(event.key)) event.preventDefault();
          }}
          onChange={(event) => {
            event.target.value = event.target.value.replace(/\D/g, "");
            onPhoneChange?.(event);
          }}
          maxLength={phoneMaxLength}
          className={cn(
            "min-w-0 flex-1 rounded-none border-0 bg-transparent focus-visible:border-input focus-visible:ring-0 dark:bg-transparent",
            MEDIUM_BUTTON_HEIGHT,
          )}
          aria-invalid={phoneAriaInvalid}
          required={phoneRequired}
        />
      </div>
      {countryError ? <p className="text-destructive mt-1 text-sm">{countryError}</p> : null}
      {phoneError ? <p className="text-destructive mt-1 text-sm">{phoneError}</p> : null}
    </div>
  );
}
