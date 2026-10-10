"use client";

import Link from "next/link";
import { Globe, Search, X } from "lucide-react";
import { useState } from "react";

import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AgentWebsite } from "./website-data";

export function WebsitesList({
  websites,
  profileId,
}: {
  websites: AgentWebsite[];
  profileId: number;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredWebsites = websites.filter((website) =>
    website.url.toLowerCase().includes(query),
  );

  return (
    <div className="bg-card divide-border divide-y overflow-hidden rounded-lg border">
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute inset-y-0 left-2 my-auto size-4"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search websites"
            aria-label="Search websites"
            className="h-8 border-none bg-transparent pr-7 pl-8 shadow-none focus-visible:ring-0"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      {filteredWebsites.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-muted-foreground text-base">No websites found.</p>
          {search ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
              Reset search
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="divide-border divide-y">
          {filteredWebsites.map((website) => (
            <li key={website.id}>
              <Link
                href={`/ai-agent/profiles/${profileId}/websites/${website.id}`}
                className="hover:bg-accent/60 flex w-full min-w-0 flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors sm:flex-nowrap"
              >
                <span className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Globe aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate leading-5 font-medium">{website.url}</span>
                  {website.exclude_patterns?.length ? (
                    <span className="text-muted-foreground mt-1 block text-sm break-words">
                      Excluded: {website.exclude_patterns.join(", ")}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground mt-1 block text-sm sm:hidden">
                    <RelativeTime value={website.added_at} />
                  </span>
                </span>
                <span className="text-muted-foreground ml-auto hidden shrink-0 text-sm sm:block">
                  <RelativeTime value={website.added_at} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
