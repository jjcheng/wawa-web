"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";

export function BroadcastNameFilter({ value }: { value: string }) {
  const [searchInput, setSearchInput] = useState(value);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function submitSearch(nextValue: string) {
    const params = new URLSearchParams(searchParams);
    if (nextValue.trim()) params.set("name", nextValue.trim());
    else params.delete("name");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearSearch() {
    setSearchInput("");
    submitSearch("");
  }

  return (
    <div className="relative">
      <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 my-auto box-content size-3.5 pl-1" />
      <Input
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submitSearch(searchInput);
          }
        }}
        placeholder="Name"
        aria-label="Search broadcasts by name"
        className="h-7 border-none pr-6 pl-6 font-medium shadow-none focus-visible:ring-0"
      />
      {searchInput ? (
        <button
          type="button"
          onClick={clearSearch}
          aria-label="Clear broadcast name search"
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-1"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
