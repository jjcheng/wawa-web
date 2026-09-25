"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

export function ChatsSearchInput({ initialName }: { initialName: string }) {
  const [nameInput, setNameInput] = useState(initialName);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => setNameInput(initialName), [initialName]);

  function submitSearch(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("name", value);
    else params.delete("name");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2.5 my-auto size-3.5" />
      <Input
        value={nameInput}
        onChange={(event) => setNameInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submitSearch(nameInput);
          }
        }}
        placeholder="Search chats by name"
        aria-label="Search chats by name"
        className="h-8 border-none bg-transparent pr-7 pl-7 shadow-none focus-visible:ring-0"
      />
      {nameInput ? (
        <button
          type="button"
          onClick={() => {
            setNameInput("");
            submitSearch("");
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
