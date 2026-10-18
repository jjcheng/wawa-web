"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, Search, X } from "lucide-react";

import { RelativeTime } from "@/components/relative-time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AgentFile = {
  id: number;
  added_at: string;
  name?: string;
  url: string;
  status: string;
  profile_id: number;
  total_pages: number;
  indexed_page_numbers: number[] | null;
};

function fileName(file: AgentFile) {
  if (file.name?.trim()) return file.name.trim();
  const url = file.url;
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  } catch {
    // Fall through to the raw URL.
  }
  return url;
}

function statusLabel(status: string) {
  if (!status) return "";
  switch (status.toUpperCase()) {
    case "PENDING_INDEX":
      return "Pending index";
    case "INDEXING":
      return "Indexing";
    case "INDEX_FAILED":
      return "Index failed";
    case "INDEXED":
      return "Indexed";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }
}

function statusClassName(status: string) {
  switch (status.toLowerCase()) {
    case "indexing":
    case "running":
      return "text-blue-600 dark:text-blue-400";
    case "index_failed":
      return "text-red-600 dark:text-red-400";
    case "indexed":
    case "completed":
    case "done":
    case "ready":
    case "success":
    case "active":
      return "text-green-600 dark:text-green-400";
    case "failed":
    case "error":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

export function FilesList({ files, profileId }: { files: AgentFile[]; profileId: number }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filteredFiles = files.filter((file) =>
    [fileName(file), file.url].some((value) => value.toLowerCase().includes(query)),
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
            placeholder="Search files"
            aria-label="Search files"
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
      {filteredFiles.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-muted-foreground text-base">No files found.</p>
          {search ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setSearch("")}>
              Reset search
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="divide-border divide-y">
          {filteredFiles.map((file) => {
            const name = fileName(file);
            const status = statusLabel(file.status);
            const className = statusClassName(file.status);
            return (
              <li key={file.id}>
                <Link
                  href={`/ai-agent/profiles/${profileId ?? file.profile_id}/files/${file.id}`}
                  className="hover:bg-accent/60 flex min-w-0 flex-wrap items-center gap-3 px-4 py-3 transition-colors sm:flex-nowrap"
                >
                  <span className="bg-accent flex size-10 shrink-0 items-center justify-center rounded-full">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate leading-5 font-medium">{name}</p>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                      <RelativeTime value={file.added_at} />
                      {status ? (
                        <span className={`sm:hidden ${className}`}>{status}</span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Indexed: {file.indexed_page_numbers?.length ?? 0}/{file.total_pages}
                    </p>
                  </div>
                  <div className="ml-auto hidden shrink-0 text-right text-sm sm:block">
                    {status ? <p className={className}>{status}</p> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
