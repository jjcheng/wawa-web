"use client";

import { Input } from "@/components/ui/input";
import { TEMPLATE_VARIABLE_MAX_LENGTH } from "@/lib/api/schemas";
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
  alphanumericOnly = false,
  onSourceChange,
  onValueChange,
}: {
  id: string;
  source: CustomerParameterSource;
  value: string;
  mappedValue: string;
  placeholder: string;
  maxLength?: number;
  alphanumericOnly?: boolean;
  onSourceChange: (source: CustomerParameterSource) => void;
  onValueChange: (value: string) => void;
}) {
  const inputMaxLength = Math.min(maxLength ?? TEMPLATE_VARIABLE_MAX_LENGTH, TEMPLATE_VARIABLE_MAX_LENGTH);

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
      <div className="relative">
        <Input
          id={id}
          value={source === "custom" ? value : mappedValue}
          onKeyDown={(event) => {
            if (!alphanumericOnly || event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;
            if (!/[a-zA-Z0-9]/.test(event.key)) event.preventDefault();
          }}
          onChange={(event) =>
            onValueChange(alphanumericOnly ? event.target.value.replace(/[^a-zA-Z0-9]/g, "") : event.target.value)
          }
          placeholder={source === "custom" ? placeholder : "Resolved per customer"}
          readOnly={source !== "custom"}
          maxLength={inputMaxLength}
          className={source !== "custom" ? "bg-muted/50 pr-12" : "pr-12"}
        />
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
          {(source === "custom" ? value : mappedValue).length}/{inputMaxLength}
        </span>
      </div>
    </div>
  );
}
