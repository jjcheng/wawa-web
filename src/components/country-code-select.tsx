"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_CODES } from "@/lib/country-codes";
import { cn, MEDIUM_BUTTON_HEIGHT } from "@/lib/utils";

export function CountryCodeSelect({
  name,
  value,
  defaultValue = "65",
  onValueChange,
  className,
}: {
  name: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  return (
    <Select
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
    >
      <SelectTrigger
        className={cn("w-38", MEDIUM_BUTTON_HEIGHT, className)}
        aria-label="Country code"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COUNTRY_CODES.map(({ code, name: countryName }) => (
          <SelectItem key={code} value={code}>
            {code} - {countryName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
