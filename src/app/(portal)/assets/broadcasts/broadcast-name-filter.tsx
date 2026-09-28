"use client";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

export function BroadcastNameFilter({
  value,
  onChange,
  placeholder = "Search broadcasts",
  clearLabel = "Clear broadcast name search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  clearLabel?: string;
}) {

  return (
    <div className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 my-auto box-content size-3.5 pl-1" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-7 border-none pr-6 pl-6 font-medium shadow-none focus-visible:ring-0"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-1"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
