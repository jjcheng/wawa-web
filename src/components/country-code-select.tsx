"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
  const storedValue = useSyncExternalStore(
    subscribeToCountryCode,
    () => getStoredCountryCode(defaultValue),
    () => defaultValue,
  );

  useEffect(() => {
    const savedValue = window.localStorage.getItem(COUNTRY_CODE_STORAGE_KEY);
    if (savedValue && !value) onValueChange?.(savedValue);
  }, [onValueChange, value]);

  const selectedCode = value ?? storedValue;
  const selectedCountry = useMemo(
    () => COUNTRY_CODES.find((country) => country.code === selectedCode),
    [selectedCode],
  );

  function handleSelect(nextValue: string) {
    window.localStorage.setItem(COUNTRY_CODE_STORAGE_KEY, nextValue);
    window.dispatchEvent(new Event(COUNTRY_CODE_CHANGE_EVENT));
    onValueChange?.(nextValue);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={selectedCode} />
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          aria-label="Country code"
          title={selectedCountry?.name}
          className={cn("w-24 justify-between font-normal", MEDIUM_BUTTON_HEIGHT, className)}
        >
          <span className="truncate">{selectedCode || "Code"}</span>
          <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country or code" />
          <CommandList className="max-h-[min(16rem,calc(100dvh-8rem))] touch-pan-y overscroll-y-contain">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRY_CODES.map((country) => (
                <CommandItem
                  key={country.country}
                  value={`${country.code} ${country.name} ${country.country}`}
                  onSelect={() => handleSelect(country.code)}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      selectedCode === country.code ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="text-muted-foreground w-9 shrink-0">{country.code}</span>
                  <span className="truncate">{country.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

