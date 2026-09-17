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
  phonePlaceholder = "Enter phone number",
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
    <div className={cn("flex flex-row gap-2", className)}>
      <div className="w-24 shrink-0">
        <CountryCodeSelect
          name={countryName}
          value={countryValue}
          onValueChange={onCountryChange}
          className="h-[36px] w-24"
          aria-invalid={Boolean(countryError)}
        />
        {countryError ? <p className="text-destructive mt-1 text-sm">{countryError}</p> : null}
      </div>
      <div className="min-w-0 flex-1">
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
          className={cn("h-[36px] w-full", MEDIUM_BUTTON_HEIGHT)}
          aria-invalid={phoneAriaInvalid}
          required={phoneRequired}
        />
        {phoneError ? <p className="text-destructive mt-1 text-sm">{phoneError}</p> : null}
      </div>
    </div>
  );
}
