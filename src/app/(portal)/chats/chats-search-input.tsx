"use client";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

export function ChatsSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2.5 my-auto size-3.5" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search by name"
        aria-label="Search by name"
        className="h-8 border-none bg-transparent pr-7 pl-7 shadow-none focus-visible:ring-0"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
          }}
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
