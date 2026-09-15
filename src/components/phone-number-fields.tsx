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
  phonePlaceholder = "enter phone number",
  phoneAutoComplete,
  phoneAriaInvalid,
  phoneRequired,
  phoneMaxLength,
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
  className?: string;
}) {
  return (
    <div className={cn("flex flex-row gap-2", className)}>
      <CountryCodeSelect
        name={countryName}
        value={countryValue}
        onValueChange={onCountryChange}
        className="h-[36px] w-24 shrink-0"
      />
      <Input
        id={phoneId ?? phoneName}
        name={phoneName}
        type="tel"
        inputMode="tel"
        autoComplete={phoneAutoComplete}
        placeholder={phonePlaceholder}
        value={phoneValue}
        onChange={onPhoneChange}
        maxLength={phoneMaxLength}
        className={cn("h-[36px] w-full flex-1", MEDIUM_BUTTON_HEIGHT)}
        aria-invalid={phoneAriaInvalid}
        required={phoneRequired}
      />
    </div>
  );
}
