"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const CUSTOMER_PARAMETER_OPTIONS = [
  { value: "custom", label: "Static value" },
  { value: "customer.name", label: "Customer name" },
  { value: "customer.token", label: "Customer token" },
] as const;

export type CustomerParameterSource = (typeof CUSTOMER_PARAMETER_OPTIONS)[number]["value"];

export function TemplateVariableInput({
  id,
  source,
  value,
  mappedValue,
  placeholder,
  maxLength,
  onSourceChange,
  onValueChange,
}: {
  id: string;
  source: CustomerParameterSource;
  value: string;
  mappedValue: string;
  placeholder: string;
  maxLength?: number;
  onSourceChange: (source: CustomerParameterSource) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <Select
        value={source}
        onValueChange={(nextSource) => onSourceChange(nextSource as CustomerParameterSource)}
      >
        <SelectTrigger aria-label="Parameter source" className="w-full cursor-pointer">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CUSTOMER_PARAMETER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        value={source === "custom" ? value : mappedValue}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={source === "custom" ? placeholder : "Resolved per customer"}
        readOnly={source !== "custom"}
        maxLength={maxLength}
        className={source !== "custom" ? "bg-muted/50" : undefined}
      />
    </div>
  );
}
