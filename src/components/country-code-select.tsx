"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_CODES } from "@/lib/country-codes";
import { cn, MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

const COUNTRY_CODE_STORAGE_KEY = "country_code";
const COUNTRY_CODE_CHANGE_EVENT = "country-code-change";

function subscribeToCountryCode(callback: () => void) {
  window.addEventListener(COUNTRY_CODE_CHANGE_EVENT, callback);
  return () => window.removeEventListener(COUNTRY_CODE_CHANGE_EVENT, callback);
}

function getStoredCountryCode(defaultValue: string) {
  return window.localStorage.getItem(COUNTRY_CODE_STORAGE_KEY) ?? defaultValue;
}

export function CountryCodeSelect({
  name,
  value,
  defaultValue = "65",
  onValueChange,
  className,
  "aria-invalid": ariaInvalid,
}: {
  name: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  "aria-invalid"?: boolean;
}) {
  const storedValue = useSyncExternalStore(
    subscribeToCountryCode,
    () => getStoredCountryCode(defaultValue),
    () => defaultValue,
  );

  useEffect(() => {
    const savedValue = window.localStorage.getItem(COUNTRY_CODE_STORAGE_KEY);
    if (savedValue && !value) onValueChange?.(savedValue);
  }, [onValueChange, value]);

  function handleValueChange(nextValue: string) {
    window.localStorage.setItem(COUNTRY_CODE_STORAGE_KEY, nextValue);
    window.dispatchEvent(new Event(COUNTRY_CODE_CHANGE_EVENT));
    onValueChange?.(nextValue);
  }

  return (
    <Select
      name={name}
      value={value ?? storedValue}
      onValueChange={handleValueChange}
    >
      <SelectTrigger
        className={cn("w-24", MEDIUM_BUTTON_HEIGHT, className)}
        aria-label="Country code"
        aria-invalid={ariaInvalid}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COUNTRY_CODES.map(({ code }) => (
          <SelectItem key={code} value={code}>
            {code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
