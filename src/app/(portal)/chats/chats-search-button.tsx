"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChatsSearchButton({ initialName }: { initialName: string }) {
  const [open, setOpen] = useState(Boolean(initialName));
  const [nameInput, setNameInput] = useState(initialName);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function submitSearch(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("name", value);
    else params.delete("name");
    router.push(`${pathname}?${params.toString()}`);
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="icon-sm"
        className="shrink-0 rounded-full"
        aria-label="Search chats"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
      </Button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Input
        autoFocus
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
        className="h-8 w-40 sm:w-56"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close search"
        onClick={() => {
          setOpen(false);
          setNameInput("");
          if (initialName) submitSearch("");
        }}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
