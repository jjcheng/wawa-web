"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export function ChatsTagFilter({ tags, activeTag }: { tags: string[]; activeTag: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectTag(tag: string) {
    const params = new URLSearchParams(searchParams);
    if (tag) params.set("tag", tag);
    else params.delete("tag");
    router.push(`${pathname}?${params.toString()}`);
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
      {["All", ...tags].map((tag) => {
        const value = tag === "All" ? "" : tag;
        const active = value === activeTag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => selectTag(value)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground border-transparent"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
