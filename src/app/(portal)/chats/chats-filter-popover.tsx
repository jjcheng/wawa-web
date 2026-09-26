"use client";

import { Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function ChatsFilterPopover({
  tags = [],
  selectedTags = [],
  status,
}: {
  tags: string[];
  selectedTags: string[];
  status: "ACTIVE" | "INACTIVE";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCount = selectedTags.length + (status === "INACTIVE" ? 1 : 0);

  function toggleTag(tag: string, checked: boolean) {
    const params = new URLSearchParams(searchParams);
    const next = new Set(selectedTags);
    if (checked) next.add(tag);
    else next.delete(tag);
    params.delete("tags");
    for (const value of next) params.append("tags", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function setStatus(value: "ACTIVE" | "INACTIVE") {
    const params = new URLSearchParams(searchParams);
    params.set("status", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="shrink-0 gap-1.5">
          <Filter className="size-3.5" />
          Filter
          {activeCount > 0 ? (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">Tags</p>
            {tags.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tags available.</p>
            ) : (
              <div className="space-y-0.5">
                {tags.map((tag) => (
                  <label
                    key={tag}
                    className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm"
                  >
                    <Checkbox
                      checked={selectedTags.includes(tag)}
                      onChange={(event) => toggleTag(tag, event.target.checked)}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Separator />
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">Status</p>
            <div className="flex gap-2">
              {(["ACTIVE", "INACTIVE"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    status === option
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  {option === "ACTIVE" ? "Active" : "Inactive"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
