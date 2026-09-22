"use client";

import { Circle, ExternalLink } from "lucide-react";
import { useState } from "react";

import { RelativeTime } from "@/components/relative-time";
import { WebsiteActions } from "@/components/website-actions";

export function WebsiteSummary({
  websiteId,
  url,
  status,
  initialSyncedAt,
}: {
  websiteId: string;
  url?: string;
  status?: string;
  initialSyncedAt?: string;
}) {
  const [syncedAt, setSyncedAt] = useState<string | Date | undefined>(initialSyncedAt);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <WebsiteActions websiteId={websiteId} small onSynced={setSyncedAt} />
      {url ? (
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-72 items-center gap-1 text-sm hover:underline"
          >
            <Circle
              className={
                status === "ACTIVE"
                  ? "size-2 shrink-0 animate-pulse fill-emerald-500 text-emerald-500"
                  : "size-2 shrink-0 fill-red-500 text-red-500"
              }
              aria-hidden="true"
            />
            <span className="truncate">{url}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
          {syncedAt ? (
            <p className="text-xs text-muted-foreground">
              Last synced: <RelativeTime value={syncedAt} />
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}